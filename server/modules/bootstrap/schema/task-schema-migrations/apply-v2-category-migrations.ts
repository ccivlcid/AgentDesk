import type { DbLike } from "./types.ts";

export function applyV2CategoryMigrations(db: DbLike): void {
  const cols = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const names = new Set(cols.map((c) => c.name));

  if (!names.has("category_id")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN category_id TEXT REFERENCES categories(id)");
    } catch {
      /* already exists */
    }
  }
  if (!names.has("category_version")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN category_version INTEGER");
    } catch {
      /* already exists */
    }
  }
  if (!names.has("success_metric")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN success_metric TEXT DEFAULT '{}'");
    } catch {
      /* already exists */
    }
  }
  if (!names.has("risk_profile")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN risk_profile TEXT DEFAULT '{}'");
    } catch {
      /* already exists */
    }
  }
  if (!names.has("required_gates")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN required_gates TEXT DEFAULT '[]'");
    } catch {
      /* already exists */
    }
  }
  if (!names.has("deliverable_schema")) {
    try {
      db.exec("ALTER TABLE projects ADD COLUMN deliverable_schema TEXT DEFAULT '[]'");
    } catch {
      /* already exists */
    }
  }
  // 기존 버그 수정 — assignment_mode가 types/index.ts에 있으나 DB 컬럼 누락 케이스
  if (!names.has("assignment_mode")) {
    try {
      db.exec(
        "ALTER TABLE projects ADD COLUMN assignment_mode TEXT NOT NULL DEFAULT 'auto' CHECK(assignment_mode IN ('auto','manual'))",
      );
    } catch {
      /* already exists */
    }
  }
}
