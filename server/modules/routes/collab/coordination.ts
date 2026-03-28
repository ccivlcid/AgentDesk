/**
 * Project path utilities — extracted from former cross-dept coordination module.
 * Cross-dept cooperation, cross-dept subtasks, and report routing have been removed.
 * No-op stubs preserved for RuntimeContext compatibility.
 */
import type { ResolveProjectPathInput, RuntimeContext } from "../../../types/runtime-context.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DelegationOptions } from "../shared/types.ts";

export function initializeCollabCoordination(ctx: RuntimeContext) {
  const db = ctx.db;

  function normalizeTextField(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Detect project path from message text.
   * Recognizes absolute paths, ~ paths, and known project directories.
   */
  function detectProjectPath(message: string): string | null {
    const homeDir = os.homedir();
    const projectsDir = path.join(homeDir, "Projects");
    const projectsDirLower = path.join(homeDir, "projects");
    const isDirectorySafe = (targetPath: string): boolean => {
      try {
        return fs.statSync(targetPath).isDirectory();
      } catch {
        return false;
      }
    };
    const readProjectNamesSafe = (projectDir: string): string[] => {
      try {
        return fs
          .readdirSync(projectDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
          .map((entry) => entry.name);
      } catch {
        return [];
      }
    };

    // 1a. Explicit absolute path (Unix)
    const absMatch = message.match(/(?:^|\s)(\/[\w./-]+)/);
    if (absMatch) {
      const p = absMatch[1];
      if (isDirectorySafe(p)) return p;
      const parent = path.dirname(p);
      if (isDirectorySafe(parent)) return parent;
    }

    // 1b. Explicit absolute path (Windows)
    const winAbsMatch = message.match(/(?:^|\s)([A-Za-z]:[/\\][\w./\\ -]+)/);
    if (winAbsMatch) {
      const p = winAbsMatch[1].replace(/[\\/]+$/, "");
      if (isDirectorySafe(p)) return p;
      const parent = path.dirname(p);
      if (isDirectorySafe(parent)) return parent;
    }

    // 2. ~ path
    const tildeMatch = message.match(/~\/([\w./-]+)/);
    if (tildeMatch) {
      const expanded = path.join(homeDir, tildeMatch[1]);
      if (isDirectorySafe(expanded)) return expanded;
    }

    // 3. Scan known project directories
    const knownProjects = [projectsDir, projectsDirLower].flatMap((projectDir) => readProjectNamesSafe(projectDir));
    const msgLower = message.toLowerCase();
    for (const proj of knownProjects) {
      if (msgLower.includes(proj.toLowerCase())) {
        const fullPath = path.join(projectsDir, proj);
        if (isDirectorySafe(fullPath)) return fullPath;
        const fullPathLower = path.join(projectsDirLower, proj);
        if (isDirectorySafe(fullPathLower)) return fullPathLower;
      }
    }

    return null;
  }

  /**
   * Resolve project path (canonical-first):
   * 1) task.project_id -> projects.project_path
   * 2) task.project_path
   * 3) detect from description/title
   * 4) latest known project path from DB
   * 5) process.cwd()
   */
  function resolveProjectPath(taskOrId: ResolveProjectPathInput): string {
    const task = typeof taskOrId === "string" ? { project_id: taskOrId } : taskOrId;
    const projectId = String(task.project_id ?? "").trim();
    if (projectId) {
      const row = db
        .prepare(`SELECT project_path FROM projects WHERE id = ? LIMIT 1`)
        .get(projectId) as { project_path: string | null } | undefined;
      const canonical = String(row?.project_path ?? "").trim();
      if (canonical) {
        const detectedCanonical = detectProjectPath(canonical);
        return detectedCanonical || canonical;
      }
    }

    const taskProjectPath = String(task.project_path ?? "").trim();
    if (taskProjectPath) {
      const detectedTaskPath = detectProjectPath(taskProjectPath);
      return detectedTaskPath || taskProjectPath;
    }

    const detected = detectProjectPath(task.description || "") || detectProjectPath(task.title || "");
    if (detected) return detected;

    const latestKnown = getLatestKnownProjectPath();
    if (latestKnown) return latestKnown;

    return process.cwd();
  }

  function getLatestKnownProjectPath(): string | null {
    const row = db
      .prepare(`SELECT project_path FROM tasks WHERE project_path IS NOT NULL AND TRIM(project_path) != '' ORDER BY updated_at DESC LIMIT 1`)
      .get() as { project_path: string | null } | undefined;
    const candidate = normalizeTextField(row?.project_path ?? null);
    if (!candidate) return null;
    try {
      if (fs.statSync(candidate).isDirectory()) return candidate;
    } catch {
      /* stale path */
    }
    return null;
  }

  function getDefaultProjectRoot(): string {
    const homeDir = os.homedir();
    const candidates = [path.join(homeDir, "Projects"), path.join(homeDir, "projects"), process.cwd()];
    for (const candidate of candidates) {
      try {
        if (fs.statSync(candidate).isDirectory()) return candidate;
      } catch {
        /* skip */
      }
    }
    return process.cwd();
  }

  function resolveDirectiveProjectPath(
    ceoMessage: string,
    options: DelegationOptions = {},
  ): { projectPath: string | null; source: string } {
    const explicitProjectId = normalizeTextField((options as { projectId?: unknown }).projectId);
    if (explicitProjectId) {
      const projectById = db
        .prepare(`SELECT project_path FROM projects WHERE id = ? LIMIT 1`)
        .get(explicitProjectId) as { project_path: string | null } | undefined;
      const byIdPath = normalizeTextField(projectById?.project_path);
      if (byIdPath) {
        const detectedByIdPath = detectProjectPath(byIdPath) || byIdPath;
        return { projectPath: detectedByIdPath, source: "project_id" };
      }
    }

    const explicitProjectPath = normalizeTextField(options.projectPath);
    if (explicitProjectPath) {
      const detected = detectProjectPath(explicitProjectPath);
      if (detected) return { projectPath: detected, source: "project_path" };
    }

    const contextHint = normalizeTextField(options.projectContext);
    if (contextHint) {
      const detectedFromContext = detectProjectPath(contextHint);
      if (detectedFromContext) return { projectPath: detectedFromContext, source: "project_context" };

      const newProjectHint =
        /신규\s*프로젝트|새\s*프로젝트|new project|greenfield|from scratch|新規.*プロジェクト|新项目/i.test(contextHint);
      if (newProjectHint) {
        return { projectPath: getDefaultProjectRoot(), source: "new_project_default" };
      }
    }

    const detectedFromMessage = detectProjectPath(ceoMessage);
    if (detectedFromMessage) return { projectPath: detectedFromMessage, source: "message" };

    return { projectPath: null, source: "none" };
  }

  // ── No-op stubs (cross-dept & report routing removed) ────────────────

  const reconcileCrossDeptSubtasks = () => { /* removed */ };
  const recoverCrossDeptQueueAfterMissingCallback = () => { /* removed */ };
  const startCrossDeptCooperation = () => { /* removed */ };
  const stripReportRequestPrefix = (s: string) => s;
  const detectReportOutputFormat = () => null;
  const pickPlanningReportAssignee = () => null;
  const handleReportRequest = () => { /* removed */ };

  return {
    reconcileCrossDeptSubtasks,
    recoverCrossDeptQueueAfterMissingCallback,
    startCrossDeptCooperation,
    detectProjectPath,
    resolveProjectPath,
    getLatestKnownProjectPath,
    getDefaultProjectRoot,
    resolveDirectiveProjectPath,
    stripReportRequestPrefix,
    detectReportOutputFormat,
    pickPlanningReportAssignee,
    handleReportRequest,
  };
}
