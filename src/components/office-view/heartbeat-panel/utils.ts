export function fmtAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function statusSymbol(status: string): { sym: string; color: string; svgPath: string } {
  if (status === "ok") return { sym: "", color: "#4ade80", svgPath: "M20 6L9 17L4 12" };
  if (status === "alert") return { sym: "!", color: "#f59e0b", svgPath: "M12 9v4M12 17h.01" };
  return { sym: "", color: "#f87171", svgPath: "M18 6L6 18M6 6l12 12" };
}
