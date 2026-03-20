import { createReconcileDelegatedSubtasksAfterRun } from "./review-finalize-tools/reconcile-delegated-subtasks.ts";
import { createFinishReview } from "./review-finalize-tools/finish-review.ts";
import type { CreateReviewFinalizeToolsDeps } from "./review-finalize-tools/types.ts";
import type { FinishReviewFn } from "./review-finalize-tools/reconcile-delegated-subtasks.ts";

export type { CreateReviewFinalizeToolsDeps } from "./review-finalize-tools/types.ts";

export function createReviewFinalizeTools(deps: CreateReviewFinalizeToolsDeps) {
  const refs: { finishReview?: FinishReviewFn } = {};
  const reconcileDelegatedSubtasksAfterRun = createReconcileDelegatedSubtasksAfterRun(deps, () => refs.finishReview!);
  const finishReview = createFinishReview(deps, refs);
  refs.finishReview = finishReview;
  return {
    reconcileDelegatedSubtasksAfterRun,
    finishReview,
  };
}
