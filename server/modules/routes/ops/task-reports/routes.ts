import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import { prettyStreamJson } from "../terminal/pretty-stream-json.ts";
import { createTaskReportHelpers } from "./helpers.ts";

export function registerTaskReportRoutes(ctx: RuntimeContext): void {
  const { app, db, nowMs, archivePlanningConsolidatedReport } = ctx;
  const {
    normalizeTaskText,
    buildTextPreview,
    normalizeProjectName,
    sortReportDocuments,
    fetchMeetingMinutesForTask,
    buildTaskSection,
  } = createTaskReportHelpers({ db, nowMs });

  app.get("/api/task-reports", (_req, res) => {
    try {
      const rows = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.source_task_id, t.created_at, t.completed_at,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name_ko, '') AS agent_name_ko,
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
      console.error("[task-reports]", err);
      res.status(500).json({ ok: false, error: "Failed to fetch reports" });
    }
  });

  app.get("/api/task-reports/:taskId", (req, res) => {
    const { taskId } = req.params;
    try {
      const taskWithJoins = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.result, t.source_task_id,
             t.created_at, t.started_at, t.completed_at,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name_ko, '') AS agent_name_ko,
             COALESCE(a.role, '') AS agent_role,
             COALESCE(d.name, '') AS dept_name,
             COALESCE(d.name_ko, '') AS dept_name_ko,
             COALESCE(p.name, '') AS project_name_db,
             COALESCE(p.project_path, '') AS project_path_db,
             COALESCE(p.core_goal, '') AS project_core_goal
      FROM tasks t
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `,
        )
        .get(taskId) as Record<string, unknown> | undefined;
      if (!taskWithJoins) return res.status(404).json({ ok: false, error: "Task not found" });

      const rootTaskId = normalizeTaskText(taskWithJoins.source_task_id) || String(taskWithJoins.id);
      const rootTask = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.result, t.source_task_id,
             t.created_at, t.started_at, t.completed_at,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name_ko, '') AS agent_name_ko,
             COALESCE(a.role, '') AS agent_role,
             COALESCE(d.name, '') AS dept_name,
             COALESCE(d.name_ko, '') AS dept_name_ko,
             COALESCE(p.name, '') AS project_name_db,
             COALESCE(p.project_path, '') AS project_path_db,
             COALESCE(p.core_goal, '') AS project_core_goal
      FROM tasks t
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ?
    `,
        )
        .get(rootTaskId) as Record<string, unknown> | undefined;
      if (!rootTask) return res.status(404).json({ ok: false, error: "Root task not found" });

      const relatedTasks = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.result, t.source_task_id,
             t.created_at, t.started_at, t.completed_at,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name_ko, '') AS agent_name_ko,
             COALESCE(a.role, '') AS agent_role,
             COALESCE(d.name, '') AS dept_name,
             COALESCE(d.name_ko, '') AS dept_name_ko,
             COALESCE(p.name, '') AS project_name_db,
             COALESCE(p.project_path, '') AS project_path_db,
             COALESCE(p.core_goal, '') AS project_core_goal
      FROM tasks t
      LEFT JOIN agents a ON a.id = t.assigned_agent_id
      LEFT JOIN departments d ON d.id = t.department_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.id = ? OR t.source_task_id = ?
      ORDER BY CASE WHEN t.id = ? THEN 0 ELSE 1 END, t.completed_at DESC, t.created_at ASC
    `,
        )
        .all(rootTaskId, rootTaskId, rootTaskId) as Array<Record<string, unknown>>;

      const rootSubtasks = db
        .prepare(
          `
      SELECT s.id, s.title, s.status, s.assigned_agent_id, s.target_department_id, s.delegated_task_id, s.completed_at,
             COALESCE(a.name, '') AS agent_name, COALESCE(a.name_ko, '') AS agent_name_ko,
             COALESCE(d.name, '') AS target_dept_name, COALESCE(d.name_ko, '') AS target_dept_name_ko
      FROM subtasks s
      LEFT JOIN agents a ON a.id = s.assigned_agent_id
      LEFT JOIN departments d ON d.id = s.target_department_id
      WHERE s.task_id = ?
      ORDER BY s.created_at ASC
    `,
        )
        .all(rootTaskId) as Array<Record<string, unknown>>;

      const linkedSubtasksByTaskId = new Map<string, Array<Record<string, unknown>>>();
      for (const st of rootSubtasks) {
        const delegatedTaskId = normalizeTaskText(st.delegated_task_id);
        if (!delegatedTaskId) continue;
        const bucket = linkedSubtasksByTaskId.get(delegatedTaskId) ?? [];
        bucket.push(st);
        linkedSubtasksByTaskId.set(delegatedTaskId, bucket);
      }

      const teamReports = relatedTasks.map((item) =>
        buildTaskSection(item, linkedSubtasksByTaskId.get(String(item.id)) ?? []),
      );

      const planningSection =
        teamReports.find((s) => s.task_id === rootTaskId && s.department_id === "planning") ??
        teamReports.find((s) => s.department_id === "planning") ??
        teamReports[0] ??
        null;

      const projectId = normalizeTaskText(rootTask.project_id) || null;
      const projectPath =
        normalizeTaskText(rootTask.project_path_db) || normalizeTaskText(rootTask.project_path) || null;
      const projectName =
        normalizeTaskText(rootTask.project_name_db) ||
        normalizeProjectName(projectPath, normalizeTaskText(rootTask.title) || "General");
      const projectCoreGoal = normalizeTaskText(rootTask.project_core_goal) || null;

      const rootLogs = db
        .prepare("SELECT kind, message, created_at FROM task_logs WHERE task_id = ? ORDER BY created_at ASC")
        .all(rootTaskId);
      const rootMinutes = fetchMeetingMinutesForTask(rootTaskId);

      const archiveRow = db
        .prepare(
          `
      SELECT a.summary_markdown, a.updated_at, a.created_at, a.generated_by_agent_id,
             COALESCE(ag.name, '') AS agent_name,
             COALESCE(ag.name_ko, '') AS agent_name_ko
      FROM task_report_archives a
      LEFT JOIN agents ag ON ag.id = a.generated_by_agent_id
      WHERE a.root_task_id = ?
      ORDER BY a.updated_at DESC
      LIMIT 1
    `,
        )
        .get(rootTaskId) as Record<string, unknown> | undefined;

      const archiveSummaryContent = normalizeTaskText(archiveRow?.summary_markdown);
      const planningArchiveDoc = archiveSummaryContent
        ? sortReportDocuments([
            {
              id: `archive:${rootTaskId}`,
              title: `${projectName}-planning-consolidated.md`,
              source: "archive",
              path: null,
              mime: "text/markdown",
              size_bytes: archiveSummaryContent.length,
              updated_at: Number(archiveRow?.updated_at ?? archiveRow?.created_at ?? 0) || nowMs(),
              truncated: false,
              text_preview: buildTextPreview(archiveSummaryContent),
              content: archiveSummaryContent,
            },
          ])
        : [];

      const planningSummary = planningSection
        ? {
            title: "Planning Lead Consolidated Summary",
            content: archiveSummaryContent || planningSection.summary || "",
            source_task_id: planningSection.task_id ?? rootTaskId,
            source_agent_name: normalizeTaskText(archiveRow?.agent_name) || planningSection.agent_name,
            source_department_name: planningSection.department_name,
            generated_at: Number(
              archiveRow?.updated_at ??
                archiveRow?.created_at ??
                planningSection.completed_at ??
                planningSection.created_at ??
                nowMs(),
            ),
            documents: sortReportDocuments([
              ...planningArchiveDoc,
              ...((planningSection.documents ?? []) as Array<Record<string, unknown>>),
            ]),
          }
        : {
            title: "Planning Lead Consolidated Summary",
            content: archiveSummaryContent || "",
            source_task_id: rootTaskId,
            source_agent_name: normalizeTaskText(archiveRow?.agent_name) || "",
            source_department_name: "",
            generated_at: Number(archiveRow?.updated_at ?? archiveRow?.created_at ?? nowMs()),
            documents: planningArchiveDoc,
          };

      res.json({
        ok: true,
        requested_task_id: String(taskWithJoins.id),
        project: {
          root_task_id: rootTaskId,
          project_id: projectId,
          project_name: projectName,
          project_path: projectPath,
          core_goal: projectCoreGoal,
        },
        task: rootTask,
        logs: rootLogs,
        subtasks: rootSubtasks,
        meeting_minutes: rootMinutes,
        planning_summary: planningSummary,
        team_reports: teamReports,
      });
    } catch (err) {
      console.error("[task-reports/:id]", err);
      res.status(500).json({ ok: false, error: "Failed to fetch report detail" });
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
      console.error("[task-reports/:id/archive]", err);
      res.status(500).json({ ok: false, error: "Failed to archive consolidated report" });
    }
  });

  /** Extract clean summary text from raw CLI streaming JSON result */
  /** Clean up markdown links with dead worktree paths → show just the filename */
  function cleanWorktreePaths(text: string): string {
    // Convert markdown links [filename](worktree-path) → just "filename"
    // e.g., [2026-03-05-analysis.pptx](C:\...\\.agentdesk-worktrees\...\file.pptx) → 2026-03-05-analysis.pptx
    let cleaned = text.replace(
      /\[([^\]]+)\]\([^)]*\.agentdesk-worktrees[^)]*\)/g,
      "$1",
    );
    // Remove remaining bare worktree absolute paths
    cleaned = cleaned.replace(
      /[A-Za-z]:[\\\/][^\s]*?\.agentdesk-worktrees[\\\/][^\s)}\]"]*/g,
      "",
    );
    // Clean up resulting empty list items like "- \n" or "- :"
    cleaned = cleaned.replace(/^-\s*:?\s*$/gm, "").trim();
    // Collapse multiple blank lines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned;
  }

  /** Replace stale filenames in result text with actual artifact filenames from DB */
  function replaceStaleFilenames(text: string, taskId: string): string {
    const artifacts = db
      .prepare("SELECT file_name FROM task_artifacts WHERE task_id = ?")
      .all(taskId) as Array<{ file_name: string }>;
    if (artifacts.length === 0) return text;

    // Build a map: extension → set of actual artifact filenames
    const byExt = new Map<string, string[]>();
    for (const a of artifacts) {
      const ext = path.extname(a.file_name).toLowerCase();
      if (!byExt.has(ext)) byExt.set(ext, []);
      byExt.get(ext)!.push(a.file_name);
    }
    const artifactNameSet = new Set(artifacts.map((a) => a.file_name));

    // Find filename-like patterns in result text and check if they're stale
    return text.replace(
      /([A-Za-z0-9가-힣_-]+\.(pptx|docx|xlsx|pdf|mp4|mp3|zip|html|csv|md|txt))/gi,
      (match) => {
        // If this filename already matches an actual artifact, keep it
        if (artifactNameSet.has(match)) return match;
        // If we have an artifact with the same extension, substitute
        const ext = path.extname(match).toLowerCase();
        const candidates = byExt.get(ext);
        if (candidates && candidates.length === 1) return candidates[0];
        return match;
      },
    );
  }

  function cleanResultText(raw: unknown, taskId?: string): string {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text) return "";
    let result: string;
    // Detect CLI JSON streaming output (session_id/uuid = Claude Code metadata, or "type"+"item" = Codex)
    const looksLikeStreamJson = (text.includes('"type"') && text.includes('"item"')) ||
      (text.includes('"session_id"') && text.includes('"uuid"')) ||
      (text.includes('"type"') && text.includes('"result"'));
    if (!looksLikeStreamJson) {
      result = cleanWorktreePaths(text);
    } else {
      // Use prettyStreamJson for comprehensive parsing of all CLI output formats
      const pretty = prettyStreamJson(text);
      if (pretty) {
        result = cleanWorktreePaths(pretty);
      } else {
        // Fallback: try legacy agent_message extraction
        const messages: string[] = [];
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const obj = JSON.parse(trimmed);
            if (obj?.item?.type === "agent_message" && obj.item.text) {
              messages.push(obj.item.text);
            }
          } catch {
            // Not JSON — might be a partial line or plain text
          }
        }
        result = messages.length > 0 ? messages.join("\n\n") : text;
        result = cleanWorktreePaths(result);
      }
    }
    // Replace stale filenames with actual artifact names
    if (taskId) {
      result = replaceStaleFilenames(result, taskId);
    }
    return result;
  }

  /** Extract deliverable files from a git commit and insert into task_artifacts */
  function insertFilesFromCommit(
    commitHash: string, projectPath: string, taskId: string,
    exts: Set<string>, mimeMap: Record<string, string>,
    insertStmt: ReturnType<typeof db.prepare>, now: number,
  ): void {
    try {
      // Use -m to handle merge commits (shows diff against each parent)
      const raw = execFileSync("git", ["diff-tree", "-m", "--no-commit-id", "-r", "--name-only", commitHash], {
        cwd: projectPath, stdio: "pipe", timeout: 10000,
      }).toString().trim();
      if (!raw) return;
      const seen = new Set<string>();
      for (const relFile of raw.split("\n")) {
        if (!relFile || seen.has(relFile)) continue;
        seen.add(relFile);
        const ext = path.extname(relFile).toLowerCase();
        if (!exts.has(ext)) continue;
        const absFile = path.join(projectPath, relFile);
        let size = 0;
        try { size = fs.statSync(absFile).size; } catch { continue; }
        if (size === 0) continue;
        const mime = mimeMap[ext] || "application/octet-stream";
        try {
          insertStmt.run(taskId, relFile.replace(/\\/g, "/"), path.basename(relFile), size, mime, now);
          console.log(`[artifact-backfill] Inserted: ${path.basename(relFile)} for task ${taskId.substring(0, 8)}`);
        } catch (insertErr) {
          console.error(`[artifact-backfill] Insert failed for ${relFile}:`, insertErr);
        }
      }
    } catch (err) {
      console.error(`[artifact-backfill] diff-tree failed for ${commitHash}:`, err);
    }
  }

  /** One-time backfill: scan git merge commits to populate task_artifacts for old tasks */
  let artifactBackfillDone = false;
  function backfillArtifactsFromGit(projectPath: string): void {
    if (artifactBackfillDone) return;

    // Check if there are any tasks without artifacts that need backfill
    const needsBackfill = db.prepare(`
      SELECT COUNT(*) as cnt FROM tasks t
      WHERE t.status IN ('done','review')
        AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
        AND NOT EXISTS (SELECT 1 FROM task_artifacts a WHERE a.task_id = t.id)
    `).get() as { cnt: number };
    if (needsBackfill.cnt === 0) {
      artifactBackfillDone = true;
      return;
    }

    const ARTIFACT_EXTS = new Set([
      ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx",
      ".mp4", ".mp3", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
      ".html", ".htm", ".md", ".txt", ".csv", ".json", ".zip",
    ]);
    const ARTIFACT_MIME: Record<string, string> = {
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pdf": "application/pdf", ".mp4": "video/mp4", ".mp3": "audio/mpeg",
      ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
      ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
      ".html": "text/html", ".htm": "text/html", ".md": "text/markdown",
      ".txt": "text/plain", ".csv": "text/csv", ".json": "application/json",
      ".zip": "application/zip",
    };

    // Find done tasks with no artifacts
    const tasksWithoutArtifacts = db.prepare(`
      SELECT t.id, t.project_path FROM tasks t
      WHERE t.status IN ('done','review')
        AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
        AND NOT EXISTS (SELECT 1 FROM task_artifacts a WHERE a.task_id = t.id)
    `).all() as Array<{ id: string; project_path: string | null }>;

    if (tasksWithoutArtifacts.length === 0) return;

    // Get merge commits from git
    let mergeLog: string;
    try {
      mergeLog = execFileSync("git", ["log", "--all", "--oneline", "--grep=Merge agentdesk task"], {
        cwd: projectPath, stdio: "pipe", timeout: 10000,
      }).toString().trim();
    } catch { return; }

    // Also get non-merge commits that might be task-related
    // Map task short IDs to full task IDs
    const taskShortMap = new Map<string, string>();
    for (const t of tasksWithoutArtifacts) {
      taskShortMap.set(t.id.substring(0, 8), t.id);
    }

    console.log(`[artifact-backfill] Found ${tasksWithoutArtifacts.length} tasks without artifacts, ${mergeLog.split("\n").length} merge commits`);
    const insertStmt = db.prepare(
      "INSERT OR IGNORE INTO task_artifacts (task_id, file_path, file_name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const now = nowMs();

    // Process merge commits
    for (const line of mergeLog.split("\n")) {
      if (!line) continue;
      const match = line.match(/Merge agentdesk task ([a-f0-9]{8})/);
      if (!match) continue;
      const shortId = match[1];
      const fullTaskId = taskShortMap.get(shortId);
      if (!fullTaskId) continue;

      const commitHash = line.split(" ")[0];
      insertFilesFromCommit(commitHash!, projectPath, fullTaskId, ARTIFACT_EXTS, ARTIFACT_MIME, insertStmt, now);
    }

    // For tasks with NO merge commit found, check child merge commits
    for (const t of tasksWithoutArtifacts) {
      const hasArtifacts = (db.prepare("SELECT COUNT(*) as cnt FROM task_artifacts WHERE task_id = ?").get(t.id) as { cnt: number }).cnt;
      if (hasArtifacts > 0) continue;

      // Find child task merge commits (collaboration tasks)
      const childTasks = db.prepare("SELECT id FROM tasks WHERE source_task_id = ?").all(t.id) as Array<{ id: string }>;
      console.log(`[artifact-backfill] Task ${t.id.slice(0,8)} has ${childTasks.length} children, checking merge commits`);
      for (const child of childTasks) {
        const childShort = child.id.substring(0, 8);
        for (const line of mergeLog.split("\n")) {
          if (!line.includes(childShort)) continue;
          const commitHash = line.split(" ")[0];
          console.log(`[artifact-backfill] Found merge commit ${commitHash} for child ${childShort}`);
          insertFilesFromCommit(commitHash!, projectPath, t.id, ARTIFACT_EXTS, ARTIFACT_MIME, insertStmt, now);
        }
      }
      // Check final count
      const finalCnt = (db.prepare("SELECT COUNT(*) as cnt FROM task_artifacts WHERE task_id = ?").get(t.id) as { cnt: number }).cnt;
      console.log(`[artifact-backfill] Task ${t.id.slice(0,8)} final artifact count: ${finalCnt}`);
    }
  }

  /* ── Deliverables listing (done + review, including delegated sub-tasks) ── */
  app.get("/api/deliverables", (_req, res) => {
    try {
      // Backfill project_path for done tasks that had null (merged to cwd)
      try {
        db.prepare(
          "UPDATE tasks SET project_path = ? WHERE status IN ('done','review') AND (project_path IS NULL OR TRIM(project_path) = '')",
        ).run(process.cwd());
      } catch { /* best effort */ }

      // Backfill task_artifacts from git history for tasks that have none
      try {
        backfillArtifactsFromGit(process.cwd());
      } catch { /* best effort */ }

      const rows = db
        .prepare(
          `
      SELECT t.id, t.title, t.description, t.department_id, t.assigned_agent_id,
             t.status, t.project_id, t.project_path, t.result, t.source_task_id,
             t.created_at, t.completed_at, t.started_at,
             t.output_format, t.workflow_pack_key,
             COALESCE(a.name, '') AS agent_name,
             COALESCE(a.name_ko, '') AS agent_name_ko,
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
      console.error("[deliverables]", err);
      res.status(500).json({ ok: false, error: "Failed to fetch deliverables" });
    }
  });

  /* ── Artifact listing & download ── */

  const ARTIFACT_EXTENSIONS: Record<string, string> = {
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".json": "application/json",
    ".csv": "text/csv",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "text/plain",
    ".tsx": "text/plain",
    ".jsx": "text/plain",
    ".xml": "application/xml",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
    ".pdf": "application/pdf",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".zip": "application/zip",
    ".log": "text/plain",
  };

  function resolveTaskProjectPath(taskId: string): string | null {
    const row = db
      .prepare("SELECT project_path FROM tasks WHERE id = ?")
      .get(taskId) as { project_path: string | null } | undefined;
    const pp = row?.project_path?.trim() || null;
    if (pp) return pp;

    // Fallback: try to find the worktree directory for this task
    const worktreesRoot = path.join(process.cwd(), ".agentdesk-worktrees");
    if (fs.existsSync(worktreesRoot)) {
      // Task ID prefix (first 8 chars) is used as worktree dir name
      const prefix = taskId.substring(0, 8);
      const worktreePath = path.join(worktreesRoot, prefix);
      if (fs.existsSync(worktreePath)) return worktreePath;
      // Also try full task ID
      const fullPath = path.join(worktreesRoot, taskId);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
  }

  function isPathSafe(base: string, target: string): boolean {
    const resolved = path.resolve(base, target);
    return resolved.startsWith(path.resolve(base));
  }

  /** Deliverable-worthy extensions (not source code) */
  const DELIVERABLE_EXTS = new Set([
    ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx",
    ".mp4", ".mp3", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".html", ".htm", ".md", ".markdown", ".txt", ".csv", ".json",
    ".zip", ".log",
  ]);

  /** Directories to skip when scanning for deliverables */
  const SKIP_DIRS = new Set([
    "node_modules", ".git", ".agentdesk-worktrees", "__pycache__",
    ".venv", "venv", ".next", ".nuxt", ".svelte-kit",
    "sprites", "Sample_Img", "Sample_Slides", "templates", "slides", "public",
    "src", "server", "electron", "scripts", ".cursor", ".claude",
    "logs",
  ]);

  function scanDirForDeliverables(
    dirPath: string,
    projectRoot: string,
    maxDepth: number,
    results: Map<string, { abs: string; rel: string }>,
    depth = 0,
  ): void {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && depth === 0 && entry.isDirectory()) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        scanDirForDeliverables(fullPath, projectRoot, maxDepth, results, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!DELIVERABLE_EXTS.has(ext)) continue;
        try {
          const stat = fs.statSync(fullPath);
          if (stat.size === 0) continue;
          const rel = path.relative(projectRoot, fullPath).replace(/\\/g, "/");
          if (!results.has(rel)) results.set(rel, { abs: fullPath, rel });
        } catch {
          // skip
        }
      }
    }
  }

  app.get("/api/task-reports/:taskId/artifacts", (req, res) => {
    const { taskId } = req.params;
    try {
      const projectPath = resolveTaskProjectPath(taskId);
      const cwdRoot = process.cwd();
      const scanRoot = (projectPath && fs.existsSync(projectPath)) ? projectPath : cwdRoot;

      // ── Strategy 1: Use task_artifacts table (recorded at merge time) ──
      const dbArtifacts = db
        .prepare("SELECT file_path, file_name, size, mime, created_at FROM task_artifacts WHERE task_id = ? ORDER BY created_at DESC")
        .all(taskId) as Array<{ file_path: string; file_name: string; size: number; mime: string; created_at: number }>;

      if (dbArtifacts.length > 0) {
        // Verify files still exist and build response from DB records
        const artifacts: Array<{
          id: string; title: string; relativePath: string;
          mime: string; size: number; updatedAt: number;
          type: "binary" | "text" | "video" | "image";
        }> = [];
        for (const row of dbArtifacts) {
          const absPath = path.resolve(scanRoot, row.file_path);
          let size = row.size;
          let updatedAt = row.created_at;
          try {
            const stat = fs.statSync(absPath);
            size = stat.size;
            updatedAt = stat.mtimeMs;
          } catch {
            continue; // File no longer exists — skip
          }
          let type: "binary" | "text" | "video" | "image" = "binary";
          if (row.mime.startsWith("text/") || row.mime === "application/json" || row.mime === "text/markdown") type = "text";
          else if (row.mime.startsWith("video/")) type = "video";
          else if (row.mime.startsWith("image/")) type = "image";
          artifacts.push({
            id: `file:${row.file_path}`,
            title: row.file_name,
            relativePath: row.file_path,
            mime: row.mime,
            size,
            updatedAt,
            type,
          });
        }
        return res.json({ ok: true, artifacts });
      }

      // ── Strategy 2: Fallback — scan directories (for tasks before task_artifacts existed) ──
      const foundFiles = new Map<string, { abs: string; rel: string }>();
      const isScanRootCwd = path.resolve(scanRoot) === path.resolve(cwdRoot);

      const outputDirs = isScanRootCwd
        ? ["video_output", "out", "output", "reports"]
        : ["video_output", "out", "output", "reports", "dist", "build", "docs"];
      for (const dir of outputDirs) {
        const absDir = path.join(scanRoot, dir);
        if (fs.existsSync(absDir)) {
          scanDirForDeliverables(absDir, scanRoot, 3, foundFiles);
        }
      }
      if (isScanRootCwd) {
        const docsReports = path.join(scanRoot, "docs", "reports");
        if (fs.existsSync(docsReports)) {
          scanDirForDeliverables(docsReports, scanRoot, 2, foundFiles);
        }
      }
      if (!isScanRootCwd) {
        scanDirForDeliverables(scanRoot, scanRoot, 1, foundFiles);
      }

      // 3) Build artifact list
      const artifacts: Array<{
        id: string;
        title: string;
        relativePath: string;
        mime: string;
        size: number;
        updatedAt: number;
        type: "binary" | "text" | "video" | "image";
      }> = [];

      for (const [rel, { abs: absPath }] of foundFiles) {
        try {
          const stat = fs.statSync(absPath);
          const ext = path.extname(absPath).toLowerCase();
          const mime = ARTIFACT_EXTENSIONS[ext] || "application/octet-stream";
          let type: "binary" | "text" | "video" | "image" = "binary";
          if (mime.startsWith("text/") || mime === "application/json" || ext === ".md" || ext === ".markdown") {
            type = "text";
          } else if (mime.startsWith("video/")) {
            type = "video";
          } else if (mime.startsWith("image/")) {
            type = "image";
          }
          artifacts.push({
            id: `file:${rel}`,
            title: path.basename(absPath),
            relativePath: rel,
            mime,
            size: stat.size,
            updatedAt: stat.mtimeMs,
            type,
          });
        } catch {
          // skip
        }
      }

      artifacts.sort((a, b) => b.updatedAt - a.updatedAt);
      res.json({ ok: true, artifacts });
    } catch (err) {
      console.error("[task-reports/:id/artifacts]", err);
      res.status(500).json({ ok: false, error: "Failed to list artifacts" });
    }
  });

  app.get("/api/task-reports/:taskId/artifacts/download", (req, res) => {
    const { taskId } = req.params;
    const relPath = typeof req.query.path === "string" ? req.query.path : "";
    const inline = req.query.inline === "1";

    if (!relPath) return res.status(400).json({ ok: false, error: "Missing path parameter" });

    try {
      const projectPath = resolveTaskProjectPath(taskId);
      const cwdRoot = process.cwd();
      const effectiveRoot = projectPath || cwdRoot;

      const absPath = path.resolve(effectiveRoot, relPath);
      // Security: must be under effectiveRoot or under cwdRoot or under .agentdesk-worktrees
      const worktreesRoot = path.join(cwdRoot, ".agentdesk-worktrees");
      const isSafe = absPath.startsWith(path.resolve(effectiveRoot)) ||
                     absPath.startsWith(path.resolve(cwdRoot)) ||
                     absPath.startsWith(path.resolve(worktreesRoot));
      if (!isSafe) {
        return res.status(403).json({ ok: false, error: "Path traversal not allowed" });
      }

      if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
        return res.status(404).json({ ok: false, error: "File not found" });
      }

      const ext = path.extname(absPath).toLowerCase();
      const mime = ARTIFACT_EXTENSIONS[ext] || "application/octet-stream";
      const disposition = inline ? "inline" : "attachment";
      const fileName = path.basename(absPath);

      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader("Content-Length", fs.statSync(absPath).size);

      const stream = fs.createReadStream(absPath);
      stream.pipe(res);
    } catch (err) {
      console.error("[task-reports/:id/artifacts/download]", err);
      res.status(500).json({ ok: false, error: "Failed to serve artifact" });
    }
  });
}
