/**
 * Typed interface for the runtime context object assembled in server-main.ts.
 *
 * Module-level functions are initially typed as `(...args: any[]) => any`;
 * base-context helpers from server-main.ts carry full signatures.
 *
 * This file centralizes runtime wiring contracts used by workflow/routes
 * modules so strict type-check can validate cross-module integration.
 */

import type { ChildProcess } from "node:child_process";
import type { IncomingMessage } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import type { WebSocket } from "ws";
import type { RuntimeContextAutoAugmented } from "./runtime-context-auto-augmented";
import type {
  AgentRow,
  MeetingPromptOptions,
  MeetingReviewDecision,
  MeetingTranscriptEntry,
  OneShotRunOptions,
  OneShotRunResult,
} from "../modules/workflow/core/conversation-types.ts";
import type { Lang } from "./lang.ts";
import type { TaskExecutionSession } from "../modules/workflow/orchestration/session-review-tools.ts";

// ---------------------------------------------------------------------------
// Helper types (mirrors of unexported types in server-main.ts)
// ---------------------------------------------------------------------------

/** Argument to `resolveProjectPath` — project id string or task-like row */
export type ResolveProjectPathInput =
  | string
  | {
      project_id?: string | null;
      project_path?: string | null;
      description?: string | null;
      title?: string | null;
    };

export type MessageInsertInput = {
  senderType: string;
  senderId: string | null;
  receiverType: string;
  receiverId: string | null;
  content: string;
  messageType: string;
  taskId?: string | null;
  idempotencyKey?: string | null;
};

export type StoredMessage = {
  id: string;
  sender_type: string;
  sender_id: string | null;
  receiver_type: string;
  receiver_id: string | null;
  content: string;
  message_type: string;
  task_id: string | null;
  idempotency_key: string | null;
  created_at: number;
};

export type MessageIngressAuditOutcome =
  | "accepted"
  | "duplicate"
  | "idempotency_conflict"
  | "storage_busy"
  | "validation_error";

export type MessageIngressAuditInput = {
  endpoint: "/api/messages" | "/api/announcements" | "/api/directives" | "/api/inbox";
  req: {
    get(name: string): string | undefined;
    ip?: string;
    socket?: { remoteAddress?: string };
  };
  body: Record<string, unknown>;
  idempotencyKey: string | null;
  outcome: MessageIngressAuditOutcome;
  statusCode: number;
  messageId?: string | null;
  detail?: string | null;
};

export type TaskCreationAuditInput = {
  taskId: string;
  taskTitle: string;
  taskStatus?: string | null;
  departmentId?: string | null;
  assignedAgentId?: string | null;
  sourceTaskId?: string | null;
  taskType?: string | null;
  projectPath?: string | null;
  trigger: string;
  triggerDetail?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  req?: {
    get(name: string): string | undefined;
    ip?: string;
    socket?: { remoteAddress?: string };
  } | null;
  body?: Record<string, unknown> | null;
};

// ---------------------------------------------------------------------------
// BaseRuntimeContext — properties from the runtimeContext literal
// (server/server-main.ts)
// ---------------------------------------------------------------------------

export interface BaseRuntimeContext {
  app: Express;
  db: DatabaseSync;
  dbPath: string;
  logsDir: string;
  distDir: string;
  isProduction: boolean;

  // Helpers
  nowMs(): number;
  runInTransaction(fn: () => void): void;
  firstQueryValue(value: unknown): string | undefined;

  // Timing constants
  IN_PROGRESS_ORPHAN_GRACE_MS: number;
  IN_PROGRESS_ORPHAN_SWEEP_MS: number;
  SUBTASK_DELEGATION_SWEEP_MS: number;

  // OAuth
  ensureOAuthActiveAccount(provider: string): void;
  getActiveOAuthAccountIds(provider: string): string[];
  setActiveOAuthAccount(provider: string, accountId: string): void;
  setOAuthActiveAccounts(provider: string, accountIds: string[]): void;
  removeActiveOAuthAccount(provider: string, accountId: string): void;

  // Security
  isIncomingMessageAuthenticated(req: IncomingMessage): boolean;
  isIncomingMessageOriginTrusted(req: IncomingMessage): boolean;

