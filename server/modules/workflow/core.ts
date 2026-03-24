import type { RuntimeContext, WorkflowCoreExports } from "../../types/runtime-context.ts";
import fs from "node:fs";
import type { ChildProcess } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import {
  CLI_OUTPUT_DEDUP_WINDOW_MS,
  readNonNegativeIntEnv,
  REVIEW_MAX_MEMO_ITEMS_PER_DEPT,
  REVIEW_MAX_MEMO_ITEMS_PER_ROUND,
  REVIEW_MAX_REMEDIATION_REQUESTS,
  REVIEW_MAX_REVISION_SIGNALS_PER_DEPT_PER_ROUND,
  REVIEW_MAX_REVISION_SIGNALS_PER_ROUND,
  REVIEW_MAX_ROUNDS,
} from "../../db/runtime.ts";
import { BUILTIN_GOOGLE_CLIENT_ID, BUILTIN_GOOGLE_CLIENT_SECRET, encryptSecret } from "../../oauth/helpers.ts";
import { notifyTaskStatus } from "../../gateway/client.ts";
import { createWsHub } from "../../ws/hub.ts";
import { createProjectContextTools } from "./core/project-context-tools.ts";
import { createCliTools } from "./core/cli-tools.ts";
import { createConversationContextTools } from "./core/conversation-context-tools.ts";
import { createMeetingPromptTools } from "./core/meeting-prompt-tools.ts";
import { createOneShotRunner } from "./core/one-shot-runner.ts";
import { createReplyCoreTools } from "./core/reply-core-tools.ts";
import { createWorktreeLifecycleTools, type WorktreeInfo } from "./core/worktree/lifecycle.ts";
import { createWorktreeMergeTools } from "./core/worktree/merge.ts";

