import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { castSqliteRow, castSqliteRows } from "../../lib/sqlite-row-cast.ts";
import type { RuntimeRun, RuntimeRunStatus, RuntimeEventType } from "./types.ts";

export function createRun(
  db: DatabaseSync,
  params: { taskId: string; agentId: string; projectId?: string | null; model?: string; provider?: string },
  nowMs: () => number,
): RuntimeRun {
  const id = randomUUID();
  const now = nowMs();
  db.prepare(`
    INSERT INTO agent_runtime_runs
      (id, task_id, agent_id, project_id, status, model, provider, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
  `).run(id, params.taskId, params.agentId, params.projectId ?? null, params.model ?? null, params.provider ?? null, now);
  return getRun(db, id)!;
}

export function updateRunStatus(
  db: DatabaseSync,
  runId: string,
  status: RuntimeRunStatus,
  fields: { error_message?: string; started_at?: number; completed_at?: number } = {},
) {
  const sets: string[] = ["status = ?"];
  const vals: (string | number | null)[] = [status];
  if (fields.error_message !== undefined) { sets.push("error_message = ?"); vals.push(fields.error_message); }
  if (fields.started_at !== undefined) { sets.push("started_at = ?"); vals.push(fields.started_at); }
  if (fields.completed_at !== undefined) { sets.push("completed_at = ?"); vals.push(fields.completed_at); }
  vals.push(runId);
  db.prepare(`UPDATE agent_runtime_runs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

  // Clean up in-memory seq counter when run is terminal
  if (status === "completed" || status === "failed" || status === "cancelled") {
    seqCounter.delete(runId);
  }
}

export function updateRunUsage(
  db: DatabaseSync,
  runId: string,
  inputTokens: number,
  outputTokens: number,
  toolCallsCount: number,
) {
  db.prepare(`
    UPDATE agent_runtime_runs
    SET input_tokens = input_tokens + ?,
        output_tokens = output_tokens + ?,
        tool_calls_count = tool_calls_count + ?
    WHERE id = ?
  `).run(inputTokens, outputTokens, toolCallsCount, runId);
}

const seqCounter = new Map<string, number>();

export function appendEvent(
  db: DatabaseSync,
  runId: string,
  eventType: RuntimeEventType,
  content: string,
  tokenCount = 0,
  nowMs: () => number,
) {
  const seq = (seqCounter.get(runId) ?? 0) + 1;
  seqCounter.set(runId, seq);
  db.prepare(`
    INSERT INTO agent_runtime_events (run_id, seq, event_type, content, token_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(runId, seq, eventType, content, tokenCount, nowMs());
}

export function getRun(db: DatabaseSync, runId: string): RuntimeRun | null {
  return castSqliteRow<RuntimeRun>(db.prepare("SELECT * FROM agent_runtime_runs WHERE id = ?").get(runId)) ?? null;
}

export function getRunsByTaskId(db: DatabaseSync, taskId: string): RuntimeRun[] {
  return castSqliteRows<RuntimeRun>(
    db.prepare("SELECT * FROM agent_runtime_runs WHERE task_id = ? ORDER BY created_at DESC").all(taskId),
  );
}

export function getRunEvents(db: DatabaseSync, runId: string): import("./types.ts").RuntimeEvent[] {
  return castSqliteRows<import("./types.ts").RuntimeEvent>(
    db.prepare("SELECT * FROM agent_runtime_events WHERE run_id = ? ORDER BY seq ASC").all(runId),
  );
}
