import { STATUS_DONE, STATUS_IN_PROGRESS, STATUS_REVIEW, STATUS_FAILED, STATUS_PAUSED } from "./constants";

export function fmtDueDate(ts: number | null): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat(undefined, { month: "2-digit", day: "2-digit" }).format(new Date(ts));
}

export function fmtUsd(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export type ClassifiedStatus = "done" | "in_progress" | "review" | "failed" | "paused" | "planned";

export function classifyStatus(status: string): ClassifiedStatus {
  const s = status.toLowerCase();
  if (STATUS_DONE.has(s)) return "done";
  if (STATUS_IN_PROGRESS.has(s)) return "in_progress";
  if (STATUS_REVIEW.has(s)) return "review";
  if (STATUS_FAILED.has(s)) return "failed";
  if (STATUS_PAUSED.has(s)) return "paused";
  return "planned";
}
