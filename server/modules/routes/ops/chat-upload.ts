import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 5;
const UPLOAD_DIR = "uploads/chat";

export interface ChatFileAttachment {
  id: string;
  fileName: string;
  size: number;
  mime: string;
  relativePath: string;
}

// ---------------------------------------------------------------------------
// Minimal multipart/form-data parser (no external deps)
// ---------------------------------------------------------------------------

interface ParsedPart {
  fileName: string;
  mime: string;
  data: Buffer;
}

function parseMultipartFormData(body: Buffer, boundary: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const endBuf = Buffer.from(`--${boundary}--`);
  const doubleCrlf = Buffer.from("\r\n\r\n");

  let offset = 0;

  // Skip preamble — find first boundary
  const firstBoundary = body.indexOf(boundaryBuf, offset);
  if (firstBoundary < 0) return parts;
  offset = firstBoundary + boundaryBuf.length;

  while (offset < body.length) {
    // Skip CRLF after boundary
    if (body[offset] === 0x0d && body[offset + 1] === 0x0a) {
      offset += 2;
    }

    // Check for end boundary
    const remaining = body.subarray(offset - 2);
    if (remaining.indexOf(endBuf) === 0) break;

    // Find header/body separator (double CRLF)
    const headerEnd = body.indexOf(doubleCrlf, offset);
    if (headerEnd < 0) break;

    const headerSection = body.subarray(offset, headerEnd).toString("utf-8");
    const bodyStart = headerEnd + doubleCrlf.length;

    // Find next boundary
    const nextBoundary = body.indexOf(boundaryBuf, bodyStart);
    if (nextBoundary < 0) break;

    // Body ends 2 bytes before next boundary (CRLF before boundary)
    let bodyEnd = nextBoundary - 2;
    if (bodyEnd < bodyStart) bodyEnd = bodyStart;

    const data = body.subarray(bodyStart, bodyEnd);

    // Parse headers
    const headers = headerSection.split("\r\n");
    let fileName = "";
    let mime = "application/octet-stream";

    for (const header of headers) {
      const lower = header.toLowerCase();
      if (lower.startsWith("content-disposition:")) {
        const fnMatch = header.match(/filename="([^"]+)"/i) ?? header.match(/filename=([^\s;]+)/i);
        if (fnMatch) {
          fileName = fnMatch[1];
        }
      }
      if (lower.startsWith("content-type:")) {
        mime = header.slice("content-type:".length).trim();
      }
    }

    if (fileName) {
      parts.push({ fileName, mime, data });
    }

    offset = nextBoundary + boundaryBuf.length;
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize a filename: strip path separators and null bytes */
function sanitizeFileName(raw: string): string {
  return raw
    .replace(/[\\/]/g, "_")
    .replace(/\0/g, "")
    .replace(/\.\./g, "_")
    .trim()
    .slice(0, 255);
}

/** Ensure the upload directory exists */
function ensureUploadDir(): string {
  const dir = path.resolve(process.cwd(), UPLOAD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerChatUploadRoutes(ctx: RuntimeContext): void {
  const { app } = ctx;

  // -------------------------------------------------------------------------
  // POST /api/chat/upload — multipart file upload
  // -------------------------------------------------------------------------
  app.post("/api/chat/upload", async (req: Request, res: Response) => {
    try {
      const contentType = req.headers["content-type"] ?? "";
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
      if (!boundaryMatch) {
        return res.status(400).json({ ok: false, error: "multipart_boundary_missing" });
      }
      const boundary = boundaryMatch[1];

      // Read the raw body as a Buffer
      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxTotalSize = MAX_FILE_SIZE * MAX_FILES + 1024 * 1024; // generous header allowance

      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > maxTotalSize) {
            reject(new Error("payload_too_large"));
            return;
          }
          chunks.push(chunk);
        });
        req.on("end", resolve);
        req.on("error", reject);
      });

      const body = Buffer.concat(chunks);
      const parts = parseMultipartFormData(body, boundary);

      if (parts.length === 0) {
        return res.status(400).json({ ok: false, error: "no_files" });
      }
      if (parts.length > MAX_FILES) {
        return res.status(400).json({ ok: false, error: "too_many_files", max: MAX_FILES });
      }

      const uploadDir = ensureUploadDir();
      const files: ChatFileAttachment[] = [];

      for (const part of parts) {
        if (part.data.length > MAX_FILE_SIZE) {
          return res.status(400).json({
            ok: false,
            error: "file_too_large",
            fileName: part.fileName,
            maxBytes: MAX_FILE_SIZE,
          });
        }

        const id = randomUUID();
        const safeName = sanitizeFileName(part.fileName) || "upload";
        const ext = path.extname(safeName);
        const storedName = `${id}${ext}`;
        const filePath = path.join(uploadDir, storedName);

        fs.writeFileSync(filePath, part.data);

        const relativePath = `${UPLOAD_DIR}/${storedName}`;
        files.push({
          id,
          fileName: safeName,
          size: part.data.length,
          mime: part.mime,
          relativePath,
        });
      }

      return res.json({ ok: true, files });
    } catch (err: any) {
      if (err?.message === "payload_too_large") {
        return res.status(413).json({ ok: false, error: "payload_too_large" });
      }
      console.error("[chat-upload] upload error:", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/chat/uploads/:fileId/:fileName — download / view uploaded file
  // -------------------------------------------------------------------------
  app.get("/api/chat/uploads/:fileId/:fileName", (req: Request, res: Response) => {
    try {
      const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
      const fileName = Array.isArray(req.params.fileName) ? req.params.fileName[0] : req.params.fileName;

      // Validate fileId is a UUID-like string (prevent path traversal)
      if (!fileId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId)) {
        return res.status(400).json({ ok: false, error: "invalid_file_id" });
      }
      if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
        return res.status(400).json({ ok: false, error: "invalid_file_name" });
      }

      const safeName = sanitizeFileName(fileName);
      const ext = path.extname(safeName);
      const storedName = `${fileId}${ext}`;
      const uploadDir = path.resolve(process.cwd(), UPLOAD_DIR);
      const filePath = path.join(uploadDir, storedName);

      // Path traversal prevention: ensure resolved path is within upload dir
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(uploadDir)) {
        return res.status(403).json({ ok: false, error: "access_denied" });
      }

      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ ok: false, error: "file_not_found" });
      }

      const stat = fs.statSync(resolvedPath);
      const mime = guessMime(ext);

      // Set content disposition
      const inline = req.query.inline !== undefined;
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", stat.size);
      res.setHeader(
        "Content-Disposition",
        inline ? `inline; filename="${safeName}"` : `attachment; filename="${safeName}"`,
      );
      res.setHeader("Cache-Control", "private, max-age=86400");

      const stream = fs.createReadStream(resolvedPath);
      stream.pipe(res);
    } catch (err: any) {
      console.error("[chat-upload] download error:", err);
      return res.status(500).json({ ok: false, error: err?.message || String(err) });
    }
  });
}

// ---------------------------------------------------------------------------
// Simple MIME type guesser
// ---------------------------------------------------------------------------

function guessMime(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf",
    ".json": "application/json",
    ".xml": "application/xml",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".ts": "text/plain",
    ".md": "text/markdown",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}
