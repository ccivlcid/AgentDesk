/**
 * Success/failure state updates and runCompleteNotify. Keeps core.ts under 300 lines.
 */

import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../../core/task-execution-meta.ts";
import { runCompleteNotify } from "./notifications.ts";
import type { RunCompleteNotifyDeps } from "./notifications.ts";

export type StateUpdatesDeps = RunCompleteNotifyDeps & {
  db: unknown;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  broadcast: (event: string, payload: unknown) => void;
  reconcileDelegatedSubtasksAfterRun: (taskId: string, code: number) => void;
  notifyTaskStatus: (taskId: string, title: string, status: string, lang: string) => void;
  resolveLang: (text: string) => string;
  taskWorktrees: Map<string, { projectPath?: string }>;
  cleanupWorktree: (projectPath: string, taskId: string) => void;
};

/** Build StateUpdatesDeps from the full run-complete handler deps. */
export function buildStateUpdatesDeps(deps: Record<string, unknown>): StateUpdatesDeps {
  return {
    db: deps.db,
    appendTaskLog: deps.appendTaskLog as (a: string, b: string, c: string) => void,
    broadcast: deps.broadcast as (e: string, p: unknown) => void,
    reconcileDelegatedSubtasksAfterRun: deps.reconcileDelegatedSubtasksAfterRun as (id: string, code: number) => void,
    notifyTaskStatus: deps.notifyTaskStatus as (a: string, b: string, c: string, d: string) => void,
    resolveLang: deps.resolveLang as (s: string) => string,
    taskWorktrees: deps.taskWorktrees as Map<string, { projectPath?: string }>,
    cleanupWorktree: deps.cleanupWorktree as (path: string, id: string) => void,
    notifyClient: deps.notifyClient as (msg: string, taskId: string) => void,
    sendAgentMessage: deps.sendAgentMessage as (...args: unknown[]) => void,
    insertNotification: deps.insertNotification as (p: object) => void,
    findTeamLeader: deps.findTeamLeader as (id: string | null) => { id: string } | undefined,
    getAgentDisplayName: deps.getAgentDisplayName as (agent: { id: string }, lang: string) => string,
    pickL: deps.pickL as (pool: unknown, lang: string) => string,
    l: deps.l as (ko: string[], en: string[], ja?: string[], zh?: string[]) => unknown,
    formatTaskSubtaskProgressSummary: deps.formatTaskSubtaskProgressSummary as (taskId: string, lang: string) => string,
    logsDir: deps.logsDir as string,
    prettyStreamJson: deps.prettyStreamJson as (raw: string) => string,
    getWorktreeDiffSummary: deps.getWorktreeDiffSummary as (path: string, taskId: string) => string,
    hasVisibleDiffSummary: deps.hasVisibleDiffSummary as (s: string) => boolean,
    finishReview: deps.finishReview as (taskId: string, title: string) => void,
    crossDeptNextCallbacks: deps.crossDeptNextCallbacks as Map<string, () => void>,
    recoverCrossDeptQueueAfterMissingCallback: deps.recoverCrossDeptQueueAfterMissingCallback as (id: string) => void,
    subtaskDelegationCallbacks: deps.subtaskDelegationCallbacks as Map<string, () => void>,
    findProjectPm: deps.findProjectPm as ((projectId: string | null) => { id: string } | undefined) | undefined,
  } as StateUpdatesDeps;
}

type TaskForState = {
  title: string;
  description: string | null;
  source_task_id: string | null;
  department_id: string | null;
  assigned_agent_id: string | null;
  project_id?: string | null;
};

function dbRun(db: unknown, sql: string, ...params: unknown[]): void {
  (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } }).prepare(sql).run(...params);
}

function dbGet(db: unknown, sql: string, ...params: unknown[]): unknown {
  return (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } }).prepare(sql).get(...params);
}

export function applySuccessStateUpdate(
  taskId: string,
  task: TaskForState,
  finalExitCode: number,
  result: string | null,
  t: number,
  deps: StateUpdatesDeps,
): void {
  const { db, appendTaskLog, broadcast, reconcileDelegatedSubtasksAfterRun, notifyTaskStatus, resolveLang } = deps;
  const updates = ["status = 'review'", "updated_at = ?"];
  const params: unknown[] = [t];
  appendTaskExecutionMetaUpdate(db as Parameters<typeof appendTaskExecutionMetaUpdate>[0], updates, params, {
    execution_state: "awaiting_review",
    last_output_at: t,
    last_heartbeat_at: t,
    execution_error_code: null,
    execution_error_summary: null,
  });
  params.push(taskId);
  dbRun(db, `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, ...params);
  recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
    taskId,
    eventType: "run_completed",
    fromState: "running",
    toState: "awaiting_review",
    summary: "Task run completed and moved to review",
    metadata: { exit_code: finalExitCode },
    createdAt: t,
  });
  appendTaskLog(taskId, "system", "Status → review (team leader review pending)");
  const updatedTask = dbGet(db, "SELECT * FROM tasks WHERE id = ?", taskId);
  broadcast("task_update", updatedTask);
  if (task) notifyTaskStatus(taskId, task.title, "review", resolveLang(task.description ?? task.title));
  if (task?.source_task_id) {
    reconcileDelegatedSubtasksAfterRun(taskId, 0);
    appendTaskLog(taskId, "system", "Status → review (delegated collaboration task waiting for parent consolidation)");
  }
  runCompleteNotify(taskId, task, finalExitCode, result, deps);
}

export function applyFailureStateUpdate(
  taskId: string,
  task: TaskForState | null,
  finalExitCode: number,
  result: string | null,
  t: number,
  deps: StateUpdatesDeps,
): void {
  const { db, broadcast, reconcileDelegatedSubtasksAfterRun, taskWorktrees, cleanupWorktree, appendTaskLog } = deps;
  const updates = ["status = 'inbox'", "updated_at = ?"];
  const params: unknown[] = [t];
  appendTaskExecutionMetaUpdate(db as Parameters<typeof appendTaskExecutionMetaUpdate>[0], updates, params, {
    execution_state: "failed",
    last_output_at: t,
    last_heartbeat_at: t,
    retry_after: null,
    execution_error_code: `exit_${finalExitCode}`,
    execution_error_summary: `Task run failed with exit code ${finalExitCode}`,
  });
  params.push(taskId);
  dbRun(db, `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, ...params);
  recordTaskExecutionEvent(db as Parameters<typeof recordTaskExecutionEvent>[0], {
    taskId,
    eventType: "run_failed",
    fromState: "running",
    toState: "failed",
    summary: `Task run failed with exit code ${finalExitCode}`,
    metadata: { exit_code: finalExitCode },
    createdAt: t,
  });
  if (task?.source_task_id) reconcileDelegatedSubtasksAfterRun(taskId, finalExitCode);
  const updatedTask = dbGet(db, "SELECT * FROM tasks WHERE id = ?", taskId);
  broadcast("task_update", updatedTask);
  const failWtInfo = taskWorktrees.get(taskId);
  if (failWtInfo?.projectPath) {
    cleanupWorktree(failWtInfo.projectPath, taskId);
    appendTaskLog(taskId, "system", "Worktree cleaned up (task failed)");
  }
  if (task) runCompleteNotify(taskId, task, finalExitCode, result, deps);
}
