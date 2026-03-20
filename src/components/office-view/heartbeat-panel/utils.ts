export function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function statusSymbol(status: string): { sym: string; color: string } {
  if (status === "ok") return { sym: "✓", color: "#4ade80" };
  if (status === "alert") return { sym: "!", color: "#f59e0b" };
  return { sym: "✕", color: "#f87171" };
}
