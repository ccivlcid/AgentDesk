import { useState, useEffect, useCallback } from "react";
import AppWindow from "./AppWindow";
import { useI18n } from "../../i18n";
import { getCliUsage, refreshCliUsage, type CliUsageEntry } from "../../api/workflow-skills-subtasks";

const mono = "var(--th-font-mono)";

export default function CliCostWindow() {
  const { t } = useI18n();
  const [usage, setUsage] = useState<Record<string, CliUsageEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCliUsage();
      if (data.ok) setUsage(data.usage);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await refreshCliUsage();
      if (data.ok) setUsage(data.usage);
    } catch { /* ignore */ }
    finally { setRefreshing(false); }
  }, []);

  const refreshBtn = (
    <button
      type="button"
      onClick={() => void handleRefresh()}
      disabled={refreshing}
      title={t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
      style={{
        background: "transparent",
        border: "1px solid var(--th-border)",
        borderRadius: 6,
        padding: "2px 8px",
        cursor: refreshing ? "not-allowed" : "pointer",
        color: "var(--th-text-muted)",
        fontFamily: mono,
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={refreshing ? { animation: "spin 1s linear infinite" } : {}}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      {refreshing
        ? t({ ko: "갱신 중...", en: "Refreshing...", ja: "更新中...", zh: "刷新中..." })
        : t({ ko: "갱신", en: "Refresh", ja: "更新", zh: "刷新" })
      }
    </button>
  );

  return (
    <AppWindow
      windowType="cli-usage"
      title={t({ ko: "CLI 비용", en: "CLI Cost", ja: "CLIコスト", zh: "CLI成本" })}
      emoji={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
      defaultWidth={520}
      defaultHeight={460}
      headerActions={refreshBtn}
    >
      <div style={{ padding: 20, fontFamily: mono, fontSize: 12, overflowY: "auto", height: "100%" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--th-text-muted)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", marginRight: 8 }}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        ) : !usage || Object.keys(usage).length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--th-text-muted)", gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span style={{ fontSize: 11 }}>{t({ ko: "비용 데이터 없음", en: "No cost data", ja: "コストデータなし", zh: "无成本数据" })}</span>
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", opacity: 0.6 }}>
              {t({ ko: "CLI 프로바이더가 연결되면 비용이 표시됩니다", en: "Cost data appears when CLI providers are connected", ja: "CLIプロバイダが接続されるとコストが表示されます", zh: "连接CLI提供商后将显示成本数据" })}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Object.entries(usage).map(([provider, entry]) => (
              <div key={provider} style={{ border: "1px solid var(--th-border)", borderRadius: 10, overflow: "hidden" }}>
                {/* Provider header */}
                <div style={{ padding: "10px 14px", background: "var(--th-hover-overlay-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--th-border)" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "var(--th-text-primary)", textTransform: "capitalize" }}>{provider}</span>
                  {entry.error && (
                    <span style={{ fontSize: 9, color: "var(--th-danger-text)", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                      {entry.error}
                    </span>
                  )}
                </div>
                {/* Usage windows */}
                {entry.windows.length === 0 && !entry.error ? (
                  <div style={{ padding: "12px 14px", color: "var(--th-text-muted)", fontSize: 11 }}>
                    {t({ ko: "사용량 데이터 없음", en: "No usage data", ja: "使用量データなし", zh: "无用量数据" })}
                  </div>
                ) : (
                  <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {entry.windows.map((w, i) => {
                      const pct = Math.round(w.utilization * 100);
                      const barColor = pct > 80 ? "var(--th-danger-text, #ef4444)" : pct > 50 ? "var(--th-accent, #f59e0b)" : "var(--th-success, #22c55e)";
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>{w.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: "var(--th-border)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
                          </div>
                          {w.resetsAt && (
                            <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                              {t({ ko: "리셋:", en: "Resets:", ja: "リセット:", zh: "重置:" })} {new Date(w.resetsAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppWindow>
  );
}
