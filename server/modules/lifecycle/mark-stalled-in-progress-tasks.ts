import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../workflow/core/task-execution-meta.ts";
import { TASK_STALLED_THRESHOLD_MS } from "../../db/runtime.ts";

type MarkStalledDeps = {
  db: any;
  nowMs: () => number;
  broadcast: (event: string, payload?: unknown) => void;
  activeProcesses: Map<string, unknown>;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
};

export function markStalledInProgressTasks(deps: MarkStalledDeps): void {
  const { db, nowMs, broadcast, activeProcesses, appendTaskLog } = deps;
  const now = nowMs();
  const rows = db
    .prepare(
      `SELECT id, title, last_heartbeat_at, updated_at
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'running'`,
    )
    .all() as Array<{
      id: string;
      title: string;
      last_heartbeat_at: number | null;
      updated_at: number | null;
    }>;

  for (const row of rows) {
    if (activeProcesses.has(row.id)) continue;
    const lastSignalAt = Math.max(row.last_heartbeat_at ?? 0, row.updated_at ?? 0);
    if (lastSignalAt <= 0 || now - lastSignalAt < TASK_STALLED_THRESHOLD_MS) continue;

    const updates = ["updated_at = ?"];
    const params: unknown[] = [now];
    appendTaskExecutionMetaUpdate(db as any, updates, params, {
      execution_state: "stalled",
      execution_error_code: "heartbeat_stalled",
      execution_error_summary: "Task heartbeat timed out while status remained in_progress",
    });
    params.push(row.id);
    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`).run(...(params as any[]));
    appendTaskLog(row.id, "system", "Execution marked stalled (heartbeat timeout)");
    recordTaskExecutionEvent(db as any, {
      taskId: row.id,
      eventType: "run_stalled",
      fromState: "running",
      toState: "stalled",
      summary: "Execution marked stalled after heartbeat timeout",
      metadata: { stalled_threshold_ms: TASK_STALLED_THRESHOLD_MS },
      createdAt: now,
    });
    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
    broadcast("task_update", updatedTask);
  }
}
