import logger from "../../../../lib/logger.ts";
import type { DbLike } from "./types.ts";

export function migrateLegacyTasksStatusSchema(db: DbLike): void {
  const row = db
    .prepare(
      `
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'tasks'
  `,
    )
    .get() as { sql?: string } | undefined;
  const ddl = (row?.sql ?? "").toLowerCase();
  if (ddl.includes("'collaborating'") && ddl.includes("'pending'")) return;

  logger.info("[AgentDesk] Migrating legacy tasks.status CHECK constraint");
  const newTable = "tasks_status_migration_new";
  db.exec("PRAGMA foreign_keys = OFF");
  try {
    db.exec("BEGIN");
    try {
      db.exec(`DROP TABLE IF EXISTS ${newTable}`);
      db.exec(`
        CREATE TABLE ${newTable} (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          department_id TEXT REFERENCES departments(id),
          assigned_agent_id TEXT REFERENCES agents(id),
          project_id TEXT REFERENCES projects(id),
          status TEXT NOT NULL DEFAULT 'inbox'
            CHECK(status IN ('inbox','planned','collaborating','in_progress','review','done','cancelled','pending')),
          priority INTEGER DEFAULT 0,
          task_type TEXT DEFAULT 'general'
            CHECK(task_type IN ('general','development','design','analysis','presentation','documentation')),
          workflow_pack_key TEXT NOT NULL DEFAULT 'development',
          workflow_meta_json TEXT,
          output_format TEXT,
          project_path TEXT,
          result TEXT,
          started_at INTEGER,
          completed_at INTEGER,
          created_at INTEGER DEFAULT (unixepoch()*1000),
          updated_at INTEGER DEFAULT (unixepoch()*1000),
          source_task_id TEXT
        );
      `);

      const cols = db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
      const hasSourceTaskId = cols.some((c) => c.name === "source_task_id");
      const hasProjectId = cols.some((c) => c.name === "project_id");
      const hasWorkflowPackKey = cols.some((c) => c.name === "workflow_pack_key");
      const hasWorkflowMeta = cols.some((c) => c.name === "workflow_meta_json");
      const hasOutputFormat = cols.some((c) => c.name === "output_format");
      const sourceTaskIdExpr = hasSourceTaskId ? "source_task_id" : "NULL AS source_task_id";
      const projectIdExpr = hasProjectId ? "project_id" : "NULL AS project_id";
      const workflowPackExpr = hasWorkflowPackKey ? "workflow_pack_key" : "'development' AS workflow_pack_key";
      const workflowMetaExpr = hasWorkflowMeta ? "workflow_meta_json" : "NULL AS workflow_meta_json";
      const outputFormatExpr = hasOutputFormat ? "output_format" : "NULL AS output_format";
      db.exec(`
        INSERT INTO ${newTable} (
          id, title, description, department_id, assigned_agent_id,
          project_id, status, priority, task_type, workflow_pack_key, workflow_meta_json, output_format, project_path, result,
          started_at, completed_at, created_at, updated_at, source_task_id
        )
        SELECT
          id, title, description, department_id, assigned_agent_id,
          ${projectIdExpr},
          CASE
            WHEN status IN ('inbox','planned','collaborating','in_progress','review','done','cancelled','pending')
              THEN status
            ELSE 'inbox'
          END,
          priority, task_type, ${workflowPackExpr}, ${workflowMetaExpr}, ${outputFormatExpr}, project_path, result,
          started_at, completed_at, created_at, updated_at, ${sourceTaskIdExpr}
        FROM tasks;
      `);

      db.exec("DROP TABLE tasks");
      db.exec(`ALTER TABLE ${newTable} RENAME TO tasks`);
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, updated_at DESC)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_dept ON tasks(department_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, updated_at DESC)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_workflow_pack ON tasks(workflow_pack_key, updated_at DESC)");
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}
