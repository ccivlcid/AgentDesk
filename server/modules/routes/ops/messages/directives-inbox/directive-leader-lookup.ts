import type { AgentRow } from "../../../shared/types.ts";
import type { DirectiveAndInboxRouteCtx, DirectiveAndInboxRouteDeps } from "./types.ts";

type DbLike = DirectiveAndInboxRouteCtx["db"];

export function createDirectiveLeaderLookup(
  db: DbLike,
  normalizeTextField: DirectiveAndInboxRouteDeps["normalizeTextField"],
  findTeamLeader: DirectiveAndInboxRouteDeps["findTeamLeader"],
) {
  const manualProjectModeCache = new Map<string, boolean>();

  const isManualProject = (projectId: string | null): boolean => {
    const normalizedProjectId = normalizeTextField(projectId);
    if (!normalizedProjectId) return false;
    const cached = manualProjectModeCache.get(normalizedProjectId);
    if (cached !== undefined) return cached;
    const row = db.prepare("SELECT assignment_mode FROM projects WHERE id = ? LIMIT 1").get(normalizedProjectId) as
      | { assignment_mode?: unknown }
      | undefined;
    const isManual = String(row?.assignment_mode ?? "").trim() === "manual";
    manualProjectModeCache.set(normalizedProjectId, isManual);
    return isManual;
  };

  const hasScopedDepartmentMember = (departmentId: string, scopedCandidateAgentIds: string[] | null): boolean => {
    if (!Array.isArray(scopedCandidateAgentIds)) return false;
    const scopedIds = [
      ...new Set(scopedCandidateAgentIds.map((id) => normalizeTextField(id)).filter((id): id is string => !!id)),
    ];
    if (scopedIds.length <= 0) return false;
    const placeholders = scopedIds.map(() => "?").join(", ");
    const row = db
      .prepare(
        `
          SELECT 1 AS hit
          FROM agents
          WHERE id IN (${placeholders})
            AND department_id = ?
          LIMIT 1
        `,
      )
      .get(...scopedIds, departmentId) as { hit?: unknown } | undefined;
    return !!row;
  };

  const findDirectiveLeader = (
    departmentId: string,
    projectId: string | null,
    scopedCandidateAgentIds: string[] | null,
  ): AgentRow | null => {
    if (!departmentId) return null;
    const scopedLeader = findTeamLeader(departmentId, scopedCandidateAgentIds);
    if (scopedLeader) return scopedLeader;
    if (Array.isArray(scopedCandidateAgentIds)) {
      if (isManualProject(projectId) && hasScopedDepartmentMember(departmentId, scopedCandidateAgentIds)) {
        return findTeamLeader(departmentId);
      }
      return null;
    }
    if (projectId) return null;
    return findTeamLeader(departmentId);
  };

  return { findDirectiveLeader };
}
