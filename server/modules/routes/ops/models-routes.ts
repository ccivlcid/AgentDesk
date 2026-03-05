import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { RuntimeContext } from "../../../types/runtime-context.ts";

interface CliModelInfoServer {
  slug: string;
  displayName?: string;
  description?: string;
  reasoningLevels?: Array<{ effort: string; description: string }>;
  defaultReasoningLevel?: string;
}

export function registerModelRoutes(ctx: RuntimeContext): void {
  const { app, db, exchangeCopilotToken, getPreferredOAuthAccounts, execWithTimeout } = ctx;
  let cachedModels = ctx.cachedModels;
  let cachedCliModels: { data: Record<string, CliModelInfoServer[]>; loadedAt: number } | null = null;

  async function fetchCopilotModelsFromAPI(): Promise<string[]> {
    try {
      const accounts = getPreferredOAuthAccounts("github");
      const account = accounts.find((a: any) => Boolean(a.accessToken));
      if (!account) return [];

      const { token, baseUrl } = await exchangeCopilotToken(account.accessToken);
      const resp = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "agentdesk",
          "Editor-Version": "agentdesk/1.0.0",
          "Copilot-Integration-Id": "vscode-chat",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) return [];

      const data = (await resp.json()) as { data?: Array<{ id?: string }> };
      const seen = new Set<string>();
      const models: string[] = [];
      if (data.data && Array.isArray(data.data)) {
        for (const m of data.data) {
          if (m.id) {
            const slug = `github-copilot/${m.id}`;
            if (!seen.has(slug)) {
              seen.add(slug);
              models.push(slug);
            }
          }
        }
      }
      return models;
    } catch {
      return [];
    }
  }

  async function fetchOpenCodeModels(): Promise<Record<string, string[]>> {
    const grouped: Record<string, string[]> = { opencode: [] };
    try {
      const output = await execWithTimeout("opencode", ["models"], 10_000);
      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes("/")) continue;
        const slashIdx = trimmed.indexOf("/");
        const provider = trimmed.slice(0, slashIdx);
        if (provider === "github-copilot") {
          if (!grouped.copilot) grouped.copilot = [];
          if (!grouped.copilot.includes(trimmed)) grouped.copilot.push(trimmed);
        } else if (provider === "google" && trimmed.includes("antigravity")) {
          if (!grouped.antigravity) grouped.antigravity = [];
          if (!grouped.antigravity.includes(trimmed)) grouped.antigravity.push(trimmed);
        } else {
          if (!grouped.opencode.includes(trimmed)) grouped.opencode.push(trimmed);
        }
      }
    } catch {
      // opencode not available
    }
    return grouped;
  }

  function readCodexModelsCache(): CliModelInfoServer[] {
    try {
      const cachePath = path.join(os.homedir(), ".codex", "models_cache.json");
      if (!fs.existsSync(cachePath)) return [];
      const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      const modelsArr: Array<{
        slug?: string;
        display_name?: string;
        description?: string;
        visibility?: string;
        priority?: number;
        supported_reasoning_levels?: Array<{ effort: string; description: string }>;
        default_reasoning_level?: string;
      }> = Array.isArray(raw) ? raw : raw.models || raw.data || [];

      const listModels = modelsArr
        .filter((m) => m.visibility === "list" && m.slug)
        .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

      return listModels.map((m) => ({
        slug: m.slug!,
        displayName: m.display_name || m.slug!,
        description: m.description,
        reasoningLevels:
          m.supported_reasoning_levels && m.supported_reasoning_levels.length > 0
            ? m.supported_reasoning_levels
            : undefined,
        defaultReasoningLevel: m.default_reasoning_level || undefined,
      }));
    } catch {
      return [];
    }
  }

  function fetchGeminiModels(): CliModelInfoServer[] {
    const FALLBACK: CliModelInfoServer[] = [
      { slug: "gemini-3-pro-preview", displayName: "Gemini 3 Pro Preview" },
      { slug: "gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview" },
      { slug: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
      { slug: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
      { slug: "gemini-2.5-flash-lite", displayName: "Gemini 2.5 Flash Lite" },
    ];

    try {
      const geminiPath = execFileSync("which", ["gemini"], {
        stdio: "pipe",
        timeout: 5000,
        encoding: "utf8",
      }).trim();
      if (!geminiPath) return FALLBACK;

      const realPath = fs.realpathSync(geminiPath);
      let dir = path.dirname(realPath);
      let configPath = "";
      for (let i = 0; i < 10; i++) {
        const candidate = path.join(
          dir,
          "node_modules",
          "@google",
          "gemini-cli-core",
          "dist",
          "src",
          "config",
          "defaultModelConfigs.js",
        );
        if (fs.existsSync(candidate)) {
          configPath = candidate;
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }

      if (!configPath) return FALLBACK;

      const content = fs.readFileSync(configPath, "utf8");
      const models: CliModelInfoServer[] = [];
      const entryRegex = /["']([a-z][a-z0-9._-]+)["']\s*:\s*\{([^}]*extends\s*:\s*["']chat-base[^"']*["'][^}]*)\}/g;
      let match;
      while ((match = entryRegex.exec(content)) !== null) {
        const slug = match[1];
        if (slug.startsWith("chat-base")) continue;
        models.push({ slug, displayName: slug });
      }

      return models.length > 0 ? models : FALLBACK;
    } catch {
      return FALLBACK;
    }
  }

  function toModelInfo(slug: string): CliModelInfoServer {
    return { slug, displayName: slug };
  }

  const CURSOR_MODELS_FALLBACK: CliModelInfoServer[] = [
    { slug: "auto", displayName: "Auto" },
    { slug: "claude-4-opus-thinking", displayName: "Claude 4 Opus Thinking" },
    { slug: "claude-4-sonnet-thinking", displayName: "Claude 4 Sonnet Thinking" },
    { slug: "claude-4-opus", displayName: "Claude 4 Opus" },
    { slug: "claude-4-sonnet", displayName: "Claude 4 Sonnet" },
    { slug: "claude-4-haiku", displayName: "Claude 4 Haiku" },
    { slug: "o3", displayName: "OpenAI o3" },
    { slug: "o4-mini", displayName: "OpenAI o4-mini" },
    { slug: "gpt-4o", displayName: "GPT-4o" },
    { slug: "gpt-4.1", displayName: "GPT-4.1" },
    { slug: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
    { slug: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
  ];

  function parseAgentModelsOutput(output: string): CliModelInfoServer[] {
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    const models: CliModelInfoServer[] = [];
    for (const line of lines) {
      const slug = line.split(/\s+/)[0]?.trim();
      if (slug && /^[a-z0-9._-]+$/i.test(slug) && !seen.has(slug)) {
        seen.add(slug);
        models.push({ slug, displayName: slug });
      }
    }
    return models;
  }

  function ensureAutoInCursorModels(list: CliModelInfoServer[]): CliModelInfoServer[] {
    if (list.some((m) => m.slug === "auto")) return list;
    return [{ slug: "auto", displayName: "Auto" }, ...list];
  }

  async function fetchCursorModels(execWithTimeout: (cmd: string, args: string[], ms: number) => Promise<string>): Promise<CliModelInfoServer[]> {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (apiKey) {
      try {
        const res = await fetch("https://api.cursor.com/v0/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6_000),
        });
        if (res.ok) {
          const data = (await res.json()) as { models?: string[] };
          const arr = data.models;
          if (Array.isArray(arr) && arr.length > 0) {
            const models = arr.map((slug) => ({ slug, displayName: slug }));
            return ensureAutoInCursorModels(models);
          }
        }
      } catch {
        /* fall through to CLI */
      }
    }
    try {
      let output = "";
      try {
        output = await execWithTimeout("agent", ["models"], 5_000);
      } catch {
        output = await execWithTimeout("agent", ["--list-models"], 5_000).catch(() => "");
      }
      const parsed = parseAgentModelsOutput(output || "");
      if (parsed.length > 0) return ensureAutoInCursorModels(parsed);
    } catch {
      /* ignore */
    }
    return CURSOR_MODELS_FALLBACK;
  }

  function readModelCache(cacheKey: string): any | null {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(cacheKey) as any;
      if (row?.value) return JSON.parse(row.value);
    } catch {
      // ignore malformed cache
    }
    return null;
  }

  function writeModelCache(cacheKey: string, data: any): void {
    try {
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ).run(cacheKey, JSON.stringify(data));
    } catch {
      // ignore cache persistence failures
    }
  }

  app.get("/api/cli-models", async (req, res) => {
    const refresh = req.query.refresh === "true";

    const ensureCursorInModels = async (data: Record<string, CliModelInfoServer[]>): Promise<Record<string, CliModelInfoServer[]>> => {
      if (data.cursor && Array.isArray(data.cursor) && data.cursor.length > 0) {
        return { ...data, cursor: ensureAutoInCursorModels(data.cursor) };
      }
      const cursorModels = await fetchCursorModels(execWithTimeout);
      return { ...data, cursor: cursorModels };
    };

    if (!refresh) {
      if (cachedCliModels) {
        const models = await ensureCursorInModels(cachedCliModels.data);
        return res.json({ models });
      }
      const dbCached = readModelCache("cli_models_cache");
      if (dbCached) {
        const models = await ensureCursorInModels(dbCached);
        cachedCliModels = { data: models, loadedAt: Date.now() };
        return res.json({ models });
      }
    }

    const cursorModels = await fetchCursorModels(execWithTimeout);
    const models: Record<string, CliModelInfoServer[]> = {
      claude: [
        "opus",
        "sonnet",
        "haiku",
        "claude-opus-4-6",
        "claude-sonnet-4-6",
        "claude-sonnet-4-5",
        "claude-haiku-4-5",
      ].map(toModelInfo),
      gemini: fetchGeminiModels(),
      opencode: [],
      cursor: cursorModels,
    };

    const codexModels = readCodexModelsCache();
    models.codex =
      codexModels.length > 0
        ? codexModels
        : ["gpt-5.3-codex", "gpt-5.2-codex", "gpt-5.1-codex-max", "gpt-5.2", "gpt-5.1-codex-mini"].map(toModelInfo);

    try {
      const ocModels = await fetchOpenCodeModels();
      const ocList: string[] = [];
      for (const [, modelList] of Object.entries(ocModels)) {
        for (const m of modelList) {
          if (!ocList.includes(m)) ocList.push(m);
        }
      }
      if (ocList.length > 0) models.opencode = ocList.map(toModelInfo);
    } catch {
      // keep defaults
    }

    cachedCliModels = { data: models, loadedAt: Date.now() };
    writeModelCache("cli_models_cache", models);
    res.json({ models });
  });

  app.get("/api/oauth/models", async (req, res) => {
    const refresh = req.query.refresh === "true";

    if (!refresh) {
      if (cachedModels) {
        return res.json({ models: cachedModels.data });
      }
      const dbCached = readModelCache("oauth_models_cache");
      if (dbCached) {
        cachedModels = { data: dbCached, loadedAt: Date.now() };
        ctx.cachedModels = cachedModels;
        return res.json({ models: dbCached });
      }
    }

    try {
      const [copilotModels, ocModels] = await Promise.all([fetchCopilotModelsFromAPI(), fetchOpenCodeModels()]);

      const merged: Record<string, string[]> = { ...ocModels };

      if (copilotModels.length > 0) {
        const existing = new Set(copilotModels);
        const supplement = (merged.copilot ?? []).filter((m: string) => !existing.has(m));
        merged.copilot = [...new Set([...copilotModels, ...supplement])];
      } else if (merged.copilot) {
        merged.copilot = [...new Set(merged.copilot)];
      }

      if (!merged.copilot || merged.copilot.length === 0) {
        merged.copilot = [
          "github-copilot/claude-sonnet-4.6",
          "github-copilot/claude-sonnet-4.5",
          "github-copilot/claude-3.7-sonnet",
          "github-copilot/claude-3.5-sonnet",
          "github-copilot/gpt-4o",
          "github-copilot/gpt-4.1",
          "github-copilot/o4-mini",
          "github-copilot/gemini-2.5-pro",
        ];
      }

      if (!merged.antigravity || merged.antigravity.length === 0) {
        merged.antigravity = [
          "google/antigravity-gemini-3-pro",
          "google/antigravity-gemini-3-flash",
          "google/antigravity-claude-sonnet-4-5",
          "google/antigravity-claude-sonnet-4-5-thinking",
          "google/antigravity-claude-opus-4-5-thinking",
          "google/antigravity-claude-opus-4-6-thinking",
        ];
      }

      cachedModels = { data: merged, loadedAt: Date.now() };
      ctx.cachedModels = cachedModels;
      writeModelCache("oauth_models_cache", merged);
      res.json({ models: merged });
    } catch (err) {
      res.status(500).json({ error: "model_fetch_failed", message: String(err) });
    }
  });
}
