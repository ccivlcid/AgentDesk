import { useState } from "react";

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

const DOTS = [
  { key: "close",    color: "#ff5f57", shadow: "#c0392b", icon: "✕" },
  { key: "minimize", color: "#febc2e", shadow: "#d4a017", icon: "−" },
  { key: "maximize", color: "#28c840", shadow: "#1e9e30", icon: "⤢" },
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
      style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}
      onMouseEnter={() => setGroupHover(true)}
      onMouseLeave={() => setGroupHover(false)}
    >
      {DOTS.map(({ key, color, shadow, icon }) => {
        const active = !!handlers[key];
        return (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={active ? handlers[key] : undefined}
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: active
                ? `radial-gradient(circle at 38% 35%, ${color}ff 0%, ${color}dd 55%, ${shadow}bb 100%)`
                : "rgba(128,128,128,0.25)",
              border: active
                ? `0.5px solid ${shadow}88`
                : "0.5px solid rgba(0,0,0,0.18)",
              cursor: active ? "pointer" : "default",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "opacity 0.1s, transform 0.1s",
              opacity: active ? 1 : 0.3,
              position: "relative",
              boxShadow: active
                ? `0 1px 3px ${shadow}66, inset 0 1px 0 rgba(255,255,255,0.35)`
                : "none",
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
                  fontSize: key === "maximize" ? 8 : 9,
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.55)",
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
