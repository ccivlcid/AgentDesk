import type { Express } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";

type HookRow = {
  id: string;
  title: string;
  title_ko: string;
  title_ja: string;
  title_zh: string;
  description: string;
  command: string;
  event_type: string;
  working_directory: string;
  timeout_ms: number;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  enabled: number;
  execution_count: number;
  last_executed_at: number | null;
  created_at: number;
  updated_at: number;
};

const VALID_EVENT_TYPES = ["pre-task", "post-task", "on-error", "on-complete", "on-status-change", "on-start"] as const;
const VALID_SCOPE_TYPES = ["global", "department", "agent", "workflow_pack"] as const;

function isValidEventType(v: unknown): v is string {
  return typeof v === "string" && (VALID_EVENT_TYPES as readonly string[]).includes(v);
}

function isValidScopeType(v: unknown): v is string {
  return typeof v === "string" && (VALID_SCOPE_TYPES as readonly string[]).includes(v);
}

function toPublic(row: HookRow) {
  return { ...row, enabled: !!row.enabled };
}

interface RegisterHookRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

export function registerHookRoutes({ app, db, nowMs }: RegisterHookRoutesOptions): void {
  // GET /api/hooks — list with optional filters
  app.get("/api/hooks", (_req, res) => {
    try {
      const clauses: string[] = [];
      const params: SQLInputValue[] = [];

      const eventType = _req.query.event_type as string | undefined;
      if (eventType && isValidEventType(eventType)) {
        clauses.push("h.event_type = ?");
        params.push(eventType);
      }

      const scopeType = _req.query.scope_type as string | undefined;
      if (scopeType && isValidScopeType(scopeType)) {
        clauses.push("h.scope_type = ?");
        params.push(scopeType);
      }

      const scopeId = _req.query.scope_id as string | undefined;
      if (scopeId) {
        clauses.push("h.scope_id = ?");
        params.push(scopeId);
      }

      const enabled = _req.query.enabled as string | undefined;
      if (enabled === "1" || enabled === "0") {
        clauses.push("h.enabled = ?");
        params.push(Number(enabled));
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      const sql = `
        SELECT h.*,
          CASE
            WHEN h.scope_type = 'department' THEN (SELECT d.name FROM departments d WHERE d.id = h.scope_id)
            WHEN h.scope_type = 'agent' THEN (SELECT a.name FROM agents a WHERE a.id = h.scope_id)
            WHEN h.scope_type = 'workflow_pack' THEN (SELECT w.name FROM workflow_packs w WHERE w.key = h.scope_id)
            ELSE NULL
          END AS scope_label
        FROM hook_entries h
        ${where}
        ORDER BY h.priority DESC, h.created_at DESC
      `;

      const rows = db.prepare(sql).all(...params) as (HookRow & { scope_label?: string })[];
      res.json(rows.map((r) => ({ ...toPublic(r), scope_label: r.scope_label ?? null })));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // GET /api/hooks/:id — single hook
  app.get("/api/hooks/:id", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM hook_entries WHERE id = ?").get(req.params.id) as HookRow | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });
      res.json(toPublic(row));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // POST /api/hooks — create
  app.post("/api/hooks", (req, res) => {
    try {
      const body = req.body ?? {};
      const title = String(body.title ?? "").trim();
      const command = String(body.command ?? "").trim();

      if (!title) return res.status(400).json({ error: "title required" });
      if (!command) return res.status(400).json({ error: "command required" });

      const eventType = isValidEventType(body.event_type) ? body.event_type : "pre-task";
      const scopeType = isValidScopeType(body.scope_type) ? body.scope_type : "global";
      const scopeId = scopeType === "global" ? null : String(body.scope_id ?? "").trim() || null;

      if (scopeType !== "global" && !scopeId) {
        return res.status(400).json({ error: "scope_id required for non-global scope" });
      }

      const id = randomUUID();
      const now = nowMs();
      const priority = Math.max(1, Math.min(100, Number(body.priority) || 50));
      const timeoutMs = Math.max(1000, Math.min(300000, Number(body.timeout_ms) || 30000));

      db.prepare(`
        INSERT INTO hook_entries (id, title, title_ko, title_ja, title_zh, description, command, event_type, working_directory, timeout_ms, scope_type, scope_id, priority, enabled, execution_count, last_executed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NULL, ?, ?)
      `).run(
        id,
        title,
        String(body.title_ko ?? "").trim(),
        String(body.title_ja ?? "").trim(),
        String(body.title_zh ?? "").trim(),
        String(body.description ?? "").trim(),
        command,
        eventType,
        String(body.working_directory ?? "").trim(),
        timeoutMs,
        scopeType,
        scopeId,
        priority,
        now,
        now,
      );

      const row = db.prepare("SELECT * FROM hook_entries WHERE id = ?").get(id) as HookRow;
      res.status(201).json(toPublic(row));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // PATCH /api/hooks/:id — update
  app.patch("/api/hooks/:id", (req, res) => {
    try {
      const existing = db.prepare("SELECT * FROM hook_entries WHERE id = ?").get(req.params.id) as
        | HookRow
        | undefined;
      if (!existing) return res.status(404).json({ error: "not_found" });

      const body = req.body ?? {};
      const sets: string[] = [];
      const params: SQLInputValue[] = [];

      const stringFields = ["title", "title_ko", "title_ja", "title_zh", "description", "command", "working_directory"] as const;
      for (const field of stringFields) {
        if (body[field] !== undefined) {
          sets.push(`${field} = ?`);
          params.push(String(body[field]).trim());
        }
      }

      if (body.event_type !== undefined && isValidEventType(body.event_type)) {
        sets.push("event_type = ?");
        params.push(body.event_type);
      }

      if (body.timeout_ms !== undefined) {
        sets.push("timeout_ms = ?");
        params.push(Math.max(1000, Math.min(300000, Number(body.timeout_ms) || 30000)));
      }

      if (body.scope_type !== undefined && isValidScopeType(body.scope_type)) {
        sets.push("scope_type = ?");
        params.push(body.scope_type);
        const newScopeType = body.scope_type;
        const newScopeId = newScopeType === "global" ? null : String(body.scope_id ?? "").trim() || null;
        if (newScopeType !== "global" && !newScopeId) {
          return res.status(400).json({ error: "scope_id required for non-global scope" });
        }
        sets.push("scope_id = ?");
        params.push(newScopeId);
      } else if (body.scope_id !== undefined) {
        sets.push("scope_id = ?");
        params.push(String(body.scope_id).trim() || null);
      }

      if (body.priority !== undefined) {
        sets.push("priority = ?");
        params.push(Math.max(1, Math.min(100, Number(body.priority) || 50)));
      }

      if (body.enabled !== undefined) {
        sets.push("enabled = ?");
        params.push(body.enabled ? 1 : 0);
      }

      if (sets.length === 0) return res.status(400).json({ error: "no fields to update" });

      sets.push("updated_at = ?");
      params.push(nowMs());
      params.push(req.params.id);

      db.prepare(`UPDATE hook_entries SET ${sets.join(", ")} WHERE id = ?`).run(...params);

      const updated = db.prepare("SELECT * FROM hook_entries WHERE id = ?").get(req.params.id) as HookRow;
      res.json(toPublic(updated));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // PATCH /api/hooks/:id/toggle — toggle enabled
  app.patch("/api/hooks/:id/toggle", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM hook_entries WHERE id = ?").get(req.params.id) as
        | HookRow
        | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });

      const newEnabled = row.enabled ? 0 : 1;
      db.prepare("UPDATE hook_entries SET enabled = ?, updated_at = ? WHERE id = ?").run(
        newEnabled,
        nowMs(),
        req.params.id,
      );

      res.json({ id: req.params.id, enabled: !!newEnabled });
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // DELETE /api/hooks/:id
  app.delete("/api/hooks/:id", (req, res) => {
    try {
      const row = db.prepare("SELECT id FROM hook_entries WHERE id = ?").get(req.params.id) as
        | { id: string }
        | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });

      db.prepare("DELETE FROM hook_entries WHERE id = ?").run(req.params.id);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });
}
