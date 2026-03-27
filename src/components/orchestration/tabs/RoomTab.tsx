import { useState, useEffect } from "react";
import type { Task, Agent, Project } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getProjectTeamBoard, type TeamBoardEntry } from "../../../api/organization-projects";
import { useUiStore } from "../../../store/uiStore";

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

  const meetingMinutesSeq = useUiStore((s) => s.meetingMinutesSeq);
  const [boardEntries, setBoardEntries] = useState<TeamBoardEntry[]>([]);

  useEffect(() => {
    if (!projectId) { setBoardEntries([]); return; }
    getProjectTeamBoard(projectId)
      .then((res) => setBoardEntries(res.entries ?? []))
      .catch(() => setBoardEntries([]));
  }, [projectId, meetingMinutesSeq]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", gap: 16 }}>
      {/* Left: Communication Feed */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--th-bg-surface)",
        }}>
          <div style={{ padding: 4, background: "var(--th-accent-glow)", borderRadius: 8, color: "var(--th-accent)", display: "flex", alignItems: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ color: "#374151", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Team Room</span>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--th-success)",
          }} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "var(--th-text-muted)", fontSize: 10, fontWeight: 600 }}>
            PEERS: {String(agents.length).padStart(2, "0")}
          </span>
        </div>

        {/* Feed content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {/* Team board entries from file */}
          {boardEntries.length > 0 && boardEntries.map((entry, i) => (
            <CommMessage key={`board-${i}`} entry={entry} agents={agents} />
          ))}

          {/* Active tasks as live status (fallback when no board entries) */}
          {boardEntries.length === 0 && activeTasks.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 40 }}>
              No active orchestration. Start a kickoff to see team communication.
            </div>
          )}
          {boardEntries.length === 0 && activeTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.assigned_agent_id);
            return (
              <div key={task.id} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, fontWeight: 600 }}>
                  <span style={{ color: "var(--th-accent)", fontWeight: 800 }}>
                    {agent?.name.toUpperCase().replace(/\s+/g, "_") ?? "SYSTEM"}
                  </span>
                  {" "}@{task.status === "review" ? "Peer-Review" : "Status"}
                </div>
                <div style={{
                  fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)",
                  background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
                  borderRadius: 14,
                  padding: "12px 16px",
                }}>
                  {task.title}
                  {task.status === "in_progress" && (
                    <div style={{ height: 4, background: "var(--th-border)", width: "100%", marginTop: 10, borderRadius: 2 }}>
                      <div style={{ height: 4, background: "var(--th-accent)", width: `${getTaskProgress(task)}%`, borderRadius: 2 }} />
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
          padding: "10px 16px",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
        }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: "var(--th-accent)", fontWeight: 700 }}>{">"}_</span>
          <input
            type="text"
            placeholder="Enter command or message..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)",
            }}
          />
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 600, color: "var(--th-text-muted)",
            border: "1px solid var(--th-border)", padding: "3px 8px", borderRadius: 6,
          }}>
            ESC
          </span>
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700, color: "var(--th-bg-elevated)",
            background: "var(--th-accent)", padding: "3px 8px", borderRadius: 6,
          }}>
            ENTER
          </span>
        </div>
      </div>

      {/* Right: Reasoning Tree */}
      <div style={{
        width: 300,
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        flexShrink: 0,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 16,
      }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--th-bg-surface)",
        }}>
          <div style={{ padding: 4, background: "#FEF3C7", borderRadius: 8, color: "#D97706", display: "flex", alignItems: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <span style={{ color: "#374151", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            Logic View
          </span>
        </div>

        <div style={{ padding: 20 }}>
          {/* Mission objective */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
              Mission Objective
            </div>
            <div style={{
              background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
              borderRadius: 14,
              padding: "12px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)" }}>
                {project?.name?.toUpperCase().replace(/\s+/g, "_") ?? "NO_PROJECT"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 600 }}>
                  STATUS: {activeTasks.length > 0 ? "ACTIVE" : "IDLE"}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-accent)", fontWeight: 700 }}>
                  {tasks.length > 0 ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Step progress tree */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
              Tasks
            </div>
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

/* -- Communication Message with type-based styling -- */

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
  system: { labelColor: "var(--th-accent)", borderColor: "var(--th-accent-border)", bgTint: "var(--th-accent-glow)", label: "SYSTEM" },
  success: { labelColor: "var(--th-success)", borderColor: "#A7F3D0", bgTint: "#ECFDF5", label: "SUCCESS" },
  blocker: { labelColor: "var(--th-danger-text)", borderColor: "var(--th-danger-border)", bgTint: "var(--th-danger-bg)", label: "BLOCKER" },
  instruction: { labelColor: "#D97706", borderColor: "var(--th-border)", bgTint: "var(--th-bg-elevated)", label: null },
  status: { labelColor: "var(--th-accent)", borderColor: "var(--th-border)", bgTint: "var(--th-bg-elevated)", label: null },
  review: { labelColor: "#7C3AED", borderColor: "#DDD6FE", bgTint: "#F5F3FF", label: null },
};

function CommMessage({ entry, agents }: { entry: TeamBoardEntry; agents: Agent[] }) {
  const msgType = detectMessageType(entry);
  const style = MESSAGE_STYLES[msgType];
  const isPM = agents.some((a) => a.role === "team_leader" && a.name.toLowerCase() === entry.sender.toLowerCase());

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Type label */}
      {style.label && (
        <div style={{
          fontFamily: mono, fontSize: 9, fontWeight: 800,
          color: style.labelColor, letterSpacing: "0.05em", marginBottom: 4,
        }}>
          [{style.label}]
        </div>
      )}

      {/* Sender line */}
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", marginBottom: 6, fontWeight: 600 }}>
        <span style={{ color: isPM ? "var(--th-danger-text)" : style.labelColor, fontWeight: 800 }}>
          {entry.sender.toUpperCase().replace(/\s+/g, "_")}
        </span>
        {" "}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
        {" "}
        <span style={{ color: "var(--th-text-secondary)" }}>{entry.target.toUpperCase()}</span>
        <span style={{ color: "var(--th-border-strong)", marginLeft: 8, fontSize: 9 }}>{entry.timestamp}</span>
      </div>

      {/* Message body */}
      <div style={{
        fontFamily: mono, fontSize: 12, color: "var(--th-text-primary)",
        background: style.bgTint,
        border: `1px solid ${style.borderColor}`,
        borderRadius: 14,
        padding: "12px 16px",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: style.labelColor }}>
          {entry.subject}
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.6 }}>
          {entry.body.length > 300 ? `${entry.body.slice(0, 297)}...` : entry.body}
        </div>
      </div>
    </div>
  );
}

