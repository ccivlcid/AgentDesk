import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { ProjectRoutesDeps } from "./types.ts";

export function registerFileRoutes(deps: ProjectRoutesDeps): void {
  const { app, firstQueryValue, helpers } = deps;
  const { isPathInsideAllowedRoots } = helpers;

  app.get("/api/projects/file-content", (req, res) => {
    const MAX_BYTES = 512 * 1024; // 512 KB
    const TEXT_EXTENSIONS = new Set([
      "ts",
      "tsx",
      "js",
      "jsx",
      "mjs",
      "cjs",
      "json",
      "jsonc",
      "yaml",
      "yml",
      "toml",
      "md",
      "mdx",
      "txt",
      "env",
      "gitignore",
      "prettierrc",
      "eslintrc",
      "editorconfig",
      "sh",
      "bash",
      "zsh",
      "fish",
      "py",
      "rb",
      "go",
      "rs",
      "java",
      "cs",
      "cpp",
      "c",
      "h",
      "html",
      "htm",
      "css",
      "scss",
      "sass",
      "less",
      "svelte",
      "vue",
      "astro",
      "sql",
      "prisma",
      "graphql",
      "gql",
      "xml",
      "csv",
      "log",
      "lock",
      "ini",
      "cfg",
      "conf",
    ]);
    const rawPath = firstQueryValue(req.query.path);
    if (!rawPath) return res.status(400).json({ error: "path_required" });
    const filePath = path.resolve(rawPath);
    if (!isPathInsideAllowedRoots(filePath)) {
      return res.status(403).json({ error: "path_outside_allowed_roots" });
    }
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) return res.status(400).json({ error: "not_a_file" });
      const ext = path.extname(filePath).replace(".", "").toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext) && ext !== "") {
        return res.status(415).json({ error: "binary_or_unsupported", ext });
      }
      const sizeBytes = stat.size;
      if (sizeBytes > MAX_BYTES) {
        const preview = Buffer.alloc(MAX_BYTES);
        const fd = fs.openSync(filePath, "r");
        fs.readSync(fd, preview, 0, MAX_BYTES, 0);
        fs.closeSync(fd);
        return res.json({ ok: true, content: preview.toString("utf8"), truncated: true, size_bytes: sizeBytes });
      }
      const content = fs.readFileSync(filePath, "utf8");
      return res.json({ ok: true, content, truncated: false, size_bytes: sizeBytes });
    } catch {
      return res.status(404).json({ error: "file_not_found" });
    }
  });

  app.post("/api/projects/open-path", (req, res) => {
    const targetPath: unknown = (req.body ?? {}).path;
    if (typeof targetPath !== "string" || !targetPath) return res.status(400).json({ error: "path_required" });
    const resolved = path.resolve(targetPath);
    if (!isPathInsideAllowedRoots(resolved)) {
      return res.status(403).json({ error: "path_outside_allowed_roots" });
    }
    try {
      fs.accessSync(resolved);
    } catch {
      return res.status(404).json({ error: "path_not_found" });
    }
    const platform = process.platform;
    const cmd = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";
    const args = platform === "win32" ? [resolved] : [resolved];
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
    return res.json({ ok: true });
  });

  app.post("/api/projects/open-terminal", (req, res) => {
    const targetPath: unknown = (req.body ?? {}).path;
    if (typeof targetPath !== "string" || !targetPath) return res.status(400).json({ error: "path_required" });
    const resolved = path.resolve(targetPath);
    if (!isPathInsideAllowedRoots(resolved)) return res.status(403).json({ error: "path_outside_allowed_roots" });
    try {
      fs.accessSync(resolved);
    } catch {
      return res.status(404).json({ error: "path_not_found" });
    }

    const platform = process.platform;
    try {
      if (platform === "win32") {
        spawn("cmd.exe", ["/c", "start", "cmd.exe", "/K", `cd /d "${resolved}"`], {
          detached: true,
          stdio: "ignore",
          shell: false,
        }).unref();
      } else if (platform === "darwin") {
        spawn("open", ["-a", "Terminal", resolved], { detached: true, stdio: "ignore" }).unref();
      } else {
        const terms = ["gnome-terminal", "xterm", "konsole", "x-terminal-emulator"];
        const term = terms[0];
        spawn(term, ["--working-directory", resolved], { detached: true, stdio: "ignore" }).unref();
      }
      return res.json({ ok: true });
    } catch (err) {
      console.warn("[open-terminal] failed to spawn terminal", err);
      return res.status(500).json({ error: "spawn_failed" });
    }
  });

  app.post("/api/projects/save-file", (req, res) => {
    const body = req.body ?? {};
    const projectPath: unknown = body.project_path;
    const filename: unknown = body.filename;
    const content: unknown = body.content;
    if (typeof projectPath !== "string" || !projectPath) return res.status(400).json({ error: "project_path_required" });
    if (typeof filename !== "string" || !filename) return res.status(400).json({ error: "filename_required" });
    if (typeof content !== "string") return res.status(400).json({ error: "content_required" });
    const safeName = path.basename(filename).replace(/[/\\]/g, "");
    if (!safeName) return res.status(400).json({ error: "invalid_filename" });
    const resolvedDir = path.resolve(projectPath);
    if (!isPathInsideAllowedRoots(resolvedDir)) return res.status(403).json({ error: "path_outside_allowed_roots" });
    try {
      fs.mkdirSync(resolvedDir, { recursive: true });
    } catch {
      /* ignore */
    }
    const dest = path.join(resolvedDir, safeName);
    fs.writeFileSync(dest, content, "utf-8");
    return res.json({ ok: true, path: dest });
  });
}
