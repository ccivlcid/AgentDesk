import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type DbLike = {
  prepare: (sql: string) => { run: (...args: unknown[]) => unknown };
};

export function recordArtifactsFromDirectoryScan(
  db: DbLike,
  nowMs: () => number,
  projectPath: string,
  tid: string,
): void {
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
  const SKIP_DIRS = new Set(["node_modules", ".git", "__pycache__", ".venv", "venv", "dist", ".next"]);
  try {
    if (!fs.existsSync(projectPath)) return;
    const insert = db.prepare(
      "INSERT OR IGNORE INTO task_artifacts (task_id, file_path, file_name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const now = nowMs();
    const scanDir = (dir: string, depth: number) => {
      if (depth > 3) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) scanDir(path.join(dir, entry.name), depth + 1);
          continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!ARTIFACT_EXTS.has(ext)) continue;
        const absPath = path.join(dir, entry.name);
        let size = 0;
        try {
          size = fs.statSync(absPath).size;
        } catch {
          continue;
        }
        if (size === 0) continue;
        const relPath = path.relative(projectPath, absPath).replace(/\\/g, "/");
        const mime = ARTIFACT_MIME[ext] || "application/octet-stream";
        insert.run(tid, relPath, entry.name, size, mime, now);
      }
    };
    scanDir(projectPath, 0);
  } catch {
    // ignore scan errors
  }
}

export function recordMergedArtifacts(db: DbLike, nowMs: () => number, projectPath: string, tid: string): void {
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
  try {
    const raw = execFileSync("git", ["diff-tree", "-m", "--no-commit-id", "-r", "--name-only", "HEAD"], {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
    })
      .toString()
      .trim();
    if (!raw) return;
    const files = raw.split("\n").filter(Boolean);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO task_artifacts (task_id, file_path, file_name, size, mime, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const now = nowMs();
    for (const relFile of files) {
      const ext = path.extname(relFile).toLowerCase();
      if (!ARTIFACT_EXTS.has(ext)) continue;
      const absFile = path.join(projectPath, relFile);
      let size = 0;
      try {
        size = fs.statSync(absFile).size;
      } catch {
        /* skip */
      }
      if (size === 0) continue;
      const mime = ARTIFACT_MIME[ext] || "application/octet-stream";
      insert.run(tid, relFile.replace(/\\/g, "/"), path.basename(relFile), size, mime, now);
    }
  } catch {
    // git not available or not a merge commit — skip
  }
}
