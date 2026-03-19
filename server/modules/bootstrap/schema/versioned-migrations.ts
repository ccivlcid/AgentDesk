import type { DatabaseSync } from "node:sqlite";
import logger from "../../../lib/logger.ts";

type DbLike = Pick<DatabaseSync, "exec" | "prepare">;

export type Migration = {
  /** Unique, immutable identifier. Convention: YYYY-MM-DD-NNN-short-description */
  id: string;
  up: (db: DbLike) => void;
};

/**
 * All versioned migrations in chronological order.
 *
 * Rules:
 *  - NEVER change or remove an existing entry (it has already been applied in production).
 *  - Only APPEND new entries at the end.
 *  - Each `id` must be unique and follow the naming convention.
 *  - The `up` function runs inside a transaction — throw to abort and rollback.
 */
export const MIGRATIONS: Migration[] = [
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
  {
    id: "2026-03-16-003-project-templates",
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          description TEXT,
          category    TEXT NOT NULL DEFAULT 'general',
          default_pack_key TEXT NOT NULL DEFAULT 'development',
          core_goal_template TEXT NOT NULL DEFAULT '',
          is_builtin  INTEGER NOT NULL DEFAULT 0,
          created_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000),
          updated_at  INTEGER NOT NULL DEFAULT (unixepoch()*1000)
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_template_objectives (
          id          TEXT PRIMARY KEY,
          template_id TEXT NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          description TEXT,
          order_index INTEGER NOT NULL DEFAULT 0
        )
      `);
      db.exec(`
        CREATE TABLE IF NOT EXISTS project_template_gates (
          id          TEXT PRIMARY KEY,
          template_id TEXT NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
          title       TEXT NOT NULL,
          description TEXT,
          gate_type   TEXT NOT NULL DEFAULT 'milestone',
          order_index INTEGER NOT NULL DEFAULT 0
        )
      `);
      // Seed built-in templates
      const templates: Array<{
        id: string; name: string; description: string; category: string;
        default_pack_key: string; core_goal_template: string;
        objectives: Array<{ title: string; description: string }>;
        gates: Array<{ title: string; description: string; gate_type: string }>;
      }> = [
        {
          id: "builtin-web-app",
          name: "Web Application",
          description: "Full-stack web app development",
          category: "development",
          default_pack_key: "development",
          core_goal_template: "Build and ship a production-ready web application with well-tested frontend and backend.",
          objectives: [
            { title: "Requirements & Architecture", description: "Define technical stack, system design, and API contracts" },
            { title: "Core Feature Implementation", description: "Implement all MVP features with unit tests" },
            { title: "QA & Performance", description: "End-to-end testing, load testing, and performance tuning" },
            { title: "Deployment & Monitoring", description: "CI/CD pipeline, production deployment, and alerting setup" },
          ],
          gates: [
            { title: "Design Review", description: "Architecture and UI/UX design approved", gate_type: "review" },
            { title: "MVP Complete", description: "All core features implemented and passing tests", gate_type: "milestone" },
            { title: "Security Audit", description: "OWASP checklist and dependency vulnerability scan passed", gate_type: "review" },
            { title: "Production Release", description: "Deployed to production with monitoring active", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-research-report",
          name: "Research Report",
          description: "Deep-dive research and structured report",
          category: "research",
          default_pack_key: "web_research_report",
          core_goal_template: "Produce a comprehensive research report with data-backed findings and actionable recommendations.",
          objectives: [
            { title: "Research Scope Definition", description: "Define questions, sources, and methodology" },
            { title: "Data Collection", description: "Gather data from authoritative sources" },
            { title: "Analysis & Synthesis", description: "Identify patterns, insights, and key findings" },
            { title: "Report Writing", description: "Structure findings into a clear, actionable report" },
          ],
          gates: [
            { title: "Scope Approved", description: "Research questions and methodology validated", gate_type: "review" },
            { title: "Data Collection Complete", description: "All primary sources gathered and verified", gate_type: "milestone" },
            { title: "Draft Review", description: "First draft reviewed and feedback incorporated", gate_type: "review" },
            { title: "Final Delivery", description: "Final report approved and delivered", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-video-production",
          name: "Video Production",
          description: "Video content creation pipeline",
          category: "media",
          default_pack_key: "video_preprod",
          core_goal_template: "Produce a polished video from concept to final delivery with clear narrative and high production quality.",
          objectives: [
            { title: "Concept & Script", description: "Develop concept, script, and storyboard" },
            { title: "Pre-production", description: "Gather assets, record voiceover, prepare visuals" },
            { title: "Production & Editing", description: "Assemble footage, edit, add effects and music" },
            { title: "Review & Export", description: "Review passes, color grade, export for distribution" },
          ],
          gates: [
            { title: "Script Approved", description: "Script and storyboard signed off", gate_type: "review" },
            { title: "Assets Ready", description: "All raw assets collected and organized", gate_type: "milestone" },
            { title: "Rough Cut Review", description: "First assembly reviewed", gate_type: "review" },
            { title: "Final Export", description: "Final version exported in all required formats", gate_type: "milestone" },
          ],
        },
        {
          id: "builtin-data-analysis",
          name: "Data Analysis",
          description: "Data exploration and insights project",
          category: "data",
          default_pack_key: "development",
          core_goal_template: "Analyze datasets to surface actionable insights and deliver clear visualizations and recommendations.",
          objectives: [
            { title: "Data Acquisition & Cleaning", description: "Collect, validate, and clean source datasets" },
            { title: "Exploratory Analysis", description: "Statistical profiling and pattern discovery" },
            { title: "Modeling & Insights", description: "Build models or dashboards to answer key questions" },
            { title: "Documentation & Handoff", description: "Document methodology and deliver reproducible results" },
          ],
          gates: [
            { title: "Data Quality Sign-off", description: "Source data validated and cleaned", gate_type: "review" },
            { title: "EDA Complete", description: "Exploratory analysis finished, hypotheses formed", gate_type: "milestone" },
            { title: "Insights Review", description: "Findings reviewed with stakeholders", gate_type: "review" },
            { title: "Delivery", description: "Final analysis and documentation delivered", gate_type: "milestone" },
          ],
        },
      ];

      const insertTemplate = db.prepare(
        "INSERT OR IGNORE INTO project_templates (id, name, description, category, default_pack_key, core_goal_template, is_builtin) VALUES (?, ?, ?, ?, ?, ?, 1)"
      );
      const insertObjective = db.prepare(
        "INSERT OR IGNORE INTO project_template_objectives (id, template_id, title, description, order_index) VALUES (?, ?, ?, ?, ?)"
      );
      const insertGate = db.prepare(
        "INSERT OR IGNORE INTO project_template_gates (id, template_id, title, description, gate_type, order_index) VALUES (?, ?, ?, ?, ?, ?)"
      );

      for (const tpl of templates) {
        insertTemplate.run(tpl.id, tpl.name, tpl.description, tpl.category, tpl.default_pack_key, tpl.core_goal_template);
        tpl.objectives.forEach((obj, i) => {
          insertObjective.run(`${tpl.id}-obj-${i}`, tpl.id, obj.title, obj.description, i);
        });
        tpl.gates.forEach((gate, i) => {
          insertGate.run(`${tpl.id}-gate-${i}`, tpl.id, gate.title, gate.description, gate.gate_type, i);
        });
      }
    },
  },
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
  {
    id: "2026-03-20-001-tasks-figma-url",
    up: (db) => {
      try {
        db.exec("ALTER TABLE tasks ADD COLUMN figma_url TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-20-002-projects-figma-url",
    up: (db) => {
      try {
        db.exec("ALTER TABLE projects ADD COLUMN figma_url TEXT");
      } catch { /* already exists */ }
    },
  },
  {
    id: "2026-03-20-003-category-design",
    up: (db) => {
      const existing = db.prepare("SELECT id FROM categories WHERE id = 'cat_design'").get();
      if (!existing) {
        const now = Date.now();
        db.prepare(`
          INSERT INTO categories (
            id, name, name_ko, description, icon, color, slug,
            kpi_schema, risk_schema, gate_schema, deliverable_schema,
            pack_key, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          "cat_design", "Design & Figma", "디자인 & Figma",
          "Figma 디자인을 코드로 연결할 때 사용해요. 컴포넌트 분석, 코드 생성, 리뷰를 지원해요.",
          "pen-tool", "#f24e1e", "design",
          JSON.stringify([
            { key: "components_built",  label: "컴포넌트 구현 수",   type: "number"  },
            { key: "design_accuracy",   label: "디자인 일치율 (%)",  type: "percent" },
            { key: "accessibility",     label: "접근성 점수 (%)",    type: "percent" },
          ]),
          JSON.stringify([
            { key: "design_drift",      label: "디자인 불일치",      severity: "high"   },
            { key: "component_drift",   label: "컴포넌트 드리프트",   severity: "medium" },
            { key: "accessibility_gap", label: "접근성 미흡",         severity: "medium" },
          ]),
          JSON.stringify([
            { key: "design_review",     label: "디자인 검토",         sort_order: 1 },
            { key: "component_review",  label: "컴포넌트 코드 리뷰",  sort_order: 2 },
            { key: "handoff_approval",  label: "핸드오프 승인",       sort_order: 3 },
          ]),
          JSON.stringify([
            { key: "design_spec",       label: "디자인 명세서",       type: "document" },
            { key: "component_code",    label: "컴포넌트 코드",       type: "spec"     },
            { key: "design_review_report", label: "디자인 검토 보고서", type: "report" },
          ]),
          "development", now, now,
        );
      }
    },
  },
  {
    id: "2026-03-20-004-category-design-schemas",
    up: (db) => {
      // 빈 스키마로 INSERT된 기존 cat_design 레코드에 올바른 스키마 채우기
      db.prepare(`
        UPDATE categories SET
          kpi_schema        = ?,
          risk_schema       = ?,
          gate_schema       = ?,
          deliverable_schema = ?
        WHERE id = 'cat_design'
          AND (kpi_schema = '[]' OR kpi_schema IS NULL)
      `).run(
        JSON.stringify([
          { key: "components_built", label: "컴포넌트 구현 수",  type: "number"  },
          { key: "design_accuracy",  label: "디자인 일치율 (%)", type: "percent" },
          { key: "accessibility",    label: "접근성 점수 (%)",   type: "percent" },
        ]),
        JSON.stringify([
          { key: "design_drift",      label: "디자인 불일치",    severity: "high"   },
          { key: "component_drift",   label: "컴포넌트 드리프트", severity: "medium" },
          { key: "accessibility_gap", label: "접근성 미흡",       severity: "medium" },
        ]),
        JSON.stringify([
          { key: "design_review",    label: "디자인 검토",        sort_order: 1 },
          { key: "component_review", label: "컴포넌트 코드 리뷰", sort_order: 2 },
          { key: "handoff_approval", label: "핸드오프 승인",      sort_order: 3 },
        ]),
        JSON.stringify([
          { key: "design_spec",          label: "디자인 명세서",     type: "document" },
          { key: "component_code",       label: "컴포넌트 코드",     type: "spec"     },
          { key: "design_review_report", label: "디자인 검토 보고서", type: "report"  },
        ]),
      );
    },
  },
  {
    id: "2026-03-20-005-category-design-desc-ko",
    up: (db) => {
      db.prepare(
        "UPDATE categories SET description = ? WHERE id = 'cat_design' AND description = ?",
      ).run(
        "Figma 디자인을 코드로 연결할 때 사용해요. 컴포넌트 분석, 코드 생성, 리뷰를 지원해요.",
        "Figma design-to-code: design analysis, component building, code review",
      );
    },
  },
  {
    id: "2026-03-20-005-image-generations-task-id",
    up: (db) => {
      try {
        db.exec("ALTER TABLE image_generations ADD COLUMN task_id TEXT");
      } catch { /* already exists */ }
      try {
        db.exec("CREATE INDEX IF NOT EXISTS idx_image_generations_task ON image_generations(task_id)");
      } catch { /* already exists */ }
    },
  },
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

const ENSURE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id         TEXT    PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
  )
`;

/**
 * Run all pending versioned migrations in order.
 *
 * - Creates the `schema_migrations` table if it doesn't exist.
 * - Skips migrations whose `id` is already recorded.
 * - Wraps each migration in an explicit transaction; rolls back and throws on failure.
 */
export function runVersionedMigrations(db: DbLike): void {
  db.exec(ENSURE_TABLE_SQL);

  const applied = new Set(
    (db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[]).map((r) => r.id),
  );

  const insert = db.prepare("INSERT INTO schema_migrations (id) VALUES (?)");

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec("BEGIN");
    try {
      migration.up(db);
      insert.run(migration.id);
      db.exec("COMMIT");
      logger.info(`[db-migration] ✓ ${migration.id}`);
    } catch (err) {
      db.exec("ROLLBACK");
      throw new Error(`[db-migration] FAILED: ${migration.id} — ${String(err)}`);
    }
  }
}
