import type { TaskStatus } from "../../../types";

export const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox:         "var(--th-text-muted)",
  planned:       "var(--th-accent)",
  collaborating: "var(--th-accent)",
  in_progress:   "var(--th-success, #22c55e)",
  review:        "var(--th-accent)",
  done:          "var(--th-text-muted)",
  pending:       "var(--th-text-secondary)",
  failed:        "var(--th-danger-text)",
  cancelled:     "var(--th-danger-text)",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox:         "Inbox",
  planned:       "Planned",
  collaborating: "Collab",
  in_progress:   "Running",
  review:        "Review",
  done:          "Done",
  pending:       "Pending",
  failed:        "Failed",
  cancelled:     "Cancelled",
};

export const AGENT_STATUS_COLOR: Record<string, string> = {
  working: "var(--th-success, #22c55e)",
  idle:    "var(--th-text-muted)",
  break:   "var(--th-accent)",
  offline: "var(--th-danger-text)",
};

export const FILE_ICONS: Record<string, string> = {
  ts: "📄", tsx: "⚛", js: "📄", jsx: "⚛", mjs: "📄",
  json: "📋", yaml: "📋", yml: "📋", toml: "📋",
  md: "📝", mdx: "📝", txt: "📝",
  sh: "⚡", bash: "⚡", zsh: "⚡", fish: "⚡",
  py: "🐍", rb: "💎", go: "🐹", rs: "🦀",
  html: "🌐", css: "🎨", scss: "🎨", sass: "🎨",
  svg: "🖼", png: "🖼", jpg: "🖼", gif: "🖼", webp: "🖼",
  sql: "🗄", prisma: "🗄",
  env: "🔑", lock: "🔒",
};

export const RUNNABLE_EXTENSIONS = new Set(["sh", "bash", "zsh", "fish", "py", "js", "ts", "mjs"]);
export const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
