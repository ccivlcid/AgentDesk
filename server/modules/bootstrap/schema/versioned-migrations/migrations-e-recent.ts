import type { Migration } from "./types.ts";

export const VERSIONED_MIGRATIONS_E_RECENT: Migration[] = [
  {
    id: "2026-03-21-001-project-deliverable-checks",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_deliverable_checks (
          id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
          project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          key         TEXT NOT NULL,
          label       TEXT NOT NULL,
          checked     INTEGER NOT NULL DEFAULT 0 CHECK(checked IN (0,1)),
          checked_at  INTEGER,
          note        TEXT,
          created_at  INTEGER DEFAULT (unixepoch()*1000),
          updated_at  INTEGER DEFAULT (unixepoch()*1000),
          UNIQUE(project_id, key)
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_deliverable_checks_project ON project_deliverable_checks(project_id)`);
    },
  },
  {
    id: "2026-03-21-002-project-sources",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_sources (
          id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
          project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          source_project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          label             TEXT,
          sort_order        INTEGER DEFAULT 0,
          created_at        INTEGER DEFAULT (unixepoch()*1000),
          UNIQUE(project_id, source_project_id)
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_project_sources_project ON project_sources(project_id)`);
    },
  },
  {
    id: "2026-03-22-001-project-folders",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_folders (
          id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          name        TEXT NOT NULL,
          base_path   TEXT NOT NULL,
          color       TEXT NOT NULL DEFAULT '#f59e0b',
          icon        TEXT,
          sort_order  INTEGER NOT NULL DEFAULT 0,
          created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
    },
  },
  {
    id: "2026-03-22-002-projects-folder-id",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN folder_id TEXT REFERENCES project_folders(id) ON DELETE SET NULL`);
      } catch { /* already exists */ }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_folder_id ON projects(folder_id)`);
    },
  },
  {
    id: "2026-03-23-001-agents-enable-planning-phase",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE agents ADD COLUMN enable_planning_phase INTEGER NOT NULL DEFAULT 1`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-23-001-hook-entries-project-scope",
    up: (db) => {
      // Add 'project' to hook_entries scope_type CHECK constraint.
      // SQLite does not support ALTER TABLE ... MODIFY COLUMN, so recreate the table.
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS hook_entries_v2 (
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
          )
        `);
        db.exec(`INSERT INTO hook_entries_v2 SELECT * FROM hook_entries`);
        db.exec(`DROP TABLE hook_entries`);
        db.exec(`ALTER TABLE hook_entries_v2 RENAME TO hook_entries`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_hook_entries_scope ON hook_entries(scope_type, scope_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_hook_entries_event_type ON hook_entries(event_type)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_hook_entries_enabled ON hook_entries(enabled, priority DESC)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_hook_entries_enabled_event ON hook_entries(enabled, event_type, scope_type, scope_id)`);
      } catch { /* already updated or table absent */ }
    },
  },
  {
    id: "2026-03-24-001-custom-features-icon-svg",
    up: (db) => {
      try {
        db.exec("ALTER TABLE custom_features ADD COLUMN icon_svg TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-24-002-custom-features-progress-log",
    up: (db) => {
      try {
        db.exec("ALTER TABLE custom_features ADD COLUMN progress_log TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-24-003-custom-features-pending-install-status",
    up: (db) => {
      // SQLite does not support ALTER TABLE MODIFY COLUMN.
      // Recreate custom_features with updated CHECK constraint to include 'pending_install'.
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS custom_features_v2 (
            id           TEXT    PRIMARY KEY,
            name         TEXT    NOT NULL,
            type         TEXT    NOT NULL DEFAULT 'app'
                           CHECK(type IN ('widget','app')),
            source       TEXT    NOT NULL DEFAULT 'template'
                           CHECK(source IN ('template','ai')),
            template_id  TEXT,
            config       TEXT    NOT NULL DEFAULT '{}',
            bundle       TEXT,
            status       TEXT    NOT NULL DEFAULT 'active'
                           CHECK(status IN ('active','draft','pending_install','error')),
            error_msg    TEXT,
            icon_svg     TEXT,
            progress_log TEXT,
            created_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000),
            updated_at   INTEGER NOT NULL DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`
          INSERT OR IGNORE INTO custom_features_v2
            (id, name, type, source, template_id, config, bundle, status, error_msg, icon_svg, progress_log, created_at, updated_at)
          SELECT
            id, name, type, source, template_id, config, bundle,
            CASE WHEN status IN ('active','draft','pending_install','error') THEN status ELSE 'active' END,
            error_msg, icon_svg, progress_log, created_at, updated_at
          FROM custom_features
        `);
        db.exec("DROP TABLE custom_features");
        db.exec("ALTER TABLE custom_features_v2 RENAME TO custom_features");
        db.exec("CREATE INDEX IF NOT EXISTS idx_custom_features_type_updated ON custom_features(type, updated_at DESC)");
      } catch { /* already migrated */ }
    },
  },
  {
    id: "2026-03-23-002-memory-entries-project-scope",
    up: (db) => {
      // Add 'project' to memory_entries scope_type CHECK constraint.
      // SQLite does not support ALTER TABLE ... MODIFY COLUMN, so recreate the table.
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS memory_entries_v2 (
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
          )
        `);
        db.exec(`INSERT INTO memory_entries_v2 SELECT * FROM memory_entries`);
        db.exec(`DROP TABLE memory_entries`);
        db.exec(`ALTER TABLE memory_entries_v2 RENAME TO memory_entries`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_scope ON memory_entries(scope_type, scope_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_category ON memory_entries(category)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_enabled ON memory_entries(enabled, priority DESC)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_enabled_scope ON memory_entries(enabled, scope_type, scope_id, priority DESC)`);
      } catch { /* already updated or table absent */ }
    },
  },
];
