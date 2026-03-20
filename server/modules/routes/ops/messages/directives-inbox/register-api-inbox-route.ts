import logger from "../../../../../lib/logger.ts";
import { INBOX_WEBHOOK_SECRET } from "../../../../../config/runtime.ts";
import {
  resolveSessionAgentRouteFromDb,
  resolveSessionTargetRouteFromDb,
  resolveSourceChatRoute,
} from "../../../../../messenger/session-agent-routing.ts";
import { safeSecretEquals } from "../../../../../security/auth.ts";
import type { AgentRow, StoredMessage } from "../../../shared/types.ts";
import { buildAgentUpgradeRequiredPayload } from "./agent-upgrade-payload.ts";
import { routeInboxAfterNewMessageInserted } from "./inbox-after-message-inserted.ts";
import { tryRespondInboxSessionReset } from "./inbox-session-reset-branch.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";

export function registerApiInboxRoute(
  ctx: DirectiveAndInboxRouteCtx,
  deps: DirectiveAndInboxRouteDeps,
  findDirectiveLeader: (
    departmentId: string,
    projectId: string | null,
    scopedCandidateAgentIds: string[] | null,
  ) => AgentRow | null,
): void {
  const { app, db, broadcast } = ctx;
  const {
    IdempotencyConflictError,
    StorageBusyError,
    enforceDirectiveProjectBinding,
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
    tryHandleInboxDecisionReply,
  } = deps;

  app.post("/api/inbox", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const idempotencyKey = resolveMessageIdempotencyKey(req, body, "api.inbox");
    if (!INBOX_WEBHOOK_SECRET) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 503,
          detail: "inbox_webhook_secret_not_configured",
        })
      )
        return;
      return res.status(503).json({ error: "inbox_webhook_secret_not_configured" });
    }
    const providedSecret = req.header("x-inbox-secret") ?? "";
    if (!safeSecretEquals(providedSecret, INBOX_WEBHOOK_SECRET)) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 401,
          detail: "invalid_webhook_secret",
        })
      )
        return;
      return res.status(401).json({ error: "unauthorized" });
    }

    const text = body.text;
    if (!text || typeof text !== "string" || !text.trim()) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 400,
          detail: "text_required",
        })
      )
        return;
      return res.status(400).json({ error: "text_required" });
    }

    const raw = text.trimStart();
    const isDirective = raw.startsWith("$");
    const content = isDirective ? raw.slice(1).trimStart() : raw;
    const inboxProjectId = normalizeTextField(body.project_id);
    const inboxProjectPath = normalizeTextField(body.project_path);
    const inboxProjectContext = normalizeTextField(body.project_context);
    const inboxSource = normalizeTextField(body.source);
    const inboxChat = normalizeTextField(body.chat);
    const directiveSessionRoute = resolveSessionTargetRouteFromDb({
      db,
      source: inboxSource,
      chat: inboxChat,
    });
    const directiveFallbackRoute = resolveSourceChatRoute({
      source: inboxSource,
      chat: inboxChat,
    });
    const directiveReplyRoute = directiveSessionRoute ?? directiveFallbackRoute;
    if (!content) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 400,
          detail: "empty_content",
        })
      )
        return;
      return res.status(400).json({ error: "empty_content" });
    }

    if (enforceDirectiveProjectBinding && isDirective && !inboxProjectId) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 428,
          detail: "agent_upgrade_required:install_first",
        })
      )
        return;
      return res.status(428).json(buildAgentUpgradeRequiredPayload());
    }

    const sessionRoute = !isDirective
      ? resolveSessionAgentRouteFromDb({
          db,
          source: inboxSource,
          chat: inboxChat,
        })
      : null;
    const routedAgent = sessionRoute
      ? (db.prepare("SELECT id FROM agents WHERE id = ? LIMIT 1").get(sessionRoute.agentId) as
          | { id: string }
          | undefined)
      : null;
    const shouldRouteToSessionAgent = Boolean(sessionRoute && routedAgent);
    if (sessionRoute && !routedAgent) {
      logger.warn(
        `[AgentDesk] inbox session route ignored: mapped agent not found (agent_id=${sessionRoute.agentId}, channel=${sessionRoute.channel}, target=${sessionRoute.targetId})`,
      );
    }
    if (!isDirective && !shouldRouteToSessionAgent) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 422,
          detail: "session_agent_not_configured",
        })
      )
        return;
      return res.status(422).json({
        error: "session_agent_not_configured",
        message: "non-directive inbox messages require a mapped agent on messenger session",
      });
    }

    if (
      await tryRespondInboxSessionReset({
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
      })
    )
      return;

    const messageType = isDirective ? "directive" : "chat";
    let storedMessage: StoredMessage;
    let created: boolean;
    try {
      ({ message: storedMessage, created } = await insertMessageWithIdempotency({
        senderType: "client",
        senderId: null,
        receiverType: shouldRouteToSessionAgent ? "agent" : "all",
        receiverId: shouldRouteToSessionAgent && sessionRoute ? sessionRoute.agentId : null,
        content,
        messageType,
        idempotencyKey,
      }));
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        const conflictErr = err as { key: string };
        if (
          !recordMessageIngressAuditOr503(res, {
            endpoint: "/api/inbox",
            req,
            body,
            idempotencyKey,
            outcome: "idempotency_conflict",
            statusCode: 409,
            detail: "payload_mismatch",
          })
        )
          return;
        return res.status(409).json({ error: "idempotency_conflict", idempotency_key: conflictErr.key });
      }
      if (err instanceof StorageBusyError) {
        const busyErr = err as { operation: string; attempts: number };
        if (
          !recordMessageIngressAuditOr503(res, {
            endpoint: "/api/inbox",
            req,
            body,
            idempotencyKey,
            outcome: "storage_busy",
            statusCode: 503,
            detail: `operation=${busyErr.operation}, attempts=${busyErr.attempts}`,
          })
        )
          return;
        return res.status(503).json({ error: "storage_busy", retryable: true, operation: busyErr.operation });
      }
      throw err;
    }
    const msg = { ...storedMessage };

    if (!created) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/inbox",
          req,
          body,
          idempotencyKey,
          outcome: "duplicate",
          statusCode: 200,
          messageId: msg.id,
          detail: "idempotent_replay",
        })
      )
        return;
      return res.json({
        ok: true,
        id: msg.id,
        directive: isDirective,
        duplicate: true,
        routed: shouldRouteToSessionAgent ? "agent" : "announcement",
      });
    }

    await routeInboxAfterNewMessageInserted({
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
      announcementDeps: {
        normalizeTextField,
        scheduleAnnouncementReplies,
        analyzeDirectivePolicy,
        shouldExecuteDirectiveDelegation,
        findTeamLeader,
        handleTaskDelegation,
        detectMentions,
      },
    });
  });
}
