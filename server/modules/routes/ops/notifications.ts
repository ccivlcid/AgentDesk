import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  task_id: string | null;
  agent_id: string | null;
  read: number;
  created_at: number;
};

export function registerNotificationRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs, broadcast } = ctx;

  app.get("/api/notifications", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const unreadOnly = req.query.unread === "1";

    const whereClause = unreadOnly ? "WHERE n.read = 0" : "";
    const rows = db
      .prepare(
        `
        SELECT n.id, n.type, n.title, n.body, n.task_id, n.agent_id, n.read, n.created_at,
               COALESCE(a.name, '') AS agent_name,
               COALESCE(a.name_ko, '') AS agent_name_ko,
               COALESCE(a.avatar_emoji, '') AS agent_avatar
        FROM notifications n
        LEFT JOIN agents a ON a.id = n.agent_id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT ?
      `,
      )
      .all(limit) as Array<NotificationRow & { agent_name: string; agent_name_ko: string; agent_avatar: string }>;

    const unreadCount = (
      db.prepare("SELECT COUNT(*) as cnt FROM notifications WHERE read = 0").get() as { cnt: number }
    ).cnt;

    res.json({ ok: true, notifications: rows, unread_count: unreadCount });
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  app.post("/api/notifications/read-all", (_req, res) => {
    db.prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
    res.json({ ok: true });
  });

  app.delete("/api/notifications/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
    res.json({ ok: true });
  });
}

export function createNotificationHelper(ctx: { db: any; nowMs: () => number; broadcast: (event: string, data: any) => void }) {
  const { db, nowMs, broadcast } = ctx;

  function insertNotification(params: {
    type: "task_complete" | "task_error" | "decision_created" | "agent_error" | "system" | "cost_alert" | "agent_anomaly" | "heartbeat";
    title: string;
    body?: string | null;
    task_id?: string | null;
    agent_id?: string | null;
  }): string {
    const id = randomUUID();
    const now = nowMs();
    db.prepare(
      "INSERT INTO notifications (id, type, title, body, task_id, agent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, params.type, params.title, params.body ?? null, params.task_id ?? null, params.agent_id ?? null, now);

    const row = db.prepare(
      `SELECT n.id, n.type, n.title, n.body, n.task_id, n.agent_id, n.read, n.created_at,
              COALESCE(a.name, '') AS agent_name,
              COALESCE(a.name_ko, '') AS agent_name_ko,
              COALESCE(a.avatar_emoji, '') AS agent_avatar
       FROM notifications n LEFT JOIN agents a ON a.id = n.agent_id WHERE n.id = ?`,
    ).get(id);
    broadcast("notification", row);

    return id;
  }

  return { insertNotification };
}
