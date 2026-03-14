import type { Express } from "express";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { randomUUID } from "node:crypto";
import logger from "../../../lib/logger.ts";

interface RegisterProjectDashboardRoutesOptions {
  app: Express;
  db: DatabaseSync;
  nowMs: () => number;
}

/* ── 자동화 헬퍼 ───────────────────────────────────────────────────────────── */

/**
 * Phase 3-4: 게이트 완료율을 기반으로 프로젝트 목표 진행률 자동 갱신.
 * passed_gates / total_gates 비율을 모든 active 목표의 progress에 반영.
 */
function syncObjectiveProgress(db: DatabaseSync, projectId: string, nowMs: () => number): void {
  try {
    const gates = db
      .prepare("SELECT status FROM project_gates WHERE project_id = ?")
      .all(projectId) as Array<{ status: string }>;

    if (gates.length === 0) return;

    const passed = gates.filter((g) => g.status === "passed").length;
    const progress = Math.round((passed / gates.length) * 100);
    const now = nowMs();

    db.prepare(
      "UPDATE project_objectives SET progress = ?, updated_at = ? WHERE project_id = ? AND status = 'active'",
    ).run(progress, now, projectId);
  } catch {
    /* 목표/게이트 테이블 미존재 시 무시 */
  }
}

/**
 * Phase 3-5: high-severity 리스크가 active일 때 in_progress 게이트를 자동 홀드(pending).
 * 홀드된 게이트 수를 반환.
 */
function autoHoldGatesOnHighRisk(db: DatabaseSync, projectId: string, nowMs: () => number): number {
  try {
    const highActiveRisks = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM project_risks WHERE project_id = ? AND severity = 'high' AND status = 'active'",
      )
      .get(projectId) as { cnt: number };

    if ((highActiveRisks?.cnt ?? 0) === 0) return 0;

    const inProgressGates = db
      .prepare("SELECT id FROM project_gates WHERE project_id = ? AND status = 'in_progress'")
      .all(projectId) as Array<{ id: string }>;

    if (inProgressGates.length === 0) return 0;

    const now = nowMs();
    const stmt = db.prepare(
      "UPDATE project_gates SET status = 'pending', updated_at = ? WHERE id = ?",
    );
    for (const gate of inProgressGates) {
      stmt.run(now, gate.id);
    }
    return inProgressGates.length;
  } catch {
    return 0;
  }
}

/* ── 공통 헬퍼 ────────────────────────────────────────────────────────────── */

interface QuadrantHooks {
  afterCreate?: (projectId: string, itemId: string) => void;
  afterPatch?: (projectId: string, itemId: string) => void;
}

