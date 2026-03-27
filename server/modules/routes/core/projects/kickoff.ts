import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { loadPrompt } from "../../../../lib/prompt-loader.ts";
import { startExecutionLoop } from "../../../agent-runtime/execution-loop.ts";
import { callLlmOneShotAuto } from "../../../agent-runtime/llm-client.ts";
import { type KickoffMeetingAgent, readLang, t, VALID_TASK_TYPES, STANDARD_ROLE_LABEL } from "./kickoff-shared.ts";
import { runKickoffMeeting } from "./kickoff-meeting.ts";
import { runAddTasksMeeting } from "./add-tasks-meeting.ts";

export { runInternalAddTasksPipeline } from "./kickoff-pipeline.ts";
export type { InternalAddTasksDeps } from "./kickoff-pipeline.ts";

interface KickoffDeps {
  app: Express;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  resolveProjectPath: (projectId: string) => string;
  nowMs: () => number;
  /** Full AgentOffice execution engine (injected from RuntimeContext) */
  startTaskExecutionForAgent?: (taskId: string, agentId: string) => void;
  /** Insert & broadcast a notification (optional — kickoff/task start events) */
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string;
}

// In-memory map of kickoff-triggered runs → AbortControllers (fallback용)
const kickoffRuns = new Map<string, AbortController>();

type AssignedAgent = {
  id: string; name: string; role: string | null;
  department_id: string | null; dept_name: string | null;
  project_role: string | null; project_role_label: string | null;
};

/** Fitness-based agent assignment with round-robin fallback. */
function assignTasksByFitness(
  projectId: string,
  execAgents: AssignedAgent[],
  db: DatabaseSync,
  nowMs: () => number,
  broadcast: (type: string, payload: unknown) => void,
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void,
  logPrefix: string,
): void {
  const unassignedTasks = db.prepare(`
    SELECT id, title, task_type FROM tasks
    WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NULL
    ORDER BY created_at ASC
  `).all(projectId) as { id: string; title: string; task_type: string | null }[];

  const fitnessMap = new Map<string, { successRate: number }>();
  try {
    const rows = db.prepare(`
      SELECT agent_id, task_type, success_count, failure_count
      FROM agent_task_fitness
      WHERE agent_id IN (${execAgents.map(() => "?").join(",")})
    `).all(...execAgents.map((a) => a.id)) as {
      agent_id: string; task_type: string; success_count: number; failure_count: number;
    }[];
    for (const r of rows) {
      const total = r.success_count + r.failure_count;
      if (total === 0) continue;
      fitnessMap.set(`${r.agent_id}:${r.task_type}`, { successRate: r.success_count / total });
    }
  } catch { /* table may not exist yet — fall through to round-robin */ }

  const agentLoad = new Map<string, number>();
  for (const a of execAgents) agentLoad.set(a.id, 0);

  for (let i = 0; i < unassignedTasks.length; i++) {
    const task = unassignedTasks[i];
    const taskType = task.task_type ?? "general";

    let bestAgent = execAgents[i % execAgents.length];
    let bestScore = -1;
    let usedFitness = false;

    for (const agent of execAgents) {
      const fit = fitnessMap.get(`${agent.id}:${taskType}`);
      if (!fit) continue;
      const load = agentLoad.get(agent.id) ?? 0;
      const score = fit.successRate - load * 0.1;
      if (score > bestScore) { bestScore = score; bestAgent = agent; usedFitness = true; }
    }

    agentLoad.set(bestAgent.id, (agentLoad.get(bestAgent.id) ?? 0) + 1);
    db.prepare("UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?")
      .run(bestAgent.id, nowMs(), task.id);
    const method = usedFitness ? `fitness(${Math.round(bestScore * 100)}%)` : "round-robin";
    appendTaskLog(task.id, "pm_oversight", `PM assigned → ${bestAgent.name} [${method}]`);
    broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id));
    logger.info({ taskId: task.id, agentId: bestAgent.id, method, taskType }, `[${logPrefix}] PM assigned agent`);
  }
}

