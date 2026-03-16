/**
 * Data Export — streams CSV or JSON for tasks, deliverables, agents, or cost data.
 * GET /api/export?type=tasks|deliverables|agents|costs&format=csv|json&project_id=&since=&until=
 */

import type { DatabaseSync } from "node:sqlite";
import type { Express, Response } from "express";

interface Deps {
  app: Express;
  db: DatabaseSync;
}

type ExportType = "tasks" | "deliverables" | "agents" | "costs";
type ExportFormat = "csv" | "json";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => escape(r[k])).join(",")).join("\n");
  return header + "\n" + body;
}

function sendDownload(res: Response, format: ExportFormat, filename: string, data: Record<string, unknown>[]) {
  if (format === "json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
    res.end(JSON.stringify(data, null, 2));
  } else {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.end("\uFEFF" + toCsv(data)); // BOM for Excel UTF-8
  }
}

export function registerDataExportRoutes({ app, db }: Deps): void {
  app.get("/api/export", (req, res) => {
    try {
      const {
        type = "tasks",
        format = "csv",
        project_id,
        since,
        until,
        status,
      } = req.query as Record<string, string>;

      const fmt = (format === "json" ? "json" : "csv") as ExportFormat;
      const sinceMs = since ? Number(since) : null;
      const untilMs = until ? Number(until) : null;

      if (type === "tasks") {
        const conds: string[] = [];
        const params: (string | number)[] = [];
        if (project_id) { conds.push("t.project_id = ?"); params.push(project_id); }
        if (status) { conds.push("t.status = ?"); params.push(status); }
        if (sinceMs) { conds.push("t.created_at >= ?"); params.push(sinceMs); }
        if (untilMs) { conds.push("t.created_at <= ?"); params.push(untilMs); }
        const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

        const rows = db.prepare(`
          SELECT
            t.id, t.title, t.description, t.status, t.task_type,
            t.context_hint,
            a.name AS agent_name, a.avatar_emoji AS agent_emoji,
            p.name AS project_name,
            t.priority,
            t.started_at, t.completed_at, t.created_at, t.updated_at,
            CASE WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL
                 THEN t.completed_at - t.started_at END AS duration_ms
          FROM tasks t
          LEFT JOIN agents a ON a.id = t.assigned_agent_id
          LEFT JOIN projects p ON p.id = t.project_id
          ${where}
          ORDER BY t.created_at DESC
        `).all(...params) as Record<string, unknown>[];

        return sendDownload(res, fmt, `tasks_export_${Date.now()}`, rows);
      }

      if (type === "deliverables") {
        const conds = ["t.status = 'done'"];
        const params: (string | number)[] = [];
        if (project_id) { conds.push("t.project_id = ?"); params.push(project_id); }
        if (sinceMs) { conds.push("t.completed_at >= ?"); params.push(sinceMs); }
        if (untilMs) { conds.push("t.completed_at <= ?"); params.push(untilMs); }
        const where = "WHERE " + conds.join(" AND ");

        const rows = db.prepare(`
          SELECT
            t.id, t.title, t.description, t.context_hint,
            t.output_format, t.result,
            a.name AS agent_name,
            d.name AS department_name,
            p.name AS project_name,
            t.started_at, t.completed_at, t.created_at
          FROM tasks t
          LEFT JOIN agents a ON a.id = t.assigned_agent_id
          LEFT JOIN departments d ON d.id = t.department_id
          LEFT JOIN projects p ON p.id = t.project_id
          ${where}
          ORDER BY t.completed_at DESC
        `).all(...params) as Record<string, unknown>[];

        return sendDownload(res, fmt, `deliverables_export_${Date.now()}`, rows);
      }

      if (type === "agents") {
        const rows = db.prepare(`
          SELECT
            a.id, a.name, a.role, a.avatar_emoji,
            d.name AS department_name,
            a.status, a.created_at,
            COUNT(t.id) AS total_tasks,
            SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks,
            SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_tasks,
            AVG(CASE WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL
                     THEN t.completed_at - t.started_at END) AS avg_duration_ms
          FROM agents a
          LEFT JOIN departments d ON d.id = a.department_id
          LEFT JOIN tasks t ON t.assigned_agent_id = a.id
          GROUP BY a.id
          ORDER BY total_tasks DESC
        `).all() as Record<string, unknown>[];

        return sendDownload(res, fmt, `agents_export_${Date.now()}`, rows);
      }

      if (type === "costs") {
        const conds: string[] = [];
        const params: (string | number)[] = [];
        if (project_id) { conds.push("c.task_id IN (SELECT id FROM tasks WHERE project_id = ?)"); params.push(project_id); }
        if (sinceMs) { conds.push("c.recorded_at >= ?"); params.push(sinceMs); }
        if (untilMs) { conds.push("c.recorded_at <= ?"); params.push(untilMs); }
        const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

        // cli_usage_cache has: id, task_id, total_cost, recorded_at, agent_id, model
        const rows = db.prepare(`
          SELECT
            c.id, c.task_id, t.title AS task_title,
            a.name AS agent_name,
            c.model, c.total_cost,
            c.recorded_at
          FROM cli_usage_cache c
          LEFT JOIN tasks t ON t.id = c.task_id
          LEFT JOIN agents a ON a.id = c.agent_id
          ${where}
          ORDER BY c.recorded_at DESC
        `).all(...params) as Record<string, unknown>[];

        return sendDownload(res, fmt, `costs_export_${Date.now()}`, rows);
      }

      res.status(400).json({ error: "Invalid type. Use: tasks | deliverables | agents | costs" });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
}
