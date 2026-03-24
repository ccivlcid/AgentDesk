import type { RuntimeContext, WorkflowAgentExports } from "../../types/runtime-context.ts";
import { initializeWorkflowAgentProviders } from "./agents/providers.ts";
import { createSubtaskRoutingTools } from "./agents/subtask-routing.ts";
import { createSubtaskSeedingTools } from "./agents/subtask-seeding.ts";
import { createCliRuntimeTools } from "./agents/cli-runtime.ts";

export function initializeWorkflowPartB(ctx: RuntimeContext): WorkflowAgentExports {
  const __ctx: RuntimeContext = ctx;

  const db = __ctx.db;
  const nowMs = __ctx.nowMs;
  const logsDir = __ctx.logsDir;
  const activeProcesses = __ctx.activeProcesses;
  const appendTaskLog = __ctx.appendTaskLog;
  const broadcast = __ctx.broadcast;
  const runAgentOneShot = __ctx.runAgentOneShot;
  const resolveProjectPath = __ctx.resolveProjectPath;
  const resolveLang = __ctx.resolveLang;
  const findTeamLeader = __ctx.findTeamLeader;
  const getDeptName = __ctx.getDeptName;
  const getPreferredLanguage = __ctx.getPreferredLanguage;
  const l = __ctx.l;
  const pickL = __ctx.pickL;
  const notifyClient = __ctx.notifyClient;
  const detectTargetDepartments = __ctx.detectTargetDepartments;
  const DEPT_KEYWORDS = __ctx.DEPT_KEYWORDS;
  const clearCliOutputDedup = __ctx.clearCliOutputDedup;
  const normalizeStreamChunk = __ctx.normalizeStreamChunk;
  const shouldSkipDuplicateCliOutput = __ctx.shouldSkipDuplicateCliOutput;
  const TASK_RUN_IDLE_TIMEOUT_MS = __ctx.TASK_RUN_IDLE_TIMEOUT_MS;
  const TASK_RUN_HARD_TIMEOUT_MS = __ctx.TASK_RUN_HARD_TIMEOUT_MS;
  const killPidTree = __ctx.killPidTree;
  const buildAgentArgs = __ctx.buildAgentArgs;

  const { analyzeSubtaskDepartment, rerouteSubtasksByPlanningLeader } = createSubtaskRoutingTools({
    db,
    DEPT_KEYWORDS,
    detectTargetDepartments,
    runAgentOneShot,
    resolveProjectPath,
    resolveLang,
    findTeamLeader,
    getDeptName,
    pickL,
    l,
    broadcast,
    appendTaskLog,
    notifyClient,
  });

  const { createSubtaskFromCli, completeSubtaskFromCli, seedApprovedPlanSubtasks, seedReviewRevisionSubtasks } =
    createSubtaskSeedingTools({
      db,
      nowMs,
      broadcast,
      analyzeSubtaskDepartment,
      rerouteSubtasksByPlanningLeader,
      findTeamLeader,
      getDeptName,
      getPreferredLanguage,
      resolveLang,
      l,
      pickL,
      appendTaskLog,
      notifyClient,
    });

  const { codexThreadToSubtask, spawnCliAgent } = createCliRuntimeTools({
    db,
    logsDir,
    buildAgentArgs,
    clearCliOutputDedup,
    normalizeStreamChunk,
    shouldSkipDuplicateCliOutput,
    broadcast,
    TASK_RUN_IDLE_TIMEOUT_MS,
    TASK_RUN_HARD_TIMEOUT_MS,
    killPidTree,
    appendTaskLog,
    activeProcesses,
    createSubtaskFromCli,
    completeSubtaskFromCli,
  });

  const workflowAgentProviders = initializeWorkflowAgentProviders(
    Object.assign(Object.create(__ctx), {
      createSubtaskFromCli,
      completeSubtaskFromCli,
      spawnCliAgent,
    }),
  );
  const {
    httpAgentCounter,
    getNextHttpAgentPid,
    cachedModels,
    MODELS_CACHE_TTL,
    normalizeOAuthProvider,
    getNextOAuthLabel,
    getOAuthAccounts,
    getPreferredOAuthAccounts,
    getDecryptedOAuthToken,
    getProviderModelConfig,
    refreshGoogleToken,
    exchangeCopilotToken,
    executeCopilotAgent,
    executeAntigravityAgent,
    executeApiProviderAgent,
    launchApiProviderAgent,
    launchHttpAgent,
    killPidTree: killPidTreeFromProvider,
    isPidAlive,
    interruptPidTree,
    appendTaskLog: appendTaskLogFromProvider,
    cachedCliStatus,
    CLI_STATUS_TTL,
    fetchClaudeUsage,
    fetchCodexUsage,
    fetchGeminiUsage,
    CLI_TOOLS,
    execWithTimeout,
    detectAllCli,
  } = workflowAgentProviders;

  Object.assign(__ctx, {
    rerouteSubtasksByPlanningLeader,
    createSubtaskFromCli,
    completeSubtaskFromCli,
  });

  return {
    analyzeSubtaskDepartment,
    seedApprovedPlanSubtasks,
    seedReviewRevisionSubtasks,
    codexThreadToSubtask,
    spawnCliAgent,
    httpAgentCounter,
    getNextHttpAgentPid,
    cachedModels,
    MODELS_CACHE_TTL,
    normalizeOAuthProvider,
    getNextOAuthLabel,
    getOAuthAccounts,
    getPreferredOAuthAccounts,
    getDecryptedOAuthToken,
    getProviderModelConfig,
    refreshGoogleToken,
    exchangeCopilotToken,
    executeCopilotAgent,
    executeAntigravityAgent,
    executeApiProviderAgent,
    launchApiProviderAgent,
    launchHttpAgent,
    killPidTree: killPidTreeFromProvider,
    isPidAlive,
    interruptPidTree,
    appendTaskLog: appendTaskLogFromProvider,
    cachedCliStatus,
    CLI_STATUS_TTL,
    fetchClaudeUsage,
    fetchCodexUsage,
    fetchGeminiUsage,
    CLI_TOOLS,
    execWithTimeout,
    detectAllCli,
  };
}
