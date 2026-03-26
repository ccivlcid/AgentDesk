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
    <div style={{ display: "flex", height: "100%", overflow: "hidden", gap: 16 }}>
      {/* Left: Communication Feed */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid #E5E7EB",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#F9FAFB",
        }}>
          <div style={{ padding: 4, background: "#EBF5FF", borderRadius: 8, color: "#3B82F6", display: "flex", alignItems: "center" }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ color: "#374151", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Team Room</span>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#059669",
          }} />
          <div style={{ flex: 1 }} />
          <span style={{ color: "#9CA3AF", fontSize: 10, fontWeight: 600 }}>
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
            <div style={{ fontFamily: mono, fontSize: 12, color: "#9CA3AF", textAlign: "center", paddingTop: 40 }}>
              No active orchestration. Start a kickoff to see team communication.
            </div>
          )}
          {boardEntries.length === 0 && activeTasks.map((task) => {
            const agent = agents.find((a) => a.id === task.assigned_agent_id);
            return (
              <div key={task.id} style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", marginBottom: 6, fontWeight: 600 }}>
                  <span style={{ color: "#3B82F6", fontWeight: 800 }}>
                    {agent?.name.toUpperCase().replace(/\s+/g, "_") ?? "SYSTEM"}
                  </span>
                  {" "}@{task.status === "review" ? "Peer-Review" : "Status"}
                </div>
                <div style={{
                  fontFamily: mono, fontSize: 12, color: "#111827",
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  borderRadius: 14,
                  padding: "12px 16px",
                }}>
                  {task.title}
                  {task.status === "in_progress" && (
                    <div style={{ height: 4, background: "#E5E7EB", width: "100%", marginTop: 10, borderRadius: 2 }}>
                      <div style={{ height: 4, background: "#3B82F6", width: `${getTaskProgress(task)}%`, borderRadius: 2 }} />
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
          borderTop: "1px solid #E5E7EB",
          background: "#F9FAFB",
        }}>
          <span style={{ fontFamily: mono, fontSize: 12, color: "#3B82F6", fontWeight: 700 }}>{">"}_</span>
          <input
            type="text"
            placeholder="Enter command or message..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontFamily: mono, fontSize: 11, color: "#111827",
            }}
          />
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 600, color: "#9CA3AF",
            border: "1px solid #E5E7EB", padding: "3px 8px", borderRadius: 6,
          }}>
            ESC
          </span>
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700, color: "#FFFFFF",
            background: "#3B82F6", padding: "3px 8px", borderRadius: 6,
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
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 16,
      }}>
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid #E5E7EB",
          fontFamily: mono,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#F9FAFB",
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
            <div style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
              Mission Objective
            </div>
            <div style={{
              background: "#F9FAFB", border: "1px solid #E5E7EB",
              borderRadius: 14,
              padding: "12px 16px",
            }}>
              <div style={{ fontFamily: mono, fontSize: 13, fontWeight: 800, color: "#111827" }}>
                {project?.name?.toUpperCase().replace(/\s+/g, "_") ?? "NO_PROJECT"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", fontWeight: 600 }}>
                  STATUS: {activeTasks.length > 0 ? "ACTIVE" : "IDLE"}
                </span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "#3B82F6", fontWeight: 700 }}>
                  {tasks.length > 0 ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Step progress tree */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
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
  system: { labelColor: "#3B82F6", borderColor: "#BFDBFE", bgTint: "#EBF5FF", label: "SYSTEM" },
  success: { labelColor: "#059669", borderColor: "#A7F3D0", bgTint: "#ECFDF5", label: "SUCCESS" },
  blocker: { labelColor: "#DC2626", borderColor: "#FECACA", bgTint: "#FEF2F2", label: "BLOCKER" },
  instruction: { labelColor: "#D97706", borderColor: "#E5E7EB", bgTint: "#FFFFFF", label: null },
  status: { labelColor: "#3B82F6", borderColor: "#E5E7EB", bgTint: "#FFFFFF", label: null },
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
      <div style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", marginBottom: 6, fontWeight: 600 }}>
        <span style={{ color: isPM ? "#DC2626" : style.labelColor, fontWeight: 800 }}>
          {entry.sender.toUpperCase().replace(/\s+/g, "_")}
        </span>
        {" "}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
        {" "}
        <span style={{ color: "#6B7280" }}>{entry.target.toUpperCase()}</span>
        <span style={{ color: "#D1D5DB", marginLeft: 8, fontSize: 9 }}>{entry.timestamp}</span>
      </div>

      {/* Message body */}
      <div style={{
        fontFamily: mono, fontSize: 12, color: "#111827",
        background: style.bgTint,
        border: `1px solid ${style.borderColor}`,
        borderRadius: 14,
        padding: "12px 16px",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11, color: style.labelColor }}>
          {entry.subject}
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#6B7280", lineHeight: 1.6 }}>
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

  const color = isDone ? "#059669"
    : isFailed ? "#DC2626"
    : isReview ? "#7C3AED"
    : isRunning ? "#3B82F6"
    : "#D1D5DB";

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
          color: isDone ? "#9CA3AF" : "#111827",
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
            <span style={{ fontFamily: mono, fontSize: 9, color: "#9CA3AF", fontWeight: 600 }}>
              {agent.name.split(" ")[0]?.toLowerCase()}
            </span>
          )}
          <div style={{ height: 3, background: "#E5E7EB", width: "80%", marginTop: 4, borderRadius: 2 }}>
            <div style={{ height: 3, background: "#3B82F6", width: `${getTaskProgress(task)}%`, transition: "width 0.3s", borderRadius: 2 }} />
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
    READY: { text: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    CONFLICT: { text: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    LOCKED: { text: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    WAITING: { text: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  };

  return (
    <div>
      <div style={{ fontFamily: mono, fontSize: 10, color: "#9CA3AF", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const }}>
        Active Dependencies
      </div>
      <div style={{
        background: "#F9FAFB", border: "1px solid #E5E7EB",
        borderRadius: 14,
        padding: "10px 14px",
      }}>
        {deps.map((dep, i) => {
          const sc = statusColors[dep.status] ?? { text: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB" };
          return (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 0",
              fontFamily: mono,
              fontSize: 10,
            }}>
              <span style={{ color: "#6B7280" }}>
                <span style={{ color: "#9CA3AF", marginRight: 4, fontWeight: 600 }}>{dep.type}:</span>
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
