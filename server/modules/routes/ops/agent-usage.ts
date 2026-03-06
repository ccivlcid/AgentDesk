import type { RuntimeContext } from "../../../types/runtime-context.ts";

export function registerAgentUsageRoutes(ctx: RuntimeContext): {
  recordAgentUsage: (params: {
    agentId: string;
    taskId: string;
    provider: string;
    startedAt: number;
    endedAt: number;
    exitCode: number | null;
    logBytes: number;
  }) => void;
} {
  const { app, db, nowMs } = ctx;

  function recordAgentUsage(params: {
    agentId: string;
    taskId: string;
    provider: string;
    startedAt: number;
    endedAt: number;
    exitCode: number | null;
    logBytes: number;
  }): void {
    db.prepare(
      `INSERT INTO agent_usage_logs (agent_id, task_id, provider, started_at, ended_at, exit_code, log_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      params.agentId,
      params.taskId,
      params.provider,
      params.startedAt,
      params.endedAt,
      params.exitCode,
      params.logBytes,
      nowMs(),
    );
  }

  // Get usage summary per agent
  app.get("/api/agent-usage", (_req, res) => {
    const sinceMs = Number(_req.query.since) || nowMs() - 24 * 60 * 60 * 1000; // default 24h
    const rows = db
      .prepare(
        `SELECT
           u.agent_id,
           a.name AS agent_name,
           a.name_ko AS agent_name_ko,
           a.avatar_emoji,
           u.provider,
           COUNT(*) AS run_count,
           SUM(u.ended_at - u.started_at) AS total_duration_ms,
           SUM(u.log_bytes) AS total_log_bytes,
           SUM(CASE WHEN u.exit_code = 0 THEN 1 ELSE 0 END) AS success_count,
           SUM(CASE WHEN u.exit_code != 0 AND u.exit_code IS NOT NULL THEN 1 ELSE 0 END) AS failure_count
         FROM agent_usage_logs u
         LEFT JOIN agents a ON a.id = u.agent_id
         WHERE u.created_at >= ?
         GROUP BY u.agent_id, u.provider
         ORDER BY total_duration_ms DESC`,
      )
      .all(sinceMs);

    res.json({ ok: true, usage: rows });
  });

  // GET /api/agent-usage/trends/daily — global daily usage trends (must be before /:agentId)
  app.get("/api/agent-usage/trends/daily", (_req, res) => {
    const days = Math.min(Number(_req.query.days) || 30, 90);
    const sinceMs = nowMs() - days * 86_400_000;

    const daily = db
      .prepare(
        `SELECT
           CAST((u.created_at / 86400000) AS INTEGER) AS day_epoch,
           u.provider,
           COUNT(*) AS run_count,
           SUM(u.ended_at - u.started_at) AS total_duration_ms,
           SUM(u.log_bytes) AS total_log_bytes,
           SUM(CASE WHEN u.exit_code = 0 THEN 1 ELSE 0 END) AS success_count
         FROM agent_usage_logs u
         WHERE u.created_at >= ?
         GROUP BY day_epoch, u.provider
         ORDER BY day_epoch ASC`,
      )
      .all(sinceMs);

    res.json({ ok: true, daily });
  });

  // Get usage log for a specific agent
  app.get("/api/agent-usage/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = db
      .prepare(
        `SELECT u.*, t.title AS task_title
         FROM agent_usage_logs u
         LEFT JOIN tasks t ON t.id = u.task_id
         WHERE u.agent_id = ?
         ORDER BY u.created_at DESC
         LIMIT ?`,
      )
      .all(agentId, limit);

    // Daily aggregation for chart
    const daily = db
      .prepare(
        `SELECT
           CAST((u.created_at / 86400000) AS INTEGER) AS day_epoch,
           COUNT(*) AS run_count,
           SUM(u.ended_at - u.started_at) AS total_duration_ms,
           SUM(u.log_bytes) AS total_log_bytes
         FROM agent_usage_logs u
         WHERE u.agent_id = ?
         GROUP BY day_epoch
         ORDER BY day_epoch DESC
         LIMIT 30`,
      )
      .all(agentId);

    res.json({ ok: true, logs: rows, daily });
  });

  return { recordAgentUsage };
}
