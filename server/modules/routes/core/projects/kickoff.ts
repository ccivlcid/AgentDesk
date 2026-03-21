import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { resolveAnthropicKey } from "../../../agent-runtime/llm-client.ts";
import { startExecutionLoop } from "../../../agent-runtime/execution-loop.ts";

interface KickoffDeps {
  app: Express;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  resolveProjectPath: (projectId: string) => string;
  nowMs: () => number;
}

// In-memory map of kickoff-triggered runs → AbortControllers
const kickoffRuns = new Map<string, AbortController>();

export function registerProjectKickoffRoutes({ app, db, broadcast, appendTaskLog, resolveProjectPath, nowMs }: KickoffDeps): void {

  // POST /api/projects/:id/kickoff
  // 프로젝트 directive + core_goal + 에이전트 구성을 LLM에 전달해 태스크 목록 자동 생성.
  // 태스크 생성 직후 첫 번째 태스크를 에이전트가 자동 실행.
  // 정보 부족 시 clarification_request WS 이벤트로 유저에게 질문.
  app.post("/api/projects/:id/kickoff", async (req, res) => {
    const projectId = req.params.id;
    const { clarification_answer } = (req.body ?? {}) as { clarification_answer?: string };

    const project = db.prepare(
      "SELECT id, name, core_goal, directive FROM projects WHERE id = ?",
    ).get(projectId) as { id: string; name: string; core_goal: string; directive: string | null } | undefined;
    if (!project) return res.status(404).json({ error: "project_not_found" });

    // 프로젝트에 배정된 에이전트 목록 (부서·역할·프로젝트역할 포함, 멀티 에이전트 배분용)
    const assignedAgents = db.prepare(`
      SELECT a.id, a.name, a.role, a.department_id, d.name as dept_name, pa.project_role, pa.project_role_label
      FROM agents a
      JOIN project_agents pa ON a.id = pa.agent_id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE pa.project_id = ?
      LIMIT 20
    `).all(projectId) as { id: string; name: string; role: string | null; department_id: string | null; dept_name: string | null; project_role: string | null; project_role_label: string | null }[];

    // 프롬프트 구성
    const parts: string[] = [
      `Project Name: ${project.name}`,
      `Goal: ${project.core_goal}`,
    ];
    if (project.directive) parts.push(`Directive:\n${project.directive}`);
    if (assignedAgents.length > 0) {
      const STANDARD_ROLE_LABEL: Record<string, string> = { pm: "PROJECT MANAGER", pl: "PROJECT LEAD", dev: "DEVELOPER" };
      const agentList = assignedAgents
        .map((a) => {
          const dept = a.dept_name ? `, dept: ${a.dept_name}` : "";
          const role = a.role ? `, seniority: ${a.role}` : "";
          const displayRole = a.project_role_label
            ?? (a.project_role ? STANDARD_ROLE_LABEL[a.project_role] : null);
          const projectRole = displayRole ? ` [${displayRole.toUpperCase()}]` : "";
          return `- ${a.name}${projectRole}${dept}${role}`;
        })
        .join("\n");
      parts.push(`Available agents (assign tasks to the best fit):\n${agentList}`);
    }
    if (clarification_answer) parts.push(`User clarification: ${clarification_answer}`);

    const systemPrompt = `You are a project planning assistant. Given a project goal, optional directive, and available agents, produce a concrete task breakdown.

Respond ONLY with a valid JSON object — no markdown fences, no explanation text.

If you have sufficient information, respond:
{"tasks": [{"title": "string", "description": "string", "agent_name": "string or null"}, ...]}
- Generate 3 to 7 specific, actionable tasks.
- For agent_name: pick the most suitable agent from the available agents list based on the task nature, or null if unsure.

If critical information is missing (e.g., no goal at all), respond:
{"needs_clarification": true, "question": "single concise question to ask the user"}
Ask at most one question.`;

    try {
      const apiKey = resolveAnthropicKey(db);

      const body = JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: parts.join("\n\n") }],
      });

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        return res.status(502).json({ error: "llm_error", detail: errText.slice(0, 200) });
      }

      const data = await resp.json() as { content: { type: string; text?: string }[] };
      const rawText = data.content.find((c) => c.type === "text")?.text ?? "";

      // JSON 추출 (마크다운 펜스가 있어도 처리)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: "invalid_llm_response" });

      let parsed: {
        tasks?: { title: string; description?: string; agent_name?: string | null }[];
        needs_clarification?: boolean;
        question?: string;
      };
      try {
        parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
      } catch {
        return res.status(500).json({ error: "json_parse_failed" });
      }

      // 추가 정보 필요한 경우
      if (parsed.needs_clarification && parsed.question) {
        const clarificationId = randomUUID();
        db.prepare(
          "INSERT INTO project_clarifications (id, project_id, question, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
        ).run(clarificationId, projectId, parsed.question, nowMs());

        broadcast("clarification_request", { projectId, clarificationId, question: parsed.question });
        return res.json({ status: "clarification_needed", clarificationId, question: parsed.question });
      }

      // ── 태스크 생성 + 에이전트 분배 ───────────────────────────────────────
      const tasks = parsed.tasks ?? [];
      const created: { id: string; title: string; assigned_agent_id: string | null }[] = [];

      // agent_name → id 매핑
      const agentByName = new Map(assignedAgents.map((a) => [a.name.toLowerCase(), a.id]));
      const fallbackAgentId = assignedAgents[0]?.id ?? null;

      for (const task of tasks) {
        if (!task.title?.trim()) continue;
        const taskId = randomUUID();
        const now = nowMs();

        // LLM이 제안한 에이전트명으로 매핑, 없으면 첫 번째 에이전트
        const suggestedId = task.agent_name
          ? (agentByName.get(task.agent_name.toLowerCase()) ?? fallbackAgentId)
          : fallbackAgentId;

        db.prepare(`
          INSERT INTO tasks (id, title, description, project_id, assigned_agent_id, status, priority, task_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'todo', 3, 'general', ?, ?)
        `).run(taskId, task.title.trim(), task.description ?? "", projectId, suggestedId, now, now);

        const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as { id: string; title: string; assigned_agent_id: string | null };
        broadcast("task_update", row);
        created.push(row);
      }

      // ── 첫 번째 태스크 자동 실행 ────────────────────────────────────────
      const firstTask = created[0];
      let autoRunId: string | null = null;
      if (firstTask && firstTask.assigned_agent_id) {
        try {
          let projectPath = "";
          try { projectPath = resolveProjectPath(projectId); } catch { /* optional */ }

          const abortController = new AbortController();
          autoRunId = await startExecutionLoop(
            { db, broadcast, appendTaskLog, nowMs },
            {
              agentId: firstTask.assigned_agent_id,
              taskId: firstTask.id,
              projectId,
              projectPath,
            },
            firstTask.title,
            abortController,
          );
          kickoffRuns.set(autoRunId, abortController);
        } catch (runErr) {
          // 자동 실행 실패는 태스크 생성 결과에 영향 없음
          console.error("[kickoff] auto-run failed:", runErr);
        }
      }

      return res.json({ status: "ok", tasks: created, autoRunId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "kickoff_failed", detail: msg.slice(0, 200) });
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
