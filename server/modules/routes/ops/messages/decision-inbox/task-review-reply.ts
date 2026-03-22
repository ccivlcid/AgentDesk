/**
 * Per-task review decision reply handler.
 *
 * Handles approve/revision/hold actions for individual task review items
 * (kind: "task_review_ready").
 */

import type { DatabaseSync } from "node:sqlite";
import type { Response } from "express";
import type { DecisionInboxRouteItem, DecisionOption } from "./types.ts";
import type { AgentRow } from "../../../shared/types.ts";

interface TaskReviewReplyDeps {
  db: DatabaseSync;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
  nowMs: () => number;
  broadcast: (type: string, payload: unknown) => void;
  finishReview: (
    taskId: string,
    taskTitle: string,
    options?: { bypassProjectDecisionGate?: boolean; trigger?: string },
  ) => void;
  openSupplementRound: (
    taskId: string,
    assignedAgentId: string | null,
    fallbackDepartmentId: string | null,
    logPrefix?: string,
  ) => { started: boolean; reason: string };
  normalizeTextField: (value: unknown) => string | null;
  startTaskExecutionForAgent: (
    taskId: string,
    agent: AgentRow,
    departmentId: string | null,
    departmentName: string,
  ) => void;
}

interface TaskReviewReplyInput {
  res: Response;
  currentItem: DecisionInboxRouteItem;
  selectedOption: DecisionOption;
  deps: TaskReviewReplyDeps;
}

export function handleTaskReviewDecisionReply(input: TaskReviewReplyInput): boolean {
  const { res, currentItem, selectedOption, deps } = input;
  if (currentItem.kind !== "task_review_ready") return false;

  const { db, appendTaskLog, nowMs, broadcast, finishReview } = deps;
  const action = selectedOption.action;
  const taskId = currentItem.task_id;
  if (!taskId) {
    res.status(400).json({ error: "task_id_required" });
    return true;
  }

  const task = db
    .prepare("SELECT id, title, assigned_agent_id, department_id FROM tasks WHERE id = ? AND status = 'review'")
    .get(taskId) as { id: string; title: string; assigned_agent_id: string | null; department_id: string | null } | undefined;

  if (!task) {
    res.status(404).json({ error: "task_not_found_or_not_in_review" });
    return true;
  }

  // ── Approve & Merge ──
  if (action.startsWith("approve_task_review:")) {
    appendTaskLog(taskId, "pm_oversight", `PM approved: ${task.title}`);
    finishReview(taskId, task.title, { bypassProjectDecisionGate: true, trigger: "per_task_review" });

    broadcast("pm_activity", {
      projectId: currentItem.project_id,
      taskId,
      action: "approved",
      agentName: currentItem.agent_name,
      summary: `PM approved '${task.title}'`,
      timestamp: nowMs(),
    });

    res.json({ ok: true, resolved: true, action: "approve_task_review", task_id: taskId });
    return true;
  }

  // ── Request Revision ──
  if (action.startsWith("request_revision:")) {
    appendTaskLog(taskId, "pm_oversight", `PM requested revision: ${task.title}`);

    // Reopen as supplement round → re-execute
    const result = deps.openSupplementRound(taskId, task.assigned_agent_id, task.department_id, "PM revision");

    broadcast("pm_activity", {
      projectId: currentItem.project_id,
      taskId,
      action: "revision_requested",
      agentName: currentItem.agent_name,
      summary: `PM requested revision for '${task.title}'`,
      timestamp: nowMs(),
    });

    res.json({ ok: true, resolved: true, action: "request_revision", task_id: taskId, restarted: result.started });
    return true;
  }

  // ── Keep Waiting ──
  if (action === "keep_waiting") {
    res.json({ ok: true, resolved: false, action: "keep_waiting" });
    return true;
  }

  res.status(400).json({ error: "unsupported_task_review_action", action });
  return true;
}
