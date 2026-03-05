import type { RuntimeContext } from "../../../../types/runtime-context.ts";
import type { MemoryHistoryProvider, MemoryLearnStatus } from "./types.ts";
import { createMemoryLearnCore } from "./learn-core.ts";

export function registerMemoryLearningRoutes(ctx: RuntimeContext): void {
  const { app, db } = ctx;

  const {
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
  } = createMemoryLearnCore(ctx);

  app.post("/api/memory/learn", (req, res) => {
    pruneMemoryLearnJobs();
    const memoryId = String(req.body?.memoryId ?? "").trim();
    if (!memoryId) {
      return res.status(400).json({ error: "memoryId required" });
    }

    const rawProviders = req.body?.providers;
    if (!Array.isArray(rawProviders) || rawProviders.length === 0) {
      return res.status(400).json({ error: "providers required" });
    }
    const providers = rawProviders
      .map((v: unknown) => String(v ?? "").trim().toLowerCase())
      .filter(isMemoryLearnProvider);
    if (providers.length === 0) {
      return res.status(400).json({ error: "no valid providers" });
    }

    const memory = db
      .prepare("SELECT id, title, content, category, priority FROM memory_entries WHERE id = ?")
      .get(memoryId) as { id: string; title: string; content: string; category: string; priority: number } | undefined;
    if (!memory) {
      return res.status(404).json({ error: "memory_not_found" });
    }

    const job = createMemoryLearnJob(memory.id, memory.title, memory.content, memory.category, memory.priority, providers);
    res.status(202).json({ ok: true, job });
  });

  app.get("/api/memory/learn/:jobId", (req, res) => {
    pruneMemoryLearnJobs();
    const jobId = String(req.params.jobId ?? "").trim();
    const job = memoryLearnJobs.get(jobId);
    if (!job) {
      return res.status(404).json({ error: "job_not_found" });
    }
    res.json({ ok: true, job });
  });

  app.get("/api/memory/history", (req, res) => {
    pruneMemoryLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isMemoryHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const rawStatus = String(req.query.status ?? "").trim().toLowerCase();
    const status = rawStatus ? normalizeMemoryLearnStatus(rawStatus) : null;
    if (rawStatus && !status) {
      return res.status(400).json({ error: "invalid status" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MEMORY_LEARN_HISTORY_MAX_QUERY_LIMIT)
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
      SELECT id, job_id, provider, memory_id, memory_label, status, command, error,
             run_started_at, run_completed_at, created_at, updated_at
      FROM memory_learning_history
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const history = db.prepare(sql).all(...params) as Array<{
      id: string;
      job_id: string;
      provider: MemoryHistoryProvider;
      memory_id: string;
      memory_label: string;
      status: MemoryLearnStatus;
      command: string;
      error: string | null;
      run_started_at: number | null;
      run_completed_at: number | null;
      created_at: number;
      updated_at: number;
    }>;

    res.json({
      ok: true,
      retention_days: MEMORY_LEARN_HISTORY_RETENTION_DAYS,
      history,
    });
  });

  app.get("/api/memory/available", (req, res) => {
    pruneMemoryLearningHistory();
    const rawProvider = String(req.query.provider ?? "").trim().toLowerCase();
    const provider = rawProvider ? (isMemoryHistoryProvider(rawProvider) ? rawProvider : null) : null;
    if (rawProvider && !provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const requestedLimit = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MEMORY_LEARN_HISTORY_MAX_QUERY_LIMIT)
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
        SELECT provider, memory_id, memory_label,
               MAX(COALESCE(run_completed_at, updated_at, created_at)) AS learned_at
        FROM memory_learning_history
        WHERE ${whereClause}
        GROUP BY provider, memory_id, memory_label
        ORDER BY learned_at DESC
        LIMIT ?
      `,
      )
      .all(...params) as Array<{
      provider: MemoryHistoryProvider;
      memory_id: string;
      memory_label: string;
      learned_at: number;
    }>;

    res.json({ ok: true, entries });
  });

  app.post("/api/memory/unlearn", (req, res) => {
    pruneMemoryLearningHistory();
    const rawProvider = String(req.body?.provider ?? "").trim().toLowerCase();
    const provider = isMemoryHistoryProvider(rawProvider) ? rawProvider : null;
    if (!provider) {
      return res.status(400).json({ error: "invalid provider" });
    }

    const memoryId = String(req.body?.memoryId ?? req.body?.memory_id ?? "").trim();
    if (!memoryId) {
      return res.status(400).json({ error: "memoryId required" });
    }

    const cliResult = runMemoryUnlearnForProvider(provider, memoryId);
    if (!cliResult.ok) {
      return res.status(409).json({
        error: cliResult.message || "cli_unlearn_failed",
        code: "cli_unlearn_failed",
        provider,
        memory_id: memoryId,
        agent: cliResult.agent,
      });
    }

    const removed = db
      .prepare(
        `DELETE FROM memory_learning_history WHERE provider = ? AND memory_id = ? AND status = 'succeeded'`,
      )
      .run(provider, memoryId).changes;

    res.json({
      ok: true,
      provider,
      memory_id: memoryId,
      removed,
      cli: {
        agent: cliResult.agent,
        message: cliResult.message,
      },
    });
  });
}
