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
    const filterType = typeof req.query.type === "string" ? req.query.type : null;
    const filterAgentId = typeof req.query.agent_id === "string" ? req.query.agent_id : null;

    const conditions: string[] = [];
    if (unreadOnly) conditions.push("n.read = 0");
    if (filterType) conditions.push("n.type = ?");
    if (filterAgentId) conditions.push("n.agent_id = ?");
    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const params: (string | number)[] = [];
    if (filterType) params.push(filterType);
    if (filterAgentId) params.push(filterAgentId);
    params.push(limit);

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
      .all(...params) as Array<NotificationRow & { agent_name: string; agent_name_ko: string; agent_avatar: string }>;

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

  // Flood 방지: 같은 task_id+type 조합 5초 내 중복 차단
  const recentNotifications = new Map<string, number>();
  const DEDUPE_WINDOW_MS = 5_000;

  function insertNotification(params: {
    type: "task_complete" | "task_error" | "task_started" | "kickoff" | "decision_created" | "agent_error" | "system" | "cost_alert" | "agent_anomaly" | "heartbeat";
    title: string;
    body?: string | null;
    task_id?: string | null;
    agent_id?: string | null;
  }): string {
    const now = nowMs();

    // Flood 방지 체크
    const dedupeKey = `${params.type}:${params.task_id ?? "global"}`;
    const lastSent = recentNotifications.get(dedupeKey);
    if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
      return ""; // 5초 내 중복 → 무시
    }
    recentNotifications.set(dedupeKey, now);
    // 오래된 항목 정리 (100개 초과 시)
    if (recentNotifications.size > 100) {
      for (const [key, ts] of recentNotifications) {
        if (now - ts > DEDUPE_WINDOW_MS * 2) recentNotifications.delete(key);
      }
    }

    const id = randomUUID();
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
