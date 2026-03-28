import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { createMeetingLeaderSelectionTools } from "./leader-selection.ts";

type AgentRow = {
  id: string;
  name: string;
  role: string;
  personality: string | null;
  status: string;
  department_id: string | null;
  current_task_id: string | null;
  avatar_emoji: string;
  cli_provider: string | null;
  oauth_account_id: string | null;
  api_provider_id: string | null;
  api_model: string | null;
  cli_model: string | null;
  cli_reasoning_level: string | null;
};

function setupDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      personality TEXT,
      status TEXT NOT NULL,
      department_id TEXT,
      current_task_id TEXT,
      avatar_emoji TEXT NOT NULL DEFAULT '🤖',
      cli_provider TEXT,
      oauth_account_id TEXT,
      api_provider_id TEXT,
      api_model TEXT,
      cli_model TEXT,
      cli_reasoning_level TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      department_id TEXT,
      project_id TEXT,
      workflow_pack_key TEXT
    );

    CREATE TABLE subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      target_department_id TEXT
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      assignment_mode TEXT NOT NULL DEFAULT 'auto'
    );

    CREATE TABLE project_agents (
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL
    );
  `);

  return db;
}

function insertLeader(db: DatabaseSync, input: { id: string; dept: string; name?: string; status?: string }): void {
  db.prepare(
    `
      INSERT INTO agents (
        id, name, role, personality, status, department_id, current_task_id,
        avatar_emoji, cli_provider, oauth_account_id, api_provider_id, api_model, cli_model, cli_reasoning_level, created_at
      ) VALUES (?, ?, 'team_leader', NULL, ?, ?, NULL, '🤖', 'codex', NULL, NULL, NULL, NULL, NULL, 1)
    `,
  ).run(input.id, input.name ?? input.id, input.status ?? "idle", input.dept);
}

function buildFindTeamLeader(db: DatabaseSync) {
  return (departmentId: string, candidateAgentIds?: string[] | null): AgentRow | null => {
    if (!departmentId) return null;
    if (Array.isArray(candidateAgentIds)) {
      if (candidateAgentIds.length === 0) return null;
      const placeholders = candidateAgentIds.map(() => "?").join(",");
      return (
        (db
          .prepare(
            `
            SELECT *
            FROM agents
            WHERE department_id = ?
              AND role = 'team_leader'
              AND id IN (${placeholders})
            ORDER BY created_at ASC
            LIMIT 1
          `,
          )
          .get(departmentId, ...candidateAgentIds) as AgentRow | undefined) ?? null
      );
    }
    return (
      (db
        .prepare(
          `
          SELECT *
          FROM agents
          WHERE department_id = ? AND role = 'team_leader'
          ORDER BY created_at ASC
          LIMIT 1
        `,
        )
        .get(departmentId) as AgentRow | undefined) ?? null
    );
  };
}

describe("meeting leader selection - project scope", () => {
  it("project_agents 범위 내 팀장만 task review에 참여한다", () => {
    const db = setupDb();
    try {
      db.prepare("INSERT INTO departments (id, sort_order) VALUES ('planning', 1), ('dev', 2)").run();

      insertLeader(db, { id: "planning-global", dept: "planning" });
      insertLeader(db, { id: "dev-global", dept: "dev" });
      insertLeader(db, { id: "proj-leader-1", dept: "planning" });
      insertLeader(db, { id: "proj-leader-2", dept: "dev" });

      db.prepare("INSERT INTO projects (id, assignment_mode) VALUES (?, 'manual')").run("proj-1");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-1", "proj-leader-1");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-1", "proj-leader-2");

      db.prepare(
        "INSERT INTO tasks (id, title, description, department_id, project_id, workflow_pack_key) VALUES (?, ?, ?, ?, ?, ?)",
      ).run("task-1", "dev task", "implement feature", "planning", "proj-1", "development");

      const tools = createMeetingLeaderSelectionTools({
        db,
        findTeamLeader: buildFindTeamLeader(db),
        detectTargetDepartments: () => [],
      });

      const leaders = tools.getTaskReviewLeaders("task-1", "planning", {
        minLeaders: 2,
        includePlanning: true,
        fallbackAll: true,
      });
      const leaderIds = leaders.map((leader) => leader.id);

      expect(leaderIds).toContain("proj-leader-1");
      expect(leaderIds).toContain("proj-leader-2");
      expect(leaderIds).not.toContain("planning-global");
      expect(leaderIds).not.toContain("dev-global");
    } finally {
      db.close();
    }
  });

  it("manual 배정 시 관련부서 팀장을 project_agents 범위에서 포함한다", () => {
    const db = setupDb();
    try {
      db.prepare(
        "INSERT INTO departments (id, sort_order) VALUES ('planning', 1), ('dev', 2), ('design', 3), ('qa', 4)",
      ).run();

      // global leaders (must not be picked when project scope is set)
      insertLeader(db, { id: "planning-global", dept: "planning" });
      insertLeader(db, { id: "dev-global", dept: "dev" });
      insertLeader(db, { id: "design-global", dept: "design" });

      // project-scoped leaders
      insertLeader(db, { id: "proj-leader-1", dept: "planning" });
      insertLeader(db, { id: "proj-leader-2", dept: "dev" });
      insertLeader(db, { id: "proj-leader-3", dept: "design" });

      db.prepare("INSERT INTO projects (id, assignment_mode) VALUES (?, 'manual')").run("proj-manual");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-manual", "proj-leader-1");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-manual", "proj-leader-2");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-manual", "proj-leader-3");

      db.prepare(
        "INSERT INTO tasks (id, title, description, department_id, project_id, workflow_pack_key) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        "task-manual",
        "개발 킥오프",
        "설계 보강 필요",
        "planning",
        "proj-manual",
        "development",
      );

      const tools = createMeetingLeaderSelectionTools({
        db,
        findTeamLeader: buildFindTeamLeader(db),
        detectTargetDepartments: () => ["design", "dev"],
      });

      const leaders = tools.getTaskReviewLeaders("task-manual", "planning", {
        minLeaders: 2,
        includePlanning: true,
        fallbackAll: true,
      });
      const leaderIds = leaders.map((leader) => leader.id);

      expect(leaderIds).toContain("proj-leader-1");
      expect(leaderIds).toContain("proj-leader-2");
      expect(leaderIds).toContain("proj-leader-3");
      expect(leaderIds).not.toContain("planning-global");
      expect(leaderIds).not.toContain("dev-global");
      expect(leaderIds).not.toContain("design-global");
    } finally {
      db.close();
    }
  });
});
