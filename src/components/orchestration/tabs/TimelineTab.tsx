import type { Task, Agent } from "../../../types";
import { getTaskProgress } from "../task-progress";

const mono = "var(--th-font-mono)";

interface TimelineTabProps {
  tasks: Task[];
  agents: Agent[];
}

export default function TimelineTab({ tasks, agents }: TimelineTabProps) {
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned"].includes(t.status));

  // Group tasks by assigned agent
  const agentLanes = new Map<string, { agent: Agent; tasks: Task[] }>();
  for (const task of activeTasks) {
    if (!task.assigned_agent_id) continue;
    const agent = agents.find((a) => a.id === task.assigned_agent_id);
    if (!agent) continue;
    if (!agentLanes.has(agent.id)) {
      agentLanes.set(agent.id, { agent, tasks: [] });
    }
    agentLanes.get(agent.id)!.tasks.push(task);
  }

  const clusterStatus = tasks.every((t) => t.status === "done") ? "ALL_COMPLETE"
    : tasks.some((t) => t.execution_state === "failed" || t.status === "failed") ? "HAS_FAILURES"
    : tasks.some((t) => t.status === "in_progress") ? "EXECUTING"
    : tasks.every((t) => t.status === "planned" || t.status === "inbox") ? "READY"
    : "CLUSTER_STABLE";

  if (agentLanes.size === 0) {
    return (
      <div style={{ padding: 32, color: "var(--th-text-muted)", fontFamily: mono, fontSize: 13, textAlign: "center" }}>
        No active agent lanes. Start a project kickoff to begin orchestration.
      </div>
    );
  }

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
      }}>
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: "var(--th-text-primary)", letterSpacing: 0.5 }}>
          ACTIVE AGENT LANES
        </span>
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-code)" }}>
          {clusterStatus}
        </span>
      </div>

      {[...agentLanes.values()].map(({ agent, tasks: agentTasks }) => (
        <AgentLane key={agent.id} agent={agent} tasks={agentTasks} />
      ))}
    </div>
  );
}

function AgentLane({ agent, tasks }: { agent: Agent; tasks: Task[] }) {
  const currentTask = tasks.find((t) => t.status === "in_progress") ?? tasks[0];
  const nextTask = tasks.find((t) => t.status === "planned");

  const statusLabel = agent.status === "working" ? "EXECUTING" : agent.status === "idle" ? "IDLE" : agent.status.toUpperCase();
  const statusColor = agent.status === "working" ? "var(--th-accent)" : "var(--th-text-muted)";

  return (
    <div style={{
      border: "1px solid var(--th-border)",
      background: "var(--th-bg-surface)",
      padding: "12px 16px",
    }}>
      {/* Agent header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}>
        <div>
          <span style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--th-accent)",
            letterSpacing: 0.5,
          }}>
            {agent.name.toUpperCase().replace(/\s+/g, "_")}
          </span>
          <span style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: 10,
            color: "var(--th-text-muted)",
            marginLeft: 8,
          }}>
            ID: {agent.id.substring(0, 8).toUpperCase()}
          </span>
        </div>
        <span style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: statusColor,
          letterSpacing: 0.8,
          border: `1px solid ${statusColor}`,
          padding: "2px 8px",
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Current task */}
      {currentTask && (
        <div style={{
          background: "var(--th-bg-primary)",
          border: "1px solid var(--th-border)",
          padding: "10px 14px",
          marginBottom: 6,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-accent)", fontWeight: 600 }}>
              CURRENT_TASK #{currentTask.id.substring(0, 4)}
            </span>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-secondary)" }}>
              {currentTask.status === "in_progress" ? "running" : currentTask.status}
            </span>
          </div>
          <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, color: "var(--th-text-primary)", marginBottom: 8 }}>
            {currentTask.title}
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: "var(--th-border)", width: "100%" }}>
            <div style={{
              height: 3,
              background: "var(--th-accent)",
              width: `${getTaskProgress(currentTask)}%`,
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Next task */}
      {nextTask && (
        <div style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: 11,
          color: "var(--th-text-muted)",
          paddingLeft: 14,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
          NEXT: {nextTask.title}
        </div>
      )}
    </div>
  );
}
