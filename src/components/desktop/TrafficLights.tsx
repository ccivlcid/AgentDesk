import { useState, useRef } from "react";

export type TileZone = "left" | "right" | "full" | "tl" | "tr" | "bl" | "br" | "center";

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onSnapTo?: (zone: TileZone) => void;
}

const DOTS = [
  { key: "close",    color: "#ff5f57", shadow: "#c0392b", icon: "✕" },
  { key: "minimize", color: "#febc2e", shadow: "#d4a017", icon: "−" },
  { key: "maximize", color: "#28c840", shadow: "#1e9e30", icon: "⤢" },
] as const;

const TILE_OPTIONS: Array<{ zone: TileZone; label: string }> = [
  { zone: "left",   label: "← Left Half" },
  { zone: "right",  label: "Right Half →" },
  { zone: "full",   label: "⤢  Full Screen" },
  { zone: "center", label: "◎ Center" },
  { zone: "tl",     label: "↖ Top Left" },
  { zone: "tr",     label: "↗ Top Right" },
  { zone: "bl",     label: "↙ Bottom Left" },
  { zone: "br",     label: "↘ Bottom Right" },
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

      {/* MX-09: Tile menu popup */}
      {tileMenuOpen && onSnapTo && (
        <div
          onMouseEnter={keepTileOpen}
          onMouseLeave={closeTileMenu}
          style={{
            position: "absolute",
            top: 20,
            left: 0,
            background: "var(--th-panel-bg)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--th-border)",
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 160,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 9000,
          }}
        >
          <div style={{
            padding: "4px 12px 4px",
            fontSize: 9,
            color: "var(--th-text-muted)",
            fontFamily: "var(--th-font-mono)",
            letterSpacing: "0.08em",
            borderBottom: "1px solid var(--th-border)",
            marginBottom: 2,
          }}>
            MOVE & RESIZE
          </div>
          {TILE_OPTIONS.map(({ zone, label }) => (
            <button
              key={zone}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { onSnapTo(zone); setTileMenuOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                padding: "5px 12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--th-font-mono)",
                fontSize: 11,
                color: "var(--th-text-primary)",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
