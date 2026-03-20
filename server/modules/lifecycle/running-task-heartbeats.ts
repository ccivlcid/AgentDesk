import fs from "node:fs";
import path from "path";
import { appendTaskExecutionMetaUpdate } from "../workflow/core/task-execution-meta.ts";

type HeartbeatDeps = {
  db: any;
  nowMs: () => number;
  logsDir: string;
  activeProcesses: Map<string, unknown>;
  taskExecutionSessions: Map<string, { lastTouchedAt: number }>;
};

export function updateRunningTaskHeartbeats({
  db,
  nowMs,
  logsDir,
  activeProcesses,
  taskExecutionSessions,
}: HeartbeatDeps): void {
  const now = nowMs();
  const trackedTaskIds = new Set<string>([
    ...(Array.from(activeProcesses.keys()) as string[]),
    ...(Array.from(taskExecutionSessions.keys()) as string[]),
  ]);

  for (const taskId of trackedTaskIds) {
    const task = db
      .prepare("SELECT id, status FROM tasks WHERE id = ?")
      .get(taskId) as { id: string; status: string } | undefined;
    if (!task || task.status !== "in_progress") continue;

    let lastOutputAt: number | null = null;
    try {
      const logPath = path.join(logsDir, `${taskId}.log`);
      const stat = fs.statSync(logPath);
      lastOutputAt = Math.floor(stat.mtimeMs || 0) || null;
    } catch {
      lastOutputAt = null;
    }

    const updates = ["updated_at = updated_at"];
    const params: unknown[] = [];
    appendTaskExecutionMetaUpdate(db as any, updates, params, {
      last_heartbeat_at: now,
      last_output_at: lastOutputAt ?? now,
    });
    params.push(taskId);
    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...(params as any[]));

    const session = taskExecutionSessions.get(taskId);
    if (session) {
      session.lastTouchedAt = now;
      taskExecutionSessions.set(taskId, session);
    }
  }
}
