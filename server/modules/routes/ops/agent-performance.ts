import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { castSqliteRows } from "../../../lib/sqlite-row-cast.ts";

interface Deps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

interface AgentPerfRow {
  agent_id: string;
  agent_name: string;
  avatar_emoji: string;
  total: number;
  done: number;
  cancelled: number;
  failed_exec: number;
  avg_duration_ms: number | null;
}

interface DailyRow {
  agent_id: string;
  day: string; // YYYY-MM-DD
  cnt: number;
}

interface StatusRow {
  agent_id: string;
  status: string;
  cnt: number;
}

interface FitnessRow {
  agent_id: string;
  task_type: string;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number;
}

export function registerAgentPerformanceRoutes({ app, db }: Deps): void {
  /**
   * GET /api/agents/performance
   * Optional query params:
   *   project_id  — filter to tasks in a specific project
   *   days        — how many days back for trend (default 30)
   */
  app.get("/api/agents/performance", (req, res) => {
    try {
      const { project_id, days: daysParam } = req.query as Record<string, string>;
      const days = Math.min(Math.max(parseInt(daysParam ?? "30", 10) || 30, 7), 90);
      const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

      const projectFilter = project_id ? "AND t.project_id = ?" : "";
      const params: (string | number)[] = project_id ? [project_id] : [];
      const paramsWithSince: (string | number)[] = project_id
        ? [project_id, sinceMs]
        : [sinceMs];

      // Aggregate per agent
      const agentRows = castSqliteRows<AgentPerfRow>(
        db.prepare(`
        SELECT
          a.id         AS agent_id,
          a.name       AS agent_name,
          a.avatar_emoji,
          COUNT(t.id)  AS total,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)      AS done,
          SUM(CASE WHEN t.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
          SUM(CASE WHEN t.execution_state IN ('failed','cancelled') THEN 1 ELSE 0 END) AS failed_exec,
          AVG(CASE WHEN t.completed_at IS NOT NULL AND t.started_at IS NOT NULL
                   THEN t.completed_at - t.started_at END)         AS avg_duration_ms
        FROM agents a
        LEFT JOIN tasks t ON t.assigned_agent_id = a.id ${projectFilter}
        GROUP BY a.id
        ORDER BY total DESC
      `).all(...params),
      );

      // Status breakdown per agent
      const statusRows = castSqliteRows<StatusRow>(
        db.prepare(`
        SELECT t.assigned_agent_id AS agent_id, t.status, COUNT(*) AS cnt
        FROM tasks t
        WHERE t.assigned_agent_id IS NOT NULL ${project_id ? "AND t.project_id = ?" : ""}
        GROUP BY t.assigned_agent_id, t.status
      `).all(...params),
      );

      // Daily task creation trend for the last N days
      const dailyRows = castSqliteRows<DailyRow>(
        db.prepare(`
        SELECT
          t.assigned_agent_id AS agent_id,
          date(t.created_at / 1000, 'unixepoch') AS day,
          COUNT(*) AS cnt
        FROM tasks t
        WHERE t.assigned_agent_id IS NOT NULL
          AND t.created_at >= ?
          ${project_id ? "AND t.project_id = ?" : ""}
        GROUP BY t.assigned_agent_id, day
        ORDER BY day ASC
      `).all(...paramsWithSince),
      );

      // task_type fitness per agent
      let fitnessRows: FitnessRow[] = [];
      try {
        fitnessRows = castSqliteRows<FitnessRow>(
          db.prepare(`
          SELECT agent_id, task_type, success_count, failure_count, avg_duration_ms
          FROM agent_task_fitness
          ORDER BY agent_id, task_type
        `).all(),
        );
      } catch { /* table may not exist */ }

      // Build lookup maps
      const statusMap: Record<string, Record<string, number>> = {};
      for (const row of statusRows) {
        if (!statusMap[row.agent_id]) statusMap[row.agent_id] = {};
        statusMap[row.agent_id][row.status] = row.cnt;
      }

      const dailyMap: Record<string, Record<string, number>> = {};
      for (const row of dailyRows) {
        if (!dailyMap[row.agent_id]) dailyMap[row.agent_id] = {};
        dailyMap[row.agent_id][row.day] = row.cnt;
      }

      const fitnessMap: Record<string, Array<{ task_type: string; success_rate: number; total: number }>> = {};
      for (const row of fitnessRows) {
        if (!fitnessMap[row.agent_id]) fitnessMap[row.agent_id] = [];
        const total = (row.success_count ?? 0) + (row.failure_count ?? 0);
        fitnessMap[row.agent_id].push({
          task_type: row.task_type,
          success_rate: total > 0 ? Math.round(((row.success_count ?? 0) / total) * 100) : 0,
          total,
        });
      }

      // Generate day labels
      const dayLabels: string[] = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayLabels.push(d.toISOString().slice(0, 10));
      }

      const result = agentRows.map((a) => {
        const activeTasks = (a.total ?? 0) - (a.cancelled ?? 0);
        const successRate = activeTasks > 0 ? Math.round(((a.done ?? 0) / activeTasks) * 100) : null;
        const trend = dayLabels.map((day) => dailyMap[a.agent_id]?.[day] ?? 0);

        return {
          agent_id: a.agent_id,
          agent_name: a.agent_name,
          avatar_emoji: a.avatar_emoji,
          total: a.total ?? 0,
          done: a.done ?? 0,
          cancelled: a.cancelled ?? 0,
          failed_exec: a.failed_exec ?? 0,
          in_progress: statusMap[a.agent_id]?.["in_progress"] ?? 0,
          review: statusMap[a.agent_id]?.["review"] ?? 0,
          planned: statusMap[a.agent_id]?.["planned"] ?? 0,
          success_rate: successRate,
          avg_duration_ms: a.avg_duration_ms ? Math.round(a.avg_duration_ms) : null,
          status_breakdown: statusMap[a.agent_id] ?? {},
          fitness_by_type: fitnessMap[a.agent_id] ?? [],
          trend,
          day_labels: dayLabels,
        };
      });

      res.json({ ok: true, agents: result, day_labels: dayLabels });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });
}
