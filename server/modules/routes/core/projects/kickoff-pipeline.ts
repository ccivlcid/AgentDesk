import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { startExecutionLoop } from "../../../agent-runtime/execution-loop.ts";
import { callLlmOneShotAuto } from "../../../agent-runtime/llm-client.ts";
import { VALID_TASK_TYPES } from "./kickoff-shared.ts";

export interface InternalAddTasksDeps {
  projectId: string;
  additionalDirective: string;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  nowMs: () => number;
  resolveProjectPath: (projectId: string) => string;
  startTaskExecutionForAgent?: (taskId: string, agentId: string) => void;
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string | void;
}

type AssignedAgent = {
  id: string; name: string; role: string;
  dept_name: string | null; department_id: string | null;
  project_role: string; project_role_label: string | null;
};

/** In-memory AbortControllers for pipeline-spawned runs (shared via module singleton). */
export const pipelineRuns = new Map<string, AbortController>();

/**
 * Create tasks via LLM, assign agents (fitness-based), and start execution.
 * Reusable by both the add-tasks API route and PM orchestrator's project-level review.
 * Does NOT run a meeting — caller provides the directive directly.
 */
export async function runInternalAddTasksPipeline(deps: InternalAddTasksDeps): Promise<{ taskCount: number }> {
  const {
    projectId, additionalDirective, db, broadcast, appendTaskLog,
    nowMs, resolveProjectPath, startTaskExecutionForAgent,
  } = deps;

  const project = db.prepare("SELECT name, core_goal, directive FROM projects WHERE id = ?").get(projectId) as
    | { name: string; core_goal: string; directive: string | null } | undefined;
  if (!project) return { taskCount: 0 };

  const assignedAgents = db.prepare(`
    SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
    FROM agents a JOIN project_agents pa ON a.id = pa.agent_id
    LEFT JOIN departments d ON a.department_id = d.id
    WHERE pa.project_id = ?
  `).all(projectId) as AssignedAgent[];

  const doneTasks = db.prepare("SELECT title FROM tasks WHERE project_id = ? AND status = 'done'").all(projectId) as { title: string }[];

  const promptParts: string[] = [
    `Project Name: ${project.name}`,
    `Goal: ${project.core_goal}`,
  ];
  if (project.directive) promptParts.push(`Directive:\n${project.directive}`);
  if (doneTasks.length > 0) {
    promptParts.push(`Already completed tasks (do NOT recreate these):\n${doneTasks.map((t_) => `- ${t_.title}`).join("\n")}`);
  }
  promptParts.push(`Additional tasks requested:\n${additionalDirective}`);

  const systemPrompt = loadPrompt("system/project-kickoff");

  broadcast("kickoff_stage", { projectId, stage: "planning" });

  const rawText = await callLlmOneShotAuto({ db, systemPrompt, userPrompt: promptParts.join("\n\n"), maxTokens: 4096, timeoutMs: 120_000 });

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    logger.error({ projectId }, "[internal-add-tasks] invalid LLM response");
    broadcast("kickoff_stage", { projectId, stage: "done" });
    return { taskCount: 0 };
  }

  let parsed: { tasks?: { title: string; description?: string; task_type?: string }[] };
  try { parsed = JSON.parse(jsonMatch[0]) as typeof parsed; } catch {
    logger.error({ projectId }, "[internal-add-tasks] JSON parse failed");
    broadcast("kickoff_stage", { projectId, stage: "done" });
    return { taskCount: 0 };
  }

  const newTasks = parsed.tasks ?? [];
  for (const task of newTasks) {
    if (!task.title?.trim()) continue;
    const taskId = randomUUID();
    const now = nowMs();
    const taskType = task.task_type && VALID_TASK_TYPES.has(task.task_type) ? task.task_type : "general";
    db.prepare(`
      INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, 'planned', 3, ?, ?, ?)
    `).run(taskId, task.title.trim(), task.description ?? "", projectId, taskType, now, now);
    broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
    appendTaskLog(taskId, "system", `Task created (project-review follow-up): ${task.title.trim()}`);
  }

  broadcast("kickoff_stage", { projectId, stage: "assigning" });
  const execAgents = assignedAgents.filter((a) => a.project_role !== "pm");
  if (execAgents.length === 0) {
    broadcast("kickoff_stage", { projectId, stage: "done" });
    return { taskCount: newTasks.length };
  }

  const unassigned = db.prepare(`
    SELECT id, title, task_type FROM tasks
    WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NULL ORDER BY created_at ASC
  `).all(projectId) as { id: string; title: string; task_type: string | null }[];

  const fitMap = new Map<string, { successRate: number }>();
  try {
    const rows = db.prepare(`
      SELECT agent_id, task_type, success_count, failure_count FROM agent_task_fitness
      WHERE agent_id IN (${execAgents.map(() => "?").join(",")})
    `).all(...execAgents.map((a) => a.id)) as { agent_id: string; task_type: string; success_count: number; failure_count: number }[];
    for (const r of rows) {
      const total = r.success_count + r.failure_count;
      if (total > 0) fitMap.set(`${r.agent_id}:${r.task_type}`, { successRate: r.success_count / total });
    }
  } catch { /* fallback round-robin */ }

  const load = new Map<string, number>();
  for (const a of execAgents) load.set(a.id, 0);

  for (let i = 0; i < unassigned.length; i++) {
    const task = unassigned[i];
    const tt = task.task_type ?? "general";
    let best = execAgents[i % execAgents.length];
    let bestScore = -1;
    for (const agent of execAgents) {
      const fit = fitMap.get(`${agent.id}:${tt}`);
      if (!fit) continue;
      const score = fit.successRate - (load.get(agent.id) ?? 0) * 0.1;
      if (score > bestScore) { bestScore = score; best = agent; }
    }
    load.set(best.id, (load.get(best.id) ?? 0) + 1);
    db.prepare("UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?").run(best.id, nowMs(), task.id);
    appendTaskLog(task.id, "pm_oversight", `PM assigned → ${best.name}`);
    broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id));
  }

  broadcast("kickoff_stage", { projectId, stage: "executing" });
  const planned = db.prepare(`
    SELECT id, title, assigned_agent_id FROM tasks
    WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL ORDER BY created_at ASC
  `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

  const seen = new Set<string>();
  for (const task of planned) {
    if (seen.has(task.assigned_agent_id)) continue;
    seen.add(task.assigned_agent_id);
    try {
      if (startTaskExecutionForAgent) {
        startTaskExecutionForAgent(task.id, task.assigned_agent_id);
      } else {
        let pp = "";
        try { pp = resolveProjectPath(projectId); } catch { /* optional */ }
        const ac = new AbortController();
        void startExecutionLoop(
          { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: pipelineRuns },
          { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp },
          task.title,
          ac,
        ).then((runId) => { pipelineRuns.set(runId, ac); }).catch((e) => {
          logger.error({ err: e, taskId: task.id }, "[internal-add-tasks] execution-loop failed");
        });
      }
    } catch (err) {
      logger.error({ err, taskId: task.id }, "[internal-add-tasks] task start failed");
    }
  }

  broadcast("kickoff_stage", { projectId, stage: "done" });
  logger.info({ projectId, taskCount: newTasks.length }, "[internal-add-tasks] pipeline complete");
  return { taskCount: newTasks.length };
}
