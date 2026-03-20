import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import {
  DEFAULT_WORKFLOW_PACK_KEY,
  isWorkflowPackKey,
  type WorkflowPackKey,
} from "../../../workflow/packs/definitions.ts";
import { resolveConstrainedAgentScopeForTask } from "../tasks/execution-run-auto-assign.ts";
import { getDepartmentForPack, parseWorkflowPackKeyInput } from "../../../workflow/packs/department-scope.ts";

const AGENTS_PROMPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../../../prompts/agents");
export const PERSONAS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../../../../prompts/personas");

export function getAgentPersonaFilePath(agentId: string): string {
  return join(AGENTS_PROMPTS_DIR, `${agentId}.md`);
}

export function readAgentPersonaFile(agentId: string): string | null {
  try {
    const content = readFileSync(getAgentPersonaFilePath(agentId), "utf-8").trim();
    return content || null;
  } catch {
    return null;
  }
}

export function writeAgentPersonaFile(agentId: string, text: string): void {
  mkdirSync(AGENTS_PROMPTS_DIR, { recursive: true });
  writeFileSync(getAgentPersonaFilePath(agentId), text, "utf-8");
}

export function deleteAgentPersonaFile(agentId: string): void {
  try {
    unlinkSync(getAgentPersonaFilePath(agentId));
  } catch {
    /* file may not exist */
  }
}

export type AgentCrudHelpers = {
  hasAgentWorkflowPackColumn: boolean;
  agentPackExpr: string;
  parseIncludeSeedParam: (input: unknown) => boolean;
  normalizeText: (value: unknown) => string;
  parseWorkflowPackKey: (value: unknown) => WorkflowPackKey | null;
  readActiveOfficeWorkflowPackKey: () => WorkflowPackKey;
  readNonDevelopmentProfileAgentIds: () => Set<string>;
  resolvePlanningLeaderScopeAgentIds: (packKey: WorkflowPackKey) => string[];
  syncPlanningLeadFlagToPackProfile: (params: {
    packKey: WorkflowPackKey;
    targetAgentId: string;
    enabled: boolean;
    scopeAgentIds: string[];
  }) => void;
};

type DbLike = {
  prepare: (sql: string) => {
    run: (...args: SQLInputValue[]) => unknown;
    get: (...args: SQLInputValue[]) => unknown;
    all: (...args: SQLInputValue[]) => unknown;
  };
};

