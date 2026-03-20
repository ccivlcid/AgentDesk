import type { CSSProperties } from "react";
import type { TaskExecutionState } from "./types";

export const STATUS_LEFT_BORDER: Partial<Record<string, string>> = {
  in_progress: "var(--th-status-success)",
  review: "var(--th-status-purple)",
  planned: "var(--th-status-warning)",
  inbox: "var(--th-status-cyan)",
  collaborating: "var(--th-status-info)",
  done: "var(--th-border-strong)",
  pending: "var(--th-status-error)",
  cancelled: "var(--th-status-muted)",
};

export const EXECUTION_STATE_BADGES: Partial<Record<TaskExecutionState, { label: string; style: CSSProperties }>> = {
  queued: { label: "Q", style: { background: "rgba(6,182,212,0.08)", color: "var(--th-status-cyan)", border: "1px solid rgba(6,182,212,0.18)" } },
  running: { label: "RUN", style: { background: "rgba(34,197,94,0.08)", color: "var(--th-status-success)", border: "1px solid rgba(34,197,94,0.18)" } },
  awaiting_review: { label: "REV", style: { background: "rgba(167,139,250,0.08)", color: "var(--th-status-purple)", border: "1px solid rgba(167,139,250,0.18)" } },
  blocked: { label: "HOLD", style: { background: "rgba(251,191,36,0.08)", color: "var(--th-status-warning)", border: "1px solid rgba(251,191,36,0.18)" } },
  stalled: { label: "STALL", style: { background: "rgba(244,63,94,0.1)", color: "var(--th-status-error)", border: "1px solid rgba(244,63,94,0.2)" } },
  succeeded: { label: "OK", style: { background: "rgba(34,197,94,0.08)", color: "var(--th-status-success)", border: "1px solid rgba(34,197,94,0.18)" } },
  failed: { label: "ERR", style: { background: "rgba(244,63,94,0.1)", color: "var(--th-status-error)", border: "1px solid rgba(244,63,94,0.2)" } },
  cancelled: { label: "STOP", style: { background: "rgba(110,118,129,0.14)", color: "var(--th-status-muted)", border: "1px solid rgba(110,118,129,0.2)" } },
};

export const SUBTASK_STATUS_COLOR: Record<string, string> = {
  done: "rgb(52,211,153)",
  in_progress: "var(--th-accent, #f59e0b)",
  blocked: "rgb(253,164,175)",
  pending: "var(--th-text-muted)",
};
