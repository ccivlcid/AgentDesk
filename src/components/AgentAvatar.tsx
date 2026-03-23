import type { CSSProperties } from "react";
import type { Agent } from "../types";
import { IconRobot } from "./ui/SvgIcons";

interface AgentAvatarProps {
  agent: Agent | undefined;
  agents?: Agent[];
  spriteMap?: Map<string, number>;
  size?: number;
  className?: string;
  rounded?: "sm" | "full" | "lg" | "xl" | "2xl";
  imageFit?: "cover" | "contain";
  imagePosition?: CSSProperties["objectPosition"];
}

const ROUNDED: Record<NonNullable<AgentAvatarProps["rounded"]>, string> = {
  sm: "rounded-sm",
  full: "rounded-full",
  lg: "rounded-[4px]",
  xl: "rounded-[8px]",
  "2xl": "rounded-[12px]",
};

/** Avatar — shows agent.avatar_url (uploaded image) if available, else avatar_emoji fallback */
export default function AgentAvatar({
  agent,
  size = 28,
  className = "",
  rounded = "full",
  imageFit = "cover",
  imagePosition = "center",
}: AgentAvatarProps) {
  const roundedClass = ROUNDED[rounded];
  const isWorking = agent?.status === "working";

  const pulseStyle: CSSProperties = isWorking ? {
    boxShadow: `0 0 0 0 var(--th-accent-glow, rgba(245, 158, 11, 0.4))`,
    animation: "agent-pulse 2s infinite",
  } : {};

  const content = agent?.avatar_url ? (
    <img
      src={agent.avatar_url}
      alt={agent.name}
      className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"} ${roundedClass}`}
      style={{ objectPosition: imagePosition }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <div
      className={`${roundedClass} w-full h-full flex items-center justify-center`}
      style={{ fontSize: size * 0.6 }}
    >
      {agent?.avatar_emoji?.trim() ? (
        <span>{agent.avatar_emoji.trim()}</span>
      ) : (
        <IconRobot size={Math.max(14, Math.round(size * 0.55))} style={{ color: "var(--th-text-muted)" }} />
      )}
    </div>
  );

  return (
    <div
      className={`${roundedClass} bg-[var(--th-bg-elevated)] flex-shrink-0 relative ${className}`}
      style={{ width: size, height: size, ...pulseStyle }}
    >
      <style>{`
        @keyframes agent-pulse {
          0% { box-shadow: 0 0 0 0 var(--th-accent-glow, rgba(245, 158, 11, 0.4)); }
          70% { box-shadow: 0 0 0 ${Math.max(4, size * 0.2)}px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
      `}</style>
      {content}
      
      {/* 상태 인디케이터 도트 */}
      {agent?.status && (
        <div 
          className="absolute bottom-0 right-0 w-[25%] h-[25%] rounded-full border border-[var(--th-bg-surface)]"
          style={{ 
            background: agent.status === "working" ? "var(--th-success)" : 
                        agent.status === "idle" ? "var(--th-accent)" : "var(--th-text-muted)",
            boxShadow: agent.status === "working" ? "0 0 4px var(--th-success)" : "none"
          }}
        />
      )}
    </div>
  );
}
