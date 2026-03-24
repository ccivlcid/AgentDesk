import type { Response } from "express";
import type { MessengerChannel } from "../../../../../messenger/channels.ts";
import type { AgentRow, DelegationOptions, StoredMessage } from "../../../shared/types.ts";
import { resolveDirectiveLeaderCandidateScope } from "../directive-leader-scope.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";

type AnnouncementDelegationParams = {
  res: Response;
  db: DirectiveAndInboxRouteCtx["db"];
  broadcast: DirectiveAndInboxRouteCtx["broadcast"];
  msg: StoredMessage;
  content: string;
  isDirective: boolean;
  body: Record<string, unknown>;
  inboxProjectId: string;
  inboxProjectPath: string;
  inboxProjectContext: string;
  directiveReplyRoute: { channel: MessengerChannel; targetId: string } | null | undefined;
  directiveSessionRoute: { channel: MessengerChannel; sessionId: string } | null | undefined;
  deps: Pick<
    DirectiveAndInboxRouteDeps,
    | "normalizeTextField"
    | "scheduleAnnouncementReplies"
    | "analyzeDirectivePolicy"
    | "shouldExecuteDirectiveDelegation"
    | "findTeamLeader"
    | "handleTaskDelegation"
    | "detectMentions"
  >;
  findDirectiveLeader: (
    departmentId: string,
    projectId: string | null,
    scopedCandidateAgentIds: string[] | null,
  ) => AgentRow | null;
};

export function respondInboxAnnouncementWithDelegation(p: AnnouncementDelegationParams): void {
  const {
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
    deps,
    findDirectiveLeader,
  } = p;
  const {
    normalizeTextField,
    scheduleAnnouncementReplies,
    analyzeDirectivePolicy,
    shouldExecuteDirectiveDelegation,
    findTeamLeader,
    handleTaskDelegation,
    detectMentions,
  } = deps;

  broadcast("announcement", msg);

  scheduleAnnouncementReplies(content, inboxProjectId ?? null);
  const directivePolicy = isDirective ? analyzeDirectivePolicy(content) : null;
  const inboxExplicitSkip = body.skipPlannedMeeting === true;
  const shouldDelegateDirective =
    isDirective && directivePolicy ? shouldExecuteDirectiveDelegation(directivePolicy, inboxExplicitSkip) : false;
  const directiveDelegationOptions: DelegationOptions = {
    skipPlannedMeeting: inboxExplicitSkip || !!directivePolicy?.skipPlannedMeeting,
    skipPlanSubtasks: inboxExplicitSkip || !!directivePolicy?.skipPlanSubtasks,
    projectId: inboxProjectId,
    projectPath: inboxProjectPath,
    projectContext: inboxProjectContext,
    messengerChannel: directiveReplyRoute?.channel,
    messengerTargetId: directiveReplyRoute?.targetId,
    messengerSessionKey: directiveSessionRoute
      ? `${directiveSessionRoute.channel}:${directiveSessionRoute.sessionId}`
      : null,
  };
  const directiveLeaderScopeByDept = new Map<string, string[] | null>();
  const getDirectiveLeaderScope = (deptId: string): string[] | null => {
    if (!(shouldDelegateDirective || isDirective)) return null;
    const normalizedDeptId = normalizeTextField(deptId) ?? "planning";
    if (!directiveLeaderScopeByDept.has(normalizedDeptId)) {
      directiveLeaderScopeByDept.set(
        normalizedDeptId,
        resolveDirectiveLeaderCandidateScope(db, inboxProjectId ?? null, normalizedDeptId),
      );
    }
    return directiveLeaderScopeByDept.get(normalizedDeptId) ?? null;
  };

  if (shouldDelegateDirective) {
    const planningLeader = findDirectiveLeader(
      "planning",
      inboxProjectId ?? null,
      getDirectiveLeaderScope("planning"),
    );
    if (planningLeader) {
      const delegationDelay = 3000 + Math.random() * 2000;
      setTimeout(() => {
        handleTaskDelegation(planningLeader, content, "", directiveDelegationOptions);
      }, delegationDelay);
    }
  }

  const mentions = detectMentions(content);
  const shouldHandleMentions = !isDirective || shouldDelegateDirective;
  if (shouldHandleMentions && (mentions.deptIds.length > 0 || mentions.agentIds.length > 0)) {
    const mentionDelay = 5000 + Math.random() * 2000;
    setTimeout(() => {
      const processedDepts = new Set<string>(isDirective ? ["planning"] : []);

      for (const deptId of mentions.deptIds) {
        if (processedDepts.has(deptId)) continue;
        processedDepts.add(deptId);
        const leader = isDirective
          ? findDirectiveLeader(deptId, inboxProjectId ?? null, getDirectiveLeaderScope(deptId))
          : findTeamLeader(deptId);
        if (leader) {
          handleTaskDelegation(leader, content, "", isDirective ? directiveDelegationOptions : {});
        }
      }

      for (const agentId of mentions.agentIds) {
        const mentioned = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as AgentRow | undefined;
        if (mentioned?.department_id && !processedDepts.has(mentioned.department_id)) {
          processedDepts.add(mentioned.department_id);
          const leader =
            isDirective && mentioned.department_id
              ? findDirectiveLeader(
                  mentioned.department_id,
                  inboxProjectId ?? null,
                  getDirectiveLeaderScope(mentioned.department_id),
                )
              : findTeamLeader(mentioned.department_id);
          if (leader) {
            handleTaskDelegation(leader, content, "", isDirective ? directiveDelegationOptions : {});
          }
        }
      }
    }, mentionDelay);
  }

  res.json({ ok: true, id: msg.id, directive: isDirective, routed: "announcement" });
}
