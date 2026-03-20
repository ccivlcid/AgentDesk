import type { SQLInputValue } from "node:sqlite";
import type { Express } from "express";

type MetricsRoutesCtx = {
  db: {
    prepare: (sql: string) => {
      get: (...args: SQLInputValue[]) => unknown;
      all: (...args: SQLInputValue[]) => unknown;
    };
  };
};

export function registerAgentMetricsRoutes(app: Express, ctx: MetricsRoutesCtx): void {
  const { db } = ctx;

  app.get("/api/agents/:id/performance", (req, res) => {
    const { id } = req.params;
    const agent = db.prepare("SELECT id, name, stats_tasks_done, stats_xp FROM agents WHERE id = ?").get(id) as
      | { id: string; name: string; stats_tasks_done: number; stats_xp: number }
      | undefined;
    if (!agent) return res.status(404).json({ error: "agent_not_found" });

    const taskStats = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done,
          SUM(CASE WHEN status = 'inbox' AND result IS NOT NULL THEN 1 ELSE 0 END) AS failed,
          AVG(CASE WHEN status = 'done' AND started_at > 0 AND completed_at > started_at
                   THEN completed_at - started_at END) AS avg_duration_ms
        FROM tasks WHERE assigned_agent_id = ?
      `,
      )
      .get(id) as { total: number; done: number; failed: number; avg_duration_ms: number | null };

    const recentTasks = db
      .prepare(
        `
        SELECT id, title, status, started_at, completed_at, department_id, workflow_pack_key
        FROM tasks
        WHERE assigned_agent_id = ?
        ORDER BY COALESCE(completed_at, started_at, created_at) DESC
        LIMIT 20
      `,
      )
      .all(id) as Array<{
      id: string;
      title: string;
      status: string;
      started_at: number | null;
      completed_at: number | null;
      department_id: string | null;
      workflow_pack_key: string | null;
    }>;

    const byPack = db
      .prepare(
        `
        SELECT workflow_pack_key AS pack, COUNT(*) AS cnt,
               SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_cnt
        FROM tasks WHERE assigned_agent_id = ? AND workflow_pack_key IS NOT NULL
        GROUP BY workflow_pack_key ORDER BY cnt DESC
      `,
      )
      .all(id) as Array<{ pack: string; cnt: number; done_cnt: number }>;

    res.json({
      ok: true,
      agent_id: id,
      stats: {
        tasks_total: taskStats.total,
        tasks_done: taskStats.done,
        tasks_failed: taskStats.failed,
        success_rate: taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0,
        avg_duration_ms: taskStats.avg_duration_ms ? Math.round(taskStats.avg_duration_ms) : null,
        xp: agent.stats_xp,
      },
      recent_tasks: recentTasks,
      by_pack: byPack,
    });
  });

  app.get("/api/agents/:id/project-path", (req, res) => {
    const { id } = req.params;
    const row = db
      .prepare(
        `SELECT p.project_path FROM projects p
         JOIN project_agents pa ON pa.project_id = p.id
         WHERE pa.agent_id = ? AND p.project_path IS NOT NULL AND p.project_path != ''
         ORDER BY pa.created_at ASC LIMIT 1`,
      )
      .get(id) as { project_path: string } | undefined;
    res.json({ ok: true, project_path: row?.project_path ?? null });
  });
}
