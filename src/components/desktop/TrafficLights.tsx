import { useState, useRef } from "react";

export type TileZone = "left" | "right" | "full" | "tl" | "tr" | "bl" | "br" | "center";

interface TrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onSnapTo?: (zone: TileZone) => void;
}

function SvgClose({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SvgMinus({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SvgPlus({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SvgSnapLeft({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
      <line x1="9" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function SvgSnapRight({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
      <line x1="3" y1="12" x2="15" y2="12" />
    </svg>
  );
}

function SvgSnapFull({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function SvgSnapCenter({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SvgCornerNW({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="19 19 5 5" />
      <polyline points="5 5 5 11 11 5" />
    </svg>
  );
}

function SvgCornerNE({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="5 19 19 5" />
      <polyline points="19 5 13 5 19 11" />
    </svg>
  );
}

function SvgCornerSW({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="19 5 5 19" />
      <polyline points="5 19 5 13 11 19" />
    </svg>
  );
}

function SvgCornerSE({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="5 5 19 19" />
      <polyline points="19 19 19 13 13 19" />
    </svg>
  );
}

const DOTS = [
  { key: "close" as const, color: "#FF5F56", shadow: "#E0443E", Icon: SvgClose, dotSize: 9 },
  { key: "minimize" as const, color: "#FFBD2E", shadow: "#DEA123", Icon: SvgMinus, dotSize: 9 },
  { key: "maximize" as const, color: "#27C93F", shadow: "#1AAB29", Icon: SvgPlus, dotSize: 7 },
] as const;

const TILE_OPTIONS: Array<{ zone: TileZone; label: string; Icon: typeof SvgSnapLeft }> = [
  { zone: "left", label: "Left Half", Icon: SvgSnapLeft },
  { zone: "right", label: "Right Half", Icon: SvgSnapRight },
  { zone: "full", label: "Full Screen", Icon: SvgSnapFull },
  { zone: "center", label: "Center", Icon: SvgSnapCenter },
  { zone: "tl", label: "Top Left", Icon: SvgCornerNW },
  { zone: "tr", label: "Top Right", Icon: SvgCornerNE },
  { zone: "bl", label: "Bottom Left", Icon: SvgCornerSW },
  { zone: "br", label: "Bottom Right", Icon: SvgCornerSE },
];

export default function TrafficLights({ onClose, onMinimize, onMaximize, onSnapTo }: TrafficLightsProps) {
  const [groupHover, setGroupHover] = useState(false);
  const [tileMenuOpen, setTileMenuOpen] = useState(false);
  const tileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlers = {
    close: onClose,
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
      onMouseLeave={() => {
        setGroupHover(false);
        closeTileMenu();
      }}
    >
      {DOTS.map(({ key, color, shadow, Icon, dotSize }) => {
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
              background: active ? color : "var(--th-border)",
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
                  color: "rgba(0,0,0,0.65)",
                  lineHeight: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <Icon size={dotSize} />
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
            backdropFilter: "var(--th-glass-blur)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            borderRadius: 12,
            padding: "6px",
            minWidth: 180,
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
            zIndex: 9000,
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 9,
              fontWeight: 900,
              color: "#94A3B8",
              fontFamily: "var(--th-font-mono)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
              marginBottom: 4,
            }}
          >
            Move & Resize
          </div>
          {TILE_OPTIONS.map(({ zone, label, Icon }) => (
            <button
              key={zone}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                onSnapTo(zone);
                setTileMenuOpen(false);
              }}
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
              <span style={{ display: "flex", opacity: 0.7, color: "inherit" }}>
                <Icon size={14} />
              </span>
              <span style={{ flex: 1 }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
