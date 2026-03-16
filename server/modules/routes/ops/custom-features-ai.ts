import { build as esbuild } from "esbuild";
import { decryptSecret } from "../../../oauth/helpers.ts";
import logger from "../../../lib/logger.ts";
import type { DatabaseSync } from "node:sqlite";

type DbLike = Pick<DatabaseSync, "prepare">;

type ApiProviderType = "openai" | "anthropic" | "google" | "ollama" | "openrouter" | "together" | "groq" | "cerebras" | "custom";

interface ApiProviderRow {
  id: string;
  name: string;
  type: ApiProviderType;
  base_url: string;
  api_key_enc: string | null;
  enabled: number;
  models_cache: string | null;
}

/** CliProvider → ApiProviderType 매핑 */
const CLI_TO_API_TYPE: Record<string, ApiProviderType> = {
  claude:      "anthropic",
  codex:       "openai",
  opencode:    "openai",
  gemini:      "google",
  copilot:     "openai",
  antigravity: "google",
  ollama:      "ollama",
};

/** Settings DB에서 defaultProvider(CliProvider) 읽기 */
function readDefaultProvider(db: DbLike): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'defaultProvider'").get() as
    | { value: string }
    | undefined;
  return row?.value?.replace(/"/g, "").trim() || "claude";
}

/** 적합한 api_providers 행 찾기 */
function findApiProvider(db: DbLike, cliProvider: string): ApiProviderRow | null {
  const targetType = CLI_TO_API_TYPE[cliProvider] ?? null;

  // 1. cliProvider === "api" 이면 첫 번째 enabled provider 사용
  if (cliProvider === "api") {
    return (db
      .prepare("SELECT * FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1")
      .get() as ApiProviderRow | undefined) ?? null;
  }

  if (!targetType) return null;

  // 2. 타입이 일치하는 첫 번째 enabled provider
  return (db
    .prepare("SELECT * FROM api_providers WHERE type = ? AND enabled = 1 ORDER BY created_at ASC LIMIT 1")
    .get(targetType) as ApiProviderRow | undefined) ?? null;
}

/** 모델 결정: models_cache 첫 번째 or provider 타입별 기본값 */
function resolveModel(provider: ApiProviderRow): string {
  if (provider.models_cache) {
    try {
      const models = JSON.parse(provider.models_cache) as string[];
      if (models.length > 0) return models[0];
    } catch { /* ignore */ }
  }
  const defaults: Partial<Record<ApiProviderType, string>> = {
    anthropic: "claude-opus-4-6",
    openai:    "gpt-4o",
    google:    "gemini-2.0-flash",
    ollama:    "llama3",
  };
  return defaults[provider.type] ?? "gpt-4o";
}

/** 위험 패턴 검증 — 거부 시 이유 문자열 반환, 통과 시 null */
function validateBundle(code: string): string | null {
  const BLOCKED = [
    /\beval\s*\(/,
    /\bnew\s+Function\s*\(/,
    /\brequire\s*\(/,
    /\bimport\s*\(/,
    /process\.env/,
    /document\.write/,
    /window\.location\s*=/,
    /localStorage\.clear/,
    /IndexedDB/i,
    /XMLHttpRequest/,
  ];
  for (const re of BLOCKED) {
    if (re.test(code)) return `blocked pattern: ${re.source}`;
  }
  // fetch는 /api/* 경로만 허용
  const fetchCalls = code.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/g) ?? [];
  for (const call of fetchCalls) {
    const m = call.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
    if (m && !m[1].startsWith("/api/") && !m[1].startsWith("http://127.0.0.1")) {
      return `blocked fetch target: ${m[1]}`;
    }
  }
  return null;
}

/** Anthropic 비스트리밍 호출 */
async function callAnthropic(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
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
async function callOpenAI(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
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
async function callGoogle(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
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
async function callOllama(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
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
async function callProvider(provider: ApiProviderRow, model: string, systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  if (provider.type === "anthropic") return callAnthropic(provider, model, systemPrompt, userPrompt, signal);
  if (provider.type === "google")    return callGoogle(provider, model, systemPrompt, userPrompt, signal);
  if (provider.type === "ollama")    return callOllama(provider, model, systemPrompt, userPrompt, signal);
  return callOpenAI(provider, model, systemPrompt, userPrompt, signal);
}

/** TSX 컴포넌트 코드를 IIFE JS로 컴파일 (React 번들 포함) */
async function compileToIife(code: string): Promise<string> {
  const wrapper = `
import React from 'react';
import { createRoot } from 'react-dom/client';

${code}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(CustomFeatureWidget, {
  config: (typeof window !== 'undefined' && window.__agdConfig) ? window.__agdConfig : {}
}));
`;
  const result = await esbuild({
    stdin: { contents: wrapper, loader: "tsx", resolveDir: process.cwd() },
    bundle: true,
    format: "iife",
    platform: "browser",
    write: false,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

/** 응답 텍스트에서 ```tsx?``` 코드 블록 추출 */
function extractCodeBlock(text: string): string {
  const m = text.match(/```(?:tsx?|jsx?|react)?\s*\n?([\s\S]+?)```/);
  if (m) return m[1].trim();
  return text.trim();
}

/** AgentDesk 위젯 컴포넌트 생성용 시스템 프롬프트 */
const SYSTEM_PROMPT = `You are a React component generator for AgentDesk, a developer OS for managing AI agents.

Rules you MUST follow:
- Return ONLY a single React TypeScript component, no other text
- Wrap all code in a single \`\`\`tsx code block
- Component name: CustomFeatureWidget (exported as default)
- Props: { config: { refresh: string; theme: string; sizePreset: string; params?: Record<string, unknown> } }
- Use only React hooks (useState, useEffect, useMemo) — no external libraries
- CSS: use only these CSS variables: var(--th-bg-elevated), var(--th-bg-panel), var(--th-border), var(--th-text-primary), var(--th-text-muted), var(--th-text-heading), var(--th-accent), var(--th-attr-elite)
- Font: style={{ fontFamily: "var(--th-font-mono)" }}
- Data fetching: fetch() calls to /api/* paths only (e.g. /api/agents, /api/tasks, /api/notifications)
- The component fills its container (h-full w-full flex flex-col)
- Use Tailwind CSS utility classes for layout
- No eval(), no require(), no import(), no window.location changes
- Keep it simple and focused on the requested feature`;

/** 백그라운드 AI 생성 실행 (async, fire-and-forget) */
export async function runAiGeneration(
  db: DbLike,
  featureId: string,
  userPrompt: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const cliProvider = readDefaultProvider(db);
    const provider = findApiProvider(db, cliProvider);

    if (!provider) {
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `No API provider configured for '${cliProvider}'. Please add one in Settings → API Providers.`, nowMs(), featureId);
      return;
    }

    const model = resolveModel(provider);
    logger.info(`[custom-feature-ai] generating feature=${featureId} provider=${provider.name} model=${model}`);

    const raw = await callProvider(provider, model, SYSTEM_PROMPT, userPrompt, controller.signal);
    const code = extractCodeBlock(raw);

    const blocked = validateBundle(code);
    if (blocked) {
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    logger.info(`[custom-feature-ai] compiling feature=${featureId}`);
    const iife = await compileToIife(code);

    db.prepare("UPDATE custom_features SET bundle = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, "active", nowMs(), featureId);

    logger.info(`[custom-feature-ai] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[custom-feature-ai] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}
