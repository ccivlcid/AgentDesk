import { useState, useEffect, useRef, useCallback } from "react";
import type { Task, Agent, TaskExecutionEvent, TaskLog } from "../../../types";
import { getTaskExecutionEvents, getTaskReportMd, getTask } from "../../../api/organization-projects";

const mono = "var(--th-font-mono)";

type LogLevel = "ALL" | "ERROR" | "WARN" | "INFO" | "DEBUG";

interface LogsTabProps {
  tasks: Task[];
  agents: Agent[];
  projectId?: string;
}

export default function LogsTab({ tasks, agents, projectId }: LogsTabProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [events, setEvents] = useState<TaskExecutionEvent[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [errorFirstMode, setErrorFirstMode] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel>("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Find the agent's current task
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const agentTask = selectedAgent
    ? tasks.find((t) => t.assigned_agent_id === selectedAgentId && ["in_progress", "review", "done"].includes(t.status))
    : null;

  const agentTaskId = agentTask?.id ?? null;
  useEffect(() => {
    if (!agentTaskId) { setEvents([]); setTaskLogs([]); setReportContent(null); return; }
    getTaskExecutionEvents(agentTaskId, 50)
      .then((res) => setEvents(res.events))
      .catch(() => setEvents([]));
    getTask(agentTaskId)
      .then((res) => setTaskLogs(res.logs ?? []))
      .catch(() => setTaskLogs([]));
    if (projectId) {
      getTaskReportMd(projectId, agentTaskId)
        .then((res) => setReportContent(res.content))
        .catch(() => setReportContent(null));
    } else {
      setReportContent(null);
    }
  }, [agentTaskId, projectId]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, taskLogs, autoScroll]);

  // Compute error counts per agent for badges
  const agentErrorCounts = useAgentErrorCounts(tasks, agents);

  // Classify log entries into levels for filtering
  const classifiedLogs = classifyLogs(events, taskLogs);
  const filteredLogs = filterByLevel(classifiedLogs, levelFilter);

  // Error-first: pin errors to top
  const displayLogs = errorFirstMode
    ? [
      ...filteredLogs.filter((l) => l.level === "ERROR"),
      ...filteredLogs.filter((l) => l.level !== "ERROR"),
    ]
    : filteredLogs;

  // Metrics
  const totalTokens = tasks.reduce((sum, t) => {
    const logs = t.result ? String(t.result).length : 0;
    return sum + logs;
  }, 0);
  const errorCount = classifiedLogs.filter((l) => l.level === "ERROR").length;
  const totalCount = classifiedLogs.length;
  const errRate = totalCount > 0 ? ((errorCount / totalCount) * 100).toFixed(1) : "0.0";

  const handleToggleErrorFirst = useCallback(() => setErrorFirstMode((v) => !v), []);
  const handleToggleAutoScroll = useCallback(() => setAutoScroll((v) => !v), []);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Agent sidebar */}
      <div style={{
        width: 170,
        borderRight: "1px solid var(--th-border)",
        padding: "16px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
        overflow: "auto",
        background: "var(--th-bg-surface)",
        borderRadius: "12px 0 0 12px",
      }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 10, paddingLeft: 6, textTransform: "uppercase" as const }}>
          Active Agents
        </span>
        {agents.map((agent) => {
          const errCnt = agentErrorCounts.get(agent.id) ?? 0;
          const isSelected = selectedAgentId === agent.id;
          const isWorking = agent.status === "working";
          return (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                fontFamily: mono,
                fontSize: 11,
                color: isSelected ? "var(--th-accent)" : isWorking ? "var(--th-text-primary)" : "var(--th-text-secondary)",
                fontWeight: isSelected ? 700 : 500,
                cursor: "pointer",
                background: isSelected ? "var(--th-accent-glow)" : "transparent",
                borderRadius: 10,
                transition: "all 0.2s",
              }}
              onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: isWorking ? "var(--th-success)" : "var(--th-border-strong)",
                boxShadow: isWorking ? "0 0 6px rgba(5,150,105,0.3)" : "none",
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>
                {agent.name.split(" ")[0]?.toUpperCase() ?? agent.name.toUpperCase()}
              </span>
              {errCnt > 0 && (
                <span style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 800,
                  color: "var(--th-danger-text)",
                  background: "var(--th-danger-bg)",
                  border: "1px solid #FECACA",
                  padding: "1px 5px",
                  borderRadius: 6,
                  flexShrink: 0,
                }}>
                  {errCnt}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Log stream */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Metrics bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 16px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
          fontFamily: mono,
          fontSize: 10,
        }}>
          <LogMetricBadge label="TOKEN_THROUGHPUT" value={formatTokenCount(totalTokens)} color="var(--th-text-primary)" />
          <LogMetricBadge label="ERR_RATE" value={`${errRate}%`} color={parseFloat(errRate) > 5 ? "var(--th-danger-text)" : "var(--th-success)"} />
          <LogMetricBadge label="ACTIVE_THREADS" value={`${agents.filter((a) => a.status === "working").length} Active`} color="var(--th-accent)" />
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-secondary)",
        }}>
          <button
            type="button"
            onClick={handleToggleErrorFirst}
            style={{
              fontFamily: mono, fontSize: 10, cursor: "pointer",
              background: errorFirstMode ? "var(--th-danger-bg)" : "transparent",
              border: errorFirstMode ? "1px solid #FECACA" : "1px solid transparent",
              borderRadius: 8,
              padding: "3px 10px",
              color: errorFirstMode ? "var(--th-danger-text)" : "var(--th-text-muted)",
              fontWeight: errorFirstMode ? 800 : 500,
              transition: "all 0.2s",
            }}
          >
            ERROR_FIRST: {errorFirstMode ? "ON" : "OFF"}
          </button>

          <span style={{ color: "var(--th-border)" }}>|</span>

          <span style={{ color: "var(--th-text-muted)", fontWeight: 600 }}>LEVEL:</span>
          {(["ALL", "ERROR", "WARN", "INFO", "DEBUG"] as LogLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              style={{
                fontFamily: mono, fontSize: 9, cursor: "pointer",
                background: levelFilter === lvl ? "var(--th-accent-glow)" : "transparent",
                border: levelFilter === lvl ? "1px solid #BFDBFE" : "1px solid transparent",
                color: levelFilter === lvl ? "var(--th-accent)" : "var(--th-text-muted)",
                padding: "2px 8px",
                fontWeight: levelFilter === lvl ? 800 : 500,
                borderRadius: 6,
                transition: "all 0.2s",
              }}
            >
              {lvl}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {agentTask && (
            <span style={{ color: "var(--th-accent)", fontWeight: 600, fontSize: 10 }}>
              TASK: {agentTask.title.slice(0, 30)}
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleAutoScroll}
            style={{
              fontFamily: mono, fontSize: 10, cursor: "pointer",
              background: autoScroll ? "#ECFDF5" : "transparent",
              border: autoScroll ? "1px solid #A7F3D0" : "1px solid var(--th-border)",
              color: autoScroll ? "var(--th-success)" : "var(--th-text-muted)",
              fontWeight: autoScroll ? 700 : 500,
              padding: "2px 10px",
              borderRadius: 6,
              transition: "all 0.2s",
            }}
          >
            AUTO_SCROLL {autoScroll ? "ON" : "OFF"}
          </button>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            padding: 16,
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-secondary)",
            overflow: "auto",
          }}
        >
          {!selectedAgentId && (
            <div style={{ color: "var(--th-text-muted)", textAlign: "center", padding: 32, fontSize: 12 }}>
              Select an agent to view execution logs...
            </div>
          )}

          {selectedAgentId && displayLogs.length === 0 && !reportContent && (
            <div style={{ color: "var(--th-text-muted)", textAlign: "center", padding: 32, fontSize: 12 }}>
              Awaiting log data...
            </div>
          )}

          {/* Pinned errors block */}
          {errorFirstMode && displayLogs.some((l) => l.level === "ERROR") && (
            <div style={{
              border: "1px solid #FECACA",
              background: "var(--th-danger-bg)",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 16,
            }}>
              <div style={{ fontWeight: 800, color: "var(--th-danger-text)", fontSize: 10, letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--th-danger-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                CRITICAL ERRORS
              </div>
              {displayLogs.filter((l) => l.level === "ERROR").map((entry) => (
                <LogEntryRow key={entry.key} entry={entry} />
              ))}
            </div>
          )}

          {/* Task report from file */}
          {reportContent && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: "var(--th-accent)", fontSize: 10, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
                PM Review Report
              </div>
              <div style={{
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border)",
                borderRadius: 14,
                padding: "14px 18px",
                whiteSpace: "pre-wrap",
                fontSize: 11,
                color: "var(--th-text-secondary)",
                lineHeight: 1.6,
                maxHeight: 200,
                overflowY: "auto",
              }}>
                {reportContent.length > 1000 ? `${reportContent.slice(0, 997)}...` : reportContent}
              </div>
            </div>
          )}

          {/* Main log stream (skip errors if already pinned) */}
          {displayLogs
            .filter((l) => !(errorFirstMode && l.level === "ERROR"))
            .map((entry) => (
              <LogEntryRow key={entry.key} entry={entry} />
            ))}
        </div>

        {/* Command bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
        }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)" }}>/</span>
          <input
            type="text"
            placeholder="Global search or command..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: mono,
              fontSize: 11,
              color: "var(--th-text-primary)",
            }}
          />
          <button type="button" style={{
            fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-bg-elevated)",
            background: "var(--th-accent)", border: "none",
            padding: "5px 14px", cursor: "pointer",
            borderRadius: 8,
          }}>
            EXECUTE
          </button>
          <button type="button" style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--th-text-secondary)",
            background: "transparent", border: "1px solid var(--th-border)",
            padding: "4px 14px", cursor: "pointer",
            borderRadius: 8,
          }}>
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}

/* -- Metrics Badge -- */

function LogMetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ fontFamily: mono, fontSize: 10 }}>
      <span style={{ color: "var(--th-text-muted)", marginRight: 6, fontWeight: 600, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M/hr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K/hr`;
  return `${n}/hr`;
}

/* -- Unified log entry classification -- */

interface ClassifiedLogEntry {
  key: string;
  ts: number;
  level: LogLevel;
  agent?: string;
  message: string;
  fromState?: string | null;
  toState?: string | null;
}

function classifyLogs(events: TaskExecutionEvent[], logs: TaskLog[]): ClassifiedLogEntry[] {
  const entries: ClassifiedLogEntry[] = [];

  // Task logs -> classified entries
  for (const log of logs) {
    let level: LogLevel = "INFO";
    if (log.kind === "error") level = "ERROR";
    else if (log.kind === "warning" || log.kind === "warn") level = "WARN";
    else if (log.kind === "debug") level = "DEBUG";
    else if (log.kind === "pm_oversight" || log.kind === "system") level = "INFO";

    entries.push({
      key: `log-${log.id}`,
      ts: log.created_at,
      level,
      message: log.message,
    });
  }

  // Execution events -> classified entries
  for (const evt of events) {
    let level: LogLevel = "INFO";
    if (evt.event_type.includes("fail") || evt.event_type.includes("error")) level = "ERROR";
    else if (evt.event_type.includes("warn") || evt.event_type.includes("stall")) level = "WARN";

    const meta = evt.metadata_json ? tryParseJson(evt.metadata_json) : null;
    const decision = meta?.action ?? meta?.decision;
    const msg = decision
      ? `${String(decision).toUpperCase()} -- ${evt.summary ?? evt.event_type}`
      : evt.summary ?? evt.event_type;

    entries.push({
      key: `evt-${evt.id}`,
      ts: evt.created_at,
      level,
      message: msg,
      fromState: evt.from_state,
      toState: evt.to_state,
    });
  }

  // Sort by timestamp
  entries.sort((a, b) => a.ts - b.ts);
  return entries;
}

function filterByLevel(entries: ClassifiedLogEntry[], level: LogLevel): ClassifiedLogEntry[] {
  if (level === "ALL") return entries;
  const levelOrder: LogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG"];
  const idx = levelOrder.indexOf(level);
  return entries.filter((e) => levelOrder.indexOf(e.level) <= idx);
}

/* -- Log entry row -- */

const LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  ERROR: { text: "var(--th-danger-text)", bg: "var(--th-danger-bg)" },
  WARN: { text: "#D97706", bg: "#FFFBEB" },
  INFO: { text: "var(--th-accent)", bg: "var(--th-accent-glow)" },
  DEBUG: { text: "var(--th-text-muted)", bg: "var(--th-bg-surface)" },
};

function LogEntryRow({ entry }: { entry: ClassifiedLogEntry }) {
  const ts = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const levelStyle = LEVEL_COLORS[entry.level] ?? { text: "var(--th-text-secondary)", bg: "transparent" };
  const isError = entry.level === "ERROR";

  return (
    <div style={{
      display: "flex",
      gap: 8,
      padding: "4px 0",
      fontFamily: mono,
      fontSize: 11,
    }}>
      <span style={{ color: "var(--th-text-muted)", width: 56, flexShrink: 0 }}>{ts}</span>
      <span style={{
        color: levelStyle.text,
        fontWeight: 800,
        fontSize: 9,
        background: levelStyle.bg,
        borderRadius: 4,
        padding: "1px 4px",
        flexShrink: 0,
      }}>
        {entry.level}
      </span>
      {entry.fromState && entry.toState ? (
        <span style={{ color: "var(--th-text-secondary)", flexShrink: 0 }}>
          {entry.fromState}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 4px", verticalAlign: "middle" }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          {entry.toState}
        </span>
      ) : null}
      <span style={{
        color: isError ? "var(--th-danger-text)" : "var(--th-text-secondary)",
        fontWeight: isError ? 600 : 400,
        flex: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {entry.message.length > 150 ? `${entry.message.slice(0, 147)}...` : entry.message}
      </span>
    </div>
  );
}

/* -- Agent error count hook -- */

function useAgentErrorCounts(tasks: Task[], agents: Agent[]): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const map = new Map<string, number>();
    // Count tasks with failed/error states per agent
    for (const agent of agents) {
      const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
      const errCount = agentTasks.filter(
        (t) => t.status === "failed" || t.execution_state === "failed" || t.execution_error_code,
      ).length;
      if (errCount > 0) map.set(agent.id, errCount);
    }
    setCounts(map);
  }, [tasks, agents]);

  return counts;
}

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
