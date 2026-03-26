import { useState } from "react";
import { MONO_FONT } from "./constants";

interface ChapterBtnProps {
  color: string;
  icon: string;
  title: string;
  active: boolean;
  onClick: () => void;
}

export function ChapterBtn({ color, icon, title, active, onClick }: ChapterBtnProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "7px 12px",
        background: active ? `${color}14` : hovered ? "var(--th-bg-primary)" : "transparent",
        border: "none",
        borderRight: active ? `2px solid ${color}` : "2px solid transparent",
        color: active ? color : "var(--th-text-secondary)",
        fontFamily: MONO_FONT, fontSize: 11,
        cursor: "pointer", textAlign: "left",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0, opacity: active ? 1 : 0.65 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: active ? 600 : 400 }}>
        {title}
      </span>
    </button>
  );
}
