import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import type { AgentCrudHelpers } from "./crud-helpers.ts";
import type { WorkflowPackKey } from "../../../workflow/packs/definitions.ts";
import { getDepartmentForPack } from "../../../workflow/packs/department-scope.ts";

type DbLike = Pick<DatabaseSync, "prepare">;

export type PatchBodySuccess = {
  ok: true;
  body: Record<string, unknown>;
  updates: string[];
  params: unknown[];
  personaTextUpdate: string | null | undefined;
  requestedPlanningLead: boolean;
  scopedAgentIds: string[];
  officePackKey: WorkflowPackKey;
};

export type PatchBodyError = {
  ok: false;
  status: number;
  error: Record<string, unknown>;
};

export function prepareAgentPatchBody(
  id: string,
  body: Record<string, unknown>,
  existing: Record<string, unknown>,
  db: DbLike,
  helpers: AgentCrudHelpers,
): PatchBodySuccess | PatchBodyError {
  const {
    hasAgentWorkflowPackColumn,
    parseWorkflowPackKey,
    readActiveOfficeWorkflowPackKey,
    resolvePlanningLeaderScopeAgentIds,
    syncPlanningLeadFlagToPackProfile,
    normalizeText,
  } = helpers;

  const nextProviderRaw = ("cli_provider" in body ? body.cli_provider : existing.cli_provider) as
    | string
    | null
    | undefined;
  const nextProvider = nextProviderRaw ?? "claude";
  const nextOAuthProvider =
    nextProvider === "copilot" ? "github" : nextProvider === "antigravity" ? "google_antigravity" : null;
  const supportsCliModelOverride = ["claude", "codex", "gemini", "opencode", "cursor"].includes(nextProvider);
  const supportsCliReasoningOverride = nextProvider === "codex";
  const providerChanged = "cli_provider" in body && nextProvider !== String(existing.cli_provider ?? "claude");

  if (!nextOAuthProvider && !("oauth_account_id" in body) && "cli_provider" in body) {
    body.oauth_account_id = null;
  }
  if (nextProvider !== "api" && !("api_provider_id" in body) && "cli_provider" in body) {
    body.api_provider_id = null;
    body.api_model = null;
  }
  if ((!supportsCliModelOverride || providerChanged) && !("cli_model" in body)) {
    body.cli_model = null;
  }
  if ((!supportsCliReasoningOverride || providerChanged) && !("cli_reasoning_level" in body)) {
    body.cli_reasoning_level = null;
  }
  if ("cli_model" in body && !("cli_reasoning_level" in body) && supportsCliReasoningOverride) {
    body.cli_reasoning_level = null;
  }

  if ("oauth_account_id" in body) {
    if (body.oauth_account_id === "" || typeof body.oauth_account_id === "undefined") {
      body.oauth_account_id = null;
    }
    if (body.oauth_account_id !== null && typeof body.oauth_account_id !== "string") {
      return { ok: false, status: 400, error: { error: "invalid_oauth_account_id" } };
    }
    if (body.oauth_account_id && !nextOAuthProvider) {
      return { ok: false, status: 400, error: { error: "oauth_account_requires_oauth_provider" } };
    }
    if (body.oauth_account_id && nextOAuthProvider) {
      const oauthAccount = db
        .prepare("SELECT id, status FROM oauth_accounts WHERE id = ? AND provider = ?")
        .get(body.oauth_account_id, nextOAuthProvider) as { id: string; status: "active" | "disabled" } | undefined;
      if (!oauthAccount) {
        return { ok: false, status: 400, error: { error: "oauth_account_not_found_for_provider" } };
      }
      if (oauthAccount.status !== "active") {
        return { ok: false, status: 400, error: { error: "oauth_account_disabled" } };
      }
    }
  }

  if ("cli_model" in body) {
    if (body.cli_model === "" || typeof body.cli_model === "undefined") {
      body.cli_model = null;
    }
    if (body.cli_model !== null && typeof body.cli_model !== "string") {
      return { ok: false, status: 400, error: { error: "invalid_cli_model" } };
    }
    if (body.cli_model && !supportsCliModelOverride) {
      return { ok: false, status: 400, error: { error: "cli_model_requires_cli_provider" } };
    }
  }

  if ("cli_reasoning_level" in body) {
    if (body.cli_reasoning_level === "" || typeof body.cli_reasoning_level === "undefined") {
      body.cli_reasoning_level = null;
    }
    if (body.cli_reasoning_level !== null && typeof body.cli_reasoning_level !== "string") {
      return { ok: false, status: 400, error: { error: "invalid_cli_reasoning_level" } };
    }
    if (body.cli_reasoning_level && !supportsCliReasoningOverride) {
      return { ok: false, status: 400, error: { error: "cli_reasoning_requires_codex_provider" } };
    }
  }

  if ("acts_as_planning_leader" in body) {
    const raw = body.acts_as_planning_leader;
    if (raw === true || raw === 1 || raw === "1") {
      body.acts_as_planning_leader = 1;
    } else if (raw === false || raw === 0 || raw === "0" || raw === null || raw === "" || raw === undefined) {
      body.acts_as_planning_leader = 0;
    } else {
      return { ok: false, status: 400, error: { error: "invalid_acts_as_planning_leader" } };
    }
  }

  if ("enable_planning_phase" in body) {
    const raw = body.enable_planning_phase;
    if (raw === true || raw === 1 || raw === "1") {
      body.enable_planning_phase = 1;
    } else if (raw === false || raw === 0 || raw === "0" || raw === null || raw === "" || raw === undefined) {
      body.enable_planning_phase = 0;
    } else {
      return { ok: false, status: 400, error: { error: "invalid_enable_planning_phase" } };
    }
  }

  const requestedPackKey = parseWorkflowPackKey(body.workflow_pack_key);
  if ("workflow_pack_key" in body) {
    if (!requestedPackKey) {
      return { ok: false, status: 400, error: { error: "invalid_workflow_pack_key" } };
    }
    body.workflow_pack_key = requestedPackKey;
  }
  const existingPackKey = hasAgentWorkflowPackColumn ? parseWorkflowPackKey(existing.workflow_pack_key) : null;
  const officePackKey = requestedPackKey ?? existingPackKey ?? readActiveOfficeWorkflowPackKey();

  if ("department_id" in body) {
    if (body.department_id === "" || body.department_id === undefined) {
      body.department_id = null;
    } else if (body.department_id !== null && typeof body.department_id !== "string") {
      return { ok: false, status: 400, error: { error: "invalid_department_id" } };
    } else if (typeof body.department_id === "string") {
      const normalizedDepartmentId = body.department_id.trim();
      if (!normalizedDepartmentId) {
        body.department_id = null;
      } else {
        const deptExists = getDepartmentForPack(db, normalizedDepartmentId);
        if (!deptExists) return { ok: false, status: 400, error: { error: "department_not_found" } };
        body.department_id = normalizedDepartmentId;
      }
    }
  }

  const personaTextUpdate =
    "personality" in body ? (typeof body.personality === "string" ? body.personality.trim() : null) : undefined;
  delete body.personality;

  const allowedFields = [
    "name",
    "name_ko",
    "name_ja",
    "name_zh",
    "department_id",
    ...(hasAgentWorkflowPackColumn ? (["workflow_pack_key"] as const) : []),
    "role",
    "cli_provider",
    "oauth_account_id",
    "api_provider_id",
    "api_model",
    "cli_model",
    "cli_reasoning_level",
    "avatar_emoji",
    "avatar_url",
    "sprite_number",
    "persona_id",
    "status",
    "current_task_id",
    "acts_as_planning_leader",
    "enable_planning_phase",
    "kb_default_sources",
    "specialty",
    "autonomy_level",
    "max_concurrent_tasks",
  ];
  const forcePlanningLeadOverride =
    body.force_planning_leader_override === true ||
    body.force_planning_leader_override === 1 ||
    body.force_planning_leader_override === "1";
  const requestedPlanningLead = Number(body.acts_as_planning_leader ?? existing.acts_as_planning_leader ?? 0) === 1;
  let scopedAgentIds: string[] = [];

  if ("acts_as_planning_leader" in body && requestedPlanningLead) {
    try {
      scopedAgentIds = resolvePlanningLeaderScopeAgentIds(officePackKey);
      const conflictLeader = (() => {
        if (scopedAgentIds.length > 0) {
          const placeholders = scopedAgentIds.map(() => "?").join(", ");
          return db
            .prepare(
              `
                SELECT id, name, name_ko
                FROM agents
                WHERE id IN (${placeholders})
                  AND role = 'team_leader'
                  AND COALESCE(acts_as_planning_leader, 0) = 1
                  AND id != ?
                ORDER BY created_at ASC
                LIMIT 1
              `,
            )
            .get(...([...scopedAgentIds, id] as SQLInputValue[])) as
            | { id?: unknown; name?: unknown; name_ko?: unknown }
            | undefined;
        }
        return db
          .prepare(
            `
              SELECT id, name, name_ko
              FROM agents
              WHERE role = 'team_leader'
                AND COALESCE(acts_as_planning_leader, 0) = 1
                AND id != ?
              ORDER BY created_at ASC
              LIMIT 1
            `,
          )
          .get(id) as { id?: unknown; name?: unknown; name_ko?: unknown } | undefined;
      })();

      if (conflictLeader && !forcePlanningLeadOverride) {
        return {
          ok: false,
          status: 409,
          error: {
            error: "planning_leader_exists",
            pack_key: officePackKey,
            existing_leader: {
              id: normalizeText(conflictLeader.id),
              name: normalizeText(conflictLeader.name),
              name_ko: normalizeText(conflictLeader.name_ko),
            },
          },
        };
      }
    } catch (err: unknown) {
      const message = String(err && typeof err === "object" && "message" in err ? (err as { message: unknown }).message : err);
      if (message.includes("no such column: acts_as_planning_leader")) {
        return { ok: false, status: 400, error: { error: "planning_leader_flag_not_available" } };
      }
      throw err;
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      updates.push(`${field} = ?`);
      params.push(body[field]);
    }
  }

  if (updates.length === 0 && personaTextUpdate === undefined) {
    return { ok: false, status: 400, error: { error: "no_fields_to_update" } };
  }

  return {
    ok: true,
    body,
    updates,
    params,
    personaTextUpdate,
    requestedPlanningLead,
    scopedAgentIds,
    officePackKey,
  };
}
