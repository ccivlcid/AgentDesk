import { useState, useEffect, useCallback } from "react";
import type { Task, Agent, Department } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getAgentsPerformance, type AgentPerformanceEntry } from "../../../api/organization-projects";

const mono = "var(--th-font-mono)";

interface AgentsTabProps {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  projectId?: string;
}

export default function AgentsTab({ agents, tasks, departments, projectId }: AgentsTabProps) {
  const [perfMap, setPerfMap] = useState<Map<string, AgentPerformanceEntry>>(new Map());
  const [actionMenuAgentId, setActionMenuAgentId] = useState<string | null>(null);

  useEffect(() => {
    getAgentsPerformance(projectId)
      .then((entries) => setPerfMap(new Map(entries.map((e) => [e.agent_id, e]))))
      .catch(() => {});
  }, [projectId]);

  const activeCount = agents.filter((a) => a.status === "working").length;

  // Compute metrics
  const totalDone = [...perfMap.values()].reduce((s, e) => s + (e.done ?? 0), 0);
  const totalTasks = [...perfMap.values()].reduce((s, e) => s + (e.total ?? 0), 0);
  const costEfficiency = totalTasks > 0 ? (totalDone / totalTasks * 100).toFixed(0) : "--";

  const handleToggleMenu = useCallback((agentId: string) => {
    setActionMenuAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: mono }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--th-text-primary)", letterSpacing: 0.5 }}>
            TEAM_AGENTS
          </div>
          <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginTop: 2 }}>
            ACTIVE INSTANCES: {String(activeCount).padStart(2, "0")} / TOTAL NODES: {agents.length}
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <MetricBar
          label="TOKEN_THROUGHPUT"
          value={`${totalDone} tasks done`}
          percent={totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0}
          color="var(--th-accent)"
        />
        <MetricBar
          label="COST_EFFICIENCY"
          value={costEfficiency !== "--" ? `${costEfficiency}% success` : "--"}
          percent={costEfficiency !== "--" ? parseFloat(costEfficiency) : 0}
          color="var(--th-text-code)"
        />
      </div>

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 40px",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid var(--th-border)",
        fontSize: 10,
        color: "var(--th-text-muted)",
        letterSpacing: 0.5,
      }}>
        <span>AGENT / IDENTITY</span>
        <span>ROLE / DOMAIN</span>
        <span>STATUS</span>
        <span>CURRENT_PROCESS</span>
        <span>FITNESS_METRICS</span>
        <span>ACTION</span>
      </div>

      {/* Agent rows */}
      {agents.map((agent) => {
        const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
        const currentTask = agentTasks.find((t) => t.status === "in_progress");
        const dept = departments.find((d) => d.id === agent.department_id);

        const roleLabel = agent.role === "team_leader" ? "PROJECT MANAGER"
          : agent.role === "senior" ? "SENIOR ENG"
          : "JUNIOR ENG";

        const domainLabel = dept?.name ? dept.name.toUpperCase() : roleLabel;

        const statusDot = agent.status === "working" ? "var(--th-accent)"
          : agent.status === "idle" ? "var(--th-text-muted)"
          : "#60a5fa";

        const perf = perfMap.get(agent.id);
        const fitnessByType = perf?.fitness_by_type ?? [];

        return (
          <div key={agent.id} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 40px",
            gap: 8,
            padding: "12px",
            borderBottom: "1px solid var(--th-border)",
            alignItems: "start",
            fontSize: 12,
            position: "relative",
          }}>
            {/* Identity */}
            <div>
              <div style={{ color: "var(--th-text-primary)", fontWeight: 600 }}>
                {agent.name.toUpperCase().replace(/\s+/g, "_")}
              </div>
              <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
                ID: {agent.id.substring(0, 8)}
              </div>
            </div>

            {/* Role / Domain */}
            <div>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
                color: "var(--th-bg-primary)",
                background: agent.role === "team_leader" ? "var(--th-accent)" : "#4ade80",
                padding: "2px 8px",
                display: "inline-block",
                width: "fit-content",
              }}>
                {roleLabel}
              </span>
              {dept && (
                <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>
                  {domainLabel}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: statusDot,
              }} />
              <span style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
                {agent.status.toUpperCase()}
              </span>
            </div>

            {/* Current process */}
            <div>
              <div style={{ fontSize: 11, color: "var(--th-text-primary)", marginBottom: 4 }}>
                {currentTask ? currentTask.title : (
                  <span style={{ fontStyle: "italic", color: "var(--th-text-muted)" }}>
                    No active task in queue...
                  </span>
                )}
              </div>
              {currentTask && (
                <div style={{ height: 3, background: "var(--th-border)", width: "100%" }}>
                  <div style={{ height: 3, background: "var(--th-accent)", width: `${getTaskProgress(currentTask)}%`, transition: "width 0.3s" }} />
                </div>
              )}
            </div>

            {/* Fitness Metrics — task_type breakdown */}
            <div style={{ fontSize: 10 }}>
              {fitnessByType.length > 0 ? (
                fitnessByType.slice(0, 4).map((f) => (
                  <div key={f.task_type} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <span style={{ color: "var(--th-text-muted)", width: 36, flexShrink: 0, textTransform: "uppercase" }}>
                      {f.task_type.slice(0, 4)}:
                    </span>
                    <span style={{ color: f.success_rate >= 80 ? "var(--th-text-code)" : f.success_rate >= 50 ? "var(--th-accent)" : "#ef4444", fontWeight: 600 }}>
                      {f.success_rate}%
                    </span>
                    <span style={{ color: "var(--th-text-muted)", fontSize: 9 }}>({f.total})</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--th-text-code)" }}>
                  FITNESS: {perf?.success_rate != null ? `${Math.round(perf.success_rate)}%` : "--"}
                </div>
              )}
            </div>

            {/* Action menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => handleToggleMenu(agent.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--th-text-muted)", fontSize: 16, padding: 4,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {actionMenuAgentId === agent.id && (
                <ActionMenu
                  agentName={agent.name}
                  onClose={() => setActionMenuAgentId(null)}
                />
              )}
            </div>
          </div>
        );
      })}

      {agents.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
          No agents assigned to this project.
        </div>
      )}
    </div>
  );
}

/* ── Action Menu ── */

function ActionMenu({ agentName, onClose }: { agentName: string; onClose: () => void }) {
  const actions = [
    { label: "View Logs", icon: "log" },
    { label: "Reassign Task", icon: "reassign" },
    { label: "Stop Agent", icon: "stop" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 28,
        width: 160,
        background: "var(--th-bg-surface)",
        border: "1px solid var(--th-border)",
        zIndex: 100,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
      onMouseLeave={onClose}
    >
      <div style={{
        fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)",
        padding: "6px 10px", borderBottom: "1px solid var(--th-border)",
        letterSpacing: 0.5,
      }}>
        {agentName.toUpperCase().replace(/\s+/g, "_")}
      </div>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "8px 10px",
            fontFamily: mono,
            fontSize: 11,
            color: action.icon === "stop" ? "#ef4444" : "var(--th-text-secondary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-bg-hover)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {action.icon === "log" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          )}
          {action.icon === "reassign" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
          )}
          {action.icon === "stop" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><rect x="9" y="9" width="6" height="6" /></svg>
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/* ── Metric Bar ── */

function MetricBar({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div style={{ flex: 1, background: "var(--th-bg-surface)", padding: "8px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "var(--th-border)", width: "100%" }}>
        <div style={{ height: 3, background: color, width: `${Math.min(percent, 100)}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
