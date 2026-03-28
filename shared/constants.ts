/**
 * shared/constants.ts — Shared label maps for task statuses and agent roles
 */

export const STATUS_LABELS: Record<string, string> = {
  done: "Done",
  in_progress: "In Progress",
  planned: "Planned",
  review: "Review",
  paused: "Paused",
  failed: "Failed",
  blocked: "Blocked",
};

export const ROLE_LABELS: Record<string, string> = {
  team_leader: "PM",
  senior: "Senior",
  junior: "Junior",
};
