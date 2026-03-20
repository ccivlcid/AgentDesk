import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";

export function migrateMessagesDirectiveType(db: DbLike): void {
  const row = db
    .prepare(
      `
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'messages'
  `,
    )
    .get() as { sql?: string } | undefined;
  const ddl = (row?.sql ?? "").toLowerCase();
  if (ddl.includes("'directive'")) return;

  logger.info("[AgentDesk] Migrating messages.message_type CHECK to include 'directive'");
  const oldTable = "messages_directive_migration_old";
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("BEGIN");
    try {
      db.exec(`ALTER TABLE messages RENAME TO ${oldTable}`);
      const oldCols = db.prepare(`PRAGMA table_info(${oldTable})`).all() as Array<{ name: string }>;
      const hasIdempotencyKey = oldCols.some((c) => c.name === "idempotency_key");
      const idempotencyExpr = hasIdempotencyKey ? "idempotency_key" : "NULL";
      db.exec(`
        CREATE TABLE messages (
          id TEXT PRIMARY KEY,
          sender_type TEXT NOT NULL CHECK(sender_type IN ('client','agent','system')),
          sender_id TEXT,
          receiver_type TEXT NOT NULL CHECK(receiver_type IN ('agent','department','all')),
          receiver_id TEXT,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'chat' CHECK(message_type IN ('chat','task_assign','announcement','directive','report','status_update')),
          task_id TEXT REFERENCES tasks(id),
          idempotency_key TEXT,
          created_at INTEGER DEFAULT (unixepoch()*1000)
        );
      `);
      db.exec(`
        INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, idempotency_key, created_at)
        SELECT id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, ${idempotencyExpr}, created_at
        FROM ${oldTable};
      `);
      db.exec(`DROP TABLE ${oldTable}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      // Restore original table if migration failed
      try {
        db.exec(`ALTER TABLE ${oldTable} RENAME TO messages`);
      } catch {
        /* */
      }
      throw e;
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
  // Recreate index
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_type, receiver_id, created_at DESC)");
}
