import type { CSSProperties } from "react";
import type { Agent, Message } from "../../../types";
import MessageContent from "../../MessageContent";
import { IconRobot } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { fmtTime, getAgentDisplayName } from "./helpers";

interface CliLineProps {
  msg: Message;
  agents: Agent[];
  locale: string;
  getAgentName: (a: Agent | null | undefined) => string;
  searchQuery?: string;
}

export function CliLine({ msg, agents, locale, getAgentName }: CliLineProps) {
  const time = fmtTime(msg.created_at, locale);
  const isDirective = msg.message_type === "directive";
  const isAnnouncement = msg.message_type === "announcement" || msg.receiver_type === "all";
  const isAgentReply = msg.sender_type === "agent";
  const isClient = msg.sender_type === "client";

  type LineVariant = "directive" | "client-announce" | "client" | "agent" | "system";
  let variant: LineVariant = "system";
  if (isDirective) variant = "directive";
  else if (isClient && isAnnouncement) variant = "client-announce";
  else if (isClient) variant = "client";
  else if (isAgentReply) variant = "agent";

  const agentName = isAgentReply ? getAgentDisplayName(msg, agents, getAgentName) : "";
  const agentRow = isAgentReply && msg.sender_id ? agents.find((a) => a.id === msg.sender_id) : undefined;
  const avatarEmojiCustom = agentRow?.avatar_emoji?.trim();

  const bubbleBase: CSSProperties = {
    maxWidth: "78%",
    padding: "10px 14px",
    borderRadius: KAKAO_MSG.radiusBubble,
    boxShadow: KAKAO_MSG.bubbleShadow,
    fontSize: 13,
    lineHeight: 1.55,
    fontFamily: KAKAO_MSG.fontSans,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  };

  if (variant === "directive") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "10px 16px",
          background: "transparent",
        }}
      >
        <div
          style={{
            ...bubbleBase,
            maxWidth: "92%",
            background: "#FFEBEE",
            color: "#C62828",
            border: "1px solid #FFCDD2",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: "0.04em" }}>DIRECTIVE</div>
          <MessageContent content={msg.content} />
          <div style={{ fontSize: 10, color: KAKAO_MSG.meta, marginTop: 6, textAlign: "right" }}>{time}</div>
        </div>
      </div>
    );
  }

  if (variant === "system") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "8px 16px" }}>
        <span style={{ fontSize: 11, color: KAKAO_MSG.meta, fontFamily: KAKAO_MSG.fontSans }}>
          <MessageContent content={msg.content} />
        </span>
      </div>
    );
  }

  const isMine = variant === "client-announce" || variant === "client";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: isMine ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
        padding: "6px 14px 8px",
        fontFamily: KAKAO_MSG.fontSans,
      }}
    >
      {!isMine && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "14px",
            background: KAKAO_MSG.surface,
            border: `1px solid ${KAKAO_MSG.borderLight}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: KAKAO_MSG.meta,
            flexShrink: 0,
            boxShadow: KAKAO_MSG.bubbleShadow,
          }}
        >
          {avatarEmojiCustom ? (
            <span style={{ fontSize: 20, lineHeight: 1 }}>{avatarEmojiCustom}</span>
          ) : (
            <IconRobot size={22} />
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "82%", gap: 4 }}>
        {!isMine && (
          <span style={{ fontSize: 11, fontWeight: 600, color: KAKAO_MSG.meta, paddingLeft: 4 }}>
            {agentName || "Agent"}
          </span>
        )}
        {isMine && (variant === "client-announce" || variant === "client") && (
          <span style={{ fontSize: 10, fontWeight: 600, color: KAKAO_MSG.meta, paddingRight: 4 }}>
            {variant === "client-announce" ? "전사 공지" : "나"}
          </span>
        )}
        <div
          style={{
            ...bubbleBase,
            background: isMine ? KAKAO_MSG.bubbleMine : KAKAO_MSG.bubbleOther,
            color: isMine ? KAKAO_MSG.bubbleMineText : KAKAO_MSG.bubbleOtherText,
            borderTopRightRadius: isMine ? 4 : KAKAO_MSG.radiusBubble,
            borderTopLeftRadius: isMine ? KAKAO_MSG.radiusBubble : 4,
            borderBottomRightRadius: isMine ? KAKAO_MSG.radiusBubble : 4,
            borderBottomLeftRadius: isMine ? 4 : KAKAO_MSG.radiusBubble,
          }}
        >
          <MessageContent content={msg.content} />
        </div>
        <span style={{ fontSize: 10, color: KAKAO_MSG.meta, paddingLeft: isMine ? 0 : 4, paddingRight: isMine ? 4 : 0 }}>
          {time}
        </span>
      </div>
    </div>
  );
}
