/**
 * Run-complete notifications: broadcast, Client, agent messages, task status, callbacks.
 */

import fs from "node:fs";
import path from "node:path";

export type RunCompleteNotifyDeps = {
  broadcast: (event: string, payload: unknown) => void;
  notifyClient: (message: string, taskId: string) => void;
  sendAgentMessage: (
    agent: { id: string },
    content: string,
    kind: string,
    scope: string,
    meta: unknown,
    taskId: string | null,
  ) => void;
  insertNotification: (payload: {
    type: string;
    title: string;
    body: string;
    task_id: string;
    agent_id: string | null;
  }) => void;
  notifyTaskStatus: (taskId: string, title: string, status: string, lang: string) => void;
  findTeamLeader: (departmentId: string | null) => { id: string } | undefined;
  findProjectPm?: (projectId: string | null) => { id: string } | undefined;
  getAgentDisplayName: (agent: { id: string }, lang: string) => string;
  pickL: (pool: unknown, lang: string) => string;
  l: (ko: string[], en: string[], ja?: string[], zh?: string[]) => unknown;
  resolveLang: (text: string) => string;
  formatTaskSubtaskProgressSummary: (taskId: string, lang: string) => string;
  logsDir: string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  prettyStreamJson: (raw: string) => string;
  getWorktreeDiffSummary: (projectPath: string, taskId: string) => string;
  hasVisibleDiffSummary: (summary: string) => boolean;
  taskWorktrees: Map<string, { projectPath?: string; branchName?: string }>;
  finishReview: (taskId: string, taskTitle: string) => void;
  crossDeptNextCallbacks: Map<string, () => void>;
  recoverCrossDeptQueueAfterMissingCallback: (taskId: string) => void;
  subtaskDelegationCallbacks: Map<string, () => void>;
  db: { prepare: (sql: string) => { get: (...args: unknown[]) => unknown } };
};

export type TaskForNotify = {
  title: string;
  description: string | null;
  department_id: string | null;
  source_task_id: string | null;
  assigned_agent_id: string | null;
  project_id?: string | null;
};

/**
 * Run all post-run notifications: task status, Client messages, agent reports, callbacks.
 * Call after core has updated status, broadcast task_update, and (on failure) cleaned worktree.
 */
