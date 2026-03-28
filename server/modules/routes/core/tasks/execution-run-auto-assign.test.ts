import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { resolveConstrainedAgentScopeForTask, selectAutoAssignableAgentForTask } from "./execution-run-auto-assign.ts";

function setupDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      name_ko TEXT NOT NULL DEFAULT '',
      name_ja TEXT NOT NULL DEFAULT '',
      name_zh TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '🏢',
      color TEXT NOT NULL DEFAULT '#64748b',
      description TEXT,
      prompt TEXT,
      sort_order INTEGER NOT NULL DEFAULT 99,
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department_id TEXT,
      role TEXT NOT NULL,
      cli_provider TEXT,
      oauth_account_id TEXT,
      avatar_emoji TEXT NOT NULL DEFAULT '🤖',
      personality TEXT,
      status TEXT NOT NULL,
      current_task_id TEXT,
      stats_tasks_done INTEGER NOT NULL DEFAULT 0,
      stats_xp INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE oauth_accounts (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      status TEXT NOT NULL
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

function insertAgent(
  db: DatabaseSync,
  input: {
    id: string;
    name: string;
    department_id: string | null;
    role?: string;
    cli_provider?: string | null;
    oauth_account_id?: string | null;
    status?: string;
    current_task_id?: string | null;
    stats_tasks_done?: number;
    created_at?: number;
  },
): void {
  db.prepare(
    `
      INSERT INTO agents (
        id, name, department_id, role, cli_provider, oauth_account_id, status, current_task_id, stats_tasks_done, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    input.id,
    input.name,
    input.department_id,
    input.role ?? "senior",
    input.cli_provider ?? "codex",
    input.oauth_account_id ?? null,
    input.status ?? "idle",
    input.current_task_id ?? null,
    input.stats_tasks_done ?? 0,
    input.created_at ?? 1,
  );
}

describe("selectAutoAssignableAgentForTask", () => {
  it("development 팩 우선 부서 순서로 자동 배정 대상을 고른다", () => {
    const db = setupDb();
    try {
      insertAgent(db, { id: "agent-dev", name: "Dev", department_id: "dev", created_at: 1 });
      insertAgent(db, { id: "agent-plan", name: "Planner", department_id: "planning", created_at: 2 });

      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: null,
      });

      expect(selected?.packKey).toBe("development");
      expect(selected?.agent.id).toBe("agent-dev");
    } finally {
      db.close();
    }
  });

  it("프로젝트 manual 모드에서는 지정 인원 범위로만 자동 배정한다", () => {
    const db = setupDb();
    try {
      insertAgent(db, { id: "agent-plan", name: "Planner", department_id: "planning", created_at: 1 });
      insertAgent(db, { id: "agent-sec", name: "Sec", department_id: "devsecops", created_at: 2 });
      db.prepare("INSERT INTO projects (id, assignment_mode) VALUES (?, ?)").run("project-1", "manual");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("project-1", "agent-sec");

      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: "project-1",
      });

      expect(selected?.agent.id).toBe("agent-sec");
    } finally {
      db.close();
    }
  });

  it("선호 부서가 비어있으면 전체 idle/break 인원으로 폴백한다", () => {
    const db = setupDb();
    try {
      insertAgent(db, {
        id: "agent-dev-working",
        name: "Busy Dev",
        department_id: "dev",
        status: "working",
        current_task_id: "task-busy",
        created_at: 1,
      });
      insertAgent(db, {
        id: "agent-sec-idle",
        name: "Idle Sec",
        department_id: "devsecops",
        status: "idle",
        created_at: 2,
      });

      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: null,
      });

      expect(selected?.agent.id).toBe("agent-sec-idle");
    } finally {
      db.close();
    }
  });

  it("manual 프로젝트면 project_agents 범위로만 배정한다", () => {
    const db = setupDb();
    try {
      insertAgent(db, { id: "pack-a", name: "Pack A", department_id: "planning", created_at: 1 });
      insertAgent(db, { id: "pack-b", name: "Pack B", department_id: "planning", created_at: 2 });
      db.prepare("INSERT INTO projects (id, assignment_mode) VALUES (?, ?)").run("project-1", "manual");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("project-1", "pack-b");

      const scope = resolveConstrainedAgentScopeForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: "project-1",
      });
      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: "project-1",
      });

      expect(scope).toEqual(["pack-b"]);
      expect(selected?.agent.id).toBe("pack-b");
    } finally {
      db.close();
    }
  });

  it("copilot 계정이 없으면 OAuth 없는 provider를 건너뛰고 다른 후보를 선택한다", () => {
    const db = setupDb();
    try {
      insertAgent(db, {
        id: "agent-copilot",
        name: "Copilot Agent",
        department_id: "dev",
        cli_provider: "copilot",
        created_at: 1,
      });
      insertAgent(db, {
        id: "agent-codex",
        name: "Codex Agent",
        department_id: "planning",
        cli_provider: "codex",
        created_at: 2,
      });

      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: null,
      });

      expect(selected?.agent.id).toBe("agent-codex");
    } finally {
      db.close();
    }
  });

  it("copilot 활성 계정이 있으면 copilot 후보를 정상 선택한다", () => {
    const db = setupDb();
    try {
      db.prepare("INSERT INTO oauth_accounts (id, provider, status) VALUES (?, ?, ?)").run(
        "oauth-gh-1",
        "github",
        "active",
      );

      insertAgent(db, {
        id: "agent-copilot",
        name: "Copilot Agent",
        department_id: "dev",
        cli_provider: "copilot",
        oauth_account_id: "oauth-gh-1",
        created_at: 1,
      });
      insertAgent(db, {
        id: "agent-codex",
        name: "Codex Agent",
        department_id: "planning",
        cli_provider: "codex",
        created_at: 2,
      });

      const selected = selectAutoAssignableAgentForTask(db, {
        workflow_pack_key: "development",
        department_id: null,
        project_id: null,
      });

      expect(selected?.agent.id).toBe("agent-copilot");
    } finally {
      db.close();
    }
  });
});
