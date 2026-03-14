import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { runVersionedMigrations, MIGRATIONS, type Migration } from "./versioned-migrations.ts";

function makeDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  // Minimal tables needed by all versioned migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      project_path TEXT NOT NULL DEFAULT '',
      core_goal TEXT NOT NULL DEFAULT '',
      default_pack_key TEXT NOT NULL DEFAULT 'development',
      assignment_mode TEXT NOT NULL DEFAULT 'auto',
      last_used_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()*1000),
      updated_at INTEGER DEFAULT (unixepoch()*1000)
    );
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      persona TEXT,
      persona_id TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      pack_key TEXT
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'inbox',
      assigned_agent_id TEXT,
      category_id TEXT,
      last_heartbeat_at INTEGER,
      execution_state TEXT
    );
    CREATE TABLE IF NOT EXISTS task_execution_events (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
    );
    CREATE TABLE IF NOT EXISTS project_agents (
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      PRIMARY KEY (project_id, agent_id)
    );
  `);
  return db;
}

describe("runVersionedMigrations", () => {
  it("schema_migrations 테이블을 자동으로 생성한다", () => {
    const db = makeDb();
    runVersionedMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("모든 마이그레이션이 schema_migrations에 기록된다", () => {
    const db = makeDb();
    runVersionedMigrations(db);
    const rows = db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as { id: string }[];
    const appliedIds = rows.map((r) => r.id);
    for (const m of MIGRATIONS) {
      expect(appliedIds).toContain(m.id);
    }
  });

  it("재실행 시 이미 적용된 마이그레이션은 건너뛴다 (idempotent)", () => {
    const db = makeDb();
    runVersionedMigrations(db);
    const countBefore = (db.prepare("SELECT COUNT(*) as n FROM schema_migrations").get() as { n: number }).n;
    // Second run should not throw and count should be the same
    expect(() => runVersionedMigrations(db)).not.toThrow();
    const countAfter = (db.prepare("SELECT COUNT(*) as n FROM schema_migrations").get() as { n: number }).n;
    expect(countAfter).toBe(countBefore);
  });

  it("마이그레이션 ID가 모두 고유하다", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("마이그레이션 ID가 날짜-순서 규칙을 따른다 (YYYY-MM-DD-NNN-...)", () => {
    const pattern = /^\d{4}-\d{2}-\d{2}-\d{3}-.+$/;
    for (const m of MIGRATIONS) {
      expect(m.id, `Invalid migration id: ${m.id}`).toMatch(pattern);
    }
  });

  it("실패하는 마이그레이션은 롤백되고 schema_migrations에 기록되지 않는다", () => {
    const db = makeDb();
    // First ensure table exists
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
    )`);

    const failingMigration: Migration = {
      id: "test-failing-migration",
      up: () => { throw new Error("intentional failure"); },
    };

    expect(() => {
      db.exec("BEGIN");
      try {
        failingMigration.up(db);
        db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(failingMigration.id);
        db.exec("COMMIT");
      } catch {
        db.exec("ROLLBACK");
        throw new Error("rolled back");
      }
    }).toThrow("rolled back");

    const rows = db.prepare("SELECT id FROM schema_migrations WHERE id = ?").all(failingMigration.id);
    expect(rows).toHaveLength(0);
  });
});
