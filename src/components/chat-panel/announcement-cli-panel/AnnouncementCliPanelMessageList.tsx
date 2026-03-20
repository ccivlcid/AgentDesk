import type { RefObject } from "react";
import type { Agent, Message } from "../../../types";
import MessageContent from "../../MessageContent";
import { CliLine } from "./CliLine";
import type { Tr } from "./types";

export interface AnnouncementCliPanelMessageListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  displayMessages: Message[];
  agents: Agent[];
  locale: string;
  getAgentName: (a: Agent | null | undefined) => string;
  searchQuery: string;
  streamingMessage?: { agent_id: string; agent_name: string; content: string } | null;
  tr: Tr;
}

export function AnnouncementCliPanelMessageList({
  scrollRef,
  messagesEndRef,
  displayMessages,
  agents,
  locale,
  getAgentName,
  searchQuery,
  streamingMessage,
  tr,
}: AnnouncementCliPanelMessageListProps) {
  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        background: "var(--th-bg-primary)",
      }}
    >
      {displayMessages.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 16,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--th-accent-glow)",
              border: "1px solid var(--th-accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              width={28}
              height={28}
              style={{ color: "var(--th-accent)" }}
            >
              <path d="M3 8v8h4l6 5V3L7 8H3z" />
              <path d="M18 8.5a5 5 0 010 7" />
              <path d="M20.5 6a9 9 0 010 12" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--th-text-secondary)", marginBottom: 6 }}>
              {searchQuery.trim()
                ? tr("검색 결과 없음", "No matches found", "一致なし", "无匹配结果")
                : tr("공지 내역이 없습니다", "No broadcasts yet", "告知履歴なし", "暂无广播")}
            </div>
            {!searchQuery.trim() && (
              <div style={{ fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
                {tr(
                  "아래 입력창에서 전사 공지를 작성하세요.\n전체 에이전트에게 즉시 전달됩니다.",
                  "Write a broadcast below.\nAll agents will receive it immediately.",
                  "下の入力欄から告知を作成してください。\n全エージェントに即時届きます。",
                  "在下方输入框中撰写广播。\n所有代理将立即收到。",
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {displayMessages.map((msg) => (
            <CliLine key={msg.id} msg={msg} agents={agents} locale={locale} getAgentName={getAgentName} />
          ))}

          {streamingMessage?.content && (
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--th-border)",
                background: "var(--th-green-glow)",
              }}
            >
              <div style={{ width: 3, flexShrink: 0, background: "var(--th-success, #22c55e)", opacity: 0.8 }} />
              <div style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--th-font-mono)", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "var(--th-green-glow)",
                      color: "var(--th-success, #4ade80)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {streamingMessage.agent_name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: "var(--th-green-glow)",
                      color: "var(--th-success, #4ade80)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    ●&nbsp;{tr("응답 중", "responding", "応答中", "回复中")}
                  </span>
                </div>
                <div
                  style={{
                    color: "var(--th-text-primary)",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <MessageContent content={streamingMessage.content} />
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 12,
                      background: "var(--th-accent)",
                      verticalAlign: "text-bottom",
                      marginLeft: 2,
                      animation: "pulse 1s infinite",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
