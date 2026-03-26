import type { Callout } from "./types";
import { MONO_FONT } from "./constants";

const COLORS = {
  tip: { bg: "rgba(48,209,88,0.08)", border: "rgba(48,209,88,0.3)", label: "TIP", text: "#30d158" },
  warn: { bg: "rgba(255,159,10,0.08)", border: "rgba(255,159,10,0.3)", label: "NOTE", text: "#ff9f0a" },
  info: { bg: "rgba(10,132,255,0.08)", border: "rgba(10,132,255,0.3)", label: "INFO", text: "#0a84ff" },
} as const;

function IconLightbulb() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CalloutIcon({ type }: { type: keyof typeof COLORS }) {
  if (type === "tip") return <IconLightbulb />;
  if (type === "warn") return <IconAlertTriangle />;
  return <IconInfo />;
}

export function CalloutBox({ type, text }: Callout) {
  const colors = COLORS[type];
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 12px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          display: "flex",
          alignItems: "center",
          color: colors.text,
        }}
      >
        <CalloutIcon type={type} />
      </span>
      <div>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: colors.text,
            marginRight: 6,
          }}
        >
          {colors.label}
        </span>
        <span
          style={{
            fontFamily: MONO_FONT,
            fontSize: 11,
            color: "#6B7280",
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
