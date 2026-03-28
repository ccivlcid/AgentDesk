import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import { resolveDirectiveLeaderCandidateScope } from "./directive-leader-scope.ts";

function setupDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      default_pack_key TEXT NOT NULL DEFAULT 'development',
      assignment_mode TEXT NOT NULL DEFAULT 'auto'
    );

    CREATE TABLE project_agents (
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL
    );

    CREATE TABLE agents (
      id TEXT PRIMARY KEY,
      department_id TEXT
    );
  `);
  return db;
}

function sorted(values: string[] | null): string[] | null {
  return Array.isArray(values) ? [...values].sort() : null;
}

describe("resolveDirectiveLeaderCandidateScope", () => {
  it("manual 프로젝트면 project_agents 범위로 스코프를 제한한다", () => {
    const db = setupDb();
    try {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("officeWorkflowPack", "development");

      db.prepare("INSERT INTO projects (id, default_pack_key, assignment_mode) VALUES (?, ?, 'manual')").run(
        "proj-manual",
        "development",
      );

      db.prepare("INSERT INTO agents (id, department_id) VALUES (?, ?)").run("planning-global", "planning");
      db.prepare("INSERT INTO agents (id, department_id) VALUES (?, ?)").run("planning-assigned", "planning");
      db.prepare("INSERT INTO agents (id, department_id) VALUES (?, ?)").run("dev-assigned", "dev");

      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-manual", "planning-assigned");
      db.prepare("INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)").run("proj-manual", "dev-assigned");

      const scope = resolveDirectiveLeaderCandidateScope(db, "proj-manual");
      expect(sorted(scope)).toEqual(sorted(["planning-assigned"]));
      expect(scope).not.toContain("planning-global");
      const devScope = resolveDirectiveLeaderCandidateScope(db, "proj-manual", "dev");
      expect(sorted(devScope)).toEqual(sorted(["dev-assigned"]));
    } finally {
      db.close();
    }
  });

  it("활성 오피스팩/프로젝트 스코프가 없으면 null을 반환한다", () => {
    const db = setupDb();
    try {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("officeWorkflowPack", "development");
      const scope = resolveDirectiveLeaderCandidateScope(db, null);
      expect(scope).toBeNull();
    } finally {
      db.close();
    }
  });
});
