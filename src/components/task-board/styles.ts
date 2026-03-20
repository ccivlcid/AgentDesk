import type { CSSProperties } from "react";

export const MONO_STYLE: CSSProperties = { fontFamily: "var(--th-font-mono)" };

export const BTN_BASE_STYLE: CSSProperties = {
  ...MONO_STYLE,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  padding: "3px 9px",
  border: "1px solid var(--th-border)",
  background: "transparent",
  color: "var(--th-text-muted)",
  cursor: "pointer",
};
