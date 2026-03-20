import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import AnomalySection from "./AnomalySection";

interface AgentStat {
  agent_id: string;
  agent_name: string;
  avatar_emoji: string;
  total: number;
  done: number;
  cancelled: number;
  failed_exec: number;
  in_progress: number;
  review: number;
  planned: number;
  success_rate: number | null;
  avg_duration_ms: number | null;
  status_breakdown: Record<string, number>;
  trend: number[];
  day_labels: string[];
}

type SortKey = "total" | "success_rate" | "avg_duration_ms" | "done";

const mono = "var(--th-font-mono)";

function fmtDuration(ms: number | null): string {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

/** Tiny inline sparkline using SVG */
function Sparkline({ data, width = 80, height = 28 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const step = width / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible", display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--th-accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      {data.map((v, i) => v > 0 && (
        <circle
          key={i}
          cx={i * step}
          cy={height - (v / max) * (height - 4) - 2}
          r={2}
          fill="var(--th-accent)"
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

/** Mini horizontal stacked bar: done=green, review=amber, in_progress=blue, cancelled=muted */
function StatusBar({ stat }: { stat: AgentStat }) {
  const total = stat.total;
  if (!total) return <div style={{ height: 6, background: "var(--th-border)", borderRadius: 3 }} />;
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  const other = total - stat.done - stat.review - stat.in_progress - stat.cancelled;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--th-border)" }}>
      {stat.done > 0 && <div style={{ width: pct(stat.done), background: "#10b981" }} title={`done: ${stat.done}`} />}
      {stat.review > 0 && <div style={{ width: pct(stat.review), background: "var(--th-accent)" }} title={`review: ${stat.review}`} />}
      {stat.in_progress > 0 && <div style={{ width: pct(stat.in_progress), background: "#3b82f6" }} title={`in_progress: ${stat.in_progress}`} />}
      {other > 0 && <div style={{ width: pct(other), background: "#6b7280" }} title={`other: ${other}`} />}
      {stat.cancelled > 0 && <div style={{ width: pct(stat.cancelled), background: "#374151" }} title={`cancelled: ${stat.cancelled}`} />}
    </div>
  );
}

function AgentCard({ stat }: { stat: AgentStat }) {
  const { t } = useI18n();
  const activeTasks = stat.total - stat.cancelled;

  return (
    <div style={{
      background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)",
      borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
      minWidth: 0,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{stat.avatar_emoji ?? "⊙"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: "var(--th-text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {stat.agent_name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
            {stat.total} {t({ ko: "개 태스크", en: "tasks", ja: "タスク", zh: "任务" })}
          </div>
        </div>
        {/* Success rate badge */}
        {stat.success_rate !== null && (
          <div style={{
            fontFamily: mono, fontSize: 11, fontWeight: 700,
            color: stat.success_rate >= 80 ? "#10b981" : stat.success_rate >= 50 ? "var(--th-accent)" : "#ef4444",
            background: stat.success_rate >= 80 ? "#10b98118" : stat.success_rate >= 50 ? "var(--th-accent-muted, #f59e0b18)" : "#ef444418",
            padding: "2px 8px", borderRadius: 5, flexShrink: 0,
          }}>
            {stat.success_rate}%
          </div>
        )}
      </div>

      {/* Status bar */}
      <StatusBar stat={stat} />

      {/* Counts */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), val: stat.done, color: "#10b981" },
          { label: t({ ko: "검토", en: "Review", ja: "レビュー", zh: "审查" }), val: stat.review, color: "var(--th-accent)" },
          { label: t({ ko: "진행", en: "Active", ja: "実行中", zh: "进行" }), val: stat.in_progress, color: "#3b82f6" },
          { label: t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" }), val: stat.failed_exec, color: "#ef4444" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: "center", minWidth: 36 }}>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>{label}</div>
          </div>
        ))}
        {stat.avg_duration_ms && (
          <div style={{ textAlign: "center", minWidth: 36, marginLeft: "auto" }}>
            <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text)" }}>{fmtDuration(stat.avg_duration_ms)}</div>
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>
              {t({ ko: "평균", en: "Avg", ja: "平均", zh: "平均" })}
            </div>
          </div>
        )}
      </div>

      {/* Sparkline (last N days) */}
      {stat.trend.some((v) => v > 0) && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginBottom: 4 }}>
            {t({ ko: "태스크 추이", en: "Task trend", ja: "トレンド", zh: "趋势" })}
          </div>
          <Sparkline data={stat.trend} width={180} height={28} />
        </div>
      )}

      {/* Active tasks indicator */}
      {activeTasks > 0 && stat.success_rate === null && (
        <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
          {t({ ko: "완료된 태스크 없음", en: "No completed tasks yet", ja: "完了タスクなし", zh: "暂无已完成任务" })}
        </div>
      )}
    </div>
  );
}