export function runCompleteNotify(
  taskId: string,
  task: TaskForNotify,
  finalExitCode: number,
  result: string | null,
  deps: RunCompleteNotifyDeps,
): void {
  const {
    notifyTaskStatus,
    notifyClient,
    sendAgentMessage,
    insertNotification,
    findTeamLeader,
    getAgentDisplayName,
    pickL,
    l,
    resolveLang,
    formatTaskSubtaskProgressSummary,
    logsDir,
    appendTaskLog,
    prettyStreamJson,
    getWorktreeDiffSummary,
    hasVisibleDiffSummary,
    taskWorktrees,
    finishReview,
    crossDeptNextCallbacks,
    recoverCrossDeptQueueAfterMissingCallback,
    subtaskDelegationCallbacks,
  } = deps;

  if (finalExitCode === 0) {
    const lang = resolveLang(task.description ?? task.title);
    notifyTaskStatus(taskId, task.title, "review", lang);
    insertNotification({
      type: "task_complete",
      title: task.title,
      body: pickL(
        l(
          ["작업이 완료되어 검토 대기 중입니다."],
          ["Task completed, awaiting review."],
          ["タスクが完了し、レビュー待ちです。"],
          ["任务已完成，等待审核。"],
        ),
        lang,
      ),
      task_id: taskId,
      agent_id: task.assigned_agent_id,
    });

    if (task.source_task_id) {
      const sourceLang = resolveLang(task.description ?? task.title);
      notifyClient(
        pickL(
          l(
            [`'${task.title}' 협업 하위 태스크가 Review 대기 상태로 전환되었습니다. 상위 업무의 전체 취합 회의에서 일괄 검토/머지합니다.`],
            [`'${task.title}' collaboration child task is now waiting in Review. It will be consolidated in the parent task's single review/merge meeting.`],
            [`'${task.title}' の協業子タスクはReview待機に入りました。上位タスクの一括レビュー/マージ会議で統合処理します。`],
            [`'${task.title}' 协作子任务已进入 Review 等待。将在上级任务的一次性评审/合并会议中统一处理。`],
          ),
          sourceLang,
        ),
        taskId,
      );
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
      return;
    }

    // PM에게 즉시 완료 보고 — setTimeout 없이 이벤트 기반 처리.
    // finishReview는 decision inbox의 approve_task_review에서만 호출됨.
    const findProjectPm = deps.findProjectPm;
    const leader2 = (findProjectPm ? findProjectPm(task.project_id ?? null) : undefined)
      ?? findTeamLeader(task.department_id);
    const leaderName = leader2
      ? getAgentDisplayName(leader2, lang)
      : pickL(l(["PM"], ["PM"], ["PM"], ["PM"]), lang);

    let reportBody = "";
    try {
      const logFile = path.join(logsDir, `${taskId}.log`);
      if (fs.existsSync(logFile)) {
        const raw = fs.readFileSync(logFile, "utf8");
        const pretty = prettyStreamJson(raw);
        reportBody = pretty.length > 500 ? "..." + pretty.slice(-500) : pretty;
      }
    } catch {
      /* ignore */
    }
    const wtInfo = taskWorktrees.get(taskId);
    let diffSummary = "";
    if (wtInfo) {
      diffSummary = getWorktreeDiffSummary(wtInfo.projectPath!, taskId);
      if (hasVisibleDiffSummary(diffSummary)) {
        appendTaskLog(taskId, "system", `Worktree diff summary:\n${diffSummary}`);
      }
    }
    let reportContent = reportBody
      ? pickL(
          l(
            [`'${task.title}' 완료.\n\n📋 결과:\n${reportBody}`],
            [`'${task.title}' completed.\n\n📋 Result:\n${reportBody}`],
            [`'${task.title}' 完了。\n\n📋 結果:\n${reportBody}`],
            [`'${task.title}' 完成。\n\n📋 结果:\n${reportBody}`],
          ),
          lang,
        )
      : pickL(
          l(
            [`'${task.title}' 완료.`],
            [`'${task.title}' completed.`],
            [`'${task.title}' 完了。`],
            [`'${task.title}' 完成。`],
          ),
          lang,
        );
    const subtaskProgress = formatTaskSubtaskProgressSummary(taskId, lang);
    if (subtaskProgress) {
      reportContent += `\n\n${subtaskProgress}`;
    }
    if (hasVisibleDiffSummary(diffSummary) && wtInfo) {
      reportContent += pickL(
        l(
          [`\n\n📝 변경사항 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
          [`\n\n📝 Changes (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
          [`\n\n📝 変更点 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
          [`\n\n📝 变更内容 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
        ),
        lang,
      );
    }
    if (leader2) {
      sendAgentMessage(leader2 as { id: string }, reportContent, "report", "all", null, taskId);
    }
    notifyClient(
      pickL(
        l(
          [`'${task.title}' 완료 — ${leaderName} 검토 대기 중`],
          [`'${task.title}' done — awaiting ${leaderName} review`],
          [`'${task.title}' 完了 — ${leaderName}のレビュー待ち`],
          [`'${task.title}' 完成 — 等待${leaderName}审核`],
        ),
        lang,
      ),
      taskId,
    );
    appendTaskLog(taskId, "system", "Review 대기: decision inbox 승인 대기");
  } else {
    // 실패 — 즉시 보고 (setTimeout 제거)
    const failLang = resolveLang(task.description ?? task.title);
    let errorBody = "";
    try {
      const logFile = path.join(logsDir, `${taskId}.log`);
      if (fs.existsSync(logFile)) {
        const raw = fs.readFileSync(logFile, "utf8");
        const pretty = prettyStreamJson(raw);
        errorBody = pretty.length > 300 ? "..." + pretty.slice(-300) : pretty;
      }
    } catch {
      /* ignore */
    }

    const leader = findTeamLeader(task.department_id);
    if (leader) {
      const failContent = errorBody
        ? pickL(
            l(
              [`'${task.title}' 실패 (종료코드: ${finalExitCode}).\n\n${errorBody}`],
              [`'${task.title}' failed (exit code: ${finalExitCode}).\n\n${errorBody}`],
              [`'${task.title}' 失敗 (終了コード: ${finalExitCode})。\n\n${errorBody}`],
              [`'${task.title}' 失败（退出码: ${finalExitCode}）。\n\n${errorBody}`],
            ),
            failLang,
          )
        : pickL(
            l(
              [`'${task.title}' 실패 (종료코드: ${finalExitCode}).`],
              [`'${task.title}' failed (exit code: ${finalExitCode}).`],
              [`'${task.title}' 失敗 (終了コード: ${finalExitCode})。`],
              [`'${task.title}' 失败（退出码: ${finalExitCode}）。`],
            ),
            failLang,
          );
      sendAgentMessage(leader as { id: string }, failContent, "report", "all", null, taskId);

      // CEO 에스컬레이션
      const ceo = findTeamLeader("planning");
      if (ceo && ceo.id !== leader.id) {
        sendAgentMessage(
          ceo as { id: string },
          pickL(
            l(
              [`[에스컬레이션] '${task.title}' 실패 (종료코드: ${finalExitCode}).`],
              [`[Escalation] '${task.title}' failed (exit code: ${finalExitCode}).`],
              [`[エスカレーション] '${task.title}' 失敗 (終了コード: ${finalExitCode})。`],
              [`[升级] '${task.title}' 失败（退出码: ${finalExitCode}）。`],
            ),
            failLang,
          ),
          "report",
          "all",
          null,
          taskId,
        );
      }
    }

    notifyClient(
      pickL(
        l(
          [`'${task.title}' 실패 (exit code: ${finalExitCode}).`],
          [`'${task.title}' failed (exit code: ${finalExitCode}).`],
          [`'${task.title}' 失敗 (exit code: ${finalExitCode})。`],
          [`'${task.title}' 失败（exit code: ${finalExitCode}）。`],
        ),
        failLang,
      ),
      taskId,
    );
    insertNotification({
      type: "task_error",
      title: task.title,
      body: `Exit code: ${finalExitCode}`,
      task_id: taskId,
      agent_id: task.assigned_agent_id,
    });

    const nextCallback = crossDeptNextCallbacks.get(taskId);
    if (nextCallback) {
      crossDeptNextCallbacks.delete(taskId);
      nextCallback();
    }
    const subtaskNext = subtaskDelegationCallbacks.get(taskId);
    if (subtaskNext) {
      subtaskDelegationCallbacks.delete(taskId);
      subtaskNext();
    }
  }
}
