import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";

/**
 * Add 'project' to scope_type CHECK constraint for agent_rules, memory_entries, hook_entries.
 * Also create project_skills table for per-project skill activation.
 */
export function migrateProjectScopeType(db: DbLike): void {
  // --- agent_rules ---
  const arDdl = (
    db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'agent_rules'").get() as
      | { sql?: string }
      | undefined
  )?.sql ?? "";
  if (arDdl && !arDdl.includes("'project'")) {
    logger.info("[AgentDesk] Migrating agent_rules.scope_type CHECK to include 'project'");
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN");
      try {
        db.exec("ALTER TABLE agent_rules RENAME TO agent_rules_scope_migration_old");
        db.exec(`
          CREATE TABLE agent_rules (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            title_ko TEXT NOT NULL DEFAULT '',
            title_ja TEXT NOT NULL DEFAULT '',
            title_zh TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            rule_content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'general'
              CHECK(category IN ('coding','communication','quality','execution','security','workflow','general')),
            scope_type TEXT NOT NULL DEFAULT 'global'
              CHECK(scope_type IN ('global','department','agent','workflow_pack','project')),
            scope_id TEXT,
            priority INTEGER NOT NULL DEFAULT 50,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER DEFAULT (unixepoch()*1000),
            updated_at INTEGER DEFAULT (unixepoch()*1000)
          );
        `);
        db.exec(`
          INSERT INTO agent_rules (id, title, title_ko, title_ja, title_zh, description, rule_content, category, scope_type, scope_id, priority, enabled, created_at, updated_at)
          SELECT id, title, title_ko, title_ja, title_zh, description, rule_content, category, scope_type, scope_id, priority, enabled, created_at, updated_at
          FROM agent_rules_scope_migration_old;
        `);
        db.exec("DROP TABLE agent_rules_scope_migration_old");
        db.exec("CREATE INDEX IF NOT EXISTS idx_agent_rules_scope ON agent_rules(scope_type, scope_id)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_agent_rules_category ON agent_rules(category)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_agent_rules_enabled ON agent_rules(enabled, priority DESC)");
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        try { db.exec("ALTER TABLE agent_rules_scope_migration_old RENAME TO agent_rules"); } catch { /* */ }
        throw e;
      }
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }

  // --- memory_entries ---
  const meDdl = (
    db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'memory_entries'").get() as
      | { sql?: string }
      | undefined
  )?.sql ?? "";
  if (meDdl && !meDdl.includes("'project'")) {
    logger.info("[AgentDesk] Migrating memory_entries.scope_type CHECK to include 'project'");
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN");
      try {
        db.exec("ALTER TABLE memory_entries RENAME TO memory_entries_scope_migration_old");
        db.exec(`
          CREATE TABLE memory_entries (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            title_ko TEXT NOT NULL DEFAULT '',
            title_ja TEXT NOT NULL DEFAULT '',
            title_zh TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'context'
              CHECK(category IN ('context','preference','convention','knowledge','instruction','reference')),
            scope_type TEXT NOT NULL DEFAULT 'global'
              CHECK(scope_type IN ('global','department','agent','workflow_pack','project')),
            scope_id TEXT,
            priority INTEGER NOT NULL DEFAULT 50,
            enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER DEFAULT (unixepoch()*1000),
            updated_at INTEGER DEFAULT (unixepoch()*1000)
          );
        `);
        db.exec(`
          INSERT INTO memory_entries (id, title, title_ko, title_ja, title_zh, description, content, category, scope_type, scope_id, priority, enabled, created_at, updated_at)
          SELECT id, title, title_ko, title_ja, title_zh, description, content, category, scope_type, scope_id, priority, enabled, created_at, updated_at
          FROM memory_entries_scope_migration_old;
        `);
        db.exec("DROP TABLE memory_entries_scope_migration_old");
        db.exec("CREATE INDEX IF NOT EXISTS idx_memory_entries_scope ON memory_entries(scope_type, scope_id)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_memory_entries_enabled ON memory_entries(enabled, priority DESC)");
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        try { db.exec("ALTER TABLE memory_entries_scope_migration_old RENAME TO memory_entries"); } catch { /* */ }
        throw e;
      }
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }

  // --- hook_entries ---
  const heDdl = (
    db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'hook_entries'").get() as
      | { sql?: string }
      | undefined
  )?.sql ?? "";
  if (heDdl && !heDdl.includes("'project'")) {
    logger.info("[AgentDesk] Migrating hook_entries.scope_type CHECK to include 'project'");
    db.exec("PRAGMA foreign_keys = OFF");
    try {
      db.exec("BEGIN");
      try {
        db.exec("ALTER TABLE hook_entries RENAME TO hook_entries_scope_migration_old");
        db.exec(`
          CREATE TABLE hook_entries (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            title_ko TEXT NOT NULL DEFAULT '',
            title_ja TEXT NOT NULL DEFAULT '',
            title_zh TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            command TEXT NOT NULL,
            event_type TEXT NOT NULL DEFAULT 'pre-task'
              CHECK(event_type IN ('pre-task','post-task','on-error','on-complete','on-status-change','on-start')),
            working_directory TEXT NOT NULL DEFAULT '',
            timeout_ms INTEGER NOT NULL DEFAULT 30000,
            scope_type TEXT NOT NULL DEFAULT 'global'
              CHECK(scope_type IN ('global','department','agent','workflow_pack','project')),
            scope_id TEXT,
            priority INTEGER NOT NULL DEFAULT 50,
            enabled INTEGER NOT NULL DEFAULT 1,
            execution_count INTEGER NOT NULL DEFAULT 0,
            last_executed_at INTEGER,
            created_at INTEGER DEFAULT (unixepoch()*1000),
            updated_at INTEGER DEFAULT (unixepoch()*1000)
          );
        `);
        db.exec(`
          INSERT INTO hook_entries (id, title, title_ko, title_ja, title_zh, description, command, event_type, working_directory, timeout_ms, scope_type, scope_id, priority, enabled, execution_count, last_executed_at, created_at, updated_at)
          SELECT id, title, title_ko, title_ja, title_zh, description, command, event_type, working_directory, timeout_ms, scope_type, scope_id, priority, enabled, execution_count, last_executed_at, created_at, updated_at
          FROM hook_entries_scope_migration_old;
        `);
        db.exec("DROP TABLE hook_entries_scope_migration_old");
        db.exec("CREATE INDEX IF NOT EXISTS idx_hook_entries_scope ON hook_entries(scope_type, scope_id)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_hook_entries_event_type ON hook_entries(event_type)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_hook_entries_enabled ON hook_entries(enabled, priority DESC)");
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        try { db.exec("ALTER TABLE hook_entries_scope_migration_old RENAME TO hook_entries"); } catch { /* */ }
        throw e;
      }
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  }

  // --- project_skills (new table) ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_skills (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL,
      repo TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()*1000),
      PRIMARY KEY (project_id, skill_id)
    );
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_project_skills_project ON project_skills(project_id)");
}
