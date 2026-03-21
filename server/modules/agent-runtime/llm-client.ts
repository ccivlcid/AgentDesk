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

/** Resolve Anthropic API key — from api_providers table by provider id, or ANTHROPIC_API_KEY env. */
export function resolveAnthropicKey(db: DatabaseSync, apiProviderId?: string): string {
  if (apiProviderId) {
    const row = db.prepare("SELECT * FROM api_providers WHERE id = ? AND enabled = 1").get(apiProviderId) as ApiProviderRow | undefined;
    if (row?.api_key_enc) return decryptSecret(row.api_key_enc);
  }
  // Fall back to any enabled Anthropic provider
  const row = db.prepare("SELECT * FROM api_providers WHERE type = 'anthropic' AND enabled = 1 LIMIT 1").get() as ApiProviderRow | undefined;
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
