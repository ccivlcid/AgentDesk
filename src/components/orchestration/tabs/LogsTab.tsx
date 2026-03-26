import { useState, useEffect } from "react";
import type { Task, Agent, TaskExecutionEvent } from "../../../types";
import { getTaskExecutionEvents, getTaskReportMd } from "../../../api/organization-projects";

const mono = "var(--th-font-mono)";

interface LogsTabProps {
  tasks: Task[];
  agents: Agent[];
  projectId?: string;
}

export default function LogsTab({ tasks, agents, projectId }: LogsTabProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [events, setEvents] = useState<TaskExecutionEvent[]>([]);
  const [reportContent, setReportContent] = useState<string | null>(null);

  // Find the agent's current task
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const agentTask = selectedAgent
    ? tasks.find((t) => t.assigned_agent_id === selectedAgentId && ["in_progress", "review", "done"].includes(t.status))
    : null;

  const agentTaskId = agentTask?.id ?? null;
  useEffect(() => {
    if (!agentTaskId) { setEvents([]); setReportContent(null); return; }
    getTaskExecutionEvents(agentTaskId, 20)
      .then((res) => setEvents(res.events))
      .catch(() => setEvents([]));
    if (projectId) {
      getTaskReportMd(projectId, agentTaskId)
        .then((res) => setReportContent(res.content))
        .catch(() => setReportContent(null));
    } else {
      setReportContent(null);
    }
  }, [agentTaskId, projectId]);

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
        {agents.map((agent) => (
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
            {agent.name.split(" ")[0]?.toUpperCase() ?? agent.name.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Log stream */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-muted)",
        }}>
          <span style={{ color: "#ef4444" }}>ERROR_FIRST_MODE: ON</span>
          <span>LEVEL: ALL</span>
          <div style={{ flex: 1 }} />
          {agentTask && (
            <span style={{ color: "var(--th-text-code)" }}>
              TASK: {agentTask.title.slice(0, 30)}
            </span>
          )}
          <span>AUTO_SCROLL</span>
        </div>

        {/* Log content */}
        <div style={{
          flex: 1,
          padding: 16,
          fontFamily: mono,
          fontSize: 12,
          color: "var(--th-text-muted)",
          overflow: "auto",
        }}>
          {!selectedAgentId && (
            <span style={{ color: "var(--th-accent)" }}>
              {">"} _ Select an agent to view execution logs...
            </span>
          )}

          {selectedAgentId && events.length === 0 && !reportContent && (
            <span style={{ color: "var(--th-accent)" }}>
              {">"} _ STREAM_IDLE_AWAITING_BUFFER...
            </span>
          )}

          {/* Task report from file */}
          {reportContent && (
            <div style={{ marginBottom: 16 }}>
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

          {/* Execution events */}
          {events.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: "var(--th-text-code)", fontSize: 10, letterSpacing: 0.5, marginBottom: 6 }}>
                EXECUTION_EVENTS ({events.length})
              </div>
              {events.map((evt) => {
                const meta = evt.metadata_json ? tryParseJson(evt.metadata_json) : null;
                const isApprove = evt.event_type === "pm_approved" || meta?.action === "APPROVE";
                const isRevise = evt.event_type === "pm_revision_requested" || meta?.action === "REVISE";
                const evtColor = isApprove ? "var(--th-success, #22c55e)" : isRevise ? "var(--th-warning, #f59e0b)" : "var(--th-text-secondary)";
                const ts = new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                return (
                  <div key={evt.id} style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 0",
                    fontSize: 11,
                    borderBottom: "1px solid var(--th-border)",
                  }}>
                    <span style={{ color: "var(--th-text-muted)", width: 60, flexShrink: 0 }}>{ts}</span>
                    <span style={{ color: evtColor, fontWeight: 600, width: 80, flexShrink: 0 }}>
                      {evt.event_type.replace(/_/g, " ").toUpperCase().slice(0, 20)}
                    </span>
                    {evt.from_state && evt.to_state && (
                      <span style={{ color: "var(--th-text-muted)", width: 100, flexShrink: 0 }}>
                        {evt.from_state}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 3px", verticalAlign: "middle" }}>
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                        {evt.to_state}
                      </span>
                    )}
                    <span style={{ color: "var(--th-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {evt.summary?.slice(0, 120) ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
