import type { Agent, Message } from "../../../types";
import MessageContent from "../../MessageContent";
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

  type VariantStyle = {
    accentBar: string;
    bg: string;
    badge: string;
    badgeBg: string;
    badgeColor: string;
    label: string;
    contentColor: string;
  };

  const VARIANTS: Record<LineVariant, VariantStyle> = {
    directive: {
      accentBar: "var(--th-danger, #ef4444)",
      bg: "var(--th-red-glow)",
      badge: "DIRECTIVE",
      badgeBg: "var(--th-red-glow)",
      badgeColor: "var(--th-danger-text)",
      label: "DIRECTIVE",
      contentColor: "var(--th-text-primary)",
    },
    "client-announce": {
      accentBar: "var(--th-accent)",
      bg: "var(--th-accent-glow)",
      badge: "ANNOUNCE",
      badgeBg: "var(--th-amber-glow)",
      badgeColor: "var(--th-accent)",
      label: "공지",
      contentColor: "var(--th-text-primary)",
    },
    client: {
      accentBar: "var(--th-accent)",
      bg: "transparent",
      badge: "Client",
      badgeBg: "var(--th-accent-glow)",
      badgeColor: "var(--th-accent)",
      label: "Client",
      contentColor: "var(--th-text-primary)",
    },
    agent: {
      accentBar: "var(--th-success, #22c55e)",
      bg: "var(--th-green-glow)",
      badge: "▸",
      badgeBg: "var(--th-green-glow)",
      badgeColor: "var(--th-success, #4ade80)",
      label: agentName,
      contentColor: "var(--th-text-primary)",
    },
    system: {
      accentBar: "var(--th-border)",
      bg: "transparent",
      badge: "//",
      badgeBg: "transparent",
      badgeColor: "var(--th-text-muted)",
      label: "SYSTEM",
      contentColor: "var(--th-text-secondary)",
    },
  };

  const v = VARIANTS[variant];

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        background: v.bg,
        borderBottom: "1px solid var(--th-border)",
      }}
    >
      <div style={{ width: 3, flexShrink: 0, background: v.accentBar, opacity: 0.8 }} />

      <div style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--th-font-mono)", fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              background: v.badgeBg,
              color: v.badgeColor,
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {variant === "agent" ? agentName || v.badge : v.badge === "ANNOUNCE" ? "공지" : v.label}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{time}</span>
        </div>

        <div
          style={{
            color: v.contentColor,
            lineHeight: 1.6,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
        >
          <MessageContent content={msg.content} />
        </div>
      </div>
    </div>
  );
}