export function createAgentCrudHelpers(db: DbLike): AgentCrudHelpers {
  const hasAgentWorkflowPackColumn = (() => {
    try {
      const cols = db.prepare("PRAGMA table_info(agents)").all() as Array<{ name?: unknown }>;
      return cols.some((col) => String(col.name ?? "").trim() === "workflow_pack_key");
    } catch {
      return false;
    }
  })();
  const agentPackExpr = hasAgentWorkflowPackColumn ? "COALESCE(a.workflow_pack_key, 'development')" : "'development'";

  function parseIncludeSeedParam(input: unknown): boolean {
    if (Array.isArray(input)) input = input[0];
    const raw = String(input ?? "")
      .trim()
      .toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
  }

  function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  function parseWorkflowPackKey(value: unknown): WorkflowPackKey | null {
    return parseWorkflowPackKeyInput(value);
  }

  function readActiveOfficeWorkflowPackKey(): WorkflowPackKey {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'officeWorkflowPack' LIMIT 1").get() as
      | { value?: unknown }
      | undefined;
    const parsed = parseWorkflowPackKey(row?.value);
    return parsed ?? DEFAULT_WORKFLOW_PACK_KEY;
  }

  function readNonDevelopmentProfileAgentIds(): Set<string> {
    const out = new Set<string>();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'officePackProfiles' LIMIT 1").get() as
      | { value?: unknown }
      | undefined;
    if (!row) return out;

    let root: unknown = row.value;
    if (typeof root === "string") {
      try {
        root = JSON.parse(root);
      } catch {
        return out;
      }
    }
    if (!root || typeof root !== "object" || Array.isArray(root)) return out;

    for (const [packKey, packProfileRaw] of Object.entries(root as Record<string, unknown>)) {
      if (!isWorkflowPackKey(packKey) || packKey === DEFAULT_WORKFLOW_PACK_KEY) continue;
      if (!packProfileRaw || typeof packProfileRaw !== "object" || Array.isArray(packProfileRaw)) continue;
      const packProfile = packProfileRaw as Record<string, unknown>;
      if (!Array.isArray(packProfile.agents)) continue;
      for (const rawAgent of packProfile.agents) {
        if (!rawAgent || typeof rawAgent !== "object" || Array.isArray(rawAgent)) continue;
        const agentId = normalizeText((rawAgent as Record<string, unknown>).id);
        if (agentId) out.add(agentId);
      }
    }
    return out;
  }

  function resolvePlanningLeaderScopeAgentIds(packKey: WorkflowPackKey): string[] {
    const constrained = resolveConstrainedAgentScopeForTask(db as any, {
      workflow_pack_key: packKey,
      department_id: "planning",
      project_id: null,
    });
    if (Array.isArray(constrained) && constrained.length > 0) {
      return Array.from(new Set(constrained.map((id) => normalizeText(id)).filter((id) => id.length > 0)));
    }

    if (packKey !== DEFAULT_WORKFLOW_PACK_KEY) {
      const prefixed = db.prepare("SELECT id FROM agents WHERE id LIKE ?").all(`${packKey}-%`) as Array<{
        id?: unknown;
      }>;
      return prefixed.map((row) => normalizeText(row.id)).filter((id): id is string => id.length > 0);
    }

    const excludeIds = [...readNonDevelopmentProfileAgentIds()];
    if (excludeIds.length > 0) {
      const placeholders = excludeIds.map(() => "?").join(", ");
      const rows = db
        .prepare(`SELECT id FROM agents WHERE id NOT LIKE '%-seed-%' AND id NOT IN (${placeholders})`)
        .all(...(excludeIds as SQLInputValue[])) as Array<{ id?: unknown }>;
      return rows.map((row) => normalizeText(row.id)).filter((id): id is string => id.length > 0);
    }

    const rows = db.prepare("SELECT id FROM agents WHERE id NOT LIKE '%-seed-%'").all() as Array<{ id?: unknown }>;
    return rows.map((row) => normalizeText(row.id)).filter((id): id is string => id.length > 0);
  }

  function syncPlanningLeadFlagToPackProfile(params: {
    packKey: WorkflowPackKey;
    targetAgentId: string;
    enabled: boolean;
    scopeAgentIds: string[];
  }): void {
    const { packKey, targetAgentId, enabled, scopeAgentIds } = params;
    if (packKey === DEFAULT_WORKFLOW_PACK_KEY) return;

    const row = db.prepare("SELECT value FROM settings WHERE key = 'officePackProfiles' LIMIT 1").get() as
      | { value?: unknown }
      | undefined;
    if (!row) return;

    let root: unknown = row.value;
    if (typeof root === "string") {
      try {
        root = JSON.parse(root);
      } catch {
        return;
      }
    }
    if (!root || typeof root !== "object" || Array.isArray(root)) return;

    const rootObject = root as Record<string, unknown>;
    const packProfileRaw = rootObject[packKey];
    if (!packProfileRaw || typeof packProfileRaw !== "object" || Array.isArray(packProfileRaw)) return;
    const packProfile = packProfileRaw as Record<string, unknown>;
    if (!Array.isArray(packProfile.agents)) return;

    const scopeSet = new Set(scopeAgentIds.map((id) => normalizeText(id)).filter((id) => id.length > 0));
    let changed = false;
    const nextAgents = packProfile.agents.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      const agent = entry as Record<string, unknown>;
      const agentId = normalizeText(agent.id);
      if (!agentId) return entry;

      const inScope = scopeSet.size > 0 ? scopeSet.has(agentId) : true;
      if (agentId !== targetAgentId && (!enabled || !inScope)) return entry;

      const current = Number(agent.acts_as_planning_leader ?? 0) > 0 ? 1 : 0;
      const next = agentId === targetAgentId ? (enabled ? 1 : 0) : 0;
      if (current === next) return entry;
      changed = true;
      return { ...agent, acts_as_planning_leader: next };
    });

    if (!changed) return;
    rootObject[packKey] = { ...packProfile, agents: nextAgents };
    const serialized = JSON.stringify(rootObject);
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run("officePackProfiles", serialized);
  }

  return {
    hasAgentWorkflowPackColumn,
    agentPackExpr,
    parseIncludeSeedParam,
    normalizeText,
    parseWorkflowPackKey,
    readActiveOfficeWorkflowPackKey,
    readNonDevelopmentProfileAgentIds,
    resolvePlanningLeaderScopeAgentIds,
    syncPlanningLeadFlagToPackProfile,
  };
}
