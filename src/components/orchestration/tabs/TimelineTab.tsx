import { useState, useEffect, useCallback } from "react";
import type { Task, Agent, TaskExecutionEvent, TaskLog } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getTaskExecutionEvents, getTask } from "../../../api/organization-projects";
import { getTaskReportDetail } from "../../../api/providers-reports-github";
import type { TaskReportDetail } from "../../../api/providers-reports-github";
import { getTaskDiff } from "../../../api/workflow-skills-subtasks";
import type { TaskDiffResult } from "../../../api/workflow-skills-subtasks";

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

  const clusterColor = clusterStatus === "ALL_COMPLETE" ? "#059669"
    : clusterStatus === "HAS_FAILURES" ? "#DC2626"
    : clusterStatus === "EXECUTING" ? "#3B82F6"
    : "#6B7280";

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (agentLanes.size === 0) {
    return (
      <div style={{ padding: 32, color: "#9CA3AF", fontFamily: mono, fontSize: 13, textAlign: "center" }}>
        No active agent lanes. Start a project kickoff to begin orchestration.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6", display: "flex", alignItems: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "#374151", fontFamily: mono, margin: 0 }}>
            Active Agent Lanes
          </h3>
        </div>
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 800,
          color: clusterColor,
          background: `${clusterColor}12`,
          border: `1px solid ${clusterColor}30`,
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
        }}>
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

  const isWorking = agent.status === "working";
  const statusLabel = isWorking ? "EXECUTING" : agent.status === "idle" ? "IDLE" : agent.status.toUpperCase();

  const handleTaskClick = useCallback((taskId: string) => {
    onSelectTask(selectedTaskId === taskId ? null : taskId);
  }, [selectedTaskId, onSelectTask]);

  return (
    <div style={{
      border: "1px solid #E5E7EB",
      background: "#FFFFFF",
      borderRadius: 20,
      padding: "16px 20px",
      transition: "all 0.2s",
    }}>
      {/* Agent header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: isWorking ? "#059669" : "#D1D5DB",
            boxShadow: isWorking ? "0 0 8px rgba(5, 150, 105, 0.4)" : "none",
          }} />
          <span style={{
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "0.05em",
          }}>
            {agent.name.toUpperCase().replace(/\s+/g, "_")}
          </span>
          <span style={{
            fontFamily: mono,
            fontSize: 10,
            color: "#9CA3AF",
          }}>
            ID: {agent.id.substring(0, 8).toUpperCase()}
          </span>
        </div>
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 800,
          color: isWorking ? "#059669" : "#9CA3AF",
          background: isWorking ? "#ECFDF5" : "#F9FAFB",
          border: `1px solid ${isWorking ? "#A7F3D0" : "#E5E7EB"}`,
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
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
            fontFamily: mono,
            fontSize: 11,
            color: "#9CA3AF",
            paddingLeft: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            marginTop: 4,
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
  const progress = getTaskProgress(task);
  const statusLabel = task.status === "in_progress" ? "running" : task.status;

  return (
    <div
      style={{
        background: isSelected ? "#F0F7FF" : "#F9FAFB",
        border: `1px solid ${isSelected ? "#BFDBFE" : "#E5E7EB"}`,
        borderRadius: 14,
        padding: "12px 16px",
        marginBottom: 8,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "#3B82F6", fontWeight: 800, letterSpacing: "0.05em" }}>
          {label} #{task.id.substring(0, 4)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          <span style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700,
            color: statusLabel === "running" ? "#059669" : statusLabel === "done" ? "#059669" : "#6B7280",
            background: statusLabel === "running" ? "#ECFDF5" : statusLabel === "done" ? "#ECFDF5" : "#F3F4F6",
            borderRadius: 6,
            padding: "1px 6px",
          }}>
            {statusLabel}
          </span>
        </div>
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, color: "#111827", fontWeight: 600, marginBottom: 10 }}>
        {task.title}
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, background: "#E5E7EB", width: "100%", borderRadius: 2 }}>
        <div style={{
          height: 4,
          background: progress >= 100 ? "#059669" : "#3B82F6",
          width: `${progress}%`,
          transition: "width 0.3s",
          borderRadius: 2,
        }} />
      </div>
    </div>
  );
}

function TaskInspector({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskExecutionEvent[]>([]);
  const [report, setReport] = useState<TaskReportDetail | null>(null);
  const [diffResult, setDiffResult] = useState<TaskDiffResult | null>(null);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"files" | "cli" | "logic" | "events">("files");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getTaskExecutionEvents(taskId, 10),
      getTaskReportDetail(taskId).catch(() => null),
      getTaskDiff(taskId).catch(() => null),
      getTask(taskId).catch(() => null),
    ]).then(([eventsResult, reportResult, diffRes, taskRes]) => {
      if (cancelled) return;
      if (eventsResult.status === "fulfilled") setEvents(eventsResult.value.events);
      if (reportResult.status === "fulfilled" && reportResult.value) setReport(reportResult.value);
      if (diffRes.status === "fulfilled" && diffRes.value) setDiffResult(diffRes.value as TaskDiffResult);
      if (taskRes.status === "fulfilled" && taskRes.value) {
        const detail = taskRes.value as { logs: TaskLog[] };
        setTaskLogs(detail.logs ?? []);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [taskId]);

  if (loading) {
    return (
      <div style={{ padding: "12px 16px", fontFamily: mono, fontSize: 11, color: "#9CA3AF", display: "flex", alignItems: "center", gap: 8 }}>
        <svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
        Loading inspector...
      </div>
    );
  }

  const pmEvents = events.filter((e) => e.event_type === "pm_review" || e.event_type === "state_change");
  const planningContent = report?.planning_summary?.content;
  const fileChanges = parseDiffStat(diffResult?.stat);
  const cliLogs = taskLogs.filter((l) => l.kind === "cli_output" || l.kind === "system").slice(0, 20);
  const orchestrationLogs = taskLogs.filter((l) => l.kind === "pm_oversight");

  const hasAnyData = fileChanges.length > 0 || cliLogs.length > 0 || orchestrationLogs.length > 0
    || pmEvents.length > 0 || !!planningContent;

  if (!hasAnyData) {
    return (
      <div style={{ padding: "12px 16px", fontFamily: mono, fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
        No execution data yet.
      </div>
    );
  }

  const tabs: { key: typeof activeSection; label: string; count: number }[] = [
    { key: "files", label: "FILES", count: fileChanges.length },
    { key: "cli", label: "CLI", count: cliLogs.length },
    { key: "logic", label: "LOGIC", count: orchestrationLogs.length },
    { key: "events", label: "EVENTS", count: pmEvents.length },
  ];

  return (
    <div style={{
      border: "1px solid #E5E7EB",
      borderRadius: 14,
      background: "#FFFFFF",
      marginBottom: 8,
      overflow: "hidden",
    }}>
      {/* Section tabs */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "8px 12px",
        borderBottom: "1px solid #E5E7EB",
        background: "#F9FAFB",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "5px 12px",
              fontFamily: mono,
              fontSize: 10,
              fontWeight: activeSection === tab.key ? 800 : 600,
              letterSpacing: "0.05em",
              color: activeSection === tab.key ? "#3B82F6" : "#9CA3AF",
              background: activeSection === tab.key ? "#FFFFFF" : "transparent",
              border: activeSection === tab.key ? "1px solid #E5E7EB" : "1px solid transparent",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label} {tab.count > 0 && <span style={{ color: "#3B82F6", opacity: 0.7 }}>({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div style={{ padding: "12px 16px", maxHeight: 220, overflowY: "auto" }}>
        {activeSection === "files" && (
          <FilesChangedSection files={fileChanges} />
        )}
        {activeSection === "cli" && (
          <CliHistorySection logs={cliLogs} />
        )}
        {activeSection === "logic" && (
          <OrchestrationLogicSection logs={orchestrationLogs} planningContent={planningContent} />
        )}
        {activeSection === "events" && (
          <EventsSection events={pmEvents} />
        )}
      </div>
    </div>
  );
}

/* -- FILES CHANGED section -- */

interface DiffFileStat {
  path: string;
  added: number;
  removed: number;
  isNew: boolean;
}

function parseDiffStat(stat: string | undefined | null): DiffFileStat[] {
  if (!stat) return [];
  const lines = stat.split("\n").filter((l) => l.includes("|"));
  return lines.map((line) => {
    const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]+)?/);
    if (!match) return null;
    const filePath = match[1].trim();
    const plusCount = (match[3] ?? "").split("").filter((c) => c === "+").length;
    const minusCount = (match[3] ?? "").split("").filter((c) => c === "-").length;
    return {
      path: filePath,
      added: plusCount,
      removed: minusCount,
      isNew: minusCount === 0 && plusCount > 0,
    };
  }).filter((x): x is DiffFileStat => x !== null);
}

