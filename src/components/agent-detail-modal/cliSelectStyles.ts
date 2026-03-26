import type { CSSProperties } from "react";

export const CLI_SELECT_STYLE_COMPACT: CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--th-border)",
  background: "var(--th-bg-elevated)",
  color: "var(--th-text-primary)",
  padding: "0.125rem 0.25rem",
  fontFamily: "var(--th-font-mono)",
};

export const CLI_SELECT_STYLE_WIDE: CSSProperties = {
  ...CLI_SELECT_STYLE_COMPACT,
  padding: "0.125rem 0.375rem",
};
