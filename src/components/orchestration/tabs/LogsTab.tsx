import type { Task, Agent } from "../../../types";

const mono = "var(--th-font-mono)";

interface LogsTabProps {
  tasks: Task[];
  agents: Agent[];
}

export default function LogsTab({ tasks, agents }: LogsTabProps) {
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
          <div key={agent.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            fontFamily: mono,
            fontSize: 11,
            color: agent.status === "working" ? "var(--th-accent)" : "var(--th-text-secondary)",
            cursor: "pointer",
          }}>
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
          <span>AUTO_SCROLL</span>
        </div>

        {/* Log content placeholder */}
        <div style={{
          flex: 1,
          padding: 16,
          fontFamily: mono,
          fontSize: 12,
          color: "var(--th-text-muted)",
          overflow: "auto",
        }}>
          <span style={{ color: "var(--th-accent)" }}>
            {">"} _  STREAM_IDLE_AWAITING_BUFFER...
          </span>
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
