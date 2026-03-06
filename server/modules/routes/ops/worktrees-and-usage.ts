import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { RuntimeContext } from "../../../types/runtime-context.ts";
import type { CliUsageEntry } from "../shared/types.ts";

export function registerWorktreeAndUsageRoutes(ctx: RuntimeContext): {
  refreshCliUsageData: () => Promise<Record<string, CliUsageEntry>>;
  checkCostBlockExecution: () => { blocked: boolean; provider?: string; pct?: number; threshold?: number };
} {
  const {
    app,
    taskWorktrees,
    mergeWorktree,
    cleanupWorktree,
    appendTaskLog,
    resolveLang,
    pickL,
    l,
    notifyCeo,
    db,
    nowMs,
    CLI_TOOLS,
    fetchClaudeUsage,
    fetchCodexUsage,
    fetchGeminiUsage,
    broadcast,
  } = ctx;

  app.get("/api/tasks/:id/diff", (req, res) => {
    const id = String(req.params.id);
    const wtInfo = taskWorktrees.get(id);
    if (!wtInfo) {
      return res.json({ ok: true, hasWorktree: false, diff: "", stat: "" });
    }

    try {
      const currentBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: wtInfo.projectPath,
        stdio: "pipe",
        timeout: 5000,
      })
        .toString()
        .trim();

      const stat = execFileSync("git", ["diff", `${currentBranch}...${wtInfo.branchName}`, "--stat"], {
        cwd: wtInfo.projectPath,
        stdio: "pipe",
        timeout: 10000,
      })
        .toString()
        .trim();

      const diff = execFileSync("git", ["diff", `${currentBranch}...${wtInfo.branchName}`], {
        cwd: wtInfo.projectPath,
        stdio: "pipe",
        timeout: 15000,
      }).toString();

      res.json({
        ok: true,
        hasWorktree: true,
        branchName: wtInfo.branchName,
        stat,
        diff: diff.length > 50000 ? diff.slice(0, 50000) + "\n... (truncated)" : diff,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.json({ ok: false, error: msg });
    }
  });

  app.post("/api/tasks/:id/merge", (req, res) => {
    const id = String(req.params.id);
    const wtInfo = taskWorktrees.get(id);
    if (!wtInfo) {
      return res.status(404).json({ error: "no_worktree", message: "No worktree found for this task" });
    }

    const result = mergeWorktree(wtInfo.projectPath, id);
    const lang = resolveLang();

    if (result.success) {
      cleanupWorktree(wtInfo.projectPath, id);
      appendTaskLog(id, "system", `Manual merge completed: ${result.message}`);
      notifyCeo(
        pickL(
          l(
            [`수동 병합 완료: ${result.message}`],
            [`Manual merge completed: ${result.message}`],
            [`手動マージ完了: ${result.message}`],
            [`手动合并完成: ${result.message}`],
          ),
          lang,
        ),
        id,
      );
    } else {
      appendTaskLog(id, "system", `Manual merge failed: ${result.message}`);
    }

    res.json({ ok: result.success, message: result.message, conflicts: result.conflicts });
  });

  app.post("/api/tasks/:id/discard", (req, res) => {
    const id = String(req.params.id);
    const wtInfo = taskWorktrees.get(id);
    if (!wtInfo) {
      return res.status(404).json({ error: "no_worktree", message: "No worktree found for this task" });
    }

    cleanupWorktree(wtInfo.projectPath, id);
    appendTaskLog(id, "system", "Worktree discarded (changes abandoned)");
    const lang = resolveLang();
    notifyCeo(
      pickL(
        l(
          [`작업 브랜치가 폐기되었습니다: agentdesk/${id.slice(0, 8)}`],
          [`Task branch discarded: agentdesk/${id.slice(0, 8)}`],
          [`タスクブランチを破棄しました: agentdesk/${id.slice(0, 8)}`],
          [`任务分支已丢弃: agentdesk/${id.slice(0, 8)}`],
        ),
        lang,
      ),
      id,
    );

    res.json({ ok: true, message: "Worktree discarded" });
  });

  app.get("/api/worktrees", (_req, res) => {
    const entries: Array<{ taskId: string; branchName: string; worktreePath: string; projectPath: string }> = [];
    for (const [taskId, info] of taskWorktrees) {
      entries.push({ taskId, ...info });
    }
    res.json({ ok: true, worktrees: entries });
  });

  function readCliUsageFromDb(): Record<string, CliUsageEntry> {
    const rows = db.prepare("SELECT provider, data_json FROM cli_usage_cache").all() as Array<{
      provider: string;
      data_json: string;
    }>;
    const usage: Record<string, CliUsageEntry> = {};
    for (const row of rows) {
      try {
        usage[row.provider] = JSON.parse(row.data_json);
      } catch {
        // invalid json row
      }
    }
    return usage;
  }

  async function refreshCliUsageData(): Promise<Record<string, CliUsageEntry>> {
    const providers = ["claude", "codex", "gemini", "copilot", "antigravity"];
    const usage: Record<string, CliUsageEntry> = {};

    const fetchMap: Record<string, () => Promise<CliUsageEntry>> = {
      claude: fetchClaudeUsage,
      codex: fetchCodexUsage,
      gemini: fetchGeminiUsage,
    };

    const fetches = providers.map(async (p) => {
      const tool = CLI_TOOLS.find((t) => t.name === p);
      if (!tool) {
        usage[p] = { windows: [], error: "not_implemented" };
        return;
      }
      if (!tool.checkAuth()) {
        usage[p] = { windows: [], error: "unauthenticated" };
        return;
      }
      const fetcher = fetchMap[p];
      if (fetcher) {
        usage[p] = await fetcher();
      } else {
        usage[p] = { windows: [], error: "not_implemented" };
      }
    });

    await Promise.all(fetches);

    const upsert = db.prepare(
      "INSERT INTO cli_usage_cache (provider, data_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(provider) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at",
    );
    const now = nowMs();
    for (const [p, entry] of Object.entries(usage)) {
      upsert.run(p, JSON.stringify(entry), now);
    }

    return usage;
  }

  app.get("/api/cli-usage", async (_req, res) => {
    let usage = readCliUsageFromDb();
    if (Object.keys(usage).length === 0) {
      usage = await refreshCliUsageData();
    }
    res.json({ ok: true, usage });
  });

  app.post("/api/cli-usage/refresh", async (_req, res) => {
    try {
      const usage = await refreshCliUsageData();
      broadcast("cli_usage_update", usage);
      checkCostAlerts(usage);
      res.json({ ok: true, usage });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // ---------------------------------------------------------------------------
  // Cost Alert Thresholds
  // ---------------------------------------------------------------------------

  interface CostAlertConfig {
    [provider: string]: { alertThreshold: number; enabled: boolean };
  }

  function readCostAlertConfig(): CostAlertConfig {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'cost_alert_config'").get() as
      | { value: string }
      | undefined;
    if (!row) return {};
    try {
      return JSON.parse(row.value);
    } catch {
      return {};
    }
  }

  function writeCostAlertConfig(config: CostAlertConfig): void {
    const json = JSON.stringify(config);
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('cost_alert_config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(json);
  }

  app.get("/api/cost-alerts", (_req, res) => {
    res.json({ ok: true, config: readCostAlertConfig() });
  });

  app.put("/api/cost-alerts", (req, res) => {
    const body = req.body as CostAlertConfig;
    writeCostAlertConfig(body);
    res.json({ ok: true, config: body });
  });

  // Track which alerts we've already sent (per provider per window label) to avoid spam
  const sentAlerts = new Set<string>();

  function checkCostAlerts(usage: Record<string, CliUsageEntry>): void {
    const config = readCostAlertConfig();
    const now = nowMs();

    for (const [provider, entry] of Object.entries(usage)) {
      if (entry.error || !entry.windows?.length) continue;
      const alertConfig = config[provider];
      if (!alertConfig?.enabled) continue;
      const threshold = alertConfig.alertThreshold;
      if (!threshold || threshold <= 0) continue;

      for (const win of entry.windows) {
        const utilization = (win as any).utilization as number | undefined;
        if (utilization == null) continue;
        const pct = Math.round(utilization * 100);
        if (pct < threshold) continue;

        const alertKey = `${provider}:${(win as any).label ?? "default"}`;
        if (sentAlerts.has(alertKey)) continue;
        sentAlerts.add(alertKey);
        // Reset alert key after 1 hour so it can fire again
        setTimeout(() => sentAlerts.delete(alertKey), 60 * 60 * 1000);

        // Create notification
        const id = randomUUID();
        const title = `${provider.charAt(0).toUpperCase() + provider.slice(1)} usage alert: ${pct}%`;
        const body = `${(win as any).label ?? provider} utilization is at ${pct}%, exceeding the ${threshold}% threshold.`;

        db.prepare(
          "INSERT INTO notifications (id, type, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        ).run(id, "cost_alert", title, body, now);

        broadcast("notification", { id, type: "cost_alert", title, body, read: 0, created_at: now });
      }
    }
  }

  /**
   * Check if any provider exceeds a "block execution" threshold.
   * Block threshold = alertThreshold + 15% (capped at 100%).
   * Returns the blocking provider name if exceeded, null otherwise.
   */
  function checkCostBlockExecution(): { blocked: boolean; provider?: string; pct?: number; threshold?: number } {
    const config = readCostAlertConfig();
    const usage = readCliUsageFromDb();

    for (const [provider, entry] of Object.entries(usage)) {
      if (entry.error || !entry.windows?.length) continue;
      const alertConfig = config[provider];
      if (!alertConfig?.enabled) continue;
      const alertThreshold = alertConfig.alertThreshold;
      if (!alertThreshold || alertThreshold <= 0) continue;

      // Block threshold is alert + 15, capped at 100
      const blockThreshold = Math.min(alertThreshold + 15, 100);

      for (const win of entry.windows) {
        const utilization = (win as any).utilization as number | undefined;
        if (utilization == null) continue;
        const pct = Math.round(utilization * 100);
        if (pct >= blockThreshold) {
          return { blocked: true, provider, pct, threshold: blockThreshold };
        }
      }
    }

    return { blocked: false };
  }

  app.get("/api/cost-block-check", (_req, res) => {
    res.json({ ok: true, ...checkCostBlockExecution() });
  });

  return { refreshCliUsageData, checkCostBlockExecution };
}
