import type { DbLike } from "./types.ts";

export function applyTaskSchemaInlineDDL(db: DbLike): void {
  // Agent persona_id column
  try {
    db.exec("ALTER TABLE agents ADD COLUMN persona_id TEXT");
  } catch {
    /* already exists */
  }

  // Agent profile image URL
  try {
    db.exec("ALTER TABLE agents ADD COLUMN avatar_url TEXT");
  } catch {
    /* already exists */
  }

  // Subtask cross-department delegation columns
  try {
    db.exec("ALTER TABLE subtasks ADD COLUMN target_department_id TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE subtasks ADD COLUMN delegated_task_id TEXT");
  } catch {
    /* already exists */
  }

  // Cross-department collaboration: link collaboration task back to original task
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN source_task_id TEXT");
  } catch {
    /* already exists */
  }
  try {
    const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
    const hasProjectId = taskCols.some((c) => c.name === "project_id");
    if (!hasProjectId) {
      try {
        db.exec("ALTER TABLE tasks ADD COLUMN project_id TEXT REFERENCES projects(id)");
      } catch {
        // Fallback for legacy SQLite builds that reject REFERENCES on ADD COLUMN.
        db.exec("ALTER TABLE tasks ADD COLUMN project_id TEXT");
      }
    }
  } catch {
    /* table missing during migration window */
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, updated_at DESC)");
  } catch {
    /* project_id not ready yet */
  }
  // Task creation audit completion flag
  try {
    db.exec("ALTER TABLE task_creation_audits ADD COLUMN completed INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* already exists */
  }
  // Task hidden state (migrated from client localStorage)
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* already exists */
  }
  try {
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_task_creation_audits_completed ON task_creation_audits(completed, created_at DESC)",
    );
  } catch {
    /* table missing or migration in progress */
  }

  // Interrupt prompt injection queue (pause -> inject -> resume)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_interrupt_injections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        prompt_hash TEXT NOT NULL,
        actor_token_hash TEXT,
        created_at INTEGER DEFAULT (unixepoch()*1000),
        consumed_at INTEGER
      )
    `);
    db.exec(
      "CREATE INDEX IF NOT EXISTS idx_task_interrupt_injections_task ON task_interrupt_injections(task_id, session_id, consumed_at, created_at DESC)",
    );
  } catch {
    /* already exists */
  }

  // 프로젝트별 직원 직접선택 기능: assignment_mode + project_agents 테이블
  try {
    db.exec("ALTER TABLE projects ADD COLUMN assignment_mode TEXT NOT NULL DEFAULT 'auto'");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE projects ADD COLUMN default_pack_key TEXT NOT NULL DEFAULT 'development'");
  } catch {
    /* already exists */
  }
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS project_agents (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      created_at INTEGER DEFAULT (unixepoch()*1000),
      PRIMARY KEY (project_id, agent_id)
    )
  `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_project_agents_project ON project_agents(project_id)");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN workflow_pack_key TEXT NOT NULL DEFAULT 'development'");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN workflow_meta_json TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN output_format TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN execution_state TEXT NOT NULL DEFAULT 'queued'");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN execution_attempt INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN claimed_by TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN claim_expires_at INTEGER");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN last_heartbeat_at INTEGER");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN last_output_at INTEGER");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN retry_after INTEGER");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN execution_error_code TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN execution_error_summary TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN resolved_workflow_contract_hash TEXT");
  } catch {
    /* already exists */
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_workflow_pack ON tasks(workflow_pack_key, updated_at DESC)");
  } catch {
    /* already exists */
  }
  try {
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_execution_state ON tasks(execution_state, retry_after, updated_at DESC)");
  } catch {
    /* already exists */
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_execution_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        from_state TEXT,
        to_state TEXT,
        summary TEXT,
        metadata_json TEXT,
        created_at INTEGER DEFAULT (unixepoch()*1000)
      )
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_task_execution_events_task ON task_execution_events(task_id, created_at DESC)");
  } catch {
    /* already exists */
  }

  // Task artifacts: records files produced by each task (captured at merge time)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS task_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        mime TEXT NOT NULL DEFAULT 'application/octet-stream',
        created_at INTEGER DEFAULT (unixepoch()*1000)
      )
    `);
    db.exec("CREATE INDEX IF NOT EXISTS idx_task_artifacts_task ON task_artifacts(task_id)");
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_task_artifacts_unique ON task_artifacts(task_id, file_path)");
  } catch {
    /* already exists */
  }
}
