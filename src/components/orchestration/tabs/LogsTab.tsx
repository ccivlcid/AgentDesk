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
        width: 160,
        borderRight: "1px solid var(--th-border)",
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flexShrink: 0,
        overflow: "auto",
      }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 }}>
          ACTIVE_AGENTS
        </span>
        {agents.map((agent) => {
          const errCnt = agentErrorCounts.get(agent.id) ?? 0;
          return (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                fontFamily: mono,
                fontSize: 11,
                color: selectedAgentId === agent.id ? "var(--th-accent)" : agent.status === "working" ? "var(--th-accent)" : "var(--th-text-secondary)",
                cursor: "pointer",
                background: selectedAgentId === agent.id ? "var(--th-bg-hover)" : "transparent",
              }}
              onClick={() => setSelectedAgentId(selectedAgentId === agent.id ? null : agent.id)}
            >
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: agent.status === "working" ? "var(--th-accent)" : "var(--th-text-muted)",
                flexShrink: 0,
              }} />
              <span style={{ flex: 1 }}>
                {agent.name.split(" ")[0]?.toUpperCase() ?? agent.name.toUpperCase()}
              </span>
              {errCnt > 0 && (
                <span style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#ef4444",
                  background: "rgba(239,68,68,0.15)",
                  padding: "1px 4px",
                  borderRadius: 2,
                  flexShrink: 0,
                }}>
                  [{errCnt}]
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
          padding: "6px 12px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
          fontFamily: mono,
          fontSize: 10,
        }}>
          <MetricBadge label="TOKEN_THROUGHPUT" value={formatTokenCount(totalTokens)} color="var(--th-text-code)" />
          <MetricBadge label="ERR_RATE" value={`${errRate}%`} color={parseFloat(errRate) > 5 ? "#ef4444" : "var(--th-text-code)"} />
          <MetricBadge label="ACTIVE_THREADS" value={`${agents.filter((a) => a.status === "working").length} Active`} color="var(--th-accent)" />
        </div>

        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 12px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-muted)",
        }}>
          <button
            type="button"
            onClick={handleToggleErrorFirst}
            style={{
              fontFamily: mono, fontSize: 10, cursor: "pointer",
              background: "transparent", border: "none", padding: 0,
              color: errorFirstMode ? "#ef4444" : "var(--th-text-muted)",
              fontWeight: errorFirstMode ? 700 : 400,
            }}
          >
            ERROR_FIRST: {errorFirstMode ? "ON" : "OFF"}
          </button>

          <span style={{ color: "var(--th-border)" }}>|</span>

          <span>LEVEL:</span>
          {(["ALL", "ERROR", "WARN", "INFO", "DEBUG"] as LogLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              style={{
                fontFamily: mono, fontSize: 9, cursor: "pointer",
                background: levelFilter === lvl ? "var(--th-bg-hover)" : "transparent",
                border: levelFilter === lvl ? "1px solid var(--th-accent)" : "1px solid transparent",
                color: levelFilter === lvl ? "var(--th-accent)" : "var(--th-text-muted)",
                padding: "1px 6px",
                fontWeight: levelFilter === lvl ? 700 : 400,
              }}
            >
              {lvl}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {agentTask && (
            <span style={{ color: "var(--th-text-code)" }}>
              TASK: {agentTask.title.slice(0, 30)}
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleAutoScroll}
            style={{
              fontFamily: mono, fontSize: 10, cursor: "pointer",
              background: "transparent", border: "none", padding: 0,
              color: autoScroll ? "var(--th-accent)" : "var(--th-text-muted)",
            }}
          >
            AUTO_SCROLL {autoScroll ? (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ verticalAlign: "middle" }}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            ) : (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle" }}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
            )}
          </button>
        </div>

        {/* Log content */}
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            padding: 12,
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-muted)",
            overflow: "auto",
          }}
        >
          {!selectedAgentId && (
            <span style={{ color: "var(--th-accent)" }}>
              {">"} _ Select an agent to view execution logs...
            </span>
          )}

          {selectedAgentId && displayLogs.length === 0 && !reportContent && (
            <span style={{ color: "var(--th-accent)" }}>
              {">"} _ STREAM_IDLE_AWAITING_BUFFER...
            </span>
          )}

          {/* Pinned errors block */}
          {errorFirstMode && displayLogs.some((l) => l.level === "ERROR") && (
            <div style={{
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.05)",
              padding: "8px 10px",
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 600, color: "#ef4444", fontSize: 10, letterSpacing: 0.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                CRITICAL_SEQUENCE_FAILURE
              </div>
              {displayLogs.filter((l) => l.level === "ERROR").map((entry) => (
                <LogEntryRow key={entry.key} entry={entry} />
              ))}
            </div>
          )}

          {/* Task report from file */}
          {reportContent && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: "var(--th-text-code)", fontSize: 10, letterSpacing: 0.5, marginBottom: 6 }}>
                PM_REVIEW_REPORT
              </div>
              <div style={{
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border)",
                padding: "10px 14px",
                whiteSpace: "pre-wrap",
                fontSize: 11,
                color: "var(--th-text-secondary)",
                lineHeight: 1.5,
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
          padding: "8px 12px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-secondary)",
        }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)" }}>/</span>
          <input
            type="text"
            placeholder="Global search or command... (e.g. /filter BRAVO error)"
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
            fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)",
            background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
            padding: "3px 10px", cursor: "pointer",
          }}>
            EXECUTE
          </button>
          <button type="button" style={{
            fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)",
            background: "transparent", border: "1px solid var(--th-border)",
            padding: "3px 10px", cursor: "pointer",
          }}>
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Metrics Badge ── */

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ fontFamily: mono, fontSize: 10 }}>
      <span style={{ color: "var(--th-text-muted)", marginRight: 4 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </span>
  );
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M/hr`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K/hr`;
  return `${n}/hr`;
}

