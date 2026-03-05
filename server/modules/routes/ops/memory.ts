import type { Express } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";

type MemoryRow = {
  id: string;
  title: string;
  title_ko: string;
  title_ja: string;
  title_zh: string;
  description: string;
  content: string;
  category: string;
  scope_type: string;
  scope_id: string | null;
  priority: number;
  enabled: number;
  created_at: number;
  updated_at: number;
};

const VALID_CATEGORIES = ["context", "preference", "convention", "knowledge", "instruction", "reference"] as const;
const VALID_SCOPE_TYPES = ["global", "department", "agent", "workflow_pack"] as const;

function isValidCategory(v: unknown): v is string {
  return typeof v === "string" && (VALID_CATEGORIES as readonly string[]).includes(v);
}

function isValidScopeType(v: unknown): v is string {
  return typeof v === "string" && (VALID_SCOPE_TYPES as readonly string[]).includes(v);
}

function toPublic(row: MemoryRow) {
  return { ...row, enabled: !!row.enabled };
}

interface RegisterMemoryRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

export function registerMemoryRoutes({ app, db, nowMs }: RegisterMemoryRoutesOptions): void {
  // GET /api/memory — list with optional filters
  app.get("/api/memory", (_req, res) => {
    try {
      const clauses: string[] = [];
      const params: SQLInputValue[] = [];

      const category = _req.query.category as string | undefined;
      if (category && isValidCategory(category)) {
        clauses.push("m.category = ?");
        params.push(category);
      }

      const scopeType = _req.query.scope_type as string | undefined;
      if (scopeType && isValidScopeType(scopeType)) {
        clauses.push("m.scope_type = ?");
        params.push(scopeType);
      }

      const scopeId = _req.query.scope_id as string | undefined;
      if (scopeId) {
        clauses.push("m.scope_id = ?");
        params.push(scopeId);
      }

      const enabled = _req.query.enabled as string | undefined;
      if (enabled === "1" || enabled === "0") {
        clauses.push("m.enabled = ?");
        params.push(Number(enabled));
      }

      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

      const sql = `
        SELECT m.*,
          CASE
            WHEN m.scope_type = 'department' THEN (SELECT d.name FROM departments d WHERE d.id = m.scope_id)
            WHEN m.scope_type = 'agent' THEN (SELECT a.name FROM agents a WHERE a.id = m.scope_id)
            WHEN m.scope_type = 'workflow_pack' THEN (SELECT w.name FROM workflow_packs w WHERE w.key = m.scope_id)
            ELSE NULL
          END AS scope_label
        FROM memory_entries m
        ${where}
        ORDER BY m.priority DESC, m.created_at DESC
      `;

      const rows = db.prepare(sql).all(...params) as (MemoryRow & { scope_label?: string })[];
      res.json(rows.map((r) => ({ ...toPublic(r), scope_label: r.scope_label ?? null })));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // GET /api/memory/:id — single entry
  app.get("/api/memory/:id", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM memory_entries WHERE id = ?").get(req.params.id) as MemoryRow | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });
      res.json(toPublic(row));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // POST /api/memory — create
  app.post("/api/memory", (req, res) => {
    try {
      const body = req.body ?? {};
      const title = String(body.title ?? "").trim();
      const content = String(body.content ?? "").trim();

      if (!title) return res.status(400).json({ error: "title required" });
      if (!content) return res.status(400).json({ error: "content required" });

      const category = isValidCategory(body.category) ? body.category : "context";
      const scopeType = isValidScopeType(body.scope_type) ? body.scope_type : "global";
      const scopeId = scopeType === "global" ? null : String(body.scope_id ?? "").trim() || null;

      if (scopeType !== "global" && !scopeId) {
        return res.status(400).json({ error: "scope_id required for non-global scope" });
      }

      const id = randomUUID();
      const now = nowMs();
      const priority = Math.max(1, Math.min(100, Number(body.priority) || 50));

      db.prepare(`
        INSERT INTO memory_entries (id, title, title_ko, title_ja, title_zh, description, content, category, scope_type, scope_id, priority, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        title,
        String(body.title_ko ?? "").trim(),
        String(body.title_ja ?? "").trim(),
        String(body.title_zh ?? "").trim(),
        String(body.description ?? "").trim(),
        content,
        category,
        scopeType,
        scopeId,
        priority,
        now,
        now,
      );

      const row = db.prepare("SELECT * FROM memory_entries WHERE id = ?").get(id) as MemoryRow;
      res.status(201).json(toPublic(row));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // PATCH /api/memory/:id — update
  app.patch("/api/memory/:id", (req, res) => {
    try {
      const existing = db.prepare("SELECT * FROM memory_entries WHERE id = ?").get(req.params.id) as
        | MemoryRow
        | undefined;
      if (!existing) return res.status(404).json({ error: "not_found" });

      const body = req.body ?? {};
      const sets: string[] = [];
      const params: SQLInputValue[] = [];

      const stringFields = ["title", "title_ko", "title_ja", "title_zh", "description", "content"] as const;
      for (const field of stringFields) {
        if (body[field] !== undefined) {
          sets.push(`${field} = ?`);
          params.push(String(body[field]).trim());
        }
      }

      if (body.category !== undefined && isValidCategory(body.category)) {
        sets.push("category = ?");
        params.push(body.category);
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

      db.prepare(`UPDATE memory_entries SET ${sets.join(", ")} WHERE id = ?`).run(...params);

      const updated = db.prepare("SELECT * FROM memory_entries WHERE id = ?").get(req.params.id) as MemoryRow;
      res.json(toPublic(updated));
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // PATCH /api/memory/:id/toggle — toggle enabled
  app.patch("/api/memory/:id/toggle", (req, res) => {
    try {
      const row = db.prepare("SELECT * FROM memory_entries WHERE id = ?").get(req.params.id) as
        | MemoryRow
        | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });

      const newEnabled = row.enabled ? 0 : 1;
      db.prepare("UPDATE memory_entries SET enabled = ?, updated_at = ? WHERE id = ?").run(
        newEnabled,
        nowMs(),
        req.params.id,
      );

      res.json({ id: req.params.id, enabled: !!newEnabled });
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });

  // DELETE /api/memory/:id
  app.delete("/api/memory/:id", (req, res) => {
    try {
      const row = db.prepare("SELECT id FROM memory_entries WHERE id = ?").get(req.params.id) as
        | { id: string }
        | undefined;
      if (!row) return res.status(404).json({ error: "not_found" });

      db.prepare("DELETE FROM memory_entries WHERE id = ?").run(req.params.id);
      res.json({ ok: true });
    } catch (err: unknown) {
      res.status(500).json({ error: String((err as Error).message ?? err) });
    }
  });
}
