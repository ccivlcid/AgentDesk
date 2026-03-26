import { useState, useEffect } from "react";
import type { Task, Agent, Project } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getProjectTeamBoard, type TeamBoardEntry } from "../../../api/organization-projects";

const mono = "var(--th-font-mono)";

interface RoomTabProps {
  tasks: Task[];
  agents: Agent[];
  project: Project | null;
  projectId?: string;
}

export default function RoomTab({ tasks, agents, project, projectId }: RoomTabProps) {
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned"].includes(t.status));
  const doneTasks = tasks.filter((t) => t.status === "done");

  const [boardEntries, setBoardEntries] = useState<TeamBoardEntry[]>([]);

  useEffect(() => {
    if (!projectId) { setBoardEntries([]); return; }
    getProjectTeamBoard(projectId)
      .then((res) => setBoardEntries(res.entries ?? []))
      .catch(() => setBoardEntries([]));
  }, [projectId]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left: Communication Feed */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--th-border)",
      }}>
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ color: "var(--th-text-code)", fontWeight: 600 }}>COMM_CHANNEL://TEAM_ROOM</span>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--th-text-code)",
          }} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "var(--th-text-muted)", fontSize: 10 }}>
            PEERS: {String(agents.length).padStart(2, "0")}
          </span>
        </div>

        {/* Feed content */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {/* Team board entries from file */}
          {boardEntries.length > 0 && boardEntries.map((entry, i) => (
            <CommMessage key={`board-${i}`} entry={entry} agents={agents} />
          ))}

          {/* Active tasks as live status (fallback when no board entries) */}
          {boardEntries.length === 0 && activeTasks.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 32 }}>
              No active orchestration. Start a kickoff to see team communication.
            </div>
          )}
          {boardEntries.length === 0 && activeTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.assigned_agent_id);
            return (
              <div key={task.id} style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>
                  <span style={{ color: "var(--th-accent)", fontWeight: 600 }}>
                    {agent?.name.toUpperCase().replace(/\s+/g, "_") ?? "SYSTEM"}
                  </span>
                  {" "}@{task.status === "review" ? "Peer-Review" : "Status"}
                </div>
                <div style={{
                  fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)",
                  background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
                  padding: "10px 14px",
                }}>
                  {task.title}
                  {task.status === "in_progress" && (
                    <div style={{ height: 3, background: "var(--th-border)", width: "100%", marginTop: 8 }}>
                      <div style={{ height: 3, background: "var(--th-accent)", width: `${getTaskProgress(task)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Command input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-secondary)",
        }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-accent)" }}>{">"}_</span>
          <input
            type="text"
            placeholder="ENTER COMMAND OR MESSAGE..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)",
            }}
          />
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", border: "1px solid var(--th-border)", padding: "2px 6px" }}>
            ESC: CANCEL
          </span>
          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-accent)", border: "1px solid var(--th-accent)", padding: "2px 6px" }}>
            ENTER: SEND
          </span>
        </div>
      </div>

      {/* Right: Reasoning Tree */}
      <div style={{
        width: 320,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        flexShrink: 0,
      }}>
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          color: "var(--th-accent)",
          fontWeight: 600,
        }}>
          LOGIC_VIEW://REASONING_TREE
        </div>

        <div style={{ padding: 16 }}>
          {/* Mission objective */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: 0.5, marginBottom: 6 }}>
              MISSION_OBJECTIVE
            </div>
            <div style={{
              background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
              padding: "10px 14px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-primary)" }}>
                {project?.name?.toUpperCase().replace(/\s+/g, "_") ?? "NO_PROJECT"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                  STATUS: {activeTasks.length > 0 ? "ACTIVE" : "IDLE"}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)" }}>
                  PROGRESS: {tasks.length > 0 ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Step progress tree */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {tasks.slice(0, 8).map((task) => (
                <StepTreeNode key={task.id} task={task} agents={agents} />
              ))}
            </div>
          </div>

          {/* Active Dependencies */}
          <ActiveDependencies tasks={tasks} />
        </div>
      </div>
    </div>
  );
}

/* ── Communication Message with type-based styling ── */

function detectMessageType(entry: TeamBoardEntry): "system" | "success" | "blocker" | "instruction" | "status" | "review" {
  const sub = entry.subject.toLowerCase();
  const body = entry.body.toLowerCase();
  if (sub.includes("blocker") || body.includes("blocker") || body.includes("conflict")) return "blocker";
  if (sub.includes("success") || sub.includes("approve") || sub.includes("completed")) return "success";
  if (entry.sender.toLowerCase().includes("pm") || sub.includes("instruction") || sub.includes("assigned")) return "instruction";
  if (sub.includes("review") || body.includes("review")) return "review";
  if (sub.includes("system") || entry.sender === "SYSTEM") return "system";
  return "status";
}

const MESSAGE_STYLES: Record<string, { labelColor: string; borderColor: string; bgTint: string; label: string | null }> = {
  system: { labelColor: "#60a5fa", borderColor: "rgba(96,165,250,0.3)", bgTint: "rgba(96,165,250,0.05)", label: "SYSTEM_EVT" },
  success: { labelColor: "var(--th-text-code)", borderColor: "rgba(34,197,94,0.3)", bgTint: "rgba(34,197,94,0.05)", label: "SUCCESS" },
  blocker: { labelColor: "#ef4444", borderColor: "rgba(239,68,68,0.4)", bgTint: "rgba(239,68,68,0.08)", label: "BLOCKER" },
  instruction: { labelColor: "#ef4444", borderColor: "var(--th-border)", bgTint: "transparent", label: null },
  status: { labelColor: "var(--th-accent)", borderColor: "var(--th-border)", bgTint: "transparent", label: null },
  review: { labelColor: "#60a5fa", borderColor: "rgba(96,165,250,0.3)", bgTint: "transparent", label: null },
};

function CommMessage({ entry, agents }: { entry: TeamBoardEntry; agents: Agent[] }) {
  const msgType = detectMessageType(entry);
  const style = MESSAGE_STYLES[msgType];
  const isPM = agents.some((a) => a.role === "team_leader" && a.name.toLowerCase() === entry.sender.toLowerCase());

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Type label */}
      {style.label && (
        <div style={{
          fontFamily: mono, fontSize: 9, fontWeight: 600,
          color: style.labelColor, letterSpacing: 0.5, marginBottom: 4,
        }}>
          [{style.label}]
        </div>
      )}

      {/* Sender line */}
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 4 }}>
        <span style={{ color: isPM ? "#ef4444" : style.labelColor, fontWeight: 600 }}>
          {entry.sender.toUpperCase().replace(/\s+/g, "_")}
        </span>
        {" "}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
        {" "}
        <span style={{ color: "var(--th-text-secondary)" }}>{entry.target.toUpperCase()}</span>
        <span style={{ color: "var(--th-text-muted)", marginLeft: 8, fontSize: 9 }}>{entry.timestamp}</span>
      </div>

      {/* Message body */}
      <div style={{
        fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)",
        background: style.bgTint !== "transparent" ? style.bgTint : "var(--th-bg-surface)",
        border: `1px solid ${style.borderColor}`,
        padding: "10px 14px",
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11, color: style.labelColor }}>
          {entry.subject}
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.5 }}>
          {entry.body.length > 300 ? `${entry.body.slice(0, 297)}...` : entry.body}
        </div>
      </div>
    </div>
  );
}

/* ── Step progress tree node ── */

function StepTreeNode({ task, agents }: { task: Task; agents: Agent[] }) {
  const isDone = task.status === "done";
  const isRunning = task.status === "in_progress";
  const isReview = task.status === "review";
  const isFailed = task.status === "failed" || task.execution_state === "failed";
  const agent = agents.find((a) => a.id === task.assigned_agent_id);

  const color = isDone ? "var(--th-text-code)"
    : isFailed ? "#ef4444"
    : isReview ? "#60a5fa"
    : isRunning ? "var(--th-accent)"
    : "var(--th-text-muted)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, width: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isDone ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : isFailed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : isRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>
          ) : isReview ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /><path d="M12 6v6" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /></svg>
          )}
        </span>
        <span style={{
          fontFamily: mono, fontSize: 11, flex: 1,
          color: isDone ? "var(--th-text-secondary)" : "var(--th-text-primary)",
          textDecoration: isDone ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title.length > 28 ? task.title.substring(0, 28) + "..." : task.title}
        </span>
      </div>

      {/* Sub-info for running tasks */}
      {isRunning && (
        <div style={{ marginLeft: 22, marginTop: 2 }}>
          {agent && (
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
              {agent.name.split(" ")[0]?.toLowerCase()}
            </span>
          )}
          <div style={{ height: 2, background: "var(--th-border)", width: "80%", marginTop: 3 }}>
            <div style={{ height: 2, background: "var(--th-accent)", width: `${getTaskProgress(task)}%`, transition: "width 0.3s" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Active Dependencies ── */

interface Dependency {
  name: string;
  type: string;
  status: "READY" | "CONFLICT" | "LOCKED" | "WAITING";
}

function ActiveDependencies({ tasks }: { tasks: Task[] }) {
  // Derive dependencies from task states
  const deps: Dependency[] = [];

  const blockedTasks = tasks.filter((t) => t.execution_state === "blocked" || t.status === "failed");
  const reviewTasks = tasks.filter((t) => t.status === "review");
  const runningTasks = tasks.filter((t) => t.status === "in_progress");

  if (blockedTasks.length > 0) {
    for (const t of blockedTasks.slice(0, 2)) {
      deps.push({
        name: t.title.slice(0, 20),
        type: "Task",
        status: t.status === "failed" ? "CONFLICT" : "LOCKED",
      });
    }
  }
  if (reviewTasks.length > 0) {
    deps.push({ name: `${reviewTasks.length} review(s)`, type: "PM", status: "WAITING" });
  }
  if (runningTasks.length > 0) {
    deps.push({ name: `${runningTasks.length} running`, type: "Exec", status: "READY" });
  }

  if (deps.length === 0) return null;

  const statusColors: Record<string, string> = {
    READY: "var(--th-text-code)",
    CONFLICT: "#ef4444",
    LOCKED: "var(--th-accent)",
    WAITING: "#60a5fa",
  };

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", letterSpacing: 0.5, marginBottom: 8 }}>
        ACTIVE_DEPENDENCIES
      </div>
      <div style={{
        background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
        padding: "8px 10px",
      }}>
        {deps.map((dep, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "3px 0",
            fontFamily: mono,
            fontSize: 10,
          }}>
            <span style={{ color: "var(--th-text-secondary)" }}>
              <span style={{ color: "var(--th-text-muted)", marginRight: 4 }}>{dep.type}:</span>
              {dep.name}
            </span>
            <span style={{
              color: statusColors[dep.status] ?? "var(--th-text-muted)",
              fontWeight: 600,
              fontSize: 9,
              letterSpacing: 0.5,
            }}>
              {dep.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
