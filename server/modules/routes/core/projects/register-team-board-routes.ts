import fs from "node:fs";
import path from "node:path";
import logger from "../../../../lib/logger.ts";
import type { ProjectRoutesDeps } from "./types.ts";

export function registerTeamBoardRoutes(deps: ProjectRoutesDeps): void {
  const { app, db } = deps;

  function resolveProjectPathFromDb(projectId: string): string | null {
    const row = db.prepare("SELECT project_path FROM projects WHERE id = ?").get(projectId) as { project_path: string | null } | undefined;
    return row?.project_path || null;
  }

  /**
   * GET /api/projects/:id/team-board
   * Returns the content of docs/team-board.md for the project.
   */
  app.get("/api/projects/:id/team-board", (req, res) => {
    const projectId = String(req.params.id);
    try {
      const projectPath = resolveProjectPathFromDb(projectId);
      if (!projectPath) return res.json({ ok: true, content: null, entries: [] });

      const boardPath = path.join(projectPath, "docs", "team-board.md");
      if (!fs.existsSync(boardPath)) return res.json({ ok: true, content: null, entries: [] });

      const content = fs.readFileSync(boardPath, "utf-8");
      // Parse entries: split by --- separator, each section starts with ## [timestamp] sender → target | subject
      const rawSections = content.split(/^---$/m).filter((s) => s.trim());
      const entryRegex = /^##\s*\[([^\]]+)\]\s*(.+?)\s*→\s*(.+?)\s*\|\s*(.+)$/m;
      const entries = rawSections
        .map((section) => {
          const match = section.match(entryRegex);
          if (!match) return null;
          const bodyStart = section.indexOf("\n", section.indexOf(match[0]) + match[0].length);
          return {
            timestamp: match[1].trim(),
            sender: match[2].trim(),
            target: match[3].trim(),
            subject: match[4].trim(),
            body: bodyStart >= 0 ? section.slice(bodyStart).trim() : "",
          };
        })
        .filter(Boolean);

      res.json({ ok: true, content, entries });
    } catch (err) {
      logger.error({ err, projectId }, "[team-board] read failed");
      res.status(500).json({ ok: false, error: "read_failed" });
    }
  });

  /**
   * GET /api/projects/:id/tasks/:taskId/report-md
   * Returns the content of docs/tasks/{taskId}-report.md for the project.
   */
  app.get("/api/projects/:id/tasks/:taskId/report-md", (req, res) => {
    const projectId = String(req.params.id);
    const taskId = String(req.params.taskId);
    try {
      const projectPath = resolveProjectPathFromDb(projectId);
      if (!projectPath) return res.json({ ok: true, content: null });

      const reportPath = path.join(projectPath, "docs", "tasks", `${taskId}-report.md`);
      if (!fs.existsSync(reportPath)) return res.json({ ok: true, content: null });

      const content = fs.readFileSync(reportPath, "utf-8");
      res.json({ ok: true, content });
    } catch (err) {
      logger.error({ err, projectId, taskId }, "[task-report-md] read failed");
      res.status(500).json({ ok: false, error: "read_failed" });
    }
  });
}
