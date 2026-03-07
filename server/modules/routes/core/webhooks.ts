import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";

interface WebhookRouteDeps {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

interface WebhookRow {
  id: string;
  name: string;
  url: string;
  events: string;
  enabled: number;
  secret: string | null;
  created_at: number;
  updated_at: number;
}

export function registerWebhookRoutes({ app, db, nowMs }: WebhookRouteDeps): void {
  // GET /api/webhooks
  app.get("/api/webhooks", (_req: Request, res: Response) => {
    const rows = db.prepare("SELECT * FROM webhooks ORDER BY created_at DESC").all() as unknown as WebhookRow[];
    res.json({ ok: true, webhooks: rows.map((r) => ({ ...r, events: JSON.parse(r.events) })) });
  });

  // POST /api/webhooks
  app.post("/api/webhooks", (req: Request, res: Response) => {
    const { name, url, events, secret } = req.body as Record<string, any>;
    if (!name?.trim() || !url?.trim()) {
      res.status(400).json({ error: "name and url are required" });
      return;
    }
    const eventsArr = Array.isArray(events) ? events : ["task_done"];
    const id = randomUUID();
    const now = nowMs();
    db.prepare(
      `INSERT INTO webhooks (id, name, url, events, enabled, secret, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
    ).run(id, name.trim(), url.trim(), JSON.stringify(eventsArr), (secret?.trim() as string | undefined) ?? null, now, now);
    res.json({ ok: true, id });
  });

  // PATCH /api/webhooks/:id
  app.patch("/api/webhooks/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, url, events, enabled, secret } = req.body as Record<string, any>;
    const now = nowMs();
    const existing = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(id as string) as any as WebhookRow | undefined;
    if (!existing) { res.status(404).json({ error: "not found" }); return; }

    const newName: string = name?.trim() ?? existing.name;
    const newUrl: string = url?.trim() ?? existing.url;
    const newEvents: string[] = Array.isArray(events) ? events : (JSON.parse(existing.events) as string[]);
    const newEnabled: number = enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;
    const newSecret: string | null = secret !== undefined ? ((secret?.trim() as string | undefined) ?? null) : existing.secret;

    db.prepare(
      `UPDATE webhooks SET name=?, url=?, events=?, enabled=?, secret=?, updated_at=? WHERE id=?`,
    ).run(newName as string, newUrl as string, JSON.stringify(newEvents) as string, newEnabled as number, newSecret as string | null, now as number, id as string);
    res.json({ ok: true });
  });

  // DELETE /api/webhooks/:id
  app.delete("/api/webhooks/:id", (req: Request, res: Response) => {
    db.prepare("DELETE FROM webhooks WHERE id = ?").run(req.params.id as string);
    res.json({ ok: true });
  });

  // POST /api/webhooks/:id/test — 테스트 발송
  app.post("/api/webhooks/:id/test", async (req: Request, res: Response) => {
    const row = db.prepare("SELECT * FROM webhooks WHERE id = ?").get(req.params.id as string) as any as WebhookRow | undefined;
    if (!row) { res.status(404).json({ error: "not found" }); return; }
    const result = await sendWebhook(row.url, row.secret, "test", {
      message: "AgentDesk webhook test",
      timestamp: nowMs(),
    });
    res.json(result);
  });
}

/** 웹훅 단건 발송 */
async function sendWebhook(
  url: string,
  secret: string | null,
  event: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-AgentDesk-Secret"] = secret;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ event, ...payload }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** 태스크 이벤트 발생 시 전체 활성 웹훅에 비동기 발송 (fire-and-forget) */
export function triggerWebhooks(
  db: DatabaseSync,
  event: string,
  payload: Record<string, unknown>,
): void {
  let rows: WebhookRow[];
  try {
    rows = db.prepare("SELECT * FROM webhooks WHERE enabled = 1").all() as unknown as WebhookRow[];
  } catch {
    return; // table may not exist yet
  }
  for (const row of rows) {
    let events: string[];
    try { events = JSON.parse(row.events); } catch { events = ["task_done"]; }
    if (!events.includes(event)) continue;
    sendWebhook(row.url, row.secret, event, payload).catch(() => {});
  }
}
