import type { Response } from "express";
import type { MessengerChannel } from "../../../../../messenger/channels.ts";
import { sendMessengerMessage, sendMessengerSessionMessage } from "../../../../../gateway/client.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";
import { buildSessionResetAck, isSessionResetCommand } from "./session-reset.ts";

type SessionRoute = {
  agentId: string;
  channel: MessengerChannel;
  sessionId: string;
  targetId: string;
};

type SessionResetParams = {
  res: Response;
  req: { get(name: string): string | undefined };
  body: Record<string, unknown>;
  idempotencyKey: string | null;
  content: string;
  isDirective: boolean;
  shouldRouteToSessionAgent: boolean;
  sessionRoute: SessionRoute | null;
  db: DirectiveAndInboxRouteCtx["db"];
  broadcast: DirectiveAndInboxRouteCtx["broadcast"];
  resetDirectChatState: DirectiveAndInboxRouteDeps["resetDirectChatState"];
  recordMessageIngressAuditOr503: DirectiveAndInboxRouteDeps["recordMessageIngressAuditOr503"];
};

export async function tryRespondInboxSessionReset(p: SessionResetParams): Promise<boolean> {
  const {
    res,
    req,
    body,
    idempotencyKey,
    content,
    isDirective,
    shouldRouteToSessionAgent,
    sessionRoute,
    db,
    broadcast,
    resetDirectChatState,
    recordMessageIngressAuditOr503,
  } = p;

  if (!isDirective && shouldRouteToSessionAgent && sessionRoute && isSessionResetCommand(content)) {
    const cleared = db
      .prepare(
        `
          DELETE FROM messages
          WHERE
            ((sender_type = 'client' AND receiver_type = 'agent' AND receiver_id = ?)
            OR (sender_type = 'agent' AND sender_id = ?))
            AND message_type NOT IN ('report', 'status_update')
        `,
      )
      .run(sessionRoute.agentId, sessionRoute.agentId);
    const resetState = resetDirectChatState(sessionRoute.agentId) as
      | { clearedPendingProjectBinding?: boolean }
      | undefined;
    const sessionKey = `${sessionRoute.channel}:${sessionRoute.sessionId}`;
    const ack = buildSessionResetAck(content);
    try {
      await sendMessengerSessionMessage(sessionKey, ack);
    } catch {
      await sendMessengerMessage({
        channel: sessionRoute.channel,
        targetId: sessionRoute.targetId,
        text: ack,
      }).catch(() => {
        // ignore acknowledgement send failures
      });
    }
    broadcast("messages_cleared", {
      scope: "agent",
      agent_id: sessionRoute.agentId,
      source: "messenger_session_reset",
    });
    if (
      !recordMessageIngressAuditOr503(res, {
        endpoint: "/api/inbox",
        req,
        body,
        idempotencyKey,
        outcome: "accepted",
        statusCode: 200,
        detail: `session_reset:deleted=${cleared.changes};pending_project_binding_cleared=${resetState?.clearedPendingProjectBinding === true}`,
      })
    )
      return true;
    res.json({
      ok: true,
      directive: false,
      routed: "session_reset",
      deleted: cleared.changes,
      session: {
        channel: sessionRoute.channel,
        session_id: sessionRoute.sessionId,
        target_id: sessionRoute.targetId,
      },
    });
    return true;
  }
  return false;
}
