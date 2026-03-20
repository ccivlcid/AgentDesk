import { decryptSecret } from "../../../../oauth/helpers.ts";
import type { ApiProviderRow } from "./types.ts";

/** Anthropic 비스트리밍 호출 */
export async function callAnthropic(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = provider.api_key_enc ? decryptSecret(provider.api_key_enc) : "";
  const base = provider.base_url.replace(/\/+$/, "");
  const url = `${base}/v1/messages`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`Anthropic error ${resp.status}: ${await resp.text()}`);
  const j = await resp.json() as { content?: Array<{ text?: string }> };
  return j.content?.map((c) => c.text ?? "").join("") ?? "";
}

/** OpenAI 호환 비스트리밍 호출 (openai, openrouter, together, groq, cerebras, custom) */
export async function callOpenAI(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = provider.api_key_enc ? decryptSecret(provider.api_key_enc) : "";
  const base = provider.base_url.replace(/\/+$/, "");
  const url = /\/v\d+$/.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  if (provider.type === "openrouter") { headers["HTTP-Referer"] = "https://agentdesk.app"; headers["X-Title"] = "AgentDesk"; }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}: ${await resp.text()}`);
  const j = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content ?? "";
}

/** Google Gemini 비스트리밍 호출 */
export async function callGoogle(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const apiKey = provider.api_key_enc ? decryptSecret(provider.api_key_enc) : "";
  const base = provider.base_url.replace(/\/+$/, "");
  const url = `${base}/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    }),
    signal,
  });

  if (!resp.ok) throw new Error(`Google error ${resp.status}: ${await resp.text()}`);
  const j = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

/** Ollama 호출 */
export async function callOllama(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const base = provider.base_url.replace(/\/+$/, "");
  const url = `${base}/api/generate`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: `${systemPrompt}\n\n${userPrompt}`, stream: false }),
    signal,
  });

  if (!resp.ok) throw new Error(`Ollama error ${resp.status}: ${await resp.text()}`);
  const j = await resp.json() as { response?: string };
  return j.response ?? "";
}

/** provider 타입에 따라 적절한 API 호출 함수 선택 */
export async function callProvider(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  if (provider.type === "anthropic") return callAnthropic(provider, model, systemPrompt, userPrompt, signal);
  if (provider.type === "google")    return callGoogle(provider, model, systemPrompt, userPrompt, signal);
  if (provider.type === "ollama")    return callOllama(provider, model, systemPrompt, userPrompt, signal);
  return callOpenAI(provider, model, systemPrompt, userPrompt, signal);
}
