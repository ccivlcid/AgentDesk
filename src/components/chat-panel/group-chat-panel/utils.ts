import type { ChatMode, Priority } from "./types";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "gif", "webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["docx", "doc"].includes(ext)) return "📃";
  if (["xlsx", "xls", "csv"].includes(ext)) return "📊";
  if (ext === "zip") return "📦";
  if (ext === "json") return "🔧";
  if (["md", "txt"].includes(ext)) return "📝";
  return "📎";
}

/** 포맷: [TASK:<deadline>:<priority>]\n 또는 [URGENT]\n */
export function parseModePrefix(content: string): {
  mode: ChatMode;
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
