import { decryptSecret } from "../../oauth/helpers.ts";
import type { DatabaseSync } from "node:sqlite";
import { spawn } from "child_process";
import os from "node:os";
import path from "node:path";
import logger from "../../lib/logger.ts";
import type { LlmMessage, ToolDefinition, ToolCall, LlmContent } from "./types.ts";

export interface LlmStreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (call: ToolCall) => void;
  onDone: (usage: { inputTokens: number; outputTokens: number }) => void;
  onError: (err: Error) => void;
}

interface ApiProviderRow {
  id: string;
  name: string;
  type: string;
  base_url: string;
  api_key_enc: string | null;
}

export interface LlmClientDeps {
  db: DatabaseSync;
  signal: AbortSignal;
}

/** Resolved provider info for runtime execution */
export interface ResolvedProvider {
  type: "anthropic" | "openai-compatible";
  apiKey: string;
  baseUrl: string;
  providerType: string; // raw type from DB (openai, anthropic, ollama, etc.)
}

/** Default models per provider type */
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
  ollama: "llama3.2",
  openrouter: "anthropic/claude-sonnet-4-6",
  together: "meta-llama/Llama-3-70b-chat-hf",
  groq: "llama-3.3-70b-versatile",
  cerebras: "llama-3.3-70b",
  custom: "gpt-4o",
};

/**
 * Resolve provider info from api_providers table.
 * Returns type (anthropic vs openai-compatible), apiKey, baseUrl.
 */
export function resolveProvider(db: DatabaseSync, apiProviderId?: string): ResolvedProvider {
  let row: ApiProviderRow | undefined;

  if (apiProviderId) {
    row = db.prepare("SELECT id, name, type, base_url, api_key_enc FROM api_providers WHERE id = ? AND enabled = 1").get(apiProviderId) as ApiProviderRow | undefined;
  }

  // Fallback: any enabled provider
  if (!row) {
    row = db.prepare("SELECT id, name, type, base_url, api_key_enc FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1").get() as ApiProviderRow | undefined;
  }

  if (row) {
    const apiKey = row.api_key_enc ? decryptSecret(row.api_key_enc) : "";
    const isAnthropic = row.type === "anthropic";
    return {
      type: isAnthropic ? "anthropic" : "openai-compatible",
      apiKey,
      baseUrl: row.base_url,
      providerType: row.type,
    };
  }

  // Env fallback — Anthropic
  const envKey = process.env["ANTHROPIC_API_KEY"];
  if (envKey) {
    return { type: "anthropic", apiKey: envKey, baseUrl: "https://api.anthropic.com/v1", providerType: "anthropic" };
  }

  // Env fallback — OpenAI
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (openaiKey) {
    return { type: "openai-compatible", apiKey: openaiKey, baseUrl: "https://api.openai.com/v1", providerType: "openai" };
  }

  throw new Error("No API provider found. Add a provider in Settings → API Providers, or set ANTHROPIC_API_KEY / OPENAI_API_KEY env.");
}

/**
 * Unified provider resolution for any agent.
 * Single entry point for all 3 execution paths (task execution, PM oneshot, system oneshot).
 *
 * Returns a discriminated union describing how to invoke the agent's configured provider.
 */
export type ResolvedAgentProvider =
  | { mode: "api"; apiProviderId: string; model: string; providerType: string }
  | { mode: "oauth"; provider: "copilot" | "antigravity"; oauthAccountId: string | null }
  | { mode: "cli"; cliProvider: string; model?: string; reasoningLevel?: string }
  | { mode: "ollama"; apiProviderId: string | null; model: string };

const VALID_CLI_PROVIDERS = new Set(["claude", "codex", "gemini", "cursor", "opencode"]);

