import type { TaskExecutionState, TaskStatus } from "../../types";

const EXEC_PROGRESS: Record<string, number> = {
  queued: 5,
  claiming: 10,
  workspace_preparing: 15,
  ready: 20,
  retry_backoff: 25,
  blocked: 30,
  recovering: 30,
  stalled: 35,
  running: 40,
  awaiting_review: 80,
  succeeded: 100,
  failed: 0,
  cancelled: 0,
};

const STATUS_PROGRESS: Record<string, number> = {
  inbox: 0,
  planned: 0,
  pending: 10,
  collaborating: 20,
  in_progress: 40,
  review: 80,
  done: 100,
  failed: 0,
  cancelled: 0,
};

export function getTaskProgress(task: {
  execution_state?: TaskExecutionState | null;
  status: TaskStatus | string;
}): number {
  if (task.execution_state && EXEC_PROGRESS[task.execution_state] !== undefined)
    return EXEC_PROGRESS[task.execution_state];
  return STATUS_PROGRESS[task.status] ?? 0;
}
