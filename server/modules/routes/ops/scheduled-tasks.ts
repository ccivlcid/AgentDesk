import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import {
  isValidCronExpression,
  getNextCronTime,
  describeCron,
} from "../../workflow/orchestration/task-scheduler.ts";

interface ScheduledTaskRouteDeps {
  app: Express;
  db: any;
  nowMs: () => number;
}

interface ScheduledTaskRow {
  id: string;
  template_id: string | null;
  name: string;
  cron_expression: string;
  timezone: string;
  enabled: number;
  auto_run: number;
  assigned_agent_id: string | null;
  project_id: string | null;
  last_run_at: number | null;
  next_run_at: number | null;
  run_count: number;
  created_at: number;
  updated_at: number;
}

function enrichRow(row: ScheduledTaskRow) {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    auto_run: Boolean(row.auto_run),
    cron_description_en: describeCron(row.cron_expression, "en"),
    cron_description_ko: describeCron(row.cron_expression, "ko"),
  };
}

export function registerScheduledTaskRoutes({ app, db, nowMs }: ScheduledTaskRouteDeps): void {
  // GET /api/scheduled-tasks — list all
  app.get("/api/scheduled-tasks", (_req: Request, res: Response) => {
    const rows = db
      .prepare(
        `SELECT s.*, t.name as template_name, a.name as agent_name, a.avatar_emoji as agent_avatar, p.name as project_name
         FROM scheduled_tasks s
         LEFT JOIN task_templates t ON s.template_id = t.id
         LEFT JOIN agents a ON s.assigned_agent_id = a.id
         LEFT JOIN projects p ON s.project_id = p.id
         ORDER BY s.created_at DESC`,
      )
      .all() as (ScheduledTaskRow & { template_name?: string; agent_name?: string; agent_avatar?: string; project_name?: string })[];

    res.json({
      ok: true,
      schedules: rows.map((r) => ({
        ...enrichRow(r),
        template_name: r.template_name ?? null,
        agent_name: r.agent_name ?? null,
        agent_avatar: r.agent_avatar ?? null,
        project_name: r.project_name ?? null,
      })),
    });
  });

  // GET /api/scheduled-tasks/:id
  app.get("/api/scheduled-tasks/:id", (req: Request, res: Response) => {
    const row = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(req.params.id) as
      | ScheduledTaskRow
      | undefined;
    if (!row) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true, schedule: enrichRow(row) });
  });

  // POST /api/scheduled-tasks — create
  app.post("/api/scheduled-tasks", (req: Request, res: Response) => {
    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const cronExpression = typeof body.cron_expression === "string" ? body.cron_expression.trim() : "";

    if (!name) return res.status(400).json({ error: "name is required" });
    if (!cronExpression || !isValidCronExpression(cronExpression)) {
      return res.status(400).json({ error: "invalid cron_expression" });
    }

    const id = randomUUID();
    const now = nowMs();
    const nextRunAt = getNextCronTime(cronExpression, now);

    db.prepare(
      `INSERT INTO scheduled_tasks (id, template_id, name, cron_expression, timezone, enabled, auto_run,
        assigned_agent_id, project_id, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      typeof body.template_id === "string" ? body.template_id : null,
      name,
      cronExpression,
      typeof body.timezone === "string" ? body.timezone : "UTC",
      body.enabled === false ? 0 : 1,
      body.auto_run ? 1 : 0,
      typeof body.assigned_agent_id === "string" ? body.assigned_agent_id : null,
      typeof body.project_id === "string" ? body.project_id : null,
      nextRunAt,
      now,
      now,
    );

    const row = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as ScheduledTaskRow;
    res.status(201).json({ ok: true, schedule: enrichRow(row) });
  });

  // PUT /api/scheduled-tasks/:id — update
  app.put("/api/scheduled-tasks/:id", (req: Request, res: Response) => {
    const id = req.params.id;
    const existing = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as
      | ScheduledTaskRow
      | undefined;
    if (!existing) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const now = nowMs();

    let cronExpression = existing.cron_expression;
    if (typeof body.cron_expression === "string" && body.cron_expression.trim()) {
      if (!isValidCronExpression(body.cron_expression.trim())) {
        return res.status(400).json({ error: "invalid cron_expression" });
      }
      cronExpression = body.cron_expression.trim();
    }

    const nextRunAt = getNextCronTime(cronExpression, now);

    db.prepare(
      `UPDATE scheduled_tasks SET
        template_id = COALESCE(?, template_id),
        name = COALESCE(?, name),
        cron_expression = ?,
        timezone = COALESCE(?, timezone),
        enabled = ?,
        auto_run = ?,
        assigned_agent_id = ?,
        project_id = ?,
        next_run_at = ?,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      "template_id" in body ? (body.template_id || null) : null,
      typeof body.name === "string" && body.name.trim() ? body.name.trim() : null,
      cronExpression,
      typeof body.timezone === "string" ? body.timezone : null,
      "enabled" in body ? (body.enabled ? 1 : 0) : existing.enabled,
      "auto_run" in body ? (body.auto_run ? 1 : 0) : existing.auto_run,
      "assigned_agent_id" in body ? (body.assigned_agent_id || null) : existing.assigned_agent_id,
      "project_id" in body ? (body.project_id || null) : existing.project_id,
      nextRunAt,
      now,
      id,
    );

    const row = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as ScheduledTaskRow;
    res.json({ ok: true, schedule: enrichRow(row) });
  });

  // DELETE /api/scheduled-tasks/:id
  app.delete("/api/scheduled-tasks/:id", (req: Request, res: Response) => {
    const result = db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  });

  // POST /api/scheduled-tasks/:id/toggle — quick enable/disable
  app.post("/api/scheduled-tasks/:id/toggle", (req: Request, res: Response) => {
    const existing = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(req.params.id) as
      | ScheduledTaskRow
      | undefined;
    if (!existing) return res.status(404).json({ error: "not_found" });

    const newEnabled = existing.enabled ? 0 : 1;
    const now = nowMs();
    const nextRunAt = newEnabled ? getNextCronTime(existing.cron_expression, now) : existing.next_run_at;

    db.prepare("UPDATE scheduled_tasks SET enabled = ?, next_run_at = ?, updated_at = ? WHERE id = ?").run(
      newEnabled,
      nextRunAt,
      now,
      req.params.id,
    );

    res.json({ ok: true, enabled: Boolean(newEnabled) });
  });

  // GET /api/scheduled-tasks/cron/validate — validate cron expression
  app.get("/api/scheduled-tasks/cron/validate", (req: Request, res: Response) => {
    const expr = typeof req.query.expr === "string" ? req.query.expr : "";
    const valid = isValidCronExpression(expr);
    const result: Record<string, unknown> = { ok: true, valid };
    if (valid) {
      result.description_en = describeCron(expr, "en");
      result.description_ko = describeCron(expr, "ko");
      result.next_run_at = getNextCronTime(expr, Date.now());
    }
    res.json(result);
  });
}
