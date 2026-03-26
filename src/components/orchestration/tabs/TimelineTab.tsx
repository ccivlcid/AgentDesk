import { useState, useEffect, useCallback } from "react";
import type { Task, Agent, TaskExecutionEvent } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getTaskExecutionEvents } from "../../../api/organization-projects";
import { getTaskReportDetail } from "../../../api/providers-reports-github";
import type { TaskReportDetail } from "../../../api/providers-reports-github";

const mono = "var(--th-font-mono)";

interface TimelineTabProps {
  tasks: Task[];
  agents: Agent[];
}

export default function TimelineTab({ tasks, agents }: TimelineTabProps) {
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned", "done"].includes(t.status));

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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
        <AgentLane key={agent.id} agent={agent} tasks={agentTasks} selectedTaskId={selectedTaskId} onSelectTask={setSelectedTaskId} />
      ))}
    </div>
  );
}

function AgentLane({ agent, tasks, selectedTaskId, onSelectTask }: {
  agent: Agent;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}) {
  const currentTask = tasks.find((t) => t.status === "in_progress") ?? tasks[0];
  const nextTask = tasks.find((t) => t.status === "planned");

  const statusLabel = agent.status === "working" ? "EXECUTING" : agent.status === "idle" ? "IDLE" : agent.status.toUpperCase();
  const statusColor = agent.status === "working" ? "var(--th-accent)" : "var(--th-text-muted)";

  const handleTaskClick = useCallback((taskId: string) => {
    onSelectTask(selectedTaskId === taskId ? null : taskId);
  }, [selectedTaskId, onSelectTask]);

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
        <TaskCard
          task={currentTask}
          label="CURRENT_TASK"
          isSelected={selectedTaskId === currentTask.id}
          onClick={() => handleTaskClick(currentTask.id)}
        />
      )}

      {/* Selected task inspector */}
      {currentTask && selectedTaskId === currentTask.id && (
        <TaskInspector taskId={currentTask.id} />
      )}

      {/* Next task */}
      {nextTask && (
        <div
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: 11,
            color: "var(--th-text-muted)",
            paddingLeft: 14,
            cursor: "pointer",
          }}
          onClick={() => handleTaskClick(nextTask.id)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
          NEXT: {nextTask.title}
        </div>
      )}

      {/* Inspector for next task */}
      {nextTask && selectedTaskId === nextTask.id && (
        <TaskInspector taskId={nextTask.id} />
      )}
    </div>
  );
}

function TaskCard({ task, label, isSelected, onClick }: {
  task: Task;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      style={{
        background: isSelected ? "var(--th-bg-hover)" : "var(--th-bg-primary)",
        border: `1px solid ${isSelected ? "var(--th-accent)" : "var(--th-border)"}`,
        padding: "10px 14px",
        marginBottom: 6,
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-accent)", fontWeight: 600 }}>
          {label} #{task.id.substring(0, 4)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-secondary)" }}>
            {task.status === "in_progress" ? "running" : task.status}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: "var(--th-font-mono)", fontSize: 12, color: "var(--th-text-primary)", marginBottom: 8 }}>
        {task.title}
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--th-border)", width: "100%" }}>
        <div style={{
          height: 3,
          background: "var(--th-accent)",
          width: `${getTaskProgress(task)}%`,
          transition: "width 0.3s",
        }} />
      </div>
    </div>
  );
}

function TaskInspector({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskExecutionEvent[]>([]);
  const [report, setReport] = useState<TaskReportDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getTaskExecutionEvents(taskId, 10),
      getTaskReportDetail(taskId).catch(() => null),
    ]).then(([eventsResult, reportResult]) => {
      if (cancelled) return;
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (reportResult.status === "fulfilled" && reportResult.value) setReport(reportResult.value);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ padding: "8px 14px", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
        Loading inspector...
      </div>
    );
  }

  const pmEvents = events.filter((e) => e.event_type === "pm_review" || e.event_type === "state_change");
  const planningContent = report?.planning_summary?.content;

  if (!pmEvents.length && !planningContent) {
    return (
      <div style={{ padding: "8px 14px", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", marginBottom: 6 }}>
        No execution data yet.
      </div>
    );
  }

  return (
    <div style={{
      border: "1px solid var(--th-border)",
      borderTop: "none",
      background: "var(--th-bg-primary)",
      padding: "10px 14px",
      marginBottom: 6,
      maxHeight: 240,
      overflowY: "auto",
    }}>
      {/* PM Review / Report summary */}
      {planningContent && (
        <div style={{ marginBottom: pmEvents.length ? 10 : 0 }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--th-accent)", letterSpacing: 0.5, marginBottom: 4 }}>
            REPORT
          </div>
          <div style={{
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-secondary)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            maxHeight: 120,
            overflowY: "auto",
          }}>
            {planningContent.length > 500 ? `${planningContent.slice(0, 497)}...` : planningContent}
          </div>
        </div>
      )}

      {/* Execution events */}
      {pmEvents.length > 0 && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--th-text-code)", letterSpacing: 0.5, marginBottom: 4 }}>
            EVENTS ({pmEvents.length})
          </div>
          {pmEvents.map((evt) => (
            <ExecutionEventRow key={evt.id} event={evt} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExecutionEventRow({ event }: { event: TaskExecutionEvent }) {
  const meta = event.metadata_json ? tryParseJson(event.metadata_json) : null;
  const decision = meta?.action ?? meta?.decision ?? event.event_type;
  const decisionColor = decision === "APPROVE" || decision === "approve"
    ? "var(--th-success, #22c55e)"
    : decision === "REVISE" || decision === "revise"
      ? "var(--th-warning, #f59e0b)"
      : "var(--th-text-secondary)";

  const ts = new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      padding: "3px 0",
      fontFamily: mono,
      fontSize: 11,
    }}>
      <span style={{ color: "var(--th-text-muted)", flexShrink: 0, width: 42 }}>{ts}</span>
      {event.from_state && event.to_state ? (
        <span style={{ color: "var(--th-text-secondary)" }}>
          {event.from_state}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 3px", verticalAlign: "middle" }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          {event.to_state}
        </span>
      ) : (
        <span style={{ color: decisionColor, fontWeight: 600 }}>
          {String(decision).toUpperCase()}
        </span>
      )}
      {event.summary && (
        <span style={{ color: "var(--th-text-muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.summary.length > 80 ? `${event.summary.slice(0, 77)}...` : event.summary}
        </span>
      )}
    </div>
  );
}

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
