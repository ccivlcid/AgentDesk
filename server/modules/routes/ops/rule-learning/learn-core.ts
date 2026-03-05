import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { RuleHistoryProvider, RuleLearnJob, RuleLearnProvider, RuleLearnStatus } from "./types.ts";

export const RULE_LEARN_PROVIDER_TO_AGENT: Record<RuleLearnProvider, string> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  cursor: "cursor-agent",
};

export const RULE_HISTORY_PROVIDER_TO_AGENT: Record<RuleHistoryProvider, string | null> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-cli",
  opencode: "opencode",
  copilot: "github-copilot",
  antigravity: "antigravity",
  cursor: "cursor-agent",
  api: null,
};

export const RULE_LEARN_HISTORY_RETENTION_DAYS = 180;
export const RULE_LEARN_HISTORY_RETENTION_MS = RULE_LEARN_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const RULE_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER = 2_000;
export const RULE_LEARN_HISTORY_MAX_QUERY_LIMIT = 200;
export const RULE_LEARN_JOB_TTL_MS = 30 * 60 * 1000;
export const RULE_LEARN_MAX_JOBS = 200;

export function isRuleLearnProvider(value: string): value is RuleLearnProvider {
  return value === "claude" || value === "codex" || value === "gemini" || value === "opencode" || value === "cursor";
}

export function isRuleHistoryProvider(value: string): value is RuleHistoryProvider {
  return isRuleLearnProvider(value) || value === "copilot" || value === "antigravity" || value === "api";
}

function normalizeRuleLearnStatus(input: string): RuleLearnStatus | null {
  if (input === "queued" || input === "running" || input === "succeeded" || input === "failed") {
    return input;
  }
  return null;
}

/** Learned rules are written under .agents/<agent>/rules/ (e.g. .agents/claude-code/rules/) */
function resolveAgentRulesDir(agent: string): string | null {
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
  return path.join(process.cwd(), ".agents", agent, "rules");
}

