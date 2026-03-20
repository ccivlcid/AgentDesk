import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../workflow/core/task-execution-meta.ts";
import { notifyTaskStatus } from "../../gateway/client.ts";

type TimeoutDeps = {
  db: any;
  nowMs: () => number;
  broadcast: (event: string, payload?: unknown) => void;
  activeProcesses: Map<string, { pid?: number }>;
  killPidTree: (pid: number) => void;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  stopProgressTimer: (taskId: string) => void;
  clearTaskWorkflowState: (taskId: string) => void;
  endTaskExecutionSession: (taskId: string, reason: string) => void;
  resolveLang: (title: string) => string;
  notifyClient: (message: string, taskId: string) => void;
};

export function enforceTaskTimeouts(deps: TimeoutDeps): void {
  const {
    db,
    nowMs,
    broadcast,
    activeProcesses,
    killPidTree,
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
      `SELECT id, title, assigned_agent_id, started_at, timeout_minutes
         FROM tasks
         WHERE status = 'in_progress'
           AND execution_state = 'running'
           AND timeout_minutes > 0
           AND started_at IS NOT NULL`,
    )
    .all() as Array<{
      id: string;
      title: string;
      assigned_agent_id: string | null;
      started_at: number;
      timeout_minutes: number;
    }>;

  for (const row of rows) {
    const timeoutMs = row.timeout_minutes * 60_000;
    const elapsed = now - row.started_at;
    if (elapsed < timeoutMs) continue;

    if (activeProcesses.has(row.id)) {
      const proc = activeProcesses.get(row.id);
      const pid = typeof proc?.pid === "number" ? proc.pid : null;
      if (pid && pid > 0) {
        try {
          killPidTree(pid);
        } catch {
          /* best-effort */
        }
      }
      activeProcesses.delete(row.id);
    }

    const t = nowMs();
    const updates = ["status = 'inbox'", "updated_at = ?"];
    const params: unknown[] = [t];
    appendTaskExecutionMetaUpdate(db as any, updates, params, {
      execution_state: "failed",
      retry_after: null,
      execution_error_code: "execution_timeout",
      execution_error_summary: `Task exceeded timeout of ${row.timeout_minutes} minute(s)`,
    });
    params.push(row.id);
    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`).run(...(params as any[]));

    recordTaskExecutionEvent(db as any, {
      taskId: row.id,
      eventType: "run_timed_out",
      fromState: "running",
      toState: "failed",
      summary: `Task timed out after ${row.timeout_minutes} minute(s)`,
      metadata: { timeout_minutes: row.timeout_minutes, elapsed_ms: elapsed },
      createdAt: t,
    });

    stopProgressTimer(row.id);
    clearTaskWorkflowState(row.id);
    endTaskExecutionSession(row.id, "execution_timeout");
    appendTaskLog(row.id, "system", `Execution timed out after ${row.timeout_minutes} minute(s) → inbox`);

    if (row.assigned_agent_id) {
      db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ? AND current_task_id = ?").run(
        row.assigned_agent_id,
        row.id,
      );
      const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(row.assigned_agent_id);
      broadcast("agent_status", updatedAgent);
    }

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(row.id);
    broadcast("task_update", updatedTask);
    const lang = resolveLang(row.title);
    notifyTaskStatus(row.id, row.title, "inbox", lang);
    const msg =
      lang === "en"
        ? `[TIMEOUT] '${row.title}' exceeded ${row.timeout_minutes}m limit and was stopped.`
        : lang === "ja"
          ? `[TIMEOUT] '${row.title}' が ${row.timeout_minutes}分の制限を超過し停止されました。`
          : lang === "zh"
            ? `[TIMEOUT] '${row.title}' 超过 ${row.timeout_minutes} 分钟限制，已停止。`
            : `[TIMEOUT] '${row.title}' 작업이 ${row.timeout_minutes}분 제한을 초과하여 중단되었습니다.`;
    notifyClient(msg, row.id);
  }
}
