/**
 * agentdesk status — overview of projects and running tasks
 */
import chalk from "chalk";
import { api } from "../lib/api.js";
import { header, table, badge, dim } from "../lib/ui.js";
import type { Agent, Task } from "../../shared/types.js";

interface Project {
  id: string;
  name: string;
  status: string;
  core_goal?: string;
  task_count?: number;
  done_count?: number;
}

type TaskRow = Pick<Task, "id" | "status" | "title" | "agent_name" | "project_id">;
type AgentRow = Pick<Agent, "id" | "name" | "status">;

export async function statusCommand(): Promise<void> {
  // Fetch projects, active tasks, agents in parallel
  const [projectsData, tasksData, agentsData] = await Promise.all([
    api.get<{ projects: Project[] }>("/api/projects"),
    api.get<{ tasks: TaskRow[] }>("/api/tasks?status=in_progress"),
    api.get<{ agents: AgentRow[] }>("/api/agents"),
  ]);

  const projects = projectsData.projects ?? [];
  const activeTasks = tasksData.tasks ?? [];
  const agents = agentsData.agents ?? [];

  // Server info
  console.log(header("AgentDesk Status"));
  console.log(
    `  ${chalk.bold("Server")}    running`,
  );
  console.log(
    `  ${chalk.bold("Projects")}  ${projects.length}`,
  );
  console.log(
    `  ${chalk.bold("Agents")}    ${agents.length}`,
  );
  console.log(
    `  ${chalk.bold("Active")}    ${activeTasks.length} task(s) running`,
  );

  // Active projects
  if (projects.length > 0) {
    console.log(header("Projects"));
    const rows = projects.map((p) => [
      p.id.slice(0, 8),
      badge(p.status),
      p.name,
      p.core_goal ? dim(p.core_goal.slice(0, 40)) : "",
    ]);
    console.log(table(["ID", "STATUS", "NAME", "GOAL"], rows));
  }

  // Running tasks
  if (activeTasks.length > 0) {
    console.log(header("Running Tasks"));
    const rows = activeTasks.map((t) => [
      t.id.slice(0, 8),
      t.agent_name ?? dim("unassigned"),
      t.title.slice(0, 50),
    ]);
    console.log(table(["TASK", "AGENT", "TITLE"], rows));
  }
}
