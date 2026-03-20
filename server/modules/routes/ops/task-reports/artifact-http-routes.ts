import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger";
import { ARTIFACT_EXTENSIONS, createArtifactPathHelpers } from "./artifact-constants.ts";

type PrepareDb = Pick<DatabaseSync, "prepare">;

export function registerTaskReportArtifactRoutes(app: Express, db: PrepareDb): void {
  const { resolveTaskProjectPath, isUnderDir, scanDirForDeliverables } = createArtifactPathHelpers(db);

  app.get("/api/task-reports/:taskId/artifacts", (req, res) => {
    const { taskId } = req.params;
    try {
      const projectPath = resolveTaskProjectPath(taskId);
      const cwdRoot = process.cwd();
      const scanRoot = projectPath && fs.existsSync(projectPath) ? projectPath : cwdRoot;

      const dbArtifacts = db
        .prepare(
          "SELECT file_path, file_name, size, mime, created_at FROM task_artifacts WHERE task_id = ? ORDER BY created_at DESC",
        )
        .all(taskId) as Array<{ file_path: string; file_name: string; size: number; mime: string; created_at: number }>;

      if (dbArtifacts.length > 0) {
        const artifacts: Array<{
          id: string;
          title: string;
          relativePath: string;
          mime: string;
          size: number;
          updatedAt: number;
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
            continue;
          }
          let type: "binary" | "text" | "video" | "image" = "binary";
          if (row.mime.startsWith("text/") || row.mime === "application/json" || row.mime === "text/markdown") {
            type = "text";
          } else if (row.mime.startsWith("video/")) type = "video";
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
      logger.error({ err }, "[task-reports/:id/artifacts]");
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
      const worktreesRoot = path.join(cwdRoot, ".agentdesk-worktrees");
      const isSafe =
        isUnderDir(effectiveRoot, absPath) || isUnderDir(cwdRoot, absPath) || isUnderDir(worktreesRoot, absPath);
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
      logger.error({ err }, "[task-reports/:id/artifacts/download]");
      res.status(500).json({ ok: false, error: "Failed to serve artifact" });
    }
  });

  app.get("/api/task-reports/:taskId/artifacts/zip", (req, res) => {
    const { taskId } = req.params;
    try {
      const projectPath = resolveTaskProjectPath(taskId);
      const cwdRoot = process.cwd();
      const effectiveRoot = projectPath || cwdRoot;

      const dbRows = db
        .prepare("SELECT file_path, file_name FROM task_artifacts WHERE task_id = ? ORDER BY created_at DESC")
        .all(taskId) as Array<{ file_path: string; file_name: string }>;

      if (dbRows.length === 0) {
        return res.status(404).json({ ok: false, error: "No artifacts found" });
      }

      const worktreesRoot = path.join(cwdRoot, ".agentdesk-worktrees");
      const entries: Array<{ absPath: string; entryName: string }> = [];
      for (const row of dbRows) {
        const absPath = path.resolve(effectiveRoot, row.file_path);
        const isSafe =
          isUnderDir(effectiveRoot, absPath) || isUnderDir(cwdRoot, absPath) || isUnderDir(worktreesRoot, absPath);
        if (!isSafe) continue;
        if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;
        entries.push({ absPath, entryName: row.file_name });
      }

      if (entries.length === 0) {
        return res.status(404).json({ ok: false, error: "No artifact files found on disk" });
      }

      const zipBuf = buildArtifactsZipBuffer(entries);

      const safeName = `artifacts-${taskId.slice(0, 8)}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
      res.setHeader("Content-Length", zipBuf.length);
      res.send(zipBuf);
    } catch (err) {
      logger.error({ err }, "[task-reports/:id/artifacts/zip]");
      res.status(500).json({ ok: false, error: "Failed to create ZIP" });
    }
  });
}

function buildArtifactsZipBuffer(entries: Array<{ absPath: string; entryName: string }>): Buffer {
  function u32le(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n, 0);
    return b;
  }
  function u16le(n: number): Buffer {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n, 0);
    return b;
  }

  const localHeaders: Buffer[] = [];
  const centralDirs: Buffer[] = [];
  let offset = 0;

  for (const { absPath, entryName } of entries) {
    const data = fs.readFileSync(absPath);
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const use = compressed.length < data.length ? compressed : data;
    const method = compressed.length < data.length ? 8 : 0;

    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crc = (crc ^ 0xffffffff) >>> 0;

    const nameBytes = Buffer.from(entryName, "utf8");
    const nameLen = nameBytes.length;
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16le(20),
      u16le(0),
      u16le(method),
      u16le(dosTime),
      u16le(dosDate),
      u32le(crc),
      u32le(use.length),
      u32le(data.length),
      u16le(nameLen),
      u16le(0),
      nameBytes,
      use,
    ]);
    localHeaders.push(local);

    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16le(20),
      u16le(20),
      u16le(0),
      u16le(method),
      u16le(dosTime),
      u16le(dosDate),
      u32le(crc),
      u32le(use.length),
      u32le(data.length),
      u16le(nameLen),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(0),
      u32le(offset),
      nameBytes,
    ]);
    centralDirs.push(central);
    offset += local.length;
  }

  const centralBuf = Buffer.concat(centralDirs);
  const endRecord = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16le(0),
    u16le(0),
    u16le(entries.length),
    u16le(entries.length),
    u32le(centralBuf.length),
    u32le(offset),
    u16le(0),
  ]);

  return Buffer.concat([...localHeaders, centralBuf, endRecord]);
}
