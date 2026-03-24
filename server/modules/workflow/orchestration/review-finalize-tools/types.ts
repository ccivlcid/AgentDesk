/**
 * Passed from `orchestration.ts` into review-finalize helpers.
 *
 * Each property is typed to match the minimal contract required by
 * finalize-approved-review, finish-review, reconcile-delegated-subtasks,
 * and finish-review-video-gate.
 */
import type { DatabaseSync } from "node:sqlite";

export interface CreateReviewFinalizeToolsDeps {
  db: DatabaseSync;
  nowMs: () => number;
  logsDir: string;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  getPreferredLanguage: () => string;
  pickL: (arr: string[][], lang: string) => string;
  l: (...groups: string[][]) => string[][];
  resolveLang: (text: string) => string;
  getProjectReviewGateSnapshot: (projectId: string) => {
    activeTotal: number;
    activeReview: number;
    rootReviewTotal: number;
    ready: boolean;
  };
  projectReviewGateNotifiedAt: Map<string, number>;
  notifyClient: (message: string, taskId?: string) => void;
  taskWorktrees: Map<string, { worktreePath: string; branchName: string; projectPath: string }>;
  mergeToDevAndCreatePR: (
    projectPath: string,
    taskId: string,
    githubRepo: string,
  ) => { success: boolean; message: string; conflicts?: string[] };
  mergeWorktree: (
    projectPath: string,
    taskId: string,
  ) => { success: boolean; message: string; conflicts?: string[] };
  cleanupWorktree: (projectPath: string, taskId: string) => void;
  findTeamLeader: (departmentId: string | null) => unknown;
  getAgentDisplayName: (agent: unknown, lang: string) => string;
  setTaskCreationAuditCompletion: (taskId: string, completed: boolean) => void;
  endTaskExecutionSession: (taskId: string, reason: string) => void;
  notifyTaskStatus: (taskId: string, taskTitle: string, status: string, lang: string) => void;
  refreshCliUsageData: () => Promise<unknown>;
  shouldDeferTaskReportUntilPlanningArchive: (task: {
    source_task_id?: string | null;
    department_id?: string | null;
  }) => boolean;
  emitTaskReportEvent: (taskId: string) => void;
  formatTaskSubtaskProgressSummary: (taskId: string, lang: string) => string;
  reviewRoundState: Map<string, unknown>;
  reviewInFlight: Set<string>;
  archivePlanningConsolidatedReport: (taskId: string) => Promise<void>;
  crossDeptNextCallbacks: Map<string, () => void>;
  recoverCrossDeptQueueAfterMissingCallback: (taskId: string) => void;
  subtaskDelegationCallbacks: Map<string, () => void>;
  startReviewConsensusMeeting: (
    taskId: string,
    taskTitle: string,
    departmentId: string | null,
    onApproved: () => void,
  ) => void;
  processSubtaskDelegations: (taskId: string, options?: { includeRender?: boolean }) => void;
  insertNotification: (params: {
    type: string;
    title: string;
    body?: string | null;
    task_id?: string | null;
    agent_id?: string | null;
  }) => string | void;
  sendAgentMessage?: (agentId: string, message: string) => void;
  prettyStreamJson?: (raw: string) => string;
  getWorktreeDiffSummary?: (projectPath: string, taskId: string) => string;
  hasVisibleDiffSummary?: (summary: string) => boolean;
}
