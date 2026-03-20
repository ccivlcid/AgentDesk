import type { Callout } from "./types";
import { MONO_FONT } from "./constants";

const COLORS = {
  tip: { bg: "rgba(48,209,88,0.08)", border: "rgba(48,209,88,0.3)", icon: "💡", label: "TIP", text: "#30d158" },
  warn: { bg: "rgba(255,159,10,0.08)", border: "rgba(255,159,10,0.3)", icon: "⚠️", label: "NOTE", text: "#ff9f0a" },
  info: { bg: "rgba(10,132,255,0.08)", border: "rgba(10,132,255,0.3)", icon: "ℹ️", label: "INFO", text: "#0a84ff" },
} as const;

export function CalloutBox({ type, text }: Callout) {
  const colors = COLORS[type];
  return (
    <div style={{
      marginTop: 10,
      padding: "8px 12px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 7,
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{colors.icon}</span>
      <div>
        <span style={{ fontFamily: MONO_FONT, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: colors.text, marginRight: 6 }}>
          {colors.label}
        </span>
        <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: "var(--th-text-secondary)", lineHeight: 1.5 }}>
          {text}
        </span>
      </div>
    </div>
  );
}