export function resolveProviderForAgent(
  db: DatabaseSync,
  agent: {
    cli_provider: string | null;
    api_provider_id?: string | null;
    api_model?: string | null;
    cli_model?: string | null;
    cli_reasoning_level?: string | null;
    oauth_account_id?: string | null;
  },
): ResolvedAgentProvider {
  const provider = agent.cli_provider || "claude";

  // 1. API mode
  if (provider === "api" && agent.api_provider_id) {
    const row = db.prepare(
      "SELECT id, type FROM api_providers WHERE id = ? AND enabled = 1",
    ).get(agent.api_provider_id) as { id: string; type: string } | undefined;
    if (row) {
      return {
        mode: "api",
        apiProviderId: agent.api_provider_id,
        model: agent.api_model || getDefaultModel(row.type),
        providerType: row.type,
      };
    }
    // Provider disabled/deleted → fall through to CLI fallback
  }

  // 2. OAuth mode (copilot / antigravity)
  if (provider === "copilot" || provider === "antigravity") {
    return { mode: "oauth", provider, oauthAccountId: agent.oauth_account_id ?? null };
  }

  // 3. Ollama mode
  if (provider === "ollama") {
    let apiProviderId = agent.api_provider_id ?? null;
    if (!apiProviderId) {
      const ollamaRow = db.prepare(
        "SELECT id FROM api_providers WHERE type = 'ollama' AND enabled = 1 LIMIT 1",
      ).get() as { id: string } | undefined;
      if (ollamaRow) apiProviderId = ollamaRow.id;
    }
    return {
      mode: "ollama",
      apiProviderId,
      model: agent.api_model || agent.cli_model || "llama3.1",
    };
  }

  // 4. CLI mode (claude/codex/gemini/opencode/cursor)
  const cliProvider = VALID_CLI_PROVIDERS.has(provider) ? provider : "claude";
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'providerModelConfig'").get() as
    | { value: string }
    | undefined;
  const modelConfig: Record<string, { model?: string; reasoningLevel?: string }> = settingsRow
    ? JSON.parse(settingsRow.value)
    : {};
  return {
    mode: "cli",
    cliProvider,
    model: agent.cli_model || modelConfig[cliProvider]?.model,
    reasoningLevel: agent.cli_reasoning_level || modelConfig[cliProvider]?.reasoningLevel,
  };
}

/** Get default model for a provider type */
export function getDefaultModel(providerType: string): string {
  return DEFAULT_MODELS[providerType] ?? "gpt-4o";
}

/**
 * Resolve the best available provider for system-level one-shot calls.
 *
 * Deterministic priority:
 *  1. settings.defaultProvider → most predictable
 *  2. preferredAgentId (e.g. PM agent) → caller hint
 *  3. First agent (by created_at) → fallback
 *  4. "claude" → ultimate fallback
 *
 * @deprecated Prefer passing a specific agent to resolveProviderForAgent() when possible.
 */
export function resolveCliProviderFromAgents(
  db: DatabaseSync,
  preferredAgentId?: string,
): { mode: "api"; apiProviderId: string } | { mode: "cli"; cliProvider: string } {
  // 1. Preferred agent api_provider_id — most specific hint from caller
  if (preferredAgentId) {
    const preferred = db.prepare(
      "SELECT cli_provider, api_provider_id FROM agents WHERE id = ?",
    ).get(preferredAgentId) as { cli_provider: string | null; api_provider_id: string | null } | undefined;
    if (preferred?.cli_provider === "api" && preferred.api_provider_id) {
      return { mode: "api", apiProviderId: preferred.api_provider_id };
    }
  }

  // 2. Any enabled API provider in the DB (API key takes priority over CLI)
  const apiProvider = db.prepare(
    "SELECT id FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1",
  ).get() as { id: string } | undefined;
  if (apiProvider) {
    return { mode: "api", apiProviderId: apiProvider.id };
  }

  // 3. settings.defaultProvider — CLI fallback
  const settingsRow = db.prepare("SELECT value FROM settings WHERE key = 'settings'").get() as { value: string } | undefined;
  if (settingsRow) {
    try {
      const parsed = JSON.parse(settingsRow.value) as { defaultProvider?: string };
      if (parsed.defaultProvider && VALID_CLI_PROVIDERS.has(parsed.defaultProvider)) {
        return { mode: "cli", cliProvider: parsed.defaultProvider };
      }
    } catch { /* ignore */ }
  }

  // 4. First online CLI agent
  const agents = db.prepare(
    "SELECT cli_provider, api_provider_id FROM agents WHERE status != 'offline' ORDER BY created_at ASC",
  ).all() as { cli_provider: string | null; api_provider_id: string | null }[];

  for (const a of agents) {
    if (a.cli_provider === "api" && a.api_provider_id) {
      return { mode: "api", apiProviderId: a.api_provider_id };
    }
  }
  for (const a of agents) {
    if (a.cli_provider && VALID_CLI_PROVIDERS.has(a.cli_provider)) {
      return { mode: "cli", cliProvider: a.cli_provider };
    }
  }

  // 5. Ultimate fallback
  return { mode: "cli", cliProvider: "claude" };
}

