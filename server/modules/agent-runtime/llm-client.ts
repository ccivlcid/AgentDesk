import { decryptSecret } from "../../oauth/helpers.ts";
import type { DatabaseSync } from "node:sqlite";
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

/** Get default model for a provider type */
export function getDefaultModel(providerType: string): string {
  return DEFAULT_MODELS[providerType] ?? "gpt-4o";
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
