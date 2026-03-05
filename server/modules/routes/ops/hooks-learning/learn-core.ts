import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { HookHistoryProvider, HookLearnJob, HookLearnProvider, HookLearnStatus } from "./types.ts";

export const HOOK_LEARN_PROVIDER_TO_AGENT: Record<HookLearnProvider, string> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  cursor: "cursor-agent",
};

export const HOOK_HISTORY_PROVIDER_TO_AGENT: Record<HookHistoryProvider, string | null> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  copilot: "github-copilot",
  antigravity: "antigravity",
  cursor: "cursor-agent",
  api: null,
};

export const HOOK_LEARN_HISTORY_RETENTION_DAYS = 180;
export const HOOK_LEARN_HISTORY_RETENTION_MS = HOOK_LEARN_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const HOOK_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER = 2_000;
export const HOOK_LEARN_HISTORY_MAX_QUERY_LIMIT = 200;
export const HOOK_LEARN_JOB_TTL_MS = 30 * 60 * 1000;
export const HOOK_LEARN_MAX_JOBS = 200;

export function isHookLearnProvider(value: string): value is HookLearnProvider {
  return value === "claude" || value === "codex" || value === "gemini" || value === "opencode" || value === "cursor";
}

export function isHookHistoryProvider(value: string): value is HookHistoryProvider {
  return isHookLearnProvider(value) || value === "copilot" || value === "antigravity" || value === "api";
}

function normalizeHookLearnStatus(input: string): HookLearnStatus | null {
  if (input === "queued" || input === "running" || input === "succeeded" || input === "failed") {
    return input;
  }
  return null;
}

/** Learned hooks are written under .agents/<agent>/hooks/ (same layout as rules) */
function resolveAgentHooksDir(agent: string): string | null {
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
  return path.join(process.cwd(), ".agents", agent, "hooks");
}

