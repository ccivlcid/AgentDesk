import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import { callLlmOneShotAuto } from "../../../agent-runtime/llm-client.ts";
import logger from "../../../../lib/logger.ts";

type TuiSession = {
  id: string;
  project_id: string | null;
  mode: string;
};

type ProjectRow = {
  id: string;
  name: string;
};

type AgentRow = {
  id: string;
  name: string;
};

type IntentResult = {
  intent: string;
  params: Record<string, unknown>;
  response?: string | null;
  confirmation?: string | null;
};

const INTENT_PROMPT_PATH = join(process.cwd(), "prompts", "system", "tui-intent.md");

let cachedPromptTemplate: string | null = null;

async function loadPromptTemplate(): Promise<string> {
  if (cachedPromptTemplate) return cachedPromptTemplate;
  cachedPromptTemplate = await readFile(INTENT_PROMPT_PATH, "utf-8");
  return cachedPromptTemplate;
}

function buildSystemPrompt(
  template: string,
  vars: {
    projectName: string;
    projectId: string;
    mode: string;
    agentList: string;
    activeTaskCount: number;
    recentMessages?: Array<{ role: string; content: string }>;
    cwd?: string;
  },
): string {
  let prompt = template
    .replace("{{projectName}}", vars.projectName)
    .replace("{{projectId}}", vars.projectId)
    .replace("{{mode}}", vars.mode)
    .replace("{{agentList}}", vars.agentList)
    .replace("{{activeTaskCount}}", String(vars.activeTaskCount));

  // Inject recent conversation context
  if (vars.recentMessages && vars.recentMessages.length > 0) {
    const history = vars.recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    prompt += `\n\n## Recent Conversation\n${history}`;
  }

  // Inject working directory
  if (vars.cwd) {
    prompt += `\n\n## Working Directory\n${vars.cwd}`;
  }

  return prompt;
}

export function registerTuiInterpretRoute(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  // POST /api/tui/interpret
  app.post("/api/tui/interpret", async (req, res) => {
    const body = req.body as {
      text?: string;
      session_id?: string;
      project_id?: string;
      recent_messages?: Array<{ role: string; content: string }>;
      cwd?: string;
    };

    if (!body.text || !body.session_id) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    const { text, session_id, project_id: bodyProjectId, recent_messages, cwd } = body;

    // Resolve session context
    const session = db
      .prepare("SELECT id, project_id, mode FROM tui_sessions WHERE id = ?")
      .get(session_id) as TuiSession | undefined;

    if (!session) {
      return res.status(404).json({ error: "session_not_found" });
    }

    const effectiveProjectId = bodyProjectId ?? session.project_id ?? null;

    // Resolve project name
    let projectName = "No project";
    let projectId = effectiveProjectId ?? "none";

    if (effectiveProjectId) {
      const project = db
        .prepare("SELECT id, name FROM projects WHERE id = ?")
        .get(effectiveProjectId) as ProjectRow | undefined;
      if (project) {
        projectName = project.name;
        projectId = project.id;
      }
    }

    // Resolve agent list
    let agentList = "none";
    const agents = db
      .prepare("SELECT id, name FROM agents ORDER BY created_at ASC LIMIT 20")
      .all() as AgentRow[];
    if (agents.length > 0) {
      agentList = agents.map((a) => a.name).join(", ");
    }

    // Count active tasks for the project
    let activeTaskCount = 0;
    if (effectiveProjectId) {
      const countRow = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM tasks WHERE project_id = ? AND status NOT IN ('done', 'cancelled')",
        )
        .get(effectiveProjectId) as { cnt: number } | undefined;
      activeTaskCount = countRow?.cnt ?? 0;
    }

    // Load and fill prompt template
    let systemPrompt: string;
    try {
      const template = await loadPromptTemplate();
      systemPrompt = buildSystemPrompt(template, {
        projectName,
        projectId,
        mode: session.mode,
        agentList,
        activeTaskCount,
        recentMessages: recent_messages,
        cwd,
      });
    } catch (err) {
      logger.error({ err }, "[tui/interpret] failed to load prompt template");
      return res.json({
        ok: true,
        intent: "unknown",
        params: {},
        response: "Intent classification unavailable: prompt template missing",
      });
    }

    // Call LLM
    let raw: string;
    try {
      raw = await callLlmOneShotAuto({
        db,
        systemPrompt,
        userPrompt: text,
        maxTokens: 512,
        timeoutMs: 30_000,
      });
    } catch (err) {
      logger.warn({ err }, "[tui/interpret] LLM call failed, returning unknown intent");
      return res.json({
        ok: true,
        intent: "unknown",
        params: {},
        response: "Intent classification failed",
      });
    }

    // Parse JSON response
    let result: IntentResult;
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      result = JSON.parse(cleaned) as IntentResult;
    } catch {
      logger.warn({ raw }, "[tui/interpret] failed to parse LLM JSON response");
      return res.json({
        ok: true,
        intent: "unknown",
        params: {},
        response: raw.slice(0, 500),
      });
    }

    res.json({
      ok: true,
      intent: result.intent,
      params: result.params ?? {},
      response: result.response ?? null,
      confirmation: result.confirmation ?? null,
    });
  });
}
