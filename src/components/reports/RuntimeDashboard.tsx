import { useState, useEffect } from "react";
import { getRuntimeStats, type RuntimeStats } from "../../api/agent-runtime";
import { useI18n } from "../../i18n";

const mono = "var(--th-font-mono, monospace)";

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 130, padding: "14px 16px", borderRadius: 8,
      background: `${color}0a`, border: `1px solid ${color}20`,
    }}>
      <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: mono, fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniBar({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{ width: `${(item.value / total) * 100}%`, background: item.color, minWidth: item.value > 0 ? 2 : 0 }}
          title={`${item.label}: ${item.value}`}
        />
      ))}
    </div>
  );
}

function DailyChart({ daily }: { daily: RuntimeStats["daily"] }) {
  if (daily.length === 0) return <div style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.25)", padding: 16 }}>No data yet</div>;
  const maxRuns = Math.max(...daily.map((d) => d.runs), 1);
  const barWidth = Math.max(8, Math.min(20, Math.floor(500 / daily.length)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, padding: "8px 0" }}>
      {daily.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div
            style={{
              width: barWidth, borderRadius: 2,
              height: Math.max(2, (d.runs / maxRuns) * 64),
              background: "var(--th-accent)", opacity: 0.7,
            }}
            title={`${d.day}: ${d.runs} runs, ${fmtNum(d.tokens)} tokens`}
          />
          {i % Math.ceil(daily.length / 8) === 0 && (
            <span style={{ fontFamily: mono, fontSize: 7, color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>
              {d.day.slice(5)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RuntimeDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState<RuntimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRuntimeStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
        </span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 24 }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {t({ ko: "데이터 없음", en: "No data available", ja: "データなし", zh: "无数据" })}
        </span>
      </div>
    );
  }

  const { totals, byProvider, byModel, daily } = stats;
  const successRate = totals.total_runs > 0 ? Math.round((totals.completed / totals.total_runs) * 100) : 0;
  const totalTokens = (totals.total_input_tokens ?? 0) + (totals.total_output_tokens ?? 0);

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <StatCard
          label={t({ ko: "총 실행", en: "Total Runs", ja: "総実行", zh: "总运行" })}
          value={String(totals.total_runs)}
          sub={`${totals.completed} ${t({ ko: "완료", en: "completed", ja: "完了", zh: "完成" })}`}
          color="#5ac8fa"
        />
        <StatCard
          label={t({ ko: "성공률", en: "Success Rate", ja: "成功率", zh: "成功率" })}
          value={`${successRate}%`}
          sub={`${totals.failed} ${t({ ko: "실패", en: "failed", ja: "失敗", zh: "失败" })}`}
          color={successRate >= 80 ? "#30d158" : successRate >= 50 ? "#f59e0b" : "#ff453a"}
        />
        <StatCard
          label={t({ ko: "총 토큰", en: "Total Tokens", ja: "トークン", zh: "总令牌" })}
          value={fmtNum(totalTokens)}
          sub={`${fmtNum(totals.total_input_tokens ?? 0)} in / ${fmtNum(totals.total_output_tokens ?? 0)} out`}
          color="#bf5af2"
        />
        <StatCard
          label={t({ ko: "도구 호출", en: "Tool Calls", ja: "ツール呼出", zh: "工具调用" })}
          value={fmtNum(totals.total_tool_calls ?? 0)}
          color="#f59e0b"
        />
      </div>

      {/* Success/Fail bar */}
      <div>
        <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
          {t({ ko: "실행 결과", en: "Run Results", ja: "実行結果", zh: "运行结果" })}
        </div>
        <MiniBar
          items={[
            { label: "Completed", value: totals.completed, color: "#30d158" },
            { label: "Failed", value: totals.failed, color: "#ff453a" },
            { label: "Other", value: totals.total_runs - totals.completed - totals.failed, color: "#8e8e93" },
          ]}
          total={totals.total_runs}
        />
      </div>

      {/* Daily trend */}
      {daily.length > 0 && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {t({ ko: "최근 30일 실행 추이", en: "Last 30 Days", ja: "過去30日間", zh: "近30天" })}
          </div>
          <DailyChart daily={daily} />
        </div>
      )}

      {/* Provider breakdown */}
      {byProvider.length > 0 && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {t({ ko: "프로바이더별", en: "By Provider", ja: "プロバイダ別", zh: "按提供商" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {byProvider.map((p) => (
              <div key={p.provider} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.7)", minWidth: 90 }}>
                  {p.provider ?? "unknown"}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)" }}>
                  {p.runs} runs
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: "auto" }}>
                  {fmtNum(p.input_tokens + p.output_tokens)} tokens
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Model breakdown */}
      {byModel.length > 0 && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {t({ ko: "모델별", en: "By Model", ja: "モデル別", zh: "按模型" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {byModel.map((m) => (
              <div key={m.model} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.7)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.model}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", flexShrink: 0 }}>
                  {m.runs} runs
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                  {fmtNum(m.input_tokens + m.output_tokens)} tok
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
