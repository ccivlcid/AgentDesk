import type { ProjectObjective, ProjectGate } from "../../../types";

export const OBJ_STATUS_META: Record<ProjectObjective["status"], { label_ko: string; label_en: string; color: string; bg: string }> = {
  active:    { label_ko: "진행중", label_en: "Active",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  completed: { label_ko: "완료",   label_en: "Completed", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  cancelled: { label_ko: "취소",   label_en: "Cancelled", color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
};

export const GATE_STATUS_META: Record<ProjectGate["status"], { label_ko: string; label_en: string; color: string; bg: string }> = {
  pending:     { label_ko: "대기",   label_en: "Pending",     color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
  in_progress: { label_ko: "진행중", label_en: "In Progress", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  passed:      { label_ko: "통과",   label_en: "Passed",      color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
  failed:      { label_ko: "실패",   label_en: "Failed",      color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

export const STATUS_DONE = new Set(["done", "completed", "complete"]);
export const STATUS_IN_PROGRESS = new Set(["in_progress", "running", "working"]);
export const STATUS_REVIEW = new Set(["review", "reviewing"]);
export const STATUS_FAILED = new Set(["failed", "error", "cancelled"]);
export const STATUS_PAUSED = new Set(["paused"]);

export const TYPE_COLOR: Record<string, string> = {
  document: "#60a5fa",
  spec:     "#a78bfa",
  report:   "#34d399",
  code:     "#f59e0b",
};
