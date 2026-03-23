import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import logger from "../../../../lib/logger.ts";

export interface TimelineEvent {
  id: string;
  type:
    | "task_start"
    | "task_done"
    | "task_fail"
    | "task_retry"
    | "pm_approved"
    | "pm_revision"
    | "pm_reassigned"
    | "pm_escalated"
    | "skill_learn"
    | "memory_save"
    | "hook_run"
    | "api_completion";
  taskId?: string;
  taskTitle?: string;
  message: string;
  created_at: number; // unix ms
}

const EVENT_TYPE_MAP: Record<string, TimelineEvent["type"]> = {
  task_start: "task_start",
  task_started: "task_start",
  started: "task_start",
  task_done: "task_done",
  task_complete: "task_done",
  completed: "task_done",
  done: "task_done",
  review_approved: "task_done",
  task_fail: "task_fail",
  task_failed: "task_fail",
  failed: "task_fail",
  error: "task_fail",
  task_retry: "task_retry",
  pm_retry: "task_retry",
  pm_approved: "pm_approved",
  pm_revision_requested: "pm_revision",
  pm_reassigned: "pm_reassigned",
  pm_escalated: "pm_escalated",
  skill_learn: "skill_learn",
  skill_learned: "skill_learn",
  memory_save: "memory_save",
  memory_saved: "memory_save",
  hook_run: "hook_run",
  hook_triggered: "hook_run",
  api_completion: "api_completion",
};

function normalizeEventType(raw: string): TimelineEvent["type"] {
  const lower = String(raw ?? "").toLowerCase().trim();
  return EVENT_TYPE_MAP[lower] ?? "task_start";
}

export function registerAgentTimelineRoute(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  app.get("/api/agents/:id/timeline", (req, res) => {
    const agentId = String(req.params.id ?? "").trim();
    if (!agentId) {
      res.status(400).json({ error: "Missing agent id" });
      return;
    }

    try {
      // Check if task_execution_events table exists
      const hasEventsTable = (() => {
        try {
          db.prepare("SELECT 1 FROM task_execution_events LIMIT 1").get();
          return true;
        } catch {
          return false;
        }
      })();

      let events: TimelineEvent[] = [];

      if (hasEventsTable) {
        const rows = db
          .prepare(
            `SELECT
               tee.id,
               tee.event_type AS type,
               tee.task_id AS taskId,
               t.title AS taskTitle,
               COALESCE(tee.summary, tee.event_type) AS message,
               tee.created_at
             FROM task_execution_events tee
             JOIN tasks t ON t.id = tee.task_id
             WHERE t.assigned_agent_id = ?
             ORDER BY tee.created_at DESC
             LIMIT 50`,
          )
          .all(agentId) as Array<{
          id: unknown;
          type: unknown;
          taskId: unknown;
          taskTitle: unknown;
          message: unknown;
          created_at: unknown;
        }>;

        events = rows.map((row) => ({
          id: String(row.id ?? ""),
          type: normalizeEventType(String(row.type ?? "")),
          taskId: row.taskId ? String(row.taskId) : undefined,
          taskTitle: row.taskTitle ? String(row.taskTitle) : undefined,
          message: String(row.message ?? ""),
          created_at: Number(row.created_at ?? 0),
        }));
      }

      res.json(events);
    } catch (err) {
      logger.error({ err, agentId }, "Failed to fetch agent timeline");
      res.status(500).json({ error: "Failed to fetch timeline" });
    }
  });
}
