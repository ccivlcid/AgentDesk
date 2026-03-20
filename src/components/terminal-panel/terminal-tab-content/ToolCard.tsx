import { useState, type ReactNode } from "react";
import { mono } from "./theme";
import type { ToolTheme } from "./theme";

export function LineBadge({ count, color }: { count: number; color: string }) {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 9,
        padding: "1px 6px",
        borderRadius: 10,
        background: `${color}14`,
        border: `1px solid ${color}28`,
        color,
        letterSpacing: "0.04em",
      }}
    >
      {count} {count === 1 ? "line" : "lines"}
    </span>
  );
}

export function ToolCard({
  theme,
  headerRight,
  summary,
  children,
  defaultOpen = true,
  isResult = false,
  isLight = false,
}: {
  theme: ToolTheme;
  headerRight?: ReactNode;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  isResult?: boolean;
  isLight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const cardBorder = isLight
    ? theme.border.replace(/[\d.]+\)$/, (m) => String(Math.min(1, parseFloat(m) * 2.5)) + ")")
    : theme.border;
  const cardBg = isLight
    ? theme.bg.replace(/[\d.]+\)$/, (m) => String(Math.min(1, parseFloat(m) * 3)) + ")")
    : theme.bg;

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${cardBorder}`,
        background: cardBg,
        overflow: "hidden",
        marginBottom: 2,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          width: "100%",
          padding: "0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 3,
            alignSelf: "stretch",
            background: isResult ? "#4ade80" : theme.accent,
            borderRadius: "8px 0 0 8px",
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 10px 7px 10px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: 9,
              color: theme.accent,
              opacity: 0.7,
              flexShrink: 0,
              transition: "transform 0.15s",
              display: "inline-block",
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: isResult ? "#4ade80" : theme.accent,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.8 }}>{isResult ? "✓" : theme.icon}</span>
            {isResult ? "result" : theme.label}
          </span>
          {summary && !open && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 10,
                color: "var(--th-text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                opacity: 0.65,
              }}
            >
              {summary}
            </span>
          )}
          {headerRight && (
            <span style={{ marginLeft: "auto", flexShrink: 0 }}>
              {headerRight}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div
          style={{
            borderTop: `1px solid ${theme.border}`,
            padding: "8px 12px 9px 15px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
