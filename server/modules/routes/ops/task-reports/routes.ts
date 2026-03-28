import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import logger from "../../../../lib/logger";
import { createTaskReportHelpers } from "./helpers.ts";
import { createCleanResultText } from "./deliverable-result-text.ts";
import { createGitArtifactBackfill } from "./git-artifact-backfill.ts";
import { registerTaskReportArtifactRoutes } from "./artifact-http-routes.ts";
import { registerTaskReportDetailGet } from "./task-report-detail-route.ts";

export function registerTaskReportRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs, archivePlanningConsolidatedReport } = ctx;
  const taskReportHelpers = createTaskReportHelpers({ db, nowMs });
  const { normalizeTaskText, normalizeProjectName } = taskReportHelpers;

  const { cleanResultText } = createCleanResultText(db);
  const { backfillArtifactsFromGit } = createGitArtifactBackfill({ db, nowMs, logger });

  registerTaskReportDetailGet(app, db, nowMs, taskReportHelpers);

  app.get("/api/task-reports", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.source_task_id, t.created_at, t.completed_at,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name, '') AS agent_name_ko,
             COALESCE(a.role, '') AS agent_role,
             COALESCE(d.name, '') AS dept_name,
             COALESCE(d.name_ko, '') AS dept_name_ko,
             COALESCE(p.name, '') AS project_name_db
      FROM tasks t
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.status = 'done'
        AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
      ORDER BY t.completed_at DESC
      LIMIT 50
    `,
        )
        .all() as Array<Record<string, unknown>>;

      const reports = rows.map((row) => ({
        ...row,
        project_name:
          normalizeTaskText(row.project_name_db) ||
          normalizeProjectName(row.project_path, normalizeTaskText(row.title) || "General"),
      }));
      res.json({ ok: true, reports });
    } catch (err) {
      logger.error({ err }, "[task-reports]");
      res.status(500).json({ ok: false, error: "Failed to fetch reports" });
    }
  });

  app.post("/api/task-reports/:taskId/archive", async (req, res) => {
    const { taskId } = req.params;
    try {
      if (typeof archivePlanningConsolidatedReport !== "function") {
        return res.status(503).json({ ok: false, error: "archive_generator_unavailable" });
      }
      const row = db.prepare("SELECT id, source_task_id FROM tasks WHERE id = ?").get(taskId) as
        | { id: string; source_task_id: string | null }
        | undefined;
      if (!row) return res.status(404).json({ ok: false, error: "Task not found" });

      const rootTaskId = normalizeTaskText(row.source_task_id) || row.id;
      await archivePlanningConsolidatedReport(rootTaskId);

      const archive = db
        .prepare(
          `
      SELECT root_task_id, generated_by_agent_id, updated_at
      FROM task_report_archives
      WHERE root_task_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `,
        )
        .get(rootTaskId) as
        | { root_task_id: string; generated_by_agent_id: string | null; updated_at: number }
        | undefined;

      if (!archive) {
        return res.status(500).json({ ok: false, error: "Failed to archive consolidated report" });
      }

      res.json({
        ok: true,
        root_task_id: archive.root_task_id,
        generated_by_agent_id: archive.generated_by_agent_id,
        updated_at: archive.updated_at,
      });
    } catch (err) {
      logger.error({ err }, "[task-reports/:id/archive]");
      res.status(500).json({ ok: false, error: "Failed to archive consolidated report" });
    }
  });

  app.get("/api/deliverables", (_req, res) => {
    try {
      try {
        db.prepare(
          "UPDATE tasks SET project_path = ? WHERE status IN ('done','review') AND (project_path IS NULL OR TRIM(project_path) = '')",
        ).run(process.cwd());
      } catch {
        /* best effort */
      }

      try {
        backfillArtifactsFromGit(process.cwd());
      } catch {
        /* best effort */
      }

      const rows = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.result, t.source_task_id,
             t.created_at, t.completed_at, t.started_at,
             t.output_format, t.workflow_pack_key,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name, '') AS agent_name_ko,
             COALESCE(a.role, '') AS agent_role,
             COALESCE(a.avatar_emoji, '') AS agent_avatar,
             COALESCE(d.name, '') AS dept_name,
             COALESCE(d.name_ko, '') AS dept_name_ko,
             COALESCE(p.name, '') AS project_name_db
      FROM tasks t
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.status IN ('done', 'review')
        AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
        AND (
          (t.result IS NOT NULL AND TRIM(t.result) != '')
          OR EXISTS (SELECT 1 FROM task_artifacts ta WHERE ta.task_id = t.id)
        )
      ORDER BY t.completed_at DESC, t.updated_at DESC
      LIMIT 100
    `,
        )
        .all() as Array<Record<string, unknown>>;

      const deliverables = rows.map((row) => ({
        ...row,
        result: cleanResultText(row.result, row.id as string),
        project_name:
          normalizeTaskText(row.project_name_db) ||
          normalizeProjectName(row.project_path, normalizeTaskText(row.title) || "General"),
      }));
      res.json({ ok: true, deliverables });
    } catch (err) {
      logger.error({ err }, "[deliverables]");
      res.status(500).json({ ok: false, error: "Failed to fetch deliverables" });
    }
  });

  registerTaskReportArtifactRoutes(app, db);
}
