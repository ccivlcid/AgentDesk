import type { CSSProperties } from "react";

export const CLI_SELECT_STYLE_COMPACT: CSSProperties = {
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  background: "#FFFFFF",
  color: "#111827",
  padding: "0.125rem 0.25rem",
  fontFamily: "var(--th-font-mono)",
};

export const CLI_SELECT_STYLE_WIDE: CSSProperties = {
  ...CLI_SELECT_STYLE_COMPACT,
  padding: "0.125rem 0.375rem",
};
