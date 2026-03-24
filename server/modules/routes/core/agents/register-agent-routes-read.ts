import type { Express } from "express";
import type { MeetingReviewDecision } from "../../shared/types.ts";
import type { AgentCrudHelpers } from "./crud-helpers.ts";

import type { DatabaseSync } from "node:sqlite";

type ReadRoutesCtx = {
  db: Pick<DatabaseSync, "prepare">;
  nowMs: () => number;
  meetingPresenceUntil: Map<string, number>;
  meetingSeatIndexByAgent: Map<string, number>;
  meetingPhaseByAgent: Map<string, "kickoff" | "review">;
  meetingTaskIdByAgent: Map<string, string>;
  meetingReviewDecisionByAgent: Map<string, MeetingReviewDecision>;
};

export function registerAgentReadRoutes(
  app: Express,
  ctx: ReadRoutesCtx,
  helpers: AgentCrudHelpers,
): void {
  const { db, nowMs, meetingPresenceUntil, meetingSeatIndexByAgent, meetingPhaseByAgent, meetingTaskIdByAgent, meetingReviewDecisionByAgent } = ctx;
  const { parseIncludeSeedParam } = helpers;

  app.get("/api/agents", (req, res) => {
    const includeSeed = parseIncludeSeedParam(req.query?.include_seed);
    const seedFilterClause = includeSeed ? "" : "WHERE a.id NOT LIKE '%-seed-%'";
    const agents = db
      .prepare(
        `
      SELECT a.*, d.name AS department_name, d.name_ko AS department_name_ko, d.color AS department_color
      FROM agents a
      LEFT JOIN departments d ON a.department_id = d.id
      ${seedFilterClause}
      ORDER BY a.department_id, a.role, a.name
    `,
      )
      .all();
    res.json({ agents });
  });

  app.get("/api/meeting-presence", (_req, res) => {
    const now = nowMs();
    const presence: Array<{
      agent_id: string;
      seat_index: number;
      phase: "kickoff" | "review";
      task_id: string | null;
      decision: MeetingReviewDecision | null;
      until: number;
    }> = [];

    for (const [agentId, until] of meetingPresenceUntil.entries()) {
      if (until < now) {
        meetingPresenceUntil.delete(agentId);
        meetingSeatIndexByAgent.delete(agentId);
        meetingPhaseByAgent.delete(agentId);
        meetingTaskIdByAgent.delete(agentId);
        meetingReviewDecisionByAgent.delete(agentId);
        continue;
      }
      const phase = meetingPhaseByAgent.get(agentId) ?? "kickoff";
      presence.push({
        agent_id: agentId,
        seat_index: meetingSeatIndexByAgent.get(agentId) ?? 0,
        phase,
        task_id: meetingTaskIdByAgent.get(agentId) ?? null,
        decision: phase === "review" ? (meetingReviewDecisionByAgent.get(agentId) ?? "reviewing") : null,
        until,
      });
    }

    presence.sort((a, b) => a.seat_index - b.seat_index);
    res.json({ presence });
  });

  app.get("/api/agents/:id", (req, res) => {
    const id = String(req.params.id);
    const agent = db
      .prepare(
        `
      SELECT a.*, d.name AS department_name, d.name_ko AS department_name_ko, d.color AS department_color
      FROM agents a
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = ?
    `,
      )
      .get(id);
    if (!agent) return res.status(404).json({ error: "not_found" });

    const recentTasks = db
      .prepare("SELECT * FROM tasks WHERE assigned_agent_id = ? ORDER BY updated_at DESC LIMIT 10")
      .all(id);

    res.json({ agent, recent_tasks: recentTasks });
  });
}
