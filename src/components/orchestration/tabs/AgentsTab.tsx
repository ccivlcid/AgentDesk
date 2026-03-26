import { useState, useEffect } from "react";
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

  useEffect(() => {
    getAgentsPerformance(projectId)
      .then((entries) => setPerfMap(new Map(entries.map((e) => [e.agent_id, e]))))
      .catch(() => {});
  }, [projectId]);
  const activeCount = agents.filter((a) => a.status === "working").length;

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
        <MetricBar label="TOKEN_THROUGHPUT" value="--" color="var(--th-accent)" />
        <MetricBar label="COST_EFFICIENCY" value="--" color="var(--th-text-code)" />
      </div>

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 2fr 1fr 40px",
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

        const roleLabel = agent.role === "team_leader" ? "PROJECT MANAGER"
          : agent.role === "senior" ? "SENIOR ENG"
          : "JUNIOR ENG";

        const statusDot = agent.status === "working" ? "var(--th-accent)"
          : agent.status === "idle" ? "var(--th-text-muted)"
          : "#60a5fa";

        return (
          <div key={agent.id} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 100px 2fr 1fr 40px",
            gap: 8,
            padding: "12px",
            borderBottom: "1px solid var(--th-border)",
            alignItems: "center",
            fontSize: 12,
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

            {/* Role */}
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

            {/* Fitness */}
            <div style={{ fontSize: 10, color: "var(--th-text-code)" }}>
              {(() => {
                const perf = perfMap.get(agent.id);
                return <div>FITNESS: {perf?.success_rate != null ? `${Math.round(perf.success_rate)}%` : "--"}</div>;
              })()}
            </div>

            {/* Action */}
            <button type="button" style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--th-text-muted)", fontSize: 16, padding: 4,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
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

function MetricBar({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "var(--th-bg-surface)", padding: "8px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: "var(--th-border)", width: "100%" }}>
        <div style={{ height: 3, background: color, width: "30%", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
