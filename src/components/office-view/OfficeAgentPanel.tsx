import { AnimatePresence, motion } from "framer-motion";
import type { Agent, Department, Task } from "../../types";

interface Props {
  selectedAgent: Agent | null;
  selectedDept: Department | null;
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  ceoIncoming?: number;
  visitingAgentIds?: Set<string>;
  onViewAgent: (agent: Agent) => void;
  onViewDept: (dept: Department) => void;
}

const ATTR_LABELS: Array<{ key: keyof Agent | string; label: string }> = [
  { key: "stats_tasks_done", label: "Output" },
  { key: "stats_xp", label: "XP" },
];

function attrColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 60) return "#f59e0b";
  if (pct >= 40) return "#fbbf24";
  return "#f87171";
}

function statusBadgeClass(status: Agent["status"]): string {
  switch (status) {
    case "working": return "status-badge-running";
    case "break": return "status-badge-paused";
    case "offline": return "status-badge-error";
    default: return "status-badge-idle";
  }
}

function statusLabel(status: Agent["status"]): string {
  switch (status) {
    case "working": return "RUN";
    case "break": return "BREAK";
    case "offline": return "OFFLINE";
    default: return "IDLE";
  }
}

function taskStatusClass(status: Task["status"]): string {
  switch (status) {
    case "in_progress": return "status-badge-running";
    case "review": return "status-badge-paused";
    case "done": return "status-badge-done";
    case "cancelled": return "status-badge-error";
    default: return "status-badge-idle";
  }
}

function taskStatusLabel(status: Task["status"]): string {
  switch (status) {
    case "in_progress": return "RUN";
    case "collaborating": return "COLLAB";
    case "review": return "REVIEW";
    case "done": return "DONE";
    case "cancelled": return "CANCEL";
    case "planned": return "PLAN";
    case "pending": return "WAIT";
    default: return "INBOX";
  }
}

/** Stable hash of string → number 0–99 */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

