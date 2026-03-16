/**
 * Workflow Scheduler — runs enabled workflow schedules at their cron times.
 *
 * Every minute it checks for due schedules (next_run_at <= now), loads the
 * template, creates tasks for all agent nodes, and advances next_run_at.
 */

import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger.ts";
import { nextCronRunAfter } from "./cron-utils.ts";

interface ScheduleRow {
  id: string;
  template_id: string;
  cron_expr: string;
  next_run_at: number | null;
}

interface TemplateRow {
  id: string;
  name: string;
  nodes_json: string;
}

interface AgentNodeData {
  agentId?: string;
  label?: string;
  instruction?: string;
}

interface WbNode {
  id: string;
  type: string;
  data: AgentNodeData;
}

export function startWorkflowScheduler(db: DatabaseSync, nowMs: () => number): () => void {
  const INTERVAL_MS = 60_000; // every minute

  async function tick() {
    const now = nowMs();
    let due: ScheduleRow[];
    try {
      due = db
        .prepare(
          "SELECT id, template_id, cron_expr, next_run_at FROM workflow_schedules WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?",
        )
        .all(now) as unknown as ScheduleRow[];
    } catch {
      return; // table may not exist yet during first boot
    }

    for (const schedule of due) {
      try {
        await fireSchedule(db, schedule, now, nowMs);
      } catch (err) {
        logger.error({ scheduleId: schedule.id, err }, "[scheduler] Failed to fire workflow schedule");
      }
    }
  }

  // Run once on start (catches up missed runs), then every minute
  void tick();
  const timer = setInterval(() => { void tick(); }, INTERVAL_MS);

  return () => clearInterval(timer);
}

async function fireSchedule(
  db: DatabaseSync,
  schedule: ScheduleRow,
  now: number,
  nowMs: () => number,
): Promise<void> {
  const tpl = db
    .prepare("SELECT id, name, nodes_json FROM agent_composition_templates WHERE id = ?")
    .get(schedule.template_id) as TemplateRow | undefined;

  if (!tpl) {
    logger.warn({ scheduleId: schedule.id, templateId: schedule.template_id }, "[scheduler] Template not found, disabling schedule");
    db.prepare("UPDATE workflow_schedules SET enabled = 0 WHERE id = ?").run(schedule.id);
    return;
  }

  let nodes: WbNode[] = [];
  try {
    nodes = JSON.parse(tpl.nodes_json) as WbNode[];
  } catch {
    logger.warn({ scheduleId: schedule.id }, "[scheduler] Failed to parse nodes_json");
  }

  const agentNodes = nodes.filter((n) => n.type === "agent" && n.data?.agentId);

  if (agentNodes.length === 0) {
    logger.info({ scheduleId: schedule.id, name: tpl.name }, "[scheduler] No assignable agent nodes, skipping");
  } else {
    for (const node of agentNodes) {
      const taskId = randomUUID();
      const ts = nowMs();
      try {
        db.prepare(
          "INSERT INTO tasks (id, title, description, status, assigned_agent_id, context_hint, workflow_pack_key, created_at, updated_at) VALUES (?, ?, ?, 'planned', ?, ?, ?, ?, ?)",
        ).run(
          taskId,
          `${node.data.label ?? "Agent"} — ${tpl.name} (scheduled)`,
          node.data.instruction ?? "",
          node.data.agentId!,
          `workflow:${tpl.id}`,
          `workflow:${tpl.id}`,
          ts,
          ts,
        );
        logger.info({ taskId, agentId: node.data.agentId, workflow: tpl.name }, "[scheduler] Created scheduled task");
      } catch (err) {
        logger.error({ err, taskId }, "[scheduler] Failed to insert task");
      }
    }
  }

  // Advance to next run
  let nextRun: number | null = null;
  try {
    nextRun = nextCronRunAfter(schedule.cron_expr, now);
  } catch {
    logger.warn({ cronExpr: schedule.cron_expr }, "[scheduler] Cannot compute next run, disabling");
    db.prepare("UPDATE workflow_schedules SET last_run_at = ?, enabled = 0 WHERE id = ?").run(now, schedule.id);
    return;
  }

  db.prepare("UPDATE workflow_schedules SET last_run_at = ?, next_run_at = ? WHERE id = ?")
    .run(now, nextRun, schedule.id);
}
