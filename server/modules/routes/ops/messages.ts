import type { RuntimeContext } from "../../../types/runtime-context.ts";
// chat-routes and announcements-routes removed (Chat system deleted)
import { registerDecisionInboxRoutes } from "./messages/decision-inbox-routes.ts";
import { registerDirectiveAndInboxRoutes } from "./messages/directives-inbox-routes.ts";

export function registerOpsMessageRoutes(ctx: RuntimeContext): Record<string, never> {
  // Default policy: enforce latest AGENTS rules.
  // Set ENFORCE_DIRECTIVE_PROJECT_BINDING=0 only for temporary local debugging.
  const ENFORCE_DIRECTIVE_PROJECT_BINDING = String(process.env.ENFORCE_DIRECTIVE_PROJECT_BINDING ?? "1").trim() !== "0";
  const __ctx: RuntimeContext = ctx;
  const { app, db, broadcast } = __ctx;

  const IdempotencyConflictError = __ctx.IdempotencyConflictError;
  const StorageBusyError = __ctx.StorageBusyError;

  const resolveMessageIdempotencyKey = __ctx.resolveMessageIdempotencyKey;
  const recordMessageIngressAuditOr503 = __ctx.recordMessageIngressAuditOr503;
  const insertMessageWithIdempotency = __ctx.insertMessageWithIdempotency;
  const recordAcceptedIngressAuditOrRollback = __ctx.recordAcceptedIngressAuditOrRollback;

  const normalizeTextField = __ctx.normalizeTextField;
  const scheduleAgentReply = __ctx.scheduleAgentReply;
  const scheduleAnnouncementReplies = __ctx.scheduleAnnouncementReplies;
  const analyzeDirectivePolicy = __ctx.analyzeDirectivePolicy;
  const shouldExecuteDirectiveDelegation = __ctx.shouldExecuteDirectiveDelegation;
  const findTeamLeader = __ctx.findTeamLeader;
  const handleTaskDelegation = __ctx.handleTaskDelegation;
  const resetDirectChatState = __ctx.resetDirectChatState;
  const detectMentions = __ctx.detectMentions;

  const decisionInboxBridge = registerDecisionInboxRoutes(__ctx);

  // chat-routes and announcements-routes registration removed (Chat system deleted)

  registerDirectiveAndInboxRoutes(
    { app, db, broadcast },
    {
      IdempotencyConflictError,
      StorageBusyError,
      enforceDirectiveProjectBinding: ENFORCE_DIRECTIVE_PROJECT_BINDING,
      resolveMessageIdempotencyKey,
      recordMessageIngressAuditOr503,
      insertMessageWithIdempotency,
      recordAcceptedIngressAuditOrRollback,
      normalizeTextField,
      scheduleAnnouncementReplies,
      analyzeDirectivePolicy,
      shouldExecuteDirectiveDelegation,
      findTeamLeader,
      handleTaskDelegation,
      scheduleAgentReply,
      resetDirectChatState,
      detectMentions,
      tryHandleInboxDecisionReply: decisionInboxBridge.tryHandleInboxDecisionReply,
    },
  );

  return {};
}
