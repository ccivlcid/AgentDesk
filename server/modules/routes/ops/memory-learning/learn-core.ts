import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { MemoryHistoryProvider, MemoryLearnJob, MemoryLearnProvider, MemoryLearnStatus } from "./types.ts";

export const MEMORY_LEARN_PROVIDER_TO_AGENT: Record<MemoryLearnProvider, string> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  cursor: "cursor-agent",
};

export const MEMORY_HISTORY_PROVIDER_TO_AGENT: Record<MemoryHistoryProvider, string | null> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  copilot: "github-copilot",
  antigravity: "antigravity",
  cursor: "cursor-agent",
  api: null,
};

export const MEMORY_LEARN_HISTORY_RETENTION_DAYS = 180;
export const MEMORY_LEARN_HISTORY_RETENTION_MS = MEMORY_LEARN_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MEMORY_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER = 2_000;
export const MEMORY_LEARN_HISTORY_MAX_QUERY_LIMIT = 200;
export const MEMORY_LEARN_JOB_TTL_MS = 30 * 60 * 1000;
export const MEMORY_LEARN_MAX_JOBS = 200;

export function isMemoryLearnProvider(value: string): value is MemoryLearnProvider {
  return value === "claude" || value === "codex" || value === "gemini" || value === "opencode" || value === "cursor";
}

export function isMemoryHistoryProvider(value: string): value is MemoryHistoryProvider {
  return isMemoryLearnProvider(value) || value === "copilot" || value === "antigravity" || value === "api";
}

function normalizeMemoryLearnStatus(input: string): MemoryLearnStatus | null {
  if (input === "queued" || input === "running" || input === "succeeded" || input === "failed") {
    return input;
  }
  return null;
}

/** Learned memory is written under .agents/<agent>/memory/ (same layout as rules) */
function resolveAgentMemoryDir(agent: string): string | null {
  const allowed = [
    "claude-code",
    "codex",
    "gemini-cli",
    "opencode",
    "cursor-agent",
    "github-copilot",
    "antigravity",
  ];
  if (!allowed.includes(agent)) return null;
  return path.join(process.cwd(), ".agents", agent, "memory");
}

