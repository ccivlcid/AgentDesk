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
   * Returns meeting minute entries from DB + parsed docs/team-board.md entries.
   */
  app.get("/api/projects/:id/team-board", (req, res) => {
    const projectId = String(req.params.id);
    try {
      // 1. Meeting minute entries from DB (kickoff & add-tasks meetings)
      const dbEntries: Array<{ timestamp: string; sender: string; target: string; subject: string; body: string }> = [];
      try {
        type MeetingRow = { id: string; meeting_type: string; round: number; title: string; started_at: number };
        type EntryRow = { speaker_name: string; role_label: string | null; message_type: string; content: string; created_at: number };
        const meetings = db.prepare(
          "SELECT id, meeting_type, round, title, started_at FROM meeting_minutes WHERE project_id = ? ORDER BY started_at ASC"
        ).all(projectId) as MeetingRow[];

        for (const mtg of meetings) {
          // System-level header entry for the meeting
          const mtgDate = new Date(mtg.started_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
          const meetingLabel = mtg.meeting_type === "kickoff" ? "Kickoff Meeting" : `Add-Tasks Meeting (Round ${mtg.round})`;
          dbEntries.push({
            timestamp: mtgDate,
            sender: "SYSTEM",
            target: "All",
            subject: `[${meetingLabel}] ${mtg.title ?? ""}`.trim(),
            body: "",
          });

          const entries = db.prepare(
            "SELECT speaker_name, role_label, message_type, content, created_at FROM meeting_minute_entries WHERE meeting_id = ? ORDER BY seq ASC"
          ).all(mtg.id) as EntryRow[];

          for (const entry of entries) {
            const ts = new Date(entry.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            dbEntries.push({
              timestamp: ts,
              sender: entry.speaker_name,
              target: "Team",
              subject: entry.role_label ?? entry.message_type ?? "status",
              body: entry.content,
            });
          }
        }
      } catch { /* meeting_minutes table may not exist in older DBs */ }

      // 2. File-based team-board.md entries
      const fileEntries: Array<{ timestamp: string; sender: string; target: string; subject: string; body: string }> = [];
      const projectPath = resolveProjectPathFromDb(projectId);
      if (projectPath) {
        try {
          const boardPath = path.join(projectPath, "docs", "team-board.md");
          if (fs.existsSync(boardPath)) {
            const content = fs.readFileSync(boardPath, "utf-8");
            const rawSections = content.split(/^---$/m).filter((s) => s.trim());
            const entryRegex = /^##\s*\[([^\]]+)\]\s*(.+?)\s*→\s*(.+?)\s*\|\s*(.+)$/m;
            for (const section of rawSections) {
              const match = section.match(entryRegex);
              if (!match) continue;
              const bodyStart = section.indexOf("\n", section.indexOf(match[0]) + match[0].length);
              fileEntries.push({
                timestamp: match[1].trim(),
                sender: match[2].trim(),
                target: match[3].trim(),
                subject: match[4].trim(),
                body: bodyStart >= 0 ? section.slice(bodyStart).trim() : "",
              });
            }
          }
        } catch { /* ignore file read errors */ }
      }

      const entries = [...dbEntries, ...fileEntries];
      res.json({ ok: true, content: null, entries });
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
