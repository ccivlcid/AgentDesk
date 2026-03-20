import type { RuntimeContext } from "../../../../../types/runtime-context.ts";
import type { DecisionReplyBridgeInput, DecisionReplyBridgeResult } from "../decision-inbox-routes.ts";

export type DirectiveAndInboxRouteCtx = Pick<RuntimeContext, "app" | "db" | "broadcast">;

export type DirectiveAndInboxRouteDeps = {
  IdempotencyConflictError: RuntimeContext["IdempotencyConflictError"];
  StorageBusyError: RuntimeContext["StorageBusyError"];
  enforceDirectiveProjectBinding: boolean;
  resolveMessageIdempotencyKey: RuntimeContext["resolveMessageIdempotencyKey"];
  recordMessageIngressAuditOr503: RuntimeContext["recordMessageIngressAuditOr503"];
  insertMessageWithIdempotency: RuntimeContext["insertMessageWithIdempotency"];
  recordAcceptedIngressAuditOrRollback: RuntimeContext["recordAcceptedIngressAuditOrRollback"];
  normalizeTextField: RuntimeContext["normalizeTextField"];
  scheduleAnnouncementReplies: RuntimeContext["scheduleAnnouncementReplies"];
  analyzeDirectivePolicy: RuntimeContext["analyzeDirectivePolicy"];
  shouldExecuteDirectiveDelegation: RuntimeContext["shouldExecuteDirectiveDelegation"];
  findTeamLeader: RuntimeContext["findTeamLeader"];
  handleTaskDelegation: RuntimeContext["handleTaskDelegation"];
  scheduleAgentReply: RuntimeContext["scheduleAgentReply"];
  resetDirectChatState: RuntimeContext["resetDirectChatState"];
  detectMentions: RuntimeContext["detectMentions"];
  tryHandleInboxDecisionReply?: (input: DecisionReplyBridgeInput) => Promise<DecisionReplyBridgeResult>;
};