export function initializeWorkflowPartA(ctx: RuntimeContext): WorkflowCoreExports {
  const __ctx: RuntimeContext = ctx;
  const db = __ctx.db;
  const ensureOAuthActiveAccount = __ctx.ensureOAuthActiveAccount;
  const getActiveOAuthAccountIds = __ctx.getActiveOAuthAccountIds;
  const logsDir = __ctx.logsDir;
  const nowMs = __ctx.nowMs;
  const CLI_STATUS_TTL = __ctx.CLI_STATUS_TTL;
  const CLI_TOOLS = __ctx.CLI_TOOLS;
  const MODELS_CACHE_TTL = __ctx.MODELS_CACHE_TTL;
  const analyzeSubtaskDepartment = __ctx.analyzeSubtaskDepartment;
  const appendTaskLog = __ctx.appendTaskLog;
  const cachedCliStatus = __ctx.cachedCliStatus;
  const cachedModels = __ctx.cachedModels;
  const clearTaskWorkflowState = __ctx.clearTaskWorkflowState;
  const crossDeptNextCallbacks = __ctx.crossDeptNextCallbacks;
  const delegatedTaskToSubtask = __ctx.delegatedTaskToSubtask;
  const detectAllCli = __ctx.detectAllCli;
  const endTaskExecutionSession = __ctx.endTaskExecutionSession;
  const ensureTaskExecutionSession = __ctx.ensureTaskExecutionSession;
  const execWithTimeout = __ctx.execWithTimeout;
  const fetchClaudeUsage = __ctx.fetchClaudeUsage;
  const fetchCodexUsage = __ctx.fetchCodexUsage;
  const fetchGeminiUsage = __ctx.fetchGeminiUsage;
  const finishReview = __ctx.finishReview;
  const getDecryptedOAuthToken = __ctx.getDecryptedOAuthToken;
  const getNextOAuthLabel = __ctx.getNextOAuthLabel;
  const getOAuthAccounts = __ctx.getOAuthAccounts;
  const getPreferredOAuthAccounts = __ctx.getPreferredOAuthAccounts;
  const getProviderModelConfig = __ctx.getProviderModelConfig;
  const handleTaskRunComplete = __ctx.handleTaskRunComplete;
  const httpAgentCounter = __ctx.httpAgentCounter;
  const interruptPidTree = __ctx.interruptPidTree;
  const isAgentInMeeting = __ctx.isAgentInMeeting;
  const isPidAlive = __ctx.isPidAlive;
  const isTaskWorkflowInterrupted = __ctx.isTaskWorkflowInterrupted;
  const killPidTree = __ctx.killPidTree;
  const launchHttpAgent = __ctx.launchHttpAgent;
  const meetingPhaseByAgent = __ctx.meetingPhaseByAgent;
  const meetingPresenceUntil = __ctx.meetingPresenceUntil;
  const meetingReviewDecisionByAgent = __ctx.meetingReviewDecisionByAgent;
  const meetingSeatIndexByAgent = __ctx.meetingSeatIndexByAgent;
  const meetingTaskIdByAgent = __ctx.meetingTaskIdByAgent;
  const normalizeOAuthProvider = __ctx.normalizeOAuthProvider;
  const notifyClient = __ctx.notifyClient;
  const refreshGoogleToken = __ctx.refreshGoogleToken;
  const seedApprovedPlanSubtasks = __ctx.seedApprovedPlanSubtasks;
  const spawnCliAgent = __ctx.spawnCliAgent;
  const startPlannedApprovalMeeting = __ctx.startPlannedApprovalMeeting;
  const startProgressTimer = __ctx.startProgressTimer;
  const startTaskExecutionForAgent = __ctx.startTaskExecutionForAgent;
  const stopProgressTimer = __ctx.stopProgressTimer;
  const subtaskDelegationCallbacks = __ctx.subtaskDelegationCallbacks;
  const subtaskDelegationCompletionNoticeSent = __ctx.subtaskDelegationCompletionNoticeSent;
  const subtaskDelegationDispatchInFlight = __ctx.subtaskDelegationDispatchInFlight;
  const taskExecutionSessions = __ctx.taskExecutionSessions;
  const findExplicitDepartmentByMention = __ctx.findExplicitDepartmentByMention;
  const plannerSubtaskRoutingInFlight = __ctx.plannerSubtaskRoutingInFlight;
  const normalizeDeptAliasToken = __ctx.normalizeDeptAliasToken;
  const normalizePlannerTargetDeptId = __ctx.normalizePlannerTargetDeptId;
  const parsePlannerSubtaskAssignments = __ctx.parsePlannerSubtaskAssignments;
  const rerouteSubtasksByPlanningLeader = __ctx.rerouteSubtasksByPlanningLeader;
  const createSubtaskFromCli = __ctx.createSubtaskFromCli;
  const completeSubtaskFromCli = __ctx.completeSubtaskFromCli;
  const seedReviewRevisionSubtasks = __ctx.seedReviewRevisionSubtasks;
  const codexThreadToSubtask = __ctx.codexThreadToSubtask;
  const parseAndCreateSubtasks = __ctx.parseAndCreateSubtasks;
  const ANTIGRAVITY_ENDPOINTS = __ctx.ANTIGRAVITY_ENDPOINTS;
  const ANTIGRAVITY_DEFAULT_PROJECT = __ctx.ANTIGRAVITY_DEFAULT_PROJECT;
  const copilotTokenCache = __ctx.copilotTokenCache;
  const antigravityProjectCache = __ctx.antigravityProjectCache;
  const oauthProviderPrefix = __ctx.oauthProviderPrefix;
  const getOAuthAccountDisplayName = __ctx.getOAuthAccountDisplayName;
  const getOAuthAutoSwapEnabled = __ctx.getOAuthAutoSwapEnabled;
  const oauthDispatchCursor = __ctx.oauthDispatchCursor;
  const rotateOAuthAccounts = __ctx.rotateOAuthAccounts;
  const prioritizeOAuthAccount = __ctx.prioritizeOAuthAccount;
  const markOAuthAccountFailure = __ctx.markOAuthAccountFailure;
  const markOAuthAccountSuccess = __ctx.markOAuthAccountSuccess;
  const exchangeCopilotToken = __ctx.exchangeCopilotToken;
  const loadCodeAssistProject = __ctx.loadCodeAssistProject;
  const parseHttpAgentSubtasks = __ctx.parseHttpAgentSubtasks;
  const parseSSEStream = __ctx.parseSSEStream;
  const parseGeminiSSEStream = __ctx.parseGeminiSSEStream;
  const resolveCopilotModel = __ctx.resolveCopilotModel;
  const resolveAntigravityModel = __ctx.resolveAntigravityModel;
  const executeCopilotAgent = __ctx.executeCopilotAgent;
  const executeAntigravityAgent = __ctx.executeAntigravityAgent;
  const executeApiProviderAgent = __ctx.executeApiProviderAgent;
  const jsonHasKey = __ctx.jsonHasKey;
  const fileExistsNonEmpty = __ctx.fileExistsNonEmpty;
  const readClaudeToken = __ctx.readClaudeToken;
  const readCodexTokens = __ctx.readCodexTokens;
  const GEMINI_OAUTH_CLIENT_ID = __ctx.GEMINI_OAUTH_CLIENT_ID;
  const GEMINI_OAUTH_CLIENT_SECRET = __ctx.GEMINI_OAUTH_CLIENT_SECRET;
  const readGeminiCredsFromKeychain = __ctx.readGeminiCredsFromKeychain;
  const readGeminiCredsFromFile = __ctx.readGeminiCredsFromFile;
  const readGeminiCreds = __ctx.readGeminiCreds;
  const freshGeminiToken = __ctx.freshGeminiToken;
  const geminiProjectCache = __ctx.geminiProjectCache;
  const GEMINI_PROJECT_TTL = __ctx.GEMINI_PROJECT_TTL;
  const getGeminiProjectId = __ctx.getGeminiProjectId;
  const detectCliTool = __ctx.detectCliTool;
  const progressTimers = __ctx.progressTimers;
  const reviewRoundState = __ctx.reviewRoundState;
  const reviewInFlight = __ctx.reviewInFlight;
  const getTaskStatusById = __ctx.getTaskStatusById;
  const getReviewRoundMode = __ctx.getReviewRoundMode;
  const scheduleNextReviewRound = __ctx.scheduleNextReviewRound;
  const getLeadersByDepartmentIds = __ctx.getLeadersByDepartmentIds;
  const getAllActiveTeamLeaders = __ctx.getAllActiveTeamLeaders;
  const getTaskRelatedDepartmentIds = __ctx.getTaskRelatedDepartmentIds;
  const getTaskReviewLeaders = __ctx.getTaskReviewLeaders;
  const beginMeetingMinutes = __ctx.beginMeetingMinutes;
  const appendMeetingMinuteEntry = __ctx.appendMeetingMinuteEntry;
  const finishMeetingMinutes = __ctx.finishMeetingMinutes;
  const normalizeRevisionMemoNote = __ctx.normalizeRevisionMemoNote;
  const reserveReviewRevisionMemoItems = __ctx.reserveReviewRevisionMemoItems;
  const loadRecentReviewRevisionMemoItems = __ctx.loadRecentReviewRevisionMemoItems;
  const collectRevisionMemoItems = __ctx.collectRevisionMemoItems;
  const collectPlannedActionItems = __ctx.collectPlannedActionItems;
  const appendTaskProjectMemo = __ctx.appendTaskProjectMemo;
  const appendTaskReviewFinalMemo = __ctx.appendTaskReviewFinalMemo;
  const markAgentInMeeting = __ctx.markAgentInMeeting;
  const callLeadersToClientOffice = __ctx.callLeadersToClientOffice;
  const dismissLeadersFromClientOffice = __ctx.dismissLeadersFromClientOffice;
  const emitMeetingSpeech = __ctx.emitMeetingSpeech;
  const startReviewConsensusMeeting = __ctx.startReviewConsensusMeeting;
  const DEPT_KEYWORDS = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return (__ctx.DEPT_KEYWORDS ?? {})[prop];
      },
    },
  );
  const detectLang = __ctx.detectLang;
  const detectTargetDepartments = __ctx.detectTargetDepartments;
  const findTeamLeader = __ctx.findTeamLeader;
  const formatTaskSubtaskProgressSummary = __ctx.formatTaskSubtaskProgressSummary;
  const getDeptName = __ctx.getDeptName;
  const getDeptRoleConstraint = __ctx.getDeptRoleConstraint;
  const getPreferredLanguage = __ctx.getPreferredLanguage;
  const getRoleLabel = __ctx.getRoleLabel;
  const l = __ctx.l;
  const pickL = __ctx.pickL;
  const prettyStreamJson = __ctx.prettyStreamJson;
  const processSubtaskDelegations = __ctx.processSubtaskDelegations;
  const recoverCrossDeptQueueAfterMissingCallback = __ctx.recoverCrossDeptQueueAfterMissingCallback;
  const refreshCliUsageData = __ctx.refreshCliUsageData;
  const resolveLang = __ctx.resolveLang;
  const resolveProjectPath = __ctx.resolveProjectPath;
  const sendAgentMessage = __ctx.sendAgentMessage;

  // ---------------------------------------------------------------------------
  // Track active child processes
  // ---------------------------------------------------------------------------
  const activeProcesses = new Map<string, ChildProcess>();
  const stopRequestedTasks = new Set<string>();
  const stopRequestModeByTask = new Map<string, "pause" | "cancel">();

  function readTimeoutMsEnv(name: string, fallbackMs: number): number {
    return readNonNegativeIntEnv(name, fallbackMs);
  }

  const TASK_RUN_IDLE_TIMEOUT_MS = readTimeoutMsEnv("TASK_RUN_IDLE_TIMEOUT_MS", 15 * 60_000);
  const TASK_RUN_HARD_TIMEOUT_MS = readTimeoutMsEnv("TASK_RUN_HARD_TIMEOUT_MS", 0);

  // ---------------------------------------------------------------------------
  // Git Worktree support — agent isolation per task
  // ---------------------------------------------------------------------------
  const taskWorktrees = new Map<string, WorktreeInfo>();

  const { isGitRepo, createWorktree, cleanupWorktree } = createWorktreeLifecycleTools({
    appendTaskLog,
    taskWorktrees,
  });

  const { mergeWorktree, mergeToDevAndCreatePR, rollbackTaskWorktree, getWorktreeDiffSummary, hasVisibleDiffSummary } =
    createWorktreeMergeTools({
      db,
      taskWorktrees,
      appendTaskLog,
      cleanupWorktree,
      resolveLang,
      l,
      pickL,
    });

  const {
    hasExplicitWarningFixRequest,
    buildTaskExecutionPrompt,
    buildAvailableSkillsPromptBlock,
    generateProjectContext,
    getRecentChanges,
    ensureClaudeMd,
    injectTaskContext,
  } = createProjectContextTools({
    db,
    isGitRepo,
    taskWorktrees,
  });

  // ---------------------------------------------------------------------------
  // WebSocket setup
  // ---------------------------------------------------------------------------
  const { wsClients, broadcast, handleClientMessage, removeClient } = createWsHub(nowMs, appendTaskLog);

  // ---------------------------------------------------------------------------
  // CLI spawn helpers (ported from agentdesk-kanban)
  // ---------------------------------------------------------------------------
  const {
    ANSI_ESCAPE_REGEX,
    CLI_SPINNER_LINE_REGEX,
    cliOutputDedupCache,
    withCliPathFallback,
    buildAgentArgs,
    shouldSkipDuplicateCliOutput,
    clearCliOutputDedup,
    normalizeStreamChunk,
    hasStructuredJsonLines,
  } = createCliTools({
    nowMs,
    cliOutputDedupWindowMs: CLI_OUTPUT_DEDUP_WINDOW_MS,
  });

  const {
    normalizeMeetingLang,
    sleepMs,
    randomDelay,
    getAgentDisplayName,
    localeInstruction,
    normalizeConversationReply,
    isInternalWorkNarration,
    fallbackTurnReply,
    chooseSafeReply,
    summarizeForMeetingBubble,
    isMvpDeferralSignal,
    isHardBlockSignal,
    hasApprovalAgreementSignal,
    isDeferrableReviewHold,
    classifyMeetingReviewDecision,
    wantsReviewRevision,
    findLatestTranscriptContentByAgent,
    compactTaskDescriptionForMeeting,
    formatMeetingTranscript,
  } = createReplyCoreTools({
    detectLang,
    getPreferredLanguage,
    pickL,
    prettyStreamJson,
  });

  const { getRecentConversationContext, extractLatestProjectMemoBlock, getTaskContinuationContext } =
    createConversationContextTools({
      db,
      normalizeStreamChunk,
      summarizeForMeetingBubble,
    });

  const { buildMeetingPrompt, buildDirectReplyPrompt, buildCliFailureMessage } = createMeetingPromptTools({
    getDeptName,
    getDeptRoleConstraint,
    getRoleLabel,
    getRecentConversationContext,
    getAgentDisplayName,
    formatMeetingTranscript,
    compactTaskDescriptionForMeeting,
    normalizeMeetingLang,
    localeInstruction,
    resolveLang,
  });

  const { runAgentOneShot } = createOneShotRunner({
    logsDir,
    broadcast,
    getProviderModelConfig,
    executeApiProviderAgent,
    executeCopilotAgent,
    executeAntigravityAgent,
    killPidTree,
    prettyStreamJson,
    getPreferredLanguage,
    normalizeStreamChunk,
    hasStructuredJsonLines,
    normalizeConversationReply,
    buildAgentArgs,
    withCliPathFallback,
  });

  return {
    wsClients,
    broadcast,
    handleClientMessage,
    removeClient,
    activeProcesses,
    stopRequestedTasks,
    stopRequestModeByTask,
    TASK_RUN_IDLE_TIMEOUT_MS,
    TASK_RUN_HARD_TIMEOUT_MS,
    taskWorktrees,
    createWorktree,
    mergeWorktree,
    mergeToDevAndCreatePR,
    cleanupWorktree,
    rollbackTaskWorktree,
    getWorktreeDiffSummary,
    hasExplicitWarningFixRequest,
    buildTaskExecutionPrompt,
    buildAvailableSkillsPromptBlock,
    generateProjectContext,
    getRecentChanges,
    ensureClaudeMd,
    injectTaskContext,
    buildAgentArgs,
    shouldSkipDuplicateCliOutput,
    clearCliOutputDedup,
    normalizeStreamChunk,
    hasStructuredJsonLines,
    getRecentConversationContext,
    getTaskContinuationContext,
    sleepMs,
    randomDelay,
    getAgentDisplayName,
    chooseSafeReply,
    summarizeForMeetingBubble,
    hasVisibleDiffSummary,
    isDeferrableReviewHold,
    classifyMeetingReviewDecision,
    wantsReviewRevision,
    findLatestTranscriptContentByAgent,
    buildMeetingPrompt,
    buildDirectReplyPrompt,
    buildCliFailureMessage,
    runAgentOneShot,
  };
}
