import { useEffect, useState } from "react";
import type React from "react";
import { getAgentPerformance, type AgentPerformanceData } from "../../api/organization-projects";

interface Props {
  agentId: string;
  t: (map: Record<string, string>) => string;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const styles: Record<string, React.CSSProperties> = {
    done: { background: "rgba(52,211,153,0.2)", color: "rgb(110,231,183)" },
    review: { background: "rgba(251,191,36,0.2)", color: "var(--th-accent)" },
    in_progress: { background: "rgba(251,191,36,0.15)", color: "var(--th-accent)" },
    inbox: { background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" },
    planned: { background: "rgba(167,139,250,0.1)", color: "rgb(196,181,253)" },
  };
  return styles[status] ?? { background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" };
}

function buildDailyChart(
  recentTasks: AgentPerformanceData["recent_tasks"],
  days = 7,
): Array<{ label: string; done: number; failed: number }> {
  const now = Date.now();
  const result: Array<{ label: string; done: number; failed: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - i * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    const dayDate = new Date(dayStart);
    const label = dayDate.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
    let done = 0;
    let failed = 0;
    for (const task of recentTasks) {
      const ts = task.completed_at ?? task.started_at;
      if (!ts || ts < dayStart || ts >= dayEnd) continue;
      if (task.status === "done") done++;
      else if (task.status === "failed" || task.status === "error") failed++;
    }
    result.push({ label, done, failed });
  }
  return result;
}

function DailyBarChart({ data, t }: { data: ReturnType<typeof buildDailyChart>; t: Props["t"] }) {
  const W = 220;
  const H = 60;
  const barW = Math.floor((W - 16) / data.length) - 3;
  const maxVal = Math.max(1, ...data.map((d) => d.done + d.failed));
  const barAreaH = H - 18;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H + 2} viewBox={`0 0 ${W} ${H + 2}`} style={{ display: "block" }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={8} y1={Math.round(barAreaH * (1 - pct))} x2={W - 8} y2={Math.round(barAreaH * (1 - pct))}
            stroke="var(--th-border)" strokeWidth={0.5} strokeDasharray="2 3"
          />
        ))}
        {data.map((d, i) => {
          const x = 8 + i * (barW + 3);
          const totalH = Math.round(((d.done + d.failed) / maxVal) * barAreaH);
          const doneH = Math.round((d.done / maxVal) * barAreaH);
          const failH = totalH - doneH;
          return (
            <g key={i}>
              {/* failed (rose) on bottom */}
              {failH > 0 && (
                <rect x={x} y={barAreaH - totalH} width={barW} height={failH} fill="rgba(244,63,94,0.55)" rx={1} />
              )}
              {/* done (green) on top of failed */}
              {doneH > 0 && (
                <rect x={x} y={barAreaH - totalH + failH} width={barW} height={doneH} fill="rgba(52,211,153,0.7)" rx={1} />
              )}
              {/* empty bar outline when no tasks */}
              {totalH === 0 && (
                <rect x={x} y={barAreaH - 2} width={barW} height={2} fill="var(--th-border)" rx={1} />
              )}
              {/* Day label */}
              <text
                x={x + barW / 2} y={H - 2}
                textAnchor="middle"
                fontSize={7}
                fill="var(--th-text-muted)"
                fontFamily="monospace"
              >
                {d.label}
              </text>
              {/* Value label on bar */}
              {totalH > 8 && (
                <text
                  x={x + barW / 2} y={barAreaH - totalH - 2}
                  textAnchor="middle"
                  fontSize={7}
                  fill="var(--th-text-secondary)"
                  fontFamily="monospace"
                >
                  {d.done + d.failed}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-3 mt-1">
        <span className="flex items-center gap-1 text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          <span className="inline-block w-2 h-2" style={{ background: "rgba(52,211,153,0.7)", borderRadius: "1px" }} />
          {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          <span className="inline-block w-2 h-2" style={{ background: "rgba(244,63,94,0.55)", borderRadius: "1px" }} />
          {t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" })}
        </span>
      </div>
    </div>
  );
}

export default function AgentPerformancePanel({ agentId, t }: Props) {
  const [data, setData] = useState<AgentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAgentPerformance(agentId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
        <span className="terminal-cursor">{t({ ko: "로딩 중", en: "Loading", ja: "読み込み中", zh: "加载中" })}</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="terminal-empty-state py-8">
        <p className="terminal-empty-state-cmd">$ cat performance.log</p>
        <p className="terminal-empty-state-result">ERROR: could not load data</p>
      </div>
    );
  }

  const { stats, recent_tasks, by_pack } = data;
  const dailyChart = buildDailyChart(recent_tasks);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label={t({ ko: "전체 태스크", en: "Total Tasks", ja: "全タスク", zh: "全部任务" })}
          value={String(stats.tasks_total)}
        />
        <StatCard
          label={t({ ko: "완료", en: "Completed", ja: "完了", zh: "已完成" })}
          value={String(stats.tasks_done)}
          accent="text-green-400"
        />
        <StatCard
          label={t({ ko: "성공률", en: "Success Rate", ja: "成功率", zh: "成功率" })}
          value={`${stats.success_rate}%`}
          accent={stats.success_rate >= 80 ? "text-green-400" : stats.success_rate >= 50 ? "text-yellow-400" : "text-red-400"}
        />
        <StatCard
          label={t({ ko: "평균 소요", en: "Avg Duration", ja: "平均所要", zh: "平均耗时" })}
          value={formatDuration(stats.avg_duration_ms)}
        />
      </div>

      {/* 7-day activity chart */}
      <div className="border p-3" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)", borderRadius: "2px" }}>
        <h4 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "7일 작업 히스토리", en: "7-Day Activity", ja: "7日間の活動", zh: "7日活动" })}
        </h4>
        <DailyBarChart data={dailyChart} t={t} />
      </div>

      {by_pack.length > 0 && (
        <div className="border rounded p-3" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
          <h4 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "팩별 실적", en: "By Pack", ja: "パック別", zh: "按流程包" })}
          </h4>
          <div className="space-y-1">
            {by_pack.map((p) => (
              <div key={p.pack} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--th-text-secondary)" }}>{p.pack}</span>
                <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {p.done_cnt}/{p.cnt} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-mono font-semibold uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "최근 태스크", en: "Recent Tasks", ja: "最近のタスク", zh: "最近任务" })}
        </h4>
        {recent_tasks.length === 0 ? (
          <div className="terminal-empty-state py-4">
            <p className="terminal-empty-state-cmd">$ ls tasks/ --recent</p>
            <p className="terminal-empty-state-result">(empty)</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recent_tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 px-2.5 py-1.5 text-sm"
                style={{ borderRadius: "2px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
              >
                <span
                  className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium"
                  style={{ borderRadius: "2px", ...statusBadgeStyle(task.status) }}
                >
                  {task.status}
                </span>
                <span className="min-w-0 flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{task.title}</span>
                {task.started_at && task.completed_at && (
                  <span className="flex-shrink-0 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {formatDuration(task.completed_at - task.started_at)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="border rounded p-2.5 text-center" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
      <div className={`text-lg font-bold font-mono ${accent ?? ""}`} style={accent ? undefined : { color: "var(--th-text-primary)" }}>{value}</div>
      <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{label}</div>
    </div>
  );
}
