import type { Message } from "../../../types";
import { IconRobot } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { PRIORITY_COLOR, PRIORITY_LABEL } from "./constants";
import { IconTask, IconUrgent } from "./ModeIcons";
import { parseModePrefix } from "./utils";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "t"
  | "isKo"
  | "locale"
  | "selectedIds"
  | "mergedMessages"
  | "agentById"
  | "getAgentName"
  | "bottomRef"
>;

export function GroupChatMessageList({
  tr,
  t,
  isKo,
  locale,
  selectedIds,
  mergedMessages,
  agentById,
  getAgentName,
  bottomRef,
}: Props) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", fontFamily: KAKAO_MSG.fontSans }}>
      {selectedIds.size === 0 ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: KAKAO_MSG.meta,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 36, height: 36, opacity: 0.2 }}
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span style={{ fontSize: 12 }}>
            {tr("왼쪽에서 에이전트를 선택하세요", "Select agents on the left")}
          </span>
        </div>
      ) : mergedMessages.length === 0 ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: KAKAO_MSG.meta,
          }}
        >
          {tr("대화 내역이 없습니다", "No messages yet")}
        </div>
      ) : (
        mergedMessages.map((msg: Message & { _forAgentId: string }) => {
          const isCeo = msg.sender_type === "client";
          const forAgent = agentById.get(msg._forAgentId);
          const senderName =
            msg.sender_agent
              ? getAgentName(msg.sender_agent)
              : msg.sender_name?.trim() || (forAgent ? getAgentName(forAgent) : "");
          const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          });

          const parsed = parseModePrefix(msg.content);
          const isUrgent = parsed.mode === "urgent";
          const isTask = parsed.mode === "task";

          const mineBg = isCeo
            ? isUrgent
              ? "#FFF9C4"
              : isTask
                ? KAKAO_MSG.bubbleMine
                : KAKAO_MSG.bubbleMine
            : KAKAO_MSG.bubbleOther;
          const mineText = isCeo
            ? isUrgent
              ? "#B71C1C"
              : KAKAO_MSG.bubbleMineText
            : KAKAO_MSG.bubbleOtherText;

          // In open chat mode: resolve sender agent from sender_id (not _forAgentId)
          const senderAgent =
            !isCeo && msg.sender_id ? agentById.get(msg.sender_id) : undefined;
          const displayAgent = senderAgent ?? forAgent;
          const displayName = isCeo
            ? (isKo ? "나" : "Me")
            : senderAgent
              ? getAgentName(senderAgent)
              : senderName;

          return (
            <div
              key={`${msg.id}:${msg._forAgentId}`}
              style={{
                display: "flex",
                flexDirection: isCeo ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
                padding: "6px 14px",
              }}
            >
              {!isCeo && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    background: KAKAO_MSG.surface,
                    border: `1px solid ${KAKAO_MSG.borderLight}`,
                    boxShadow: KAKAO_MSG.bubbleShadow,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                    marginBottom: 2,
                  }}
                >
                  {displayAgent?.avatar_emoji?.trim() ? (
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{displayAgent.avatar_emoji}</span>
                  ) : (
                    <IconRobot size={20} style={{ color: KAKAO_MSG.meta }} />
                  )}
                </div>
              )}

              <div
                style={{
                  maxWidth: "70%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isCeo ? "flex-end" : "flex-start",
                  gap: 3,
                }}
              >
                {!isCeo && (
                  <span style={{ fontSize: 10, color: KAKAO_MSG.meta, paddingLeft: 4, fontWeight: 600 }}>
                    {displayName}
                  </span>
                )}

                {isCeo && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: KAKAO_MSG.meta, paddingRight: 4 }}>
                    {displayName}
                  </span>
                )}

                {isCeo && (isTask || isUrgent) && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      paddingRight: 4,
                      marginBottom: 1,
                    }}
                  >
                    {isUrgent && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 9,
                          fontFamily: "var(--th-font-mono)",
                          fontWeight: 700,
                          color: "var(--th-danger)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        <IconUrgent /> {isKo ? "긴급" : "URGENT"}
                      </span>
                    )}
                    {isTask && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: 9,
                          fontFamily: "var(--th-font-mono)",
                          fontWeight: 700,
                          color: "var(--th-accent)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        <IconTask /> {isKo ? "업무지시" : "TASK"}
                        {parsed.deadline && (
                          <span style={{ color: "var(--th-text-muted)", fontWeight: 400 }}>
                            · {parsed.deadline}
                          </span>
                        )}
                        {parsed.priority && parsed.priority !== "normal" && (
                          <span
                            style={{
                              color: PRIORITY_COLOR[parsed.priority],
                              fontWeight: 700,
                            }}
                          >
                            · {t(PRIORITY_LABEL[parsed.priority])}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: isCeo ? 18 : 18,
                    borderTopRightRadius: isCeo ? 4 : 18,
                    borderTopLeftRadius: isCeo ? 18 : 4,
                    borderBottomRightRadius: isCeo ? 18 : 4,
                    borderBottomLeftRadius: isCeo ? 4 : 18,
                    background: mineBg,
                    color: mineText,
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxShadow: KAKAO_MSG.bubbleShadow,
                    border: isCeo
                      ? isUrgent
                        ? "2px solid #E53935"
                        : isTask
                          ? `1px solid rgba(30, 136, 229, 0.35)`
                          : "1px solid rgba(0,0,0,0.06)"
                      : isUrgent
                        ? "1px solid #FFCDD2"
                        : `1px solid ${KAKAO_MSG.borderHairline}`,
                    borderLeft: !isCeo && isUrgent ? "3px solid #E53935" : undefined,
                  }}
                >
                  {parsed.body || msg.content}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: KAKAO_MSG.meta,
                    paddingLeft: isCeo ? 0 : 4,
                    paddingRight: isCeo ? 4 : 0,
                  }}
                >
                  {timeStr}
                </span>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
