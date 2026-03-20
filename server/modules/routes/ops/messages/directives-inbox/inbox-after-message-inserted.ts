import type { Response } from "express";
import type { MessengerChannel } from "../../../../../messenger/channels.ts";
import type { AgentRow, DelegationOptions, StoredMessage } from "../../../shared/types.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";
import { respondInboxAnnouncementWithDelegation } from "./inbox-announcement-delegation.ts";

type SessionRoute = {
  agentId: string;
  channel: MessengerChannel;
  sessionId: string;
  targetId: string;
};

type AfterInsertParams = {
  res: Response;
  req: { get(name: string): string | undefined };
  body: Record<string, unknown>;
  idempotencyKey: string | null;
  db: DirectiveAndInboxRouteCtx["db"];
  broadcast: DirectiveAndInboxRouteCtx["broadcast"];
  msg: StoredMessage;
  content: string;
  isDirective: boolean;
  inboxProjectId: string;
  inboxProjectPath: string;
  inboxProjectContext: string;
  inboxSource: string;
  inboxChat: string;
  shouldRouteToSessionAgent: boolean;
  sessionRoute: SessionRoute | null;
  directiveReplyRoute: { channel: MessengerChannel; targetId: string } | null | undefined;
  directiveSessionRoute: { channel: MessengerChannel; sessionId: string } | null | undefined;
  recordAcceptedIngressAuditOrRollback: DirectiveAndInboxRouteDeps["recordAcceptedIngressAuditOrRollback"];
  tryHandleInboxDecisionReply?: DirectiveAndInboxRouteDeps["tryHandleInboxDecisionReply"];
  scheduleAgentReply: DirectiveAndInboxRouteDeps["scheduleAgentReply"];
  findDirectiveLeader: (
    departmentId: string,
    projectId: string | null,
    scopedCandidateAgentIds: string[] | null,
  ) => AgentRow | null;
  announcementDeps: Pick<
    DirectiveAndInboxRouteDeps,
    | "normalizeTextField"
    | "scheduleAnnouncementReplies"
    | "analyzeDirectivePolicy"
    | "shouldExecuteDirectiveDelegation"
    | "findTeamLeader"
    | "handleTaskDelegation"
    | "detectMentions"
  >;
};

export async function routeInboxAfterNewMessageInserted(p: AfterInsertParams): Promise<void> {
  const {
    res,
    req,
    body,
    idempotencyKey,
    db,
    broadcast,
    msg,
    content,
    isDirective,
    inboxProjectId,
    inboxProjectPath,
    inboxProjectContext,
    inboxSource,
    inboxChat,
    shouldRouteToSessionAgent,
    sessionRoute,
    directiveReplyRoute,
    directiveSessionRoute,
    recordAcceptedIngressAuditOrRollback,
    tryHandleInboxDecisionReply,
    scheduleAgentReply,
    findDirectiveLeader,
    announcementDeps,
  } = p;

  if (
    !(await recordAcceptedIngressAuditOrRollback(
      res,
      {
        endpoint: "/api/inbox",
        req,
        body,
        idempotencyKey,
        outcome: "accepted",
        statusCode: 200,
        detail: isDirective ? "created:directive" : "created:agent_session",
      },
      msg.id,
    ))
  )
    return;

  if (!isDirective && shouldRouteToSessionAgent && sessionRoute && tryHandleInboxDecisionReply) {
    const decisionResult = await tryHandleInboxDecisionReply({
      text: content,
      body,
      source: inboxSource,
      chat: inboxChat,
      channel: sessionRoute.channel,
      targetId: sessionRoute.targetId,
    });
    if (decisionResult.handled) {
      broadcast("new_message", msg);
      res.status(decisionResult.status).json({
        ok: decisionResult.status < 400,
        id: msg.id,
        directive: false,
        routed: "decision_reply",
        decision: decisionResult.payload,
        session: {
          channel: sessionRoute.channel,
          session_id: sessionRoute.sessionId,
          target_id: sessionRoute.targetId,
        },
      });
      return;
    }
  }

  if (!isDirective && shouldRouteToSessionAgent && sessionRoute) {
    broadcast("new_message", msg);
    const directReplyOptions: DelegationOptions = {
      projectId: inboxProjectId,
      projectPath: inboxProjectPath,
      projectContext: inboxProjectContext,
      messengerChannel: sessionRoute.channel,
      messengerTargetId: sessionRoute.targetId,
      messengerSessionKey: `${sessionRoute.channel}:${sessionRoute.sessionId}`,
    };
    scheduleAgentReply(sessionRoute.agentId, content, "chat", directReplyOptions);
    res.json({
      ok: true,
      id: msg.id,
      directive: false,
      routed: "agent",
      agent_id: sessionRoute.agentId,
      session: {
        channel: sessionRoute.channel,
        session_id: sessionRoute.sessionId,
        target_id: sessionRoute.targetId,
      },
    });
    return;
  }

  respondInboxAnnouncementWithDelegation({
    res,
    db,
    broadcast,
    msg,
    content,
    isDirective,
    body,
    inboxProjectId,
    inboxProjectPath,
    inboxProjectContext,
    directiveReplyRoute,
    directiveSessionRoute,
    deps: announcementDeps,
    findDirectiveLeader,
  });
}
