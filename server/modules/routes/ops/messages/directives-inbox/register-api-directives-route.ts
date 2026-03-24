import {
  resolveSessionTargetRouteFromDb,
  resolveSourceChatRoute,
} from "../../../../../messenger/session-agent-routing.ts";
import type { AgentRow, DelegationOptions, StoredMessage } from "../../../shared/types.ts";
import { resolveDirectiveLeaderCandidateScope } from "../directive-leader-scope.ts";
import { buildAgentUpgradeRequiredPayload } from "./agent-upgrade-payload.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";

export function registerApiDirectivesRoute(
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
    handleTaskDelegation,
    detectMentions,
  } = deps;

  app.post("/api/directives", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const idempotencyKey = resolveMessageIdempotencyKey(req, body, "api.directives");
    const content = body.content;
    const explicitProjectId = normalizeTextField(body.project_id);
    const explicitProjectPath = normalizeTextField(body.project_path);
    const explicitProjectContext = normalizeTextField(body.project_context);
    const explicitSource = normalizeTextField(body.source);
    const explicitChat = normalizeTextField(body.chat);
    if (!content || typeof content !== "string") {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/directives",
          req,
          body,
          idempotencyKey,
          outcome: "validation_error",
          statusCode: 400,
          detail: "content_required",
        })
      )
        return;
      return res.status(400).json({ error: "content_required" });
    }

    if (enforceDirectiveProjectBinding && !explicitProjectId) {
      if (
        !recordMessageIngressAuditOr503(res, {
          endpoint: "/api/directives",
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

    let storedMessage: StoredMessage;
    let created: boolean;
    try {
      ({ message: storedMessage, created } = await insertMessageWithIdempotency({
        senderType: "client",
        senderId: null,
        receiverType: "all",
        receiverId: null,
        content,
        messageType: "directive",
        idempotencyKey,
      }));
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        const conflictErr = err as { key: string };
        if (
          !recordMessageIngressAuditOr503(res, {
            endpoint: "/api/directives",
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
            endpoint: "/api/directives",
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
          endpoint: "/api/directives",
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
      return res.json({ ok: true, message: msg, duplicate: true });
    }

    if (
      !(await recordAcceptedIngressAuditOrRollback(
        res,
        {
          endpoint: "/api/directives",
          req,
          body,
          idempotencyKey,
          outcome: "accepted",
          statusCode: 200,
          detail: "created",
        },
        msg.id,
      ))
    )
      return;
    broadcast("announcement", msg);

    scheduleAnnouncementReplies(content, explicitProjectId ?? null);
    const directivePolicy = analyzeDirectivePolicy(content);
    const explicitSkip = body.skipPlannedMeeting === true;
    const shouldDelegate = shouldExecuteDirectiveDelegation(directivePolicy, explicitSkip);
    const directiveSessionRoute = resolveSessionTargetRouteFromDb({
      db,
      source: explicitSource,
      chat: explicitChat,
    });
    const directiveFallbackRoute = resolveSourceChatRoute({
      source: explicitSource,
      chat: explicitChat,
    });
    const directiveReplyRoute = directiveSessionRoute ?? directiveFallbackRoute;
    const delegationOptions: DelegationOptions = {
      skipPlannedMeeting: explicitSkip || directivePolicy.skipPlannedMeeting,
      skipPlanSubtasks: explicitSkip || directivePolicy.skipPlanSubtasks,
      projectId: explicitProjectId,
      projectPath: explicitProjectPath,
      projectContext: explicitProjectContext,
      messengerChannel: directiveReplyRoute?.channel,
      messengerTargetId: directiveReplyRoute?.targetId,
      messengerSessionKey: directiveSessionRoute
        ? `${directiveSessionRoute.channel}:${directiveSessionRoute.sessionId}`
        : null,
    };
    const directiveLeaderScopeByDept = new Map<string, string[] | null>();
    const getDirectiveLeaderScope = (deptId: string): string[] | null => {
      const normalizedDeptId = normalizeTextField(deptId) ?? "planning";
      if (!directiveLeaderScopeByDept.has(normalizedDeptId)) {
        directiveLeaderScopeByDept.set(
          normalizedDeptId,
          resolveDirectiveLeaderCandidateScope(db, explicitProjectId ?? null, normalizedDeptId),
        );
      }
      return directiveLeaderScopeByDept.get(normalizedDeptId) ?? null;
    };

    if (shouldDelegate) {
      const planningLeader = findDirectiveLeader(
        "planning",
        explicitProjectId ?? null,
        getDirectiveLeaderScope("planning"),
      );
      if (planningLeader) {
        const delegationDelay = 3000 + Math.random() * 2000;
        setTimeout(() => {
          handleTaskDelegation(planningLeader, content, "", delegationOptions);
        }, delegationDelay);
      }

      const mentions = detectMentions(content);
      if (mentions.deptIds.length > 0 || mentions.agentIds.length > 0) {
        const mentionDelay = 5000 + Math.random() * 2000;
        setTimeout(() => {
          const processedDepts = new Set<string>(["planning"]);

          for (const deptId of mentions.deptIds) {
            if (processedDepts.has(deptId)) continue;
            processedDepts.add(deptId);
            const leader = findDirectiveLeader(deptId, explicitProjectId ?? null, getDirectiveLeaderScope(deptId));
            if (leader) {
              handleTaskDelegation(leader, content, "", delegationOptions);
            }
          }

          for (const agentId of mentions.agentIds) {
            const mentioned = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as AgentRow | undefined;
            if (mentioned?.department_id && !processedDepts.has(mentioned.department_id)) {
              processedDepts.add(mentioned.department_id);
              const leader = findDirectiveLeader(
                mentioned.department_id,
                explicitProjectId ?? null,
                getDirectiveLeaderScope(mentioned.department_id),
              );
              if (leader) {
                handleTaskDelegation(leader, content, "", delegationOptions);
              }
            }
          }
        }, mentionDelay);
      }
    }

    res.json({ ok: true, message: msg });
  });
}
