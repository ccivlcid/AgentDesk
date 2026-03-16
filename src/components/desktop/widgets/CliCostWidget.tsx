import { useEffect, useState } from "react";
import { getCliUsage, type CliUsageEntry } from "../../../api/workflow-skills-subtasks";
import { useI18n } from "../../../i18n";

const mono = "var(--th-font-mono)";

export default function CliCostWidget() {
  const [usage, setUsage] = useState<Record<string, CliUsageEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    getCliUsage().then((r) => {
      if (r.ok) setUsage(r.usage);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const entries = usage ? Object.entries(usage) : [];
  const totalActive = entries.filter(([, e]) => e.error === null).length;
  const totalError  = entries.filter(([, e]) => e.error !== null).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 요약 */}
      <div style={{
        display: "flex",
        gap: 16,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 11,
        flexShrink: 0,
      }}>
        <span style={{ color: "var(--th-status-success)" }}>{totalActive} {t({ ko: "활성", en: "active", ja: "アクティブ", zh: "活动" })}</span>
        {totalError > 0 && <span style={{ color: "var(--th-status-error)" }}>{totalError} {t({ ko: "오류", en: "error", ja: "エラー", zh: "错误" })}</span>}
        <span style={{ flex: 1 }} />
        {loading && <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>{t({ ko: "로딩 중...", en: "loading...", ja: "読み込み中...", zh: "加载中..." })}</span>}
      </div>

      {/* 에이전트별 내역 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {entries.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "데이터 없음", en: "No data", ja: "データなし", zh: "无数据" })}
          </div>
        ) : (
          entries.map(([provider, entry]) => {
            const primaryWindow = entry.windows.find((w) => w.label === "Primary" || w.label.includes("5-hour")) ?? entry.windows[0];
            const utilPct = primaryWindow ? Math.round(primaryWindow.utilization * 100) : 0;
            return (
              <div
                key={provider}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 10px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: entry.error ? "var(--th-status-error)" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {provider}
                  </div>
                  {entry.error ? (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-status-error)" }}>{entry.error}</div>
                  ) : primaryWindow ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2 }}>
                        <div style={{ width: `${utilPct}%`, height: "100%", background: utilPct > 80 ? "var(--th-status-error)" : utilPct > 50 ? "var(--th-status-warning)" : "var(--th-status-success)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", width: 28 }}>{utilPct}%</span>
                    </div>
                  ) : null}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    {primaryWindow?.label ?? "—"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
