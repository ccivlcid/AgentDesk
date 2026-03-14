import type { DatabaseSync } from "node:sqlite";
import logger from "../../lib/logger";

type DbLike = Pick<DatabaseSync, "prepare">;

const taskColumnCache = new WeakMap<object, Set<string>>();
const tableCache = new WeakMap<object, Set<string>>();

export type TaskExecutionState =
  | "queued"
  | "claiming"
  | "workspace_preparing"
  | "ready"
  | "running"
  | "awaiting_review"
  | "retry_backoff"
  | "blocked"
  | "stalled"
  | "recovering"
  | "succeeded"
  | "failed"
  | "cancelled";

/**
 * Allowed execution_state transitions.
 * A transition not listed here is considered invalid and will be logged.
 */
const ALLOWED_TRANSITIONS: Record<TaskExecutionState, readonly TaskExecutionState[]> = {
  queued:              ["claiming", "running", "cancelled", "failed"],
  claiming:            ["workspace_preparing", "ready", "running", "failed", "cancelled"],
  workspace_preparing: ["ready", "running", "failed", "cancelled"],
  ready:               ["running", "failed", "cancelled"],
  running:             ["awaiting_review", "blocked", "stalled", "succeeded", "failed", "cancelled"],
  awaiting_review:     ["succeeded", "failed", "running"],
  retry_backoff:       ["queued", "running", "failed", "cancelled"],
  blocked:             ["queued", "running", "failed", "cancelled"],
  stalled:             ["recovering", "failed", "cancelled", "running", "queued"],
  recovering:          ["queued", "running", "failed", "cancelled"],
  succeeded:           ["queued", "running"],   // allow re-run
  failed:              ["queued", "running"],    // allow re-run
  cancelled:           ["queued", "running"],    // allow re-run
};

/**
 * Validate whether a state transition is allowed.
 * Returns true if valid, false if invalid (logs a warning but does not throw).
 */
export function isValidExecutionStateTransition(
  from: TaskExecutionState | null | undefined,
  to: TaskExecutionState,
): boolean {
  if (!from) return true; // initial state or unknown — allow
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) return true; // unknown source — allow
  if (allowed.includes(to)) return true;
  logger.warn(`[state-guard] Invalid execution_state transition: ${from} → ${to}`);
  return false;
}

type TaskExecutionMetaPatch = {
  execution_state?: TaskExecutionState | null;
  claimed_by?: string | null;
  claim_expires_at?: number | null;
  last_heartbeat_at?: number | null;
  last_output_at?: number | null;
  retry_after?: number | null;
  execution_error_code?: string | null;
  execution_error_summary?: string | null;
  resolved_workflow_contract_hash?: string | null;
  increment_execution_attempt?: boolean;
};

function getTaskColumnSet(db: DbLike): Set<string> {
  const cached = taskColumnCache.get(db as object);
  if (cached) return cached;
  const cols = db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
  const set = new Set(cols.map((col) => col.name));
  taskColumnCache.set(db as object, set);
  return set;
}

function getTableSet(db: DbLike): Set<string> {
  const cached = tableCache.get(db as object);
  if (cached) return cached;
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view')")
    .all() as Array<{ name: string }>;
  const set = new Set(rows.map((row) => row.name));
  tableCache.set(db as object, set);
  return set;
}

export function taskHasColumn(db: DbLike, columnName: string): boolean {
  return getTaskColumnSet(db).has(columnName);
}

export function taskExecutionEventsTableExists(db: DbLike): boolean {
  return getTableSet(db).has("task_execution_events");
}

export function appendTaskExecutionMetaUpdate(
  db: DbLike,
  updates: string[],
  params: unknown[],
  patch: TaskExecutionMetaPatch,
): void {
  const cols = getTaskColumnSet(db);

  if (patch.increment_execution_attempt && cols.has("execution_attempt")) {
    updates.push("execution_attempt = COALESCE(execution_attempt, 0) + 1");
  }
  if ("execution_state" in patch && cols.has("execution_state")) {
    updates.push("execution_state = ?");
    params.push(patch.execution_state ?? null);
  }
  if ("claimed_by" in patch && cols.has("claimed_by")) {
    updates.push("claimed_by = ?");
    params.push(patch.claimed_by ?? null);
  }
  if ("claim_expires_at" in patch && cols.has("claim_expires_at")) {
    updates.push("claim_expires_at = ?");
    params.push(patch.claim_expires_at ?? null);
  }
  if ("last_heartbeat_at" in patch && cols.has("last_heartbeat_at")) {
    updates.push("last_heartbeat_at = ?");
    params.push(patch.last_heartbeat_at ?? null);
  }
  if ("last_output_at" in patch && cols.has("last_output_at")) {
    updates.push("last_output_at = ?");
    params.push(patch.last_output_at ?? null);
  }
  if ("retry_after" in patch && cols.has("retry_after")) {
    updates.push("retry_after = ?");
    params.push(patch.retry_after ?? null);
  }
  if ("execution_error_code" in patch && cols.has("execution_error_code")) {
    updates.push("execution_error_code = ?");
    params.push(patch.execution_error_code ?? null);
  }
  if ("execution_error_summary" in patch && cols.has("execution_error_summary")) {
    updates.push("execution_error_summary = ?");
    params.push(patch.execution_error_summary ?? null);
  }
  if ("resolved_workflow_contract_hash" in patch && cols.has("resolved_workflow_contract_hash")) {
    updates.push("resolved_workflow_contract_hash = ?");
    params.push(patch.resolved_workflow_contract_hash ?? null);
  }
}

export function recordTaskExecutionEvent(
  db: DbLike,
  input: {
    taskId: string;
    eventType: string;
    fromState?: string | null;
    toState?: string | null;
    summary?: string | null;
    metadata?: unknown;
    createdAt: number;
  },
): void {
  if (!taskExecutionEventsTableExists(db)) return;
  let metadataJson: string | null = null;
  if (input.metadata !== undefined) {
    try {
      metadataJson = JSON.stringify(input.metadata);
    } catch {
      metadataJson = null;
    }
  }
  db.prepare(
    `INSERT INTO task_execution_events
      (task_id, event_type, from_state, to_state, summary, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.taskId,
    input.eventType,
    input.fromState ?? null,
    input.toState ?? null,
    input.summary ?? null,
    metadataJson,
    input.createdAt,
  );
}
