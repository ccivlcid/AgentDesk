import type { Persona } from "../../types";

interface PersonaBadgeProps {
  persona: Pick<Persona, "style_keywords" | "accent_color" | "name">;
  size?: "sm" | "md";
}

export default function PersonaBadge({ persona, size = "sm" }: PersonaBadgeProps) {
  const label = persona.style_keywords.slice(0, 2).join(" · ");
  const px = size === "sm" ? "px-1.5 py-px" : "px-2 py-0.5";
  const fontSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center font-medium ${px} ${fontSize} rounded leading-none`}
      style={{
        backgroundColor: `${persona.accent_color}18`,
        color: persona.accent_color,
        border: `1px solid ${persona.accent_color}40`,
      }}
      title={`${persona.name} 방식`}
    >
      {label}
    </span>
  );
}