export default function AgentPerformanceDashboard() {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();
  const [stats, setStats] = useState<AgentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [filterProjectId, setFilterProjectId] = useState(currentProjectId ?? "");
  const [days, setDays] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProjectId) params.set("project_id", filterProjectId);
    params.set("days", String(days));
    fetch(`/api/agents/performance?${params}`)
      .then((r) => r.json() as Promise<{ agents?: AgentStat[] }>)
      .then((d) => {
        setStats(d.agents ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filterProjectId, days]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...stats].sort((a, b) => {
    if (sortKey === "success_rate") return (b.success_rate ?? -1) - (a.success_rate ?? -1);
    if (sortKey === "avg_duration_ms") {
      if (!a.avg_duration_ms) return 1;
      if (!b.avg_duration_ms) return -1;
      return a.avg_duration_ms - b.avg_duration_ms;
    }
    return (b[sortKey] as number) - (a[sortKey] as number);
  });

  const totalTasks = stats.reduce((s, a) => s + a.total, 0);
  const totalDone = stats.reduce((s, a) => s + a.done, 0);
  const overallRate = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0, flexWrap: "wrap" }}>
        {/* Project filter */}
        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          style={{ fontFamily: mono, fontSize: 11, padding: "4px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 5, color: "var(--th-text)", outline: "none" }}
        >
          <option value="">{t({ ko: "전체 프로젝트", en: "All projects", ja: "すべてのプロジェクト", zh: "所有项目" })}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {/* Days */}
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ fontFamily: mono, fontSize: 11, padding: "4px 8px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 5, color: "var(--th-text)", outline: "none" }}
        >
          {[7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>{d}{t({ ko: "일", en: "d", ja: "日", zh: "天" })}</option>
          ))}
        </select>

        {/* Sort */}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {(["total", "done", "success_rate", "avg_duration_ms"] as SortKey[]).map((k) => {
            const labels: Record<SortKey, string> = {
              total: t({ ko: "전체", en: "Total", ja: "合計", zh: "总数" }),
              done: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }),
              success_rate: t({ ko: "성공률", en: "Rate", ja: "成功率", zh: "成功率" }),
              avg_duration_ms: t({ ko: "속도", en: "Speed", ja: "速度", zh: "速度" }),
            };
            return (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                style={{
                  fontFamily: mono, fontSize: 10, padding: "3px 9px",
                  background: sortKey === k ? "var(--th-accent)" : "var(--th-bg-elevated)",
                  border: `1px solid ${sortKey === k ? "var(--th-accent)" : "var(--th-border)"}`,
                  borderRadius: 4, cursor: "pointer",
                  color: sortKey === k ? "#fff" : "var(--th-text-muted)",
                }}
              >
                {labels[k]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      {!loading && stats.length > 0 && (
        <div style={{ display: "flex", gap: 20, padding: "8px 16px", borderBottom: "1px solid var(--th-border)", flexShrink: 0, flexWrap: "wrap" }}>
          {[
            { label: t({ ko: "총 에이전트", en: "Agents", ja: "エージェント", zh: "代理" }), val: stats.length },
            { label: t({ ko: "총 태스크", en: "Total tasks", ja: "総タスク", zh: "总任务" }), val: totalTasks },
            { label: t({ ko: "완료", en: "Completed", ja: "完了", zh: "完成" }), val: totalDone, color: "#10b981" },
            ...(overallRate !== null ? [{ label: t({ ko: "전체 성공률", en: "Overall rate", ja: "全体成功率", zh: "总成功率" }), val: `${overallRate}%`, color: overallRate >= 70 ? "#10b981" : "var(--th-accent)" }] : []),
          ].map(({ label, val, color }) => (
            <div key={label}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: (color as string) ?? "var(--th-text)" }}>{val}</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginLeft: 5 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Anomaly panel */}
      <AnomalySection />

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 60 }}>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 60 }}>
            {t({ ko: "에이전트가 없습니다", en: "No agents found", ja: "エージェントなし", zh: "没有代理" })}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {sorted.map((stat) => <AgentCard key={stat.agent_id} stat={stat} />)}
          </div>
        )}
      </div>
    </div>
  );
}
