import type { TaskStatus } from "../../../types";

export const STATUS_COLORS: Record<TaskStatus, string> = {
  inbox:         "#9CA3AF",
  planned:       "#3B82F6",
  collaborating: "#3B82F6",
  in_progress:   "var(--th-success, #22c55e)",
  review:        "#3B82F6",
  done:          "#9CA3AF",
  pending:       "#6B7280",
  failed:        "#DC2626",
  cancelled:     "#DC2626",
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
  idle:    "#9CA3AF",
  break:   "#3B82F6",
  offline: "#DC2626",
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
