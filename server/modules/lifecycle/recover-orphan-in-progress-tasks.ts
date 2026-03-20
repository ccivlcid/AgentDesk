import fs from "node:fs";
import path from "path";
import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../workflow/core/task-execution-meta.ts";
import { notifyTaskStatus } from "../../gateway/client.ts";

export type InProgressRecoveryReason = "startup" | "interval";

type RecoverOrphanDeps = {
  db: any;
  nowMs: () => number;
  logsDir: string;
  activeProcesses: Map<string, { pid?: number }>;
  isPidAlive: (pid: number) => boolean;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  handleTaskRunComplete: (taskId: string, exitCode: number) => void;
  stopProgressTimer: (taskId: string) => void;
  clearTaskWorkflowState: (taskId: string) => void;
  endTaskExecutionSession: (taskId: string, reason: string) => void;
  broadcast: (event: string, payload?: unknown) => void;
  resolveLang: (title: string) => string;
  notifyClient: (message: string, taskId: string) => void;
  IN_PROGRESS_ORPHAN_GRACE_MS: number;
};

const ORPHAN_RECENT_ACTIVITY_WINDOW_MS = (grace: number) => Math.max(120_000, grace);
const STARTUP_ORPHAN_GRACE_MS = 60_000;
const STARTUP_ORPHAN_RECENT_ACTIVITY_WINDOW_MS = 60_000;

