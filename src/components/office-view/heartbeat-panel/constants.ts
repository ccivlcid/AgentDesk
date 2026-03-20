import type { HeartbeatCheckItem } from "../../../api/heartbeat";

export const ALL_CHECKS: HeartbeatCheckItem[] = [
  "stale_tasks",
  "blocked_tasks",
  "consecutive_failures",
  "pending_decisions",
];

export const CHECK_LABELS: Record<HeartbeatCheckItem, { ko: string; en: string }> = {
  stale_tasks: { ko: "정체 태스크", en: "Stale Tasks" },
  blocked_tasks: { ko: "차단 태스크", en: "Blocked Tasks" },
  consecutive_failures: { ko: "연속 실패", en: "Failures" },
  pending_decisions: { ko: "대기 결정", en: "Pending" },
};
