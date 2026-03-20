import type { Agent } from "../../../types";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "getAgentName"
  | "toggleAgent"
  | "search"
  | "setSearch"
  | "selectedIds"
  | "clearAllRecipients"
  | "selectedAgents"
>;

export function GroupChatToBar({
  tr,
  getAgentName,
  toggleAgent,
  search,
  setSearch,
  selectedIds,
  clearAllRecipients,
  selectedAgents,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 44,
        padding: "0 14px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-glass-bg)",
        flexShrink: 0,
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--th-text-muted)", flexShrink: 0 }}>
        {tr("받는 사람:", "To:")}
      </span>

      {selectedAgents.map((a: Agent) => (
        <button
          key={a.id}
          type="button"
          onClick={() => toggleAgent(a.id)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px 3px 6px",
            borderRadius: 20,
            background: "var(--th-accent)",
            border: "none",
            color: "#fff",
            fontSize: 11,
            fontFamily: "var(--th-font-mono)",
            cursor: "pointer",
            lineHeight: 1.3,
          }}
        >
          <span>{a.avatar_emoji}</span>
          <span>{getAgentName(a)}</span>
          <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>✕</span>
        </button>
      ))}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={
          selectedIds.size === 0
            ? tr("에이전트 검색...", "Search agents...")
            : tr("추가...", "Add...")
        }
        style={{
          flex: 1,
          minWidth: 80,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 11,
          color: "var(--th-text-primary)",
          fontFamily: "var(--th-font-mono)",
          caretColor: "var(--th-accent)",
        }}
      />
      {selectedIds.size > 0 && (
        <button
          type="button"
          onClick={clearAllRecipients}
          style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-elevated)",
            color: "var(--th-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {tr("모두 해제", "Clear")}
        </button>
      )}
    </div>
  );
}