function FilesChangedSection({ files }: { files: DiffFileStat[] }) {
  if (files.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "#9CA3AF" }}>No file changes detected.</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "#374151", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        Files Changed
      </div>
      {files.map((f) => (
        <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontFamily: mono, fontSize: 11 }}>
          <span style={{ display: "flex", alignItems: "center", color: f.isNew ? "#059669" : "#3B82F6", flexShrink: 0 }}>
            {f.isNew ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="5" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
            )}
          </span>
          <span style={{ color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {f.path}
          </span>
          <span style={{ color: "#059669", flexShrink: 0, fontWeight: 600 }}>+{f.added}</span>
          <span style={{ color: "#DC2626", flexShrink: 0, fontWeight: 600 }}>-{f.removed}</span>
        </div>
      ))}
    </div>
  );
}

/* -- CLI HISTORY section -- */

function CliHistorySection({ logs }: { logs: TaskLog[] }) {
  if (logs.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "#9CA3AF" }}>No CLI output recorded.</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "#374151", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        CLI History
      </div>
      {logs.map((log) => {
        const ts = new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const isCmd = log.message.startsWith("$") || log.message.startsWith(">");
        return (
          <div key={log.id} style={{ padding: "3px 0", fontFamily: mono, fontSize: 11, display: "flex", gap: 8 }}>
            <span style={{ color: "#9CA3AF", flexShrink: 0, width: 56 }}>{ts}</span>
            <span style={{
              color: isCmd ? "#3B82F6" : "#6B7280",
              fontWeight: isCmd ? 700 : 400,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              flex: 1,
            }}>
              {log.message.length > 200 ? `${log.message.slice(0, 197)}...` : log.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -- ORCHESTRATION LOGIC section -- */

function OrchestrationLogicSection({ logs, planningContent }: { logs: TaskLog[]; planningContent?: string | null }) {
  const hasContent = logs.length > 0 || !!planningContent;
  if (!hasContent) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "#9CA3AF" }}>No orchestration data.</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "#374151", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        Orchestration Logic
      </div>

      {/* PM oversight logs */}
      {logs.map((log) => {
        const ts = new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={log.id} style={{
            padding: "6px 12px",
            fontFamily: mono,
            fontSize: 11,
            color: "#6B7280",
            borderLeft: "3px solid #3B82F6",
            background: "#F0F7FF",
            borderRadius: "0 8px 8px 0",
            marginBottom: 6,
          }}>
            <span style={{ color: "#9CA3AF", marginRight: 8, fontSize: 10 }}>{ts}</span>
            {log.message.length > 300 ? `${log.message.slice(0, 297)}...` : log.message}
          </div>
        );
      })}

      {/* Planning summary */}
      {planningContent && (
        <div style={{
          marginTop: logs.length > 0 ? 8 : 0,
          fontFamily: mono,
          fontSize: 11,
          color: "#6B7280",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          borderLeft: "3px solid #059669",
          background: "#ECFDF5",
          borderRadius: "0 8px 8px 0",
          padding: "8px 12px",
        }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "#059669", marginBottom: 4, letterSpacing: "0.1em" }}>
            PLANNING SUMMARY
          </div>
          {planningContent.length > 500 ? `${planningContent.slice(0, 497)}...` : planningContent}
        </div>
      )}
    </div>
  );
}

