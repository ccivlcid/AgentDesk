export function fmtDate(ts: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

export function fmtRelative(ts: number | null): string {
  if (!ts) return "-";
  const diff = ts - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60_000) return "< 1m";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

export function getNextRunUrgency(ts: number | null): "imminent" | "soon" | "normal" | "disabled" {
  if (!ts) return "disabled";
  const diff = ts - Date.now();
  if (diff < 0) return "imminent";
  if (diff < 3_600_000) return "imminent";
  if (diff < 86_400_000) return "soon";
  return "normal";
}
