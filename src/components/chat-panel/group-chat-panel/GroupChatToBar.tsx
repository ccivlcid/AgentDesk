import type { Agent } from "../../../types";
import { IconX } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
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
        borderBottom: `1px solid ${KAKAO_MSG.borderLight}`,
        background: KAKAO_MSG.surface,
        flexShrink: 0,
        gap: 8,
        flexWrap: "wrap",
        fontFamily: KAKAO_MSG.fontSans,
      }}
    >
      <span style={{ fontSize: 11, color: KAKAO_MSG.meta, flexShrink: 0 }}>
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
            background: KAKAO_MSG.bubbleMine,
            border: `1px solid ${KAKAO_MSG.borderHairline}`,
            color: KAKAO_MSG.bubbleMineText,
            fontSize: 11,
            fontFamily: KAKAO_MSG.fontSans,
            cursor: "pointer",
            lineHeight: 1.3,
            boxShadow: KAKAO_MSG.bubbleShadow,
          }}
        >
          <span>{a.avatar_emoji}</span>
          <span>{getAgentName(a)}</span>
          <span style={{ display: "inline-flex", opacity: 0.75, marginLeft: 2 }}>
            <IconX size={10} />
          </span>
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
          color: KAKAO_MSG.bubbleMineText,
          fontFamily: KAKAO_MSG.fontSans,
          caretColor: "#191919",
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
            border: `1px solid ${KAKAO_MSG.borderLight}`,
            background: KAKAO_MSG.surfaceMuted,
            color: KAKAO_MSG.meta,
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
