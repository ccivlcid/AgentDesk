import type { DecisionInboxRouteItem } from "../api";
import { normalizeLanguage, type UiLanguage } from "../i18n";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import { translateMessage } from "../../shared/i18n/index.ts";

function baseWorkflowDecisionItem(item: DecisionInboxRouteItem): Omit<DecisionInboxItem, "options"> {
  return {
    id: item.id,
    kind: item.kind,
    agentId: item.agent_id ?? null,
    agentName:
      item.agent_name ||
      (item.kind === "project_review_ready"
        ? item.project_name || item.project_id || "Planning Lead"
        : item.task_title || item.task_id || "Task"),
    agentNameKo:
      item.agent_name ||
      (item.kind === "project_review_ready"
        ? item.project_name || item.project_id || "PM"
        : item.task_title || item.task_id || "작업"),
    agentAvatar: item.agent_avatar ?? null,
    requestContent: item.summary,
    createdAt: item.created_at,
    taskId: item.task_id,
    projectId: item.project_id,
    projectName: item.project_name,
  };
}

function localizedOptionLabel(
  kind: DecisionInboxItem["kind"],
  action: string,
  number: number,
  language: UiLanguage,
): string {
  const tk = (key: Parameters<typeof translateMessage>[1]) => translateMessage(language, key);
  if (kind === "project_review_ready") {
    if (action === "start_project_review") {
      return tk("decision.projectReview.startMeeting");
    }
    if (action === "keep_waiting") {
      return tk("decision.projectReview.keepWaiting");
    }
    if (action === "add_followup_request") {
      return tk("decision.projectReview.addFollowup");
    }
  }
  if (kind === "task_timeout_resume") {
    if (action === "resume_timeout_task") {
      return tk("decision.timeout.resume");
    }
    if (action === "keep_inbox") {
      return tk("decision.timeout.keepInbox");
    }
  }
  if (kind === "task_review_ready") {
    if (action.startsWith("approve_task_review:")) {
      return tk("decision.taskReview.approveMerge");
    }
    if (action.startsWith("request_revision:")) {
      return tk("decision.taskReview.requestRevision");
    }
    if (action === "keep_waiting") {
      return tk("decision.taskReview.hold");
    }
  }
  if (kind === "review_round_pick" && action === "skip_to_next_round") {
    return tk("decision.reviewRound.skipToNext");
  }
  return `${number}. ${action}`;
}

export function mapWorkflowDecisionItemsRaw(items: DecisionInboxRouteItem[]): DecisionInboxItem[] {
  return items.map((item) => ({
    ...baseWorkflowDecisionItem(item),
    options: item.options.map((option) => ({
      number: option.number,
      label: option.label ?? option.action,
      action: option.action,
    })),
  }));
}

export function mapWorkflowDecisionItemsLocalized(
  items: DecisionInboxRouteItem[],
  language: string,
): DecisionInboxItem[] {
  const locale = normalizeLanguage(language);
  return items.map((item) => ({
    ...baseWorkflowDecisionItem(item),
    options: item.options.map((option) => ({
      number: option.number,
      label: option.label ?? localizedOptionLabel(item.kind, option.action, option.number, locale),
      action: option.action,
    })),
  }));
}
