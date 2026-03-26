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
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        padding: "3px 10px",
        cursor: refreshing ? "not-allowed" : "pointer",
        color: "#6B7280",
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.2s",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={refreshing ? { animation: "spin 1s linear infinite" } : {}}>
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
      <div style={{ padding: 24, fontFamily: mono, fontSize: 12, overflowY: "auto", height: "100%", background: "#F3F4F6" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" style={{ animation: "spin 1s linear infinite", marginRight: 8 }}>
              <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </div>
        ) : !usage || Object.keys(usage).length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#9CA3AF", gap: 10 }}>
            <div style={{ padding: 12, background: "#F9FAFB", borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{t({ ko: "비용 데이터 없음", en: "No cost data", ja: "コストデータなし", zh: "无成本数据" })}</span>
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>
              {t({ ko: "CLI 프로바이더가 연결되면 비용이 표시됩니다", en: "Cost data appears when CLI providers are connected", ja: "CLIプロバイダが接続されるとコストが表示されます", zh: "连接CLI提供商后将显示成本数据" })}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6", display: "flex", alignItems: "center" }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#374151", margin: 0 }}>
                {t({ ko: "프로바이더별 사용량", en: "Usage by Provider", ja: "プロバイダ別使用量", zh: "各提供商用量" })}
              </h3>
            </div>

            {Object.entries(usage).map(([provider, entry]) => (
              <div key={provider} style={{ border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", background: "#FFFFFF" }}>
                {/* Provider header */}
                <div style={{ padding: "12px 18px", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontWeight: 800, fontSize: 12, color: "#111827", textTransform: "capitalize" }}>{provider}</span>
                  {entry.error && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "2px 8px", borderRadius: 6 }}>
                      {entry.error}
                    </span>
                  )}
                </div>
                {/* Usage windows */}
                {entry.windows.length === 0 && !entry.error ? (
                  <div style={{ padding: "14px 18px", color: "#9CA3AF", fontSize: 11 }}>
                    {t({ ko: "사용량 데이터 없음", en: "No usage data", ja: "使用量データなし", zh: "无用量数据" })}
                  </div>
                ) : (
                  <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {entry.windows.map((w, i) => {
                      const pct = Math.round(w.utilization * 100);
                      const barColor = pct > 80 ? "#DC2626" : pct > 50 ? "#D97706" : "#059669";
                      const barBg = pct > 80 ? "#FEF2F2" : pct > 50 ? "#FFFBEB" : "#ECFDF5";
                      return (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>{w.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: barColor, background: barBg, padding: "1px 8px", borderRadius: 6 }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.3s ease" }} />
                          </div>
                          {w.resetsAt && (
                            <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>
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