export function createRuleLearnCore(ctx: RuntimeContext) {
  const { db } = ctx;
  const ruleLearnJobs = new Map<string, RuleLearnJob>();

  function pruneRuleLearnJobs(now = Date.now()): void {
    if (ruleLearnJobs.size === 0) return;
    for (const [id, job] of ruleLearnJobs.entries()) {
      const end = job.completedAt ?? job.updatedAt;
      const expired = job.status !== "running" && now - end > RULE_LEARN_JOB_TTL_MS;
      if (expired) ruleLearnJobs.delete(id);
    }
    if (ruleLearnJobs.size <= RULE_LEARN_MAX_JOBS) return;
    const oldest = [...ruleLearnJobs.values()]
      .sort((a, b) => a.updatedAt - b.updatedAt)
      .slice(0, Math.max(0, ruleLearnJobs.size - RULE_LEARN_MAX_JOBS));
    for (const job of oldest) {
      if (job.status === "running") continue;
      ruleLearnJobs.delete(job.id);
    }
  }

  function pruneRuleLearningHistory(now = Date.now()): void {
    db.prepare(
      `DELETE FROM rule_learning_history WHERE COALESCE(run_completed_at, updated_at, created_at) < ?`,
    ).run(now - RULE_LEARN_HISTORY_RETENTION_MS);

    const overflowProviders = db
      .prepare(
        `SELECT provider, COUNT(*) AS cnt FROM rule_learning_history GROUP BY provider HAVING COUNT(*) > ?`,
      )
      .all(RULE_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER) as Array<{ provider: string; cnt: number }>;
    if (overflowProviders.length === 0) return;

    const trimStmt = db.prepare(`
      DELETE FROM rule_learning_history
      WHERE provider = ?
        AND id IN (
          SELECT id FROM rule_learning_history
          WHERE provider = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT -1 OFFSET ?
        )
    `);
    for (const row of overflowProviders) {
      trimStmt.run(row.provider, row.provider, RULE_LEARN_HISTORY_MAX_ROWS_PER_PROVIDER);
    }
  }

  function recordRuleLearnHistoryState(
    job: RuleLearnJob,
    status: RuleLearnStatus,
    opts: { error?: string | null; startedAt?: number | null; completedAt?: number | null } = {},
  ): void {
    const now = Date.now();
    const upsert = db.prepare(`
      INSERT INTO rule_learning_history (
        id, job_id, provider, rule_id, rule_label, status, command, error,
        run_started_at, run_completed_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(job_id, provider) DO UPDATE SET
        rule_id = excluded.rule_id,
        rule_label = excluded.rule_label,
        status = excluded.status,
        command = excluded.command,
        error = excluded.error,
        run_started_at = COALESCE(excluded.run_started_at, rule_learning_history.run_started_at),
        run_completed_at = COALESCE(excluded.run_completed_at, rule_learning_history.run_completed_at),
        updated_at = excluded.updated_at
    `);

    for (const provider of job.providers) {
      upsert.run(
        randomUUID(),
        job.id,
        provider,
        job.ruleId,
        job.ruleTitle,
        status,
        job.command,
        opts.error ?? null,
        opts.startedAt ?? null,
        opts.completedAt ?? null,
        now,
        now,
      );
    }
    pruneRuleLearningHistory(now);
  }

  function createRuleLearnJob(
    ruleId: string,
    ruleTitle: string,
    ruleContent: string,
    category: string,
    priority: number,
    providers: RuleLearnProvider[],
  ): RuleLearnJob {
    const id = randomUUID();
    const agents = providers
      .map((provider) => RULE_LEARN_PROVIDER_TO_AGENT[provider])
      .filter((value, index, arr) => arr.indexOf(value) === index);
    const job: RuleLearnJob = {
      id,
      ruleId,
      ruleTitle,
      providers,
      agents,
      status: "queued",
      command: `rule-inject ${ruleId} → ${agents.join(", ")}`,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      updatedAt: Date.now(),
      logTail: [],
      error: null,
    };
    ruleLearnJobs.set(id, job);

    try {
      recordRuleLearnHistoryState(job, "queued");
    } catch (err) {
      console.warn(`[rule-learn] failed to record queued history: ${String(err)}`);
    }

    setTimeout(() => {
      job.status = "running";
      job.startedAt = Date.now();
      job.updatedAt = job.startedAt;
      try {
        recordRuleLearnHistoryState(job, "running", { startedAt: job.startedAt });
      } catch (err) {
        console.warn(`[rule-learn] failed to record running history: ${String(err)}`);
      }

      const fileContent = `# ${ruleTitle}\n<!-- AgentDesk Rule: ${ruleId} | Category: ${category} | Priority: ${priority} -->\n\n${ruleContent}\n`;
      const errors: string[] = [];
      let writtenCount = 0;

      for (const agent of agents) {
        const rulesDir = resolveAgentRulesDir(agent);
        if (!rulesDir) {
          job.logTail.push(`SKIP: no rules dir for agent ${agent}`);
          continue;
        }
        try {
          fs.mkdirSync(rulesDir, { recursive: true });
          const filePath = path.join(rulesDir, `${ruleId}.md`);
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
        recordRuleLearnHistoryState(job, job.status, {
          error: job.error,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
        });
      } catch (historyErr) {
        const msg = String(historyErr);
        console.warn(`[rule-learn] failed to record completion history: ${msg}`);
        job.error = (job.error ? `${job.error}; ` : "") + `history_save_failed: ${msg}`;
        if (job.status === "succeeded") job.status = "failed";
      }
      pruneRuleLearnJobs();
    }, 0);

    return job;
  }

  function runRuleUnlearnForProvider(
    provider: RuleHistoryProvider,
    ruleId: string,
  ): { ok: boolean; agent: string | null; message: string } {
    const agent = RULE_HISTORY_PROVIDER_TO_AGENT[provider] ?? null;
    if (!agent) {
      return { ok: true, agent: null, message: "no_local_cli_agent_for_provider" };
    }

    const rulesDir = resolveAgentRulesDir(agent);
    if (!rulesDir) {
      return { ok: true, agent, message: "no_rules_dir_for_agent" };
    }

    const filePath = path.join(rulesDir, `${ruleId}.md`);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { ok: true, agent, message: "rule_file_removed" };
      }
      return { ok: true, agent, message: "rule_file_not_found" };
    } catch (err) {
      return { ok: false, agent, message: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    RULE_LEARN_HISTORY_RETENTION_DAYS,
    RULE_LEARN_HISTORY_MAX_QUERY_LIMIT,
    ruleLearnJobs,
    isRuleLearnProvider,
    isRuleHistoryProvider,
    normalizeRuleLearnStatus,
    pruneRuleLearnJobs,
    pruneRuleLearningHistory,
    createRuleLearnJob,
    runRuleUnlearnForProvider,
  };
}
