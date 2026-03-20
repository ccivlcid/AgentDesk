import type { Priority } from "./types";

export const MAX_CONTENT = 2000;
export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_TYPES =
  ".pdf,.pptx,.docx,.xlsx,.png,.jpg,.gif,.md,.txt,.csv,.json,.zip";

export const AGENT_STATUS_DOT: Record<string, string> = {
  working: "var(--th-success, #22c55e)",
  idle: "var(--th-text-muted)",
  break: "var(--th-accent, #f59e0b)",
  offline: "var(--th-danger, #ef4444)",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  high: "var(--th-danger)",
  normal: "var(--th-accent)",
  low: "var(--th-success)",
};

export const PRIORITY_LABEL: Record<
  Priority,
  { ko: string; en: string; ja: string; zh: string }
> = {
  high: { ko: "높음", en: "High", ja: "高", zh: "高" },
  normal: { ko: "보통", en: "Normal", ja: "普通", zh: "普通" },
  low: { ko: "낮음", en: "Low", ja: "低", zh: "低" },
};
