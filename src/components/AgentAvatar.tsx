import type { CSSProperties } from "react";
import type { Agent } from "../types";

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

  if (agent?.avatar_url) {
    return (
      <div
        className={`${roundedClass} overflow-hidden bg-[var(--th-bg-elevated)] flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={agent.avatar_url}
          alt={agent.name}
          className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
          style={{ objectPosition: imagePosition }}
          onError={(e) => {
            // If image fails to load, hide it to show parent background
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${roundedClass} bg-[var(--th-bg-elevated)] flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.6 }}
    >
      {agent?.avatar_emoji ?? "🤖"}
    </div>
  );
}
