import type { DbLike } from "./types.ts";

export function applyMessageAttachmentsColumn(db: DbLike): void {
  // Chat file attachments: JSON array of {id, fileName, size, mime, relativePath}
  try {
    db.exec("ALTER TABLE messages ADD COLUMN attachments TEXT");
  } catch {
    /* already exists */
  }
}

export function migrateCeoClientNaming(db: DbLike): void {
  // Migrate: rename sender_type 'ceo' → 'client' in messages table
  try {
    db.prepare("UPDATE messages SET sender_type = 'client' WHERE sender_type = 'ceo'").run();
  } catch {
    /* best effort */
  }

  // Migrate: rename 'clientName' setting key (formerly 'ceoName')
  try {
    const hasCeoName = db.prepare("SELECT 1 FROM settings WHERE key = 'ceoName' LIMIT 1").get() as
      | { 1: number }
      | undefined;
    if (hasCeoName) {
      const ceoNameRow = db.prepare("SELECT value FROM settings WHERE key = 'ceoName' LIMIT 1").get() as
        | { value: string }
        | undefined;
      const ceoNameValue = ceoNameRow?.value ?? "Client";
      const hasClientName = db.prepare("SELECT 1 FROM settings WHERE key = 'clientName' LIMIT 1").get() as
        | { 1: number }
        | undefined;
      if (!hasClientName) {
        db.prepare("INSERT INTO settings (key, value) VALUES ('clientName', ?)").run(ceoNameValue === "CEO" ? "Client" : ceoNameValue);
      }
      db.prepare("DELETE FROM settings WHERE key = 'ceoName'").run();
    }
  } catch {
    /* best effort */
  }
}
