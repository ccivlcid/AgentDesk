import type { Message } from "../../../types";
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
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
      {selectedIds.size === 0 ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: "var(--th-text-muted)",
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
            color: "var(--th-text-muted)",
          }}
        >
          {tr("대화 내역이 없습니다", "No messages yet")}
        </div>
      ) : (
        mergedMessages.map((msg: Message & { _forAgentId: string }) => {
          const isCeo = msg.sender_type === "client";
          const forAgent = agentById.get(msg._forAgentId);
          const forName = forAgent ? getAgentName(forAgent) : msg._forAgentId.slice(0, 8);
          const senderName = isCeo
            ? "Me"
            : msg.sender_agent
              ? getAgentName(msg.sender_agent)
              : forName;
          const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          });

          const parsed = parseModePrefix(msg.content);
          const isUrgent = parsed.mode === "urgent";
          const isTask = parsed.mode === "task";

          return (
            <div
              key={`${msg.id}:${msg._forAgentId}`}
              style={{
                display: "flex",
                flexDirection: isCeo ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 8,
                padding: "4px 14px",
              }}
            >
              {!isCeo && (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--th-bg-elevated)",
                    border: "1px solid var(--th-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                    flexShrink: 0,
                    marginBottom: 2,
                  }}
                >
                  {forAgent?.avatar_emoji ?? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 14, height: 14, opacity: 0.5 }}
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
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
                  <span
                    style={{ fontSize: 10, color: "var(--th-text-muted)", paddingLeft: 4 }}
                  >
                    {senderName} → {forName}
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
                    padding: "8px 12px",
                    borderRadius: isCeo ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isCeo
                      ? isUrgent
                        ? "var(--th-danger)"
                        : "var(--th-accent)"
                      : "var(--th-bg-elevated)",
                    color: isCeo ? "#fff" : "var(--th-text-primary)",
                    fontSize: 12,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    border: isCeo ? "none" : `1px solid ${isUrgent ? "var(--th-danger)" : "var(--th-border)"}`,
                    borderLeft:
                      !isCeo && isUrgent ? "3px solid var(--th-danger)" : undefined,
                  }}
                >
                  {parsed.body || msg.content}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--th-text-muted)",
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
