import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../workflow/core/task-execution-meta.ts";
import { notifyTaskStatus } from "../../gateway/client.ts";
import { TASK_STALLED_RECOVERY_THRESHOLD_MS } from "../../db/runtime.ts";

type RecoverStalledDeps = {
  db: any;
  nowMs: () => number;
  broadcast: (event: string, payload?: unknown) => void;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  stopProgressTimer: (taskId: string) => void;
  clearTaskWorkflowState: (taskId: string) => void;
  endTaskExecutionSession: (taskId: string, reason: string) => void;
  resolveLang: (title: string) => string;
  notifyClient: (message: string, taskId: string) => void;
};

export function recoverStalledTasks(deps: RecoverStalledDeps): void {
  const {
    db,
    nowMs,
    broadcast,
    appendTaskLog,
    stopProgressTimer,
    clearTaskWorkflowState,
    endTaskExecutionSession,
    resolveLang,
    notifyClient,
  } = deps;
  const now = nowMs();
  const rows = db
    .prepare(
      `SELECT id, title, assigned_agent_id, updated_at
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'stalled'`,
    )
    .all() as Array<{
      id: string;
      title: string;
      assigned_agent_id: string | null;
      updated_at: number | null;
    }>;

  const candidates = rows.filter((row) => {
    const stalledSince = row.updated_at ?? 0;
    return stalledSince > 0 && now - stalledSince >= TASK_STALLED_RECOVERY_THRESHOLD_MS;
  });
  if (candidates.length === 0) return;

  const t = nowMs();

  const recovered: typeof candidates = [];
  const batchRecover = db.transaction(() => {
    for (const row of candidates) {
      const updates = ["status = 'inbox'", "updated_at = ?"];
      const params: unknown[] = [t];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        execution_state: "failed",
        retry_after: null,
        execution_error_code: "stalled_auto_recovered",
        execution_error_summary: "Task auto-recovered from stalled state after timeout",
      });
      params.push(row.id);
      const move = db
        .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`)
        .run(...(params as any[])) as { changes?: number };
      if ((move.changes ?? 0) === 0) continue;

      recordTaskExecutionEvent(db as any, {
        taskId: row.id,
        eventType: "stalled_recovered",
        fromState: "stalled",
        toState: "failed",
        summary: "Auto-recovered stalled task to inbox",
        metadata: { stalled_recovery_threshold_ms: TASK_STALLED_RECOVERY_THRESHOLD_MS },
        createdAt: t,
      });

      if (row.assigned_agent_id) {
        db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ? AND current_task_id = ?").run(
          row.assigned_agent_id,
          row.id,
        );
      }

      recovered.push(row);
    }
  });
  batchRecover();

  for (const row of recovered) {
    stopProgressTimer(row.id);
    clearTaskWorkflowState(row.id);
    endTaskExecutionSession(row.id, "stalled_auto_recovery");
    appendTaskLog(row.id, "system", "Auto-recovered from stalled state → inbox (no heartbeat)");

    if (row.assigned_agent_id) {
      const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(row.assigned_agent_id);
      broadcast("agent_status", updatedAgent);
    }

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
    broadcast("task_update", updatedTask);
    const lang = resolveLang(row.title);
    notifyTaskStatus(row.id, row.title, "inbox", lang);
    const msg =
      lang === "en"
        ? `[WATCHDOG] '${row.title}' stalled and was auto-recovered to inbox.`
        : lang === "ja"
          ? `[WATCHDOG] '${row.title}' がストール状態のため inbox に自動復旧しました。`
          : lang === "zh"
            ? `[WATCHDOG] '${row.title}' 停滞，已自动恢复到 inbox。`
            : `[WATCHDOG] '${row.title}' 작업이 정체(stalled) 상태로 자동 복구되어 inbox로 이동했습니다.`;
    notifyClient(msg, row.id);
  }
}
