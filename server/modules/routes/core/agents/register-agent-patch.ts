import type { SQLInputValue, DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { invalidateAgentPersonaCache } from "../../../workflow/core/character-persona.ts";
import {
  writeAgentPersonaFile,
  deleteAgentPersonaFile,
  type AgentCrudHelpers,
} from "./crud-helpers.ts";
import { prepareAgentPatchBody } from "./patch-body.ts";

type PatchRoutesCtx = {
  db: Pick<DatabaseSync, "prepare">;
  broadcast: (event: string, payload: unknown) => void;
  runInTransaction: (fn: () => void) => void;
};

export function registerAgentPatchRoutes(
  app: Express,
  ctx: PatchRoutesCtx,
  helpers: AgentCrudHelpers,
): void {
  const { db, broadcast, runInTransaction } = ctx;
  const { resolvePlanningLeaderScopeAgentIds, syncPlanningLeadFlagToPackProfile } = helpers;

  app.patch("/api/agents/:id", (req, res) => {
    const id = String(req.params.id);
    const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: "not_found" });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = prepareAgentPatchBody(id, body, existing, db, helpers);

    if (!result.ok) {
      return res.status(result.status).json(result.error);
    }

    const {
      updates,
      params,
      personaTextUpdate,
      requestedPlanningLead,
      scopedAgentIds,
      officePackKey,
    } = result;

    if (updates.length > 0) {
      try {
        runInTransaction(() => {
          if ("acts_as_planning_leader" in body && requestedPlanningLead) {
            const scopeIds = scopedAgentIds.length <= 0 ? resolvePlanningLeaderScopeAgentIds(officePackKey) : scopedAgentIds;
            if (scopeIds.length > 0) {
              const placeholders = scopeIds.map(() => "?").join(", ");
              db.prepare(
                `
                UPDATE agents
                SET acts_as_planning_leader = 0
                WHERE id IN (${placeholders})
                  AND id != ?
                  AND COALESCE(acts_as_planning_leader, 0) = 1
              `,
              ).run(...([...scopeIds, id] as SQLInputValue[]));
            } else {
              db.prepare(
                `
                UPDATE agents
                SET acts_as_planning_leader = 0
                WHERE id != ?
                  AND role = 'team_leader'
                  AND COALESCE(acts_as_planning_leader, 0) = 1
              `,
              ).run(id);
            }
          }

          params.push(id);
          db.prepare(`UPDATE agents SET ${updates.join(", ")} WHERE id = ?`).run(...(params as SQLInputValue[]));

          if ("acts_as_planning_leader" in body) {
            const scopeIds = scopedAgentIds.length <= 0 ? resolvePlanningLeaderScopeAgentIds(officePackKey) : scopedAgentIds;
            syncPlanningLeadFlagToPackProfile({
              packKey: officePackKey,
              targetAgentId: id,
              enabled: requestedPlanningLead,
              scopeAgentIds: scopeIds,
            });
          }
        });
      } catch (err: unknown) {
        const message = String(err && typeof err === "object" && "message" in err ? (err as { message: unknown }).message : err);
        if (message.includes("no such column: acts_as_planning_leader")) {
          return res.status(400).json({ error: "planning_leader_flag_not_available" });
        }
        logger.error({ err }, "[agents] planning leader update failed");
        return res.status(500).json({ error: "internal_error" });
      }
    }

    if (personaTextUpdate !== undefined) {
      if (personaTextUpdate) {
        writeAgentPersonaFile(id, personaTextUpdate);
      } else {
        deleteAgentPersonaFile(id);
      }
      invalidateAgentPersonaCache(id);
    }

    const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    broadcast("agent_status", updated);
    res.json({ ok: true, agent: updated });
  });
}
