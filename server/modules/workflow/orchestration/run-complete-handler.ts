/**
 * Run-complete handler factory: wires deps and exports handleTaskRunComplete.
 * Implementation lives in ./run-complete-handler/ (video-artifact, gates, learnings, notifications, core).
 */

import { createRunCompleteHandler as createHandler } from "./run-complete-handler/core.ts";

type CreateRunCompleteHandlerDeps = Record<string, unknown>;

export function createRunCompleteHandler(deps: CreateRunCompleteHandlerDeps) {
  return createHandler(deps);
}
