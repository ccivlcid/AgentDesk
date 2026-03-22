import { trySendTaskDeliverablesToMessenger } from "./finalize-deliverable-messenger.ts";
import { triggerWebhooks } from "../../../routes/core/webhooks.ts";
import { appendTaskExecutionMetaUpdate, recordTaskExecutionEvent } from "../../core/task-execution-meta.ts";
import { autoSaveTaskReport, autoCheckProjectDeliverables } from "../run-complete-handler/auto-completions.ts";
import { recordArtifactsFromDirectoryScan, recordMergedArtifacts } from "./review-artifact-recorders.ts";
import { eventBus } from "../../../../lib/event-bus.ts";
import type { CreateReviewFinalizeToolsDeps } from "./types.ts";
import type { FinishReviewFn } from "./reconcile-delegated-subtasks.ts";

type CurrentTaskRow = {
  status: string;
  department_id: string | null;
  source_task_id: string | null;
  project_id: string | null;
  workflow_pack_key: string | null;
  project_path: string | null;
  description?: unknown;
  assigned_agent_id?: unknown;
  started_at?: unknown;
  result?: unknown;
};

export function createFinalizeApprovedReview(params: {
  taskId: string;
  taskTitle: string;
  lang: string;
  currentTask: CurrentTaskRow;
  deps: CreateReviewFinalizeToolsDeps;
  getFinishReview: () => FinishReviewFn;
}): () => void {
  const { taskId, taskTitle, lang, currentTask, deps, getFinishReview } = params;
  const {
    db,
    nowMs,
    logsDir,
    broadcast,
    appendTaskLog,
    pickL,
    l,
    taskWorktrees,
    mergeToDevAndCreatePR,
    mergeWorktree,
    cleanupWorktree,
    findTeamLeader,
    getAgentDisplayName,
    notifyClient,
    setTaskCreationAuditCompletion,
    endTaskExecutionSession,
    notifyTaskStatus,
    refreshCliUsageData,
    shouldDeferTaskReportUntilPlanningArchive,
    emitTaskReportEvent,
    formatTaskSubtaskProgressSummary,
    reviewRoundState,
    reviewInFlight,
    archivePlanningConsolidatedReport,
    crossDeptNextCallbacks,
    recoverCrossDeptQueueAfterMissingCallback,
    subtaskDelegationCallbacks,
    insertNotification,
  } = deps;

  return function finalizeApprovedReview(): void {
    const t = nowMs();
    const latestTask = db.prepare("SELECT status, department_id FROM tasks WHERE id = ?").get(taskId) as
      | { status: string; department_id: string | null }
      | undefined;
    if (!latestTask || latestTask.status !== "review") return;

    const wtInfo = taskWorktrees.get(taskId);
    let mergeNote = "";
    if (wtInfo) {
      const projectRow = currentTask.project_id
        ? (db.prepare("SELECT github_repo FROM projects WHERE id = ?").get(currentTask.project_id) as
            | { github_repo: string | null }
            | undefined)
        : undefined;
      const githubRepo = projectRow?.github_repo;

      const mergeResult = githubRepo
        ? mergeToDevAndCreatePR(wtInfo.projectPath, taskId, githubRepo)
        : mergeWorktree(wtInfo.projectPath, taskId);

      if (mergeResult.success) {
        appendTaskLog(taskId, "system", `Git merge completed: ${mergeResult.message}`);
        try {
          recordMergedArtifacts(db, nowMs, wtInfo.projectPath, taskId);
        } catch (artifactErr) {
          appendTaskLog(taskId, "system", `Failed to record artifacts: ${artifactErr}`);
        }
        cleanupWorktree(wtInfo.projectPath, taskId);
        appendTaskLog(taskId, "system", "Worktree cleaned up after successful merge");
        if (!currentTask.project_path && wtInfo.projectPath) {
          db.prepare(
            "UPDATE tasks SET project_path = ? WHERE id = ? AND (project_path IS NULL OR TRIM(project_path) = '')",
          ).run(wtInfo.projectPath, taskId);
        }
        mergeNote = githubRepo
          ? pickL(
              l(
                [" (dev 병합 + PR 생성)"],
                [" (merged to dev + PR)"],
                [" (dev マージ + PR)"],
                ["（合并到 dev + PR）"],
              ),
              lang,
            )
          : pickL(l([" (병합 완료)"], [" (merged)"], [" (マージ完了)"], ["（已合并）"]), lang);
      } else {
        appendTaskLog(taskId, "system", `Git merge failed: ${mergeResult.message}`);

        const conflictLeader = findTeamLeader(latestTask.department_id);
        const conflictLeaderName = conflictLeader
          ? getAgentDisplayName(conflictLeader, lang)
          : pickL(l(["팀장"], ["Team Lead"], ["チームリーダー"], ["组长"]), lang);
        const conflictFiles = mergeResult.conflicts?.length
          ? pickL(
              l(
                [`\n충돌 파일: ${mergeResult.conflicts.join(", ")}`],
                [`\nConflicting files: ${mergeResult.conflicts.join(", ")}`],
                [`\n競合ファイル: ${mergeResult.conflicts.join(", ")}`],
                [`\n冲突文件: ${mergeResult.conflicts.join(", ")}`],
              ),
              lang,
            )
          : "";
        notifyClient(
          pickL(
            l(
              [
                `${conflictLeaderName}: '${taskTitle}' 병합 중 충돌이 발생했습니다. 수동 해결이 필요합니다.${conflictFiles}\n브랜치: ${wtInfo.branchName}`,
              ],
              [
                `${conflictLeaderName}: Merge conflict while merging '${taskTitle}'. Manual resolution is required.${conflictFiles}\nBranch: ${wtInfo.branchName}`,
              ],
              [
                `${conflictLeaderName}: '${taskTitle}' のマージ中に競合が発生しました。手動解決が必要です。${conflictFiles}\nブランチ: ${wtInfo.branchName}`,
              ],
              [
                `${conflictLeaderName}：合并 '${taskTitle}' 时发生冲突，需要手动解决。${conflictFiles}\n分支: ${wtInfo.branchName}`,
              ],
            ),
            lang,
          ),
          taskId,
        );

        mergeNote = pickL(
          l(
            [" (병합 충돌 - 수동 해결 필요)"],
            [" (merge conflict - manual resolution required)"],
            [" (マージ競合 - 手動解決が必要)"],
            ["（合并冲突 - 需要手动解决）"],
          ),
          lang,
        );
      }
    }

    if (!wtInfo) {
      try {
        const directProjectPath = (currentTask as { project_path?: string | null }).project_path || process.cwd();
        const existingArtifacts = (db.prepare("SELECT COUNT(*) as cnt FROM task_artifacts WHERE task_id = ?").get(taskId) as {
          cnt: number;
        }).cnt;
        if (existingArtifacts === 0 && directProjectPath) {
          recordArtifactsFromDirectoryScan(db, nowMs, directProjectPath, taskId);
          appendTaskLog(taskId, "system", `Direct mode: scanned project directory for artifacts (${directProjectPath})`);
        }
      } catch {
        /* best effort */
      }
    }

    {
      const updates = ["status = 'done'", "completed_at = ?", "updated_at = ?"];
      const params: unknown[] = [t, t];
      appendTaskExecutionMetaUpdate(db as any, updates, params, {
        execution_state: "succeeded",
        last_heartbeat_at: t,
        last_output_at: t,
        retry_after: null,
        execution_error_code: null,
        execution_error_summary: null,
      });
      params.push(taskId);
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
    recordTaskExecutionEvent(db as any, {
      taskId,
      eventType: "review_approved",
      fromState: "awaiting_review",
      toState: "succeeded",
      summary: "Task approved in review and marked done",
      createdAt: t,
    });
    setTaskCreationAuditCompletion(taskId, true);

    appendTaskLog(taskId, "system", "Status → done (all leaders approved)");
    endTaskExecutionSession(taskId, "task_done");

    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    broadcast("task_update", updatedTask);
    triggerWebhooks(db, "task_done", { task_id: taskId, title: taskTitle, completed_at: t });
    notifyTaskStatus(taskId, taskTitle, "done", lang);
    insertNotification({
      type: "task_complete",
      title: taskTitle,
      task_id: taskId,
    });

    trySendTaskDeliverablesToMessenger({
      db,
      taskId,
      taskTitle,
      lang,
      projectPathFallback: (currentTask as { project_path?: string | null }).project_path,
      appendTaskLog,
    });

    refreshCliUsageData()
      .then((usage: unknown) => broadcast("cli_usage_update", usage))
      .catch(() => {});
    {
      const autoCompletionDeps = {
        db,
        nowMs,
        logsDir,
        lang: lang as "ko" | "en" | "ja" | "zh",
        appendTaskLog,
        prettyStreamJson: deps.prettyStreamJson,
        getWorktreeDiffSummary: deps.getWorktreeDiffSummary,
        taskWorktrees,
      };
      const nullableStr = (v: unknown): string | null => {
        if (v == null) return null;
        return typeof v === "string" ? v : String(v);
      };
      const taskForAuto = {
        id: taskId,
        title: taskTitle,
        description: nullableStr((currentTask as { description?: unknown }).description),
        project_id: nullableStr((currentTask as { project_id?: unknown }).project_id),
        project_path: nullableStr((currentTask as { project_path?: unknown }).project_path),
        workflow_pack_key: nullableStr((currentTask as { workflow_pack_key?: unknown }).workflow_pack_key),
        assigned_agent_id: nullableStr((currentTask as { assigned_agent_id?: unknown }).assigned_agent_id),
        source_task_id: nullableStr((currentTask as { source_task_id?: unknown }).source_task_id),
        started_at:
          (currentTask as { started_at?: unknown }).started_at == null
            ? null
            : Number((currentTask as { started_at?: unknown }).started_at),
        completed_at: t,
        result: nullableStr((currentTask as { result?: unknown }).result),
      };
      if (!taskForAuto.source_task_id) {
        autoSaveTaskReport(taskId, taskForAuto, autoCompletionDeps);
      }
      autoCheckProjectDeliverables(taskId, taskForAuto, autoCompletionDeps);
    }

    const deferTaskReport = shouldDeferTaskReportUntilPlanningArchive(currentTask);
    if (deferTaskReport) {
      appendTaskLog(taskId, "system", "Task report popup deferred until planning consolidated archive is ready");
    } else {
      emitTaskReportEvent(taskId);
    }

    const leader = findTeamLeader(latestTask.department_id);
    const leaderName = leader
      ? getAgentDisplayName(leader, lang)
      : pickL(l(["팀장"], ["Team Lead"], ["チームリーダー"], ["组长"]), lang);
    const subtaskProgressSummary = formatTaskSubtaskProgressSummary(taskId, lang);
    const progressSuffix = subtaskProgressSummary
      ? `\n${pickL(l(["보완/협업 완료 현황"], ["Remediation/Collaboration completion"], ["補完/協業 完了状況"], ["整改/协作完成情况"]), lang)}\n${subtaskProgressSummary}`
      : "";
    notifyClient(
      pickL(
        l(
          [`${leaderName}: '${taskTitle}' 최종 승인 완료 보고드립니다.${mergeNote}${progressSuffix}`],
          [`${leaderName}: Final approval completed for '${taskTitle}'.${mergeNote}${progressSuffix}`],
          [`${leaderName}: '${taskTitle}' の最終承認が完了しました。${mergeNote}${progressSuffix}`],
          [`${leaderName}：'${taskTitle}' 最终审批已完成。${mergeNote}${progressSuffix}`],
        ),
        lang,
      ),
      taskId,
    );

    reviewRoundState.delete(taskId);
    reviewInFlight.delete(taskId);

    if (!currentTask.source_task_id) {
      const childRows = db
        .prepare("SELECT id, title FROM tasks WHERE source_task_id = ? AND status = 'review' ORDER BY created_at ASC")
        .all(taskId) as Array<{ id: string; title: string }>;
      if (childRows.length > 0) {
        appendTaskLog(
          taskId,
          "system",
          `Finalization: closing ${childRows.length} collaboration child task(s) after parent review`,
        );
        const childFinish = getFinishReview();
        for (const child of childRows) {
          childFinish(child.id, child.title);
        }
      }
      void archivePlanningConsolidatedReport(taskId);
    }

    const nextCallback = crossDeptNextCallbacks.get(taskId);
    if (nextCallback) {
      crossDeptNextCallbacks.delete(taskId);
      nextCallback();
    } else {
      recoverCrossDeptQueueAfterMissingCallback(taskId);
    }

    const subtaskNext = subtaskDelegationCallbacks.get(taskId);
    if (subtaskNext) {
      subtaskDelegationCallbacks.delete(taskId);
      subtaskNext();
    }

    // ── PM 오케스트레이터에 done 이벤트 발행 → PM이 다음 태스크 결정 ──
    eventBus.emitTaskStatus({
      type: "task_status_changed",
      taskId,
      projectId: currentTask.project_id,
      fromStatus: "review",
      toStatus: "done",
      agentId: null,
    });
  };
}
