import type { Express } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { getAssignedAgentIdsByProjectIds } from "../shared/project-assignments.ts";
import { createProjectRouteHelpers } from "./projects/helpers.ts";
import { DEFAULT_WORKFLOW_PACK_KEY, isWorkflowPackKey } from "../../workflow/packs/definitions.ts";

type FirstQueryValue = (value: unknown) => string | undefined;
type NormalizeTextField = (value: unknown) => string | null;
type RunInTransaction = (fn: () => void) => void;

interface RegisterProjectRoutesOptions {
  app: Express;
  db: DatabaseSync;
  firstQueryValue: FirstQueryValue;
  normalizeTextField: NormalizeTextField;
  runInTransaction: RunInTransaction;
  nowMs: () => number;
}

export function registerProjectRoutes({
  app,
  db,
  firstQueryValue,
  normalizeTextField,
  runInTransaction,
  nowMs,
}: RegisterProjectRoutesOptions): void {
  const {
    PROJECT_PATH_ALLOWED_ROOTS,
    normalizeProjectPathInput,
    pathInsideRoot,
    isPathInsideAllowedRoots,
    getContainingAllowedRoot,
    findConflictingProjectByPath,
    inspectDirectoryPath,
    ensureDirectoryPathExists,
    collectProjectPathSuggestions,
    resolveInitialBrowsePath,
    pickNativeDirectoryPath,
    validateProjectAgentIds,
  } = createProjectRouteHelpers({ db, normalizeTextField });

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
      "node_modules", ".git", "__pycache__", "dist", ".next",
      ".nuxt", ".cache", "build", "out", ".venv", "venv", ".tox",
      "coverage", ".nyc_output", "target", ".gradle",
    ]);

    const raw = firstQueryValue(req.query.path);
    const normalized = normalizeProjectPathInput(raw);
    if (!normalized) return res.status(400).json({ error: "path_required" });
    if (!isPathInsideAllowedRoots(normalized)) {
      return res.status(403).json({ error: "project_path_outside_allowed_roots", allowed_roots: PROJECT_PATH_ALLOWED_ROOTS });
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
      try { dirents = fs.readdirSync(dirPath, { withFileTypes: true }); }
      catch { return []; }

      const dirs = dirents
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP_DIRS.has(d.name))
        .sort((a, b) => a.name.localeCompare(b.name));
      const files = dirents
        .filter((d) => d.isFile() && !d.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name));

      const nodes: FileTreeNode[] = [];
      for (const entry of [...dirs, ...files]) {
        if (truncated || nodeCount >= MAX_NODES) { truncated = true; break; }
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

  // ── File content reader ──────────────────────────────────────────────────
  app.get("/api/projects/file-content", (req, res) => {
    const MAX_BYTES = 512 * 1024; // 512 KB
    const TEXT_EXTENSIONS = new Set([
      "ts","tsx","js","jsx","mjs","cjs","json","jsonc","yaml","yml","toml",
      "md","mdx","txt","env","gitignore","prettierrc","eslintrc","editorconfig",
      "sh","bash","zsh","fish","py","rb","go","rs","java","cs","cpp","c","h",
      "html","htm","css","scss","sass","less","svelte","vue","astro",
      "sql","prisma","graphql","gql","xml","csv","log","lock","ini","cfg","conf",
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

  // ── Open path with OS default app ────────────────────────────────────────
  app.post("/api/projects/open-path", (req, res) => {
    const targetPath: unknown = (req.body ?? {}).path;
    if (typeof targetPath !== "string" || !targetPath) return res.status(400).json({ error: "path_required" });
    const resolved = path.resolve(targetPath);
    if (!isPathInsideAllowedRoots(resolved)) {
      return res.status(403).json({ error: "path_outside_allowed_roots" });
    }
    try { fs.accessSync(resolved); } catch { return res.status(404).json({ error: "path_not_found" }); }
    const platform = process.platform;
    const cmd = platform === "darwin" ? "open" : platform === "win32" ? "explorer" : "xdg-open";
    const args = platform === "win32" ? [resolved] : [resolved];
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
    return res.json({ ok: true });
  });

  // ── Save file into project path ────────────────────────────────────────
  app.post("/api/projects/save-file", (req, res) => {
    const body = req.body ?? {};
    const projectPath: unknown = body.project_path;
    const filename: unknown = body.filename;
    const content: unknown = body.content;
    if (typeof projectPath !== "string" || !projectPath) return res.status(400).json({ error: "project_path_required" });
    if (typeof filename !== "string" || !filename) return res.status(400).json({ error: "filename_required" });
    if (typeof content !== "string") return res.status(400).json({ error: "content_required" });
    // sanitize: strip path separators from filename
    const safeName = path.basename(filename).replace(/[/\\]/g, "");
    if (!safeName) return res.status(400).json({ error: "invalid_filename" });
    const resolvedDir = path.resolve(projectPath);
    if (!isPathInsideAllowedRoots(resolvedDir)) return res.status(403).json({ error: "path_outside_allowed_roots" });
    try { fs.mkdirSync(resolvedDir, { recursive: true }); } catch { /* ignore */ }
    const dest = path.join(resolvedDir, safeName);
    fs.writeFileSync(dest, content, "utf-8");
    return res.json({ ok: true, path: dest });
  });

  app.post("/api/projects", (req, res) => {
    const body = req.body ?? {};
    const name = normalizeTextField(body.name);
    const projectPath = normalizeProjectPathInput(body.project_path);
    const coreGoal = normalizeTextField(body.core_goal);
    const createPathIfMissing = body.create_path_if_missing !== false;
    if (!name) return res.status(400).json({ error: "name_required" });
    if (!projectPath) return res.status(400).json({ error: "project_path_required" });
    if (!coreGoal) return res.status(400).json({ error: "core_goal_required" });
    if (!isPathInsideAllowedRoots(projectPath)) {
      return res.status(403).json({
        error: "project_path_outside_allowed_roots",
        allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
      });
    }
    const conflictingProject = findConflictingProjectByPath(projectPath);
    if (conflictingProject) {
      return res.status(409).json({
        error: "project_path_conflict",
        existing_project_id: conflictingProject.id,
        existing_project_name: conflictingProject.name,
        existing_project_path: conflictingProject.project_path,
      });
    }
    const inspected = inspectDirectoryPath(projectPath);
    if (inspected.exists && !inspected.isDirectory) {
      return res.status(400).json({ error: "project_path_not_directory" });
    }
    if (!inspected.exists) {
      if (!createPathIfMissing) {
        return res.status(409).json({
          error: "project_path_not_found",
          normalized_path: projectPath,
          can_create: inspected.canCreate,
          nearest_existing_parent: inspected.nearestExistingParent,
        });
      }
      const ensureDir = ensureDirectoryPathExists(projectPath);
      if (!ensureDir.ok) {
        return res.status(400).json({ error: "project_path_unavailable", reason: ensureDir.reason });
      }
    }

    const githubRepo = typeof body.github_repo === "string" ? body.github_repo.trim() || null : null;
    const figmaUrl = typeof body.figma_url === "string" ? body.figma_url.trim() || null : null;
    const categoryId = typeof body.category_id === "string" ? body.category_id.trim() || null : null;
    const assignmentMode = body.assignment_mode === "manual" ? "manual" : "auto";
    const requestedDefaultPackKey = normalizeTextField(body.default_pack_key);
    if (requestedDefaultPackKey && !isWorkflowPackKey(requestedDefaultPackKey)) {
      return res.status(400).json({ error: "invalid_default_pack_key" });
    }
    const defaultPackKey = requestedDefaultPackKey ?? DEFAULT_WORKFLOW_PACK_KEY;
    const validatedAgentIds = validateProjectAgentIds((body as Record<string, unknown>).agent_ids);
    if ("error" in validatedAgentIds) {
      return res.status(400).json({
        error: validatedAgentIds.error.code,
        invalid_ids: validatedAgentIds.error.invalidIds ?? [],
      });
    }
    const agentIds = validatedAgentIds.agentIds;

    const id = randomUUID();
    const t = nowMs();
    runInTransaction(() => {
      db.prepare(
        `
      INSERT INTO projects (
        id, name, project_path, core_goal, default_pack_key, assignment_mode, category_id, last_used_at, created_at, updated_at, github_repo, figma_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      ).run(id, name, projectPath, coreGoal, defaultPackKey, assignmentMode, categoryId, t, t, t, githubRepo, figmaUrl);

      if (assignmentMode === "manual" && agentIds.length > 0) {
        const insertPA = db.prepare("INSERT INTO project_agents (project_id, agent_id, created_at) VALUES (?, ?, ?)");
        for (const agentId of agentIds) {
          insertPA.run(id, agentId, t);
        }
      }
    });

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    const assignedAgentIds = (
      db.prepare("SELECT agent_id FROM project_agents WHERE project_id = ?").all(id) as Array<{ agent_id: string }>
    ).map((row) => row.agent_id);
    res.json({ ok: true, project: { ...project, assigned_agent_ids: assignedAgentIds } });
  });

  app.patch("/api/projects/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const updates: string[] = ["updated_at = ?"];
    const params: unknown[] = [nowMs()];
    const createPathIfMissing = body.create_path_if_missing !== false;

    if ("name" in body) {
      const value = normalizeTextField(body.name);
      if (!value) return res.status(400).json({ error: "name_required" });
      updates.push("name = ?");
      params.push(value);
    }
    if ("project_path" in body) {
      const value = normalizeProjectPathInput(body.project_path);
      if (!value) return res.status(400).json({ error: "project_path_required" });
      if (!isPathInsideAllowedRoots(value)) {
        return res.status(403).json({
          error: "project_path_outside_allowed_roots",
          allowed_roots: PROJECT_PATH_ALLOWED_ROOTS,
        });
      }
      const conflictingProject = findConflictingProjectByPath(value, id);
      if (conflictingProject) {
        return res.status(409).json({
          error: "project_path_conflict",
          existing_project_id: conflictingProject.id,
          existing_project_name: conflictingProject.name,
          existing_project_path: conflictingProject.project_path,
        });
      }
      const inspected = inspectDirectoryPath(value);
      if (inspected.exists && !inspected.isDirectory) {
        return res.status(400).json({ error: "project_path_not_directory" });
      }
      if (!inspected.exists) {
        if (!createPathIfMissing) {
          return res.status(409).json({
            error: "project_path_not_found",
            normalized_path: value,
            can_create: inspected.canCreate,
            nearest_existing_parent: inspected.nearestExistingParent,
          });
        }
        const ensureDir = ensureDirectoryPathExists(value);
        if (!ensureDir.ok) {
          return res.status(400).json({ error: "project_path_unavailable", reason: ensureDir.reason });
        }
      }
      updates.push("project_path = ?");
      params.push(value);
    }
    if ("core_goal" in body) {
      const value = normalizeTextField(body.core_goal);
      if (!value) return res.status(400).json({ error: "core_goal_required" });
      updates.push("core_goal = ?");
      params.push(value);
    }
    if ("github_repo" in body) {
      const value = typeof body.github_repo === "string" ? body.github_repo.trim() || null : null;
      updates.push("github_repo = ?");
      params.push(value);
    }
    if ("figma_url" in body) {
      const value = typeof body.figma_url === "string" ? body.figma_url.trim() || null : null;
      updates.push("figma_url = ?");
      params.push(value);
    }
    if ("assignment_mode" in body) {
      const value = body.assignment_mode === "manual" ? "manual" : "auto";
      updates.push("assignment_mode = ?");
      params.push(value);
    }
    if ("default_pack_key" in body) {
      const value = normalizeTextField(body.default_pack_key);
      if (!value || !isWorkflowPackKey(value)) {
        return res.status(400).json({ error: "invalid_default_pack_key" });
      }
      updates.push("default_pack_key = ?");
      params.push(value);
    }

    const hasAgentIdsUpdate = "agent_ids" in body;
    let agentIds: string[] = [];
    if (hasAgentIdsUpdate) {
      const validatedAgentIds = validateProjectAgentIds((body as Record<string, unknown>).agent_ids);
      if ("error" in validatedAgentIds) {
        return res.status(400).json({
          error: validatedAgentIds.error.code,
          invalid_ids: validatedAgentIds.error.invalidIds ?? [],
        });
      }
      agentIds = validatedAgentIds.agentIds;
    }

    if (updates.length <= 1 && !hasAgentIdsUpdate) {
      return res.status(400).json({ error: "no_fields" });
    }

    runInTransaction(() => {
      if (updates.length > 1) {
        params.push(id);
        db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...(params as SQLInputValue[]));
      }
      if (hasAgentIdsUpdate) {
        db.prepare("DELETE FROM project_agents WHERE project_id = ?").run(id);
        if (agentIds.length > 0) {
          const insertPA = db.prepare("INSERT INTO project_agents (project_id, agent_id, created_at) VALUES (?, ?, ?)");
          const t = nowMs();
          for (const agentId of agentIds) {
            insertPA.run(id, agentId, t);
          }
        }
      }
    });

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    const assignedAgentIds = (
      db.prepare("SELECT agent_id FROM project_agents WHERE project_id = ?").all(id) as Array<{ agent_id: string }>
    ).map((row) => row.agent_id);
    res.json({ ok: true, project: { ...project, assigned_agent_ids: assignedAgentIds } });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    db.prepare("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  app.get("/api/projects/:id", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const tasks = db
      .prepare(
        `
    SELECT t.id, t.title, t.status, t.task_type, t.priority, t.created_at, t.updated_at, t.completed_at,
           t.source_task_id,
           t.assigned_agent_id,
           t.department_id,
           COALESCE(a.name, '') AS assigned_agent_name,
           COALESCE(a.name_ko, '') AS assigned_agent_name_ko,
           COALESCE(d.name, '') AS department_name,
           COALESCE(d.name_ko, '') AS department_name_ko
    FROM tasks t
    LEFT JOIN agents a ON a.id = t.assigned_agent_id
    LEFT JOIN departments d ON d.id = t.department_id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
    LIMIT 300
  `,
      )
      .all(id);

    const reports = db
      .prepare(
        `
    SELECT t.id, t.title, t.completed_at, t.created_at, t.assigned_agent_id,
           COALESCE(a.name, '') AS agent_name,
           COALESCE(a.name_ko, '') AS agent_name_ko,
           COALESCE(d.name, '') AS dept_name,
           COALESCE(d.name_ko, '') AS dept_name_ko
    FROM tasks t
    LEFT JOIN agents a ON a.id = t.assigned_agent_id
    LEFT JOIN departments d ON d.id = t.department_id
    WHERE t.project_id = ?
      AND t.status = 'done'
      AND (t.source_task_id IS NULL OR TRIM(t.source_task_id) = '')
    ORDER BY t.completed_at DESC, t.created_at DESC
    LIMIT 200
  `,
      )
      .all(id);

    const decisionEvents = db
      .prepare(
        `
    SELECT
      id,
      snapshot_hash,
      event_type,
      summary,
      selected_options_json,
      note,
      task_id,
      meeting_id,
      created_at
    FROM project_review_decision_events
    WHERE project_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 300
  `,
      )
      .all(id);

    const assignedAgents = db
      .prepare(
        `
    SELECT a.* FROM agents a
    INNER JOIN project_agents pa ON pa.agent_id = a.id
    WHERE pa.project_id = ?
    ORDER BY a.department_id, a.role, a.name
  `,
      )
      .all(id);
    const assignedAgentIds = assignedAgents.map((agent: any) => agent.id);

    res.json({
      project: { ...project, assigned_agent_ids: assignedAgentIds },
      assigned_agents: assignedAgents,
      tasks,
      reports,
      decision_events: decisionEvents,
    });
  });

  // GET /api/projects/:id/burndown — daily task creation/completion for burndown chart
  app.get("/api/projects/:id/burndown", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    // Get all tasks for the project with relevant timestamps
    const rows = db
      .prepare(
        `SELECT created_at, completed_at, status FROM tasks WHERE project_id = ? ORDER BY created_at ASC`,
      )
      .all(id) as { created_at: number; completed_at: number | null; status: string }[];

    if (rows.length === 0) {
      return res.json({ ok: true, burndown: [] });
    }

    // Group by day
    const dayMs = 86_400_000;
    const firstDay = Math.floor(rows[0].created_at / dayMs) * dayMs;
    const lastDay = Math.floor(Date.now() / dayMs) * dayMs;
    const dayMap = new Map<number, { created: number; completed: number }>();

    for (let d = firstDay; d <= lastDay; d += dayMs) {
      dayMap.set(d, { created: 0, completed: 0 });
    }

    for (const row of rows) {
      const createdDay = Math.floor(row.created_at / dayMs) * dayMs;
      const entry = dayMap.get(createdDay);
      if (entry) entry.created++;

      if (row.completed_at) {
        const completedDay = Math.floor(row.completed_at / dayMs) * dayMs;
        const cEntry = dayMap.get(completedDay);
        if (cEntry) cEntry.completed++;
      }
    }

    // Build cumulative data
    let totalCreated = 0;
    let totalCompleted = 0;
    const burndown: { date: number; total: number; done: number; remaining: number }[] = [];

    for (const [date, { created, completed }] of [...dayMap.entries()].sort((a, b) => a[0] - b[0])) {
      totalCreated += created;
      totalCompleted += completed;
      burndown.push({
        date,
        total: totalCreated,
        done: totalCompleted,
        remaining: totalCreated - totalCompleted,
      });
    }

    res.json({ ok: true, burndown });
  });

  // ── Project Sources ───────────────────────────────────────────────────────────

  app.get("/api/projects/:id/sources", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const rows = db.prepare(`
      SELECT
        ps.id,
        ps.source_project_id,
        ps.label,
        ps.sort_order,
        p.name AS source_project_name,
        p.category_id AS source_category_id,
        c.name AS source_category_name,
        c.name_ko AS source_category_name_ko,
        c.color AS source_category_color
      FROM project_sources ps
      JOIN projects p ON p.id = ps.source_project_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ps.project_id = ?
      ORDER BY ps.sort_order ASC, ps.created_at ASC
    `).all(id) as Array<{
      id: string;
      source_project_id: string;
      label: string | null;
      sort_order: number;
      source_project_name: string;
      source_category_id: string | null;
      source_category_name: string | null;
      source_category_name_ko: string | null;
      source_category_color: string | null;
    }>;

    // For each source, get deliverable check counts
    const sources = rows.map((row) => {
      const checks = db.prepare(`
        SELECT checked FROM project_deliverable_checks WHERE project_id = ?
      `).all(row.source_project_id) as Array<{ checked: number }>;

      const total = checks.length;
      const checked_count = checks.filter((c) => c.checked === 1).length;
      const checked_deliverables = (db.prepare(`
        SELECT key, label, note FROM project_deliverable_checks
        WHERE project_id = ? AND checked = 1 ORDER BY checked_at ASC
      `).all(row.source_project_id) as Array<{ key: string; label: string; note: string | null }>);

      return {
        id: row.id,
        source_project_id: row.source_project_id,
        source_project_name: row.source_project_name,
        source_category_id: row.source_category_id,
        source_category_name: row.source_category_name_ko ?? row.source_category_name,
        source_category_color: row.source_category_color,
        label: row.label,
        sort_order: row.sort_order,
        checked_count,
        total_count: total,
        checked_deliverables,
      };
    });

    res.json({ ok: true, sources });
  });

  app.post("/api/projects/:id/sources", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const sourceProjectId = typeof body.source_project_id === "string" ? body.source_project_id.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() || null : null;

    if (!sourceProjectId) return res.status(400).json({ error: "source_project_id_required" });
    if (sourceProjectId === id) return res.status(400).json({ error: "circular_self_reference" });

    // Check that source project exists
    const sourceProject = db.prepare("SELECT id FROM projects WHERE id = ?").get(sourceProjectId);
    if (!sourceProject) return res.status(404).json({ error: "source_project_not_found" });

    // Circular reference check: if sourceProject already has id as a source
    const circular = db.prepare(
      "SELECT id FROM project_sources WHERE project_id = ? AND source_project_id = ?"
    ).get(sourceProjectId, id);
    if (circular) return res.status(400).json({ error: "circular_reference" });

    // Max 5 sources
    const count = (db.prepare("SELECT COUNT(*) AS cnt FROM project_sources WHERE project_id = ?").get(id) as { cnt: number }).cnt;
    if (count >= 5) return res.status(400).json({ error: "max_sources_reached" });

    const t = nowMs();
    try {
      db.prepare(
        "INSERT INTO project_sources (project_id, source_project_id, label, sort_order, created_at) VALUES (?, ?, ?, ?, ?)"
      ).run(id, sourceProjectId, label, count, t);
    } catch {
      return res.status(409).json({ error: "already_linked" });
    }

    res.json({ ok: true });
  });

  app.delete("/api/projects/:id/sources/:sourceId", (req, res) => {
    const id = String(req.params.id);
    const sourceId = String(req.params.sourceId);
    const row = db.prepare("SELECT id FROM project_sources WHERE id = ? AND project_id = ?").get(sourceId, id);
    if (!row) return res.status(404).json({ error: "not_found" });
    db.prepare("DELETE FROM project_sources WHERE id = ?").run(sourceId);
    res.json({ ok: true });
  });

  // ── Project Templates ────────────────────────────────────────────────────────

  app.get("/api/project-templates", (_req, res) => {
    const templates = db.prepare(`
      SELECT id, name, description, category, default_pack_key, core_goal_template, is_builtin, created_at, updated_at
      FROM project_templates ORDER BY is_builtin DESC, created_at ASC
    `).all() as Array<{
      id: string; name: string; description: string | null; category: string;
      default_pack_key: string; core_goal_template: string; is_builtin: number;
      created_at: number; updated_at: number;
    }>;

    const objectives = db.prepare(
      "SELECT id, template_id, title, description, order_index FROM project_template_objectives ORDER BY order_index ASC"
    ).all() as Array<{ id: string; template_id: string; title: string; description: string | null; order_index: number }>;

    const gates = db.prepare(
      "SELECT id, template_id, title, description, gate_type, order_index FROM project_template_gates ORDER BY order_index ASC"
    ).all() as Array<{ id: string; template_id: string; title: string; description: string | null; gate_type: string; order_index: number }>;

    const objByTpl = new Map<string, typeof objectives>();
    for (const obj of objectives) {
      if (!objByTpl.has(obj.template_id)) objByTpl.set(obj.template_id, []);
      objByTpl.get(obj.template_id)!.push(obj);
    }
    const gateByTpl = new Map<string, typeof gates>();
    for (const gate of gates) {
      if (!gateByTpl.has(gate.template_id)) gateByTpl.set(gate.template_id, []);
      gateByTpl.get(gate.template_id)!.push(gate);
    }

    res.json({
      ok: true,
      templates: templates.map((tpl) => ({
        ...tpl,
        is_builtin: tpl.is_builtin === 1,
        objectives: objByTpl.get(tpl.id) ?? [],
        gates: gateByTpl.get(tpl.id) ?? [],
      })),
    });
  });

  app.post("/api/project-templates", (req, res) => {
    const { name, description, category, default_pack_key, core_goal_template, objectives = [], gates = [] } = req.body as {
      name?: string; description?: string; category?: string;
      default_pack_key?: string; core_goal_template?: string;
      objectives?: Array<{ title: string; description?: string }>;
      gates?: Array<{ title: string; description?: string; gate_type?: string }>;
    };
    if (!name?.trim()) return res.status(400).json({ ok: false, error: "name_required" });
    const id = randomUUID();
    const now = nowMs();
    db.prepare(
      "INSERT INTO project_templates (id, name, description, category, default_pack_key, core_goal_template, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)"
    ).run(id, name.trim(), description?.trim() || null, category?.trim() || "general", default_pack_key || "development", core_goal_template?.trim() || "", now, now);
    (objectives as Array<{ title: string; description?: string }>).forEach((obj, i) => {
      db.prepare("INSERT INTO project_template_objectives (id, template_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), id, obj.title, obj.description || null, i);
    });
    (gates as Array<{ title: string; description?: string; gate_type?: string }>).forEach((gate, i) => {
      db.prepare("INSERT INTO project_template_gates (id, template_id, title, description, gate_type, order_index) VALUES (?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), id, gate.title, gate.description || null, gate.gate_type || "milestone", i);
    });
    res.json({ ok: true, id });
  });

  app.delete("/api/project-templates/:templateId", (req, res) => {
    const { templateId } = req.params;
    const tpl = db.prepare("SELECT id, is_builtin FROM project_templates WHERE id = ?").get(templateId) as { id: string; is_builtin: number } | undefined;
    if (!tpl) return res.status(404).json({ ok: false, error: "not_found" });
    if (tpl.is_builtin) return res.status(403).json({ ok: false, error: "builtin_protected" });
    db.prepare("DELETE FROM project_templates WHERE id = ?").run(templateId);
    res.json({ ok: true });
  });

  // ── Deliverable Checks ───────────────────────────────────────────────────────

  app.get("/api/projects/:id/deliverables", (req, res) => {
    const id = String(req.params.id);
    const project = db.prepare("SELECT id, category_id FROM projects WHERE id = ?").get(id) as
      | { id: string; category_id: string | null }
      | undefined;
    if (!project) return res.status(404).json({ error: "not_found" });

    // Get deliverable_schema from category
    let schema: Array<{ key: string; label: string; type?: string }> = [];
    if (project.category_id) {
      const cat = db
        .prepare("SELECT deliverable_schema FROM categories WHERE id = ?")
        .get(project.category_id) as { deliverable_schema: string | null } | undefined;
      if (cat?.deliverable_schema) {
        try {
          schema = JSON.parse(cat.deliverable_schema);
        } catch { /* ignore */ }
      }
    }

    // Get existing checks
    const checks = db
      .prepare("SELECT key, label, checked, checked_at, note FROM project_deliverable_checks WHERE project_id = ?")
      .all(id) as Array<{ key: string; label: string; checked: number; checked_at: number | null; note: string | null }>;

    const checkMap = new Map(checks.map((c) => [c.key, c]));

    // Merge schema with existing checks
    const items = schema.map((s) => {
      const existing = checkMap.get(s.key);
      return {
        key: s.key,
        label: s.label,
        type: s.type ?? "document",
        checked: existing ? Boolean(existing.checked) : false,
        checked_at: existing?.checked_at ?? null,
        note: existing?.note ?? null,
      };
    });

    res.json({ ok: true, items });
  });

  app.put("/api/projects/:id/deliverables/:key", (req, res) => {
    const id = String(req.params.id);
    const key = String(req.params.key);
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!project) return res.status(404).json({ error: "not_found" });

    const body = req.body ?? {};
    const checked = body.checked === true || body.checked === 1 ? 1 : 0;
    const note = typeof body.note === "string" ? body.note.trim() || null : null;
    const label = typeof body.label === "string" ? body.label.trim() : key;
    const t = nowMs();
    const checkedAt = checked ? t : null;

    db.prepare(`
      INSERT INTO project_deliverable_checks (project_id, key, label, checked, checked_at, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, key) DO UPDATE SET
        checked    = excluded.checked,
        checked_at = excluded.checked_at,
        note       = excluded.note,
        updated_at = excluded.updated_at
    `).run(id, key, label, checked, checkedAt, note, t, t);

    res.json({ ok: true, key, checked: Boolean(checked), checked_at: checkedAt, note });
  });

  app.post("/api/projects/:projectId/apply-template/:templateId", (req, res) => {
    const { projectId, templateId } = req.params;
    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ ok: false, error: "project_not_found" });
    const tpl = db.prepare("SELECT id FROM project_templates WHERE id = ?").get(templateId);
    if (!tpl) return res.status(404).json({ ok: false, error: "template_not_found" });

    const now = nowMs();
    const objectives = db.prepare(
      "SELECT title, description, order_index FROM project_template_objectives WHERE template_id = ? ORDER BY order_index ASC"
    ).all(templateId) as Array<{ title: string; description: string | null; order_index: number }>;
    const gates = db.prepare(
      "SELECT title, description, gate_type, order_index FROM project_template_gates WHERE template_id = ? ORDER BY order_index ASC"
    ).all(templateId) as Array<{ title: string; description: string | null; gate_type: string; order_index: number }>;

    runInTransaction(() => {
      for (const obj of objectives) {
        db.prepare(
          "INSERT INTO project_objectives (id, project_id, title, description, progress, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)"
        ).run(randomUUID(), projectId, obj.title, obj.description, obj.order_index, now, now);
      }
      for (const gate of gates) {
        db.prepare(
          "INSERT INTO project_gates (id, project_id, title, description, gate_type, status, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)"
        ).run(randomUUID(), projectId, gate.title, gate.description, gate.gate_type, gate.order_index, now, now);
      }
    });

    res.json({ ok: true, objectives_created: objectives.length, gates_created: gates.length });
  });
}
