import type { SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { DEFAULT_WORKFLOW_PACK_KEY, isWorkflowPackKey } from "../../../workflow/packs/definitions.ts";
import { DIRECTIVE_TEMPLATES } from "../../../directive-templates.ts";
import type { ProjectRoutesDeps } from "./types.ts";

export function registerCrudRoutes(deps: ProjectRoutesDeps): void {
  const { app, db, firstQueryValue, normalizeTextField, runInTransaction, nowMs, helpers } = deps;
  const {
    PROJECT_PATH_ALLOWED_ROOTS,
    normalizeProjectPathInput,
    isPathInsideAllowedRoots,
    findConflictingProjectByPath,
    inspectDirectoryPath,
    ensureDirectoryPathExists,
    validateProjectAgentIds,
  } = helpers;

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
    const directive = typeof body.directive === "string" ? body.directive || null : null;
    const directiveTypeSlug = typeof body.directive_type_slug === "string" ? body.directive_type_slug.trim() || null : null;
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
        id, name, project_path, core_goal, default_pack_key, assignment_mode, category_id,
        directive, directive_type_slug,
        last_used_at, created_at, updated_at, github_repo, figma_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      ).run(id, name, projectPath, coreGoal, defaultPackKey, assignmentMode, categoryId, directive, directiveTypeSlug, t, t, t, githubRepo, figmaUrl);

      if (assignmentMode === "manual" && agentIds.length > 0) {
        // role_assignments: Array<{ agentId: string; role: string }>
        const roleAssignmentsArr = Array.isArray(body.role_assignments)
          ? (body.role_assignments as Array<{ agentId?: unknown; role?: unknown }>)
          : [];
        const STANDARD_ROLES = new Set(["pm", "pl", "dev"]);
        const roleLabelByAgentId = new Map<string, string>();
        for (const entry of roleAssignmentsArr) {
          const aId = typeof entry.agentId === "string" ? entry.agentId : null;
          const roleLabel = typeof entry.role === "string" ? entry.role.trim() : null;
          if (aId && roleLabel) roleLabelByAgentId.set(aId, roleLabel);
        }
        const insertPA = db.prepare(
          "INSERT OR IGNORE INTO project_agents (project_id, agent_id, project_role, project_role_label, created_at) VALUES (?, ?, ?, ?, ?)",
        );
        for (const agentId of agentIds) {
          const roleLabel = roleLabelByAgentId.get(agentId) ?? null;
          const projectRole = roleLabel && STANDARD_ROLES.has(roleLabel.toLowerCase()) ? roleLabel.toLowerCase() : null;
          insertPA.run(id, agentId, projectRole, roleLabel, t);
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
    if ("directive" in body) {
      const value = typeof body.directive === "string" ? body.directive || null : null;
      updates.push("directive = ?");
      params.push(value);
    }
    if ("directive_type_slug" in body) {
      const value = typeof body.directive_type_slug === "string" ? body.directive_type_slug.trim() || null : null;
      updates.push("directive_type_slug = ?");
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

  /* ── Directive templates ── */
  app.get("/api/directive-templates", (_req, res) => {
    res.json({
      templates: DIRECTIVE_TEMPLATES.map((t) => ({
        slug: t.slug,
        name: t.name,
        name_ko: t.name_ko,
        icon: t.icon,
        color: t.color,
        description: t.description,
        description_ko: t.description_ko,
        departments: t.departments,
        template: t.template,
      })),
    });
  });

  app.delete("/api/projects/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    db.prepare("UPDATE tasks SET project_id = NULL WHERE project_id = ?").run(id);
    db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    res.json({ ok: true });
  });
}
