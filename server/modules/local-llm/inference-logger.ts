/**
 * Logs inference events to local_llm_inference_log.
 * Called whenever an agent completes an inference via a local LLM backend.
 */
import type { DatabaseSync } from "node:sqlite";

export interface InferenceLogEntry {
  backend: string;
  model_name: string;
  agent_id?: string | null;
  task_id?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  tokens_per_second?: number | null;
  latency_ms?: number | null;
}

type DbLike = Pick<DatabaseSync, "prepare">;

export function createInferenceLogger(db: DbLike) {
  function log(entry: InferenceLogEntry): void {
    try {
      db.prepare(
        `INSERT INTO local_llm_inference_log
          (backend, model_name, agent_id, task_id, prompt_tokens, completion_tokens, tokens_per_second, latency_ms, created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      ).run(
        entry.backend,
        entry.model_name,
        entry.agent_id ?? null,
        entry.task_id ?? null,
        entry.prompt_tokens ?? null,
        entry.completion_tokens ?? null,
        entry.tokens_per_second ?? null,
        entry.latency_ms ?? null,
        Date.now(),
      );
    } catch { /* non-critical, swallow */ }
  }

  function getHistory(limit = 50): unknown[] {
    return db.prepare(
      `SELECT il.*, a.name AS agent_name
       FROM local_llm_inference_log il
       LEFT JOIN agents a ON a.id = il.agent_id
       ORDER BY il.created_at DESC LIMIT ?`,
    ).all(limit);
  }

  function getStatsByModel(): unknown[] {
    return db.prepare(
      `SELECT
         model_name, backend,
         COUNT(*) AS request_count,
         SUM(completion_tokens) AS total_tokens,
         AVG(tokens_per_second) AS avg_tps,
         AVG(latency_ms) AS avg_latency_ms
       FROM local_llm_inference_log
       GROUP BY backend, model_name
       ORDER BY request_count DESC`,
    ).all();
  }

  return { log, getHistory, getStatsByModel };
}