export function createHookLearnCore(ctx: RuntimeContext) {
  const { db } = ctx;
  const hookLearnJobs = new Map<string, HookLearnJob>();

  function pruneHookLearnJobs(now = Date.now()): void {
    if (hookLearnJobs.size === 0) return;
    for (const [id, job] of hookLearnJobs.entries()) {
      const end = job.completedAt ?? job.updatedAt;
      const expired = job.status !== "running" && now - end > HOOK_LEARN_JOB_TTL_MS;
      if (expired) hookLearnJobs.delete(id);
    }
    if (hookLearnJobs.size <= HOOK_LEARN_MAX_JOBS) return;
    const oldest = [...hookLearnJobs.values()]
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, Math.max(0, hookLearnJobs.size - HOOK_LEARN_MAX_JOBS));
    for (const job of oldest) {
      if (job.status === "running") continue;
      hookLearnJobs.delete(job.id);
    }
  }

  function pruneHookLearningHistory(now = Date.now()): void {
    db.prepare(
      `DELETE FROM hook_learning_history WHERE COALESCE(run_completed_at, updated_at, created_at) < ?`,
    ).run(now - HOOK_LEARN_HISTORY_RETENTION_MS);

    const overflowProviders = db
      .prepare(
        `SELECT provider, COUNT(*) AS cnt FROM hook_learning_history GROUP BY provider HAVING COUNT(*) > ?`,
      )
      .all(HOOK_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER) as Array<{ provider: string; cnt: number }>;
    if (overflowProviders.length === 0) return;

    const trimStmt = db.prepare(`
      DELETE FROM hook_learning_history
      WHERE provider = ?
        AND id IN (
          SELECT id FROM hook_learning_history
          WHERE provider = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT -1 OFFSET ?
        )
    `);
    for (const row of overflowProviders) {
      trimStmt.run(row.provider, row.provider, HOOK_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER);
    }
  }

  function recordHookLearnHistoryState(
    job: HookLearnJob,
    status: HookLearnStatus,
    opts: { error?: string | null; startedAt?: number | null; completedAt?: number | null } = {},
  ): void {
    const now = Date.now();
    const upsert = db.prepare(`
      INSERT INTO hook_learning_history (
        id, job_id, provider, hook_id, hook_label, status, command, error,
        run_started_at, run_completed_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id, provider) DO UPDATE SET
        hook_id = excluded.hook_id,
        hook_label = excluded.hook_label,
        status = excluded.status,
        command = excluded.command,
        error = excluded.error,
        run_started_at = COALESCE(excluded.run_started_at, hook_learning_history.run_started_at),
        run_completed_at = COALESCE(excluded.run_completed_at, hook_learning_history.run_completed_at),
        updated_at = excluded.updated_at
    `);

    for (const provider of job.providers) {
      upsert.run(
        randomUUID(),
        job.id,
        provider,
        job.hookId,
        job.hookTitle,
        status,
        job.command,
        opts.error ?? null,
        opts.startedAt ?? null,
        opts.completedAt ?? null,
        now,
        now,
      );
    }
    pruneHookLearningHistory(now);
  }

  function createHookLearnJob(
    hookId: string,
    hookTitle: string,
    hookCommand: string,
    eventType: string,
    priority: number,
    providers: HookLearnProvider[],
  ): HookLearnJob {
    const id = randomUUID();
    const agents = providers
      .map((provider) => HOOK_LEARN_PROVIDER_TO_AGENT[provider])
      .filter((value, index, arr) => arr.indexOf(value) === index);
    const job: HookLearnJob = {
      id,
      hookId,
      hookTitle,
      providers,
      agents,
      status: "queued",
      command: `hook-inject ${hookId} → ${agents.join(", ")}`,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      updatedAt: Date.now(),
      logTail: [],
      error: null,
    };
    hookLearnJobs.set(id, job);

    try {
      recordHookLearnHistoryState(job, "queued");
    } catch (err) {
      console.warn(`[hook-learn] failed to record queued history: ${String(err)}`);
    }

    setTimeout(() => {
      job.status = "running";
      job.startedAt = Date.now();
      job.updatedAt = job.startedAt;
      try {
        recordHookLearnHistoryState(job, "running", { startedAt: job.startedAt });
      } catch (err) {
        console.warn(`[hook-learn] failed to record running history: ${String(err)}`);
      }

      const fileContent = `# ${hookTitle}\n<!-- AgentDesk Hook: ${hookId} | Event: ${eventType} | Priority: ${priority} -->\n\nCommand: \`${hookCommand}\`\n`;
      const errors: string[] = [];
      let writtenCount = 0;

      for (const agent of agents) {
        const hooksDir = resolveAgentHooksDir(agent);
        if (!hooksDir) {
          job.logTail.push(`SKIP: no hooks dir for agent ${agent}`);
          continue;
        }
        try {
          fs.mkdirSync(hooksDir, { recursive: true });
          const filePath = path.join(hooksDir, `${hookId}.md`);
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
        recordHookLearnHistoryState(job, job.status, {
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        });
      } catch (historyErr) {
        console.warn(`[hook-learn] failed to record completion history: ${String(historyErr)}`);
      }
      pruneHookLearnJobs();
    }, 0);

    return job;
  }

  function runHookUnlearnForProvider(
    provider: HookHistoryProvider,
    hookId: string,
  ): { ok: boolean; agent: string | null; message: string } {
    const agent = HOOK_HISTORY_PROVIDER_TO_AGENT[provider] ?? null;
    if (!agent) {
      return { ok: true, agent: null, message: "no_local_cli_agent_for_provider" };
    }

    const hooksDir = resolveAgentHooksDir(agent);
    if (!hooksDir) {
      return { ok: true, agent, message: "no_hooks_dir_for_agent" };
    }

    const filePath = path.join(hooksDir, `${hookId}.md`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { ok: true, agent, message: "hook_file_removed" };
      }
      return { ok: true, agent, message: "hook_file_not_found" };
    } catch (err) {
      return { ok: false, agent, message: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    HOOK_LEARN_HISTORY_RETENTION_DAYS,
    HOOK_LEARN_HISTORY_MAX_QUERY_LIMIT,
    hookLearnJobs,
    isHookLearnProvider,
    isHookHistoryProvider,
    normalizeHookLearnStatus,
    pruneHookLearnJobs,
    pruneHookLearningHistory,
    createHookLearnJob,
    runHookUnlearnForProvider,
  };
}
