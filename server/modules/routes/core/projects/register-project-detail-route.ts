import type { ProjectRoutesDeps } from "./types.ts";

export function registerProjectDetailRoute(deps: ProjectRoutesDeps): void {
  const { app, db } = deps;

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
           COALESCE(a.name, '') AS assigned_agent_name_ko,
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
           COALESCE(a.name, '') AS agent_name_ko,
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
      .all(id) as Array<Record<string, unknown> & { id: string }>;
    const assignedAgentIds = assignedAgents.map((a) => a.id);

    res.json({
      project: { ...project, assigned_agent_ids: assignedAgentIds },
      assigned_agents: assignedAgents,
      tasks,
      reports,
      decision_events: decisionEvents,
    });
  });
}
