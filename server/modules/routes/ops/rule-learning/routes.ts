import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { RuleHistoryProvider, RuleLearnStatus } from "./types.ts";
import { createRuleLearnCore } from "./learn-core.ts";

export function registerRuleLearningRoutes(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  const {
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
  } = createRuleLearnCore(ctx);

  app.post("/api/agent-rules/learn", (req, res) => {
    pruneRuleLearnJobs();
    const ruleId = String(req.body?.ruleId ?? "").trim();
    if (!ruleId) {
      return res.status(400).json({ error: "ruleId required" });
    }

    const rawProviders = req.body?.providers;
    if (!Array.isArray(rawProviders) || rawProviders.length === 0) {
      return res.status(400).json({ error: "providers required" });
    }
    const providers = rawProviders
      .map((v: unknown) => String(v ?? "").trim().toLowerCase())
      .filter(isRuleLearnProvider);
    if (providers.length === 0) {
      return res.status(400).json({ error: "no valid providers" });
    }

    const rule = db
      .prepare("SELECT id, title, rule_content, category, priority FROM agent_rules WHERE id = ?")
      .get(ruleId) as { id: string; title: string; rule_content: string; category: string; priority: number } | undefined;
    if (!rule) {
      return res.status(404).json({ error: "rule_not_found" });
    }

    const job = createRuleLearnJob(rule.id, rule.title, rule.rule_content, rule.category, rule.priority, providers);
    res.status(202).json({ ok: true, job });
  });

  app.get("/api/agent-rules/learn/:jobId", (req, res) => {
    pruneRuleLearnJobs();
    const jobId = String(req.params.jobId ?? "").trim();
    const job = ruleLearnJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }
    res.json({ ok: true, job });
  });

  app.get("/api/agent-rules/history", (req, res) => {
    pruneRuleLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isRuleHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const rawStatus = String(req.query.status ?? "").trim().toLowerCase();
    const status = rawStatus ? normalizeRuleLearnStatus(rawStatus) : null;
    if (rawStatus && !status) {
      return res.status(400).json({ error: "invalid status" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), RULE_LEARN_HISTORY_MAX_QUERY_LIMIT)
      : 50;

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (provider) {
      where.push("provider = ?");
      params.push(provider);
    }
    if (status) {
      where.push("status = ?");
      params.push(status);
    }

    const sql = `
      SELECT id, job_id, provider, rule_id, rule_label, status, command, error,
             run_started_at, run_completed_at, created_at, updated_at
      FROM rule_learning_history
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const history = db.prepare(sql).all(...params) as Array<{
      id: string;
      job_id: string;
      provider: RuleHistoryProvider;
      rule_id: string;
      rule_label: string;
      status: RuleLearnStatus;
      command: string;
      error: string | null;
      run_started_at: number | null;
      run_completed_at: number | null;
      created_at: number;
      updated_at: number;
    }>;

    res.json({
      ok: true,
      retention_days: RULE_LEARN_HISTORY_RETENTION_DAYS,
      history,
    });
  });

  app.get("/api/agent-rules/available", (req, res) => {
    pruneRuleLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isRuleHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), RULE_LEARN_HISTORY_MAX_QUERY_LIMIT)
      : 30;

    const params: Array<string | number> = [];
    let whereClause = "status = 'succeeded'";
    if (provider) {
      whereClause += " AND provider = ?";
      params.push(provider);
    }
    params.push(limit);

    const rules = db
      .prepare(
        `
        SELECT provider, rule_id, rule_label,
               MAX(COALESCE(run_completed_at, updated_at, created_at)) AS learned_at
        FROM rule_learning_history
        WHERE ${whereClause}
        GROUP BY provider, rule_id, rule_label
        ORDER BY learned_at DESC
        LIMIT ?
      `,
      )
      .all(...params) as Array<{
      provider: RuleHistoryProvider;
      rule_id: string;
      rule_label: string;
      learned_at: number;
    }>;

    res.json({ ok: true, rules });
  });

  app.post("/api/agent-rules/unlearn", (req, res) => {
    pruneRuleLearningHistory();
    const rawProvider = String(req.body?.provider ?? "").trim().toLowerCase();
    const provider = isRuleHistoryProvider(rawProvider) ? rawProvider : null;
    if (!provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const ruleId = String(req.body?.ruleId ?? req.body?.rule_id ?? "").trim();
    if (!ruleId) {
      return res.status(400).json({ error: "ruleId required" });
    }

    const cliResult = runRuleUnlearnForProvider(provider, ruleId);
    if (!cliResult.ok) {
      return res.status(409).json({
        error: cliResult.message || "cli_unlearn_failed",
        code: "cli_unlearn_failed",
        provider,
        rule_id: ruleId,
        agent: cliResult.agent,
      });
    }

    const removed = db
      .prepare(
        `DELETE FROM rule_learning_history WHERE provider = ? AND rule_id = ? AND status = 'succeeded'`,
      )
      .run(provider, ruleId).changes;

    res.json({
      ok: true,
      provider,
      rule_id: ruleId,
      removed,
      cli: {
        agent: cliResult.agent,
        message: cliResult.message,
      },
    });
  });
}
