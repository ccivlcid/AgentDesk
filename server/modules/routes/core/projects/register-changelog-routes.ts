import type { ProjectRoutesDeps } from "./types.ts";

export function registerChangelogRoutes(deps: ProjectRoutesDeps): void {
  const { app, db } = deps;

  // GET /api/projects/:id/changelog — returns changelog entries
  app.get("/api/projects/:id/changelog", (req, res) => {
    const projectId = String(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "not_found" });

    const entries = db
      .prepare(
        `SELECT id, project_id, version, task_id, entry_type, summary, detail, created_at
         FROM project_changelog_entries
         WHERE project_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(projectId, limit, offset);

    const countRow = db
      .prepare("SELECT COUNT(*) as cnt FROM project_changelog_entries WHERE project_id = ?")
      .get(projectId) as { cnt: number };

    res.json({ ok: true, entries, total: countRow.cnt });
  });

  // GET /api/projects/:id/version — returns current version
  app.get("/api/projects/:id/version", (req, res) => {
    const projectId = String(req.params.id);

    const row = db
      .prepare("SELECT current_version FROM projects WHERE id = ?")
      .get(projectId) as { current_version: string | null } | undefined;

    if (!row) return res.status(404).json({ error: "not_found" });

    res.json({ ok: true, version: row.current_version || "0.1.0" });
  });
}