/* -- EVENTS section -- */

function EventsSection({ events }: { events: TaskExecutionEvent[] }) {
  if (events.length === 0) {
    return <div style={{ fontFamily: mono, fontSize: 11, color: "#9CA3AF" }}>No events recorded.</div>;
  }

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 800, color: "#374151", letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" as const }}>
        Events ({events.length})
      </div>
      {events.map((evt) => (
        <ExecutionEventRow key={evt.id} event={evt} />
      ))}
    </div>
  );
}

function ExecutionEventRow({ event }: { event: TaskExecutionEvent }) {
  const meta = event.metadata_json ? tryParseJson(event.metadata_json) : null;
  const decision = meta?.action ?? meta?.decision ?? event.event_type;
  const decisionColor = decision === "APPROVE" || decision === "approve"
    ? "#059669"
    : decision === "REVISE" || decision === "revise"
      ? "#D97706"
      : "#6B7280";

  const ts = new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      padding: "4px 0",
      fontFamily: mono,
      fontSize: 11,
    }}>
      <span style={{ color: "#9CA3AF", flexShrink: 0, width: 42 }}>{ts}</span>
      {event.from_state && event.to_state ? (
        <span style={{ color: "#6B7280" }}>
          {event.from_state}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 4px", verticalAlign: "middle" }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          {event.to_state}
        </span>
      ) : (
        <span style={{
          color: decisionColor,
          fontWeight: 800,
          fontSize: 10,
          background: `${decisionColor}15`,
          borderRadius: 6,
          padding: "1px 6px",
        }}>
          {String(decision).toUpperCase()}
        </span>
      )}
      {event.summary && (
        <span style={{ color: "#6B7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
