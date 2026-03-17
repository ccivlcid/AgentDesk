/**
 * Local LLM Manager — REST API routes
 * Phase 1+2: Ollama detection, model list, pull, delete, provider list, metrics, settings
 */
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { Express, Request, Response } from "express";
import logger from "../../../lib/logger.ts";
import {
  getAllBackendsStatus,
  startOllama,
  stopOllama,
} from "../../local-llm/backend-manager.ts";
import { createOllamaClient } from "../../local-llm/ollama-client.ts";
import { collectMetrics } from "../../local-llm/metrics-collector.ts";
import { createLmStudioClient } from "../../local-llm/lmstudio-client.ts";
import { createLlamaCppClient } from "../../local-llm/llamacpp-client.ts";
import { createJanClient } from "../../local-llm/jan-client.ts";
import { createInferenceLogger } from "../../local-llm/inference-logger.ts";

interface Deps {
  app: Express;
  db: DatabaseSync;
  broadcast: (event: string, payload: unknown) => void;
}

export function registerLocalLlmRoutes({ app, db, broadcast }: Deps): void {
  const inferenceLogger = createInferenceLogger(db);

  // ─── Backends ────────────────────────────────────────────────────────────

  /** GET /api/local-llm/backends */
  app.get("/api/local-llm/backends", async (_req: Request, res: Response) => {
    try {
      const backends = await getAllBackendsStatus();
      res.json({ ok: true, backends });
    } catch (err) {
      logger.error({ err }, "[local-llm] backends list error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/local-llm/backends/:name/start */
  app.post("/api/local-llm/backends/:name/start", async (req: Request, res: Response) => {
    const { name } = req.params as { name: string };
    if (name === "lmstudio") {
      return res.json({ ok: true, manual: true, message: "LM Studio is a desktop app — start it manually and enable the local server." });
    }
    if (name === "jan") {
      return res.json({ ok: true, manual: true, message: "Jan is a desktop app — start it manually and enable the API Server in Jan settings." });
    }
    if (name === "llamacpp") {
      return res.json({ ok: true, manual: true, message: "llama.cpp server must be started manually. Run: llama-server -m <model.gguf> --port 8080" });
    }
    if (name !== "ollama") {
      return res.status(400).json({ ok: false, error: `Backend "${name}" start not supported` });
    }
    const result = await startOllama();
    if (result.ok) {
      broadcast("local_llm_status", { backend: "ollama", running: true });
    }
    res.json(result);
  });

  /** POST /api/local-llm/backends/:name/stop */
  app.post("/api/local-llm/backends/:name/stop", async (req: Request, res: Response) => {
    const { name } = req.params as { name: string };
    if (name === "lmstudio") {
      return res.json({ ok: true, manual: true, message: "LM Studio is a desktop app — stop it manually from the system tray." });
    }
    if (name === "jan") {
      return res.json({ ok: true, manual: true, message: "Jan is a desktop app — stop it manually." });
    }
    if (name === "llamacpp") {
      return res.json({ ok: true, manual: true, message: "Stop the llama-server process manually (Ctrl+C or task manager)." });
    }
    if (name !== "ollama") {
      return res.status(400).json({ ok: false, error: `Backend "${name}" stop not supported` });
    }
    const result = await stopOllama();
    if (result.ok) {
      broadcast("local_llm_status", { backend: "ollama", running: false });
    }
    res.json(result);
  });

  /** POST /api/local-llm/backends/:name/restart */
  app.post("/api/local-llm/backends/:name/restart", async (req: Request, res: Response) => {
    const { name } = req.params as { name: string };
    if (name === "lmstudio") {
      return res.json({ ok: true, manual: true, message: "LM Studio is a desktop app — restart it manually." });
    }
    if (name === "jan") {
      return res.json({ ok: true, manual: true, message: "Jan is a desktop app — restart it manually." });
    }
    if (name === "llamacpp") {
      return res.json({ ok: true, manual: true, message: "Restart the llama-server process manually." });
    }
    if (name !== "ollama") {
      return res.status(400).json({ ok: false, error: `Backend "${name}" restart not supported` });
    }
    await stopOllama();
    await new Promise((r) => setTimeout(r, 1000));
    const result = await startOllama();
    if (result.ok) {
      broadcast("local_llm_status", { backend: "ollama", running: true });
    }
    res.json(result);
  });

  // ─── Models ──────────────────────────────────────────────────────────────

  /** GET /api/local-llm/models */
  app.get("/api/local-llm/models", async (req: Request, res: Response) => {
    const backend = (req.query["backend"] as string) ?? "ollama";
    try {
      const client = createOllamaClient("http://localhost:11434");
      const [models, running] = await Promise.all([
        client.listModels(),
        client.listRunning(),
      ]);
      const runningNames = new Set(running.map((r) => r.name));
      const formatted = models.map((m) => ({
        name: m.name,
        display_name: m.name.split(":")[0],
        backend,
        size_bytes: m.size,
        size_label: formatBytes(m.size),
        running: runningNames.has(m.name),
        vram_usage_bytes: running.find((r) => r.name === m.name)?.size_vram ?? 0,
        modified_at: new Date(m.modified_at).getTime(),
        details: m.details,
      }));
      const disk_used_bytes = models.reduce((s, m) => s + (m.size ?? 0), 0);
      res.json({ ok: true, models: formatted, disk_used_bytes, disk_used_label: formatBytes(disk_used_bytes) });
    } catch (err) {
      logger.warn({ err }, "[local-llm] models list error (ollama may not be running)");
      res.json({ ok: true, models: [], disk_used_bytes: 0, disk_used_label: "0 B" });
    }
  });

  /** GET /api/local-llm/models/gallery */
  app.get("/api/local-llm/models/gallery", (_req: Request, res: Response) => {
    res.json({ ok: true, models: GALLERY_MODELS });
  });

  /** POST /api/local-llm/models/pull — starts pull, streams via WebSocket */
  app.post("/api/local-llm/models/pull", async (req: Request, res: Response) => {
    const { backend = "ollama", model_name } = req.body as { backend?: string; model_name: string };
    if (!model_name) return res.status(400).json({ ok: false, error: "model_name required" });
    if (backend !== "ollama") return res.status(400).json({ ok: false, error: "Only ollama supported in Phase 1" });

    // Start async pull and stream progress via WebSocket
    res.json({ ok: true, message: `Pulling ${model_name} in background` });

    (async () => {
      try {
        const client = createOllamaClient("http://localhost:11434");
        let lastPercent = -1;
        for await (const progress of client.pullModel(model_name)) {
          const percent = progress.total
            ? Math.round(((progress.completed ?? 0) / progress.total) * 100)
            : 0;
          if (percent !== lastPercent || progress.status === "success") {
            lastPercent = percent;
            broadcast("local_llm_pull_progress", {
              model: model_name,
              status: progress.status === "success" ? "done" : "downloading",
              completed: progress.completed ?? 0,
              total: progress.total ?? 0,
              percent,
            });
          }
        }
        broadcast("local_llm_pull_progress", {
          model: model_name,
          status: "done",
          percent: 100,
        });
        logger.info(`[local-llm] pull complete: ${model_name}`);
      } catch (err) {
        logger.error({ err }, `[local-llm] pull error: ${model_name}`);
        broadcast("local_llm_pull_progress", {
          model: model_name,
          status: "error",
          error: String(err),
        });
      }
    })();
  });

  /** DELETE /api/local-llm/models/:name */
  app.delete("/api/local-llm/models/:name", async (req: Request, res: Response) => {
    const modelName = decodeURIComponent(req.params["name"] as string);
    try {
      const client = createOllamaClient("http://localhost:11434");
      await client.deleteModel(modelName);
      // Sync DB
      db.prepare("DELETE FROM local_llm_models WHERE backend='ollama' AND name=?").run(modelName);
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "[local-llm] delete model error");
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Provider bridge (for agent edit modal) ──────────────────────────────

  /** GET /api/local-llm/providers */
  app.get("/api/local-llm/providers", async (_req: Request, res: Response) => {
    const providers: object[] = [];

    // Ollama providers
    try {
      const client = createOllamaClient("http://localhost:11434");
      const [models, running] = await Promise.all([client.listModels(), client.listRunning()]);
      const runningNames = new Set(running.map((r) => r.name));
      for (const m of models) {
        providers.push({
          id: `ollama::${m.name}`,
          label: `${m.name}`,
          group: "Ollama",
          backend: "ollama",
          model: m.name,
          base_url: "http://localhost:11434/v1",
          running: runningNames.has(m.name),
          free: true,
        });
      }
    } catch { /* ollama not running */ }

    // LM Studio providers
    try {
      const lmClient = createLmStudioClient("http://localhost:1234");
      const alive = await lmClient.ping();
      if (alive) {
        const models = await lmClient.listModels();
        for (const m of models) {
          providers.push({
            id: `lmstudio::${m.id}`,
            label: m.id,
            group: "LM Studio",
            backend: "lmstudio",
            model: m.id,
            base_url: "http://localhost:1234/v1",
            running: true,
            free: true,
          });
        }
      }
    } catch { /* lm studio not running */ }

    // llama.cpp server providers
    try {
      const llamaClient = createLlamaCppClient("http://localhost:8080");
      const alive = await llamaClient.ping();
      if (alive) {
        const models = await llamaClient.listModels();
        if (models.length > 0) {
          for (const m of models) {
            providers.push({
              id: `llamacpp::${m.id}`,
              label: m.id,
              group: "llama.cpp",
              backend: "llamacpp",
              model: m.id,
              base_url: "http://localhost:8080/v1",
              running: true,
              free: true,
            });
          }
        } else {
          // Server running but no /v1/models endpoint — expose generic entry
          providers.push({
            id: "llamacpp::server",
            label: "llama.cpp server",
            group: "llama.cpp",
            backend: "llamacpp",
            model: "",
            base_url: "http://localhost:8080/v1",
            running: true,
            free: true,
          });
        }
      }
    } catch { /* llamacpp not running */ }

    // Jan providers
    try {
      const janClient = createJanClient("http://localhost:1337");
      const alive = await janClient.ping();
      if (alive) {
        const models = await janClient.listModels();
        for (const m of models) {
          providers.push({
            id: `jan::${m.id}`,
            label: m.id,
            group: "Jan",
            backend: "jan",
            model: m.id,
            base_url: "http://localhost:1337/v1",
            running: true,
            free: true,
          });
        }
      }
    } catch { /* jan not running */ }

    res.json({ ok: true, providers });
  });

  /** POST /api/local-llm/providers/test */
  app.post("/api/local-llm/providers/test", async (req: Request, res: Response) => {
    const { backend = "ollama" } = req.body as { backend?: string };
    if (backend !== "ollama") return res.json({ ok: false, error: "Unsupported backend" });
    const client = createOllamaClient("http://localhost:11434");
    const alive = await client.ping();
    res.json({ ok: alive, message: alive ? "Ollama is running" : "Ollama is not running" });
  });

  // ─── Sync DB with live Ollama model list ─────────────────────────────────

  /** POST /api/local-llm/sync — pull Ollama model list → local_llm_models */
  app.post("/api/local-llm/sync", async (_req: Request, res: Response) => {
    try {
      const client = createOllamaClient("http://localhost:11434");
      const models = await client.listModels();
      const nowMs = Date.now();
      for (const m of models) {
        const existing = db.prepare("SELECT id FROM local_llm_models WHERE backend='ollama' AND name=?").get(m.name);
        if (!existing) {
          db.prepare(
            "INSERT INTO local_llm_models (id,backend,name,display_name,size_bytes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
          ).run(randomUUID(), "ollama", m.name, m.name.split(":")[0], m.size ?? 0, nowMs, nowMs);
        }
      }
      res.json({ ok: true, synced: models.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Metrics ─────────────────────────────────────────────────────────────

  /** GET /api/local-llm/metrics */
  app.get("/api/local-llm/metrics", async (_req: Request, res: Response) => {
    try {
      const snapshot = await collectMetrics();
      res.json({ ok: true, ...snapshot });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/local-llm/metrics/history?limit=50 */
  app.get("/api/local-llm/metrics/history", (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number((req.query["limit"] as string) ?? "50"), 200);
      res.json({ ok: true, history: inferenceLogger.getHistory(limit) });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** GET /api/local-llm/metrics/stats — per-model aggregates */
  app.get("/api/local-llm/metrics/stats", (_req: Request, res: Response) => {
    try {
      res.json({ ok: true, stats: inferenceLogger.getStatsByModel() });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** POST /api/local-llm/log — record inference event (called internally) */
  app.post("/api/local-llm/log", (req: Request, res: Response) => {
    try {
      inferenceLogger.log(req.body);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ─── Backend settings (host/port/autostart) ───────────────────────────────

  /** GET /api/local-llm/settings */
  app.get("/api/local-llm/settings", (_req: Request, res: Response) => {
    try {
      const rows = db.prepare("SELECT * FROM local_llm_backends").all();
      // Return defaults if table is empty
      const backends = (rows as any[]).length > 0 ? rows : [
        { name: "ollama", installed: 0, host: "localhost", port: 11434, auto_start: 1 },
      ];
      res.json({ ok: true, backends });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /** PATCH /api/local-llm/settings/:name */
  app.patch("/api/local-llm/settings/:name", (req: Request, res: Response) => {
    const { name } = req.params as { name: string };
    const { host, port, auto_start } = req.body as { host?: string; port?: number; auto_start?: boolean };
    const nowMs = Date.now();
    try {
      const existing = db.prepare("SELECT name FROM local_llm_backends WHERE name=?").get(name);
      if (existing) {
        if (host !== undefined) db.prepare("UPDATE local_llm_backends SET host=?, updated_at=? WHERE name=?").run(host, nowMs, name);
        if (port !== undefined) db.prepare("UPDATE local_llm_backends SET port=?, updated_at=? WHERE name=?").run(port, nowMs, name);
        if (auto_start !== undefined) db.prepare("UPDATE local_llm_backends SET auto_start=?, updated_at=? WHERE name=?").run(auto_start ? 1 : 0, nowMs, name);
      } else {
        db.prepare(
          "INSERT INTO local_llm_backends (name, host, port, auto_start, created_at, updated_at) VALUES (?,?,?,?,?,?)",
        ).run(name, host ?? "localhost", port ?? 11434, auto_start ? 1 : 0, nowMs, nowMs);
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  /**
   * POST /api/local-llm/setup-provider
   * Auto-create an api_providers entry for Ollama or LM Studio if one doesn't exist.
   * Called by the agent edit modal when a local model is selected.
   */
  app.post("/api/local-llm/setup-provider", async (req: Request, res: Response) => {
    const { backend } = req.body as { backend?: string };
    const cfg = backend === "lmstudio"
      ? { name: "LM Studio (Local)", type: "custom", base_url: "http://localhost:1234/v1", pingUrl: "http://localhost:1234/v1/models" }
      : { name: "Ollama (Local)", type: "ollama", base_url: "http://localhost:11434/v1", pingUrl: "http://localhost:11434/api/tags" };

    // Return existing provider if already registered for this base_url
    const existing = db.prepare("SELECT id FROM api_providers WHERE base_url = ? LIMIT 1").get(cfg.base_url) as { id: string } | undefined;
    if (existing) return res.json({ ok: true, provider_id: existing.id });

    // Verify backend is reachable
    try {
      const pingResp = await fetch(cfg.pingUrl, { signal: AbortSignal.timeout(3_000) });
      if (!pingResp.ok) return res.status(502).json({ ok: false, error: `${backend || "ollama"}_not_responding` });
    } catch {
      return res.status(502).json({ ok: false, error: `${backend || "ollama"}_not_reachable` });
    }

    // Fetch model list for models_cache
    let modelsCache: string[] = [];
    try {
      if (backend === "lmstudio") {
        const r = await fetch("http://localhost:1234/v1/models", { signal: AbortSignal.timeout(3_000) });
        const d = await r.json() as { data?: Array<{ id: string }> };
        modelsCache = (d.data ?? []).map((m) => m.id);
      } else {
        const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3_000) });
        const d = await r.json() as { models?: Array<{ name: string }> };
        modelsCache = (d.models ?? []).map((m) => m.name);
      }
    } catch { /* cache is optional */ }

    const id = randomUUID();
    const now = Date.now();
    db.prepare(
      "INSERT INTO api_providers (id, name, type, base_url, api_key_enc, enabled, models_cache, models_cached_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(id, cfg.name, cfg.type, cfg.base_url, null, 1, JSON.stringify(modelsCache), now, now, now);

    res.json({ ok: true, provider_id: id });
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

// min_ram_gb: minimum system RAM for CPU-only inference
// min_vram_gb: minimum GPU VRAM for full GPU inference
const GALLERY_MODELS = [
  // ── Tiny / CPU-friendly ──────────────────────────────────────────
  {
    name: "llama3.2:1b",
    display_name: "Llama 3.2 1B",
    vendor: "Meta",
    size_label: "~0.8 GB",
    context_length: 131072,
    description: "Lightest option. Fits in minimal VRAM. Good for edge devices.",
    tags: ["chat", "tiny", "cpu"],
    min_ram_gb: 3,
    min_vram_gb: 2,
  },
  {
    name: "qwen2.5:0.5b",
    display_name: "Qwen 2.5 0.5B",
    vendor: "Alibaba",
    size_label: "~0.4 GB",
    context_length: 32768,
    description: "Ultra-small multilingual model. Ideal for testing pipelines.",
    tags: ["tiny", "multilingual", "cpu"],
    min_ram_gb: 2,
    min_vram_gb: 1,
  },
  {
    name: "phi3.5:3.8b",
    display_name: "Phi-3.5 Mini",
    vendor: "Microsoft",
    size_label: "~2.2 GB",
    context_length: 128000,
    description: "High quality per parameter. Strong reasoning at small size.",
    tags: ["chat", "reasoning", "small"],
    min_ram_gb: 5,
    min_vram_gb: 3,
  },
  {
    name: "gemma3:1b",
    display_name: "Gemma 3 1B",
    vendor: "Google",
    size_label: "~0.8 GB",
    context_length: 32768,
    description: "Google's compact model. Fast responses, low resource use.",
    tags: ["chat", "tiny", "fast"],
    min_ram_gb: 3,
    min_vram_gb: 2,
  },
  // ── Small / balanced ─────────────────────────────────────────────
  {
    name: "llama3.2:3b",
    display_name: "Llama 3.2 3B",
    vendor: "Meta",
    size_label: "~2.0 GB",
    context_length: 131072,
    description: "Fast & small. Good for quick tasks and chat.",
    tags: ["chat", "fast", "small"],
    min_ram_gb: 5,
    min_vram_gb: 3,
  },
  {
    name: "mistral:7b",
    display_name: "Mistral 7B",
    vendor: "Mistral AI",
    size_label: "~4.1 GB",
    context_length: 32768,
    description: "Strong reasoning in 7B class. Great balance of speed and quality.",
    tags: ["chat", "reasoning", "balanced"],
    min_ram_gb: 8,
    min_vram_gb: 6,
  },
  {
    name: "qwen2.5:7b",
    display_name: "Qwen 2.5 7B",
    vendor: "Alibaba",
    size_label: "~4.4 GB",
    context_length: 128000,
    description: "Excellent code and multilingual support with long context.",
    tags: ["code", "multilingual", "balanced"],
    min_ram_gb: 8,
    min_vram_gb: 6,
  },
  {
    name: "gemma3:4b",
    display_name: "Gemma 3 4B",
    vendor: "Google",
    size_label: "~2.5 GB",
    context_length: 128000,
    description: "Latest Gemma model with improved instruction following.",
    tags: ["chat", "fast", "balanced"],
    min_ram_gb: 6,
    min_vram_gb: 4,
  },
  {
    name: "llama3.1:8b",
    display_name: "Llama 3.1 8B",
    vendor: "Meta",
    size_label: "~4.7 GB",
    context_length: 131072,
    description: "Solid all-rounder. Tool calling support, long context.",
    tags: ["chat", "tools", "balanced"],
    min_ram_gb: 10,
    min_vram_gb: 6,
  },
  // ── Code-focused ──────────────────────────────────────────────────
  {
    name: "codellama:7b",
    display_name: "Code Llama 7B",
    vendor: "Meta",
    size_label: "~3.8 GB",
    context_length: 16384,
    description: "Dedicated code model. Completion, generation, and debugging.",
    tags: ["code", "completion", "debug"],
    min_ram_gb: 8,
    min_vram_gb: 5,
  },
  {
    name: "qwen2.5-coder:7b",
    display_name: "Qwen 2.5 Coder 7B",
    vendor: "Alibaba",
    size_label: "~4.4 GB",
    context_length: 131072,
    description: "State-of-the-art code model with very long context window.",
    tags: ["code", "completion", "long-ctx"],
    min_ram_gb: 8,
    min_vram_gb: 6,
  },
  {
    name: "deepseek-coder-v2:16b",
    display_name: "DeepSeek Coder V2 16B",
    vendor: "DeepSeek",
    size_label: "~8.9 GB",
    context_length: 163840,
    description: "MoE code model. Excellent at multi-file and complex codebases.",
    tags: ["code", "moe", "large"],
    min_ram_gb: 16,
    min_vram_gb: 12,
  },
  // ── Reasoning / math ─────────────────────────────────────────────
  {
    name: "deepseek-r1:8b",
    display_name: "DeepSeek R1 8B",
    vendor: "DeepSeek",
    size_label: "~4.9 GB",
    context_length: 65536,
    description: "Reasoning-focused. Strong at math and step-by-step logic.",
    tags: ["reasoning", "math", "code"],
    min_ram_gb: 10,
    min_vram_gb: 6,
  },
  {
    name: "deepseek-r1:14b",
    display_name: "DeepSeek R1 14B",
    vendor: "DeepSeek",
    size_label: "~8.5 GB",
    context_length: 65536,
    description: "Larger reasoning model. Best-in-class math and science tasks.",
    tags: ["reasoning", "math", "large"],
    min_ram_gb: 16,
    min_vram_gb: 10,
  },
  {
    name: "qwq:32b",
    display_name: "QwQ 32B",
    vendor: "Alibaba",
    size_label: "~20 GB",
    context_length: 32768,
    description: "Thinking model from Qwen team. Rivals o1 on complex reasoning.",
    tags: ["reasoning", "math", "large"],
    min_ram_gb: 32,
    min_vram_gb: 22,
  },
  // ── Large / flagship ─────────────────────────────────────────────
  {
    name: "phi4:14b",
    display_name: "Phi-4 14B",
    vendor: "Microsoft",
    size_label: "~8.9 GB",
    context_length: 16384,
    description: "Compact yet capable. Strong instruction following and STEM.",
    tags: ["chat", "instruction", "compact"],
    min_ram_gb: 16,
    min_vram_gb: 10,
  },
  {
    name: "llama3.3:70b",
    display_name: "Llama 3.3 70B",
    vendor: "Meta",
    size_label: "~43 GB",
    context_length: 131072,
    description: "Meta's flagship open model. Near GPT-4 quality.",
    tags: ["chat", "flagship", "large"],
    min_ram_gb: 64,
    min_vram_gb: 48,
  },
  {
    name: "mistral-small:22b",
    display_name: "Mistral Small 22B",
    vendor: "Mistral AI",
    size_label: "~13 GB",
    context_length: 128000,
    description: "Best performance-per-GB from Mistral. Enterprise-grade quality.",
    tags: ["chat", "reasoning", "large"],
    min_ram_gb: 24,
    min_vram_gb: 14,
  },
  {
    name: "gemma3:27b",
    display_name: "Gemma 3 27B",
    vendor: "Google",
    size_label: "~17 GB",
    context_length: 128000,
    description: "Google's largest open model. Excellent multimodal understanding.",
    tags: ["chat", "multimodal", "large"],
    min_ram_gb: 28,
    min_vram_gb: 18,
  },
  {
    name: "command-r:35b",
    display_name: "Command R 35B",
    vendor: "Cohere",
    size_label: "~21 GB",
    context_length: 128000,
    description: "Optimized for RAG and tool use. High factual accuracy.",
    tags: ["rag", "tools", "large"],
    min_ram_gb: 36,
    min_vram_gb: 22,
  },
];
