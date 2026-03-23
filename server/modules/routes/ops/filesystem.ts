/**
 * Filesystem Browse API — read-only directory listing for the File Explorer widget
 * Allows browsing the host PC's filesystem (dirs + file metadata only, no file content reads)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Express, Request, Response } from "express";
import logger from "../../../lib/logger.ts";

export interface FsEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: number;
  ext: string;
}

function getWindowsDrives(): FsEntry[] {
  const drives: FsEntry[] = [];
  for (let i = 67; i <= 90; i++) {
    const drive = `${String.fromCharCode(i)}:\\`;
    if (fs.existsSync(drive)) {
      drives.push({ name: drive, path: drive, type: "dir", size: 0, modified: 0, ext: "" });
    }
  }
  return drives;
}

const IS_WIN = process.platform === "win32";

export function registerFilesystemRoutes({ app }: { app: Express }): void {
  /**
   * GET /api/fs/browse?path=<dir>
   * Returns directory listing. On Windows with empty path → returns drive list.
   */
  app.get("/api/fs/browse", (req: Request, res: Response) => {
    const rawPath = (req.query.path as string | undefined) ?? "";

    // Windows root → list drives
    if (IS_WIN && (!rawPath || rawPath === "/" || rawPath === "\\")) {
      return res.json({
        ok: true,
        current_path: "",
        parent_path: null,
        is_root: true,
        entries: getWindowsDrives(),
        truncated: false,
      });
    }

    // Default to home dir
    const currentPath = rawPath ? path.normalize(rawPath) : os.homedir();

    if (!fs.existsSync(currentPath)) {
      return res.status(404).json({ ok: false, error: "path_not_found" });
    }

    let stat: fs.Stats;
    try {
      stat = fs.statSync(currentPath);
    } catch (err) {
      logger.warn({ err, currentPath }, "[fs-browse] stat failed");
      return res.status(403).json({ ok: false, error: "access_denied" });
    }

    if (!stat.isDirectory()) {
      return res.status(400).json({ ok: false, error: "not_a_directory" });
    }

    // Compute parent
    const parentCandidate = path.dirname(currentPath);
    // On Windows, dirname of "C:\" is "C:\" — detect that
    const atDriveRoot = IS_WIN && /^[A-Za-z]:\\$/.test(currentPath);
    const parentPath = atDriveRoot ? null : (parentCandidate !== currentPath ? parentCandidate : null);

    let entries: FsEntry[] = [];
    try {
      const dirents = fs.readdirSync(currentPath, { withFileTypes: true });
      entries = dirents
        .filter((d) => d.name !== "." && d.name !== "..")
        .map((d) => {
          const fullPath = path.join(currentPath, d.name);
          let size = 0;
          let modified = 0;
          try {
            const s = fs.statSync(fullPath);
            size = s.size;
            modified = s.mtimeMs;
          } catch { /* no permission or transient — skip */ }
          const isDir = d.isDirectory() || d.isSymbolicLink();
          const ext = (!isDir && d.name.includes("."))
            ? d.name.split(".").pop()!.toLowerCase()
            : "";
          return { name: d.name, path: fullPath, type: isDir ? "dir" : "file", size, modified, ext } as FsEntry;
        })
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });
    } catch (err) {
      logger.warn({ err, currentPath }, "[fs-browse] readdir failed");
      return res.status(403).json({ ok: false, error: "access_denied" });
    }

    const MAX_ENTRIES = 600;
    const truncated = entries.length > MAX_ENTRIES;

    return res.json({
      ok: true,
      current_path: currentPath,
      parent_path: parentPath,
      is_root: false,
      entries: entries.slice(0, MAX_ENTRIES),
      truncated,
    });
  });

  /**
   * POST /api/fs/mkdir
   * Body: { parent_path: string, name: string }
   * Creates a new directory inside parent_path.
   */
  app.post("/api/fs/mkdir", (req: Request, res: Response) => {
    const { parent_path, name } = req.body as { parent_path?: unknown; name?: unknown };

    if (typeof parent_path !== "string" || !parent_path.trim()) {
      return res.status(400).json({ ok: false, error: "invalid_parent_path" });
    }
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ ok: false, error: "invalid_name" });
    }

    // Reject path-traversal attempts in the folder name
    const safeName = path.basename(name.trim());
    if (!safeName || safeName === "." || safeName === "..") {
      return res.status(400).json({ ok: false, error: "invalid_name" });
    }

    const targetPath = path.join(path.normalize(parent_path.trim()), safeName);

    if (fs.existsSync(targetPath)) {
      return res.status(409).json({ ok: false, error: "already_exists" });
    }

    try {
      fs.mkdirSync(targetPath, { recursive: false });
      logger.info({ targetPath }, "[fs-mkdir] created");
      return res.json({ ok: true, path: targetPath });
    } catch (err) {
      logger.warn({ err, targetPath }, "[fs-mkdir] failed");
      return res.status(403).json({ ok: false, error: "access_denied" });
    }
  });

  /**
   * GET /api/fs/read
   * Query: path (file path)
   * Returns text content of a file (max 500KB).
   */
  app.get("/api/fs/read", (req: Request, res: Response) => {
    const rawPath = (req.query.path as string | undefined) ?? "";
    if (!rawPath.trim()) return res.status(400).json({ ok: false, error: "path_required" });

    const filePath = path.normalize(rawPath.trim());
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: "file_not_found" });

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) return res.status(400).json({ ok: false, error: "not_a_file" });
      if (stat.size > 512 * 1024) return res.status(413).json({ ok: false, error: "file_too_large" });
      const content = fs.readFileSync(filePath, "utf-8");
      return res.json({ ok: true, content, size: stat.size });
    } catch (err) {
      logger.warn({ err, filePath }, "[fs-read] failed");
      return res.status(403).json({ ok: false, error: "access_denied" });
    }
  });
}
