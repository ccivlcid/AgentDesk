import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import logger from "../../../lib/logger.ts";

interface RegisterProjectTypeTemplateRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

interface ProjectTypeTemplateRow {
  id: string;
  name: string;
  name_ko: string | null;
  name_ja: string | null;
  name_zh: string | null;
  description: string | null;
  icon_svg: string | null;
  default_directive: string | null;
  placeholder_goal: string | null;
  recommended_agent_count: number;
  tags: string | null;
  is_default: number;
  created_at: number;
  updated_at: number;
}

const COLS = `id, name, name_ko, name_ja, name_zh, description, icon_svg,
  default_directive, placeholder_goal, recommended_agent_count, tags,
  is_default, created_at, updated_at`;

export function registerProjectTypeTemplateRoutes({
  app,
  db,
  nowMs,
}: RegisterProjectTypeTemplateRoutesOptions): void {
  /* ── GET /api/project-type-templates ──────────────────────────────────── */
  app.get("/api/project-type-templates", (_req, res) => {
    try {
      const rows = db
        .prepare(`SELECT ${COLS} FROM project_type_templates ORDER BY is_default DESC, name ASC`)
        .all() as unknown as ProjectTypeTemplateRow[];
      res.json({ ok: true, templates: rows });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] GET /api/project-type-templates error");
      res.status(500).json({ error: "fetch_failed" });
    }
  });

  /* ── POST /api/project-type-templates ─────────────────────────────────── */
  app.post("/api/project-type-templates", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = String(body.name ?? "").trim();
      if (!name) {
        return res.status(400).json({ error: "name_required" });
      }

      const id = `ptt-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const now = nowMs();

      db.prepare(
        `INSERT INTO project_type_templates
          (id, name, name_ko, name_ja, name_zh, description, icon_svg,
           default_directive, placeholder_goal, recommended_agent_count, tags,
           is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).run(
        id,
        name,
        (body.name_ko as string | null) ?? null,
        (body.name_ja as string | null) ?? null,
        (body.name_zh as string | null) ?? null,
        (body.description as string | null) ?? null,
        (body.icon_svg as string | null) ?? null,
        (body.default_directive as string | null) ?? null,
        (body.placeholder_goal as string | null) ?? null,
        typeof body.recommended_agent_count === "number" ? body.recommended_agent_count : 3,
        (body.tags as string | null) ?? null,
        now,
        now,
      );

      const row = db
        .prepare(`SELECT ${COLS} FROM project_type_templates WHERE id = ?`)
        .get(id) as unknown as ProjectTypeTemplateRow;
      res.status(201).json({ ok: true, template: row });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] POST /api/project-type-templates error");
      res.status(500).json({ error: "create_failed" });
    }
  });

  /* ── PUT /api/project-type-templates/:id ──────────────────────────────── */
  app.put("/api/project-type-templates/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = db
        .prepare("SELECT id, is_default FROM project_type_templates WHERE id = ?")
        .get(id) as unknown as ProjectTypeTemplateRow | undefined;
      if (!existing) {
        return res.status(404).json({ error: "not_found" });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const now = nowMs();

      const ALLOWED = [
        "name", "name_ko", "name_ja", "name_zh", "description", "icon_svg",
        "default_directive", "placeholder_goal", "recommended_agent_count", "tags",
      ];
      const sets: string[] = ["updated_at = ?"];
      const vals: (string | number | null)[] = [now];

      for (const key of ALLOWED) {
        if (key in body) {
          sets.push(`${key} = ?`);
          vals.push(body[key] as string | number | null);
        }
      }
      vals.push(id);

      db.prepare(
        `UPDATE project_type_templates SET ${sets.join(", ")} WHERE id = ?`,
      ).run(...vals);

      const row = db
        .prepare(`SELECT ${COLS} FROM project_type_templates WHERE id = ?`)
        .get(id) as unknown as ProjectTypeTemplateRow;
      res.json({ ok: true, template: row });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] PUT /api/project-type-templates/:id error");
      res.status(500).json({ error: "update_failed" });
    }
  });

  /* ── DELETE /api/project-type-templates/:id ───────────────────────────── */
  app.delete("/api/project-type-templates/:id", (req, res) => {
    try {
      const { id } = req.params;
      const existing = db
        .prepare("SELECT id, is_default FROM project_type_templates WHERE id = ?")
        .get(id) as unknown as ProjectTypeTemplateRow | undefined;
      if (!existing) {
        return res.status(404).json({ error: "not_found" });
      }
      if (existing.is_default) {
        return res.status(403).json({ error: "cannot_delete_default" });
      }
      db.prepare("DELETE FROM project_type_templates WHERE id = ?").run(id);
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] DELETE /api/project-type-templates/:id error");
      res.status(500).json({ error: "delete_failed" });
    }
  });
}
