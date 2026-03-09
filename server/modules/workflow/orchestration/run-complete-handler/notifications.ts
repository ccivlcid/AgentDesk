/**
 * Run-complete notifications: broadcast, CEO, agent messages, task status, callbacks.
 */

import fs from "node:fs";
import path from "node:path";

export type RunCompleteNotifyDeps = {
  broadcast: (event: string, payload: unknown) => void;
  notifyCeo: (message: string, taskId: string) => void;
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
};

/**
 * Run all post-run notifications: task status, CEO messages, agent reports, callbacks.
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
    notifyCeo,
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

    if (task.source_task_id) {
      const sourceLang = resolveLang(task.description ?? task.title);
      notifyCeo(
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
      const nextDelay = 800 + Math.random() * 600;
      const nextCallback = crossDeptNextCallbacks.get(taskId);
      if (nextCallback) {
        crossDeptNextCallbacks.delete(taskId);
        setTimeout(nextCallback, nextDelay);
      } else {
        recoverCrossDeptQueueAfterMissingCallback(taskId);
      }
      const subtaskNext = subtaskDelegationCallbacks.get(taskId);
      if (subtaskNext) {
        subtaskDelegationCallbacks.delete(taskId);
        setTimeout(subtaskNext, nextDelay);
      }
      return;
    }

    const leader = findTeamLeader(task.department_id);
    const leaderName = leader
      ? getAgentDisplayName(leader, lang)
      : pickL(l(["팀장"], ["Team Lead"], ["チームリーダー"], ["组长"]), lang);
    notifyCeo(
      pickL(
        l(
          [`${leaderName}이(가) '${task.title}' 결과를 검토 중입니다.`],
          [`${leaderName} is reviewing the result for '${task.title}'.`],
          [`${leaderName}가 '${task.title}' の成果をレビュー中です。`],
          [`${leaderName} 正在审核 '${task.title}' 的结果。`],
        ),
        lang,
      ),
      taskId,
    );

    setTimeout(() => {
      const leader2 = findTeamLeader(task.department_id);
      if (!leader2) {
        finishReview(taskId, task.title);
        return;
      }
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
      const reportLang = resolveLang(task.description ?? task.title);
      let reportContent = reportBody
        ? pickL(
            l(
              [`대표님, '${task.title}' 업무 완료 보고드립니다.\n\n📋 결과:\n${reportBody}`],
              [`CEO, reporting completion for '${task.title}'.\n\n📋 Result:\n${reportBody}`],
              [`CEO、'${task.title}' の完了をご報告します。\n\n📋 結果:\n${reportBody}`],
              [`CEO，汇报 '${task.title}' 已完成。\n\n📋 结果:\n${reportBody}`],
            ),
            reportLang,
          )
        : pickL(
            l(
              [`대표님, '${task.title}' 업무 완료 보고드립니다. 작업이 성공적으로 마무리되었습니다.`],
              [`CEO, reporting completion for '${task.title}'. The work has been finished successfully.`],
              [`CEO、'${task.title}' の完了をご報告します。作業は正常に完了しました。`],
              [`CEO，汇报 '${task.title}' 已完成。任务已成功结束。`],
            ),
            reportLang,
          );
      const subtaskProgressLabel = pickL(
        l(
          ["📌 보완/협업 진행 요약"],
          ["📌 Remediation/Collaboration Progress"],
          ["📌 補完/協業 進捗サマリー"],
          ["📌 整改/协作进度摘要"],
        ),
        reportLang,
      );
      const subtaskProgress = formatTaskSubtaskProgressSummary(taskId, reportLang);
      if (subtaskProgress) {
        reportContent += `\n\n${subtaskProgressLabel}\n${subtaskProgress}`;
      }
      if (hasVisibleDiffSummary(diffSummary) && wtInfo) {
        reportContent += pickL(
          l(
            [`\n\n📝 변경사항 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
            [`\n\n📝 Changes (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
            [`\n\n📝 変更点 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
            [`\n\n📝 变更内容 (branch: ${wtInfo?.branchName}):\n${diffSummary}`],
          ),
          reportLang,
        );
      }
      sendAgentMessage(leader2 as { id: string }, reportContent, "report", "all", null, taskId);
      setTimeout(() => {
        finishReview(taskId, task.title);
      }, 2500);
    }, 2500);
  } else {
    const leader = findTeamLeader(task.department_id);
    if (leader) {
      setTimeout(() => {
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
        const failLang = resolveLang(task.description ?? task.title);
        const failContent = errorBody
          ? pickL(
              l(
                [`대표님, '${task.title}' 작업에 문제가 발생했습니다 (종료코드: ${finalExitCode}).\n\n❌ 오류 내용:\n${errorBody}\n\n재배정하거나 업무 내용을 수정한 후 다시 시도해주세요.`],
                [`CEO, '${task.title}' failed with an issue (exit code: ${finalExitCode}).\n\n❌ Error:\n${errorBody}\n\nPlease reassign the agent or revise the task, then try again.`],
                [`CEO、'${task.title}' の処理中に問題が発生しました (終了コード: ${finalExitCode})。\n\n❌ エラー内容:\n${errorBody}\n\n担当再割り当てまたはタスク内容を修正して再試行してください。`],
                [`CEO，'${task.title}' 执行时发生问题（退出码：${finalExitCode}）。\n\n❌ 错误内容:\n${errorBody}\n\n请重新分配代理或修改任务后重试。`],
              ),
              failLang,
            )
          : pickL(
              l(
                [`대표님, '${task.title}' 작업에 문제가 발생했습니다 (종료코드: ${finalExitCode}). 에이전트를 재배정하거나 업무 내용을 수정한 후 다시 시도해주세요.`],
                [`CEO, '${task.title}' failed with an issue (exit code: ${finalExitCode}). Please reassign the agent or revise the task, then try again.`],
                [`CEO、'${task.title}' の処理中に問題が発生しました (終了コード: ${finalExitCode})。担当再割り当てまたはタスク内容を修正して再試行してください。`],
                [`CEO，'${task.title}' 执行时发生问题（退出码：${finalExitCode}）。请重新分配代理或修改任务后重试。`],
              ),
              failLang,
            );
        sendAgentMessage(leader as { id: string }, failContent, "report", "all", null, taskId);
      }, 1500);
    }
    const failLang = resolveLang(task.description ?? task.title);
    notifyCeo(
      pickL(
        l(
          [`'${task.title}' 작업 실패 (exit code: ${finalExitCode}).`],
          [`Task '${task.title}' failed (exit code: ${finalExitCode}).`],
          [`'${task.title}' のタスクが失敗しました (exit code: ${finalExitCode})。`],
          [`任务 '${task.title}' 失败（exit code: ${finalExitCode}）。`],
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
      setTimeout(nextCallback, 3000);
    }
    const subtaskNext = subtaskDelegationCallbacks.get(taskId);
    if (subtaskNext) {
      subtaskDelegationCallbacks.delete(taskId);
      setTimeout(subtaskNext, 3000);
    }
  }
}
