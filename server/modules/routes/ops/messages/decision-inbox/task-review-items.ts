/**
 * Per-task review decision items.
 *
 * Unlike buildProjectReviewDecisionItems() which waits for ALL project tasks
 * to reach "review", this module creates a decision inbox item for EACH
 * individual task that reaches "review" status — so the PM can approve
 * tasks one at a time.
 */

import type { DatabaseSync } from "node:sqlite";
import type { DecisionInboxRouteItem, PickLocalizedText, LocalizedTextBuilder } from "./types.ts";

interface TaskReviewItemDeps {
  db: DatabaseSync;
  nowMs: () => number;
  getPreferredLanguage: () => string;
  pickL: PickLocalizedText;
  l: LocalizedTextBuilder;
}

interface ReviewTaskRow {
  id: string;
  title: string;
  assigned_agent_id: string | null;
  project_id: string | null;
  updated_at: number;
  agent_name: string;
  agent_name_ko: string;
  agent_avatar: string;
  project_name: string;
}

export function createTaskReviewDecisionItems(deps: TaskReviewItemDeps) {
  const { db, nowMs, getPreferredLanguage, pickL, l } = deps;

  function buildTaskReviewDecisionItems(): DecisionInboxRouteItem[] {
    const lang = getPreferredLanguage();
    const rows = db
      .prepare(
        `SELECT t.id, t.title, t.assigned_agent_id, t.project_id, t.updated_at,
                COALESCE(a.name, '') AS agent_name,
                COALESCE(a.name_ko, '') AS agent_name_ko,
                COALESCE(a.avatar_emoji, '') AS agent_avatar,
                COALESCE(p.name, '') AS project_name
         FROM tasks t
         LEFT JOIN agents a ON a.id = t.assigned_agent_id
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.status = 'review'
           AND t.source_task_id IS NULL
           AND t.project_id IS NOT NULL
         ORDER BY t.updated_at ASC`,
      )
      .all() as unknown as ReviewTaskRow[];

    return rows.map((task) => {
      const agentLabel = lang.startsWith("ko") ? task.agent_name_ko || task.agent_name : task.agent_name;
      const summary = pickL(
        l(
          [`'${task.title}' 완료 — ${agentLabel}의 작업 결과를 검토해 주세요.`],
          [`'${task.title}' completed — please review ${agentLabel}'s work.`],
          [`'${task.title}' 完了 — ${agentLabel}の成果をレビューしてください。`],
          [`'${task.title}' 完成 — 请审核${agentLabel}的工作。`],
        ),
        lang,
      );

      return {
        id: `task-review:${task.id}`,
        kind: "task_review_ready" as const,
        created_at: task.updated_at,
        summary,
        agent_id: task.assigned_agent_id,
        agent_name: task.agent_name,
        agent_name_ko: task.agent_name_ko,
        agent_avatar: task.agent_avatar,
        project_id: task.project_id,
        project_name: task.project_name,
        project_path: null,
        task_id: task.id,
        task_title: task.title,
        options: [
          {
            number: 1,
            action: `approve_task_review:${task.id}`,
            label: pickL(
              l(["승인 + 병합"], ["Approve & Merge"], ["承認 + マージ"], ["批准 + 合并"]),
              lang,
            ),
          },
          {
            number: 2,
            action: `request_revision:${task.id}`,
            label: pickL(
              l(["수정 요청"], ["Request Revision"], ["修正要請"], ["要求修改"]),
              lang,
            ),
          },
          {
            number: 3,
            action: "keep_waiting",
            label: pickL(
              l(["보류"], ["Hold"], ["保留"], ["暂缓"]),
              lang,
            ),
          },
        ],
      };
    });
  }

  return { buildTaskReviewDecisionItems };
}