  // Error classes (stored as constructors)
  IdempotencyConflictError: { new (key: string): Error & { readonly key: string } };
  StorageBusyError: {
    new (
      operation: string,
      attempts: number,
    ): Error & {
      readonly operation: string;
      readonly attempts: number;
    };
  };

  // Message idempotency
  insertMessageWithIdempotency(input: MessageInsertInput): Promise<{ message: StoredMessage; created: boolean }>;
  resolveMessageIdempotencyKey(
    req: { get(name: string): string | undefined },
    body: Record<string, unknown>,
    scope: string,
  ): string | null;
  withSqliteBusyRetry<T>(operation: string, fn: () => T): Promise<T>;

  // Audit
  recordMessageIngressAuditOr503(
    res: { status(code: number): { json(payload: unknown): unknown } },
    input: MessageIngressAuditInput,
  ): boolean;
  recordAcceptedIngressAuditOrRollback(
    res: { status(code: number): { json(payload: unknown): unknown } },
    input: Omit<MessageIngressAuditInput, "messageId">,
    messageId: string,
  ): Promise<boolean>;
  recordTaskCreationAudit(input: TaskCreationAuditInput): void;
  setTaskCreationAuditCompletion(taskId: string, completed: boolean): void;

  // Re-exported library constructors
  WebSocket: typeof import("ws").WebSocket;
  WebSocketServer: typeof import("ws").WebSocketServer;
  express: typeof import("express");

  // Mutable — starts empty, populated by routes
  DEPT_KEYWORDS: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// WorkflowCoreExports — returned from initializeWorkflowPartA
// (server/modules/workflow/core.ts)
// ---------------------------------------------------------------------------

export interface WorkflowCoreExports {
  // Data structures
  wsClients: Set<WebSocket>;
  activeProcesses: Map<string, ChildProcess>;
  stopRequestedTasks: Set<string>;
  stopRequestModeByTask: Map<string, "pause" | "cancel">;
  taskWorktrees: Map<string, { worktreePath: string; branchName: string; projectPath: string }>;
  TASK_RUN_IDLE_TIMEOUT_MS: number;
  TASK_RUN_HARD_TIMEOUT_MS: number;

  // Functions (broadcast / handleClientMessage / removeClient from ws/hub.ts)
  broadcast(type: string, payload: unknown): void;
  handleClientMessage: (ws: WebSocket, raw: string) => void;
  removeClient: (ws: WebSocket) => void;
  createWorktree: (projectPath: string, taskId: string, agentName: string, baseBranch?: string) => string | null;
  mergeWorktree: (
    projectPath: string,
    taskId: string,
  ) => { success: boolean; message: string; conflicts?: string[] };
  mergeToDevAndCreatePR: (
    projectPath: string,
    taskId: string,
    githubRepo: string,
  ) => { success: boolean; message: string; conflicts?: string[]; prUrl?: string };
  cleanupWorktree: (projectPath: string, taskId: string) => void;
  rollbackTaskWorktree: (taskId: string, reason: string) => boolean;
  getWorktreeDiffSummary: (projectPath: string, taskId: string) => string;
  hasExplicitWarningFixRequest: (...textParts: Array<string | null | undefined>) => boolean;
  buildTaskExecutionPrompt: (
    parts: Array<string | null | undefined>,
    opts?: { allowWarningFix?: boolean },
  ) => string;
  buildAvailableSkillsPromptBlock: (provider: string, projectId?: string | null) => string;
  generateProjectContext: (projectPath: string) => string;
  getRecentChanges: (projectPath: string, taskId: string) => string;
  ensureClaudeMd: (projectPath: string, worktreePath: string) => void;
  injectTaskContext: (params: {
    worktreePath: string;
    taskId: string;
    taskTitle: string;
    taskDescription: string | null;
    personaBlock?: string;
    apiPort?: number;
  }) => void;
  buildAgentArgs: (
    provider: string,
    model?: string,
    reasoningLevel?: string,
    opts?: { noTools?: boolean; maxTurns?: number },
  ) => string[];
  shouldSkipDuplicateCliOutput: (taskId: string, stream: "stdout" | "stderr", text: string) => boolean;
  clearCliOutputDedup: (taskId: string) => void;
  normalizeStreamChunk: (raw: Buffer | string, opts?: { dropCliNoise?: boolean }) => string;
  hasStructuredJsonLines: (raw: string) => boolean;
  getRecentConversationContext: (agentId: string, limit?: number) => string;
  getTaskContinuationContext: (taskId: string) => string;
  sleepMs(ms: number): Promise<void>;
  randomDelay: (minMs: number, maxMs: number) => number;
  getAgentDisplayName: (agent: unknown, lang: string) => string;
  chooseSafeReply: (
    run: { text?: string; error?: string },
    lang: string,
    kind: string,
    agent?: AgentRow,
  ) => string;
  summarizeForMeetingBubble: (text: string, maxChars?: number, lang?: Lang) => string;
  hasVisibleDiffSummary: (summary: string) => boolean;
  isDeferrableReviewHold: (text: string) => boolean;
  classifyMeetingReviewDecision: (text: string) => MeetingReviewDecision;
  wantsReviewRevision: (content: string) => boolean;
  findLatestTranscriptContentByAgent: (transcript: MeetingTranscriptEntry[], agentId: string) => string;
  buildMeetingPrompt: (agent: AgentRow, opts: MeetingPromptOptions) => string;
  buildDirectReplyPrompt: (
    agent: AgentRow,
    ceoMessage: string,
    messageType: string,
  ) => { prompt: string; lang: Lang };
  buildCliFailureMessage: (agent: AgentRow, lang: string, error?: string) => string;
  runAgentOneShot: (agent: AgentRow, prompt: string, opts?: OneShotRunOptions) => Promise<OneShotRunResult>;
}

// ---------------------------------------------------------------------------
// WorkflowAgentExports — returned from initializeWorkflowPartB
// (server/modules/workflow/agents.ts)
// ---------------------------------------------------------------------------

export interface WorkflowAgentExports {
  // Data structures
  httpAgentCounter: number;
  getNextHttpAgentPid: () => number;
  cachedModels: { data: Record<string, string[]>; loadedAt: number } | null;
  MODELS_CACHE_TTL: number;
  cachedCliStatus: { data: any; loadedAt: number } | null;
  CLI_STATUS_TTL: number;
  CLI_TOOLS: any[];

