import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { HookHistoryProvider, HookLearnStatus } from "./types.ts";
import { createHookLearnCore } from "./learn-core.ts";

export function registerHookLearningRoutes(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  const {
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
  } = createHookLearnCore(ctx);

  app.post("/api/hooks/learn", (req, res) => {
    pruneHookLearnJobs();
    const hookId = String(req.body?.hookId ?? "").trim();
    if (!hookId) {
      return res.status(400).json({ error: "hookId required" });
    }

    const rawProviders = req.body?.providers;
    if (!Array.isArray(rawProviders) || rawProviders.length === 0) {
      return res.status(400).json({ error: "providers required" });
    }
    const providers = rawProviders
      .map((v: unknown) => String(v ?? "").trim().toLowerCase())
      .filter(isHookLearnProvider);
    if (providers.length === 0) {
      return res.status(400).json({ error: "no valid providers" });
    }

    const hook = db
      .prepare("SELECT id, title, command, event_type, priority FROM hook_entries WHERE id = ?")
      .get(hookId) as { id: string; title: string; command: string; event_type: string; priority: number } | undefined;
    if (!hook) {
      return res.status(404).json({ error: "hook_not_found" });
    }

    const job = createHookLearnJob(hook.id, hook.title, hook.command, hook.event_type, hook.priority, providers);
    res.status(202).json({ ok: true, job });
  });

  app.get("/api/hooks/learn/:jobId", (req, res) => {
    pruneHookLearnJobs();
    const jobId = String(req.params.jobId ?? "").trim();
    const job = hookLearnJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }
    res.json({ ok: true, job });
  });

  app.get("/api/hooks/history", (req, res) => {
    pruneHookLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isHookHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const rawStatus = String(req.query.status ?? "").trim().toLowerCase();
    const status = rawStatus ? normalizeHookLearnStatus(rawStatus) : null;
    if (rawStatus && !status) {
      return res.status(400).json({ error: "invalid status" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), HOOK_LEARN_HISTORY_MAX_QUERY_LIMIT)
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
      SELECT id, job_id, provider, hook_id, hook_label, status, command, error,
             run_started_at, run_completed_at, created_at, updated_at
      FROM hook_learning_history
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const history = db.prepare(sql).all(...params) as Array<{
      id: string;
      job_id: string;
      provider: HookHistoryProvider;
      hook_id: string;
      hook_label: string;
      status: HookLearnStatus;
      command: string;
      error: string | null;
      run_started_at: number | null;
      run_completed_at: number | null;
      created_at: number;
      updated_at: number;
    }>;

    res.json({
      ok: true,
      retention_days: HOOK_LEARN_HISTORY_RETENTION_DAYS,
      history,
    });
  });

  app.get("/api/hooks/available", (req, res) => {
    pruneHookLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isHookHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), HOOK_LEARN_HISTORY_MAX_QUERY_LIMIT)
      : 30;

    const params: Array<string | number> = [];
    let whereClause = "status = 'succeeded'";
    if (provider) {
      whereClause += " AND provider = ?";
      params.push(provider);
    }
    params.push(limit);

    const entries = db
      .prepare(
        `
        SELECT provider, hook_id, hook_label,
               MAX(COALESCE(run_completed_at, updated_at, created_at)) AS learned_at
        FROM hook_learning_history
        WHERE ${whereClause}
        GROUP BY provider, hook_id, hook_label
        ORDER BY learned_at DESC
        LIMIT ?
      `,
      )
      .all(...params) as Array<{
      provider: HookHistoryProvider;
      hook_id: string;
      hook_label: string;
      learned_at: number;
    }>;

    res.json({ ok: true, entries });
  });

  app.post("/api/hooks/unlearn", (req, res) => {
    pruneHookLearningHistory();
    const rawProvider = String(req.body?.provider ?? "").trim().toLowerCase();
    const provider = isHookHistoryProvider(rawProvider) ? rawProvider : null;
    if (!provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const hookId = String(req.body?.hookId ?? req.body?.hook_id ?? "").trim();
    if (!hookId) {
      return res.status(400).json({ error: "hookId required" });
    }

    const cliResult = runHookUnlearnForProvider(provider, hookId);
    if (!cliResult.ok) {
      return res.status(409).json({
        error: cliResult.message || "cli_unlearn_failed",
        code: "cli_unlearn_failed",
        provider,
        hook_id: hookId,
        agent: cliResult.agent,
      });
    }

    const removed = db
      .prepare(
        `DELETE FROM hook_learning_history WHERE provider = ? AND hook_id = ? AND status = 'succeeded'`,
      )
      .run(provider, hookId).changes;

    res.json({
      ok: true,
      provider,
      hook_id: hookId,
      removed,
      cli: {
        agent: cliResult.agent,
        message: cliResult.message,
      },
    });
  });
}
