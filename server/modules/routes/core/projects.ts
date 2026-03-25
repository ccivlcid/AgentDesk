import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { createProjectRouteHelpers } from "./projects/helpers.ts";
import type { ProjectRoutesDeps } from "./projects/types.ts";
import { registerPathRoutes } from "./projects/register-path-routes.ts";
import { registerFileRoutes } from "./projects/register-file-routes.ts";
import { registerCrudRoutes } from "./projects/register-crud-routes.ts";
import { registerProjectDetailRoute } from "./projects/register-project-detail-route.ts";
import { registerFeatureRoutes } from "./projects/register-feature-routes.ts";
import { registerProjectKickoffRoutes } from "./projects/kickoff.ts";

import { registerChangelogRoutes } from "./projects/register-changelog-routes.ts";
import { callLlmOneShotAuto } from "../../agent-runtime/llm-client.ts";
import logger from "../../../lib/logger.ts";
import { loadPrompt } from "../../../lib/prompt-loader.ts";

type FirstQueryValue = (value: unknown) => string | undefined;
type NormalizeTextField = (value: unknown) => string | null;
type RunInTransaction = (fn: () => void) => void;

export interface RegisterProjectRoutesOptions {
  app: Express;
  db: DatabaseSync;
  firstQueryValue: FirstQueryValue;
  normalizeTextField: NormalizeTextField;
  runInTransaction: RunInTransaction;
  nowMs: () => number;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  resolveProjectPath: (projectId: string) => string;
  /** Full AgentOffice execution engine — if provided, kickoff uses it instead of execution-loop */
  startTaskExecutionForAgent?: (taskId: string, agentId: string) => void;
  /** Insert & broadcast a notification */
  insertNotification?: (params: { type: string; title: string; body?: string | null; task_id?: string | null; agent_id?: string | null }) => string;
}

export function registerProjectRoutes({
  app,
  db,
  firstQueryValue,
  normalizeTextField,
  runInTransaction,
  nowMs,
  broadcast,
  appendTaskLog,
  resolveProjectPath,
  startTaskExecutionForAgent,
  insertNotification,
}: RegisterProjectRoutesOptions): void {
  const helpers = createProjectRouteHelpers({ db, normalizeTextField });
  const deps: ProjectRoutesDeps = {
    app,
    db,
    firstQueryValue,
    normalizeTextField,
    runInTransaction,
    nowMs,
    helpers,
  };

  registerPathRoutes(deps);
  registerFileRoutes(deps);
  registerCrudRoutes(deps);
  registerProjectDetailRoute(deps);
  registerFeatureRoutes(deps);
  registerProjectKickoffRoutes({ app, db, broadcast, appendTaskLog, resolveProjectPath, nowMs, startTaskExecutionForAgent, insertNotification });
  registerChangelogRoutes(deps);

  // ── AI auto-assign agents ─────────────────────────────────────────────────
  app.post("/api/projects/auto-assign-agents", async (req, res) => {
    const { project_name, core_goal, category_name, directive } = (req.body ?? {}) as {
      project_name?: string;
      core_goal?: string;
      category_name?: string;
      directive?: string;
    };

    const CLI_PROVIDERS = new Set(["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "ollama"]);
    const cliAgents = (db.prepare(
      "SELECT id, name, name_ko, role, cli_provider, department_id FROM agents WHERE status != 'offline'",
    ).all() as { id: string; name: string; name_ko: string; role: string; cli_provider: string; department_id: string | null }[])
      .filter((a) => CLI_PROVIDERS.has(a.cli_provider));

    if (cliAgents.length === 0) {
      return res.json({ ok: true, assignments: [] });
    }

    const agentList = cliAgents.map((a) => {
      const dept = a.department_id
        ? (db.prepare("SELECT name FROM departments WHERE id = ?").get(a.department_id) as { name: string } | undefined)?.name ?? ""
        : "";
      return `- id: "${a.id}", name: "${a.name}", role: "${a.role}", cli: "${a.cli_provider}"${dept ? `, dept: "${dept}"` : ""}`;
    }).join("\n");

    const parts: string[] = [];
    if (project_name) parts.push(`Project Name: ${project_name}`);
    if (core_goal) parts.push(`Goal: ${core_goal}`);
    if (category_name) parts.push(`Category: ${category_name}`);
    if (directive) parts.push(`Directive:\n${directive.slice(0, 500)}`);

    const systemPrompt = loadPrompt("system/project-auto-assign", { agentList });

    try {
      const rawText = await callLlmOneShotAuto({ db, systemPrompt, userPrompt: parts.join("\n\n"), timeoutMs: 30_000 });

      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn({ rawText: rawText.slice(0, 300) }, "[auto-assign] invalid LLM response");
        return res.status(500).json({ error: "invalid_llm_response" });
      }

      const parsed = JSON.parse(jsonMatch[0]) as { role: string; agent_id: string }[];
      const validIds = new Set(cliAgents.map((a) => a.id));
      const assignments = parsed
        .filter((a) => a.role && a.agent_id && validIds.has(a.agent_id))
        .map((a) => ({ role: a.role.trim(), agent_id: a.agent_id }));

      return res.json({ ok: true, assignments });
    } catch (err) {
      logger.error({ err }, "[auto-assign] failed");
      // fallback: simple role-based heuristic
      const sorted = [...cliAgents].sort((a, b) => {
        const order: Record<string, number> = { team_leader: 0, senior: 1, junior: 2, intern: 3 };
        return (order[a.role] ?? 4) - (order[b.role] ?? 4);
      });
      const assignments = [
        { role: "PM", agent_id: sorted[0]?.id },
        { role: "PL", agent_id: sorted[Math.min(1, sorted.length - 1)]?.id },
        { role: "Dev", agent_id: sorted[Math.min(2, sorted.length - 1)]?.id },
      ].filter((a) => a.agent_id);
      return res.json({ ok: true, assignments });
    }
  });
}
