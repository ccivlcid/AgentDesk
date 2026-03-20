import type { ProjectRoutesDeps } from "./types.ts";

export function registerBurndownSourcesRoutes(deps: ProjectRoutesDeps): void {
  const { app, db, nowMs } = deps;

  app.get("/api/projects/:id/burndown", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const rows = db
      .prepare(
        `SELECT created_at, completed_at, status FROM tasks WHERE project_id = ? ORDER BY created_at ASC`,
      )
      .all(id) as { created_at: number; completed_at: number | null; status: string }[];

    if (rows.length === 0) {
      return res.json({ ok: true, burndown: [] });
    }

    const dayMs = 86_400_000;
    const firstDay = Math.floor(rows[0].created_at / dayMs) * dayMs;
    const lastDay = Math.floor(Date.now() / dayMs) * dayMs;
    const dayMap = new Map<number, { created: number; completed: number }>();

    for (let d = firstDay; d <= lastDay; d += dayMs) {
      dayMap.set(d, { created: 0, completed: 0 });
    }

    for (const row of rows) {
      const createdDay = Math.floor(row.created_at / dayMs) * dayMs;
      const entry = dayMap.get(createdDay);
      if (entry) entry.created++;

      if (row.completed_at) {
        const completedDay = Math.floor(row.completed_at / dayMs) * dayMs;
        const cEntry = dayMap.get(completedDay);
        if (cEntry) cEntry.completed++;
      }
    }

    let totalCreated = 0;
    let totalCompleted = 0;
    const burndown: { date: number; total: number; done: number; remaining: number }[] = [];

    for (const [date, { created, completed }] of [...dayMap.entries()].sort((a, b) => a[0] - b[0])) {
      totalCreated += created;
      totalCompleted += completed;
      burndown.push({
        date,
        total: totalCreated,
        done: totalCompleted,
        remaining: totalCreated - totalCompleted,
      });
    }

    res.json({ ok: true, burndown });
  });

  app.get("/api/projects/:id/sources", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const rows = db.prepare(`
      SELECT
        ps.id,
        ps.source_project_id,
        ps.label,
        ps.sort_order,
        p.name AS source_project_name,
        p.category_id AS source_category_id,
        c.name AS source_category_name,
        c.name_ko AS source_category_name_ko,
        c.color AS source_category_color
      FROM project_sources ps
      JOIN projects p ON p.id = ps.source_project_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ps.project_id = ?
      ORDER BY ps.sort_order ASC, ps.created_at ASC
    `).all(id) as Array<{
      id: string;
      source_project_id: string;
      label: string | null;
      sort_order: number;
      source_project_name: string;
      source_category_id: string | null;
      source_category_name: string | null;
      source_category_name_ko: string | null;
      source_category_color: string | null;
    }>;

    const sources = rows.map((row) => {
      const checks = db.prepare(
        `SELECT checked FROM project_deliverable_checks WHERE project_id = ?`,
      ).all(row.source_project_id) as Array<{ checked: number }>;

      const total = checks.length;
      const checked_count = checks.filter((c) => c.checked === 1).length;
      const checked_deliverables = db.prepare(`
        SELECT key, label, note FROM project_deliverable_checks
        WHERE project_id = ? AND checked = 1 ORDER BY checked_at ASC
      `).all(row.source_project_id) as Array<{ key: string; label: string; note: string | null }>;

      return {
        id: row.id,
        source_project_id: row.source_project_id,
        source_project_name: row.source_project_name,
        source_category_id: row.source_category_id,
        source_category_name: row.source_category_name_ko ?? row.source_category_name,
        source_category_color: row.source_category_color,
        label: row.label,
        sort_order: row.sort_order,
        checked_count,
        total_count: total,
        checked_deliverables,
      };
    });

    res.json({ ok: true, sources });
  });

  app.post("/api/projects/:id/sources", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const sourceProjectId = typeof body.source_project_id === "string" ? body.source_project_id.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() || null : null;

    if (!sourceProjectId) return res.status(400).json({ error: "source_project_id_required" });
    if (sourceProjectId === id) return res.status(400).json({ error: "circular_self_reference" });

    const sourceProject = db.prepare("SELECT id FROM projects WHERE id = ?").get(sourceProjectId);
    if (!sourceProject) return res.status(404).json({ error: "source_project_not_found" });

    const circular = db.prepare(
      "SELECT id FROM project_sources WHERE project_id = ? AND source_project_id = ?",
    ).get(sourceProjectId, id);
    if (circular) return res.status(400).json({ error: "circular_reference" });

    const count = (
      db.prepare("SELECT COUNT(*) AS cnt FROM project_sources WHERE project_id = ?").get(id) as { cnt: number }
    ).cnt;
    if (count >= 5) return res.status(400).json({ error: "max_sources_reached" });

    const t = nowMs();
    try {
      db.prepare(
        "INSERT INTO project_sources (project_id, source_project_id, label, sort_order, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(id, sourceProjectId, label, count, t);
    } catch {
      return res.status(409).json({ error: "already_linked" });
    }

    res.json({ ok: true });
  });

  app.delete("/api/projects/:id/sources/:sourceId", (req, res) => {
    const id = String(req.params.id);
    const sourceId = String(req.params.sourceId);
    const row = db.prepare("SELECT id FROM project_sources WHERE id = ? AND project_id = ?").get(sourceId, id);
    if (!row) return res.status(404).json({ error: "not_found" });
    db.prepare("DELETE FROM project_sources WHERE id = ?").run(sourceId);
    res.json({ ok: true });
  });
}