function AgentView({ agent, tasks, departments, visitingAgentIds, onViewAgent }: { agent: Agent; tasks: Task[]; departments: Department[]; visitingAgentIds?: Set<string>; onViewAgent: (a: Agent) => void }) {
  const dept = departments.find((d) => d.id === agent.department_id);
  const agentTasks = tasks
    .filter((t) => t.assigned_agent_id === agent.id && t.status !== "done" && t.status !== "cancelled")
    .slice(0, 3);

  // Derive pseudo-attributes from real stats (0–100 scale)
  const tasksDone = agent.stats_tasks_done ?? 0;
  const xp = agent.stats_xp ?? 0;
  const outputScore = Math.min(100, Math.round((tasksDone / 200) * 100));
  const xpScore = Math.min(100, Math.round((xp / 10000) * 100));
  const activityScore = agent.status === "working" ? 92 : agent.status === "break" ? 40 : 20;
  // Stable per-agent pseudo-attributes seeded from agent ID
  const idHash = stableHash(agent.id);
  const reliabilityScore = 50 + (idHash % 50); // 50–99
  const teamworkScore = 40 + (stableHash(agent.id + "tw") % 60); // 40–99

  const attrs = [
    { label: "Activity", value: activityScore },
    { label: "Output", value: outputScore },
    { label: "XP Lvl", value: xpScore },
    { label: "Reliab.", value: reliabilityScore },
    { label: "Teamwk", value: teamworkScore },
  ];

  const overallRating = Math.round((activityScore + outputScore + xpScore + reliabilityScore + teamworkScore) / 5);
  const ratingColor = overallRating >= 80 ? "#22c55e" : overallRating >= 60 ? "#f59e0b" : overallRating >= 40 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>{agent.avatar_emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="office-agent-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {agent.name}
          </div>
          <div className="office-agent-role">
            {dept ? `${dept.icon} ${dept.name}` : agent.role.replace(/_/g, " ")}
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <span className={`status-badge ${statusBadgeClass(agent.status)}`}>{statusLabel(agent.status)}</span>
            <span style={{
              fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", fontWeight: 700,
              color: "var(--th-text-muted)", background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--th-border)", padding: "0 3px", lineHeight: "13px",
              letterSpacing: 1, textTransform: "uppercase",
            }}>{agent.cli_provider}</span>
            {visitingAgentIds?.has(agent.id) && (
              <span style={{
                fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", fontWeight: 700,
                color: "#22c55e", background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.35)", padding: "0 3px", lineHeight: "13px",
                letterSpacing: 1,
              }}>VISITING</span>
            )}
          </div>
        </div>
        {/* FM-style overall rating */}
        <div style={{
          width: 36, height: 36, border: `2px solid ${ratingColor}`, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.95rem", fontWeight: 700, color: ratingColor, lineHeight: 1 }}>
            {overallRating}
          </div>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.4rem", color: "var(--th-text-muted)", letterSpacing: 1 }}>OVR</div>
        </div>
      </div>

      {/* Attributes */}
      <div className="office-panel-label" style={{ padding: "6px 0 4px" }}>Attributes</div>
      {attrs.map(({ label, value }) => (
        <div key={label} className="office-attr-row">
          <div className="office-attr-label">{label}</div>
          <div className="office-attr-track">
            <div className="office-attr-fill" style={{ width: `${value}%`, background: attrColor(value) }} />
          </div>
          <div className="office-attr-value">{value}</div>
        </div>
      ))}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 0, marginTop: 8, marginBottom: 4, border: "1px solid var(--th-border)" }}>
        {[
          { v: String(tasksDone), l: "DONE", c: "#22c55e" },
          { v: xp.toLocaleString(), l: "XP", c: "var(--th-accent)" },
          { v: `LVL ${Math.floor(xp / 1000) + 1}`, l: "LEVEL", c: "#a78bfa" },
        ].map(({ v, l, c }, i, arr) => (
          <div key={l} style={{ textAlign: "center", flex: 1, padding: "3px 0", borderRight: i < arr.length - 1 ? "1px solid var(--th-border)" : "none" }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.7rem", fontWeight: 600, color: c, lineHeight: 1.2 }}>{v}</div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", color: "var(--th-text-muted)", letterSpacing: "0.06em" }}>{l}</div>
          </div>
        ))}
      </div>
      {/* XP progress to next level */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", flexShrink: 0, letterSpacing: 1 }}>XP</div>
        <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(xp % 1000) / 10}%`, background: "#a78bfa", borderRadius: 2 }} />
        </div>
        <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", flexShrink: 0 }}>
          {xp % 1000}/1000
        </div>
      </div>

      {/* Active tasks */}
      {agentTasks.length > 0 && (
        <>
          <div className="office-panel-label" style={{ padding: "6px 0 4px" }}>Active Tasks</div>
          {agentTasks.map((task) => (
            <div key={task.id} className="office-task-row">
              <div className="office-task-id">#{task.id.slice(-4)}</div>
              <div className="office-task-title" title={task.title}>{task.title}</div>
              <span className={`status-badge ${taskStatusClass(task.status)}`}>{taskStatusLabel(task.status)}</span>
            </div>
          ))}
        </>
      )}

      {/* FM-style form — last 5 tasks */}
      {(() => {
        const allAgentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
        const recent = allAgentTasks.slice(-5);
        if (recent.length === 0) return null;
        return (
          <>
            <div className="office-panel-label" style={{ padding: "6px 0 3px" }}>Form</div>
            <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
              {recent.map((t) => {
                const color = t.status === "done" ? "#22c55e" : t.status === "in_progress" ? "#f59e0b" : t.status === "cancelled" ? "#f87171" : "#555";
                return (
                  <div key={t.id} title={t.title} style={{
                    width: 14, height: 14, background: color, opacity: 0.85,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--th-font-mono)", fontSize: "0.4rem", color: "#000", fontWeight: 700,
                  }}>
                    {t.status === "done" ? "W" : t.status === "cancelled" ? "L" : "D"}
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Actions */}
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        <button className="office-panel-btn office-panel-btn--primary" onClick={() => onViewAgent(agent)}>
          View Profile
        </button>
      </div>
    </div>
  );
}

function DeptView({ dept, agents, tasks, visitingAgentIds, onViewDept }: { dept: Department; agents: Agent[]; tasks: Task[]; visitingAgentIds?: Set<string>; onViewDept: (d: Department) => void }) {
  const deptAgents = agents.filter((a) => a.department_id === dept.id);
  const deptAgentIds = new Set(deptAgents.map((a) => a.id));
  const running = deptAgents.filter((a) => a.status === "working").length;
  const idle = deptAgents.filter((a) => a.status === "idle").length;
  const onBreak = deptAgents.filter((a) => a.status === "break").length;
  const deptTasksDone = deptAgents.reduce((sum, a) => sum + (a.stats_tasks_done ?? 0), 0);
  const deptActiveTasks = tasks.filter((t) => deptAgentIds.has(t.assigned_agent_id ?? "") && t.status === "in_progress").length;
  const activityPct = deptAgents.length > 0 ? Math.round((running / deptAgents.length) * 100) : 0;
  const efficiencyPct = deptAgents.length > 0 ? Math.min(100, Math.round(((running + idle * 0.3) / deptAgents.length) * 100)) : 0;

  return (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Dept header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>{dept.icon}</div>
        <div>
          <div className="office-agent-name">{dept.name}</div>
          <div className="office-agent-role">Department</div>
        </div>
      </div>

      {/* FM-style dept stats */}
      <div className="office-panel-label" style={{ padding: "6px 0 4px" }}>Dept Stats</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {[
          { v: deptAgents.length, l: "AGT", c: "var(--th-text-primary)" },
          { v: running, l: "RUN", c: "#22c55e" },
          { v: idle, l: "IDL", c: "var(--th-text-muted)" },
          { v: onBreak, l: "BRK", c: "var(--th-accent)" },
          { v: deptActiveTasks, l: "TSK", c: "#f59e0b" },
          { v: deptTasksDone, l: "DONE", c: "var(--th-accent)" },
        ].map(({ v, l, c }) => (
          <div key={l} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.75rem", fontWeight: 600, color: c }}>{v}</div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", letterSpacing: "0.08em" }}>{l}</div>
          </div>
        ))}
      </div>
      {/* Activity + Efficiency bars */}
      {[
        { label: "Activity", pct: activityPct },
        { label: "Efficiency", pct: efficiencyPct },
      ].map(({ label, pct }) => (
        <div key={label} className="office-attr-row" style={{ marginBottom: 3 }}>
          <div className="office-attr-label">{label}</div>
          <div className="office-attr-track">
            <div className="office-attr-fill" style={{ width: `${pct}%`, background: attrColor(pct) }} />
          </div>
          <div className="office-attr-value">{pct}</div>
        </div>
      ))}

      {/* Agent mini list */}
      {deptAgents.length > 0 && (
        <>
          <div className="office-panel-label" style={{ padding: "4px 0" }}>Roster</div>
          {deptAgents.map((agent) => {
            const isVisiting = visitingAgentIds?.has(agent.id);
            return (
              <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderBottom: "1px solid var(--th-border)" }}>
                <span style={{ fontSize: "0.9rem", opacity: isVisiting ? 0.5 : 1 }}>{agent.avatar_emoji}</span>
                <span style={{ flex: 1, fontSize: "0.7rem", color: isVisiting ? "var(--th-text-muted)" : "var(--th-text-secondary)", fontFamily: "var(--th-font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</span>
                {isVisiting ? (
                  <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", padding: "0 3px", lineHeight: "13px", letterSpacing: 1 }}>AWAY</span>
                ) : (
                  <span className={`status-badge ${statusBadgeClass(agent.status)}`}>{statusLabel(agent.status)}</span>
                )}
              </div>
            );
          })}
        </>
      )}

      <div style={{ marginTop: 12 }}>
        <button className="office-panel-btn office-panel-btn--secondary" onClick={() => onViewDept(dept)}>
          View Dept
        </button>
      </div>
    </div>
  );
}

function HQOverview({
  agents, tasks, departments, ceoIncoming = 0,
}: {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  ceoIncoming?: number;
}) {
  const running = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const onBreak = agents.filter((a) => a.status === "break").length;
  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overallAct = agents.length > 0 ? Math.round((running / agents.length) * 100) : 0;

  const totalXp = agents.reduce((s, a) => s + (a.stats_xp ?? 0), 0);
  const totalDone = agents.reduce((s, a) => s + (a.stats_tasks_done ?? 0), 0);

  const topAgents = [...agents]
    .filter((a) => (a.stats_tasks_done ?? 0) > 0)
    .sort((a, b) => (b.stats_tasks_done ?? 0) - (a.stats_tasks_done ?? 0))
    .slice(0, 3);

  const deptStats = departments
    .map((dept) => {
      const das = agents.filter((a) => a.department_id === dept.id);
      const runCount = das.filter((a) => a.status === "working").length;
      const pct = das.length > 0 ? Math.round((runCount / das.length) * 100) : 0;
      return { dept, pct, count: das.length };
    })
    .sort((a, b) => b.pct - a.pct);

  const rankColors = ["#f59e0b", "#9ca3af", "#b87333"];

  return (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 0 }}>
      {/* CEO Incoming alert */}
      {ceoIncoming > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.5)",
          padding: "4px 8px", marginBottom: 8,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700, color: "#f59e0b", letterSpacing: 1 }}>
            ▲ GUEST INCOMING
          </span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "var(--th-text-muted)" }}>
            {ceoIncoming} en route to CEO
          </span>
        </div>
      )}

      {/* HQ Status */}
      <div className="office-panel-label" style={{ padding: "0 0 4px" }}>HQ Status</div>
      <div style={{ display: "flex", gap: 0, marginBottom: 6, border: "1px solid var(--th-border)" }}>
        {[
          { v: running, l: "WORK", c: "#22c55e" },
          { v: idle, l: "IDLE", c: "var(--th-text-muted)" },
          { v: onBreak, l: "BRK", c: "var(--th-accent)" },
          { v: activeTasks, l: "RUN", c: "#f59e0b" },
          { v: totalDone, l: "DONE", c: "#22c55e" },
        ].map(({ v, l, c }, i, arr) => (
          <div key={l} style={{
            textAlign: "center", flex: 1, padding: "4px 0",
            borderRight: i < arr.length - 1 ? "1px solid var(--th-border)" : "none",
          }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.75rem", fontWeight: 600, color: c, lineHeight: 1.2 }}>{v}</div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.42rem", color: "var(--th-text-muted)", letterSpacing: "0.06em" }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="office-attr-row" style={{ marginBottom: 4 }}>
        <div className="office-attr-label">Activity</div>
        <div className="office-attr-track">
          <div className="office-attr-fill" style={{ width: `${overallAct}%`, background: attrColor(overallAct) }} />
        </div>
        <div className="office-attr-value">{overallAct}</div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 4, paddingLeft: 2 }}>
        <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "#a78bfa" }}>
          XP {totalXp.toLocaleString()}
        </span>
        <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.5rem", color: "var(--th-text-muted)" }}>
          {agents.length} AGT · {departments.length} DEPT
        </span>
      </div>
      {/* Task completion bar */}
      {tasks.length > 0 && (() => {
        const completionPct = Math.round((doneTasks / tasks.length) * 100);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", flexShrink: 0, letterSpacing: 1 }}>TASK</div>
            <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completionPct}%`, background: completionPct >= 80 ? "#22c55e" : completionPct >= 40 ? "#f59e0b" : "#f87171", borderRadius: 2 }} />
            </div>
            <div style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", flexShrink: 0 }}>
              {completionPct}%
            </div>
          </div>
        );
      })()}

      {/* Top Performers */}
      {topAgents.length > 0 && (
        <>
          <div className="office-panel-label" style={{ padding: "2px 0 4px" }}>Top Performers</div>
          {topAgents.map((agent, idx) => (
            <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0", borderBottom: "1px solid var(--th-border)" }}>
              <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", fontWeight: 700, color: rankColors[idx] ?? "var(--th-text-muted)", width: 14, textAlign: "center", flexShrink: 0 }}>
                #{idx + 1}
              </span>
              <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{agent.avatar_emoji}</span>
              <span style={{ flex: 1, fontFamily: "var(--th-font-body)", fontSize: "0.65rem", color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agent.name}
              </span>
              <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.55rem", color: "var(--th-text-muted)", flexShrink: 0 }}>
                {agent.stats_tasks_done ?? 0}T
              </span>
            </div>
          ))}
        </>
      )}

      {/* Dept Rankings */}
      {deptStats.length > 0 && (
        <>
          <div className="office-panel-label" style={{ padding: "6px 0 4px" }}>Dept Rankings</div>
          {deptStats.map(({ dept, pct, count }) => (
            <div key={dept.id} className="office-attr-row" style={{ marginBottom: 3 }}>
              <div style={{ fontSize: "0.7rem", flexShrink: 0, width: 18, textAlign: "center" }}>{dept.icon}</div>
              <div className="office-attr-track">
                <div className="office-attr-fill" style={{ width: `${pct}%`, background: attrColor(pct) }} />
              </div>
              <div className="office-attr-value" title={`${count} agents`}>{pct}</div>
            </div>
          ))}
        </>
      )}

      {agents.length === 0 && departments.length === 0 && (
        <div style={{ padding: "12px 0", fontFamily: "var(--th-font-mono)", fontSize: "0.6rem", color: "var(--th-text-muted)", textAlign: "center" }}>
          $ awaiting agents...
        </div>
      )}

      <div style={{ marginTop: 10, fontFamily: "var(--th-font-mono)", fontSize: "0.45rem", color: "var(--th-text-muted)", textAlign: "center", letterSpacing: "0.08em" }}>
        CLICK AGENT OR DEPT TO INSPECT
      </div>
    </div>
  );
}

const panelVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};
const panelTransition = { duration: 0.14, ease: "linear" as const };

export default function OfficeAgentPanel({ selectedAgent, selectedDept, agents, tasks, departments, ceoIncoming, visitingAgentIds, onViewAgent, onViewDept }: Props) {
  const key = selectedAgent ? `agent-${selectedAgent.id}` : selectedDept ? `dept-${selectedDept.id}` : "empty";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={panelTransition}
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        {selectedAgent ? (
          <AgentView agent={selectedAgent} tasks={tasks} departments={departments} visitingAgentIds={visitingAgentIds} onViewAgent={onViewAgent} />
        ) : selectedDept ? (
          <DeptView dept={selectedDept} agents={agents} tasks={tasks} visitingAgentIds={visitingAgentIds} onViewDept={onViewDept} />
        ) : (
          <HQOverview agents={agents} tasks={tasks} departments={departments} ceoIncoming={ceoIncoming} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
