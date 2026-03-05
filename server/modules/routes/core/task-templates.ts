import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";

interface TaskTemplateRouteDeps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

export function registerTaskTemplateRoutes({ app, db, nowMs }: TaskTemplateRouteDeps): void {
  // GET /api/task-templates
  app.get("/api/task-templates", (_req: Request, res: Response) => {
    const rows = db
      .prepare("SELECT * FROM task_templates ORDER BY updated_at DESC")
      .all() as any[];
    res.json({ ok: true, templates: rows });
  });

  // POST /api/task-templates
  app.post("/api/task-templates", (req: Request, res: Response) => {
    const {
      name,
      title,
      description,
      department_id,
      task_type,
      priority,
      workflow_pack_key,
      workflow_meta_json,
    } = req.body as Record<string, any>;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const id = randomUUID();
    const now = nowMs();

    db.prepare(
      `INSERT INTO task_templates (id, name, title, description, department_id, task_type, priority, workflow_pack_key, workflow_meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      name.trim(),
      ((title as string) ?? "").trim(),
      ((description as string) ?? "").trim(),
      (department_id as string) ?? null,
      (task_type as string) ?? "general",
      (priority as number) ?? 3,
      (workflow_pack_key as string) ?? null,
      (workflow_meta_json as string) ?? null,
      now,
      now,
    );

    const row = db.prepare("SELECT * FROM task_templates WHERE id = ?").get(id) as any;
    res.status(201).json({ ok: true, template: row });
  });

  // DELETE /api/task-templates/:id
  app.delete("/api/task-templates/:id", (req: Request, res: Response) => {
    const id = req.params.id;
    const existing = db.prepare("SELECT id FROM task_templates WHERE id = ?").get(id as string);
    if (!existing) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    db.prepare("DELETE FROM task_templates WHERE id = ?").run(id as string);
    res.json({ ok: true });
  });
}
