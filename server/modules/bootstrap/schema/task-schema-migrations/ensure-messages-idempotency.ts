import type { DbLike } from "./types.ts";

export function ensureMessagesIdempotencySchema(db: DbLike): void {
  try {
    db.exec("ALTER TABLE messages ADD COLUMN idempotency_key TEXT");
  } catch {
    /* already exists */
  }

  db.prepare(
    `
    UPDATE messages
    SET idempotency_key = NULL
    WHERE idempotency_key IS NOT NULL
      AND TRIM(idempotency_key) = ''
  `,
  ).run();

  const duplicateKeys = db
    .prepare(
      `
    SELECT idempotency_key
    FROM messages
    WHERE idempotency_key IS NOT NULL
    GROUP BY idempotency_key
    HAVING COUNT(*) > 1
  `,
    )
    .all() as Array<{ idempotency_key: string }>;

  for (const row of duplicateKeys) {
    const keep = db
      .prepare(
        `
      SELECT id
      FROM messages
      WHERE idempotency_key = ?
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `,
      )
      .get(row.idempotency_key) as { id: string } | undefined;
    if (!keep) continue;
    db.prepare(
      `
      UPDATE messages
      SET idempotency_key = NULL
      WHERE idempotency_key = ?
        AND id != ?
    `,
    ).run(row.idempotency_key, keep.id);
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency_key
    ON messages(idempotency_key)
    WHERE idempotency_key IS NOT NULL
  `);

  // Webhooks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT NOT NULL DEFAULT '["task_done"]',
      enabled INTEGER NOT NULL DEFAULT 1,
      secret TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Task execution timeout (minutes). 0 = no timeout (default).
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN timeout_minutes INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* already exists */
  }

  // Performance indexes: enabled + scope composite indexes for rules/memory/hooks
  // and agent_id+created_at for anomaly detection queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_rules_enabled_scope
    ON agent_rules(enabled, scope_type, scope_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memory_entries_enabled_scope
    ON memory_entries(enabled, scope_type, scope_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hook_entries_enabled_event_scope
    ON hook_entries(enabled, event_type, scope_type, scope_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_agent_usage_agent_time
    ON agent_usage_logs(agent_id, created_at DESC)
  `);
}
