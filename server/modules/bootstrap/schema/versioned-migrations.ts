import logger from "../../../lib/logger.ts";
import type { DbLike, Migration } from "./versioned-migrations/types.ts";
import { VERSIONED_MIGRATIONS_A } from "./versioned-migrations/migrations-a.ts";
import { VERSIONED_MIGRATIONS_B_PROJECT_TEMPLATES } from "./versioned-migrations/migrations-b-project-templates.ts";
import { VERSIONED_MIGRATIONS_C } from "./versioned-migrations/migrations-c.ts";
import { VERSIONED_MIGRATIONS_D_2026_03_20 } from "./versioned-migrations/migrations-d-2026-03-20.ts";
import { VERSIONED_MIGRATIONS_E_RECENT } from "./versioned-migrations/migrations-e-recent.ts";

export type { Migration, DbLike } from "./versioned-migrations/types.ts";

/**
 * All versioned migrations in chronological order.
 *
 * Rules:
 *  - NEVER change or remove an existing entry (it has already been applied in production).
 *  - Only APPEND new entries at the end (add a new chunk file or extend the last chunk).
 *  - Each `id` must be unique and follow the naming convention.
 *  - The `up` function runs inside a transaction — throw to abort and rollback.
 */
export const MIGRATIONS: Migration[] = [
  ...VERSIONED_MIGRATIONS_A,
  ...VERSIONED_MIGRATIONS_B_PROJECT_TEMPLATES,
  ...VERSIONED_MIGRATIONS_C,
  ...VERSIONED_MIGRATIONS_D_2026_03_20,
  ...VERSIONED_MIGRATIONS_E_RECENT,
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
      logger.info(`[db-migration] ✓ ${migration.id}`);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`[db-migration] FAILED: ${migration.id} — ${String(err)}`);
    }
  }
}