  // Functions
  analyzeSubtaskDepartment: (...args: any[]) => any;
  seedApprovedPlanSubtasks: (...args: any[]) => any;
  seedReviewRevisionSubtasks: (...args: any[]) => any;
  codexThreadToSubtask: Map<string, string>;
  spawnCliAgent: (...args: any[]) => any;
  normalizeOAuthProvider: (...args: any[]) => any;
  getNextOAuthLabel: (...args: any[]) => any;
  getOAuthAccounts: (...args: any[]) => any;
  getPreferredOAuthAccounts: (...args: any[]) => any;
  getDecryptedOAuthToken: (...args: any[]) => any;
  getProviderModelConfig: (...args: any[]) => any;
  refreshGoogleToken: (...args: any[]) => any;
  exchangeCopilotToken: (...args: any[]) => any;
  executeCopilotAgent: (...args: any[]) => any;
  executeAntigravityAgent: (...args: any[]) => any;
  executeApiProviderAgent: (...args: any[]) => any;
  launchApiProviderAgent: (...args: any[]) => any;
  launchHttpAgent: (...args: any[]) => any;
  killPidTree: (...args: any[]) => any;
  isPidAlive: (...args: any[]) => any;
  interruptPidTree: (...args: any[]) => any;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  fetchClaudeUsage: (...args: any[]) => any;
  fetchCodexUsage: (...args: any[]) => any;
  fetchGeminiUsage: (...args: any[]) => any;
  execWithTimeout: (...args: any[]) => any;
  detectAllCli: (...args: any[]) => any;
}

// ---------------------------------------------------------------------------
// WorkflowOrchestrationExports — returned from initializeWorkflowPartC
// (server/modules/workflow/orchestration.ts)
// ---------------------------------------------------------------------------

export interface WorkflowOrchestrationExports {
  // Data structures
  crossDeptNextCallbacks: Map<string, () => void>;
  subtaskDelegationCallbacks: Map<string, () => void>;
  subtaskDelegationDispatchInFlight: Set<string>;
  delegatedTaskToSubtask: Map<string, string>;
  subtaskDelegationCompletionNoticeSent: Set<string>;
  meetingPresenceUntil: Map<string, number>;
  meetingSeatIndexByAgent: Map<string, number>;
  meetingPhaseByAgent: Map<string, "kickoff" | "review">;
  meetingTaskIdByAgent: Map<string, string>;
  meetingReviewDecisionByAgent: Map<string, "reviewing" | "approved" | "hold">;
  taskExecutionSessions: Map<string, TaskExecutionSession>;