/** Start first planned task per agent. */
function startPlannedTasks(
  projectId: string,
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void,
  nowMs: () => number,
  resolveProjectPath: (projectId: string) => string,
  startTaskExecutionForAgent: ((taskId: string, agentId: string) => void) | undefined,
  logPrefix: string,
): void {
  const plannedTasks = db.prepare(`
    SELECT id, title, assigned_agent_id FROM tasks
    WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
    ORDER BY created_at ASC
  `).all(projectId) as { id: string; title: string; assigned_agent_id: string }[];

  const seen = new Set<string>();
  for (const task of plannedTasks) {
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
          { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
          { agentId: task.assigned_agent_id, taskId: task.id, projectId, projectPath: pp },
          task.title,
          ac,
        ).then((runId) => { kickoffRuns.set(runId, ac); }).catch((e) => {
          logger.error({ err: e, taskId: task.id }, `[${logPrefix}] execution-loop failed`);
        });
      }
      logger.info({ taskId: task.id, agentId: task.assigned_agent_id }, `[${logPrefix}] task started`);
    } catch (err) {
      logger.error({ err, taskId: task.id }, `[${logPrefix}] task start failed`);
    }
  }
}

export function registerProjectKickoffRoutes({
  app, db, broadcast, appendTaskLog, resolveProjectPath, nowMs, startTaskExecutionForAgent, insertNotification,
}: KickoffDeps): void {

  // POST /api/projects/:id/kickoff
  app.post("/api/projects/:id/kickoff", async (req, res) => {
    const projectId = req.params.id;
    const { clarification_answer, additional_directive, clarification_id } = (req.body ?? {}) as {
      clarification_answer?: string; additional_directive?: string; clarification_id?: string;
    };

    if (clarification_id && clarification_answer?.trim()) {
      db.prepare(
        "UPDATE project_clarifications SET answer = ?, status = 'answered', answered_at = ? WHERE id = ? AND project_id = ?",
      ).run(clarification_answer.trim(), nowMs(), clarification_id, projectId);
    }

    const project = db.prepare(
      "SELECT id, name, core_goal, directive, project_type FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null; project_type: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (project.project_type === "app") return res.status(400).json({ error: "app_cannot_kickoff" });

    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });

    const assignedAgents = db.prepare(`
      SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
      FROM agents a
      JOIN project_agents pa ON a.id = pa.agent_id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE pa.project_id = ?
      LIMIT 20
    `).all(projectId) as AssignedAgent[];

    // Build LLM prompt (task creation, runs after meeting)
    const parts: string[] = [
      `Project Name: ${project.name}`,
      `Goal: ${project.core_goal}`,
    ];
    if (project.directive) parts.push(`Directive:\n${project.directive}`);
    if (assignedAgents.length > 0) {
      const fitnessRows = db.prepare(`
        SELECT agent_id, task_type, success_count, failure_count, avg_duration_ms
        FROM agent_task_fitness
        WHERE agent_id IN (${assignedAgents.map(() => "?").join(",")})
        ORDER BY agent_id, success_count DESC
      `).all(...assignedAgents.map((a) => a.id)) as { agent_id: string; task_type: string; success_count: number; failure_count: number; avg_duration_ms: number }[];

      const fitnessByAgent = new Map<string, string[]>();
      for (const r of fitnessRows) {
        const total = r.success_count + r.failure_count;
        if (total === 0) continue;
        const rate = Math.round((r.success_count / total) * 100);
        const avgMin = Math.round(r.avg_duration_ms / 60_000);
        const list = fitnessByAgent.get(r.agent_id) ?? [];
        list.push(`${r.task_type}: ${rate}% success (${total} tasks, avg ${avgMin}m)`);
        fitnessByAgent.set(r.agent_id, list);
      }

      const agentList = assignedAgents.map((a) => {
        const dept = a.dept_name ? `, dept: ${a.dept_name}` : "";
        const role = a.role ? `, seniority: ${a.role}` : "";
        const displayRole = a.project_role_label
          ?? (a.project_role ? STANDARD_ROLE_LABEL[a.project_role] : null);
        const projectRole = displayRole ? ` [${displayRole.toUpperCase()}]` : "";
        const fitness = fitnessByAgent.get(a.id);
        const fitnessInfo = fitness ? ` | track record: ${fitness.join("; ")}` : "";
        return `- ${a.name}${projectRole}${dept}${role}${fitnessInfo}`;
      }).join("\n");
      parts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    const additionalDir = (additional_directive ?? "").trim();
    if (additionalDir) parts.push(`This Round's Task:\n${additionalDir}`);
    if (clarification_answer) parts.push(`User clarification: ${clarification_answer}`);

    const systemPrompt = loadPrompt("system/project-kickoff");

    try {
      broadcast("kickoff_stage", { projectId, stage: "meeting" });

      const meetingAgents: KickoffMeetingAgent[] = assignedAgents.map((ag) => ({
        id: ag.id, name: ag.name, role: ag.role, dept_name: ag.dept_name,
        projectRole: ag.project_role, projectRoleLabel: ag.project_role_label, taskTitles: [],
      }));

      const postMeetingCreateAndRun = async () => {
        try {
          broadcast("kickoff_stage", { projectId, stage: "planning" });

          const rawText = await callLlmOneShotAuto({ db, systemPrompt, userPrompt: parts.join("\n\n"), maxTokens: 4096, timeoutMs: 120_000 });

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            logger.error({ projectId, rawPreview: rawText.slice(0, 300) }, "[kickoff] invalid LLM response after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          let parsed: { tasks?: { title: string; description?: string; task_type?: string }[]; needs_clarification?: boolean; question?: string };
          try { parsed = JSON.parse(jsonMatch[0]) as typeof parsed; } catch {
            logger.error({ projectId }, "[kickoff] JSON parse failed after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          if (parsed.needs_clarification && parsed.question) {
            const clarificationId = randomUUID();
            db.prepare(
              "INSERT INTO project_clarifications (id, project_id, question, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
            ).run(clarificationId, projectId, parsed.question, nowMs());
            broadcast("clarification_request", { projectId, clarificationId, question: parsed.question });
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          for (const task of parsed.tasks ?? []) {
            if (!task.title?.trim()) continue;
            const taskId = randomUUID();
            const now = nowMs();
            const taskType = task.task_type && VALID_TASK_TYPES.has(task.task_type) ? task.task_type : "general";
            db.prepare(`
              INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
              VALUES (?, ?, ?, ?, NULL, 'planned', 3, ?, ?, ?)
            `).run(taskId, task.title.trim(), task.description ?? "", projectId, taskType, now, now);
            broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
            appendTaskLog(taskId, "system", `Task created: ${task.title.trim()}`);
          }

          broadcast("kickoff_stage", { projectId, stage: "assigning" });
          const execAgents = assignedAgents.filter((a) => a.project_role !== "pm");
          if (execAgents.length === 0) {
            logger.warn({ projectId }, "[kickoff] no non-PM agents available");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          assignTasksByFitness(projectId, execAgents, db, nowMs, broadcast, appendTaskLog, "kickoff");

          const plannedCount = (db.prepare(
            "SELECT COUNT(*) as c FROM tasks WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL",
          ).get(projectId) as { c: number }).c;
          if (plannedCount === 0) {
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          broadcast("kickoff_stage", { projectId, stage: "executing" });
          startPlannedTasks(projectId, db, broadcast, appendTaskLog, nowMs, resolveProjectPath, startTaskExecutionForAgent, "kickoff");
          broadcast("kickoff_stage", { projectId, stage: "done" });
        } catch (err) {
          logger.error({ err, projectId }, "[kickoff] post-meeting pipeline failed");
          broadcast("kickoff_stage", { projectId, stage: "done" });
        }
      };

      if (assignedAgents.length > 0) {
        void runKickoffMeeting(
          project.name, project.core_goal, null, projectId, meetingAgents,
          db, broadcast, nowMs, () => { void postMeetingCreateAndRun(); }, insertNotification,
        ).catch((err) => {
          logger.warn({ err, projectId }, "[kickoff] meeting failed — running pipeline directly");
          void postMeetingCreateAndRun();
        });
      } else {
        void postMeetingCreateAndRun();
      }

      // Register PM orchestrator
      const pmAgent = assignedAgents.find((a) => a.project_role === "pm");
      try {
        db.prepare(
          "INSERT OR REPLACE INTO pm_oversight_state (project_id, pm_agent_id, started_at) VALUES (?, ?, ?)",
        ).run(projectId, pmAgent?.id ?? null, Date.now());
      } catch { /* table may not exist yet */ }

      const kickoffLang = readLang(db);
      insertNotification?.({
        type: "kickoff",
        title: t(kickoffLang, {
          ko: `${project.name} 킥오프 시작`,
          en: `${project.name} kickoff started`,
          ja: `${project.name} キックオフ開始`,
          zh: `${project.name} 启动开始`,
        }),
        body: t(kickoffLang, {
          ko: `${assignedAgents.length}명 에이전트 참여, 회의 후 태스크 생성 예정`,
          en: `${assignedAgents.length} agents joined, tasks will be created after meeting`,
          ja: `${assignedAgents.length}名のエージェント参加、会議後にタスク作成予定`,
          zh: `${assignedAgents.length}名代理参与，会议后将创建任务`,
        }),
      });

      return res.json({ status: "ok", tasks: [], autoRunIds: [] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "kickoff_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/add-tasks
  app.post("/api/projects/:id/add-tasks", async (req, res) => {
    const projectId = req.params.id;
    const { additional_directive, attached_file } = (req.body ?? {}) as {
      additional_directive?: string;
      attached_file?: { name: string; content: string };
    };

    if (!additional_directive?.trim() && !attached_file) {
      return res.status(400).json({ error: "missing_directive" });
    }

    const project = db.prepare(
      "SELECT id, name, core_goal, directive, project_path, project_type FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null; project_path: string | null; project_type: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });
    if (project.project_type === "app") return res.status(400).json({ error: "app_cannot_add_tasks" });

    if (attached_file?.name && attached_file?.content && project.project_path) {
      try {
        const fs = await import("node:fs");
        const path = await import("node:path");
        const docsDir = path.join(project.project_path, "docs");
        fs.mkdirSync(docsDir, { recursive: true });
        fs.writeFileSync(path.join(docsDir, attached_file.name), attached_file.content, "utf-8");
        logger.info({ projectId }, "[add-tasks] saved attached file to project docs");
      } catch (err) {
        logger.warn({ err, projectId }, "[add-tasks] failed to save attached file");
      }
    }

    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });

    const assignedAgents = db.prepare(`
      SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
      FROM agents a
      JOIN project_agents pa ON a.id = pa.agent_id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE pa.project_id = ?
      LIMIT 20
    `).all(projectId) as AssignedAgent[];

    const doneTasks = db.prepare(`
      SELECT title FROM tasks WHERE project_id = ? AND status = 'done' ORDER BY created_at ASC
    `).all(projectId) as { title: string }[];

    const promptParts: string[] = [
      `Project Name: ${project.name}`,
      `Goal: ${project.core_goal}`,
    ];
    if (project.directive) promptParts.push(`Directive:\n${project.directive}`);
    if (doneTasks.length > 0) {
      promptParts.push(`Already completed tasks (do NOT recreate these):\n${doneTasks.map((t_) => `- ${t_.title}`).join("\n")}`);
    }
    if (assignedAgents.length > 0) {
      const agentList = assignedAgents.map((a) => {
        const dept = a.dept_name ? `, dept: ${a.dept_name}` : "";
        const role = a.role ? `, seniority: ${a.role}` : "";
        const displayRole = a.project_role_label
          ?? (a.project_role ? STANDARD_ROLE_LABEL[a.project_role] : null);
        const projectRole = displayRole ? ` [${displayRole.toUpperCase()}]` : "";
        return `- ${a.name}${projectRole}${dept}${role}`;
      }).join("\n");
      promptParts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    promptParts.push(`Additional tasks requested:\n${(additional_directive ?? "").trim()}`);

    const systemPrompt = loadPrompt("system/project-kickoff");

    try {
      broadcast("kickoff_stage", { projectId, stage: "meeting" });

      const meetingAgents: KickoffMeetingAgent[] = assignedAgents.map((ag) => ({
        id: ag.id, name: ag.name, role: ag.role, dept_name: ag.dept_name,
        projectRole: ag.project_role, projectRoleLabel: ag.project_role_label, taskTitles: [],
      }));

      const postMeetingPipeline = async () => {
        try {
          broadcast("kickoff_stage", { projectId, stage: "planning" });

          const rawText = await callLlmOneShotAuto({ db, systemPrompt, userPrompt: promptParts.join("\n\n"), maxTokens: 4096, timeoutMs: 120_000 });

          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            logger.error({ projectId, rawPreview: rawText.slice(0, 300) }, "[add-tasks] invalid LLM response after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          let parsed: { tasks?: { title: string; description?: string; task_type?: string }[] };
          try { parsed = JSON.parse(jsonMatch[0]) as typeof parsed; } catch {
            logger.error({ projectId }, "[add-tasks] JSON parse failed after meeting");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
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
            appendTaskLog(taskId, "system", `Task created (add-tasks): ${task.title.trim()}`);
          }

          broadcast("kickoff_stage", { projectId, stage: "assigning" });
          const execAgents = assignedAgents.filter((a) => a.project_role !== "pm");
          if (execAgents.length === 0) {
            logger.warn({ projectId }, "[add-tasks] no non-PM agents available");
            broadcast("kickoff_stage", { projectId, stage: "done" });
            return;
          }

          assignTasksByFitness(projectId, execAgents, db, nowMs, broadcast, appendTaskLog, "add-tasks");

          broadcast("kickoff_stage", { projectId, stage: "executing" });
          startPlannedTasks(projectId, db, broadcast, appendTaskLog, nowMs, resolveProjectPath, startTaskExecutionForAgent, "add-tasks");
          broadcast("kickoff_stage", { projectId, stage: "done" });

          const addLang = readLang(db);
          insertNotification?.({
            type: "kickoff",
            title: t(addLang, {
              ko: `${project.name} 추가 업무 생성`,
              en: `${project.name} additional tasks created`,
              ja: `${project.name} 追加タスク作成`,
              zh: `${project.name} 追加任务已创建`,
            }),
            body: t(addLang, {
              ko: `${newTasks.length}개 태스크 추가 생성 완료`,
              en: `${newTasks.length} new tasks created and assigned`,
              ja: `${newTasks.length}件の追加タスクを作成完了`,
              zh: `已创建 ${newTasks.length} 个新任务`,
            }),
          });
        } catch (err) {
          logger.error({ err, projectId }, "[add-tasks] post-meeting pipeline failed");
          broadcast("kickoff_stage", { projectId, stage: "done" });
        }
      };

      if (assignedAgents.length > 0) {
        void runAddTasksMeeting(
          project.name, (additional_directive ?? "").trim(), projectId, meetingAgents,
          db, broadcast, nowMs, () => { void postMeetingPipeline(); },
        ).catch((err) => {
          logger.warn({ err, projectId }, "[add-tasks] meeting failed — running pipeline directly");
          void postMeetingPipeline();
        });
      } else {
        void postMeetingPipeline();
      }

      return res.json({ status: "ok", taskCount: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      broadcast("kickoff_stage", { projectId, stage: "done" });
      return res.status(500).json({ error: "add_tasks_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/resume
  app.post("/api/projects/:id/resume", async (req, res) => {
    const projectId = req.params.id;

    const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId) as { id: string } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    const runningTask = db.prepare(
      "SELECT id FROM tasks WHERE project_id = ? AND status = 'in_progress' LIMIT 1",
    ).get(projectId) as { id: string } | undefined;
    if (runningTask) return res.status(409).json({ error: "task_already_running", taskId: runningTask.id });

    const nextTask = db.prepare(`
      SELECT id, title, assigned_agent_id FROM tasks
      WHERE project_id = ? AND status = 'planned' AND assigned_agent_id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `).get(projectId) as { id: string; title: string; assigned_agent_id: string } | undefined;

    if (!nextTask) {
      return res.json({ status: "nothing_to_resume", message: "No planned tasks with assigned agents" });
    }

    try {
      let projectPath = "";
      try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

      const abortController = new AbortController();
      const runId = await startExecutionLoop(
        { db, broadcast, appendTaskLog, nowMs, resolveProjectPath, abortControllers: kickoffRuns },
        { agentId: nextTask.assigned_agent_id, taskId: nextTask.id, projectId, projectPath },
        nextTask.title,
        abortController,
      );
      kickoffRuns.set(runId, abortController);

      logger.info({ runId, taskId: nextTask.id, projectId }, "[resume] chain execution resumed");
      return res.json({ status: "ok", runId, taskId: nextTask.id, title: nextTask.title });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, projectId }, "[resume] failed");
      return res.status(500).json({ error: "resume_failed", detail: msg.slice(0, 200) });
    }
  });

  // POST /api/projects/:id/clarification-reply
  app.post("/api/projects/:id/clarification-reply", (req, res) => {
    const projectId = req.params.id;
    const { clarification_id, answer } = (req.body ?? {}) as { clarification_id?: string; answer?: string };

    if (!clarification_id || !answer?.trim()) {
      return res.status(400).json({ error: "missing_fields" });
    }

    db.prepare(
      "UPDATE project_clarifications SET answer = ?, status = 'answered', answered_at = ? WHERE id = ? AND project_id = ?",
    ).run(answer.trim(), nowMs(), clarification_id, projectId);

    return res.json({ status: "ok" });
  });
}
