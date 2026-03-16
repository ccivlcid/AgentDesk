import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { MeetingMinuteEntryRow, MeetingMinutesRow } from "../../shared/types.ts";
import { isWorkflowPackKey } from "../../../workflow/packs/definitions.ts";
import { resolveWorkflowPackKeyForTask } from "../../../workflow/packs/task-pack-resolver.ts";
import { recordTaskExecutionEvent, taskExecutionEventsTableExists } from "../../../workflow/core/task-execution-meta.ts";

export type TaskCrudRouteDeps = Pick<
  RuntimeContext,
  | "app"
  | "db"
  | "nowMs"
  | "firstQueryValue"
  | "reconcileCrossDeptSubtasks"
  | "normalizeTextField"
  | "recordTaskCreationAudit"
  | "appendTaskLog"
  | "broadcast"
  | "setTaskCreationAuditCompletion"
  | "clearTaskWorkflowState"
  | "endTaskExecutionSession"
  | "activeProcesses"
  | "stopRequestedTasks"
  | "killPidTree"
  | "logsDir"
>;

export function registerTaskCrudRoutes(deps: TaskCrudRouteDeps): void {
  const {
    app,
    db,
    nowMs,
    firstQueryValue,
    reconcileCrossDeptSubtasks,
    normalizeTextField,
    recordTaskCreationAudit,
    appendTaskLog,
    broadcast,
    setTaskCreationAuditCompletion,
    clearTaskWorkflowState,
    endTaskExecutionSession,
    activeProcesses,
    stopRequestedTasks,
    killPidTree,
    logsDir,
  } = deps;

  function normalizeProjectPathInput(raw: unknown): string | null {
    const value = normalizeTextField(raw);
    if (!value) return null;

    let candidate = value;
    if (candidate === "~") {
      candidate = os.homedir();
    } else if (candidate.startsWith("~/")) {
      candidate = path.join(os.homedir(), candidate.slice(2));
    } else if (candidate === "/Projects" || candidate.startsWith("/Projects/")) {
      const suffix = candidate.slice("/Projects".length).replace(/^\/+/, "");
      candidate = suffix ? path.join(os.homedir(), "Projects", suffix) : path.join(os.homedir(), "Projects");
    } else if (candidate === "/projects" || candidate.startsWith("/projects/")) {
      const suffix = candidate.slice("/projects".length).replace(/^\/+/, "");
      candidate = suffix ? path.join(os.homedir(), "projects", suffix) : path.join(os.homedir(), "projects");
    }

    const absolute = path.isAbsolute(candidate) ? candidate : path.resolve(process.cwd(), candidate);
    return path.normalize(absolute);
  }

  app.get("/api/tasks", (req, res) => {
    reconcileCrossDeptSubtasks();
    const statusFilter = firstQueryValue(req.query.status);
    const deptFilter = firstQueryValue(req.query.department_id);
    const agentFilter = firstQueryValue(req.query.agent_id);
    const projectFilter = firstQueryValue(req.query.project_id);
    const workflowPackFilter = normalizeTextField(firstQueryValue(req.query.workflow_pack_key));
    const contextHintFilter = normalizeTextField(firstQueryValue(req.query.context_hint));
    // Accept either query param; context_hint takes precedence
    const effectivePackFilter = contextHintFilter || workflowPackFilter;

    if (effectivePackFilter && !isWorkflowPackKey(effectivePackFilter)) {
      return res.status(400).json({ error: "invalid_workflow_pack_key" });
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (statusFilter) {
      conditions.push("t.status = ?");
      params.push(statusFilter);
    }
    if (deptFilter) {
      conditions.push("t.department_id = ?");
      params.push(deptFilter);
    }
    if (agentFilter) {
      conditions.push("t.assigned_agent_id = ?");
      params.push(agentFilter);
    }
    if (projectFilter) {
      conditions.push("t.project_id = ?");
      params.push(projectFilter);
    }
    if (effectivePackFilter) {
      conditions.push("COALESCE(t.context_hint, t.workflow_pack_key) = ?");
      params.push(effectivePackFilter);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const subtaskTotalExpr = `(
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id)
    +
    (SELECT COUNT(*)
     FROM tasks c
     WHERE c.source_task_id = t.id
       AND NOT EXISTS (
         SELECT 1
         FROM subtasks s2
         WHERE s2.task_id = t.id
           AND s2.delegated_task_id = c.id
       )
    )
  )`;
    const subtaskDoneExpr = `(
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.status = 'done')
    +
    (SELECT COUNT(*)
     FROM tasks c
     WHERE c.source_task_id = t.id
       AND c.status = 'done'
       AND NOT EXISTS (
         SELECT 1
         FROM subtasks s2
         WHERE s2.task_id = t.id
           AND s2.delegated_task_id = c.id
       )
    )
  )`;

    const tasks = db
      .prepare(
        `
      SELECT t.*,
        a.name AS agent_name,
        a.avatar_emoji AS agent_avatar,
        d.name AS department_name,
        d.icon AS department_icon,
        p.name AS project_name,
        p.core_goal AS project_core_goal,
        ${subtaskTotalExpr} AS subtask_total,
        ${subtaskDoneExpr} AS subtask_done
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN projects p ON t.project_id = p.id
      ${where}
      ORDER BY t.priority DESC, t.updated_at DESC
    `,
      )
      .all(...(params as SQLInputValue[]));

    res.json({ tasks });
  });

  app.post("/api/tasks", (req, res) => {
    const body = req.body ?? {};
    const id = randomUUID();
    const t = nowMs();

    const title = (body as any).title;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title_required" });
    }

    const requestedProjectId = normalizeTextField((body as any).project_id);
    let resolvedProjectId: string | null = null;
    let resolvedProjectPath = normalizeProjectPathInput((body as any).project_path);
    if (requestedProjectId) {
      const project = db.prepare("SELECT id, project_path FROM projects WHERE id = ?").get(requestedProjectId) as
        | {
            id: string;
            project_path: string;
          }
        | undefined;
      if (!project) return res.status(400).json({ error: "project_not_found" });
      resolvedProjectId = project.id;
      if (!resolvedProjectPath) resolvedProjectPath = normalizeTextField(project.project_path);
    } else if (resolvedProjectPath) {
      const projectByPath = db
        .prepare(
          "SELECT id, project_path FROM projects WHERE project_path = ? ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 1",
        )
        .get(resolvedProjectPath) as { id: string; project_path: string } | undefined;
      if (projectByPath) {
        resolvedProjectId = projectByPath.id;
        resolvedProjectPath = normalizeTextField(projectByPath.project_path) ?? resolvedProjectPath;
      }
    }

    const requestedCategoryId = normalizeTextField((body as any).category_id) || null;
    const resolvedCategoryId: string | null = requestedCategoryId
      ? ((db.prepare("SELECT id FROM categories WHERE id = ? LIMIT 1").get(requestedCategoryId) as { id: string } | undefined)?.id ?? null)
      : null;

    const handoffToAgentId = typeof (body as any).handoff_to_agent_id === "string" && (body as any).handoff_to_agent_id
      ? (body as any).handoff_to_agent_id
      : null;
    const validHandoffConditions = ["always", "on_success", "on_fail"] as const;
    const handoffCondition = validHandoffConditions.includes((body as any).handoff_condition)
      ? (body as any).handoff_condition
      : null;

    const resolvedPackKey = resolveWorkflowPackKeyForTask({
      db: db as any,
      explicitPackKey: (body as any).workflow_pack_key ?? (body as any).context_hint,
      categoryId: resolvedCategoryId,
      projectId: resolvedProjectId,
    });
    db.prepare(
      `
    INSERT INTO tasks (
      id, title, description, department_id, assigned_agent_id, project_id,
      status, priority, task_type, workflow_pack_key, context_hint, workflow_meta_json, output_format,
      project_path, base_branch, category_id, handoff_to_agent_id, handoff_condition, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    ).run(
      id,
      title,
      (body as any).description ?? null,
      (body as any).department_id ?? null,
      (body as any).assigned_agent_id ?? null,
      resolvedProjectId,
      (body as any).status ?? "inbox",
      (body as any).priority ?? 0,
      (body as any).task_type ?? "general",
      resolvedPackKey,
      resolvedPackKey,
      typeof (body as any).workflow_meta_json === "string"
        ? (body as any).workflow_meta_json
        : (body as any).workflow_meta_json
          ? JSON.stringify((body as any).workflow_meta_json)
          : null,
      typeof (body as any).output_format === "string" ? (body as any).output_format : null,
      resolvedProjectPath,
      (body as any).base_branch ?? null,
      resolvedCategoryId,
      handoffToAgentId,
      handoffCondition,
      t,
      t,
    );
    recordTaskCreationAudit({
      taskId: id,
      taskTitle: title,
      taskStatus: String((body as any).status ?? "inbox"),
      departmentId: typeof (body as any).department_id === "string" ? (body as any).department_id : null,
      assignedAgentId: typeof (body as any).assigned_agent_id === "string" ? (body as any).assigned_agent_id : null,
      taskType: typeof (body as any).task_type === "string" ? (body as any).task_type : "general",
      projectPath: resolvedProjectPath,
      trigger: "api.tasks.create",
      triggerDetail: "POST /api/tasks",
      actorType: "api_client",
      req,
      body: typeof body === "object" && body ? (body as Record<string, unknown>) : null,
    });

    if (resolvedProjectId) {
      db.prepare("UPDATE projects SET last_used_at = ?, updated_at = ? WHERE id = ?").run(t, t, resolvedProjectId);
    }

    appendTaskLog(id, "system", `Task created: ${title}`);
    recordTaskExecutionEvent(db as any, {
      taskId: id,
      eventType: "task_created",
      toState: "queued",
      summary: `Task created: ${title}`,
      metadata: {
        status: (body as any).status ?? "inbox",
        assigned_agent_id: (body as any).assigned_agent_id ?? null,
      },
      createdAt: t,
    });

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    broadcast("task_update", task);
    res.json({ id, task });
  });

  app.get("/api/tasks/:id", (req, res) => {
    const id = String(req.params.id);
    reconcileCrossDeptSubtasks(id);
    const subtaskTotalExpr = `(
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id)
    +
    (SELECT COUNT(*)
     FROM tasks c
     WHERE c.source_task_id = t.id
       AND NOT EXISTS (
         SELECT 1
         FROM subtasks s2
         WHERE s2.task_id = t.id
           AND s2.delegated_task_id = c.id
       )
    )
  )`;
    const subtaskDoneExpr = `(
    (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.status = 'done')
    +
    (SELECT COUNT(*)
     FROM tasks c
     WHERE c.source_task_id = t.id
       AND c.status = 'done'
       AND NOT EXISTS (
         SELECT 1
         FROM subtasks s2
         WHERE s2.task_id = t.id
           AND s2.delegated_task_id = c.id
       )
    )
  )`;
    const task = db
      .prepare(
        `
      SELECT t.*,
        a.name AS agent_name,
        a.avatar_emoji AS agent_avatar,
        a.cli_provider AS agent_provider,
        d.name AS department_name,
        d.icon AS department_icon,
        p.name AS project_name,
        p.core_goal AS project_core_goal,
        ${subtaskTotalExpr} AS subtask_total,
        ${subtaskDoneExpr} AS subtask_done
      FROM tasks t
      LEFT JOIN agents a ON t.assigned_agent_id = a.id
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `,
      )
      .get(id);
    if (!task) return res.status(404).json({ error: "not_found" });

    const logs = db.prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT 200").all(id);
    const subtasks = db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at").all(id);

    res.json({ task, logs, subtasks });
  });

  app.get("/api/tasks/:id/execution", (req, res) => {
    const id = String(req.params.id);
    const task = db
      .prepare(
        `SELECT
           id, status, execution_state, execution_attempt, claimed_by, claim_expires_at,
           last_heartbeat_at, last_output_at, retry_after, execution_error_code,
           execution_error_summary, resolved_workflow_contract_hash, started_at, completed_at, updated_at
         FROM tasks
         WHERE id = ?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    if (!task) return res.status(404).json({ error: "not_found" });

    const latestEvent =
      taskExecutionEventsTableExists(db as any)
        ? (db
            .prepare(
              "SELECT id, event_type, from_state, to_state, summary, metadata_json, created_at FROM task_execution_events WHERE task_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
            )
            .get(id) as Record<string, unknown> | undefined)
        : null;

    res.json({
      execution: task,
      latest_event: latestEvent ?? null,
    });
  });

  app.get("/api/tasks/:id/execution-events", (req, res) => {
    const id = String(req.params.id);
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id) as { id: string } | undefined;
    if (!task) return res.status(404).json({ error: "not_found" });

    if (!taskExecutionEventsTableExists(db as any)) {
      return res.json({ events: [] });
    }

    const limitRaw = Number(firstQueryValue(req.query.limit) ?? 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.trunc(limitRaw))) : 100;
    const events = db
      .prepare(
        `SELECT id, event_type, from_state, to_state, summary, metadata_json, created_at
         FROM task_execution_events
         WHERE task_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
      )
      .all(id, limit);

    res.json({ events });
  });

  app.get("/api/tasks/:id/meeting-minutes", (req, res) => {
    const id = String(req.params.id);
    const task = db.prepare("SELECT id, source_task_id FROM tasks WHERE id = ?").get(id) as
      | { id: string; source_task_id: string | null }
      | undefined;
    if (!task) return res.status(404).json({ error: "not_found" });

    const taskIds = [id];
    if (task.source_task_id) taskIds.push(task.source_task_id);

    const meetings = db
      .prepare(
        `SELECT * FROM meeting_minutes WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY started_at DESC, round DESC`,
      )
      .all(...taskIds) as unknown as MeetingMinutesRow[];

    const data = meetings.map((meeting) => {
      const entries = db
        .prepare("SELECT * FROM meeting_minute_entries WHERE meeting_id = ? ORDER BY seq ASC, id ASC")
        .all(meeting.id) as unknown as MeetingMinuteEntryRow[];
      return { ...meeting, entries };
    });

    res.json({ meetings: data });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "not_found" });

    const body = { ...(req.body ?? {}) } as Record<string, unknown>;
    // Accept context_hint as an alias for workflow_pack_key
    if ("context_hint" in body && !("workflow_pack_key" in body)) {
      body.workflow_pack_key = body.context_hint;
    }
    if ("workflow_pack_key" in body) {
      const workflowPackKey = normalizeTextField(body.workflow_pack_key);
      if (!workflowPackKey || !isWorkflowPackKey(workflowPackKey)) {
        return res.status(400).json({ error: "invalid_workflow_pack_key" });
      }
      body.workflow_pack_key = workflowPackKey;
      // Keep context_hint in sync with workflow_pack_key
      body.context_hint = workflowPackKey;
    }
    if ("workflow_meta_json" in body) {
      const rawWorkflowMeta = body.workflow_meta_json;
      if (rawWorkflowMeta === null) {
        body.workflow_meta_json = null;
      } else if (typeof rawWorkflowMeta === "string") {
        body.workflow_meta_json = rawWorkflowMeta;
      } else {
        body.workflow_meta_json = JSON.stringify(rawWorkflowMeta);
      }
    }
    if ("output_format" in body && body.output_format !== null && typeof body.output_format !== "string") {
      return res.status(400).json({ error: "invalid_output_format" });
    }

    const allowedFields = [
      "title",
      "description",
      "department_id",
      "assigned_agent_id",
      "status",
      "priority",
      "task_type",
      "workflow_pack_key",
      "context_hint",
      "workflow_meta_json",
      "output_format",
      "project_path",
      "result",
      "hidden",
      "category_id",
      "handoff_to_agent_id",
      "handoff_condition",
    ];

    const updates: string[] = ["updated_at = ?"];
    const updateTs = nowMs();
    const params: unknown[] = [updateTs];
    let touchedProjectId: string | null = null;

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if ("project_id" in (body as any)) {
      const requestedProjectId = normalizeTextField((body as any).project_id);
      if (!requestedProjectId) {
        updates.push("project_id = ?");
        params.push(null);
      } else {
        const project = db.prepare("SELECT id, project_path FROM projects WHERE id = ?").get(requestedProjectId) as
          | {
              id: string;
              project_path: string;
            }
          | undefined;
        if (!project) return res.status(400).json({ error: "project_not_found" });
        updates.push("project_id = ?");
        params.push(project.id);
        touchedProjectId = project.id;
        if (!("project_path" in (body as any))) {
          updates.push("project_path = ?");
          params.push(project.project_path);
        }
      }
    }

    if ((body as any).status === "done" && !("completed_at" in (body as any))) {
      updates.push("completed_at = ?");
      params.push(nowMs());
    }
    if ((body as any).status === "in_progress" && !("started_at" in (body as any))) {
      updates.push("started_at = ?");
      params.push(nowMs());
    }

    params.push(id);
    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...(params as SQLInputValue[]));
    if (touchedProjectId) {
      db.prepare("UPDATE projects SET last_used_at = ?, updated_at = ? WHERE id = ?").run(
        updateTs,
        updateTs,
        touchedProjectId,
      );
    }

    const nextStatus = typeof (body as any).status === "string" ? (body as any).status : null;
    if (nextStatus) {
      setTaskCreationAuditCompletion(id, nextStatus === "done");
    }
    if (
      nextStatus &&
      (nextStatus === "cancelled" || nextStatus === "pending" || nextStatus === "done" || nextStatus === "inbox")
    ) {
      clearTaskWorkflowState(id);
      if (nextStatus === "done" || nextStatus === "cancelled") {
        endTaskExecutionSession(id, `task_status_${nextStatus}`);
      }
    }

    appendTaskLog(id, "system", `Task updated: ${Object.keys(body as object).join(", ")}`);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    broadcast("task_update", updated);
    res.json({ ok: true, task: updated });
  });

  app.post("/api/tasks/bulk-hide", (req, res) => {
    const { statuses, hidden } = req.body ?? {};
    if (!Array.isArray(statuses) || statuses.length === 0 || (hidden !== 0 && hidden !== 1)) {
      return res.status(400).json({ error: "invalid_body" });
    }
    const placeholders = statuses.map(() => "?").join(",");
    const result = db
      .prepare(`UPDATE tasks SET hidden = ?, updated_at = ? WHERE status IN (${placeholders}) AND hidden != ?`)
      .run(hidden, nowMs(), ...statuses, hidden);
    broadcast("tasks_changed", {});
    res.json({ ok: true, affected: result.changes });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | {
          assigned_agent_id: string | null;
        }
      | undefined;
    if (!existing) return res.status(404).json({ error: "not_found" });

    endTaskExecutionSession(id, "task_deleted");
    clearTaskWorkflowState(id);

    const activeChild = activeProcesses.get(id);
    if (activeChild?.pid) {
      stopRequestedTasks.add(id);
      if (activeChild.pid < 0) {
        activeChild.kill();
      } else {
        killPidTree(activeChild.pid);
      }
      activeProcesses.delete(id);
    }

    if (existing.assigned_agent_id) {
      db.prepare("UPDATE agents SET status = 'idle', current_task_id = NULL WHERE id = ? AND current_task_id = ?").run(
        existing.assigned_agent_id,
        id,
      );
    }

    db.prepare("DELETE FROM task_logs WHERE task_id = ?").run(id);
    db.prepare("DELETE FROM messages WHERE task_id = ?").run(id);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    for (const suffix of [".log", ".prompt.txt"]) {
      const filePath = path.join(logsDir, `${id}${suffix}`);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // 로그 파일 정리는 베스트 에포트
      }
    }

    broadcast("task_update", { id, deleted: true });
    res.json({ ok: true });
  });
}
