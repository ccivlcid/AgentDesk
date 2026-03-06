import type { Express, Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";

interface TaskDepsRouteDeps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

export function registerTaskDependencyRoutes({ app, db, nowMs }: TaskDepsRouteDeps): void {
  // GET /api/tasks/:id/dependencies — get all dependencies for a task
  app.get("/api/tasks/:id/dependencies", (req: Request, res: Response) => {
    const taskId = req.params.id as string;

    // Predecessors: tasks this task depends on
    const predecessors = db
      .prepare(
        `SELECT t.id, t.title, t.status, t.priority, t.task_type,
                COALESCE(a.name, '') AS assigned_agent_name,
                COALESCE(a.name_ko, '') AS assigned_agent_name_ko,
                td.created_at AS dep_created_at
         FROM task_dependencies td
         JOIN tasks t ON t.id = td.depends_on_task_id
         LEFT JOIN agents a ON a.id = t.assigned_agent_id
         WHERE td.task_id = ?
         ORDER BY td.created_at ASC`,
      )
      .all(taskId) as any[];

    // Dependents: tasks that depend on this task
    const dependents = db
      .prepare(
        `SELECT t.id, t.title, t.status, t.priority, t.task_type,
                COALESCE(a.name, '') AS assigned_agent_name,
                COALESCE(a.name_ko, '') AS assigned_agent_name_ko,
                td.created_at AS dep_created_at
         FROM task_dependencies td
         JOIN tasks t ON t.id = td.task_id
         LEFT JOIN agents a ON a.id = t.assigned_agent_id
         WHERE td.depends_on_task_id = ?
         ORDER BY td.created_at ASC`,
      )
      .all(taskId) as any[];

    res.json({ ok: true, predecessors, dependents });
  });

  // POST /api/tasks/:id/dependencies — add a dependency
  app.post("/api/tasks/:id/dependencies", (req: Request, res: Response) => {
    const taskId = req.params.id as string;
    const { depends_on_task_id } = req.body as { depends_on_task_id?: string };

    if (!depends_on_task_id || typeof depends_on_task_id !== "string") {
      res.status(400).json({ error: "depends_on_task_id is required" });
      return;
    }

    if (depends_on_task_id === taskId) {
      res.status(400).json({ error: "A task cannot depend on itself" });
      return;
    }

    // Check tasks exist
    const taskExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
    if (!taskExists) {
      res.status(404).json({ error: "task_not_found" });
      return;
    }

    const depExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(depends_on_task_id as string);
    if (!depExists) {
      res.status(404).json({ error: "dependency_task_not_found" });
      return;
    }

    // Simple cycle check: ensure depends_on_task_id doesn't already (transitively) depend on taskId
    // For MVP, just check direct reverse dependency
    const reverseDep = db
      .prepare("SELECT 1 FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
      .get(depends_on_task_id as string, taskId);
    if (reverseDep) {
      res.status(400).json({ error: "circular_dependency", message: "This would create a circular dependency" });
      return;
    }

    db.prepare(
      "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id, created_at) VALUES (?, ?, ?)",
    ).run(taskId, depends_on_task_id, nowMs());

    res.status(201).json({ ok: true });
  });

  // DELETE /api/tasks/:id/dependencies/:depId — remove a dependency
  app.delete("/api/tasks/:id/dependencies/:depId", (req: Request, res: Response) => {
    const taskId = req.params.id as string;
    const depId = req.params.depId as string;

    const result = db
      .prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
      .run(taskId, depId);

    if ((result as any).changes === 0) {
      res.status(404).json({ error: "dependency_not_found" });
      return;
    }

    res.json({ ok: true });
  });

  // GET /api/tasks/:id/dependencies/blocked — check if execution is blocked by incomplete predecessors
  app.get("/api/tasks/:id/dependencies/blocked", (req: Request, res: Response) => {
    const taskId = req.params.id as string;

    const incomplete = db
      .prepare(
        `SELECT t.id, t.title, t.status FROM task_dependencies td
         JOIN tasks t ON t.id = td.depends_on_task_id
         WHERE td.task_id = ? AND t.status NOT IN ('done', 'cancelled')`,
      )
      .all(taskId) as Array<{ id: string; title: string; status: string }>;

    res.json({
      blocked: incomplete.length > 0,
      incomplete_predecessors: incomplete,
    });
  });
}
