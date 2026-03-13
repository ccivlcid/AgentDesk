/**
 * Run-complete orchestration: task snapshot, video sync, gates, learnings, state updates, notifications.
 */

import fs from "node:fs";
import path from "node:path";
import { appendTaskExecutionMetaUpdate } from "../../core/task-execution-meta.ts";
import { handleVideoArtifactSync } from "./video-artifact.ts";
import { runAfterExitGates, applyVideoArtifactGateAfterSuccess } from "./gates.ts";
import { runExtractLearnings } from "./learnings.ts";
import { runExtractSkills } from "./skills.ts";
import { applySuccessStateUpdate, applyFailureStateUpdate, buildStateUpdatesDeps } from "./state-updates.ts";
import { executeHooks } from "../../core/hook-executor.ts";

export type RunCompleteHandlerDeps = Record<string, unknown>;

type TaskRow = {
  assigned_agent_id: string | null;
  department_id: string | null;
  title: string;
  description: string | null;
  status: string;
  workflow_pack_key: string | null;
  project_id: string | null;
  project_path: string | null;
  source_task_id: string | null;
};

export function createRunCompleteHandler(deps: RunCompleteHandlerDeps) {
  const {
    activeProcesses,
    stopProgressTimer,
    db,
    stopRequestedTasks,
    stopRequestModeByTask,
    appendTaskLog,
    clearTaskWorkflowState,
    codexThreadToSubtask,
    nowMs,
    logsDir,
    broadcast,
    processSubtaskDelegations,
    taskWorktrees,
    cleanupWorktree,
    findTeamLeader,
    getAgentDisplayName,
    pickL,
    l,
    notifyClient,
    sendAgentMessage,
    resolveLang,
    formatTaskSubtaskProgressSummary,
    crossDeptNextCallbacks,
    recoverCrossDeptQueueAfterMissingCallback,
    subtaskDelegationCallbacks,
    finishReview,
    reconcileDelegatedSubtasksAfterRun,
    completeTaskWithoutReview,
    isReportDesignCheckpointTask,
    extractReportDesignParentTaskId,
    resumeReportAfterDesignCheckpoint,
    isPresentationReportTask,
    readReportFlowValue,
    startReportDesignCheckpoint,
    upsertReportFlowValue,
    isReportRequestTask,
    notifyTaskStatus,
    prettyStreamJson,
    getWorktreeDiffSummary,
    hasVisibleDiffSummary,
    insertNotification,
    recordAgentUsage,
  } = deps as Record<string, unknown>;

  function handleTaskRunComplete(taskId: string, exitCode: number): void {
    (activeProcesses as Set<string>).delete(taskId);
    (stopProgressTimer as (id: string) => void)(taskId);

    const task = (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } })
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as TaskRow | undefined;
    const stopRequested = (stopRequestedTasks as Set<string>).has(taskId);
    const stopMode = (stopRequestModeByTask as Map<string, string>).get(taskId);
    (stopRequestedTasks as Set<string>).delete(taskId);
    (stopRequestModeByTask as Map<string, string>).delete(taskId);

    if (!task || stopRequested || task.status !== "in_progress") {
      if (task) {
        (appendTaskLog as (a: string, b: string, c: string) => void)(
          taskId,
          "system",
          `RUN completion ignored (status=${task.status}, exit=${exitCode}, stop_requested=${stopRequested ? "yes" : "no"}, stop_mode=${stopMode ?? "none"})`,
        );
      }
      if (!(stopRequested && stopMode === "pause")) {
        (clearTaskWorkflowState as (id: string) => void)(taskId);
      }
      return;
    }

    for (const [tid, itemId] of (codexThreadToSubtask as Map<string, string>)) {
      const row = (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } }).prepare(
        "SELECT id FROM subtasks WHERE cli_tool_use_id = ? AND task_id = ?",
      ).get(itemId, taskId);
      if (row) (codexThreadToSubtask as Map<string, string>).delete(tid);
    }

    const logPath = path.join(logsDir as string, `${taskId}.log`);
    const t = (nowMs as () => number)();
    let finalExitCode = exitCode;
    let result: string | null = null;
    try {
      if (fs.existsSync(logPath)) {
        const raw = fs.readFileSync(logPath, "utf8");
        const pretty = (prettyStreamJson as (r: string) => string)(raw);
        result = pretty ? pretty.slice(-2000) : raw.slice(-2000);
      }
    } catch {
      /* ignore */
    }

    const isVideoPreprodTask = task.workflow_pack_key === "video_preprod";
    const isVideoFinalRenderTask = isVideoPreprodTask && /\[VIDEO_FINAL_RENDER\]/i.test(task.title);

    const artifactSync = handleVideoArtifactSync(taskId, task, {
      db: db as { prepare: (sql: string) => { get: (...args: unknown[]) => unknown } },
      taskWorktrees: taskWorktrees as Map<string, { worktreePath?: string; projectPath?: string }>,
      appendTaskLog: appendTaskLog as (a: string, b: string, c: string) => void,
    });

    const gatesResult = runAfterExitGates(
      taskId,
      { title: task.title, workflow_pack_key: task.workflow_pack_key },
      result,
      finalExitCode,
      artifactSync,
      { db, logsDir, appendTaskLog, nowMs } as import("./gates.ts").RunAfterExitGatesDeps,
    );
    finalExitCode = gatesResult.finalExitCode;

    const logKind = finalExitCode === 0 ? "completed" : "failed";
    (appendTaskLog as (a: string, b: string, c: string) => void)(taskId, "system", `RUN ${logKind} (exit code: ${finalExitCode})`);

    if (task.assigned_agent_id && typeof recordAgentUsage === "function") {
      try {
        const startedAt = (
          (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } })
            .prepare("SELECT started_at FROM tasks WHERE id = ?")
            .get(taskId) as { started_at?: number }
        )?.started_at;
        let logBytes = 0;
        try {
          if (fs.existsSync(logPath)) logBytes = fs.statSync(logPath).size;
        } catch {
          /* ignore */
        }
        const agentRow = (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } })
          .prepare("SELECT cli_provider FROM agents WHERE id = ?")
          .get(task.assigned_agent_id) as { cli_provider?: string | null };
        (recordAgentUsage as (o: object) => void)({
          agentId: task.assigned_agent_id,
          taskId,
          provider: agentRow?.cli_provider || "unknown",
          startedAt: startedAt ?? t,
          endedAt: t,
          exitCode: finalExitCode,
          logBytes,
        });
      } catch {
        /* ignore */
      }
    }

    runExtractLearnings(taskId, task, finalExitCode, result, {
      db: db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } },
      nowMs: nowMs as () => number,
      logsDir: logsDir as string,
      appendTaskLog: appendTaskLog as (a: string, b: string, c: string) => void,
    });

    try {
      runExtractSkills(taskId, task, finalExitCode, result, {
        db,
        nowMs: nowMs as () => number,
        logsDir: logsDir as string,
        appendTaskLog: appendTaskLog as (a: string, b: string, c: string) => void,
      });
    } catch {
      /* skill extraction must not block completion */
    }

    // Execute post-task hooks (scoped by project/agent/department)
    try {
      const hookEventType = finalExitCode === 0 ? "post-task" : "on-error";
      const hookContext = {
        projectId: task.project_id ?? null,
        agentId: task.assigned_agent_id ?? null,
        departmentId: task.department_id ?? null,
        taskId,
      };
      executeHooks(db as any, hookEventType, hookContext);
      executeHooks(db as any, "on-complete", hookContext);
    } catch {
      /* hook failures must not block completion */
    }

    if (result) {
      const updates = ["result = ?"];
      const params: unknown[] = [result];
      appendTaskExecutionMetaUpdate(db as Parameters<typeof appendTaskExecutionMetaUpdate>[0], updates, params, {
        last_output_at: t,
        last_heartbeat_at: t,
      });
      params.push(taskId);
      (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } })
        .prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`)
        .run(...params);
    }

    if (finalExitCode === 0) {
      const pendingSubtasks = (db as { prepare: (s: string) => { all: (...a: unknown[]) => Array<{ id: string; target_department_id: string | null }> } })
        .prepare("SELECT id, target_department_id FROM subtasks WHERE task_id = ? AND status NOT IN ('done', 'cancelled')")
        .all(taskId);
      if (pendingSubtasks.length > 0) {
        const now = (nowMs as () => number)();
        for (const sub of pendingSubtasks) {
          if (!sub.target_department_id) {
            (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } })
              .prepare("UPDATE subtasks SET status = 'done', completed_at = ? WHERE id = ?")
              .run(now, sub.id);
            const updated = (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } }).prepare("SELECT * FROM subtasks WHERE id = ?").get(sub.id);
            (broadcast as (e: string, p: unknown) => void)("subtask_update", updated);
          }
        }
      }
      (processSubtaskDelegations as (id: string) => void)(taskId);
    }

    if (task.assigned_agent_id) {
      (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } })
        .prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ?")
        .run(task.assigned_agent_id);
      if (finalExitCode === 0) {
        (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } })
          .prepare("UPDATE agents SET stats_tasks_done = stats_tasks_done + 1, stats_xp = stats_xp + 10 WHERE id = ?")
          .run(task.assigned_agent_id);
      }
      const agent = (db as { prepare: (s: string) => { get: (...a: unknown[]) => unknown } }).prepare("SELECT * FROM agents WHERE id = ?").get(task.assigned_agent_id);
      (broadcast as (e: string, p: unknown) => void)("agent_status", agent);
    }

    if (finalExitCode === 0 && task) {
      if (isVideoPreprodTask) {
        const gateResult = applyVideoArtifactGateAfterSuccess(
          taskId,
          { title: task.title, description: task.description, source_task_id: task.source_task_id },
          isVideoFinalRenderTask,
          artifactSync,
          {
            db,
            logsDir,
            appendTaskLog,
            nowMs,
            notifyClient,
            pickL,
            l,
            resolveLang,
          } as import("./gates.ts").VideoArtifactGateDeps,
        );
        finalExitCode = gateResult.finalExitCode;
      }

      if ((isReportDesignCheckpointTask as (t: TaskRow) => boolean)(task)) {
        const parentTaskId = (extractReportDesignParentTaskId as (t: TaskRow) => string | null)(task);
        (completeTaskWithoutReview as (t: object, note: string) => void)(
          { id: taskId, title: task.title, description: task.description, department_id: task.department_id, source_task_id: task.source_task_id, assigned_agent_id: task.assigned_agent_id },
          "Status → done (report design checkpoint completed; review meeting skipped)",
        );
        if (parentTaskId) (resumeReportAfterDesignCheckpoint as (parentId: string, triggerId: string) => void)(parentTaskId, taskId);
        return;
      }

      if ((isPresentationReportTask as (t: TaskRow) => boolean)(task)) {
        const designReview = ((readReportFlowValue as (d: string | null, k: string) => string | null)(task.description, "design_review") ?? "pending").toLowerCase();
        if (designReview !== "done") {
          const started = (startReportDesignCheckpoint as (t: object) => boolean)({
            id: taskId,
            title: task.title,
            description: task.description,
            project_id: task.project_id,
            project_path: task.project_path,
            assigned_agent_id: task.assigned_agent_id,
          });
          if (started) return;
          const fallbackDesc = (upsertReportFlowValue as (d: string | null, k: string, v: string) => string)(
            (upsertReportFlowValue as (d: string | null, k: string, v: string) => string)(task.description, "design_review", "skipped"),
            "final_regen",
            "ready",
          );
          (db as { prepare: (s: string) => { run: (...a: unknown[]) => void } })
            .prepare("UPDATE tasks SET description = ?, updated_at = ? WHERE id = ?")
            .run(fallbackDesc, (nowMs as () => number)(), taskId);
        }
        (completeTaskWithoutReview as (t: object, note: string) => void)(
          { id: taskId, title: task.title, description: task.description, department_id: task.department_id, source_task_id: task.source_task_id, assigned_agent_id: task.assigned_agent_id },
          "Status → done (report workflow: final PPT regenerated; second design confirmation skipped)",
        );
        return;
      }

      if ((isReportRequestTask as (t: TaskRow) => boolean)(task)) {
        (completeTaskWithoutReview as (t: object, note: string) => void)(
          { id: taskId, title: task.title, description: task.description, department_id: task.department_id, source_task_id: task.source_task_id, assigned_agent_id: task.assigned_agent_id },
          "Status → done (report workflow: review meeting skipped for documentation/report task)",
        );
        return;
      }
    }

    const stateDeps = buildStateUpdatesDeps(deps as Record<string, unknown>);
    if (finalExitCode === 0) applySuccessStateUpdate(taskId, task, finalExitCode, result, t, stateDeps);
    else applyFailureStateUpdate(taskId, task, finalExitCode, result, t, stateDeps);
  }
  return { handleTaskRunComplete };
}
