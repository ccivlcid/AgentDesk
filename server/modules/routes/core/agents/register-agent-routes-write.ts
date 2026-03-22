import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import type { Express } from "express";
import logger from "../../../../lib/logger.ts";
import { getDepartmentForPack } from "../../../workflow/packs/department-scope.ts";
import { writeAgentPersonaFile, type AgentCrudHelpers } from "./crud-helpers.ts";

type WriteRoutesCtx = {
  db: {
    prepare: (sql: string) => {
      run: (...args: SQLInputValue[]) => unknown;
      get: (...args: SQLInputValue[]) => unknown;
    };
  };
  broadcast: (event: string, payload: unknown) => void;
  runInTransaction: (fn: () => void) => void;
};

export function registerAgentWriteRoutes(
  app: Express,
  ctx: WriteRoutesCtx,
  helpers: AgentCrudHelpers,
): void {
  const { db, broadcast, runInTransaction } = ctx;
  const {
    hasAgentWorkflowPackColumn,
    parseWorkflowPackKey,
    readActiveOfficeWorkflowPackKey,
  } = helpers;

  app.post("/api/agents", (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const name_ko = typeof body.name_ko === "string" ? body.name_ko.trim() : "";
      const name_ja = typeof body.name_ja === "string" ? body.name_ja.trim() : "";
      const name_zh = typeof body.name_zh === "string" ? body.name_zh.trim() : "";
      if (!name) return res.status(400).json({ error: "name_required" });
      const requestedPackKey = parseWorkflowPackKey(body.workflow_pack_key);
      if (body.workflow_pack_key !== undefined && body.workflow_pack_key !== null && !requestedPackKey) {
        return res.status(400).json({ error: "invalid_workflow_pack_key" });
      }
      const activePackKey = readActiveOfficeWorkflowPackKey();
      const workflowPackKey = requestedPackKey ?? activePackKey;

      if (body.department_id !== undefined && body.department_id !== null && typeof body.department_id !== "string") {
        return res.status(400).json({ error: "invalid_department_id" });
      }
      const department_id = typeof body.department_id === "string" ? body.department_id.trim() || null : null;
      if (department_id) {
        const deptExists = getDepartmentForPack(db as any, department_id);
        if (!deptExists) return res.status(400).json({ error: "department_not_found" });
      }

      const role =
        typeof body.role === "string" && ["team_leader", "senior", "junior", "intern"].includes(body.role)
          ? body.role
          : "junior";
      const cli_provider =
        typeof body.cli_provider === "string" &&
        ["claude", "codex", "gemini", "opencode", "copilot", "antigravity", "api"].includes(body.cli_provider)
          ? body.cli_provider
          : "claude";
      const avatar_emoji =
        typeof body.avatar_emoji === "string" && body.avatar_emoji.trim() ? body.avatar_emoji.trim() : "🤖";
      const sprite_number =
        typeof body.sprite_number === "number" && body.sprite_number > 0 ? body.sprite_number : null;
      const personaText = typeof body.personality === "string" ? body.personality.trim() : "";
      const persona_id = typeof body.persona_id === "string" ? body.persona_id.trim() || null : null;
      const specialty = typeof body.specialty === "string" ? body.specialty.trim() || null : null;
      const autonomy_level =
        typeof body.autonomy_level === "string" && ["autonomous", "balanced", "supervised"].includes(body.autonomy_level)
          ? body.autonomy_level
          : "balanced";
      const max_concurrent_tasks =
        typeof body.max_concurrent_tasks === "number" && body.max_concurrent_tasks >= 1
          ? Math.min(Math.floor(body.max_concurrent_tasks), 10)
          : 1;

      const id = randomUUID();
      try {
        if (hasAgentWorkflowPackColumn) {
          db.prepare(
            `INSERT INTO agents (id, name, name_ko, name_ja, name_zh, department_id, workflow_pack_key, role, cli_provider, avatar_emoji, sprite_number, persona_id, specialty, autonomy_level, max_concurrent_tasks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            id,
            name,
            name_ko,
            name_ja,
            name_zh,
            department_id,
            workflowPackKey,
            role,
            cli_provider,
            avatar_emoji,
            sprite_number,
            persona_id,
            specialty,
            autonomy_level,
            max_concurrent_tasks,
          );
        } else {
          db.prepare(
            `INSERT INTO agents (id, name, name_ko, name_ja, name_zh, department_id, role, cli_provider, avatar_emoji, sprite_number, persona_id, specialty, autonomy_level, max_concurrent_tasks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            id,
            name,
            name_ko,
            name_ja,
            name_zh,
            department_id,
            role,
            cli_provider,
            avatar_emoji,
            sprite_number,
            persona_id,
            specialty,
            autonomy_level,
            max_concurrent_tasks,
          );
        }
      } catch (err: unknown) {
        const msg = String(err && typeof err === "object" && "message" in err ? (err as { message: unknown }).message : err);
        if (msg.includes("FOREIGN KEY constraint failed")) {
          return res.status(400).json({ error: "department_not_found" });
        }
        throw err;
      }

      if (personaText) {
        writeAgentPersonaFile(id, personaText);
      }

      const created = db
        .prepare(
          `
        SELECT a.*, d.name AS department_name, d.name_ko AS department_name_ko, d.color AS department_color
        FROM agents a LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.id = ?
      `,
        )
        .get(id);
      broadcast("agent_created", created);
      res.status(201).json({ ok: true, agent: created });
    } catch (err) {
      logger.error({ err }, "[agents] POST failed");
      res.status(500).json({ error: "internal_error" });
    }
  });

  app.delete("/api/agents/:id", (req, res) => {
    try {
      const id = String(req.params.id);
      const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!existing) return res.status(404).json({ error: "not_found" });
      if (existing.status === "working") return res.status(400).json({ error: "cannot_delete_working_agent" });

      runInTransaction(() => {
        db.prepare("UPDATE tasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?").run(id);
        db.prepare("UPDATE subtasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?").run(id);
        db.prepare("UPDATE meeting_minute_entries SET speaker_agent_id = NULL WHERE speaker_agent_id = ?").run(id);
        db.prepare("UPDATE task_report_archives SET generated_by_agent_id = NULL WHERE generated_by_agent_id = ?").run(
          id,
        );
        db.prepare("UPDATE project_review_decision_states SET planner_agent_id = NULL WHERE planner_agent_id = ?").run(
          id,
        );
        db.prepare("UPDATE review_round_decision_states SET planner_agent_id = NULL WHERE planner_agent_id = ?").run(
          id,
        );
        db.prepare("DELETE FROM agents WHERE id = ?").run(id);
      });

      broadcast("agent_deleted", { id });
      res.json({ ok: true, id });
    } catch (err) {
      logger.error({ err }, "[agents] DELETE failed");
      res.status(500).json({ error: "internal_error" });
    }
  });
}