/* -- Step progress tree node -- */

function StepTreeNode({ task, agents }: { task: Task; agents: Agent[] }) {
  const isDone = task.status === "done";
  const isRunning = task.status === "in_progress";
  const isReview = task.status === "review";
  const isFailed = task.status === "failed" || task.execution_state === "failed";
  const agent = agents.find((a) => a.id === task.assigned_agent_id);

  const color = isDone ? "var(--th-success)"
    : isFailed ? "var(--th-danger-text)"
    : isReview ? "#7C3AED"
    : isRunning ? "var(--th-accent)"
    : "var(--th-border-strong)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, width: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isDone ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : isFailed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : isRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>
          ) : isReview ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /><path d="M12 6v6" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /></svg>
          )}
        </span>
        <span style={{
          fontFamily: mono, fontSize: 11, flex: 1,
          color: isDone ? "var(--th-text-muted)" : "var(--th-text-primary)",
          fontWeight: isRunning ? 600 : 400,
          textDecoration: isDone ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {task.title.length > 28 ? task.title.substring(0, 28) + "..." : task.title}
        </span>
      </div>

      {/* Sub-info for running tasks */}
      {isRunning && (
        <div style={{ marginLeft: 22, marginTop: 4 }}>
          {agent && (
            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", fontWeight: 600 }}>
              {agent.name.split(" ")[0]?.toLowerCase()}
            </span>
          )}
          <div style={{ height: 3, background: "var(--th-border)", width: "80%", marginTop: 4, borderRadius: 2 }}>
            <div style={{ height: 3, background: "var(--th-accent)", width: `${getTaskProgress(task)}%`, transition: "width 0.3s", borderRadius: 2 }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Active Dependencies -- */

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

  const statusColors: Record<string, { text: string; bg: string; border: string }> = {
    READY: { text: "var(--th-success)", bg: "#ECFDF5", border: "#A7F3D0" },
    CONFLICT: { text: "var(--th-danger-text)", bg: "var(--th-danger-bg)", border: "var(--th-danger-border)" },
    LOCKED: { text: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    WAITING: { text: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  };

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        Active Dependencies
      </div>
      <div style={{
        background: "var(--th-bg-surface)", border: "1px solid var(--th-border)",
        borderRadius: 14,
        padding: "10px 14px",
      }}>
        {deps.map((dep, i) => {
          const sc = statusColors[dep.status] ?? { text: "var(--th-text-muted)", bg: "var(--th-bg-surface)", border: "var(--th-border)" };
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 0",
              fontFamily: mono,
              fontSize: 10,
            }}>
              <span style={{ color: "var(--th-text-secondary)" }}>
                <span style={{ color: "var(--th-text-muted)", marginRight: 4, fontWeight: 600 }}>{dep.type}:</span>
                {dep.name}
              </span>
              <span style={{
                color: sc.text,
                fontWeight: 800,
                fontSize: 9,
                background: sc.bg,
                border: `1px solid ${sc.border}`,
                borderRadius: 6,
                padding: "1px 6px",
                letterSpacing: "0.05em",
              }}>
                {dep.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
