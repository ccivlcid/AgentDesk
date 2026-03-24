import { DIRECTIVE_TEMPLATES } from "../../../directive-templates.ts";
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
  {
    id: "2026-03-25-001-agent-runtime-tables",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS agent_runtime_runs (
            id               TEXT PRIMARY KEY,
            task_id          TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            agent_id         TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            project_id       TEXT REFERENCES projects(id) ON DELETE SET NULL,
            status           TEXT NOT NULL DEFAULT 'pending'
                               CHECK(status IN ('pending','running','completed','failed','cancelled')),
            model            TEXT,
            provider         TEXT,
            input_tokens     INTEGER NOT NULL DEFAULT 0,
            output_tokens    INTEGER NOT NULL DEFAULT 0,
            tool_calls_count INTEGER NOT NULL DEFAULT 0,
            error_message    TEXT,
            started_at       INTEGER,
            completed_at     INTEGER,
            created_at       INTEGER NOT NULL DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_runtime_runs_task ON agent_runtime_runs(task_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_runtime_runs_agent ON agent_runtime_runs(agent_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_runtime_runs_status ON agent_runtime_runs(status)`);
      } catch { /* already exists */ }
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS agent_runtime_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id      TEXT NOT NULL REFERENCES agent_runtime_runs(id) ON DELETE CASCADE,
            seq         INTEGER NOT NULL,
            event_type  TEXT NOT NULL
                          CHECK(event_type IN ('text','tool_call','tool_result','error','status')),
            content     TEXT,
            token_count INTEGER NOT NULL DEFAULT 0,
            created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_runtime_events_run ON agent_runtime_events(run_id, seq)`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-25-002-projects-directive",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN directive TEXT`);
      } catch { /* already exists */ }
      try {
        db.exec(`ALTER TABLE projects ADD COLUMN directive_type_slug TEXT`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-25-003-categories-upsert-directive-types",
    up: (db) => {
      // Upsert 10 new project type categories from directive templates
      const upsert = db.prepare(`
        INSERT INTO categories (id, name, name_ko, slug, description, icon, color, pack_key,
          kpi_schema, risk_schema, gate_schema, deliverable_schema, is_template, owner_scope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', '[]', 1, 'global')
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          name_ko = excluded.name_ko,
          slug = excluded.slug,
          description = excluded.description,
          icon = excluded.icon,
          color = excluded.color,
          pack_key = excluded.pack_key
      `);
      for (const dt of DIRECTIVE_TEMPLATES) {
        try {
          const id = `cat_${dt.slug.replace(/-/g, "_")}`;
          upsert.run(id, dt.name, dt.name_ko, dt.slug, dt.description_ko, dt.icon, dt.color, dt.pack_key);
        } catch { /* ignore */ }
      }
    },
  },
  {
    id: "2026-03-25-005-project-agents-role",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE project_agents ADD COLUMN project_role TEXT CHECK(project_role IN ('pm','pl','dev'))`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-25-004-project-clarifications",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS project_clarifications (
            id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
            project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            question    TEXT NOT NULL,
            answer      TEXT,
            status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','answered')),
            created_at  INTEGER DEFAULT (unixepoch()*1000),
            answered_at INTEGER
          )
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_project_clarifications_project ON project_clarifications(project_id)`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-26-001-project-agents-role-label",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE project_agents ADD COLUMN project_role_label TEXT`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-26-003-messages-room-id",
    up: (db) => {
      try {
        db.exec(`ALTER TABLE messages ADD COLUMN room_id TEXT`);
      } catch { /* already exists */ }
      try {
        db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-26-004-messages-receiver-type-room",
    up: (db) => {
      // SQLite does not support ALTER COLUMN, so we must recreate the table
      // to add 'room' to the receiver_type CHECK constraint.
      const row = db
        .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'messages'`)
        .get() as { sql?: string } | undefined;
      const ddl = (row?.sql ?? "").toLowerCase();
      if (ddl.includes("'room'")) return; // already migrated

      // Determine column presence from the DDL string *before* renaming the table.
      // Avoids PRAGMA inside a SAVEPOINT which triggers "cannot start a transaction
      // within a transaction" in node:sqlite.
      const hasIdempotencyKey = ddl.includes("idempotency_key");
      const hasRoomId = ddl.includes("room_id");
      const idempotencyExpr = hasIdempotencyKey ? "idempotency_key" : "NULL";
      const roomIdExpr = hasRoomId ? "room_id" : "NULL";

      const oldTable = "messages_room_type_migration_old";
      db.exec(`ALTER TABLE messages RENAME TO ${oldTable}`);
      db.exec(`
        CREATE TABLE messages (
          id TEXT PRIMARY KEY,
          sender_type TEXT NOT NULL CHECK(sender_type IN ('client','agent','system')),
          sender_id TEXT,
          receiver_type TEXT NOT NULL CHECK(receiver_type IN ('agent','department','all','room')),
          receiver_id TEXT,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'chat' CHECK(message_type IN ('chat','task_assign','announcement','directive','report','status_update')),
          task_id TEXT REFERENCES tasks(id),
          idempotency_key TEXT,
          room_id TEXT,
          created_at INTEGER DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(`
        INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, idempotency_key, room_id, created_at)
        SELECT id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, ${idempotencyExpr}, ${roomIdExpr}, created_at
        FROM ${oldTable}
      `);
      db.exec(`DROP TABLE ${oldTable}`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_type, receiver_id, created_at DESC)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)`);
    },
  },
  {
    id: "2026-03-26-002-rule-entries",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS rule_entries (
            id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
            title       TEXT NOT NULL DEFAULT '',
            content     TEXT NOT NULL,
            category    TEXT NOT NULL DEFAULT 'general',
            scope_type  TEXT NOT NULL DEFAULT 'global'
              CHECK(scope_type IN ('global','department','agent','workflow_pack','project')),
            scope_id    TEXT,
            priority    INTEGER NOT NULL DEFAULT 50,
            enabled     INTEGER NOT NULL DEFAULT 1,
            created_at  INTEGER DEFAULT (unixepoch()*1000),
            updated_at  INTEGER DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_rule_entries_scope ON rule_entries(scope_type, scope_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_rule_entries_enabled ON rule_entries(enabled, priority DESC)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_rule_entries_enabled_scope ON rule_entries(enabled, scope_type, scope_id, priority DESC)`);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-26-003-notifications-type-expand",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS notifications_new (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK(type IN ('task_complete','task_error','task_started','decision_created','agent_error','system','cost_alert','agent_anomaly','heartbeat','kickoff')),
            title TEXT NOT NULL,
            body TEXT,
            task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
            agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
            read INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`INSERT OR IGNORE INTO notifications_new SELECT * FROM notifications`);
        db.exec(`DROP TABLE notifications`);
        db.exec(`ALTER TABLE notifications_new RENAME TO notifications`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(read, created_at DESC)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC)`);
      } catch { /* already migrated */ }
    },
  },
  {
    id: "2026-03-26-004-yolo-mode-default-on",
    up: (db) => {
      try {
        db.exec("UPDATE settings SET value = 'true' WHERE key = 'yoloMode' AND value = 'false'");
      } catch { /* ignore */ }
    },
  },
  {
    id: "2026-03-27-001-task-retry-support",
    up: (db) => {
      try { db.exec("ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE tasks ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 2"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE tasks ADD COLUMN last_error_summary TEXT"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-27-002-pm-oversight-persistence",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS pm_oversight_state (
            project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
            pm_agent_id TEXT,
            started_at INTEGER NOT NULL,
            created_at INTEGER DEFAULT (unixepoch()*1000)
          )
        `);
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-27-003-task-error-analysis",
    up: (db) => {
      try { db.exec("ALTER TABLE tasks ADD COLUMN error_analysis TEXT"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-27-004-performance-indexes",
    up: (db) => {
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_status_agent ON tasks(status, assigned_agent_id)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_task_status ON subtasks(task_id, status)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_delegated ON subtasks(delegated_task_id)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_subtasks_target_dept ON subtasks(target_department_id)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_id, sender_type, created_at DESC)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_task_logs_task_kind ON task_logs(task_id, kind, created_at DESC)"); } catch { /* */ }
    },
  },
  {
    id: "2026-03-27-005-agent-task-fitness",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS agent_task_fitness (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
            agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            task_type TEXT NOT NULL,
            success_count INTEGER NOT NULL DEFAULT 0,
            failure_count INTEGER NOT NULL DEFAULT 0,
            avg_duration_ms INTEGER NOT NULL DEFAULT 0,
            last_updated INTEGER DEFAULT (unixepoch()*1000),
            UNIQUE(agent_id, task_type)
          )
        `);
        db.exec("CREATE INDEX IF NOT EXISTS idx_agent_fitness ON agent_task_fitness(agent_id, task_type)");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-28-001-task-logs-messages-project-id",
    up: (db) => {
      try { db.exec("ALTER TABLE task_logs ADD COLUMN project_id TEXT"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE messages ADD COLUMN project_id TEXT"); } catch { /* already exists */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_task_logs_project ON task_logs(project_id, created_at DESC)"); } catch { /* */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at DESC)"); } catch { /* */ }
      // Backfill project_id from tasks where task_id is still set
      try {
        db.exec(`
          UPDATE task_logs SET project_id = (
            SELECT t.project_id FROM tasks t WHERE t.id = task_logs.task_id
          ) WHERE task_id IS NOT NULL AND project_id IS NULL
        `);
        db.exec(`
          UPDATE messages SET project_id = (
            SELECT t.project_id FROM tasks t WHERE t.id = messages.task_id
          ) WHERE task_id IS NOT NULL AND project_id IS NULL
        `);
      } catch { /* best effort backfill */ }
    },
  },
  {
    id: "2026-03-28-003-ship-automation",
    up: (db) => {
      try { db.exec("ALTER TABLE projects ADD COLUMN current_version TEXT DEFAULT '0.1.0'"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE projects ADD COLUMN auto_create_pr INTEGER DEFAULT 0"); } catch { /* already exists */ }
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS project_changelog_entries (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id),
            version TEXT NOT NULL,
            task_id TEXT,
            entry_type TEXT NOT NULL DEFAULT 'feature',
            summary TEXT NOT NULL,
            detail TEXT,
            created_at INTEGER NOT NULL
          )
        `);
      } catch { /* already exists */ }
      try {
        db.exec("CREATE INDEX IF NOT EXISTS idx_changelog_project ON project_changelog_entries(project_id, created_at DESC)");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-28-004-project-type-templates",
    up: (db) => {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS project_type_templates (
            id                      TEXT PRIMARY KEY,
            name                    TEXT NOT NULL,
            name_ko                 TEXT,
            name_ja                 TEXT,
            name_zh                 TEXT,
            description             TEXT,
            icon_svg                TEXT,
            default_directive       TEXT,
            placeholder_goal        TEXT,
            recommended_agent_count INTEGER DEFAULT 3,
            tags                    TEXT,
            is_default              INTEGER NOT NULL DEFAULT 0,
            created_at              INTEGER NOT NULL,
            updated_at              INTEGER NOT NULL
          )
        `);
      } catch { /* already exists */ }

      // Seed 5 default types
      const now = Date.now();
      const seeds: Array<{
        id: string; name: string; name_ko: string; name_ja: string; name_zh: string;
        description: string; default_directive: string; placeholder_goal: string;
        recommended_agent_count: number; tags: string;
      }> = [
        {
          id: "ptt-web-app",
          name: "Web App",
          name_ko: "웹앱",
          name_ja: "ウェブアプリ",
          name_zh: "网页应用",
          description: "Full-stack web application with frontend and backend",
          default_directive: "Build a production-ready web application. Focus on clean architecture, responsive UI, and robust API design.",
          placeholder_goal: "e.g. Build an e-commerce platform with user auth, product catalog, and checkout",
          recommended_agent_count: 4,
          tags: "frontend,backend,fullstack,web",
        },
        {
          id: "ptt-api-server",
          name: "API Server",
          name_ko: "API 서버",
          name_ja: "APIサーバー",
          name_zh: "API服务器",
          description: "Backend API service with endpoints and data models",
          default_directive: "Design and implement a RESTful API server. Prioritize clear endpoint design, validation, error handling, and documentation.",
          placeholder_goal: "e.g. Build a REST API for managing inventory with CRUD operations and auth",
          recommended_agent_count: 3,
          tags: "backend,api,server,rest",
        },
        {
          id: "ptt-chatbot",
          name: "Chatbot",
          name_ko: "챗봇",
          name_ja: "チャットボット",
          name_zh: "聊天机器人",
          description: "Conversational AI agent or chat interface",
          default_directive: "Build an intelligent chatbot. Focus on natural conversation flow, context retention, and helpful responses.",
          placeholder_goal: "e.g. Create a customer support chatbot that handles FAQs and ticket creation",
          recommended_agent_count: 2,
          tags: "chatbot,ai,conversation,nlp",
        },
        {
          id: "ptt-data-pipeline",
          name: "Data Pipeline",
          name_ko: "데이터 파이프라인",
          name_ja: "データパイプライン",
          name_zh: "数据管道",
          description: "ETL, data processing, and analytics pipeline",
          default_directive: "Build a reliable data pipeline. Focus on data quality, error handling, idempotency, and monitoring.",
          placeholder_goal: "e.g. Build an ETL pipeline that ingests CSV files, transforms data, and loads into PostgreSQL",
          recommended_agent_count: 3,
          tags: "data,etl,pipeline,analytics",
        },
        {
          id: "ptt-custom",
          name: "Custom",
          name_ko: "커스텀",
          name_ja: "カスタム",
          name_zh: "自定义",
          description: "Start from scratch with a blank template",
          default_directive: "",
          placeholder_goal: "Describe what you want to build",
          recommended_agent_count: 3,
          tags: "custom,general",
        },
      ];

      const insert = db.prepare(
        `INSERT OR IGNORE INTO project_type_templates
          (id, name, name_ko, name_ja, name_zh, description, default_directive, placeholder_goal, recommended_agent_count, tags, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      );
      for (const s of seeds) {
        insert.run(
          s.id, s.name, s.name_ko, s.name_ja, s.name_zh,
          s.description, s.default_directive, s.placeholder_goal,
          s.recommended_agent_count, s.tags, now, now,
        );
      }
    },
  },
  {
    id: "2026-03-28-005-agent-enhancements",
    up: (db) => {
      try { db.exec("ALTER TABLE agents ADD COLUMN specialty TEXT"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE agents ADD COLUMN autonomy_level TEXT DEFAULT 'balanced'"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE agents ADD COLUMN max_concurrent_tasks INTEGER DEFAULT 1"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-28-002-meeting-minutes-nullable-task-id",
    up: (db) => {
      // Rebuild meeting_minutes to make task_id nullable and remove ON DELETE CASCADE.
      // This prevents cascade-deletion of meeting minutes when a task is deleted.
      // Also add project_id so orphaned minutes can be queried by project.
      try {
        const row = db
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'meeting_minutes'")
          .get() as { sql?: string } | undefined;
        const ddl = (row?.sql ?? "").toLowerCase();
        // If project_id already exists, skip migration
        if (ddl.includes("project_id")) return;

        const oldTable = "meeting_minutes_cascade_fix_old";
        db.exec(`ALTER TABLE meeting_minutes RENAME TO ${oldTable}`);
        db.exec(`
          CREATE TABLE meeting_minutes (
            id TEXT PRIMARY KEY,
            task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
            project_id TEXT,
            meeting_type TEXT NOT NULL CHECK(meeting_type IN ('planned','review')),
            round INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','revision_requested','failed')),
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            created_at INTEGER DEFAULT (unixepoch()*1000)
          )
        `);
        db.exec(`
          INSERT INTO meeting_minutes (id, task_id, project_id, meeting_type, round, title, status, started_at, completed_at, created_at)
          SELECT mm.id, mm.task_id,
                 (SELECT t.project_id FROM tasks t WHERE t.id = mm.task_id),
                 mm.meeting_type, mm.round, mm.title, mm.status, mm.started_at, mm.completed_at, mm.created_at
          FROM ${oldTable} mm
        `);
        db.exec(`DROP TABLE ${oldTable}`);
        db.exec("CREATE INDEX IF NOT EXISTS idx_meeting_minutes_task ON meeting_minutes(task_id, started_at DESC)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_meeting_minutes_project ON meeting_minutes(project_id, started_at DESC)");
      } catch { /* already migrated */ }
    },
  },
  {
    id: "2026-03-28-006-rename-dept-to-specialty",
    up: (db) => {
      // Rename existing departments to specialty area names + add new specialty areas
      const updates: [string, string, string, string, string][] = [
        ["planning", "Planning", "기획", "企画", "企划"],
        ["dev", "Development", "개발", "開発", "开发"],
        ["design", "Design", "디자인", "デザイン", "设计"],
        ["qa", "QA/QC", "품질관리", "品質管理", "质量管理"],
        ["devsecops", "DevSecOps", "인프라보안", "インフラセキュリティ", "基础安全"],
        ["operations", "Operations", "운영", "運営", "运营"],
      ];
      const updateStmt = db.prepare(
        "UPDATE departments SET name = ?, name_ko = ?, name_ja = ?, name_zh = ? WHERE id = ?",
      );
      for (const [id, name, ko, ja, zh] of updates) {
        try { updateStmt.run(name, ko, ja, zh, id); } catch { /* ignore */ }
      }

      // Ensure all 12 specialty areas exist (INSERT OR IGNORE for idempotency)
      const insertStmt = db.prepare(
        "INSERT OR IGNORE INTO departments (id, name, name_ko, name_ja, name_zh, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );
      const allAreas: [string, string, string, string, string, string, string, number][] = [
        ["planning",   "Planning",       "기획",       "企画",             "企划",     "📊", "#f59e0b",  1],
        ["dev",        "Development",    "개발",       "開発",             "开发",     "💻", "#3b82f6",  2],
        ["design",     "Design",         "디자인",     "デザイン",          "设计",     "🎨", "#8b5cf6",  3],
        ["qa",         "QA/QC",          "품질관리",   "品質管理",          "质量管理", "🔍", "#ef4444",  4],
        ["devsecops",  "DevSecOps",      "인프라보안", "インフラセキュリティ", "基础安全", "🛡️", "#f97316",  5],
        ["operations", "Operations",     "운영",       "運営",             "运营",     "⚙️", "#10b981",  6],
        ["research",   "Research",       "리서치",     "リサーチ",          "研究",     "🔬", "#06b6d4",  7],
        ["investment", "Investment",     "투자전문",   "投資専門",          "投资专业", "📈", "#14b8a6",  8],
        ["video",      "Video/Media",    "영상전문",   "映像専門",          "视频专业", "🎬", "#e879f9",  9],
        ["data",       "Data/Analytics", "데이터분석", "データ分析",         "数据分析", "📉", "#6366f1", 10],
        ["marketing",  "Marketing",      "마케팅",     "マーケティング",     "营销",     "📢", "#f43f5e", 11],
        ["content",    "Content",        "콘텐츠",     "コンテンツ",         "内容",     "✏️", "#84cc16", 12],
      ];
      for (const [id, name, ko, ja, zh, icon, color, order] of allAreas) {
        try { insertStmt.run(id, name, ko, ja, zh, icon, color, order); } catch { /* ignore */ }
      }
    },
  },
  {
    id: "2026-03-28-007-migrate-specialty-tags",
    up: (db) => {
      // Migrate old specialty tags (frontend, backend, etc.) to new department-based IDs
      const mapping: Record<string, string> = {
        frontend: "dev",
        backend: "dev",
        devops: "devsecops",
        design: "design",
        qa: "qa",
        data: "data",
        docs: "content",
        infra: "devsecops",
      };
      const rows = db.prepare("SELECT id, specialty FROM agents WHERE specialty IS NOT NULL AND specialty != ''").all() as { id: string; specialty: string }[];
      const stmt = db.prepare("UPDATE agents SET specialty = ? WHERE id = ?");
      for (const row of rows) {
        const oldTags = row.specialty.split(",").map((s: string) => s.trim()).filter(Boolean);
        const newTags = [...new Set(oldTags.map((t: string) => mapping[t] ?? t))];
        try { stmt.run(newTags.join(","), row.id); } catch { /* ignore */ }
      }
    },
  },
  {
    id: "2026-03-28-008-promote-specialty-leaders",
    up: (db) => {
      try {
        db.exec(`
          UPDATE agents SET role = 'team_leader'
          WHERE name IN ('Albert Einstein', 'Warren Buffett', 'Alfred Hitchcock', 'Florence Nightingale', 'David Ogilvy', 'Ernest Hemingway')
          AND role = 'senior'
        `);
      } catch { /* already applied */ }
    },
  },
  {
    id: "2026-03-28-009-preserve-pm-activity-on-cascade",
    up: (db) => {
      // 1. Rebuild project_review_decision_events: project_id nullable + ON DELETE SET NULL
      //    so decision events survive project deletion.
      try {
        const row = db
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'project_review_decision_events'")
          .get() as { sql?: string } | undefined;
        const ddl = (row?.sql ?? "").toLowerCase();
        if (ddl.includes("on delete set null") && ddl.includes("project_id text references projects")) {
          // Already migrated (SET NULL on project_id FK)
        } else if (ddl.includes("project_review_decision_events")) {
          const oldTable = "project_review_decision_events_cascade_fix_old";
          db.exec("PRAGMA foreign_keys = OFF");
          try {
            db.exec("BEGIN");
            db.exec(`ALTER TABLE project_review_decision_events RENAME TO ${oldTable}`);
            db.exec(`
              CREATE TABLE project_review_decision_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
                snapshot_hash TEXT,
                event_type TEXT NOT NULL
                  CHECK(event_type IN ('planning_summary','representative_pick','followup_request','start_review_meeting')),
                summary TEXT NOT NULL,
                selected_options_json TEXT,
                note TEXT,
                task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                meeting_id TEXT REFERENCES meeting_minutes(id) ON DELETE SET NULL,
                created_at INTEGER DEFAULT (unixepoch()*1000)
              )
            `);
            db.exec(`
              INSERT INTO project_review_decision_events
                (id, project_id, snapshot_hash, event_type, summary, selected_options_json, note, task_id, meeting_id, created_at)
              SELECT id, project_id, snapshot_hash, event_type, summary, selected_options_json, note, task_id, meeting_id, created_at
              FROM ${oldTable}
            `);
            db.exec(`DROP TABLE ${oldTable}`);
            db.exec(
              "CREATE INDEX IF NOT EXISTS idx_project_review_decision_events_project ON project_review_decision_events(project_id, created_at DESC)",
            );
            db.exec("COMMIT");
          } catch (err) {
            db.exec("ROLLBACK");
            throw err;
          } finally {
            db.exec("PRAGMA foreign_keys = ON");
          }
        }
      } catch { /* already migrated or table doesn't exist */ }

      // 2. Rebuild task_execution_events: task_id ON DELETE SET NULL (was CASCADE)
      //    so execution event history survives task deletion.
      try {
        const row = db
          .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'task_execution_events'")
          .get() as { sql?: string } | undefined;
        const ddl = (row?.sql ?? "").toLowerCase();
        if (ddl.includes("on delete cascade")) {
          const oldTable = "task_execution_events_cascade_fix_old";
          db.exec("PRAGMA foreign_keys = OFF");
          try {
            db.exec("BEGIN");
            db.exec(`ALTER TABLE task_execution_events RENAME TO ${oldTable}`);
            db.exec(`
              CREATE TABLE task_execution_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                event_type TEXT NOT NULL,
                from_state TEXT,
                to_state TEXT,
                summary TEXT,
                metadata_json TEXT,
                created_at INTEGER DEFAULT (unixepoch()*1000)
              )
            `);
            db.exec(`
              INSERT INTO task_execution_events (id, task_id, event_type, from_state, to_state, summary, metadata_json, created_at)
              SELECT id, task_id, event_type, from_state, to_state, summary, metadata_json, created_at
              FROM ${oldTable}
            `);
            db.exec(`DROP TABLE ${oldTable}`);
            db.exec("CREATE INDEX IF NOT EXISTS idx_task_execution_events_task ON task_execution_events(task_id, created_at DESC)");
            db.exec("COMMIT");
          } catch (err) {
            db.exec("ROLLBACK");
            throw err;
          } finally {
            db.exec("PRAGMA foreign_keys = ON");
          }
        }
      } catch { /* already migrated or table doesn't exist */ }
    },
  },
  // ---------------------------------------------------------------------------
  // Auto-fill project_id on task_logs and messages INSERT so PM Activity
  // survives even after the parent task is deleted.
  // ---------------------------------------------------------------------------
  {
    id: "2026-03-28-010-pm-activity-project-id-triggers",
    up: (db) => {
      // Trigger: when a task_log row is inserted with a task_id but no project_id,
      // look up the task's project_id and fill it in.
      try {
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_task_logs_fill_project_id
          AFTER INSERT ON task_logs
          FOR EACH ROW
          WHEN NEW.task_id IS NOT NULL AND NEW.project_id IS NULL
          BEGIN
            UPDATE task_logs
              SET project_id = (SELECT project_id FROM tasks WHERE id = NEW.task_id)
            WHERE rowid = NEW.rowid;
          END
        `);
      } catch { /* already exists */ }

      // Trigger: same for messages table.
      try {
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS trg_messages_fill_project_id
          AFTER INSERT ON messages
          FOR EACH ROW
          WHEN NEW.task_id IS NOT NULL AND NEW.project_id IS NULL
          BEGIN
            UPDATE messages
              SET project_id = (SELECT project_id FROM tasks WHERE id = NEW.task_id)
            WHERE id = NEW.id;
          END
        `);
      } catch { /* already exists */ }

      // Re-backfill any rows that were inserted since the last migration without project_id.
      try {
        db.exec(`
          UPDATE task_logs SET project_id = (
            SELECT t.project_id FROM tasks t WHERE t.id = task_logs.task_id
          ) WHERE task_id IS NOT NULL AND project_id IS NULL
        `);
        db.exec(`
          UPDATE messages SET project_id = (
            SELECT t.project_id FROM tasks t WHERE t.id = messages.task_id
          ) WHERE task_id IS NOT NULL AND project_id IS NULL
        `);
      } catch { /* best effort */ }
    },
  },
  // ---------------------------------------------------------------------------
  // Fix: migration 009 rebuilt task_execution_events but dropped the
  // tokens_in / tokens_out / cost_usd columns added by migration 005.
  // Re-add them here.
  // ---------------------------------------------------------------------------
  {
    id: "2026-03-28-011-restore-token-cost-columns",
    up: (db) => {
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_in INTEGER DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_out INTEGER DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE task_execution_events ADD COLUMN cost_usd REAL DEFAULT 0"); } catch { /* already exists */ }
    },
  },
  // ---------------------------------------------------------------------------
  // Cleanup: drop leftover temporary tables from partial migration runs.
  // When migration 002 or 009 crashed mid-way (e.g. due to concurrent
  // processes), the renamed *_old tables may remain. Drop them safely.
  // ---------------------------------------------------------------------------
  {
    id: "2026-03-28-012-drop-stale-cascade-fix-tables",
    up: (db) => {
      try { db.exec("DROP TABLE IF EXISTS meeting_minutes_cascade_fix_old"); } catch { /* ok */ }
      try { db.exec("DROP TABLE IF EXISTS project_review_decision_events_cascade_fix_old"); } catch { /* ok */ }
      try { db.exec("DROP TABLE IF EXISTS task_execution_events_cascade_fix_old"); } catch { /* ok */ }
    },
  },
  {
    id: "2026-03-28-013-project-app-type",
    up: (db) => {
      try { db.exec("ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'project'"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE projects ADD COLUMN app_status TEXT DEFAULT NULL"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE projects ADD COLUMN app_analysis TEXT DEFAULT NULL"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE projects ADD COLUMN app_port INTEGER DEFAULT NULL"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE projects ADD COLUMN app_pid INTEGER DEFAULT NULL"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-28-014-pm-oversight-review-round",
    up: (db) => {
      try { db.exec("ALTER TABLE pm_oversight_state ADD COLUMN project_review_round INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }
    },
  },
];
