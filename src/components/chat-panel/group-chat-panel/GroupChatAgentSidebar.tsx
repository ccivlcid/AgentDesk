import type { Agent } from "../../../types";
import { AGENT_STATUS_DOT } from "./constants";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "agents"
  | "filteredAgents"
  | "selectedIds"
  | "loadingIds"
  | "toggleAgent"
  | "getAgentName"
>;

export function GroupChatAgentSidebar({
  tr,
  agents,
  filteredAgents,
  selectedIds,
  loadingIds,
  toggleAgent,
  getAgentName,
}: Props) {
  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: "1px solid var(--th-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid var(--th-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--th-text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {tr("에이전트", "Agents")} ({agents.length})
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredAgents.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              fontSize: 11,
              color: "var(--th-text-muted)",
            }}
          >
            {tr("없음", "None")}
          </div>
        )}
        {filteredAgents.map((agent: Agent) => {
          const isSelected = selectedIds.has(agent.id);
          const isLoading = loadingIds.has(agent.id);
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => toggleAgent(agent.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                width: "100%",
                padding: "9px 12px",
                borderBottom: "1px solid var(--th-border)",
                background: isSelected ? "var(--th-accent-glow)" : "transparent",
                border: "none",
                borderBottomColor: "var(--th-border)",
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderLeftColor: isSelected ? "var(--th-accent)" : "transparent",
                borderLeftWidth: 3,
                borderLeftStyle: "solid",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: isSelected ? "var(--th-accent)" : "var(--th-bg-surface)",
                    border: `1px solid ${isSelected ? "var(--th-accent)" : "var(--th-border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    transition: "background 0.1s",
                  }}
                >
                  {agent.avatar_emoji}
                </div>
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: AGENT_STATUS_DOT[agent.status] ?? "var(--th-text-muted)",
                    border: "1.5px solid var(--th-bg-elevated)",
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "var(--th-accent)" : "var(--th-text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getAgentName(agent)}
                </div>
                <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
                  {isLoading ? "loading…" : agent.role}
                </div>
              </div>

              {isSelected && (
                <span style={{ fontSize: 12, color: "var(--th-accent)", flexShrink: 0 }}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