function makeQuadrantRoutes<_T>(
  app: Express,
  db: DatabaseSync,
  nowMs: () => number,
  resource: string,
  table: string,
  allowedUpdateCols: string[],
  hooks: QuadrantHooks = {},
) {
  /* LIST */
  app.get(`/api/projects/:projectId/${resource}`, (req, res) => {
    try {
      const { projectId } = req.params;
      const rows = db
        .prepare(`SELECT * FROM ${table} WHERE project_id = ? ORDER BY created_at ASC`)
        .all(projectId);
      res.json({ [resource]: rows });
    } catch (err) {
      logger.error({ err }, `[AgentDesk] GET /api/projects/:id/${resource} error:`);
      res.status(500).json({ error: `Failed to fetch ${resource}` });
    }
  });

  /* CREATE */
  app.post(`/api/projects/:projectId/${resource}`, (req, res) => {
    try {
      const { projectId } = req.params;
      const body = (req.body ?? {}) as Record<string, unknown>;
      const title = String(body.title ?? "").trim();
      if (!title) return res.status(400).json({ error: "title is required" });

      const id = randomUUID();
      const now = nowMs();

      const extraCols = allowedUpdateCols.filter((c) => c in body);
      const allCols = ["id", "project_id", "title", ...extraCols, "created_at", "updated_at"];
      const placeholders = allCols.map(() => "?").join(", ");
      const extraVals = extraCols.map((c) => (body[c] ?? null) as SQLInputValue);

      db.prepare(
        `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${placeholders})`,
      ).run(id, projectId, title, ...extraVals, now, now);

      hooks.afterCreate?.(projectId, id);

      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      res.status(201).json(row);
    } catch (err) {
      logger.error({ err }, `[AgentDesk] POST /api/projects/:id/${resource} error:`);
      res.status(500).json({ error: `Failed to create ${resource.slice(0, -1)}` });
    }
  });

  /* UPDATE */
  app.patch(`/api/projects/:projectId/${resource}/:itemId`, (req, res) => {
    try {
      const { projectId, itemId } = req.params;
      const body = (req.body ?? {}) as Record<string, unknown>;

      const existing = db
        .prepare(`SELECT id FROM ${table} WHERE id = ? AND project_id = ?`)
        .get(itemId, projectId);
      if (!existing) return res.status(404).json({ error: "Not found" });

      const sets: string[] = ["updated_at = ?"];
      const vals: SQLInputValue[] = [nowMs()];

      for (const key of ["title", ...allowedUpdateCols]) {
        if (key in body) {
          sets.push(`${key} = ?`);
          vals.push(body[key] as SQLInputValue);
        }
      }
      vals.push(itemId);

      db.prepare(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

      hooks.afterPatch?.(projectId, itemId);

      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(itemId);
      res.json(row);
    } catch (err) {
      logger.error({ err }, `[AgentDesk] PATCH /api/projects/:id/${resource}/:itemId error:`);
      res.status(500).json({ error: `Failed to update ${resource.slice(0, -1)}` });
    }
  });

  /* DELETE */
  app.delete(`/api/projects/:projectId/${resource}/:itemId`, (req, res) => {
    try {
      const { projectId, itemId } = req.params;
      const existing = db
        .prepare(`SELECT id FROM ${table} WHERE id = ? AND project_id = ?`)
        .get(itemId, projectId);
      if (!existing) return res.status(404).json({ error: "Not found" });
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(itemId);
      res.status(204).end();
    } catch (err) {
      logger.error({ err }, `[AgentDesk] DELETE /api/projects/:id/${resource}/:itemId error:`);
      res.status(500).json({ error: `Failed to delete ${resource.slice(0, -1)}` });
    }
  });
}

export function registerProjectDashboardRoutes({
  app,
  db,
  nowMs,
}: RegisterProjectDashboardRoutesOptions): void {
  /* ── 대시보드 4분면 ────────────────────────────────────────────────────── */

  makeQuadrantRoutes(app, db, nowMs, "objectives", "project_objectives", [
    "description", "status", "progress", "sort_order",
  ]);

  makeQuadrantRoutes(app, db, nowMs, "risks", "project_risks", [
    "description", "severity", "status", "mitigation", "owner",
  ], {
    /* Phase 3-5: high 리스크 생성·수정 시 in_progress 게이트 자동 홀드 */
    afterCreate: (projectId) => autoHoldGatesOnHighRisk(db, projectId, nowMs),
    afterPatch: (projectId) => autoHoldGatesOnHighRisk(db, projectId, nowMs),
  });

  makeQuadrantRoutes(app, db, nowMs, "gates", "project_gates", [
    "description", "criteria", "status", "due_date", "completed_at", "sort_order",
  ], {
    /* Phase 3-4: 게이트 상태 변경 시 목표 진행률 자동 갱신 */
    afterPatch: (projectId) => syncObjectiveProgress(db, projectId, nowMs),
  });

  makeQuadrantRoutes(app, db, nowMs, "outputs", "project_outputs", [
    "type", "status", "version", "url", "sort_order",
  ], {
    /* Phase 3-4: 산출물 완료 시에도 목표 진행률 갱신 */
    afterPatch: (projectId) => syncObjectiveProgress(db, projectId, nowMs),
  });

  /* ── Phase 3-6: 산출물 재사용 추천 ────────────────────────────────────── */
  /* GET /api/outputs/suggestions?type=document&exclude_project_id=xxx */
  app.get("/api/outputs/suggestions", (req, res) => {
    try {
      const type = String(req.query.type ?? "").trim() || null;
      const excludeProjectId = String(req.query.exclude_project_id ?? "").trim() || null;

      let sql =
        `SELECT o.*, p.name AS project_name
         FROM project_outputs o
         JOIN projects p ON p.id = o.project_id
         WHERE o.status = 'done'`;
      const params: SQLInputValue[] = [];

      if (type) {
        sql += " AND o.type = ?";
        params.push(type);
      }
      if (excludeProjectId) {
        sql += " AND o.project_id != ?";
        params.push(excludeProjectId);
      }
      sql += " ORDER BY o.updated_at DESC LIMIT 20";

      const rows = db.prepare(sql).all(...params);
      res.json({ suggestions: rows });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] GET /api/outputs/suggestions error:");
      res.status(500).json({ error: "Failed to fetch output suggestions" });
    }
  });

  /* ── project_agents (팀원 직접 선택) ──────────────────────────────────── */

  /* GET /api/projects/:projectId/agents */
  app.get("/api/projects/:projectId/agents", (req, res) => {
    try {
      const { projectId } = req.params;
      const rows = db
        .prepare(
          `SELECT a.* FROM agents a
           JOIN project_agents pa ON pa.agent_id = a.id
           WHERE pa.project_id = ?
           ORDER BY pa.created_at ASC`,
        )
        .all(projectId);
      res.json({ agents: rows });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] GET /api/projects/:id/agents error:");
      res.status(500).json({ error: "Failed to fetch project agents" });
    }
  });

  /* POST /api/projects/:projectId/agents */
  app.post("/api/projects/:projectId/agents", (req, res) => {
    try {
      const { projectId } = req.params;
      const body = (req.body ?? {}) as { agent_id?: string };
      const agentId = String(body.agent_id ?? "").trim();
      if (!agentId) return res.status(400).json({ error: "agent_id is required" });

      const agentExists = db.prepare("SELECT id FROM agents WHERE id = ?").get(agentId);
      if (!agentExists) return res.status(404).json({ error: "Agent not found" });

      const alreadyIn = db
        .prepare("SELECT project_id FROM project_agents WHERE project_id = ? AND agent_id = ?")
        .get(projectId, agentId);
      if (alreadyIn) return res.status(409).json({ error: "Agent already in project team" });

      db.prepare(
        "INSERT INTO project_agents (project_id, agent_id, created_at) VALUES (?, ?, ?)",
      ).run(projectId, agentId, nowMs());

      res.status(201).json({ project_id: projectId, agent_id: agentId });
    } catch (err) {
      logger.error({ err }, "[AgentDesk] POST /api/projects/:id/agents error:");
      res.status(500).json({ error: "Failed to add agent to project" });
    }
  });

  /* DELETE /api/projects/:projectId/agents/:agentId */
  app.delete("/api/projects/:projectId/agents/:agentId", (req, res) => {
    try {
      const { projectId, agentId } = req.params;
      db.prepare(
        "DELETE FROM project_agents WHERE project_id = ? AND agent_id = ?",
      ).run(projectId, agentId);
      res.status(204).end();
    } catch (err) {
      logger.error({ err }, "[AgentDesk] DELETE /api/projects/:id/agents/:agentId error:");
      res.status(500).json({ error: "Failed to remove agent from project" });
    }
  });
}
