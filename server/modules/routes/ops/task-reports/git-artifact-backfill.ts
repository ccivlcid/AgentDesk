import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
type PrepareDb = Pick<DatabaseSync, "prepare">;

type LogLike = {
  info: (...args: [string] | [object, string]) => void;
  error: (...args: [object, string] | [string]) => void;
};

export function createGitArtifactBackfill(deps: {
  db: PrepareDb;
  nowMs: () => number;
  logger: LogLike;
}) {
  const { db, nowMs, logger } = deps;

  function insertFilesFromCommit(
    commitHash: string,
    projectPath: string,
    taskId: string,
    exts: Set<string>,
    mimeMap: Record<string, string>,
    insertStmt: ReturnType<typeof db.prepare>,
    now: number,
  ): void {
    try {
      const raw = execFileSync("git", ["diff-tree", "-m", "--no-commit-id", "-r", "--name-only", commitHash], {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 10000,
      })
        .toString()
        .trim();
      if (!raw) return;
      const seen = new Set<string>();
      for (const relFile of raw.split("\n")) {
        if (!relFile || seen.has(relFile)) continue;
        seen.add(relFile);
        const ext = path.extname(relFile).toLowerCase();
        if (!exts.has(ext)) continue;
        const absFile = path.join(projectPath, relFile);
        let size = 0;
        try {
          size = fs.statSync(absFile).size;
        } catch {
          continue;
        }
        if (size === 0) continue;
        const mime = mimeMap[ext] || "application/octet-stream";
        try {
          insertStmt.run(taskId, relFile.replace(/\\/g, "/"), path.basename(relFile), size, mime, now);
          logger.info(`[artifact-backfill] Inserted: ${path.basename(relFile)} for task ${taskId.substring(0, 8)}`);
        } catch (insertErr) {
          logger.error({ err: insertErr }, `[artifact-backfill] Insert failed for ${relFile}`);
        }
      }
    } catch (err) {
      logger.error({ err }, `[artifact-backfill] diff-tree failed for ${commitHash}`);
    }
  }

  let artifactBackfillDone = false;

  function backfillArtifactsFromGit(projectPath: string): void {
    if (artifactBackfillDone) return;

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
      ".pdf",
      ".ppt",
      ".pptx",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".mp4",
      ".mp3",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".html",
      ".htm",
      ".md",
      ".txt",
      ".csv",
      ".json",
      ".zip",
    ]);
    const ARTIFACT_MIME: Record<string, string> = {
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".html": "text/html",
      ".htm": "text/html",
      ".md": "text/markdown",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".json": "application/json",
      ".zip": "application/zip",
    };

    const tasksWithoutArtifacts = db
      .prepare(`
      SELECT t.id, t.project_path FROM tasks t
      WHERE t.status IN ('done','review')
        AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
        AND NOT EXISTS (SELECT 1 FROM task_artifacts a WHERE a.task_id = t.id)
    `)
      .all() as Array<{ id: string; project_path: string | null }>;

    if (tasksWithoutArtifacts.length === 0) return;

    let mergeLog: string;
    try {
      mergeLog = execFileSync("git", ["log", "--all", "--oneline", "--grep=Merge agentdesk task"], {
        cwd: projectPath,
        stdio: "pipe",
        timeout: 10000,
      })
        .toString()
        .trim();
    } catch {
      return;
    }

    const taskShortMap = new Map<string, string>();
    for (const t of tasksWithoutArtifacts) {
      taskShortMap.set(t.id.substring(0, 8), t.id);
    }

    logger.info(
      `[artifact-backfill] Found ${tasksWithoutArtifacts.length} tasks without artifacts, ${mergeLog.split("\n").length} merge commits`,
    );
    const insertStmt = db.prepare(
      "INSERT OR IGNORE INTO task_artifacts (task_id, file_path, file_name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const now = nowMs();

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

    for (const t of tasksWithoutArtifacts) {
      const hasArtifacts = (
        db.prepare("SELECT COUNT(*) as cnt FROM task_artifacts WHERE task_id = ?").get(t.id) as { cnt: number }
      ).cnt;
      if (hasArtifacts > 0) continue;

      const childTasks = db.prepare("SELECT id FROM tasks WHERE source_task_id = ?").all(t.id) as Array<{ id: string }>;
      logger.info(`[artifact-backfill] Task ${t.id.slice(0, 8)} has ${childTasks.length} children, checking merge commits`);
      for (const child of childTasks) {
        const childShort = child.id.substring(0, 8);
        for (const line of mergeLog.split("\n")) {
          if (!line.includes(childShort)) continue;
          const commitHash = line.split(" ")[0];
          logger.info(`[artifact-backfill] Found merge commit ${commitHash} for child ${childShort}`);
          insertFilesFromCommit(commitHash!, projectPath, t.id, ARTIFACT_EXTS, ARTIFACT_MIME, insertStmt, now);
        }
      }
      const finalCnt = (
        db.prepare("SELECT COUNT(*) as cnt FROM task_artifacts WHERE task_id = ?").get(t.id) as { cnt: number }
      ).cnt;
      logger.info(`[artifact-backfill] Task ${t.id.slice(0, 8)} final artifact count: ${finalCnt}`);
    }
  }

  return { backfillArtifactsFromGit };
}
