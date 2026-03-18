import { useEffect, useRef, useState, useCallback } from "react";
import { getCliUsage, refreshCliUsage, type CliUsageEntry } from "../../../api/workflow-skills-subtasks";
import { useWebSocket } from "../../../hooks/useWebSocket";
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
};

export default function CliCostWidget() {
  const [usage, setUsage] = useState<Record<string, CliUsageEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { t } = useI18n();
  const { on } = useWebSocket();
  const mountedRef = useRef(true);

  const applyUsage = useCallback((u: Record<string, CliUsageEntry>) => {
    if (!mountedRef.current) return;
    // 실제 구현된 항목만 표시 (not_implemented 제외)
    const filtered = Object.fromEntries(
      Object.entries(u).filter(([, e]) => e.error !== "not_implemented"),
    );
    setUsage(filtered);
    setLastUpdated(new Date());
  }, []);

  // 마운트 시 서버에서 강제 refresh (캐시 기다리지 않음)
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    refreshCliUsage()
      .then((r) => { if (r.ok) applyUsage(r.usage); })
      .catch(() => {
        // refresh 실패 시 캐시 읽기 시도
        return getCliUsage().then((r) => { if (r.ok) applyUsage(r.usage); });
      })
      .catch(() => { if (mountedRef.current) setFetchError(true); })
      .finally(() => { if (mountedRef.current) setLoading(false); });

    return () => { mountedRef.current = false; };
  }, [applyUsage]);

  // WebSocket: 서버가 cli_usage_update 브로드캐스트하면 즉시 반영
  useEffect(() => {
    return on("cli_usage_update", (payload) => {
      if (payload && typeof payload === "object") {
        applyUsage(payload as Record<string, CliUsageEntry>);
      }
    });
  }, [on, applyUsage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshCliUsage()
      .then((r) => { if (r.ok) applyUsage(r.usage); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setRefreshing(false); });
  }, [applyUsage]);

  const entries = usage ? Object.entries(usage) : [];
  const activeEntries = entries.filter(([, e]) => e.error === null && e.windows.length > 0);
  const errorEntries  = entries.filter(([, e]) => e.error !== null);

  const relativeTime = lastUpdated
    ? `${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 바 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 11,
        flexShrink: 0,
      }}>
        <span style={{ color: "var(--th-status-success)" }}>
          {activeEntries.length} {t({ ko: "활성", en: "active", ja: "アクティブ", zh: "活动" })}
        </span>
        {errorEntries.length > 0 && (
          <span style={{ color: "var(--th-status-error)" }}>
            {errorEntries.length} {t({ ko: "오류", en: "error", ja: "エラー", zh: "错误" })}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {relativeTime && !loading && (
          <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>{relativeTime}</span>
        )}
        {loading && (
          <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}
          </span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
          style={{
            fontFamily: mono,
            fontSize: 10,
            background: "none",
            border: "1px solid var(--th-border)",
            color: refreshing ? "var(--th-text-muted)" : "var(--th-text-secondary)",
            cursor: refreshing ? "default" : "pointer",
            padding: "1px 6px",
            borderRadius: 3,
            transition: "color 0.12s",
          }}
        >
          {refreshing ? "…" : "↻"}
        </button>
      </div>

      {/* 항목 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {fetchError ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-danger, #ef4444)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "서버 연결 실패", en: "Server unreachable", ja: "サーバー接続失敗", zh: "服务器连接失败" })}
          </div>
        ) : !loading && entries.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            <div style={{ marginBottom: 4 }}>
              {t({ ko: "추적 가능한 CLI 없음", en: "No tracked CLIs", ja: "追跡可能なCLIなし", zh: "无可追踪的CLI" })}
            </div>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", opacity: 0.7 }}>
              {t({ ko: "claude / codex / gemini 로그인 필요", en: "Login to claude / codex / gemini", ja: "claude / codex / gemini にログインが必要", zh: "需要登录 claude / codex / gemini" })}
            </div>
          </div>
        ) : (
          entries.map(([provider, entry]) => {
            const icon = PROVIDER_ICONS[provider] ?? "·";
            const isError = entry.error !== null;
            const primaryWindow =
              entry.windows.find((w) => w.label === "Primary" || w.label.includes("5-hour")) ??
              entry.windows[0];
            const utilPct = primaryWindow ? Math.round(primaryWindow.utilization * 100) : 0;
            const barColor =
              utilPct > 80 ? "var(--th-status-error)" :
              utilPct > 50 ? "var(--th-status-warning)" :
              "var(--th-status-success)";

            return (
              <div
                key={provider}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--th-border)",
                  opacity: isError ? 0.55 : 1,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 12, color: isError ? "var(--th-text-muted)" : "var(--th-accent)", width: 14, textAlign: "center", flexShrink: 0 }}>
                  {icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: isError ? "var(--th-status-error)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {provider}
                  </div>
                  {isError ? (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-status-error)", marginTop: 1 }}>
                      {entry.error === "unauthenticated"
                        ? t({ ko: "미인증 — CLI 로그인 필요", en: "not authenticated", ja: "未認証", zh: "未认证" })
                        : entry.error}
                    </div>
                  ) : primaryWindow ? (
                    <div style={{ marginTop: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${utilPct}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.4s" }} />
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", width: 30, textAlign: "right" }}>{utilPct}%</span>
                      </div>
                      {entry.windows.length > 1 && (
                        <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                          {entry.windows.map((w) => (
                            <span key={w.label} style={{ fontFamily: mono, fontSize: 8, color: "var(--th-text-muted)" }}>
                              {w.label} {Math.round(w.utilization * 100)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>
                      {t({ ko: "데이터 없음", en: "no data", ja: "データなし", zh: "无数据" })}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    {primaryWindow?.label ?? ""}
                  </div>
                  {primaryWindow?.resetsAt && (
                    <div style={{ fontFamily: mono, fontSize: 8, color: "var(--th-text-muted)", marginTop: 1 }}>
                      ↺ {new Date(primaryWindow.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
