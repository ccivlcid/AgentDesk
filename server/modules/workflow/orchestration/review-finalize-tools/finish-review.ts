import type { CountRow } from "../../../routes/shared/types.ts";
import { createFinalizeApprovedReview } from "./finalize-approved-review.ts";
import type { CreateReviewFinalizeToolsDeps } from "./types.ts";
import type { FinishReviewFn } from "./reconcile-delegated-subtasks.ts";

export function createFinishReview(
  deps: CreateReviewFinalizeToolsDeps,
  refs: { finishReview?: FinishReviewFn },
): FinishReviewFn {
  const {
    db,
    nowMs,
    broadcast,
    appendTaskLog,
    resolveLang,
    getProjectReviewGateSnapshot,
    projectReviewGateNotifiedAt,
    notifyClient,
    pickL,
    l,
    taskWorktrees,
    processSubtaskDelegations,
    startReviewConsensusMeeting,
  } = deps;

  function finishReview(
    taskId: string,
    taskTitle: string,
    options?: { bypassProjectDecisionGate?: boolean; trigger?: string },
  ): void {
    const lang = resolveLang(taskTitle);
    const currentTask = db
      .prepare(
        "SELECT status, department_id, source_task_id, project_id, workflow_pack_key, project_path FROM tasks WHERE id = ?",
      )
      .get(taskId) as
      | {
          status: string;
          department_id: string | null;
          source_task_id: string | null;
          project_id: string | null;
          workflow_pack_key: string | null;
          project_path: string | null;
        }
      | undefined;
    if (!currentTask || currentTask.status !== "review") return;

    if (!options?.bypassProjectDecisionGate && !currentTask.source_task_id && currentTask.project_id) {
      const gateSnapshot = getProjectReviewGateSnapshot(currentTask.project_id);
      appendTaskLog(
        taskId,
        "system",
        `Review gate: waiting for project-level decision (${gateSnapshot.activeReview}/${gateSnapshot.activeTotal} active tasks in review)`,
      );
      if (gateSnapshot.ready) {
        const now = nowMs();
        const lastNotified = projectReviewGateNotifiedAt.get(currentTask.project_id) ?? 0;
        if (now - lastNotified > 30_000) {
          projectReviewGateNotifiedAt.set(currentTask.project_id, now);
          const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(currentTask.project_id) as
            | { name: string | null }
            | undefined;
          const projectName = (project?.name || currentTask.project_id).trim();
          notifyClient(
            pickL(
              l(
                [
                  `[Client OFFICE] 프로젝트 '${projectName}'의 활성 항목 ${gateSnapshot.activeTotal}건이 모두 Review 상태입니다. 의사결정 인박스에서 승인하면 팀장 회의를 시작합니다.`,
                ],
                [
                  `[Client OFFICE] Project '${projectName}' now has all ${gateSnapshot.activeTotal} active tasks in Review. Approve from Decision Inbox to start team-lead review meetings.`,
                ],
                [
                  `[Client OFFICE] プロジェクト'${projectName}'のアクティブタスク${gateSnapshot.activeTotal}件がすべてReviewに到達しました。Decision Inboxで承認するとチームリーダー会議を開始します。`,
                ],
                [
                  `[Client OFFICE] 项目'${projectName}'的 ${gateSnapshot.activeTotal} 个活跃任务已全部进入 Review。请在 Decision Inbox 批准后启动组长评审会议。`,
                ],
              ),
              lang,
            ),
            taskId,
          );
        }
      } else {
        projectReviewGateNotifiedAt.delete(currentTask.project_id);
      }
      return;
    }
    if (options?.bypassProjectDecisionGate && currentTask.project_id) {
      projectReviewGateNotifiedAt.delete(currentTask.project_id);
      appendTaskLog(taskId, "system", `Review gate bypassed (trigger=${options.trigger ?? "manual"})`);
    }

    const healed = db
      .prepare(
        `
  UPDATE subtasks
  SET status = 'done',
      completed_at = COALESCE(completed_at, ?),
      blocked_reason = NULL
  WHERE task_id = ?
    AND status = 'blocked'
    AND delegated_task_id IS NOT NULL
    AND delegated_task_id != ''
    AND EXISTS (
      SELECT 1
      FROM tasks dt
      WHERE dt.id = subtasks.delegated_task_id
        AND dt.status IN ('review', 'done')
    )
`,
      )
      .run(nowMs(), taskId) as { changes?: number } | undefined;
    if ((healed?.changes ?? 0) > 0) {
      appendTaskLog(
        taskId,
        "system",
        `Review gate auto-heal: recovered ${healed?.changes ?? 0} blocked delegated subtask(s) after successful resume`,
      );
    }

    const remainingSubtaskCount = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM subtasks WHERE task_id = ? AND status NOT IN ('done', 'cancelled')")
        .get(taskId) as CountRow
    ).cnt;
    if (remainingSubtaskCount > 0) {
      notifyClient(
        pickL(
          l(
            [`'${taskTitle}' 는 아직 ${remainingSubtaskCount}개 서브태스크가 남아 있어 Review 단계에서 대기합니다.`],
            [`'${taskTitle}' is waiting in Review because ${remainingSubtaskCount} subtasks are still unfinished.`],
            [`'${taskTitle}' は未完了サブタスクが${remainingSubtaskCount}件あるため、Reviewで待機しています。`],
            [`'${taskTitle}' 仍有 ${remainingSubtaskCount} 个 SubTask 未完成，当前在 Review 阶段等待。`],
          ),
          lang,
        ),
        taskId,
      );
      appendTaskLog(taskId, "system", `Review hold: waiting for ${remainingSubtaskCount} unfinished subtasks`);
      return;
    }

    if (!currentTask.source_task_id) {
      const childProgress = db
        .prepare(
          `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS review_cnt,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_cnt
    FROM tasks
    WHERE source_task_id = ?
  `,
        )
        .get(taskId) as { total: number; review_cnt: number | null; done_cnt: number | null } | undefined;
      const childTotal = childProgress?.total ?? 0;
      const childReview = childProgress?.review_cnt ?? 0;
      const childDone = childProgress?.done_cnt ?? 0;
      const childReady = childReview + childDone;
      if (childTotal > 0 && childReady < childTotal) {
        const waiting = childTotal - childReady;
        notifyClient(
          pickL(
            l(
              [`'${taskTitle}' 는 협업 하위 태스크 ${waiting}건이 아직 Review 진입 전이라 전체 팀장회의를 대기합니다.`],
              [
                `'${taskTitle}' is waiting for ${waiting} collaboration child task(s) to reach review before the single team-lead meeting starts.`,
              ],
              [
                `'${taskTitle}' は協業子タスク${waiting}件がまだReview未到達のため、全体チームリーダー会議を待機しています。`,
              ],
              [`'${taskTitle}' 仍有 ${waiting} 个协作子任务尚未进入 Review，当前等待后再开启一次团队负责人会议。`],
            ),
            lang,
          ),
          taskId,
        );
        appendTaskLog(
          taskId,
          "system",
          `Review hold: waiting for collaboration children to reach review (${childReady}/${childTotal})`,
        );
        return;
      }
    }

    const finalizeApprovedReview = createFinalizeApprovedReview({
      taskId,
      taskTitle,
      lang,
      currentTask,
      deps,
      getFinishReview: () => refs.finishReview!,
    });

    if (currentTask.source_task_id) {
      appendTaskLog(taskId, "system", "Review consensus skipped for delegated collaboration task");
      finalizeApprovedReview();
      return;
    }

    startReviewConsensusMeeting(taskId, taskTitle, currentTask.department_id, finalizeApprovedReview);
  }

  return finishReview;
}
