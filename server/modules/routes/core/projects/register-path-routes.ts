import type { SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getAssignedAgentIdsByProjectIds } from "../../shared/project-assignments.ts";
import type { ProjectRoutesDeps } from "./types.ts";

export function registerPathRoutes(deps: ProjectRoutesDeps): void {
  const { app, db, firstQueryValue, normalizeTextField, helpers } = deps;
  const {
    PROJECT_PATH_ALLOWED_ROOTS,
    normalizeProjectPathInput,
    pathInsideRoot,
    isPathInsideAllowedRoots,
    getContainingAllowedRoot,
    collectProjectPathSuggestions,
    resolveInitialBrowsePath,
    pickNativeDirectoryPath,
    inspectDirectoryPath,
  } = helpers;

  app.get("/api/projects", (req, res) => {
    const page = Math.max(Number(firstQueryValue(req.query.page)) || 1, 1);
    const pageSizeRaw = Number(firstQueryValue(req.query.page_size)) || 10;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 50);
    const search = normalizeTextField(firstQueryValue(req.query.search));

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push("(p.name LIKE ? OR p.project_path LIKE ? OR p.core_goal LIKE ?)");
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRow = db
      .prepare(
        `
    SELECT COUNT(*) AS cnt
    FROM projects p
    ${where}
  `,
      )
      .get(...(params as SQLInputValue[])) as { cnt: number };
    const total = Number(totalRow?.cnt ?? 0) || 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `
    SELECT p.*,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count
    FROM projects p
    ${where}
    ORDER BY COALESCE(p.last_used_at, p.updated_at) DESC, p.updated_at DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `,
      )
      .all(...([...(params as SQLInputValue[]), pageSize, offset] as SQLInputValue[]));

    const projectRows = rows as Array<Record<string, unknown> & { id: string }>;
    const assignedByProject = getAssignedAgentIdsByProjectIds(
      db,
      projectRows.map((row) => row.id),
    );
    const projects = projectRows.map((row) => ({
      ...row,
      assigned_agent_ids: assignedByProject.get(row.id) ?? [],
    }));

    res.json({
      projects,
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    });
  });

  app.get("/api/projects/path-check", (req, res) => {
    const raw = firstQueryValue(req.query.path);
    const normalized = normalizeProjectPathInput(raw);
    if (!normalized) return res.status(400).json({ error: "project_path_required" });
    if (!isPathInsideAllowedRoots(normalized)) {
      return res.status(403).json({
        error: "project_path_outside_allowed_roots",
        allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
      });
    }

    const inspected = inspectDirectoryPath(normalized);
    res.json({
      ok: true,
      normalized_path: normalized,
      exists: inspected.exists,
      is_directory: inspected.isDirectory,
      can_create: inspected.canCreate,
      nearest_existing_parent: inspected.nearestExistingParent,
    });
  });

  app.get("/api/projects/path-suggestions", (req, res) => {
    const q = normalizeTextField(firstQueryValue(req.query.q)) ?? "";
    const parsedLimit = Number(firstQueryValue(req.query.limit) ?? "30");
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(50, Math.trunc(parsedLimit))) : 30;
    const paths = collectProjectPathSuggestions(q, limit);
    res.json({ ok: true, paths });
  });

  app.post("/api/projects/path-native-picker", async (_req, res) => {
    try {
      const picked = await pickNativeDirectoryPath();
      if (picked.cancelled) return res.json({ ok: false, cancelled: true });
      if (!picked.path) return res.status(400).json({ error: "native_picker_unavailable" });

      const normalized = normalizeProjectPathInput(picked.path);
      if (!normalized) return res.status(400).json({ error: "project_path_required" });
      if (!isPathInsideAllowedRoots(normalized)) {
        return res.status(403).json({
          error: "project_path_outside_allowed_roots",
          allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
        });
      }
      try {
        if (!fs.statSync(normalized).isDirectory()) {
          return res.status(400).json({ error: "project_path_not_directory" });
        }
      } catch {
        return res.status(400).json({ error: "project_path_not_found" });
      }

      return res.json({ ok: true, path: normalized, source: picked.source });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "native_picker_failed", reason: message });
    }
  });

  app.get("/api/projects/path-browse", (req, res) => {
    const raw = firstQueryValue(req.query.path);
    const currentPath = resolveInitialBrowsePath(raw ?? null);
    if (!isPathInsideAllowedRoots(currentPath)) {
      return res.status(403).json({
        error: "project_path_outside_allowed_roots",
        allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
      });
    }

    let entries: Array<{ name: string; path: string }> = [];
    try {
      const dirents = fs.readdirSync(currentPath, { withFileTypes: true });
      entries = dirents
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          name: entry.name,
          path: path.join(currentPath, entry.name),
        }));
    } catch {
      entries = [];
    }

    const MAX_ENTRIES = 300;
    const truncated = entries.length > MAX_ENTRIES;
    const containingRoot = getContainingAllowedRoot(currentPath);
    const candidateParent = path.dirname(currentPath);
    const parent =
      candidateParent !== currentPath && (!containingRoot || pathInsideRoot(candidateParent, containingRoot))
        ? candidateParent
        : null;
    res.json({
      ok: true,
      current_path: currentPath,
      parent_path: parent !== currentPath ? parent : null,
      entries: entries.slice(0, MAX_ENTRIES),
      truncated,
    });
  });

  app.get("/api/projects/path-tree", (req, res) => {
    const MAX_DEPTH = 3;
    const MAX_NODES = 200;
    const SKIP_DIRS = new Set([
      "node_modules",
      ".git",
      "__pycache__",
      "dist",
      ".next",
      ".nuxt",
      ".cache",
      "build",
      "out",
      ".venv",
      "venv",
      ".tox",
      "coverage",
      ".nyc_output",
      "target",
      ".gradle",
    ]);

    const raw = firstQueryValue(req.query.path);
    const normalized = normalizeProjectPathInput(raw);
    if (!normalized) return res.status(400).json({ error: "path_required" });
    if (!isPathInsideAllowedRoots(normalized)) {
      return res.status(403).json({
        error: "project_path_outside_allowed_roots",
        allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
      });
    }
    try {
      const stat = fs.statSync(normalized);
      if (!stat.isDirectory()) return res.status(400).json({ error: "path_not_directory" });
    } catch {
      return res.status(404).json({ error: "path_not_found" });
    }

    type FileTreeNode = { name: string; type: "dir" | "file"; children?: FileTreeNode[] };
    let nodeCount = 0;
    let truncated = false;

    function walkDir(dirPath: string, depth: number): FileTreeNode[] {
      if (depth > MAX_DEPTH || truncated) return [];
      let dirents: fs.Dirent[];
      try {
        dirents = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch {
        return [];
      }

      const dirs = dirents
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP_DIRS.has(d.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      const files = dirents
        .filter((d) => d.isFile() && !d.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name));

      const nodes: FileTreeNode[] = [];
      for (const entry of [...dirs, ...files]) {
        if (truncated || nodeCount >= MAX_NODES) {
          truncated = true;
          break;
        }
        nodeCount++;
        if (entry.isDirectory()) {
          const children = depth < MAX_DEPTH ? walkDir(path.join(dirPath, entry.name), depth + 1) : [];
          nodes.push({ name: entry.name, type: "dir", children });
        } else {
          nodes.push({ name: entry.name, type: "file" });
        }
      }
      return nodes;
    }

    const tree = walkDir(normalized, 1);
    res.json({ ok: true, root: normalized, tree, truncated });
  });
}
