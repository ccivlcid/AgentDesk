import type { Express } from "express";
import type { DatabaseSync } from "node:sqlite";
import { createProjectRouteHelpers } from "./projects/helpers.ts";
import type { ProjectRoutesDeps } from "./projects/types.ts";
import { readLang } from "./projects/kickoff-shared.ts";
import { registerPathRoutes } from "./projects/register-path-routes.ts";
import { registerFileRoutes } from "./projects/register-file-routes.ts";
import { registerCrudRoutes } from "./projects/register-crud-routes.ts";
import { registerProjectDetailRoute } from "./projects/register-project-detail-route.ts";
import { registerFeatureRoutes } from "./projects/register-feature-routes.ts";
import { registerProjectKickoffRoutes } from "./projects/kickoff.ts";

import { registerChangelogRoutes } from "./projects/register-changelog-routes.ts";
import { registerTeamBoardRoutes } from "./projects/register-team-board-routes.ts";
import logger from "../../../lib/logger.ts";

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
  registerTeamBoardRoutes(deps);

  // ── Auto-assign agents (rule-based, no LLM) ──────────────────────────────
  app.post("/api/projects/auto-assign-agents", (req, res) => {
    void req; // params (project_name, core_goal, etc.) reserved for future use
    const CLI_PROVIDERS = new Set(["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "cursor", "ollama"]);
    const agents = (db.prepare(
      "SELECT id, name, role, cli_provider, department_id FROM agents WHERE status != 'offline'",
    ).all() as { id: string; name: string; role: string; cli_provider: string; department_id: string | null }[])
      .filter((a) => CLI_PROVIDERS.has(a.cli_provider));

    if (agents.length === 0) {
      return res.json({ ok: true, assignments: [] });
    }

    // Localized role labels for the default 4-person team (PM, Planner, Designer, Developer)
    const lang = readLang(db);
    const ROLE_LABELS = {
      ko: { pm: "PM", pl: "기획자", design: "디자이너", dev: "개발자" },
      en: { pm: "PM", pl: "PL", design: "Design", dev: "Dev" },
      ja: { pm: "PM", pl: "企画者", design: "デザイナー", dev: "開発者" },
      zh: { pm: "PM", pl: "策划者", design: "设计师", dev: "开发者" },
    }[lang] ?? { pm: "PM", pl: "PL", design: "Design", dev: "Dev" };

    const roleOrder: Record<string, number> = { team_leader: 0, senior: 1, junior: 2, intern: 3 };
    const byRole = (a: { role: string }) => roleOrder[a.role] ?? 4;

    // Pick best agent for a role, excluding already-picked ids
    const pick = (prefDepts: string[], exclude: Set<string>) => {
      const pool = agents.filter((a) => !exclude.has(a.id));
      const preferred = pool.filter((a) => a.department_id && prefDepts.includes(a.department_id));
      const sorted = (preferred.length > 0 ? preferred : pool).sort((a, b) => byRole(a) - byRole(b));
      return sorted[0] ?? null;
    };

    // department ids by slug pattern — match on department id containing keyword
    const deptIds = (keyword: string) =>
      [...new Set(agents.map((a) => a.department_id).filter((d): d is string => !!d && d.toLowerCase().includes(keyword)))];

    const used = new Set<string>();
    const assignments: { role: string; agent_id: string }[] = [];

    const assign = (role: string, prefDepts: string[]) => {
      const agent = pick(prefDepts, used);
      if (agent) { assignments.push({ role, agent_id: agent.id }); used.add(agent.id); }
    };

    assign(ROLE_LABELS.pm,     deptIds("planning").concat(agents.filter((a) => a.role === "team_leader").map((a) => a.id)));
    assign(ROLE_LABELS.pl,     deptIds("dev").concat(deptIds("planning")));
    assign(ROLE_LABELS.design, deptIds("design"));
    assign(ROLE_LABELS.dev,    deptIds("dev"));

    // If fewer than 2 assigned, fall back to all agents sorted by role
    if (assignments.length < 2) {
      used.clear();
      assignments.length = 0;
      const sorted = [...agents].sort((a, b) => byRole(a) - byRole(b));
      const fallbackRoles = [ROLE_LABELS.pm, ROLE_LABELS.pl, ROLE_LABELS.design, ROLE_LABELS.dev];
      for (let i = 0; i < fallbackRoles.length; i++) {
        const agent = sorted[Math.min(i, sorted.length - 1)];
        if (agent) assignments.push({ role: fallbackRoles[i], agent_id: agent.id });
      }
    }

    logger.info({ count: assignments.length }, "[auto-assign] rule-based assignments");
    return res.json({ ok: true, assignments });
  });
}
