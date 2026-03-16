import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { validateCron, nextCronRunAfter } from "../../workflow/cron-utils.ts";

interface Deps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

export function registerWorkflowScheduleRoutes({ app, db, nowMs }: Deps): void {
  /** List all schedules, optionally filtered by template_id */
  app.get("/api/workflow-schedules", (req, res) => {
    try {
      const { template_id } = req.query as Record<string, string>;
      const rows = template_id
        ? db
            .prepare(
              "SELECT ws.*, act.name AS template_name FROM workflow_schedules ws JOIN agent_composition_templates act ON act.id = ws.template_id WHERE ws.template_id = ? ORDER BY ws.created_at DESC",
            )
            .all(template_id)
        : db
            .prepare(
              "SELECT ws.*, act.name AS template_name FROM workflow_schedules ws JOIN agent_composition_templates act ON act.id = ws.template_id ORDER BY ws.created_at DESC",
            )
            .all();
      res.json({ ok: true, schedules: rows });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to list schedules" });
    }
  });

  /** Create a new schedule */
  app.post("/api/workflow-schedules", (req, res) => {
    try {
      const { template_id, cron_expr } = req.body ?? {};
      if (!template_id || typeof template_id !== "string")
        return res.status(400).json({ error: "template_id required" });
      const cron = String(cron_expr ?? "").trim();
      if (!cron) return res.status(400).json({ error: "cron_expr required" });
      if (!validateCron(cron)) return res.status(400).json({ error: "invalid cron expression" });

      // Ensure template exists
      const tpl = db.prepare("SELECT id FROM agent_composition_templates WHERE id = ?").get(template_id);
      if (!tpl) return res.status(404).json({ error: "template_not_found" });

      const id = randomUUID();
      const now = nowMs();
      const nextRun = nextCronRunAfter(cron, now);

      db.prepare(
        "INSERT INTO workflow_schedules (id, template_id, cron_expr, enabled, next_run_at, created_at) VALUES (?, ?, ?, 1, ?, ?)",
      ).run(id, template_id, cron, nextRun, now);

      res.json({ ok: true, id, next_run_at: nextRun });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** Update (enable/disable or change cron) */
  app.put("/api/workflow-schedules/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { enabled, cron_expr } = req.body ?? {};
      const updates: string[] = [];
      const values: (string | number)[] = [];

      if (enabled !== undefined) {
        updates.push("enabled = ?");
        values.push(enabled ? 1 : 0);
      }
      if (cron_expr !== undefined) {
        const cron = String(cron_expr).trim();
        if (!validateCron(cron)) return res.status(400).json({ error: "invalid cron expression" });
        const nextRun = nextCronRunAfter(cron, nowMs());
        updates.push("cron_expr = ?", "next_run_at = ?");
        values.push(cron, nextRun);
      }
      if (updates.length === 0) return res.status(400).json({ error: "nothing to update" });

      values.push(id);
      const result = db
        .prepare(`UPDATE workflow_schedules SET ${updates.join(", ")} WHERE id = ?`)
        .run(...values);
      if (result.changes === 0) return res.status(404).json({ error: "not_found" });

      // Return updated row
      const row = db.prepare("SELECT * FROM workflow_schedules WHERE id = ?").get(id);
      res.json({ ok: true, schedule: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** Delete a schedule */
  app.delete("/api/workflow-schedules/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM workflow_schedules WHERE id = ?").run(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to delete schedule" });
    }
  });
}
