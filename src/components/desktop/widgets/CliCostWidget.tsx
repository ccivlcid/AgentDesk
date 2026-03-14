import { useEffect, useState } from "react";
import { getCliUsage, type CliUsageEntry } from "../../../api/workflow-skills-subtasks";

const mono = "var(--th-font-mono)";

export default function CliCostWidget() {
  const [usage, setUsage] = useState<Record<string, CliUsageEntry> | null>(null);
  const [loading, setLoading] = useState(true);

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
        <span style={{ color: "#22c55e" }}>{totalActive} active</span>
        {totalError > 0 && <span style={{ color: "#ef4444" }}>{totalError} error</span>}
        <span style={{ flex: 1 }} />
        {loading && <span style={{ fontSize: 9, color: "var(--th-text-muted)" }}>loading...</span>}
      </div>

      {/* 에이전트별 내역 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {entries.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            데이터 없음
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
                  <div style={{ fontFamily: mono, fontSize: 10, color: entry.error ? "#ef4444" : "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {provider}
                  </div>
                  {entry.error ? (
                    <div style={{ fontFamily: mono, fontSize: 9, color: "#ef4444" }}>{entry.error}</div>
                  ) : primaryWindow ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2 }}>
                        <div style={{ width: `${utilPct}%`, height: "100%", background: utilPct > 80 ? "#ef4444" : utilPct > 50 ? "#f59e0b" : "#22c55e", borderRadius: 2 }} />
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
