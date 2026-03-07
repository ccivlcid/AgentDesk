import type { Department, Agent } from "../../types";
import type { CliStatusMap } from "../../types";
import type { CliUsageEntry } from "../../api";

interface Props {
  departments: Department[];
  agents: Agent[];
  tasks?: import("../../types").Task[];
  selectedDeptId: string | null;
  onSelectDept: (dept: Department) => void;
  onCallElevator?: (dept: Department, floorIdx: number) => void;
  onScrollToFloor?: (target: "ceo" | "conf" | "basement") => void;
  visitorsByDeptId?: Record<string, number>;
  cliStatus?: CliStatusMap | null;
  cliUsage?: Record<string, CliUsageEntry> | null;
  cliUsageRefreshing?: boolean;
  onRefreshCliUsage?: () => void;
}

function getAttrFillColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#f59e0b";
  if (pct >= 40) return "#fbbf24";
  return "#f87171";
}

export default function OfficeDeptPanel({
  departments,
  agents,
  tasks,
  selectedDeptId,
  onSelectDept,
  onCallElevator,
  onScrollToFloor,
  visitorsByDeptId,
  cliStatus,
  cliUsage,
  cliUsageRefreshing,
  onRefreshCliUsage,
}: Props) {
  const sortedDepts = [...departments].sort((a, b) => a.sort_order - b.sort_order);

  // CLI usage — pick the most-used provider's utilization for the summary bar
  const cliProviders = ["claude", "codex", "gemini"] as const;
  const bestUsage = (() => {
    if (!cliUsage) return null;
    let maxPct = 0;
    let label = "";
    for (const key of cliProviders) {
      const entry = cliUsage[key];
      if (!entry || entry.error) continue;
      const w = entry.windows?.[0];
      if (w && w.utilization > maxPct) {
        maxPct = w.utilization;
        label = `${key}: ${Math.round(w.utilization * 100)}%`;
      }
    }
    return maxPct > 0 ? { pct: Math.round(maxPct * 100), label } : null;
  })();

  const isConnected = cliProviders.some((k) => {
    const s = cliStatus?.[k as keyof CliStatusMap];
    return s?.installed && s?.authenticated;
  });

  return (
    <>
      <div className="office-panel-label">Building</div>

      {/* P — CEO Penthouse (top of tower) */}
      <div
        className="office-dept-item"
        style={{ cursor: "pointer", opacity: 0.9 }}
        onClick={() => onScrollToFloor?.("ceo")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <span style={{
            fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700,
            color: "#000", background: "#f59e0b",
            padding: "0 4px", lineHeight: "14px", flexShrink: 0, letterSpacing: 1,
          }}>P</span>
          <div className="office-dept-item__name" style={{ flex: 1, minWidth: 0, color: "var(--th-accent)" }}>
            CEO Penthouse
          </div>
        </div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "var(--th-text-muted)", letterSpacing: 1 }}>
          ↑ scroll to top
        </div>
      </div>

      {/* CONF — Meeting Room (fixed floor between penthouse and depts) */}
      <div
        className="office-dept-item"
        style={{ cursor: "pointer", opacity: 0.85 }}
        onClick={() => onScrollToFloor?.("conf")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <span style={{
            fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700,
            color: "#000", background: "#a855f7",
            padding: "0 4px", lineHeight: "14px", flexShrink: 0, letterSpacing: 1,
          }}>CONF</span>
          <div className="office-dept-item__name" style={{ flex: 1, minWidth: 0, color: "var(--th-text-secondary)" }}>
            Meeting Room
          </div>
        </div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "var(--th-text-muted)", letterSpacing: 1 }}>
          ↑ scroll to view
        </div>
      </div>

      <div className="office-panel-label">Departments</div>

      {sortedDepts.length === 0 ? (
        <div style={{ padding: "12px", fontFamily: "var(--th-font-mono)", fontSize: "0.65rem", color: "var(--th-text-muted)" }}>
          $ ls depts/ (empty)
        </div>
      ) : (
        sortedDepts.map((dept, floorIdx) => {
          const deptAgents = agents.filter((a) => a.department_id === dept.id);
          const runningCount = deptAgents.filter((a) => a.status === "working").length;
          const idleCount = deptAgents.filter((a) => a.status === "idle").length;
          const breakCount = deptAgents.filter((a) => a.status === "break").length;
          const totalCount = deptAgents.length;
          const activityPct = totalCount > 0 ? Math.round((runningCount / totalCount) * 100) : 0;
          const floorLabel = `F${floorIdx + 1}`;

          const deptAgentIds = new Set(deptAgents.map((a) => a.id));
          const activeTasks = tasks?.filter((t) => deptAgentIds.has(t.assigned_agent_id ?? "") && t.status === "in_progress").length ?? 0;
          const doneTasks = tasks?.filter((t) => deptAgentIds.has(t.assigned_agent_id ?? "") && t.status === "done").length ?? 0;

          return (
            <div
              key={dept.id}
              className={`office-dept-item${selectedDeptId === dept.id ? " office-dept-item--active" : ""}`}
              onClick={() => onSelectDept(dept)}
            >
              {/* FM-style header row: floor badge + activity dot + name + lift button */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                <span style={{
                  fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700,
                  color: "#000", background: "var(--th-accent)",
                  padding: "0 4px", lineHeight: "14px", flexShrink: 0, letterSpacing: 1,
                }}>
                  {floorLabel}
                </span>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                  background: activityPct >= 70 ? "#22c55e" : activityPct >= 30 ? "#f59e0b" : totalCount === 0 ? "#444" : "#f87171",
                }} title={`Activity: ${activityPct}%`} />
                <div className="office-dept-item__name" title={dept.name} style={{ flex: 1, minWidth: 0 }}>
                  {dept.icon} {dept.name}
                </div>
                {visitorsByDeptId?.[dept.id] ? (
                  <span style={{
                    fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", fontWeight: 700,
                    color: "#22c55e", background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.35)", padding: "0 3px", lineHeight: "14px",
                    flexShrink: 0, letterSpacing: 1,
                  }} title={`${visitorsByDeptId[dept.id]} visitor(s) incoming`}>
                    ↓{visitorsByDeptId[dept.id]}
                  </span>
                ) : null}
                {onCallElevator && (
                  <button
                    className="fm-lift-btn"
                    title={`Send elevator to ${dept.name} (${floorLabel})`}
                    onClick={(e) => { e.stopPropagation(); onCallElevator(dept, floorIdx + 1); }}
                  >
                    LIFT
                  </button>
                )}
              </div>

              {/* FM attribute bars row */}
              <div className="fm-attr-row">
                <div className="fm-attr">
                  <span className="fm-attr__lbl">ACT</span>
                  <div className="fm-attr__bar">
                    <div className="fm-attr__fill" style={{ width: `${activityPct}%`, background: getAttrFillColor(activityPct) }} />
                  </div>
                  <span className="fm-attr__val">{activityPct}</span>
                </div>
                <div className="fm-attr__agents">
                  <span style={{ color: "#22c55e" }}>{runningCount}W</span>
                  {idleCount > 0 && <span style={{ color: "var(--th-text-muted)" }}> {idleCount}I</span>}
                  {breakCount > 0 && <span style={{ color: "var(--th-accent)" }}> {breakCount}B</span>}
                  {totalCount === 0 && <span style={{ color: "var(--th-text-muted)" }}>no agents</span>}
                </div>
              </div>
              {/* Task mini-summary */}
              {(activeTasks > 0 || doneTasks > 0) && (
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  {activeTasks > 0 && (
                    <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", color: "#f59e0b", letterSpacing: 1 }}>
                      ▶{activeTasks} ACTIVE
                    </span>
                  )}
                  {doneTasks > 0 && (
                    <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", color: "#22c55e", letterSpacing: 1 }}>
                      ✓{doneTasks} DONE
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* B1 — Break Room (basement, at bottom of tower) */}
      <div
        className="office-dept-item"
        style={{ cursor: "pointer", opacity: 0.85 }}
        onClick={() => onScrollToFloor?.("basement")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <span style={{
            fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700,
            color: "#000", background: "#22c55e",
            padding: "0 4px", lineHeight: "14px", flexShrink: 0, letterSpacing: 1,
          }}>B1</span>
          <div className="office-dept-item__name" style={{ flex: 1, minWidth: 0, color: "var(--th-text-secondary)" }}>
            Break Room
          </div>
        </div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "var(--th-text-muted)", letterSpacing: 1 }}>
          ↓ scroll to view
        </div>
      </div>

      <div className="office-panel-divider" />
      <div className="office-panel-label">CLI Usage</div>

      {!isConnected ? (
        <div style={{ padding: "6px 12px 10px", fontFamily: "var(--th-font-mono)", fontSize: "0.6rem", color: "var(--th-text-muted)", lineHeight: 1.5 }}>
          No CLI connected.<br />
          Check Settings.
        </div>
      ) : (
        <div style={{ padding: "6px 12px 10px" }}>
          {bestUsage ? (
            <>
              <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.65rem", color: bestUsage.pct >= 80 ? "#f85149" : "var(--th-accent)", marginBottom: 4 }}>
                {bestUsage.label}
              </div>
              <div style={{ height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, bestUsage.pct)}%`,
                    background: bestUsage.pct >= 80 ? "#f85149" : "var(--th-accent)",
                    borderRadius: 2,
                    transition: "width 300ms linear",
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.6rem", color: "var(--th-text-muted)" }}>
              No data yet.
            </div>
          )}
          {onRefreshCliUsage && (
            <button
              className="office-actionbar-btn"
              style={{ marginTop: 6, padding: "2px 0" }}
              onClick={(e) => { e.stopPropagation(); onRefreshCliUsage(); }}
              disabled={cliUsageRefreshing}
            >
              {cliUsageRefreshing ? "..." : "REFRESH"}
            </button>
          )}
        </div>
      )}
    </>
  );
}
