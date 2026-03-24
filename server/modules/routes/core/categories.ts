import type { Express } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";
import logger from "../../../lib/logger.ts";

interface RegisterCategoryRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

const CATEGORY_COLS = `id, name, name_ko, slug, description, icon, color,
  kpi_schema, risk_schema, gate_schema, deliverable_schema,
  is_template, version, owner_scope, created_at, updated_at`;

export function registerCategoryRoutes({ app, db, nowMs }: RegisterCategoryRoutesOptions): void {
  /* ── GET /api/categories ─────────────────────────────────────────────────── */
  app.get("/api/categories", (_req, res) => {
    try {
      const rows = db
        .prepare(`SELECT ${CATEGORY_COLS} FROM categories ORDER BY owner_scope DESC, name ASC`)
        .all();
      res.json({ ok: true, categories: rows });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] GET /api/categories error:");
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  /* ── POST /api/categories ────────────────────────────────────────────────── */
  app.post("/api/categories", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = String(body.name ?? "").trim();
      if (!name) return res.status(400).json({ error: "name is required" });

      const id = (body.id as string | undefined) || `cat_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const slug = String(body.slug ?? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
      const now = nowMs();

      db.prepare(
        `INSERT INTO categories (
          id, name, name_ko, slug, description, icon, color,
          kpi_schema, risk_schema, gate_schema, deliverable_schema,
          is_template, version, owner_scope, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      ).run(
        id,
        name,
        (body.name_ko ?? null) as string | null,
        slug,
        (body.description ?? null) as string | null,
        (body.icon ?? "folder") as string,
        (body.color ?? "#64748b") as string,
        (body.kpi_schema ?? "[]") as string,
        (body.risk_schema ?? "[]") as string,
        (body.gate_schema ?? "[]") as string,
        (body.deliverable_schema ?? "[]") as string,
        (body.is_template ?? 1) as number,
        (body.owner_scope ?? "org") as string,
        now,
        now,
      );

      const row = db.prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE id = ?`).get(id);
      res.status(201).json({ ok: true, category: row });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] POST /api/categories error:");
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  /* ── PATCH /api/categories/:id ───────────────────────────────────────────── */
  app.patch("/api/categories/:id", (req, res) => {
    try {
      const { id } = req.params;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const existing = db.prepare("SELECT id, version FROM categories WHERE id = ?").get(id) as
        | { id: string; version: number }
        | undefined;
      if (!existing) return res.status(404).json({ error: "Category not found" });

      const ALLOWED = ["name", "name_ko", "slug", "description", "icon", "color",
        "kpi_schema", "risk_schema", "gate_schema", "deliverable_schema", "owner_scope"];
      const sets: string[] = ["updated_at = ?", "version = ?"];
      const vals: SQLInputValue[] = [nowMs(), existing.version + 1];

      for (const key of ALLOWED) {
        if (key in body) {
          sets.push(`${key} = ?`);
          vals.push(body[key] as SQLInputValue);
        }
      }
      vals.push(id);

      db.prepare(`UPDATE categories SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      const row = db.prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE id = ?`).get(id);
      res.json({ ok: true, category: row });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] PATCH /api/categories/:id error:");
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  /* ── DELETE /api/categories/:id ──────────────────────────────────────────── */
  app.delete("/api/categories/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = db.prepare("SELECT id, owner_scope FROM categories WHERE id = ?").get(id) as
        | { id: string; owner_scope: string }
        | undefined;
      if (!existing) return res.status(404).json({ error: "Category not found" });
      if (existing.owner_scope === "global") {
        return res.status(403).json({ error: "Cannot delete a global built-in category" });
      }
      db.prepare("DELETE FROM categories WHERE id = ?").run(id);
      res.status(204).end();
    } catch (err) {
      logger.error({ err }, "[AgentDesk] DELETE /api/categories/:id error:");
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  /* ── GET /api/categories/:id/versions ───────────────────────────────────── */
  app.get("/api/categories/:id/versions", (req, res) => {
    try {
      const { id } = req.params;
      const rows = db
        .prepare(
          `SELECT id, category_id, snapshot, created_at
           FROM category_versions WHERE category_id = ? ORDER BY created_at DESC`,
        )
        .all(id);
      res.json({ ok: true, versions: rows });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] GET /api/categories/:id/versions error:");
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  /* ── POST /api/categories/:id/clone ─────────────────────────────────────── */
  app.post("/api/categories/:id/clone", (req, res) => {
    try {
      const { id } = req.params;
      const body = (req.body ?? {}) as { name?: string };
      const source = db.prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE id = ?`).get(id) as
        | Record<string, unknown>
        | undefined;
      if (!source) return res.status(404).json({ error: "Category not found" });

      const newId = `cat_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const newName = body.name ?? `${String(source.name)} (복사본)`;
      const newSlug = `${String(source.slug)}-copy-${Date.now()}`;
      const now = nowMs();

      db.prepare(
        `INSERT INTO categories (
          id, name, name_ko, slug, description, icon, color,
          kpi_schema, risk_schema, gate_schema, deliverable_schema,
          is_template, version, owner_scope, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'org', ?, ?)`,
      ).run(
        newId, newName, source.name_ko as SQLInputValue, newSlug, source.description as SQLInputValue,
        source.icon as SQLInputValue, source.color as SQLInputValue,
        source.kpi_schema as SQLInputValue, source.risk_schema as SQLInputValue,
        source.gate_schema as SQLInputValue, source.deliverable_schema as SQLInputValue,
        source.is_template as SQLInputValue,
        now, now,
      );

      const row = db.prepare(`SELECT ${CATEGORY_COLS} FROM categories WHERE id = ?`).get(newId);
      res.status(201).json({ ok: true, category: row });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] POST /api/categories/:id/clone error:");
      res.status(500).json({ error: "Failed to clone category" });
    }
  });
}
