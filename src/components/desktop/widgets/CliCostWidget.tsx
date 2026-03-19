import { useEffect, useRef, useState, useCallback } from "react";
import { getAgentUsage, getCliUsage, type AgentUsageRow, type CliUsageEntry } from "../../../api/workflow-skills-subtasks";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";

const PROVIDER_ICONS: Record<string, string> = {
  claude:      "◆",
  codex:       "○",
  gemini:      "✦",
  cursor:      "⬡",
  opencode:    "⊞",
  copilot:     "⊙",
  antigravity: "⬟",
  ollama:      "◉",
};

function fmtDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export default function CliCostWidget() {
  const [agents, setAgents] = useState<AgentUsageRow[]>([]);
  const [cliStatus, setCliStatus] = useState<Record<string, CliUsageEntry>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const { t } = useI18n();
  const mountedRef = useRef(true);

  const load = useCallback(() => {
    setLoading(true);
    const since = Date.now() - 24 * 60 * 60 * 1000; // 24h
    Promise.all([
      getAgentUsage(since).catch(() => ({ ok: false, usage: [] as AgentUsageRow[] })),
      getCliUsage().catch(() => ({ ok: false, usage: {} as Record<string, CliUsageEntry> })),
    ])
      .then(([agentRes, cliRes]) => {
        if (!mountedRef.current) return;
        if (!agentRes.ok && !cliRes.ok) { setFetchError(true); return; }
        setAgents(agentRes.usage);
        // 로그인 상태인 provider만 유지 (unauthenticated/not_implemented 제외)
        const activeProviders = Object.fromEntries(
          Object.entries(cliRes.usage).filter(([, e]) => e.error === null),
        );
        setCliStatus(activeProviders);
        setFetchError(false);
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 10px", borderBottom: "1px solid var(--th-border)",
        fontFamily: mono, fontSize: 11, flexShrink: 0,
      }}>
        <span style={{ color: "var(--th-text-secondary)" }}>
          {t({ ko: "최근 24시간", en: "Last 24h", ja: "過去24時間", zh: "最近24小时" })}
        </span>
        <span style={{ flex: 1 }} />
        {loading && (
          <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
          </span>
        )}
        <button
          onClick={load}
          disabled={loading}
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          style={{
            fontFamily: mono, fontSize: 10, background: "none",
            border: "1px solid var(--th-border)",
            color: loading ? "var(--th-text-muted)" : "var(--th-text-secondary)",
            cursor: loading ? "default" : "pointer",
            padding: "1px 6px", borderRadius: 3,
          }}
        >↻</button>
      </div>

      {/* 에이전트 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {fetchError ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-danger, #ef4444)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "서버 연결 실패", en: "Server unreachable", ja: "サーバー接続失敗", zh: "服务器连接失败" })}
          </div>
        ) : !loading && agents.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            <div>{t({ ko: "최근 실행 기록 없음", en: "No recent agent runs", ja: "最近の実行履歴なし", zh: "无最近运行记录" })}</div>
            <div style={{ fontSize: 9, marginTop: 4, opacity: 0.6 }}>
              {t({ ko: "에이전트를 실행하면 여기에 표시됩니다", en: "Run an agent to see usage here", ja: "エージェントを実行すると表示されます", zh: "运行代理后显示" })}
            </div>
          </div>
        ) : (
          agents.map((row) => {
            const icon = PROVIDER_ICONS[row.provider] ?? "·";
            const successRate = row.run_count > 0 ? Math.round((row.success_count / row.run_count) * 100) : 0;
            const barColor = successRate >= 80 ? "var(--th-status-success)" : successRate >= 50 ? "var(--th-status-warning)" : "var(--th-status-error)";
            const displayName = row.agent_name_ko ?? row.agent_name;

            return (
              <div
                key={`${row.agent_id}-${row.provider}`}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderBottom: "1px solid var(--th-border)",
                }}
              >
                {/* 에이전트 아바타 */}
                <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>
                  {row.avatar_emoji ?? "🤖"}
                </span>

                {/* 이름 + 프로바이더 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)" }}>
                      {icon} {row.provider}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>
                      · {row.run_count}{t({ ko: "회", en: "runs", ja: "回", zh: "次" })} · {fmtDuration(row.total_duration_ms)}
                    </span>
                  </div>
                  {/* 성공률 바 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <div style={{ flex: 1, height: 2, background: "var(--th-border)", borderRadius: 1, overflow: "hidden" }}>
                      <div style={{ width: `${successRate}%`, height: "100%", background: barColor, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontFamily: mono, fontSize: 8, color: "var(--th-text-muted)", width: 28, textAlign: "right" }}>
                      {successRate}%
                    </span>
                  </div>
                </div>

                {/* 실패 횟수 */}
                {row.failure_count > 0 && (
                  <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-status-warning)", flexShrink: 0 }}>
                    ✕{row.failure_count}
                  </span>
                )}
              </div>
            );
          })
        )}

        {/* CLI 토큰 창 (로그인된 provider만, 보조 정보) */}
        {!loading && Object.keys(cliStatus).length > 0 && (
          <>
            <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", padding: "8px 10px 2px", letterSpacing: "0.05em" }}>
              — {t({ ko: "CLI 토큰 창", en: "CLI token windows", ja: "CLIトークン枠", zh: "CLI令牌窗口" })} —
            </div>
            {Object.entries(cliStatus).map(([provider, entry]) => {
              const icon = PROVIDER_ICONS[provider] ?? "·";
              const primaryWindow = entry.windows.find((w) => w.label === "Primary" || w.label.includes("5-hour")) ?? entry.windows[0];
              const utilPct = primaryWindow ? Math.round(primaryWindow.utilization * 100) : 0;
              const barColor = utilPct > 80 ? "var(--th-status-error)" : utilPct > 50 ? "var(--th-status-warning)" : "var(--th-status-success)";
              return (
                <div key={provider} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px" }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-accent)", width: 14, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-secondary)" }}>{provider}</span>
                      <div style={{ flex: 1, height: 2, background: "var(--th-border)", borderRadius: 1, overflow: "hidden" }}>
                        <div style={{ width: `${utilPct}%`, height: "100%", background: barColor, transition: "width 0.4s" }} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 8, color: "var(--th-text-muted)", width: 28, textAlign: "right" }}>{utilPct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
