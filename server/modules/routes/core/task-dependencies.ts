import type { Express, NextFunction, Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { ApiError } from "../../../errors/ApiError.ts";

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
  app.post("/api/tasks/:id/dependencies", (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id as string;
      const { depends_on_task_id, gate_condition, gate_branch } = req.body as {
        depends_on_task_id?: string;
        gate_condition?: string;
        gate_branch?: "true" | "false";
      };

      if (!depends_on_task_id || typeof depends_on_task_id !== "string") {
        throw ApiError.badRequest("depends_on_task_id_required", "depends_on_task_id is required");
      }

      if (depends_on_task_id === taskId) {
        throw ApiError.badRequest("self_dependency", "A task cannot depend on itself");
      }

      const taskExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
      if (!taskExists) {
        throw ApiError.notFound("task_not_found");
      }

      const depExists = db.prepare("SELECT id FROM tasks WHERE id = ?").get(depends_on_task_id as string);
      if (!depExists) {
        throw ApiError.notFound("dependency_task_not_found");
      }

      const reverseDep = db
        .prepare("SELECT 1 FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
        .get(depends_on_task_id as string, taskId);
      if (reverseDep) {
        throw ApiError.badRequest("circular_dependency", "This would create a circular dependency");
      }

      const gc = gate_condition && typeof gate_condition === "string" ? gate_condition.trim() : null;
      const gb = gate_branch === "true" || gate_branch === "false" ? gate_branch : null;
      db.prepare(
        "INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id, gate_condition, gate_branch, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(taskId, depends_on_task_id, gc, gb, nowMs());

      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/tasks/:id/dependencies/:depId — remove a dependency
  app.delete("/api/tasks/:id/dependencies/:depId", (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id as string;
      const depId = req.params.depId as string;

      const result = db
        .prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?")
        .run(taskId, depId);

      if ((result as any).changes === 0) {
        throw ApiError.notFound("dependency_not_found");
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/task-dependencies/all — all edges in one call (for graph view)
  app.get("/api/task-dependencies/all", (_req: Request, res: Response) => {
    const edges = db
      .prepare("SELECT task_id, depends_on_task_id FROM task_dependencies ORDER BY created_at ASC")
      .all() as Array<{ task_id: string; depends_on_task_id: string }>;
    res.json({ ok: true, edges });
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
