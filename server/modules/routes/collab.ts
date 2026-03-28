import type { ResolveProjectPathInput, RuntimeContext, RouteCollabExports } from "../../types/runtime-context.ts";
import { initializeCollabCoordination } from "./collab/coordination.ts";
import { createDirectChatHandlers, type AgentRow } from "./collab/direct-chat.ts";
import { initializeCollabLanguagePolicy } from "./collab/language-policy.ts";
import { createMessengerFormatAndSend } from "./collab/messenger-format-send.ts";
import { createTaskMessengerRouting } from "./collab/messenger-task-routing.ts";
import { createPartBDeptHelpers } from "./collab/part-b-dept-helpers.ts";
import { initializeProjectResolution } from "./collab/project-resolution.ts";
import { initializeSubtaskDelegation } from "./collab/subtask-delegation.ts";
import { createTaskDelegationHandler } from "./collab/task-delegation.ts";

export function registerRoutesPartB(ctx: RuntimeContext): RouteCollabExports {
  const __ctx: RuntimeContext = ctx;
  const appendTaskLog = __ctx.appendTaskLog;
  const activeProcesses = __ctx.activeProcesses;
  const broadcast = __ctx.broadcast;
  const buildCliFailureMessage = __ctx.buildCliFailureMessage;
  const buildDirectReplyPrompt = __ctx.buildDirectReplyPrompt;
  const executeApiProviderAgent = __ctx.executeApiProviderAgent;
  const executeCopilotAgent = __ctx.executeCopilotAgent;
  const executeAntigravityAgent = __ctx.executeAntigravityAgent;
  const buildTaskExecutionPrompt = __ctx.buildTaskExecutionPrompt;
  const chooseSafeReply = __ctx.chooseSafeReply;
  const createWorktree = __ctx.createWorktree;
  const db = __ctx.db;
  const delegatedTaskToSubtask = __ctx.delegatedTaskToSubtask;
  const ensureClaudeMd = __ctx.ensureClaudeMd;
  const ensureTaskExecutionSession = __ctx.ensureTaskExecutionSession;
  const finishReview = __ctx.finishReview;
  const getAgentDisplayName = __ctx.getAgentDisplayName;
  const getProviderModelConfig = __ctx.getProviderModelConfig;
  const getRecentConversationContext = __ctx.getRecentConversationContext;
  const handleTaskRunComplete = __ctx.handleTaskRunComplete;
  const hasExplicitWarningFixRequest = __ctx.hasExplicitWarningFixRequest;
  const getNextHttpAgentPid = __ctx.getNextHttpAgentPid;
  const isTaskWorkflowInterrupted = __ctx.isTaskWorkflowInterrupted;
  const launchApiProviderAgent = __ctx.launchApiProviderAgent;
  const launchHttpAgent = __ctx.launchHttpAgent;
  const logsDir = __ctx.logsDir;
  const notifyClient = __ctx.notifyClient;
  const nowMs = __ctx.nowMs;
  const randomDelay = __ctx.randomDelay;
  const recordTaskCreationAudit = __ctx.recordTaskCreationAudit;
  const runAgentOneShot = __ctx.runAgentOneShot;
  const seedApprovedPlanSubtasks = __ctx.seedApprovedPlanSubtasks;
  const spawnCliAgent = __ctx.spawnCliAgent;
  const startPlannedApprovalMeeting = __ctx.startPlannedApprovalMeeting;
  const startProgressTimer = __ctx.startProgressTimer;
  const startTaskExecutionForAgent = __ctx.startTaskExecutionForAgent;
  const stopRequestModeByTask = __ctx.stopRequestModeByTask;
  const stopRequestedTasks = __ctx.stopRequestedTasks;
  const subtaskDelegationCallbacks = __ctx.subtaskDelegationCallbacks;
  const subtaskDelegationCompletionNoticeSent = __ctx.subtaskDelegationCompletionNoticeSent;
  const subtaskDelegationDispatchInFlight = __ctx.subtaskDelegationDispatchInFlight;
  const resolveProjectPathBase = (input: ResolveProjectPathInput) => __ctx.resolveProjectPath(input);

  const { registerTaskMessengerRoute, resolveTaskMessengerRoute } = createTaskMessengerRouting({
    db,
    nowMs,
    appendTaskLog,
  });

  const { sendAgentMessage } = createMessengerFormatAndSend({
    db,
    broadcast,
    nowMs,
    resolveTaskMessengerRoute,
  });

  const {
    DEPT_KEYWORDS,
    pickRandom,
    getPreferredLanguage,
    resolveLang,
    detectLang,
    l,
    pickL,
    getFlairs,
    getRoleLabel,
    classifyIntent,
    analyzeDirectivePolicy,
    shouldExecuteDirectiveDelegation,
    detectTargetDepartments,
  } = initializeCollabLanguagePolicy({ db });

  const taskDelegationRef: {
    handle?: (leader: AgentRow, ceoMessage: string, ceoMsgId: string) => void;
  } = {};

  const {
    detectMentions,
    handleMentionDelegation,
    findBestSubordinate,
    findTeamLeader,
    getDeptName,
    getDeptRoleConstraint,
  } = createPartBDeptHelpers({
    db,
    getPreferredLanguage,
    sendAgentMessage,
    broadcast,
    pickL,
    l,
    getHandleTaskDelegation: () => taskDelegationRef.handle!,
  });

  // Announcement replies removed (Chat system deleted). No-op stub preserved for RuntimeContext compatibility.
  const scheduleAnnouncementReplies = (_announcement: string, _projectId?: string | null) => {
    /* removed */
  };

  const { normalizeTextField, resolveProjectFromOptions, buildRoundGoal } = initializeProjectResolution({ db });

  const {
    formatTaskSubtaskProgressSummary,
    hasOpenForeignSubtasks,
    processSubtaskDelegations,
    maybeNotifyAllSubtasksComplete,
  } = initializeSubtaskDelegation({
    db,
    l,
    pickL,
    resolveLang,
    getPreferredLanguage,
    getDeptName,
    getDeptRoleConstraint,
    getRecentConversationContext,
    getAgentDisplayName,
    buildTaskExecutionPrompt,
    hasExplicitWarningFixRequest,
    delegatedTaskToSubtask,
    subtaskDelegationCallbacks,
    subtaskDelegationDispatchInFlight,
    subtaskDelegationCompletionNoticeSent,
    notifyClient,
    sendAgentMessage,
    appendTaskLog,
    finishReview,
    findTeamLeader,
    findBestSubordinate,
    nowMs,
    broadcast,
    handleTaskRunComplete,
    stopRequestedTasks,
    stopRequestModeByTask,
    recordTaskCreationAudit,
    resolveProjectPath: resolveProjectPathBase,
    createWorktree,
    logsDir,
    ensureTaskExecutionSession,
    ensureClaudeMd,
    getProviderModelConfig,
    spawnCliAgent,
    getNextHttpAgentPid,
    launchApiProviderAgent,
    launchHttpAgent,
    startProgressTimer,
    startTaskExecutionForAgent,
    activeProcesses,
  });

  const collabCoordination = initializeCollabCoordination({
    ...__ctx,
    resolveLang,
    l,
    pickL,
    sendAgentMessage,
    findBestSubordinate,
    findTeamLeader,
    getDeptName,
    getDeptRoleConstraint,
    maybeNotifyAllSubtasksComplete,
  });
  const {
    reconcileCrossDeptSubtasks,
    recoverCrossDeptQueueAfterMissingCallback,
    startCrossDeptCooperation,
    detectProjectPath,
    resolveProjectPath,
    getLatestKnownProjectPath,
    getDefaultProjectRoot,
    resolveDirectiveProjectPath,
    stripReportRequestPrefix,
    detectReportOutputFormat,
    pickPlanningReportAssignee,
    handleReportRequest,
  } = collabCoordination;

  const handleTaskDelegation = createTaskDelegationHandler({
    db,
    nowMs,
    resolveLang,
    getDeptName,
    getRoleLabel,
    detectTargetDepartments,
    findBestSubordinate,
    normalizeTextField,
    resolveProjectFromOptions,
    buildRoundGoal,
    resolveDirectiveProjectPath,
    recordTaskCreationAudit,
    appendTaskLog,
    broadcast,
    l,
    pickL,
    notifyClient,
    isTaskWorkflowInterrupted,
    hasOpenForeignSubtasks,
    processSubtaskDelegations,
    startCrossDeptCooperation,
    seedApprovedPlanSubtasks,
    startPlannedApprovalMeeting,
    sendAgentMessage,
    registerTaskMessengerRoute,
    startTaskExecutionForAgent,
  });

  taskDelegationRef.handle = handleTaskDelegation;

  const { scheduleAgentReply, resetDirectChatState } = createDirectChatHandlers({
    db,
    logsDir,
    nowMs,
    randomDelay,
    broadcast,
    appendTaskLog,
    recordTaskCreationAudit,
    resolveLang,
    resolveProjectPath,
    detectProjectPath,
    normalizeTextField,
    resolveProjectFromOptions,
    buildRoundGoal,
    getDeptName,
    l,
    pickL,
    sendAgentMessage,
    registerTaskMessengerRoute,
    chooseSafeReply,
    buildCliFailureMessage,
    buildDirectReplyPrompt,
    runAgentOneShot,
    executeApiProviderAgent,
    executeCopilotAgent,
    executeAntigravityAgent,
    isTaskWorkflowInterrupted,
    startTaskExecutionForAgent,
    handleTaskDelegation,
  });

  return {
    DEPT_KEYWORDS,
    sendAgentMessage,
    getPreferredLanguage,
    resolveLang,
    detectLang,
    l,
    pickL,
    getRoleLabel,
    scheduleAnnouncementReplies,
    normalizeTextField,
    analyzeDirectivePolicy,
    shouldExecuteDirectiveDelegation,
    detectTargetDepartments,
    detectMentions,
    handleMentionDelegation,
    findTeamLeader,
    getDeptName,
    getDeptRoleConstraint,
    formatTaskSubtaskProgressSummary,
    processSubtaskDelegations,
    reconcileCrossDeptSubtasks,
    recoverCrossDeptQueueAfterMissingCallback,
    resolveProjectPath,
    handleReportRequest,
    handleTaskDelegation,
    scheduleAgentReply,
    resetDirectChatState,
  };
}
