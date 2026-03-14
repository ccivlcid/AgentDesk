/**
 * Extract and save task learnings (autonomous memory) on run complete.
 */

import { extractAndSaveTaskLearnings } from "../autonomous-memory.ts";

export type RunCompleteLearningsDeps = {
  db: unknown;
  nowMs: () => number;
  logsDir: string;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
};

export type TaskForLearnings = {
  title: string;
  assigned_agent_id: string | null;
  department_id: string | null;
  workflow_pack_key: string | null;
  project_id?: string | null;
};

/**
 * Run autonomous memory extraction for the completed task.
 * No-op on throw (caller may ignore).
 */
export function runExtractLearnings(
  taskId: string,
  task: TaskForLearnings,
  finalExitCode: number,
  result: string | null,
  deps: RunCompleteLearningsDeps,
): void {
  try {
    extractAndSaveTaskLearnings(
      { db: deps.db, nowMs: deps.nowMs, logsDir: deps.logsDir, appendTaskLog: deps.appendTaskLog },
      {
        taskId,
        taskTitle: task.title,
        agentId: task.assigned_agent_id,
        departmentId: task.department_id,
        workflowPackKey: task.workflow_pack_key,
        projectId: task.project_id ?? null,
        exitCode: finalExitCode,
        result,
      },
    );
  } catch {
    /* ignore memory extraction failure */
  }
}
