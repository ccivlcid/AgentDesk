import type { Migration } from "./types.ts";

export const VERSIONED_MIGRATIONS_C: Migration[] = [
  {
    id: "2026-03-17-000-local-llm",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_llm_backends (
          name       TEXT PRIMARY KEY,
          installed  INTEGER NOT NULL DEFAULT 0,
          version    TEXT,
          host       TEXT NOT NULL DEFAULT 'localhost',
          port       INTEGER NOT NULL DEFAULT 11434,
          auto_start INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_llm_models (
          id             TEXT PRIMARY KEY,
          backend        TEXT NOT NULL,
          name           TEXT NOT NULL,
          display_name   TEXT,
          size_bytes     INTEGER,
          context_length INTEGER,
          notes          TEXT,
          pinned         INTEGER NOT NULL DEFAULT 0,
          created_at     INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at     INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          UNIQUE(backend, name)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS local_llm_inference_log (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          backend           TEXT NOT NULL,
          model_name        TEXT NOT NULL,
          agent_id          TEXT REFERENCES agents(id),
          task_id           TEXT REFERENCES tasks(id),
          prompt_tokens     INTEGER,
          completion_tokens INTEGER,
          tokens_per_second REAL,
          latency_ms        INTEGER,
          created_at        INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec("CREATE INDEX IF NOT EXISTS idx_llm_log_model ON local_llm_inference_log(model_name, created_at DESC)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_llm_log_agent ON local_llm_inference_log(agent_id, created_at DESC)");
      try { db.exec("ALTER TABLE agents ADD COLUMN local_llm_backend TEXT"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE agents ADD COLUMN local_llm_model TEXT"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-16-004-task-deps-gate-condition",
    up: (db) => {
      // gate_condition: expression string from a Condition node in WorkflowBuilder
      // gate_branch: which outcome branch ("true"/"false") this dependency follows
      try { db.exec("ALTER TABLE task_dependencies ADD COLUMN gate_condition TEXT"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE task_dependencies ADD COLUMN gate_branch TEXT CHECK(gate_branch IN ('true','false'))"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-17-001-workflow-schedules",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS workflow_schedules (
          id            TEXT    PRIMARY KEY,
          template_id   TEXT    NOT NULL REFERENCES agent_composition_templates(id) ON DELETE CASCADE,
          cron_expr     TEXT    NOT NULL,
          enabled       INTEGER NOT NULL DEFAULT 1,
          last_run_at   INTEGER,
          next_run_at   INTEGER,
          created_at    INTEGER NOT NULL
        )
      `);
      db.exec("CREATE INDEX IF NOT EXISTS idx_wf_schedules_next_run ON workflow_schedules(next_run_at)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_wf_schedules_template ON workflow_schedules(template_id)");
    },
  },
  {
    id: "2026-03-18-000-harness",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS harness_connections (
          platform    TEXT PRIMARY KEY,
          status      TEXT NOT NULL DEFAULT 'disconnected',
          config_json TEXT,
          created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS harness_snapshots (
          id         TEXT PRIMARY KEY,
          name       TEXT NOT NULL,
          content    TEXT NOT NULL,
          source     TEXT,
          created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
    },
  },
  {
    id: "2026-03-18-001-harness-rules",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS harness_rules (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          enabled       INTEGER NOT NULL DEFAULT 1,
          source        TEXT NOT NULL CHECK(source IN ('obsidian','notion')),
          trigger_json  TEXT NOT NULL DEFAULT '{}',
          condition_json TEXT NOT NULL DEFAULT '{}',
          action_json   TEXT NOT NULL DEFAULT '{}',
          last_fired_at INTEGER,
          created_at    INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at    INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec("CREATE INDEX IF NOT EXISTS idx_harness_rules_source ON harness_rules(source, enabled)");
    },
  },
  {
    id: "2026-03-18-002-harness-kb-sources",
    up: (db) => {
      // agents: default KB sources injected into every task prompt
      try { db.exec("ALTER TABLE agents ADD COLUMN kb_default_sources TEXT"); } catch { /* already exists */ }
      // tasks: per-task KB sources attached at creation
      try { db.exec("ALTER TABLE tasks ADD COLUMN kb_context_sources TEXT"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-19-000-rename-harness-to-synapse",
    up: (db) => {
      // Rename harness_* tables to synapse_* to align with module naming
      try { db.exec("ALTER TABLE harness_connections RENAME TO synapse_connections"); } catch { /* already renamed or doesn't exist */ }
      try { db.exec("ALTER TABLE harness_snapshots RENAME TO synapse_snapshots"); } catch { /* already renamed or doesn't exist */ }
      try { db.exec("ALTER TABLE harness_rules RENAME TO synapse_rules"); } catch { /* already renamed or doesn't exist */ }
      // Recreate index under new table name
      try { db.exec("DROP INDEX IF EXISTS idx_harness_rules_source"); } catch { /* ignore */ }
      try { db.exec("CREATE INDEX IF NOT EXISTS idx_synapse_rules_source ON synapse_rules(source, enabled)"); } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-19-001-image-generations",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS image_generations (
          id          TEXT    PRIMARY KEY,
          provider    TEXT    NOT NULL,
          model       TEXT    NOT NULL,
          prompt      TEXT    NOT NULL,
          neg_prompt  TEXT,
          width       INTEGER NOT NULL DEFAULT 1024,
          height      INTEGER NOT NULL DEFAULT 1024,
          steps       INTEGER,
          seed        INTEGER,
          file_path   TEXT    NOT NULL,
          thumb_path  TEXT,
          metadata    TEXT,
          created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_image_generations_created ON image_generations(created_at DESC)",
      );
    },
  },
];