/* ── Unified log entry classification ── */

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

  // Task logs → classified entries
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

  // Execution events → classified entries
  for (const evt of events) {
    let level: LogLevel = "INFO";
    if (evt.event_type.includes("fail") || evt.event_type.includes("error")) level = "ERROR";
    else if (evt.event_type.includes("warn") || evt.event_type.includes("stall")) level = "WARN";

    const meta = evt.metadata_json ? tryParseJson(evt.metadata_json) : null;
    const decision = meta?.action ?? meta?.decision;
    const msg = decision
      ? `${String(decision).toUpperCase()} — ${evt.summary ?? evt.event_type}`
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

/* ── Log entry row ── */

const LEVEL_COLORS: Record<string, string> = {
  ERROR: "#ef4444",
  WARN: "var(--th-accent)",
  INFO: "var(--th-text-code)",
  DEBUG: "var(--th-text-muted)",
};

function LogEntryRow({ entry }: { entry: ClassifiedLogEntry }) {
  const ts = new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const levelColor = LEVEL_COLORS[entry.level] ?? "var(--th-text-secondary)";
  const isError = entry.level === "ERROR";

  return (
    <div style={{
      display: "flex",
      gap: 8,
      padding: "3px 0",
      fontFamily: mono,
      fontSize: 11,
      background: isError ? "rgba(239,68,68,0.05)" : "transparent",
    }}>
      <span style={{ color: "var(--th-text-muted)", width: 56, flexShrink: 0 }}>{ts}</span>
      <span style={{
        color: levelColor,
        fontWeight: 600,
        width: 42,
        flexShrink: 0,
        fontSize: 10,
      }}>
        [{entry.level}]
      </span>
      {entry.fromState && entry.toState ? (
        <span style={{ color: "var(--th-text-muted)", flexShrink: 0 }}>
          {entry.fromState}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 3px", verticalAlign: "middle" }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
          {entry.toState}
        </span>
      ) : null}
      <span style={{
        color: isError ? "#ef4444" : "var(--th-text-secondary)",
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

/* ── Agent error count hook ── */

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
