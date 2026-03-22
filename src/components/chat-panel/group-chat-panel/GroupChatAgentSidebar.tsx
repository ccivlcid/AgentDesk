import type { Agent } from "../../../types";
import { IconCheck } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { AGENT_STATUS_DOT } from "./constants";
import type { GroupChatPanelVm, RoomSummary } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "agents"
  | "filteredAgents"
  | "selectedIds"
  | "loadingIds"
  | "toggleAgent"
  | "getAgentName"
  | "roomHistory"
  | "loadRoom"
  | "currentRoomId"
  | "agentById"
>;

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function GroupChatAgentSidebar({
  tr,
  agents,
  filteredAgents,
  selectedIds,
  loadingIds,
  toggleAgent,
  getAgentName,
  roomHistory,
  loadRoom,
  currentRoomId,
  agentById,
}: Props) {
  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: `1px solid ${KAKAO_MSG.borderLight}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: KAKAO_MSG.surface,
        fontFamily: KAKAO_MSG.fontSans,
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderBottom: `1px solid ${KAKAO_MSG.borderLight}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: KAKAO_MSG.meta,
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
              color: KAKAO_MSG.meta,
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
                borderBottom: `1px solid ${KAKAO_MSG.borderHairline}`,
                background: isSelected ? KAKAO_MSG.rowSelected : "transparent",
                border: "none",
                borderLeftColor: isSelected ? "#F2C200" : "transparent",
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
                    borderRadius: 12,
                    background: isSelected ? KAKAO_MSG.bubbleMine : KAKAO_MSG.surfaceMuted,
                    border: `1px solid ${isSelected ? "#E6D000" : KAKAO_MSG.borderLight}`,
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
                    border: `1.5px solid ${KAKAO_MSG.surface}`,
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? KAKAO_MSG.bubbleMineText : "#191919",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getAgentName(agent)}
                </div>
                <div style={{ fontSize: 10, color: KAKAO_MSG.meta, marginTop: 1 }}>
                  {isLoading ? "loading…" : agent.role}
                </div>
              </div>

              {isSelected && (
                <span style={{ display: "flex", color: "#C9A000", flexShrink: 0 }}>
                  <IconCheck size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 이전 대화 목록 ──────────────────────────────────────────── */}
      {roomHistory.length > 0 && (
        <>
          <div
            style={{
              padding: "6px 10px",
              borderTop: `1px solid ${KAKAO_MSG.borderLight}`,
              borderBottom: `1px solid ${KAKAO_MSG.borderLight}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: KAKAO_MSG.meta,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {tr("이전 대화", "History")} ({roomHistory.length})
            </span>
          </div>
          <div style={{ flex: "0 1 auto", overflowY: "auto", maxHeight: 200 }}>
            {roomHistory.map((room: RoomSummary) => {
              const isActive = currentRoomId === room.room_id;
              const participantNames = room.agent_ids
                .map((id) => {
                  const a = agentById.get(id);
                  return a ? (a.avatar_emoji + " " + getAgentName(a)) : null;
                })
                .filter(Boolean)
                .slice(0, 3);
              const preview = room.last_content
                ? room.last_content.replace(/\[첨부[^\]]*\]\s*/g, "").slice(0, 40)
                : "";
              return (
                <button
                  key={room.room_id}
                  type="button"
                  onClick={() => loadRoom(room)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    borderBottom: `1px solid ${KAKAO_MSG.borderHairline}`,
                    borderLeft: isActive ? "3px solid #F2C200" : "3px solid transparent",
                    background: isActive ? KAKAO_MSG.rowSelected : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 600 : 400,
                        color: "#191919",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                      }}
                    >
                      {participantNames.length > 0 ? participantNames.join(", ") : tr("단톡방", "Group")}
                      {room.agent_ids.length > 3 && ` +${room.agent_ids.length - 3}`}
                    </span>
                    <span style={{ fontSize: 9, color: KAKAO_MSG.meta, flexShrink: 0, marginLeft: 4 }}>
                      {fmtTime(room.last_ts)}
                    </span>
                  </div>
                  {preview && (
                    <div
                      style={{
                        fontSize: 10,
                        color: KAKAO_MSG.meta,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {preview}
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: KAKAO_MSG.meta }}>
                    {room.msg_count} {tr("메시지", "msgs")}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
