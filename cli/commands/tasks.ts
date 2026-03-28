/**
 * agentdesk tasks — list and filter tasks
 */
import { api } from "../lib/api.js";
import { header, table, badge, dim, truncate } from "../lib/ui.js";
import type { Task } from "../../shared/types.js";

// API response extends Task with server-joined fields
type TaskRow = Pick<Task, "id" | "title" | "status" | "agent_name" | "assigned_agent_id" | "task_type"> & {
  project_name?: string;
};

interface TasksOptions {
  project?: string;
  status?: string;
  agent?: string;
}

export async function tasksCommand(opts: TasksOptions): Promise<void> {
  const params = new URLSearchParams();
  if (opts.project) params.set("project_id", opts.project);
  if (opts.status) params.set("status", opts.status);
  if (opts.agent) params.set("agent_id", opts.agent);

  const qs = params.toString();
  const path = `/api/tasks${qs ? `?${qs}` : ""}`;
  const data = (await api.get(path)) as { rows: TaskRow[] };
  const tasks = data.rows ?? [];

  if (tasks.length === 0) {
    console.log(dim("No tasks found."));
    return;
  }

  console.log(header("Tasks"));

  const rows = tasks.map((t) => [
    t.id.slice(0, 8),
    badge(t.status),
    t.agent_name ?? dim("unassigned"),
    truncate(t.title, 50),
    t.task_type ?? "-",
  ]);

  console.log(table(["ID", "STATUS", "AGENT", "TITLE", "TYPE"], rows));
}
