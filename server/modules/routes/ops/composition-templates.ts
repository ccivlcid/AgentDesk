import { randomUUID } from "node:crypto";
import type { Express } from "express";

interface Deps {
  app: Express;
  db: any;
  nowMs: () => number;
}

export function registerCompositionTemplateRoutes({ app, db, nowMs }: Deps): void {
  app.get("/api/composition-templates", (_req, res) => {
    try {
      const rows = db
        .prepare(
          "SELECT id, name, description, nodes_json, edges_json, created_at, updated_at FROM agent_composition_templates ORDER BY updated_at DESC",
        )
        .all();
      res.json({ ok: true, templates: rows });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to list templates" });
    }
  });

  app.post("/api/composition-templates", (req, res) => {
    try {
      const { name, description, nodes, edges } = req.body ?? {};
      const trimmedName = String(name ?? "").trim().slice(0, 120);
      if (!trimmedName) return res.status(400).json({ error: "name required" });
      const id = randomUUID();
      const now = nowMs();
      db.prepare(
        "INSERT INTO agent_composition_templates (id, name, description, nodes_json, edges_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(
        id,
        trimmedName,
        String(description ?? "").slice(0, 400),
        JSON.stringify(nodes ?? []),
        JSON.stringify(edges ?? []),
        now,
        now,
      );
      res.json({ ok: true, id });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to create template" });
    }
  });

  app.put("/api/composition-templates/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, nodes, edges } = req.body ?? {};
      const fields: string[] = [];
      const values: unknown[] = [];
      if (name !== undefined) {
        fields.push("name = ?");
        values.push(String(name).trim().slice(0, 120));
      }
      if (description !== undefined) {
        fields.push("description = ?");
        values.push(String(description).slice(0, 400));
      }
      if (nodes !== undefined) {
        fields.push("nodes_json = ?");
        values.push(JSON.stringify(nodes));
      }
      if (edges !== undefined) {
        fields.push("edges_json = ?");
        values.push(JSON.stringify(edges));
      }
      if (fields.length === 0) return res.status(400).json({ error: "nothing to update" });
      fields.push("updated_at = ?");
      values.push(nowMs());
      values.push(id);
      const result = db
        .prepare(`UPDATE agent_composition_templates SET ${fields.join(", ")} WHERE id = ?`)
        .run(...values);
      if (result.changes === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to update template" });
    }
  });

  app.delete("/api/composition-templates/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM agent_composition_templates WHERE id = ?").run(req.params.id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ ok: false, error: "Failed to delete template" });
    }
  });
}