  // Functions
  ensureTaskExecutionSession: (taskId: string, agentId: string, provider: string) => TaskExecutionSession;
  endTaskExecutionSession: (taskId: string, reason: string) => void;
  isTaskWorkflowInterrupted: (taskId: string) => boolean;
  clearTaskWorkflowState: (taskId: string) => void;
  startProgressTimer: (taskId: string, taskTitle: string, departmentId: string | null) => void;
  stopProgressTimer: (taskId: string) => void;
  scheduleNextReviewRound: (taskId: string, taskTitle: string, currentRound: number, lang: Lang) => void;
  notifyClient: (content: string, taskId?: string | null, messageType?: string) => void;
  archivePlanningConsolidatedReport: (rootTaskId: string) => Promise<void>;
  isAgentInMeeting: (agentId: string) => boolean;
  startTaskExecutionForAgent: (taskId: string, execAgent: AgentRow, deptId: string | null, deptName: string) => void;
  startPlannedApprovalMeeting: (
    taskId: string,
    taskTitle: string,
    departmentId: string | null,
    onApproved: (planningNotes?: string[]) => void,
  ) => void;
  handleTaskRunComplete: (taskId: string, exitCode: number) => void;
  finishReview: (
    taskId: string,
    taskTitle: string,
    options?: { bypassProjectDecisionGate?: boolean; trigger?: string },
  ) => void;
  getQueueStatus: () => { running: number; queued: number; maxConcurrent: number };
}

// ---------------------------------------------------------------------------
// RouteCollabExports — returned from registerRoutesPartB
// (server/modules/routes/collab.ts)
// ---------------------------------------------------------------------------

export interface RouteCollabExports {
  DEPT_KEYWORDS: Record<string, string[]>;
  sendAgentMessage: (...args: any[]) => any;
  getPreferredLanguage: (...args: any[]) => any;
  resolveLang: (...args: any[]) => any;
  detectLang: (...args: any[]) => any;
  l: (...args: any[]) => any;
  pickL: (...args: any[]) => any;
  getRoleLabel: (...args: any[]) => any;
  scheduleAnnouncementReplies: (...args: any[]) => any;
  normalizeTextField: (...args: any[]) => any;
  analyzeDirectivePolicy: (...args: any[]) => any;
  shouldExecuteDirectiveDelegation: (...args: any[]) => any;
  detectTargetDepartments: (...args: any[]) => any;
  detectMentions: (...args: any[]) => any;
  handleMentionDelegation: (...args: any[]) => any;
  findTeamLeader: (...args: any[]) => any;
  getDeptName: (...args: any[]) => any;
  getDeptRoleConstraint: (...args: any[]) => any;
  formatTaskSubtaskProgressSummary: (...args: any[]) => any;
  processSubtaskDelegations: (...args: any[]) => any;
  reconcileCrossDeptSubtasks: (...args: any[]) => any;
  recoverCrossDeptQueueAfterMissingCallback: (...args: any[]) => any;
  resolveProjectPath: (input: ResolveProjectPathInput) => string;
  handleReportRequest: (...args: any[]) => any;
  handleTaskDelegation: (...args: any[]) => any;
  scheduleAgentReply: (...args: any[]) => any;
  resetDirectChatState: (...args: any[]) => any;
}

// ---------------------------------------------------------------------------
// RouteOpsExports — returned from registerRoutesPartC
// (server/modules/routes/ops.ts)
// ---------------------------------------------------------------------------

export interface RouteOpsExports {
  prettyStreamJson: (...args: any[]) => any;
  refreshCliUsageData: (...args: any[]) => any;
  recordAgentUsage: (...args: any[]) => any;
  checkCostBlockExecution: (...args: any[]) => any;
}

// ---------------------------------------------------------------------------
// Composite type — the fully-assembled runtime context
// ---------------------------------------------------------------------------

export type RuntimeContext = BaseRuntimeContext &
  WorkflowCoreExports &
  WorkflowAgentExports &
  WorkflowOrchestrationExports &
  RouteCollabExports &
  RouteOpsExports &
  RuntimeContextAutoAugmented;
