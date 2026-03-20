import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

type PrepareDb = Pick<DatabaseSync, "prepare">;

export const ARTIFACT_EXTENSIONS: Record<string, string> = {
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

export const DELIVERABLE_EXTS = new Set([
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
  ".markdown",
  ".txt",
  ".csv",
  ".json",
  ".zip",
  ".log",
]);

export const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".agentdesk-worktrees",
  "__pycache__",
  ".venv",
  "venv",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "sprites",
  "Sample_Img",
  "Sample_Slides",
  "templates",
  "slides",
  "public",
  "src",
  "server",
  "electron",
  "scripts",
  ".cursor",
  ".claude",
  "logs",
]);

export function createArtifactPathHelpers(db: PrepareDb) {
  function resolveTaskProjectPath(taskId: string): string | null {
    const row = db
      .prepare("SELECT project_path FROM tasks WHERE id = ?")
      .get(taskId) as { project_path: string | null } | undefined;
    const pp = row?.project_path?.trim() || null;
    if (pp) return pp;

    const worktreesRoot = path.join(process.cwd(), ".agentdesk-worktrees");
    if (fs.existsSync(worktreesRoot)) {
      const prefix = taskId.substring(0, 8);
      const worktreePath = path.join(worktreesRoot, prefix);
      if (fs.existsSync(worktreePath)) return worktreePath;
      const fullPath = path.join(worktreesRoot, taskId);
      if (fs.existsSync(fullPath)) return fullPath;
    }
    return null;
  }

  function isUnderDir(absDir: string, absTarget: string): boolean {
    const rel = path.relative(path.resolve(absDir), path.resolve(absTarget));
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  }

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

  return { resolveTaskProjectPath, isUnderDir, scanDirForDeliverables };
}
