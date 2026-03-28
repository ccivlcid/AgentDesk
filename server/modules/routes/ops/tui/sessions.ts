import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";

type TuiSession = {
  id: string;
  project_id: string | null;
  mode: string;
  created_at: number;
  updated_at: number;
};

type TuiMessage = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  agent_name: string | null;
  metadata: string | null;
  created_at: number;
};

export function registerTuiRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs } = ctx;

  // POST /api/tui/sessions — 세션 생성
  app.post("/api/tui/sessions", (req, res) => {
    const body = req.body as { project_id?: string; mode?: string };
    const id = randomUUID();
    const now = nowMs();
    const project_id = body.project_id ?? null;
    const mode = body.mode ?? "build";

    db.prepare(
      "INSERT INTO tui_sessions (id, project_id, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).run(id, project_id, mode, now, now);

    const row = db
      .prepare("SELECT id, project_id, mode, created_at, updated_at FROM tui_sessions WHERE id = ?")
      .get(id) as TuiSession;

    res.json({ ok: true, id: row.id, project_id: row.project_id, mode: row.mode, created_at: row.created_at });
  });

  // GET /api/tui/sessions — 세션 목록
  app.get("/api/tui/sessions", (_req, res) => {
    const rows = db
      .prepare("SELECT id, project_id, mode, created_at, updated_at FROM tui_sessions ORDER BY created_at DESC")
      .all() as TuiSession[];

    res.json({ ok: true, rows });
  });

  // GET /api/tui/sessions/:id — 세션 상세
  app.get("/api/tui/sessions/:id", (req, res) => {
    const { id } = req.params;
    const session = db
      .prepare("SELECT id, project_id, mode, created_at, updated_at FROM tui_sessions WHERE id = ?")
      .get(id) as TuiSession | undefined;

    if (!session) {
      return res.status(404).json({ error: "session_not_found" });
    }

    res.json({ ok: true, session });
  });

  // DELETE /api/tui/sessions/:id — 세션 삭제
  app.delete("/api/tui/sessions/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM tui_sessions WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  // POST /api/tui/sessions/:id/messages — 메시지 추가
  app.post("/api/tui/sessions/:id/messages", (req, res) => {
    const { id: session_id } = req.params;

    // Verify session exists
    const session = db
      .prepare("SELECT id FROM tui_sessions WHERE id = ?")
      .get(session_id) as { id: string } | undefined;

    if (!session) {
      return res.status(404).json({ error: "session_not_found" });
    }

    const body = req.body as {
      role: string;
      content: string;
      agent_name?: string;
      metadata?: unknown;
    };

    if (!body.role || !body.content) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    const id = randomUUID();
    const now = nowMs();
    const metadata = body.metadata != null ? JSON.stringify(body.metadata) : null;

    db.prepare(
      "INSERT INTO tui_messages (id, session_id, role, content, agent_name, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(id, session_id, body.role, body.content, body.agent_name ?? null, metadata, now);

    // Update session updated_at
    db.prepare("UPDATE tui_sessions SET updated_at = ? WHERE id = ?").run(now, session_id);

    res.json({ ok: true, id });
  });

  // GET /api/tui/sessions/:id/messages — 메시지 이력 (최신순)
  app.get("/api/tui/sessions/:id/messages", (req, res) => {
    const { id: session_id } = req.params;

    const session = db
      .prepare("SELECT id FROM tui_sessions WHERE id = ?")
      .get(session_id) as { id: string } | undefined;

    if (!session) {
      return res.status(404).json({ error: "session_not_found" });
    }

    const rows = db
      .prepare(
        "SELECT id, session_id, role, content, agent_name, metadata, created_at FROM tui_messages WHERE session_id = ? ORDER BY created_at DESC",
      )
      .all(session_id) as TuiMessage[];

    res.json({ ok: true, rows });
  });
}
