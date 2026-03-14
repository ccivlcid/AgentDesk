import type { DatabaseSync } from "node:sqlite";

type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

export type Migration = {
  /** Unique, immutable identifier. Convention: YYYY-MM-DD-NNN-short-description */
  id: string;
  up: (db: DbLike) => void;
};

/**
 * All versioned migrations in chronological order.
 *
 * Rules:
 *  - NEVER change or remove an existing entry (it has already been applied in production).
 *  - Only APPEND new entries at the end.
 *  - Each `id` must be unique and follow the naming convention.
 *  - The `up` function runs inside a transaction — throw to abort and rollback.
 */
export const MIGRATIONS: Migration[] = [
  {
    id: "2026-03-13-001-schema-migrations-table",
    // This migration is a no-op in practice: the table is created before the loop runs.
    // It exists so that the schema_migrations table itself appears in the version log.
    up: (_db) => { /* intentionally empty */ },
  },
  {
    id: "2026-03-13-002-projects-assignment-mode",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_agents (
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          agent_id   TEXT NOT NULL REFERENCES agents(id)  ON DELETE CASCADE,
          added_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          PRIMARY KEY (project_id, agent_id)
        )
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_agents_project
          ON project_agents(project_id)
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_project_agents_agent
          ON project_agents(agent_id)
      `);
      try {
        db.exec("ALTER TABLE projects ADD COLUMN assignment_mode TEXT NOT NULL DEFAULT 'auto'");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-14-001-drop-agent-personality",
    up: (db) => {
      // Move persona content to .md files; personality column is no longer used.
      try {
        db.exec("ALTER TABLE agents DROP COLUMN personality");
      } catch { /* column may already be absent */ }
    },
  },
  {
    id: "2026-03-14-002-add-agent-persona-id",
    up: (db) => {
      // persona_id links agent to a named persona in prompts/personas/{id}.md
      try {
        db.exec("ALTER TABLE agents ADD COLUMN persona_id TEXT");
      } catch { /* column may already exist (added by task-schema-migrations) */ }
    },
  },
];

const ENSURE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         TEXT    PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
  )
`;

/**
 * Run all pending versioned migrations in order.
 *
 * - Creates the `schema_migrations` table if it doesn't exist.
 * - Skips migrations whose `id` is already recorded.
 * - Wraps each migration in an explicit transaction; rolls back and throws on failure.
 */
export function runVersionedMigrations(db: DbLike): void {
  db.exec(ENSURE_TABLE_SQL);

  const applied = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]).map((r) => r.id),
  );

  const insert = db.prepare("INSERT INTO schema_migrations (id) VALUES (?)");

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      migration.up(db);
      insert.run(migration.id);
      db.exec("COMMIT");
      console.log(`[db-migration] ✓ ${migration.id}`);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`[db-migration] FAILED: ${migration.id} — ${String(err)}`);
    }
  }
}
