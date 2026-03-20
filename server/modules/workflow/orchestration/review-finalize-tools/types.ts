/**
 * Passed from `orchestration.ts` into review-finalize helpers. The shape is wide;
 * keep this loose so orchestration wiring does not fight every callback signature.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CreateReviewFinalizeToolsDeps = Record<string, any>;
