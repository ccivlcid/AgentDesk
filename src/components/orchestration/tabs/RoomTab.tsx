import type { Task, Agent, Project } from "../../../types";
import { getTaskProgress } from "../task-progress";

const mono = "var(--th-font-mono)";

interface RoomTabProps {
  tasks: Task[];
  agents: Agent[];
  project: Project | null;
}

export default function RoomTab({ tasks, agents, project }: RoomTabProps) {
  const activeTasks = tasks.filter((t) => ["in_progress", "review", "planned"].includes(t.status));
  const doneTasks = tasks.filter((t) => t.status === "done");

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

        {/* Feed content placeholder */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {activeTasks.length === 0 && (
            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 32 }}>
              No active orchestration. Start a kickoff to see team communication.
            </div>
          )}
          {activeTasks.map((task) => {
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
                  {doneTasks.length}/{tasks.length} DONE
                </span>
              </div>
            </div>
          </div>

          {/* Task pipeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.slice(0, 6).map((task) => {
              const isDone = task.status === "done";
              const isRunning = task.status === "in_progress";
              const color = isDone ? "var(--th-text-code)" : isRunning ? "var(--th-accent)" : "var(--th-text-muted)";
              return (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color, width: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : isRunning ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6" /></svg>
                    )}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: isDone ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}>
                    {task.title.length > 30 ? task.title.substring(0, 30) + "..." : task.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
