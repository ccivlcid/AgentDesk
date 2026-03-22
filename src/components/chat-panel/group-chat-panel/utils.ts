import type { ParsedMessageMode, Priority } from "./types";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** 포맷: [TASK:<deadline>:<priority>]\n 또는 [URGENT]\n (레거시) */
export function parseModePrefix(content: string): {
  mode: ParsedMessageMode;
  deadline?: string;
  priority?: Priority;
  body: string;
} {
  const taskMatch = content.match(/^\[TASK:([^:]*):([^\]]*)\]\n?([\s\S]*)$/);
  if (taskMatch) {
    return {
      mode: "task",
      deadline: taskMatch[1] || undefined,
      priority: (taskMatch[2] as Priority) || "normal",
      body: taskMatch[3] ?? "",
    };
  }
  if (content.startsWith("[URGENT]\n") || content === "[URGENT]") {
    return { mode: "urgent", body: content.replace(/^\[URGENT\]\n?/, "") };
  }
  return { mode: "chat", body: content };
}
