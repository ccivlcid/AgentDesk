/**
 * Passed from `orchestration.ts` into review-finalize helpers. The shape is wide;
 * keep this loose so orchestration wiring does not fight every callback signature.
 */
export type CreateReviewFinalizeToolsDeps = Record<string, unknown>;
