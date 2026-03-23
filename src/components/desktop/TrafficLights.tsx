import { useState, useRef } from "react";

export type TileZone = "left" | "right" | "full" | "tl" | "tr" | "bl" | "br" | "center";

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onSnapTo?: (zone: TileZone) => void;
}

const DOTS = [
  { key: "close",    color: "#FF5F56", shadow: "#E0443E", icon: "✕" },
  { key: "minimize", color: "#FFBD2E", shadow: "#DEA123", icon: "−" },
  { key: "maximize", color: "#27C93F", shadow: "#1AAB29", icon: "＋" },
] as const;

const TILE_OPTIONS: Array<{ zone: TileZone; label: string; icon: string }> = [
  { zone: "left",   label: "Left Half", icon: "⇠" },
  { zone: "right",  label: "Right Half", icon: "⇢" },
  { zone: "full",   label: "Full Screen", icon: "⤢" },
  { zone: "center", label: "Center", icon: "◎" },
  { zone: "tl",     label: "Top Left", icon: "↖" },
  { zone: "tr",     label: "Top Right", icon: "↗" },
  { zone: "bl",     label: "Bottom Left", icon: "↙" },
  { zone: "br",     label: "Bottom Right", icon: "↘" },
];

export default function TrafficLights({ onClose, onMinimize, onMaximize, onSnapTo }: TrafficLightsProps) {
  const [groupHover, setGroupHover] = useState(false);
  const [tileMenuOpen, setTileMenuOpen] = useState(false);
  const tileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlers = {
    close:    onClose,
    minimize: onMinimize,
    maximize: onMaximize,
  };

  function openTileMenu() {
    if (tileTimer.current) clearTimeout(tileTimer.current);
    setTileMenuOpen(true);
  }

  function closeTileMenu() {
    tileTimer.current = setTimeout(() => setTileMenuOpen(false), 150);
  }

  function keepTileOpen() {
    if (tileTimer.current) clearTimeout(tileTimer.current);
  }

  return (
    <div
      style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, position: "relative" }}
      onMouseEnter={() => setGroupHover(true)}
      onMouseLeave={() => { setGroupHover(false); closeTileMenu(); }}
    >
      {DOTS.map(({ key, color, shadow, icon }) => {
        const active = !!handlers[key];
        const isMax = key === "maximize";
        return (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={active ? handlers[key] : undefined}
            onMouseEnter={isMax && onSnapTo ? openTileMenu : undefined}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: active ? color : "#E5E7EB",
              border: `0.5px solid rgba(0, 0, 0, 0.1)`,
              cursor: active ? "pointer" : "default",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.1s",
              opacity: active ? 1 : 0.3,
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
                  fontSize: key === "maximize" ? 7 : 9,
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.65)", // Slightly darker icons for better contrast
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

      {/* MX-09: Tile menu popup */}
      {tileMenuOpen && onSnapTo && (
        <div
          onMouseEnter={keepTileOpen}
          onMouseLeave={closeTileMenu}
          style={{
            position: "absolute",
            top: 20,
            left: 0,
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 12,
            padding: "6px",
            minWidth: 180,
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
            zIndex: 9000,
          }}
        >
          <div style={{
            padding: "6px 12px",
            fontSize: 9,
            fontWeight: 900,
            color: "#94A3B8",
            fontFamily: "var(--th-font-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
            marginBottom: 4,
          }}>
            Move & Resize
          </div>
          {TILE_OPTIONS.map(({ zone, label, icon }) => (
            <button
              key={zone}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { onSnapTo(zone); setTileMenuOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "6px 12px",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: "#4B5563",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { 
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)"; 
                e.currentTarget.style.color = "#2563EB";
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.background = "transparent"; 
                e.currentTarget.style.color = "#4B5563";
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.7 }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
