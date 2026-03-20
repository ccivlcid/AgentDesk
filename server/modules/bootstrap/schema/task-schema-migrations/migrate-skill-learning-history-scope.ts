import type { DbLike } from "./types.ts";

/**
 * Add scope_type and scope_id columns to skill_learning_history.
 * Skills are now project-scoped by default (like rules/memory/hooks),
 * instead of the previous global opt-out model via project_skills.
 */
export function migrateSkillLearningHistoryScope(db: DbLike): void {
  const cols = db.prepare("PRAGMA table_info(skill_learning_history)").all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("scope_type")) {
    try {
      db.exec(
        "ALTER TABLE skill_learning_history ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'global' CHECK(scope_type IN ('global','project','agent','department'))",
      );
    } catch {
      /* already exists */
    }
  }
  if (!names.has("scope_id")) {
    try {
      db.exec("ALTER TABLE skill_learning_history ADD COLUMN scope_id TEXT");
    } catch {
      /* already exists */
    }
  }
}
