import type { Agent, Message } from "../../../types";

export function fmtTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}

export function getAgentDisplayName(
  msg: Message,
  agents: Agent[],
  getAgentName: (a: Agent | null | undefined) => string,
): string {
  const agent = agents.find((a) => a.id === msg.sender_id);
  if (agent) return getAgentName(agent);
  return typeof msg.sender_name === "string" && msg.sender_name.trim()
    ? msg.sender_name.trim()
    : msg.sender_id || "Unknown";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