/** Check if an HTTP status code is transient and worth retrying. */
function isRetriableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504 || status >= 520;
}

/** Exponential backoff delay in ms: 1s, 2s, 4s... capped at 8s. */
function retryDelayMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}

const LLM_MAX_RETRIES = 2;

/**
 * One-shot (non-streaming) LLM call. Works with both Anthropic and OpenAI-compatible providers.
 * Retries on transient errors (429, 5xx) with exponential backoff.
 */
export async function callLlmOneShot(params: {
  provider: ResolvedProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { provider, model, systemPrompt, userPrompt, maxTokens = 2048, signal } = params;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      return await callLlmOneShotInternal(provider, model, systemPrompt, userPrompt, maxTokens, signal);
    } catch (err) {
      const status = extractHttpStatus(err);
      if (attempt < LLM_MAX_RETRIES && status !== null && isRetriableStatus(status)) {
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

function extractHttpStatus(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : "";
  const match = msg.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

async function callLlmOneShotInternal(
  provider: ResolvedProvider, model: string, systemPrompt: string,
  userPrompt: string, maxTokens: number, signal?: AbortSignal,
): Promise<string> {
  if (provider.type === "anthropic") {
    const url = provider.baseUrl.replace(/\/+$/, "") + "/messages";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": provider.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal,
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Anthropic API ${resp.status}: ${errText}`);
    }
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> };
    return data.content?.filter((b) => b.type === "text").map((b) => b.text ?? "").join("") ?? "";
  }

  // OpenAI-compatible
  const url = provider.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal,
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`LLM API ${resp.status} (${provider.baseUrl}): ${errText}`);
  }
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── CLI Provider One-Shot (stdin → stdout, --print mode) ───────────────────

/**
 * Augment PATH with known npm global bin directories so CLI tools are found
 * even when the server's PATH doesn't include them (common on Windows).
 * Mirrors the logic in server/modules/workflow/core/cli-tools.ts.
 */
function buildCliEnv(): NodeJS.ProcessEnv {
  const fallbackDirs =
    process.platform === "win32"
      ? [
          path.join(process.env["ProgramFiles"] ?? "C:\\Program Files", "nodejs"),
          path.join(process.env["LOCALAPPDATA"] ?? "", "Programs", "nodejs"),
          path.join(process.env["APPDATA"] ?? "", "npm"),
          path.join(os.homedir(), "AppData", "Roaming", "npm"),
        ].filter(Boolean)
      : [
          "/opt/homebrew/bin",
          "/usr/local/bin",
          "/usr/bin",
          "/bin",
          path.join(os.homedir(), ".local", "bin"),
          path.join(os.homedir(), "bin"),
        ];

  const existingPath = process.env["PATH"] ?? "";
  const parts = existingPath.split(path.delimiter).filter(Boolean);
  const seen = new Set(parts);
  for (const dir of fallbackDirs) {
    if (dir && !seen.has(dir)) { parts.push(dir); seen.add(dir); }
  }
  return { ...process.env, PATH: parts.join(path.delimiter), NO_COLOR: "1", FORCE_COLOR: "0", CI: "1" };
}

function buildCliArgs(cliProvider: string): string[] {
  switch (cliProvider) {
    case "codex": return ["codex", "--enable", "multi_agent", "--yolo", "exec", "--json"];
    case "gemini": return ["gemini", "--yolo", "--output-format=stream-json"];
    case "cursor": return ["agent", "--print", "--output-format=stream-json"];
    case "opencode": return ["opencode", "run", "--format", "json"];
    default:
      // claude: same flags as full agent spawn (known to work), one-turn limit for speed
      return ["claude", "--dangerously-skip-permissions", "--print", "--verbose",
              "--output-format=stream-json", "--include-partial-messages", "--max-turns", "1"];
  }
}

/**
 * Extract plain text from stream-json output (claude/gemini/cursor).
 * Falls back to raw output if it contains no JSON lines.
 */
function extractTextFromStreamJson(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const parts: string[] = [];
  let resultText = ""; // final result event text (highest priority)

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("{")) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const type = obj["type"] as string | undefined;

      // claude --print --output-format=stream-json: final result event (highest priority)
      if (type === "result" && obj["subtype"] === "success" && typeof obj["result"] === "string") {
        resultText = obj["result"] as string;
        continue;
      }

      // claude streaming: content_block_delta with text_delta
      if (type === "content_block_delta") {
        const delta = obj["delta"] as Record<string, unknown> | undefined;
        if (delta?.["type"] === "text_delta" && typeof delta?.["text"] === "string") {
          parts.push(delta["text"] as string);
          continue;
        }
      }

      // claude assistant turn: message.content array (nested)
      if (type === "assistant") {
        const msg = obj["message"] as Record<string, unknown> | undefined;
        const content = (msg?.["content"] ?? obj["content"]) as Array<{ type: string; text?: string }> | undefined;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text" && block.text) parts.push(block.text);
          }
          continue;
        }
      }

      // direct content array at top level
      const content = obj["content"] as Array<{ type: string; text?: string }> | undefined;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === "text" && block.text) parts.push(block.text);
        }
        continue;
      }

      // simple type=text with direct text property
      if (type === "text" && typeof obj["text"] === "string") { parts.push(obj["text"] as string); continue; }

      // codex / opencode: output or response key
      if (typeof obj["output"] === "string") { parts.push(obj["output"] as string); continue; }
      if (typeof obj["response"] === "string") { parts.push(obj["response"] as string); continue; }
    } catch { /* non-JSON line — skip */ }
  }

  // Final result event takes priority (it's the complete assembled text from claude)
  if (resultText) return resultText;
  // Streaming deltas assembled
  if (parts.length > 0) return parts.join("");
  // Raw fallback (e.g. non-streaming providers or error output)
  return raw;
}

function callViaCliProviderInternal(cliProvider: string, fullPrompt: string, timeoutMs = 120_000): Promise<string> {
  const args = buildCliArgs(cliProvider);
  const env = buildCliEnv();
  return new Promise<string>((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });
    const timeoutId = setTimeout(() => {
      try { child.kill("SIGKILL"); } catch { /* */ }
      reject(new Error(`CLI '${cliProvider}' timed out (${timeoutMs / 1000}s)`));
    }, timeoutMs);
    let output = "";
    child.stdout?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.stderr?.on("data", (chunk: Buffer) => { output += chunk.toString("utf8"); });
    child.on("error", (err) => { clearTimeout(timeoutId); reject(err); });
    child.on("close", () => { clearTimeout(timeoutId); resolve(extractTextFromStreamJson(output)); });
    child.stdin?.write(fullPrompt);
    child.stdin?.end();
  });
}

/**
 * Unified one-shot LLM call — auto-detects best provider from agent configs.
 *
 * Resolution order:
 *  1. Agent with api_provider_id → API HTTP call
 *  2. Agent with CLI provider (claude/codex/gemini/cursor/opencode) → CLI --print
 *  3. settings.defaultProvider → CLI fallback
 *  4. "claude" → ultimate fallback
 *
 * Caller only needs to pass db, prompts, and optional config. No try-catch needed.
 */
export async function callLlmOneShotAuto(params: {
  db: DatabaseSync;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  timeoutMs?: number;
  preferredAgentId?: string;
}): Promise<string> {
  const { db, systemPrompt, userPrompt, maxTokens = 2048, timeoutMs = 120_000, preferredAgentId } = params;

  // 1. Preferred agent's api_provider_id
  if (preferredAgentId) {
    const row = db.prepare("SELECT api_provider_id FROM agents WHERE id = ? AND cli_provider = 'api'").get(preferredAgentId) as { api_provider_id: string | null } | undefined;
    if (row?.api_provider_id) {
      try {
        const provider = resolveProvider(db, row.api_provider_id);
        const model = getDefaultModel(provider.providerType);
        return await callLlmOneShot({ provider, model, systemPrompt, userPrompt, maxTokens, signal: AbortSignal.timeout(timeoutMs) });
      } catch (err) {
        logger.debug({ err: err instanceof Error ? err.message : String(err) }, "[llm-auto] preferred agent API failed, falling through");
      }
    }
  }

  // 2. resolveProvider: api_providers table → ANTHROPIC_API_KEY / OPENAI_API_KEY env
  try {
    const provider = resolveProvider(db);
    const model = getDefaultModel(provider.providerType);
    logger.info({ providerType: provider.providerType, model }, "[llm-auto] using API provider");
    return await callLlmOneShot({ provider, model, systemPrompt, userPrompt, maxTokens, signal: AbortSignal.timeout(timeoutMs) });
  } catch (apiErr) {
    logger.debug({ err: apiErr instanceof Error ? apiErr.message : String(apiErr) }, "[llm-auto] API provider unavailable, falling through to CLI");
  }

  // 3. CLI fallback (last resort)
  const cliResolved = resolveCliProviderFromAgents(db, preferredAgentId);
  const cliProvider = cliResolved.mode === "cli" ? cliResolved.cliProvider : "claude";
  logger.info({ cliProvider }, "[llm-auto] using CLI fallback");
  return callViaCliProviderInternal(cliProvider, `${systemPrompt}\n\n${userPrompt}`, timeoutMs);
}

/** Resolve Anthropic API key — from api_providers table by provider id, or ANTHROPIC_API_KEY env. */
export function resolveAnthropicKey(db: DatabaseSync, apiProviderId?: string): string {
  if (apiProviderId) {
    const row = db.prepare("SELECT id, name, type, base_url, api_key_enc FROM api_providers WHERE id = ? AND enabled = 1").get(apiProviderId) as ApiProviderRow | undefined;
    if (row?.api_key_enc) return decryptSecret(row.api_key_enc);
  }
  // Fall back to any enabled Anthropic provider
  const row = db.prepare("SELECT id, name, type, base_url, api_key_enc FROM api_providers WHERE type = 'anthropic' AND enabled = 1 LIMIT 1").get() as ApiProviderRow | undefined;
  if (row?.api_key_enc) return decryptSecret(row.api_key_enc);
  // Env fallback
  const envKey = process.env["ANTHROPIC_API_KEY"];
  if (envKey) return envKey;
  throw new Error("No Anthropic API key found. Add an Anthropic provider in Settings → API Providers.");
}

/**
 * Call Anthropic Messages API with streaming and tool use.
 * Returns the full assistant content blocks for the caller to accumulate.
 */
export async function callAnthropicStream(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  maxTokens: number;
  signal: AbortSignal;
  callbacks: LlmStreamCallbacks;
}): Promise<{ stopReason: string; assistantContent: LlmContent[] }> {
  const { apiKey, model, systemPrompt, messages, tools, maxTokens, signal, callbacks } = params;

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    stream: true,
  });

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body,
    signal,
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Anthropic API error ${resp.status}: ${errText}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = "end_turn";

  // Accumulate assistant content blocks
  const assistantContent: LlmContent[] = [];
  // Current tool input accumulation
  const toolInputs = new Map<number, { id: string; name: string; json: string }>();

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ") || trimmed === "data: [DONE]") return;
    try {
      const data = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
      const type = data.type as string;

      if (type === "message_start") {
        const usage = (data.message as { usage?: { input_tokens?: number; output_tokens?: number } })?.usage;
        inputTokens = usage?.input_tokens ?? 0;
      }

      if (type === "content_block_start") {
        const index = data.index as number;
        const block = data.content_block as { type: string; id?: string; name?: string };
        if (block.type === "tool_use") {
          toolInputs.set(index, { id: block.id!, name: block.name!, json: "" });
        }
      }

      if (type === "content_block_delta") {
        const index = data.index as number;
        const delta = data.delta as { type: string; text?: string; partial_json?: string };
        if (delta.type === "text_delta" && delta.text) {
          callbacks.onText(delta.text);
          // Accumulate into assistantContent
          const last = assistantContent[assistantContent.length - 1];
          if (last?.type === "text") {
            last.text += delta.text;
          } else {
            assistantContent.push({ type: "text", text: delta.text });
          }
        }
        if (delta.type === "input_json_delta" && delta.partial_json) {
          const tool = toolInputs.get(index);
          if (tool) tool.json += delta.partial_json;
        }
      }

      if (type === "content_block_stop") {
        const index = data.index as number;
        const tool = toolInputs.get(index);
        if (tool) {
          let input: Record<string, unknown> = {};
          try {
            input = JSON.parse(tool.json) as Record<string, unknown>;
          } catch { /* ignore bad json */ }
          const call: ToolCall = { id: tool.id, name: tool.name, input };
          assistantContent.push({ type: "tool_use", id: tool.id, name: tool.name, input });
          callbacks.onToolCall(call);
          toolInputs.delete(index);
        }
      }

      if (type === "message_delta") {
        const delta = data.delta as { stop_reason?: string };
        const usage = data.usage as { output_tokens?: number } | undefined;
        if (delta.stop_reason) stopReason = delta.stop_reason;
        outputTokens = usage?.output_tokens ?? outputTokens;
      }

      if (type === "message_stop") {
        callbacks.onDone({ inputTokens, outputTokens });
      }
    } catch {
      /* ignore parse errors */
    }
  };

  try {
    for await (const chunk of resp.body as AsyncIterable<Uint8Array>) {
      if (signal.aborted) break;
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line);
    }
    if (buffer.trim()) processLine(buffer.trim());
  } catch (err) {
    if (!signal.aborted) callbacks.onError(err as Error);
  }

  return { stopReason, assistantContent };
}

// ── OpenAI-compatible Chat Completions streaming ──────────────────────────

/** Convert Anthropic-format tools to OpenAI function-calling format */
function toOpenAITools(tools: ToolDefinition[]): { type: "function"; function: { name: string; description: string; parameters: ToolDefinition["input_schema"] } }[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

/** Convert Anthropic-format messages to OpenAI chat messages */
function toOpenAIMessages(systemPrompt: string, messages: LlmMessage[]): { role: string; content?: string; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[]; tool_call_id?: string }[] {
  const result: { role: string; content?: string; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[]; tool_call_id?: string }[] = [];

  // System message
  result.push({ role: "system", content: systemPrompt });

  for (const msg of messages) {
    if (msg.role === "user") {
      if (typeof msg.content === "string") {
        result.push({ role: "user", content: msg.content });
      } else {
        // Content array — may contain tool_result blocks
        const textParts: string[] = [];
        for (const block of msg.content) {
          if (block.type === "text") {
            textParts.push(block.text);
          } else if (block.type === "tool_result") {
            result.push({
              role: "tool",
              content: block.content,
              tool_call_id: block.tool_use_id,
            });
          }
        }
        if (textParts.length > 0) {
          result.push({ role: "user", content: textParts.join("\n") });
        }
      }
    } else if (msg.role === "assistant") {
      if (typeof msg.content === "string") {
        result.push({ role: "assistant", content: msg.content });
      } else {
        // Content array — may contain text + tool_use blocks
        let text = "";
        const toolCalls: { id: string; type: "function"; function: { name: string; arguments: string } }[] = [];
        for (const block of msg.content) {
          if (block.type === "text") {
            text += block.text;
          } else if (block.type === "tool_use") {
            toolCalls.push({
              id: block.id,
              type: "function",
              function: { name: block.name, arguments: JSON.stringify(block.input) },
            });
          }
        }
        const entry: { role: string; content?: string; tool_calls?: typeof toolCalls } = { role: "assistant" };
        if (text) entry.content = text;
        if (toolCalls.length > 0) entry.tool_calls = toolCalls;
        result.push(entry);
      }
    }
  }

  return result;
}

/**
 * Call OpenAI-compatible Chat Completions API with streaming and tool use.
 * Works with: OpenAI, Ollama, LM Studio, Groq, Together, OpenRouter, Cerebras, Gemini (compat mode).
 */
export async function callOpenAICompatibleStream(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  maxTokens: number;
  signal: AbortSignal;
  callbacks: LlmStreamCallbacks;
}): Promise<{ stopReason: string; assistantContent: LlmContent[] }> {
  const { apiKey, baseUrl, model, systemPrompt, messages, tools, maxTokens, signal, callbacks } = params;

  const openaiMessages = toOpenAIMessages(systemPrompt, messages);
  const openaiTools = tools.length > 0 ? toOpenAITools(tools) : undefined;

  const reqBody: Record<string, unknown> = {
    model,
    messages: openaiMessages,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (openaiTools) {
    reqBody.tools = openaiTools;
    reqBody.tool_choice = "auto";
  }

  // Normalize base URL
  const url = baseUrl.replace(/\/+$/, "") + "/chat/completions";

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(reqBody),
    signal,
  });

  if (!resp.ok || !resp.body) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI-compatible API error ${resp.status} (${baseUrl}): ${errText}`);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason = "stop";

  // Accumulate assistant content in Anthropic format (for conversation history)
  const assistantContent: LlmContent[] = [];
  // Track tool calls by index
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) return;
    const payload = trimmed.slice(6);
    if (payload === "[DONE]") return;

    try {
      const data = JSON.parse(payload) as {
        choices?: { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[]; }; finish_reason?: string | null }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      // Usage (from stream_options or final chunk)
      if (data.usage) {
        inputTokens = data.usage.prompt_tokens ?? inputTokens;
        outputTokens = data.usage.completion_tokens ?? outputTokens;
      }

      const choice = data.choices?.[0];
      if (!choice) return;

      // Finish reason
      if (choice.finish_reason) {
        stopReason = choice.finish_reason; // "stop", "tool_calls", "length"
      }

      const delta = choice.delta;
      if (!delta) return;

      // Text content
      if (delta.content) {
        callbacks.onText(delta.content);
        const last = assistantContent[assistantContent.length - 1];
        if (last?.type === "text") {
          last.text += delta.content;
        } else {
          assistantContent.push({ type: "text", text: delta.content });
        }
      }

      // Tool calls (streamed incrementally)
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (tc.id) {
            // New tool call start
            pendingToolCalls.set(idx, { id: tc.id, name: tc.function?.name ?? "", args: tc.function?.arguments ?? "" });
          } else {
            // Continuation (append arguments)
            const existing = pendingToolCalls.get(idx);
            if (existing) {
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            }
          }
        }
      }
    } catch {
      /* ignore parse errors */
    }
  };

  try {
    for await (const chunk of resp.body as AsyncIterable<Uint8Array>) {
      if (signal.aborted) break;
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line);
    }
    if (buffer.trim()) processLine(buffer.trim());
  } catch (err) {
    if (!signal.aborted) callbacks.onError(err as Error);
  }

  // Finalize pending tool calls
  for (const [, tc] of pendingToolCalls) {
    let input: Record<string, unknown> = {};
    try { input = JSON.parse(tc.args) as Record<string, unknown>; } catch { /* ignore */ }
    const call: ToolCall = { id: tc.id, name: tc.name, input };
    assistantContent.push({ type: "tool_use", id: tc.id, name: tc.name, input });
    callbacks.onToolCall(call);
  }

  callbacks.onDone({ inputTokens, outputTokens });

  // Normalize stop reason to match Anthropic conventions
  const normalizedStopReason = stopReason === "tool_calls" ? "tool_use" : stopReason === "stop" ? "end_turn" : stopReason;

  return { stopReason: normalizedStopReason, assistantContent };
}