export function recoverOrphanInProgressTasks(
  reason: InProgressRecoveryReason,
  deps: RecoverOrphanDeps,
): void {
  const {
    db,
    nowMs,
    logsDir,
    activeProcesses,
    isPidAlive,
    appendTaskLog,
    handleTaskRunComplete,
    stopProgressTimer,
    clearTaskWorkflowState,
    endTaskExecutionSession,
    broadcast,
    resolveLang,
    notifyClient,
    IN_PROGRESS_ORPHAN_GRACE_MS,
  } = deps;

  const isStartup = reason === "startup";
  const effectiveGraceMs = isStartup ? STARTUP_ORPHAN_GRACE_MS : IN_PROGRESS_ORPHAN_GRACE_MS;
  const effectiveActivityWindowMs = isStartup
    ? STARTUP_ORPHAN_RECENT_ACTIVITY_WINDOW_MS
    : ORPHAN_RECENT_ACTIVITY_WINDOW_MS(IN_PROGRESS_ORPHAN_GRACE_MS);

  type InProgressRow = {
    id: string;
    title: string;
    assigned_agent_id: string | null;
    created_at: number | null;
    started_at: number | null;
    updated_at: number | null;
  };

  const inProgressTasks = db
    .prepare(
      `SELECT id, title, assigned_agent_id, created_at, started_at, updated_at
         FROM tasks WHERE status = 'in_progress' ORDER BY updated_at ASC`,
    )
    .all() as InProgressRow[];

  const now = nowMs();

  type Candidate = InProgressRow & { ageMs: number };
  const ageCandidates: Candidate[] = [];
  for (const task of inProgressTasks) {
    const active = activeProcesses.get(task.id);
    if (active) {
      const pid = typeof active.pid === "number" ? active.pid : null;
      if (pid !== null && pid > 0 && !isPidAlive(pid)) {
        activeProcesses.delete(task.id);
        appendTaskLog(task.id, "system", `Recovery (${reason}): removed stale process handle (pid=${pid})`);
      } else {
        continue;
      }
    }
    const lastTouchedAt = Math.max(task.updated_at ?? 0, task.started_at ?? 0, task.created_at ?? 0);
    const ageMs = lastTouchedAt > 0 ? Math.max(0, now - lastTouchedAt) : effectiveGraceMs + 1;
    if (ageMs >= effectiveGraceMs) ageCandidates.push({ ...task, ageMs });
  }

  if (ageCandidates.length === 0) return;

  const ageIds = ageCandidates.map((t) => t.id);
  const agePlaceholders = ageIds.map(() => "?").join(",");
  const recentlyActiveIds = new Set<string>(
    (
      db
        .prepare(
          `SELECT DISTINCT task_id FROM task_logs
             WHERE task_id IN (${agePlaceholders}) AND created_at > ?`,
        )
        .all(...ageIds, now - effectiveActivityWindowMs) as Array<{ task_id: string }>
    ).map((r) => r.task_id),
  );

  const fsCandidates: Candidate[] = [];
  for (const task of ageCandidates) {
    if (recentlyActiveIds.has(task.id)) continue;
    try {
      const logPath = path.join(logsDir, `${task.id}.log`);
      const stat = fs.statSync(logPath);
      const logIdleMs = Math.max(0, now - Math.floor(stat.mtimeMs || 0));
      if (logIdleMs <= effectiveActivityWindowMs) continue;
    } catch {
      // no log file or unreadable — proceed with recovery
    }
    fsCandidates.push(task);
  }

  if (fsCandidates.length === 0) return;

  const fsIds = fsCandidates.map((t) => t.id);
  const fsPlaceholders = fsIds.map(() => "?").join(",");
  const latestRunLogs = new Map<string, string>(
    (
      db
        .prepare(
          `SELECT l.task_id, l.message
             FROM task_logs l
             INNER JOIN (
               SELECT task_id, MAX(created_at) AS max_ca
               FROM task_logs
               WHERE task_id IN (${fsPlaceholders})
                 AND kind = 'system'
                 AND (message LIKE 'RUN %' OR message LIKE 'Agent spawn failed:%')
               GROUP BY task_id
             ) m ON l.task_id = m.task_id AND l.created_at = m.max_ca
             WHERE l.kind = 'system'
               AND (l.message LIKE 'RUN %' OR l.message LIKE 'Agent spawn failed:%')`,
        )
        .all(...fsIds) as Array<{ task_id: string; message: string }>
    ).map((r) => [r.task_id, r.message] as [string, string]),
  );

  for (const task of fsCandidates) {
    const { ageMs } = task;
    const latestRunMessage = latestRunLogs.get(task.id) ?? "";

    if (latestRunMessage.startsWith("RUN completed (exit code: 0)")) {
      appendTaskLog(
        task.id,
        "system",
        `Recovery (${reason}): orphan in_progress detected (age_ms=${ageMs}) → replaying successful completion`,
      );
      handleTaskRunComplete(task.id, 0);
      continue;
    }

    if (latestRunMessage.startsWith("RUN ") || latestRunMessage.startsWith("Agent spawn failed:")) {
      appendTaskLog(
        task.id,
        "system",
        `Recovery (${reason}): orphan in_progress detected (age_ms=${ageMs}) → replaying failed completion`,
      );
      handleTaskRunComplete(task.id, 1);
      continue;
    }

    const t = nowMs();
    const updates = ["status = 'inbox'", "updated_at = ?"];
    const params: unknown[] = [t];
    appendTaskExecutionMetaUpdate(db as any, updates, params, {
      execution_state: "failed",
      retry_after: null,
      execution_error_code: "orphaned_run",
      execution_error_summary: `Recovered orphaned in_progress task during ${reason}`,
    });
    params.push(task.id);
    const move = db
      .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND status = 'in_progress'`)
      .run(...(params as any[])) as { changes?: number };
    if ((move.changes ?? 0) === 0) continue;

    recordTaskExecutionEvent(db as any, {
      taskId: task.id,
      eventType: "orphan_recovered",
      fromState: "running",
      toState: "failed",
      summary: `Recovered orphaned in_progress task during ${reason}`,
      metadata: { age_ms: ageMs },
      createdAt: t,
    });

    stopProgressTimer(task.id);
    clearTaskWorkflowState(task.id);
    endTaskExecutionSession(task.id, `orphan_in_progress_${reason}`);
    appendTaskLog(
      task.id,
      "system",
      `Recovery (${reason}): in_progress without active process/run log (age_ms=${ageMs}) → inbox`,
    );

    if (task.assigned_agent_id) {
      db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ?").run(task.assigned_agent_id);
      const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(task.assigned_agent_id);
      broadcast("agent_status", updatedAgent);
    }

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
    broadcast("task_update", updatedTask);
    const lang = resolveLang(task.title);
    notifyTaskStatus(task.id, task.title, "inbox", lang);
    const watchdogMessage =
      lang === "en"
        ? `[WATCHDOG] '${task.title}' was in progress but had no active process. Recovered to inbox.`
        : lang === "ja"
          ? `[WATCHDOG] '${task.title}' は in_progress でしたが実行プロセスが存在しないため inbox に復旧しました。`
          : lang === "zh"
            ? `[WATCHDOG] '${task.title}' 处于 in_progress，但未発見執行進程，已恢復到 inbox。`
            : `[WATCHDOG] '${task.title}' 작업이 in_progress 상태였지만 실행 프로세스가 없어 inbox로 복구했습니다.`;
    notifyClient(watchdogMessage, task.id);
  }
}