export function createMemoryLearnCore(ctx: RuntimeContext) {
  const { db } = ctx;
  const memoryLearnJobs = new Map<string, MemoryLearnJob>();

  function pruneMemoryLearnJobs(now = Date.now()): void {
    if (memoryLearnJobs.size === 0) return;
    for (const [id, job] of memoryLearnJobs.entries()) {
      const end = job.completedAt ?? job.updatedAt;
      const expired = job.status !== "running" && now - end > MEMORY_LEARN_JOB_TTL_MS;
      if (expired) memoryLearnJobs.delete(id);
    }
    if (memoryLearnJobs.size <= MEMORY_LEARN_MAX_JOBS) return;
    const oldest = [...memoryLearnJobs.values()]
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, Math.max(0, memoryLearnJobs.size - MEMORY_LEARN_MAX_JOBS));
    for (const job of oldest) {
      if (job.status === "running") continue;
      memoryLearnJobs.delete(job.id);
    }
  }

  function pruneMemoryLearningHistory(now = Date.now()): void {
    db.prepare(
      `DELETE FROM memory_learning_history WHERE COALESCE(run_completed_at, updated_at, created_at) < ?`,
    ).run(now - MEMORY_LEARN_HISTORY_RETENTION_MS);

    const overflowProviders = db
      .prepare(
        `SELECT provider, COUNT(*) AS cnt FROM memory_learning_history GROUP BY provider HAVING COUNT(*) > ?`,
      )
      .all(MEMORY_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER) as Array<{ provider: string; cnt: number }>;
    if (overflowProviders.length === 0) return;

    const trimStmt = db.prepare(`
      DELETE FROM memory_learning_history
      WHERE provider = ?
        AND id IN (
          SELECT id FROM memory_learning_history
          WHERE provider = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT -1 OFFSET ?
        )
    `);
    for (const row of overflowProviders) {
      trimStmt.run(row.provider, row.provider, MEMORY_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER);
    }
  }

  function recordMemoryLearnHistoryState(
    job: MemoryLearnJob,
    status: MemoryLearnStatus,
    opts: { error?: string | null; startedAt?: number | null; completedAt?: number | null } = {},
  ): void {
    const now = Date.now();
    const upsert = db.prepare(`
      INSERT INTO memory_learning_history (
        id, job_id, provider, memory_id, memory_label, status, command, error,
        run_started_at, run_completed_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id, provider) DO UPDATE SET
        memory_id = excluded.memory_id,
        memory_label = excluded.memory_label,
        status = excluded.status,
        command = excluded.command,
        error = excluded.error,
        run_started_at = COALESCE(excluded.run_started_at, memory_learning_history.run_started_at),
        run_completed_at = COALESCE(excluded.run_completed_at, memory_learning_history.run_completed_at),
        updated_at = excluded.updated_at
    `);

    for (const provider of job.providers) {
      upsert.run(
        randomUUID(),
        job.id,
        provider,
        job.memoryId,
        job.memoryTitle,
        status,
        job.command,
        opts.error ?? null,
        opts.startedAt ?? null,
        opts.completedAt ?? null,
        now,
        now,
      );
    }
    pruneMemoryLearningHistory(now);
  }

  function createMemoryLearnJob(
    memoryId: string,
    memoryTitle: string,
    memoryContent: string,
    category: string,
    priority: number,
    providers: MemoryLearnProvider[],
  ): MemoryLearnJob {
    const id = randomUUID();
    const agents = providers
      .map((provider) => MEMORY_LEARN_PROVIDER_TO_AGENT[provider])
      .filter((value, index, arr) => arr.indexOf(value) === index);
    const job: MemoryLearnJob = {
      id,
      memoryId,
      memoryTitle,
      providers,
      agents,
      status: "queued",
      command: `memory-inject ${memoryId} → ${agents.join(", ")}`,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      updatedAt: Date.now(),
      logTail: [],
      error: null,
    };
    memoryLearnJobs.set(id, job);

    try {
      recordMemoryLearnHistoryState(job, "queued");
    } catch (err) {
      console.warn(`[memory-learn] failed to record queued history: ${String(err)}`);
    }

    setTimeout(() => {
      job.status = "running";
      job.startedAt = Date.now();
      job.updatedAt = job.startedAt;
      try {
        recordMemoryLearnHistoryState(job, "running", { startedAt: job.startedAt });
      } catch (err) {
        console.warn(`[memory-learn] failed to record running history: ${String(err)}`);
      }

      const fileContent = `# ${memoryTitle}\n<!-- AgentDesk Memory: ${memoryId} | Category: ${category} | Priority: ${priority} -->\n\n${memoryContent}\n`;
      const errors: string[] = [];
      let writtenCount = 0;

      for (const agent of agents) {
        const memoryDir = resolveAgentMemoryDir(agent);
        if (!memoryDir) {
          job.logTail.push(`SKIP: no memory dir for agent ${agent}`);
          continue;
        }
        try {
          fs.mkdirSync(memoryDir, { recursive: true });
          const filePath = path.join(memoryDir, `${memoryId}.md`);
          fs.writeFileSync(filePath, fileContent, "utf8");
          job.logTail.push(`OK: wrote ${filePath}`);
          writtenCount += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${agent}: ${msg}`);
          job.logTail.push(`ERROR: ${agent}: ${msg}`);
        }
      }

      job.completedAt = Date.now();
      job.updatedAt = job.completedAt;
      if (errors.length > 0 && writtenCount === 0) {
        job.status = "failed";
        job.error = errors.join("; ");
      } else {
        job.status = "succeeded";
      }
      if (errors.length > 0 && writtenCount > 0) {
        job.logTail.push(`WARN: partial success (${writtenCount}/${agents.length})`);
      }

      try {
        recordMemoryLearnHistoryState(job, job.status, {
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        });
      } catch (historyErr) {
        console.warn(`[memory-learn] failed to record completion history: ${String(historyErr)}`);
      }
      pruneMemoryLearnJobs();
    }, 0);

    return job;
  }

  function runMemoryUnlearnForProvider(
    provider: MemoryHistoryProvider,
    memoryId: string,
  ): { ok: boolean; agent: string | null; message: string } {
    const agent = MEMORY_HISTORY_PROVIDER_TO_AGENT[provider] ?? null;
    if (!agent) {
      return { ok: true, agent: null, message: "no_local_cli_agent_for_provider" };
    }

    const memoryDir = resolveAgentMemoryDir(agent);
    if (!memoryDir) {
      return { ok: true, agent, message: "no_memory_dir_for_agent" };
    }

    const filePath = path.join(memoryDir, `${memoryId}.md`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { ok: true, agent, message: "memory_file_removed" };
      }
      return { ok: true, agent, message: "memory_file_not_found" };
    } catch (err) {
      return { ok: false, agent, message: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    MEMORY_LEARN_HISTORY_RETENTION_DAYS,
    MEMORY_LEARN_HISTORY_MAX_QUERY_LIMIT,
    memoryLearnJobs,
    isMemoryLearnProvider,
    isMemoryHistoryProvider,
    normalizeMemoryLearnStatus,
    pruneMemoryLearnJobs,
    pruneMemoryLearningHistory,
    createMemoryLearnJob,
    runMemoryUnlearnForProvider,
  };
}
