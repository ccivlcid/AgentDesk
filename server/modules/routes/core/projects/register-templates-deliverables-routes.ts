import { randomUUID } from "node:crypto";
import type { ProjectRoutesDeps } from "./types.ts";

export function registerTemplatesDeliverablesRoutes(deps: ProjectRoutesDeps): void {
  const { app, db, nowMs, runInTransaction } = deps;

  app.get("/api/project-templates", (_req, res) => {
    const templates = db.prepare(`
      SELECT id, name, description, category, default_pack_key, core_goal_template, is_builtin, created_at, updated_at
      FROM project_templates ORDER BY is_builtin DESC, created_at ASC
    `).all() as Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      default_pack_key: string;
      core_goal_template: string;
      is_builtin: number;
      created_at: number;
      updated_at: number;
    }>;

    const objectives = db.prepare(
      "SELECT id, template_id, title, description, order_index FROM project_template_objectives ORDER BY order_index ASC",
    ).all() as Array<{ id: string; template_id: string; title: string; description: string | null; order_index: number }>;

    const gates = db.prepare(
      "SELECT id, template_id, title, description, gate_type, order_index FROM project_template_gates ORDER BY order_index ASC",
    ).all() as Array<{
      id: string;
      template_id: string;
      title: string;
      description: string | null;
      gate_type: string;
      order_index: number;
    }>;

    const objByTpl = new Map<string, typeof objectives>();
    for (const obj of objectives) {
      if (!objByTpl.has(obj.template_id)) objByTpl.set(obj.template_id, []);
      objByTpl.get(obj.template_id)!.push(obj);
    }
    const gateByTpl = new Map<string, typeof gates>();
    for (const gate of gates) {
      if (!gateByTpl.has(gate.template_id)) gateByTpl.set(gate.template_id, []);
      gateByTpl.get(gate.template_id)!.push(gate);
    }

    res.json({
      ok: true,
      templates: templates.map((tpl) => ({
        ...tpl,
        is_builtin: tpl.is_builtin === 1,
        objectives: objByTpl.get(tpl.id) ?? [],
        gates: gateByTpl.get(tpl.id) ?? [],
      })),
    });
  });

  app.post("/api/project-templates", (req, res) => {
    const {
      name,
      description,
      category,
      default_pack_key,
      core_goal_template,
      objectives = [],
      gates = [],
    } = req.body as {
      name?: string;
      description?: string;
      category?: string;
      default_pack_key?: string;
      core_goal_template?: string;
      objectives?: Array<{ title: string; description?: string }>;
      gates?: Array<{ title: string; description?: string; gate_type?: string }>;
    };
    if (!name?.trim()) return res.status(400).json({ ok: false, error: "name_required" });
    const id = randomUUID();
    const now = nowMs();
    db.prepare(
      "INSERT INTO project_templates (id, name, description, category, default_pack_key, core_goal_template, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
    ).run(
      id,
      name.trim(),
      description?.trim() || null,
      category?.trim() || "general",
      default_pack_key || "development",
      core_goal_template?.trim() || "",
      now,
      now,
    );
    (objectives as Array<{ title: string; description?: string }>).forEach((obj, i) => {
      db.prepare(
        "INSERT INTO project_template_objectives (id, template_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)",
      ).run(randomUUID(), id, obj.title, obj.description || null, i);
    });
    (gates as Array<{ title: string; description?: string; gate_type?: string }>).forEach((gate, i) => {
      db.prepare(
        "INSERT INTO project_template_gates (id, template_id, title, description, gate_type, order_index) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(randomUUID(), id, gate.title, gate.description || null, gate.gate_type || "milestone", i);
    });
    res.json({ ok: true, id });
  });

  app.delete("/api/project-templates/:templateId", (req, res) => {
    const { templateId } = req.params;
    const tpl = db.prepare("SELECT id, is_builtin FROM project_templates WHERE id = ?").get(templateId) as
      | { id: string; is_builtin: number }
      | undefined;
    if (!tpl) return res.status(404).json({ ok: false, error: "not_found" });
    if (tpl.is_builtin) return res.status(403).json({ ok: false, error: "builtin_protected" });
    db.prepare("DELETE FROM project_templates WHERE id = ?").run(templateId);
    res.json({ ok: true });
  });

  app.get("/api/projects/:id/deliverables", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id, category_id FROM projects WHERE id = ?").get(id) as
      | { id: string; category_id: string | null }
      | undefined;
    if (!project) return res.status(404).json({ error: "not_found" });

    let schema: Array<{ key: string; label: string; type?: string }> = [];
    if (project.category_id) {
      const cat = db
        .prepare("SELECT deliverable_schema FROM categories WHERE id = ?")
        .get(project.category_id) as { deliverable_schema: string | null } | undefined;
      if (cat?.deliverable_schema) {
        try {
          schema = JSON.parse(cat.deliverable_schema);
        } catch {
          /* ignore */
        }
      }
    }

    const checks = db
      .prepare(
        "SELECT key, label, checked, checked_at, note FROM project_deliverable_checks WHERE project_id = ?",
      )
      .all(id) as Array<{ key: string; label: string; checked: number; checked_at: number | null; note: string | null }>;

    const checkMap = new Map(checks.map((c) => [c.key, c]));

    const items = schema.map((s) => {
      const existing = checkMap.get(s.key);
      return {
        key: s.key,
        label: s.label,
        type: s.type ?? "document",
        checked: existing ? Boolean(existing.checked) : false,
        checked_at: existing?.checked_at ?? null,
        note: existing?.note ?? null,
      };
    });

    res.json({ ok: true, items });
  });

  app.put("/api/projects/:id/deliverables/:key", (req, res) => {
    const id = String(req.params.id);
    const key = String(req.params.key);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const checked = body.checked === true || body.checked === 1 ? 1 : 0;
    const note = typeof body.note === "string" ? body.note.trim() || null : null;
    const label = typeof body.label === "string" ? body.label.trim() : key;
    const t = nowMs();
    const checkedAt = checked ? t : null;

    db.prepare(`
      INSERT INTO project_deliverable_checks (project_id, key, label, checked, checked_at, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, key) DO UPDATE SET
        checked    = excluded.checked,
        checked_at = excluded.checked_at,
        note       = excluded.note,
        updated_at = excluded.updated_at
    `).run(id, key, label, checked, checkedAt, note, t, t);

    res.json({ ok: true, key, checked: Boolean(checked), checked_at: checkedAt, note });
  });

  app.post("/api/projects/:projectId/apply-template/:templateId", (req, res) => {
    const { projectId, templateId } = req.params;
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project_not_found" });
    const tpl = db.prepare("SELECT id FROM project_templates WHERE id = ?").get(templateId);
    if (!tpl) return res.status(404).json({ ok: false, error: "template_not_found" });

    const now = nowMs();
    const objectives = db.prepare(
      "SELECT title, description, order_index FROM project_template_objectives WHERE template_id = ? ORDER BY order_index ASC",
    ).all(templateId) as Array<{ title: string; description: string | null; order_index: number }>;
    const gates = db.prepare(
      "SELECT title, description, gate_type, order_index FROM project_template_gates WHERE template_id = ? ORDER BY order_index ASC",
    ).all(templateId) as Array<{ title: string; description: string | null; gate_type: string; order_index: number }>;

    runInTransaction(() => {
      for (const obj of objectives) {
        db.prepare(
          "INSERT INTO project_objectives (id, project_id, title, description, progress, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
        ).run(randomUUID(), projectId, obj.title, obj.description, obj.order_index, now, now);
      }
      for (const gate of gates) {
        db.prepare(
          "INSERT INTO project_gates (id, project_id, title, description, gate_type, status, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
        ).run(randomUUID(), projectId, gate.title, gate.description, gate.gate_type, gate.order_index, now, now);
      }
    });

    res.json({ ok: true, objectives_created: objectives.length, gates_created: gates.length });
  });
}
