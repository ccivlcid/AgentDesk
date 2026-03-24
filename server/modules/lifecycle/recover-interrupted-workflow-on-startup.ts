import logger from "../../lib/logger.ts";
import type { InProgressRecoveryReason } from "./recover-orphan-in-progress-tasks.ts";
import { pruneDuplicateReviewMeetings } from "./prune-duplicate-review-meetings.ts";
import { recoverOrphanInProgressTasks } from "./recover-orphan-in-progress-tasks.ts";

import type { DatabaseSync } from "node:sqlite";

type StartupDeps = {
  db: Pick<DatabaseSync, "prepare">;
  runInTransaction: (fn: () => void) => void;
  reconcileCrossDeptSubtasks: () => void;
  recoverOrphan: (reason: InProgressRecoveryReason) => void;
  finishReview: (taskId: string, taskTitle: string) => void;
};

export function recoverInterruptedWorkflowOnStartup(deps: StartupDeps): void {
  const { db, runInTransaction, reconcileCrossDeptSubtasks, recoverOrphan, finishReview } = deps;
  pruneDuplicateReviewMeetings({ db, runInTransaction });
  try {
    reconcileCrossDeptSubtasks();
  } catch (err) {
    logger.error({ err }, "[AgentDesk] startup reconciliation failed");
  }

  recoverOrphan("startup");

  const reviewTasks = db
    .prepare(
      `
    SELECT id, title
    FROM tasks
    WHERE status = 'review'
    ORDER BY updated_at ASC
  `,
    )
    .all() as Array<{ id: string; title: string }>;

  reviewTasks.forEach((task, idx) => {
    const delay = 1200 + idx * 400;
    setTimeout(() => {
      const current = db.prepare("SELECT status FROM tasks WHERE id = ?").get(task.id) as
        | { status: string }
        | undefined;
      if (!current || current.status !== "review") return;
      finishReview(task.id, task.title);
    }, delay);
  });
}
