import { useState } from "react";

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

const DOTS = [
  { key: "close",    color: "#ff5f57", hover: "#ff5f57", icon: "✕" },
  { key: "minimize", color: "#febc2e", hover: "#febc2e", icon: "−" },
  { key: "maximize", color: "#28c840", hover: "#28c840", icon: "⤢" },
] as const;

export default function TrafficLights({ onClose, onMinimize, onMaximize }: TrafficLightsProps) {
  const [groupHover, setGroupHover] = useState(false);

  const handlers = {
    close:    onClose,
    minimize: onMinimize,
    maximize: onMaximize,
  };

  return (
    <div
      style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}
      onMouseEnter={() => setGroupHover(true)}
      onMouseLeave={() => setGroupHover(false)}
    >
      {DOTS.map(({ key, color, icon }) => {
        const active = !!handlers[key];
        return (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={active ? handlers[key] : undefined}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: active ? color : "var(--th-border-strong, rgba(128,128,128,0.3))",
              border: "none",
              cursor: active ? "pointer" : "default",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "opacity 0.1s",
              opacity: active ? 1 : 0.35,
              position: "relative",
            }}
          >
            {groupHover && active && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: key === "maximize" ? 9 : 10,
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.6)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                {icon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
