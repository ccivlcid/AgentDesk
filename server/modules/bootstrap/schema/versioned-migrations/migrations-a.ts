import type { Migration } from "./types.ts";

export const VERSIONED_MIGRATIONS_A: Migration[] = [
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
  {
    id: "2026-03-14-003-categories-pack-key",
    up: (db) => {
      // pack_key maps each category to its execution workflow pack.
      // This bridges the project-type template system (categories) with the
      // agent-selection / prompt-routing system (workflow_pack_key).
      try {
        db.exec("ALTER TABLE categories ADD COLUMN pack_key TEXT");
      } catch { /* column may already exist */ }

      // Seed pack_key for built-in categories.
      const mappings: Array<[string, string]> = [
        ["cat_software_dev",  "development"],
        ["cat_marketing",     "asset_management"],
        ["cat_research",      "web_research_report"],
        ["cat_product_launch","development"],
        ["cat_content",       "novel"],
        ["cat_operations",    "report"],
      ];
      const stmt = db.prepare(
        "UPDATE categories SET pack_key = ? WHERE id = ? AND pack_key IS NULL",
      );
      for (const [id, packKey] of mappings) {
        stmt.run(packKey, id);
      }
    },
  },
  {
    id: "2026-03-14-004-tasks-category-id",
    up: (db) => {
      // category_id on tasks allows pack_key to be resolved via the category's pack_key,
      // giving the category system priority in workflow routing.
      try {
        db.exec("ALTER TABLE tasks ADD COLUMN category_id TEXT REFERENCES categories(id)");
      } catch { /* column may already exist */ }
    },
  },
  {
    id: "2026-03-14-005-task-token-cost",
    up: (db) => {
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_in INTEGER DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_out INTEGER DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN cost_usd REAL DEFAULT 0"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-14-007-task-handoff",
    up: (db) => {
      try { db.exec("ALTER TABLE tasks ADD COLUMN handoff_to_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE tasks ADD COLUMN handoff_condition TEXT CHECK(handoff_condition IN ('always', 'on_success', 'on_fail'))"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-14-008-watchdog-index",
    up: (db) => {
      // Composite index for watchdog queries: WHERE status='in_progress' AND execution_state IN ('running','stalled')
      // Replaces full-table scans in markStalledInProgressTasks() and recoverStalledTasks()
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_tasks_status_execstate ON tasks(status, execution_state, last_heartbeat_at DESC)",
      );
    },
  },
  {
    id: "2026-03-14-010-skill-category",
    up: (db) => {
      // 스킬 자동 분류를 위한 category 컬럼 추가
      try { db.exec("ALTER TABLE skill_learning_history ADD COLUMN category TEXT"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-14-009-enabled-scope-indexes",
    up: (db) => {
      // P2-B: Composite indexes for enabled+event_type / enabled+scope queries
      // hook_executor: WHERE enabled = 1 AND event_type = ? AND (scope_type = ...)
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_hook_entries_enabled_event ON hook_entries(enabled, event_type, scope_type, scope_id)",
      );
      // project-scoped-rules: WHERE enabled = 1 AND (scope_type = ? AND scope_id = ?)
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_agent_rules_enabled_scope ON agent_rules(enabled, scope_type, scope_id, priority DESC)",
      );
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_memory_entries_enabled_scope ON memory_entries(enabled, scope_type, scope_id, priority DESC)",
      );

      // P3-B: Composite index for anomaly detection ROW_NUMBER window query
      // agent-anomaly-monitor: SELECT agent_id, exit_code, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC)
      //   WHERE created_at >= ?
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_agent_usage_logs_anomaly ON agent_usage_logs(agent_id, created_at DESC, exit_code)",
      );
    },
  },
  {
    id: "2026-03-14-011-agent-composition-templates",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS agent_composition_templates (
          id          TEXT    PRIMARY KEY,
          name        TEXT    NOT NULL,
          description TEXT,
          nodes_json  TEXT    NOT NULL DEFAULT '[]',
          edges_json  TEXT    NOT NULL DEFAULT '[]',
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        )
      `);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_comp_templates_updated ON agent_composition_templates(updated_at DESC)",
      );
    },
  },
  {
    id: "2026-03-16-001-custom-features",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS custom_features (
          id           TEXT    PRIMARY KEY,
          name         TEXT    NOT NULL,
          type         TEXT    NOT NULL DEFAULT 'widget'
                         CHECK(type IN ('widget','app')),
          source       TEXT    NOT NULL DEFAULT 'template'
                         CHECK(source IN ('template','ai')),
          template_id  TEXT,
          config       TEXT    NOT NULL DEFAULT '{}',
          bundle       TEXT,
          status       TEXT    NOT NULL DEFAULT 'active'
                         CHECK(status IN ('active','draft','error')),
          error_msg    TEXT,
          created_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_custom_features_type_updated ON custom_features(type, updated_at DESC)",
      );
    },
  },
  {
    id: "2026-03-16-002-tasks-context-hint",
    up: (db) => {
      // Add context_hint column alongside workflow_pack_key (dual-write strategy)
      try {
        db.exec("ALTER TABLE tasks ADD COLUMN context_hint TEXT NOT NULL DEFAULT 'development'");
      } catch { /* already exists */ }
      // Back-fill context_hint from workflow_pack_key if the column exists
      try {
        db.exec("UPDATE tasks SET context_hint = COALESCE(workflow_pack_key, 'development') WHERE context_hint = 'development' AND workflow_pack_key IS NOT NULL AND workflow_pack_key != 'development'");
      } catch { /* workflow_pack_key column may not exist in minimal test DBs */ }
    },
  },
];
