import type { RuntimeContext } from "../../../types/runtime-context.ts";
import { ALL_CHECK_ITEMS } from "../../workflow/orchestration/heartbeat.ts";
import type { HeartbeatCheckItem } from "../../workflow/orchestration/heartbeat.ts";

export function registerHeartbeatRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs } = ctx;

  // -----------------------------------------------------------------------
  // GET /api/heartbeat/configs — list all heartbeat configs (with agent info)
  // -----------------------------------------------------------------------
  app.get("/api/heartbeat/configs", (_req, res) => {
    const rows = db
      .prepare(
        `SELECT hc.agent_id, hc.enabled, hc.interval_minutes, hc.check_items_json,
                hc.created_at, hc.updated_at,
                a.name AS agent_name, COALESCE(a.name_ko, '') AS agent_name_ko,
                COALESCE(a.avatar_emoji, '') AS agent_avatar
         FROM heartbeat_configs hc
         JOIN agents a ON a.id = hc.agent_id
         ORDER BY hc.updated_at DESC`,
      )
      .all();

    res.json({ ok: true, configs: rows });
  });

  // -----------------------------------------------------------------------
  // GET /api/heartbeat/configs/:agentId — single agent config
  // -----------------------------------------------------------------------
  app.get("/api/heartbeat/configs/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);
    const row = db
      .prepare(
        `SELECT hc.agent_id, hc.enabled, hc.interval_minutes, hc.check_items_json,
                hc.created_at, hc.updated_at,
                a.name AS agent_name, COALESCE(a.name_ko, '') AS agent_name_ko,
                COALESCE(a.avatar_emoji, '') AS agent_avatar
         FROM heartbeat_configs hc
         JOIN agents a ON a.id = hc.agent_id
         WHERE hc.agent_id = ?`,
      )
      .get(agentId);

    if (!row) {
      // Return default config (not yet saved)
      const agent = db.prepare("SELECT name, name_ko, avatar_emoji FROM agents WHERE id = ?").get(agentId) as
        | { name: string; name_ko: string; avatar_emoji: string }
        | undefined;
      if (!agent) return res.status(404).json({ ok: false, error: "agent_not_found" });

      return res.json({
        ok: true,
        config: {
          agent_id: agentId,
          enabled: 0,
          interval_minutes: 30,
          check_items_json: JSON.stringify(ALL_CHECK_ITEMS),
          agent_name: agent.name,
          agent_name_ko: agent.name_ko,
          agent_avatar: agent.avatar_emoji,
        },
      });
    }

    res.json({ ok: true, config: row });
  });

  // -----------------------------------------------------------------------
  // PUT /api/heartbeat/configs/:agentId — upsert heartbeat config
  // -----------------------------------------------------------------------
  app.put("/api/heartbeat/configs/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);
    const body = req.body as {
      enabled?: boolean;
      interval_minutes?: number;
      check_items?: HeartbeatCheckItem[];
    };

    // Validate agent exists
    const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
    if (!agent) return res.status(404).json({ ok: false, error: "agent_not_found" });

    const enabled = body.enabled ? 1 : 0;
    const intervalMinutes = Math.max(5, Math.min(1440, body.interval_minutes ?? 30));
    const checkItems = (body.check_items ?? ALL_CHECK_ITEMS).filter((i) =>
      ALL_CHECK_ITEMS.includes(i),
    );
    const now = nowMs();

    db.prepare(
      `INSERT INTO heartbeat_configs (agent_id, enabled, interval_minutes, check_items_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         enabled = excluded.enabled,
         interval_minutes = excluded.interval_minutes,
         check_items_json = excluded.check_items_json,
         updated_at = excluded.updated_at`,
    ).run(agentId, enabled, intervalMinutes, JSON.stringify(checkItems), now, now);

    res.json({ ok: true });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/heartbeat/configs/:agentId — remove heartbeat config
  // -----------------------------------------------------------------------
  app.delete("/api/heartbeat/configs/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);
    db.prepare("DELETE FROM heartbeat_configs WHERE agent_id = ?").run(agentId);
    res.json({ ok: true });
  });

  // -----------------------------------------------------------------------
  // GET /api/heartbeat/logs — recent heartbeat logs (all agents)
  // -----------------------------------------------------------------------
  app.get("/api/heartbeat/logs", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const statusFilter = req.query.status as string | undefined;

    let query = `SELECT hl.*, a.name AS agent_name, COALESCE(a.name_ko, '') AS agent_name_ko,
                        COALESCE(a.avatar_emoji, '') AS agent_avatar
                 FROM heartbeat_logs hl
                 JOIN agents a ON a.id = hl.agent_id`;
    const params: any[] = [];

    if (statusFilter && ["ok", "alert", "error"].includes(statusFilter)) {
      query += " WHERE hl.status = ?";
      params.push(statusFilter);
    }

    query += " ORDER BY hl.created_at DESC LIMIT ?";
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    res.json({ ok: true, logs: rows });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/heartbeat/logs — delete all heartbeat logs
  // -----------------------------------------------------------------------
  app.delete("/api/heartbeat/logs", (_req, res) => {
    const result = db.prepare("DELETE FROM heartbeat_logs").run();
    res.json({ ok: true, deleted: result.changes });
  });

  // -----------------------------------------------------------------------
  // DELETE /api/heartbeat/logs/record/:id — delete a single log (path avoids conflict with GET .../logs/:agentId)
  // -----------------------------------------------------------------------
  app.delete("/api/heartbeat/logs/record/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }
    const result = db.prepare("DELETE FROM heartbeat_logs WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ ok: false, error: "log_not_found" });
    }
    res.json({ ok: true, deleted: id });
  });

  // -----------------------------------------------------------------------
  // GET /api/heartbeat/logs/:agentId — agent-specific heartbeat logs
  // -----------------------------------------------------------------------
  app.get("/api/heartbeat/logs/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const rows = db
      .prepare(
        `SELECT * FROM heartbeat_logs
         WHERE agent_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(agentId, limit);

    // Also get summary stats
    const stats = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'ok' THEN 1 ELSE 0 END) AS ok_count,
           SUM(CASE WHEN status = 'alert' THEN 1 ELSE 0 END) AS alert_count,
           SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
           MIN(created_at) AS first_heartbeat,
           MAX(created_at) AS last_heartbeat
         FROM heartbeat_logs
         WHERE agent_id = ?`,
      )
      .get(agentId);

    res.json({ ok: true, logs: rows, stats });
  });

  // -----------------------------------------------------------------------
  // POST /api/heartbeat/trigger/:agentId — manually trigger heartbeat
  // -----------------------------------------------------------------------
  app.post("/api/heartbeat/trigger/:agentId", (req, res) => {
    const agentId = String(req.params.agentId);

    // Access triggerAgent from ctx (set by orchestration)
    const triggerFn = (ctx as any).triggerHeartbeat;
    if (!triggerFn) {
      return res.status(503).json({ ok: false, error: "heartbeat_engine_not_ready" });
    }

    const findings = triggerFn(agentId);
    res.json({ ok: true, findings, status: findings.length === 0 ? "ok" : "alert" });
  });

  // -----------------------------------------------------------------------
  // GET /api/heartbeat/check-items — available check items metadata
  // -----------------------------------------------------------------------
  app.get("/api/heartbeat/check-items", (_req, res) => {
    res.json({
      ok: true,
      items: [
        { id: "stale_tasks", label: "Stale Tasks", label_ko: "정체된 태스크", description: "Tasks in progress without recent updates" },
        { id: "blocked_tasks", label: "Blocked Tasks", label_ko: "차단된 태스크", description: "Tasks or subtasks stuck in blocked/pending status" },
        { id: "consecutive_failures", label: "Consecutive Failures", label_ko: "연속 실패", description: "Agent with multiple consecutive task failures" },
        { id: "pending_decisions", label: "Pending Decisions", label_ko: "대기 중인 의사결정", description: "Unresolved decision inbox items" },
      ],
    });
  });
}
