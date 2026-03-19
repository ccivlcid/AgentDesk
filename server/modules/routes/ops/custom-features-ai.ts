import { build as esbuild } from "esbuild";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decryptSecret } from "../../../oauth/helpers.ts";
import logger from "../../../lib/logger.ts";
import type { DatabaseSync } from "node:sqlite";

/** feature 소스 저장 루트 */
const FEATURE_DIR = join(process.cwd(), "feature");
const GITHUB_DIR  = join(FEATURE_DIR, "github");
const AI_DIR      = join(FEATURE_DIR, "ai");

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function saveSource(path: string, content: string) {
  try { writeFileSync(path, content, "utf-8"); } catch { /* ignore */ }
}

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
  "claude-code": "anthropic",
  cursor:      "anthropic",   // Cursor uses Claude/GPT — prefer Anthropic key
  windsurf:    "anthropic",
  codex:       "openai",
  "codex-cli": "openai",
  opencode:    "openai",
  gemini:      "google",
  "gemini-cli": "google",
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

  // 2. 타입이 일치하는 첫 번째 enabled provider
  if (targetType) {
    const matched = (db
      .prepare("SELECT * FROM api_providers WHERE type = ? AND enabled = 1 ORDER BY created_at ASC LIMIT 1")
      .get(targetType) as ApiProviderRow | undefined) ?? null;
    if (matched) return matched;
  }

  // 3. 폴백: 어떤 enabled provider든 사용 (타입 무관)
  return (db
    .prepare("SELECT * FROM api_providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1")
    .get() as ApiProviderRow | undefined) ?? null;
}

/** 진행 로그를 DB에 한 줄 추가 */
function appendLog(db: DbLike, featureId: string, msg: string, nowMs: () => number): void {
  try {
    const row = db.prepare("SELECT progress_log FROM custom_features WHERE id = ?").get(featureId) as
      | { progress_log: string | null }
      | undefined;
    const ts = new Date().toTimeString().slice(0, 8); // HH:MM:SS
    const line = `[${ts}] ${msg}`;
    const updated = row?.progress_log ? `${row.progress_log}\n${line}` : line;
    db.prepare("UPDATE custom_features SET progress_log = ?, updated_at = ? WHERE id = ?")
      .run(updated, nowMs(), featureId);
    logger.info(`[feature] ${featureId}: ${msg}`);
  } catch { /* ignore */ }
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
  const buildOpts = {
    stdin: { contents: wrapper, loader: "tsx" as const, resolveDir: process.cwd() },
    bundle: true,
    format: "iife" as const,
    platform: "browser" as const,
    write: false,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent" as const,
  };

  // Helper: extract readable error details from esbuild BuildFailure
  function extractBuildErrors(err: unknown): { details: string; unresolved: string[] } {
    const buildErr = err as { errors?: Array<{ text: string; location?: { line?: number } }> };
    const errors = buildErr.errors ?? [];
    const details = errors.slice(0, 3).map((e) => {
      const loc = e.location ? ` (line ${e.location.line})` : "";
      return `${e.text}${loc}`;
    }).join(" | ");
    // Collect "Could not resolve 'pkg'" package names
    const unresolved = errors
      .map((e) => e.text.match(/Could not resolve ['"]([^'"]+)['"]/)?.[1])
      .filter((x): x is string => !!x);
    return { details: details || String(err), unresolved };
  }

  try {
    const result = await esbuild(buildOpts);
    return result.outputFiles![0].text;
  } catch (err) {
    const { details, unresolved } = extractBuildErrors(err);

    // Retry: remove unresolvable import lines anywhere in wrapper + inject empty stubs
    if (unresolved.length > 0) {
      let wrapperWithStubs = wrapper;
      for (const pkg of unresolved) {
        // Remove: import Foo from 'pkg'  /  import { Foo } from 'pkg'  /  import 'pkg'
        const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        wrapperWithStubs = wrapperWithStubs.replace(
          new RegExp(`^import\\s[^;]*?from\\s+['"]${escaped}['"];?\\s*$`, "gm"),
          `// [stub] import from '${pkg}' removed`,
        );
        // Also stub the identifier so runtime doesn't crash
        const stubName = pkg.replace(/[^a-zA-Z0-9_$]/g, "_");
        wrapperWithStubs += `\nif(typeof ${stubName}==="undefined"){var ${stubName}=new Proxy({},{get:()=>()=>null});}\n`;
      }
      try {
        const retryResult = await esbuild({ ...buildOpts, stdin: { ...buildOpts.stdin, contents: wrapperWithStubs } });
        logger.warn(`[compileToIife] retried without: ${unresolved.join(", ")}`);
        return retryResult.outputFiles![0].text;
      } catch { /* fall through to throw original error */ }
    }

    throw new Error(`esbuild: ${details}`);
  }
}

/** 응답 텍스트에서 ```tsx?``` 코드 블록 추출 */
function extractCodeBlock(text: string): string {
  const m = text.match(/```(?:tsx?|jsx?|react)?\s*\n?([\s\S]+?)```/);
  if (m) return m[1].trim();
  // No fenced block — return raw text (caller must validate)
  return text.trim();
}

/** 추출된 코드가 실제 JS/TS 코드인지 기본 검증 */
function assertValidCode(code: string): void {
  const first = code.trimStart();
  const validStarters = [
    /^import\b/,
    /^export\s+(default\s+)?(function|class|const|async)/,
    /^(const|let|var|function|class)\b/,
    /^\/\//,        // comment
    /^\/\*/,        // block comment
    /^"use /,       // "use strict" etc
  ];
  if (!validStarters.some((re) => re.test(first))) {
    const preview = first.slice(0, 80).replace(/\n/g, " ");
    throw new Error(`AI가 코드 블록을 반환하지 않았습니다. 응답 시작: "${preview}..."`);
  }
}

/** 응답 텍스트에서 SVG 아이콘 + TSX 컴포넌트 두 블록 추출 */
function extractSvgAndCode(text: string): { svg: string | null; code: string } {
  const svgMatch = text.match(/```svg\s*\n?([\s\S]+?)```/);
  const codeMatch = text.match(/```(?:tsx?|jsx?|react?)\s*\n?([\s\S]+?)```/);
  return {
    svg: svgMatch ? svgMatch[1].trim() : null,
    code: codeMatch ? codeMatch[1].trim() : extractCodeBlock(text),
  };
}

/** AgentDesk 위젯 컴포넌트 생성용 시스템 프롬프트 */
const SYSTEM_PROMPT = `You are an expert React component generator for AgentDesk — a developer OS for running, monitoring, and controlling multiple AI agents simultaneously.

## OUTPUT FORMAT (strict)
- Return ONLY a single \`\`\`tsx code block — no prose, no explanations, no comments outside the block
- Component name must be exactly: CustomFeatureWidget (default export)
- Props signature (do not change): { config: { refresh: string; theme: string; sizePreset: string; params?: Record<string, unknown> } }

## STYLE RULES (mandatory)
- Font: always set fontFamily: "var(--th-font-mono)" on root element
- The component MUST fill its container: style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column" }}
- Use ONLY these CSS variables (dark terminal theme):
  - var(--th-bg-elevated)   — card/widget background
  - var(--th-bg-panel)      — inner panel / input background
  - var(--th-border)        — default border (rgba white ~8%)
  - var(--th-text-primary)  — main text
  - var(--th-text-muted)    — secondary / dim text
  - var(--th-text-heading)  — bright headings
  - var(--th-accent)        — amber #f59e0b — use for highlights, active states, primary buttons
  - var(--th-attr-elite)    — green #22c55e — use for success, done, healthy states
  - var(--th-danger-text)   — red — use for errors, offline, critical
- Inline styles preferred; minimal Tailwind only for flex/grid layout helpers (flex, gap-2, etc.)
- No global CSS, no <style> tags

## HOOKS
- Use React.useState, React.useEffect, React.useMemo, React.useCallback — no external libraries
- Declare all hooks unconditionally at top of function body
- Auto-refresh: parse config.refresh ("30s", "1m", "5m") and setInterval accordingly

## AVAILABLE DATA APIs (fetch-only, /api/* paths)

### Agents
GET /api/agents
Response: { agents: Array<{
  id: string; name: string; name_en?: string; name_ja?: string; name_zh?: string;
  avatar_emoji: string; status: "idle"|"working"|"break"|"offline";
  department_id: string | null; current_task_id: string | null;
  role?: string; skills?: string[];
}> }

### Tasks
GET /api/tasks
Response: { tasks: Array<{
  id: string; title: string;
  status: "backlog"|"todo"|"in_progress"|"done"|"blocked";
  priority: "low"|"medium"|"high"|"critical";
  assigned_agent_id: string | null; project_id: string | null;
  created_at: number; updated_at: number;
}> }

### Departments
GET /api/departments
Response: { departments: Array<{
  id: string; name: string; color: string; agent_count?: number;
}> }

### Projects
GET /api/projects
Response: { projects: Array<{
  id: string; name: string; status: string; category_id?: string;
  core_goal?: string; project_path?: string;
}> }

### Agent Performance
GET /api/agents/performance
Response: { data: Array<{
  agent_id: string; agent_name: string; tasks_done: number;
  avg_duration_ms: number; success_rate: number;
}> }

### Notifications
GET /api/notifications
Response: { notifications: Array<{
  id: string; type: "info"|"warning"|"error"|"success";
  title: string; message: string; created_at: number; read: boolean;
}> }

## DATA FETCHING PATTERN
\`\`\`tsx
const [data, setData] = React.useState(null);
const [loading, setLoading] = React.useState(true);
const [error, setError] = React.useState(null);

const load = React.useCallback(async () => {
  try {
    setLoading(true);
    const res = await fetch("/api/agents");
    const j = await res.json();
    setData(j.agents);
  } catch(e) { setError(String(e)); }
  finally { setLoading(false); }
}, []);

React.useEffect(() => {
  load();
  const ms = config.refresh === "1m" ? 60000 : config.refresh === "5m" ? 300000 : 30000;
  const t = setInterval(load, ms);
  return () => clearInterval(t);
}, [load]);
\`\`\`

## LOADING / ERROR STATES (always implement)
- Loading: show a spinner or "Loading..." text in accent color
- Error: show error message in danger color with a retry button
- Empty: show a clear empty-state message

## SECURITY RULES (hard limits)
- No eval(), new Function(), require(), import(), document.write(), window.location=, localStorage.clear()
- fetch() calls ONLY to /api/* paths — no external URLs

## EXAMPLE WIDGET — use this as structural reference:
\`\`\`tsx
export default function CustomFeatureWidget({ config }: { config: { refresh: string; theme: string; sizePreset: string; params?: Record<string, unknown> } }) {
  const [agents, setAgents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/agents");
      const j = await r.json();
      setAgents(j.agents ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  React.useEffect(() => {
    load();
    const ms = config.refresh === "1m" ? 60000 : 30000;
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load]);

  const working = agents.filter(a => a.status === "working");

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", fontFamily: "var(--th-font-mono)", background: "var(--th-bg-elevated)", padding: 16, gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-muted)", letterSpacing: "0.08em" }}>
        WORKING AGENTS ({working.length})
      </div>
      {loading ? (
        <div style={{ color: "var(--th-accent)", fontSize: 12 }}>Loading...</div>
      ) : working.map(a => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--th-bg-panel)", border: "1px solid var(--th-border)", borderRadius: 6 }}>
          <span style={{ fontSize: 18 }}>{a.avatar_emoji}</span>
          <span style={{ flex: 1, fontSize: 12, color: "var(--th-text-primary)" }}>{a.name}</span>
          <span style={{ fontSize: 10, color: "var(--th-attr-elite)", fontWeight: 700 }}>WORKING</span>
        </div>
      ))}
    </div>
  );
}
\`\`\`

Now generate a NEW component matching the user's request. Follow all rules above exactly.`;

/**
 * GitHub URL → raw 콘텐츠 URL 변환
 * 지원 형식:
 *   https://github.com/user/repo/blob/branch/path/to/file.tsx
 *   https://github.com/user/repo/raw/branch/path/to/file.tsx
 *   https://raw.githubusercontent.com/user/repo/branch/path/to/file.tsx
 *   https://gist.github.com/user/gistId
 *   https://gist.githubusercontent.com/user/gistId/raw/...
 */
function toRawUrl(inputUrl: string): string {
  try {
    const u = new URL(inputUrl);

    // 이미 raw URL
    if (u.hostname === "raw.githubusercontent.com" || u.hostname === "gist.githubusercontent.com") {
      return inputUrl;
    }

    // gist.github.com — raw 변환
    if (u.hostname === "gist.github.com") {
      const parts = u.pathname.split("/").filter(Boolean); // [user, gistId]
      if (parts.length >= 2) {
        return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`;
      }
    }

    // github.com/user/repo/blob/branch/path → raw
    if (u.hostname === "github.com") {
      // /blob/ → /raw/ 치환으로도 되지만 raw.githubusercontent 형식이 더 안정적
      const path = u.pathname.replace(/^\//, "");
      // e.g. user/repo/blob/main/foo.tsx  OR  user/repo/raw/main/foo.tsx
      const m = path.match(/^([^/]+)\/([^/]+)\/(blob|raw)\/(.+)$/);
      if (m) {
        const [, user, repo, , rest] = m;
        return `https://raw.githubusercontent.com/${user}/${repo}/${rest}`;
      }
    }

    // 변환 불가 → 그대로 반환 (fetch 시 실패)
    return inputUrl;
  } catch {
    return inputUrl;
  }
}

/** GitHub URL에서 위젯 코드를 가져와 컴파일하고 저장 */
export async function runGithubImport(
  db: DbLike,
  featureId: string,
  githubUrl: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const rawUrl = toRawUrl(githubUrl);
    logger.info(`[github-import] fetching feature=${featureId} url=${rawUrl}`);

    const resp = await fetch(rawUrl, {
      headers: { "User-Agent": "AgentDesk/1.0" },
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`GitHub fetch failed: HTTP ${resp.status} — ${rawUrl}`);
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      throw new Error("URL이 HTML 페이지를 반환했습니다. raw 파일 URL을 사용하세요.");
    }

    const code = (await resp.text()).trim();
    if (!code) throw new Error("빈 파일입니다.");

    const cleaned = extractCodeBlock(code);
    assertValidCode(cleaned);

    // feature/github/<featureId>.tsx 에 소스 저장
    ensureDir(GITHUB_DIR);
    const urlFilename = githubUrl.split("/").filter(Boolean).pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "widget.tsx";
    const srcPath = join(GITHUB_DIR, `${featureId}-${urlFilename}`);
    saveSource(srcPath, cleaned);
    logger.info(`[github-import] saved source: ${srcPath}`);

    const blocked = validateBundle(cleaned);
    if (blocked) {
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    logger.info(`[github-import] compiling feature=${featureId}`);
    const iife = await compileToIife(cleaned);

    db.prepare("UPDATE custom_features SET bundle = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, "active", nowMs(), featureId);

    logger.info(`[github-import] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[github-import] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── GitHub Repo Import ──────────────────────────────────────────────────────

/** github.com/user/repo URL에서 user, repo 추출 */
function parseGithubRepo(repoUrl: string): { user: string; repo: string } | null {
  try {
    const u = new URL(repoUrl);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { user: parts[0], repo: parts[1].replace(/\.git$/, "") };
  } catch { return null; }
}

/** GitHub raw URL로 텍스트 파일 fetch (없으면 null) */
async function fetchGithubRaw(user: string, repo: string, filePath: string, signal: AbortSignal): Promise<string | null> {
  for (const branch of ["main", "master", "HEAD"]) {
    try {
      const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
      const r = await fetch(url, { headers: { "User-Agent": "AgentDesk/1.0" }, signal });
      if (r.ok) return await r.text();
    } catch { /* 다음 branch 시도 */ }
  }
  return null;
}

/** npm 패키지 임시 설치 (--no-save, 여러 패키지 지원) */
function installNpmPackages(pkgNames: string[]): Promise<void> {
  if (pkgNames.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn("npm", ["install", "--no-save", ...pkgNames], { shell: isWin, stdio: "ignore" });
    child.on("close", () => resolve());
    child.on("error", () => resolve());
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve(); }, 90_000);
  });
}

/** source code에서 npm 패키지 import 이름 추출 (relative/node-builtin 제외) */
function extractNpmImports(code: string): string[] {
  const importRe = /^\s*import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
  const SKIP = new Set(["react", "react-dom", "react-dom/client", "react/jsx-runtime"]);
  const pkgs = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(code)) !== null) {
    const spec = m[1];
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("node:")) continue;
    if (SKIP.has(spec)) continue;
    // scoped: @scope/pkg → 두 세그먼트, 일반: pkg → 첫 세그먼트
    const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    pkgs.add(pkg);
  }
  return [...pkgs];
}

/** git clone --depth=1 */
function gitClone(repoUrl: string, destDir: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = spawn(
      "git", ["clone", "--depth=1", "--single-branch", repoUrl, destDir],
      { shell: isWin, stdio: ["ignore", "pipe", "pipe"] },
    );
    let errOut = "";
    child.stderr?.on("data", (d: Buffer) => { errOut += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone 실패 (exit ${code}): ${errOut.slice(0, 200)}`));
    });
    child.on("error", (e: Error) => reject(new Error(`git 실행 실패: ${e.message}`)));
    signal.addEventListener("abort", () => { try { child.kill(); } catch { /* ignore */ } });
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } reject(new Error("git clone 타임아웃 (60초)")); }, 60_000);
  });
}

/** API provider가 없을 때 Claude Code CLI로 폴백 호출
 *  임시 파일 + 셸 리다이렉션(< tmpfile)으로 전달 — Windows CLI 인수 길이 제한 우회
 */
async function callClaudeCli(systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
  const combined = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  // 임시 파일에 프롬프트 저장
  const tmpFile = join(tmpdir(), `agd-${Date.now()}.txt`);
  writeFileSync(tmpFile, combined, "utf-8");

  // 셸 리다이렉션으로 stdin 전달: claude -p < tmpfile
  // shell: true 로 < 리다이렉션 사용, stdio["ignore"] — 셸이 파일을 stdin으로 넘김
  const shellCmd = `claude -p < "${tmpFile.replace(/\\/g, "/")}"`;

  return new Promise((resolve, reject) => {
    const child = spawn(shellCmd, [], {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";
    child.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { err += d.toString(); });
    child.on("close", (code, sig) => {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error(
        sig        ? `claude CLI 시그널 종료: ${sig}` :
        code !== 0 ? `claude CLI 오류 (exit ${code}): ${err.slice(0, 400)}` :
                     "claude CLI 응답이 비어있습니다.",
      ));
    });
    child.on("error", (e: Error) => {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
      reject(new Error(`claude CLI 실행 실패: ${e.message}`));
    });
    signal.addEventListener("abort", () => { try { child.kill(); } catch { /* ignore */ } });
  });
}

/** GitHub 레포를 읽어 AI로 위젯 생성 */
export async function runGithubRepoImport(
  db: DbLike,
  featureId: string,
  repoUrl: string,
  nowMs: () => number,
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000); // 5분

  try {
    const parsed = parseGithubRepo(repoUrl);
    if (!parsed) throw new Error("유효한 GitHub 레포 URL이 아닙니다.");
    const { user, repo } = parsed;

    appendLog(db, featureId, `레포 클론 시작: ${user}/${repo}`, nowMs);

    // feature/github/<user>-<repo>/ 에 git clone
    ensureDir(GITHUB_DIR);
    const repoDir = join(GITHUB_DIR, `${user}-${repo}`);

    if (existsSync(repoDir)) {
      appendLog(db, featureId, `기존 클론 재사용: feature/github/${user}-${repo}/`, nowMs);
    } else {
      appendLog(db, featureId, `git clone --depth=1 https://github.com/${user}/${repo} ...`, nowMs);
      await gitClone(`https://github.com/${user}/${repo}`, repoDir, controller.signal);
      appendLog(db, featureId, `클론 완료 → feature/github/${user}-${repo}/`, nowMs);
    }

    // 클론된 디렉토리에서 파일 직접 읽기
    const readmePath = join(repoDir, "README.md");
    const pkgPath    = join(repoDir, "package.json");
    const readme     = existsSync(readmePath) ? readFileSync(readmePath, "utf-8") : null;
    const pkgJsonText = existsSync(pkgPath)   ? readFileSync(pkgPath, "utf-8")   : null;

    if (!readme) throw new Error("README.md를 찾을 수 없습니다.");
    appendLog(db, featureId, `README.md 읽기 완료 (${readme.length.toLocaleString()} chars)`, nowMs);

    // npm 패키지 이름 파악
    let npmName: string | null = null;
    let pkgDescription = "";
    if (pkgJsonText) {
      try {
        const pkg = JSON.parse(pkgJsonText) as Record<string, unknown>;
        npmName = typeof pkg.name === "string" ? pkg.name : null;
        pkgDescription = typeof pkg.description === "string" ? pkg.description : "";
      } catch { /* ignore */ }
    }

    if (npmName) {
      appendLog(db, featureId, `npm 패키지: ${npmName}${pkgDescription ? ` — ${pkgDescription}` : ""}`, nowMs);
      appendLog(db, featureId, `npm install --no-save ${npmName} ...`, nowMs);
      await installNpmPackages([npmName]);
      appendLog(db, featureId, "npm install 완료", nowMs);
    } else {
      appendLog(db, featureId, "package.json 없음 — npm 설치 생략", nowMs);
    }

    // provider 조회 (없으면 Claude CLI 폴백)
    const cliProvider = readDefaultProvider(db);
    const provider = findApiProvider(db, cliProvider);
    const providerLabel = provider
      ? `${provider.name} / ${resolveModel(provider)}`
      : `claude CLI 폴백 (Settings > API Providers에 키 없음 — defaultProvider: ${cliProvider})`;
    appendLog(db, featureId, `AI 호출 중: ${providerLabel}`, nowMs);

    // AI 프롬프트 구성
    const readmeTruncated = readme.slice(0, 3000) + (readme.length > 3000 ? "\n...(truncated)" : "");
    const userPrompt = [
      `GitHub Repository: ${repoUrl}`,
      npmName ? `NPM Package: ${npmName}` : "",
      pkgDescription ? `Description: ${pkgDescription}` : "",
      "",
      "README:",
      readmeTruncated,
      "",
      npmName
        ? `Create a CustomFeatureWidget that imports and uses the '${npmName}' npm package.\nThe package is pre-installed — you can use: import ${toPascalCase(repo)} from '${npmName}';`
        : "Create a CustomFeatureWidget that demonstrates or integrates the concept/functionality from this repository.",
    ].filter(Boolean).join("\n");

    const raw = provider
      ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT_REPO, userPrompt, controller.signal)
      : await callClaudeCli(SYSTEM_PROMPT_REPO, userPrompt, controller.signal);

    appendLog(db, featureId, "AI 응답 완료 — SVG 아이콘 + TSX 파싱 중...", nowMs);

    let { svg, code } = extractSvgAndCode(raw);
    // 코드 블록이 없으면 1회 재시도
    try { assertValidCode(code); } catch {
      appendLog(db, featureId, "코드 블록 없음 — AI 재시도 중...", nowMs);
      const raw2 = provider
        ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT_REPO, userPrompt, controller.signal)
        : await callClaudeCli(SYSTEM_PROMPT_REPO, userPrompt, controller.signal);
      const extracted2 = extractSvgAndCode(raw2);
      svg = extracted2.svg ?? svg;
      code = extracted2.code;
      assertValidCode(code); // 재시도도 실패하면 여기서 throw
    }

    // AI 생성 widget.tsx를 두 곳에 저장:
    // 1. 레포 디렉토리 (소스 보존)
    // 2. feature/ai/<featureId>.tsx (컴파일 시 표준 경로)
    saveSource(join(repoDir, "widget.tsx"), code);
    ensureDir(AI_DIR);
    saveSource(join(AI_DIR, `${featureId}.tsx`), code);
    appendLog(db, featureId, "소스 저장 완료 → 앱이 바탕화면에 추가됩니다.", nowMs);

    const blocked = validateBundle(code);
    if (blocked) throw new Error(`Safety check failed: ${blocked}`);

    // 컴파일은 앱 첫 실행 시 수행 (pending_install)
    db.prepare("UPDATE custom_features SET icon_svg = ?, status = 'pending_install', error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(svg ?? null, nowMs(), featureId);

    appendLog(db, featureId, "✓ 다운로드 완료! 바탕화면 앱을 열면 설치됩니다.", nowMs);
    logger.info(`[github-repo] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[github-repo] error feature=${featureId}: ${msg}`);
    db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
      .run("error", msg.slice(0, 400), nowMs(), featureId);
  } finally {
    clearTimeout(timeout);
  }
}

/** repo 이름 → PascalCase (import 이름용) */
function toPascalCase(s: string): string {
  return s.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

/** GitHub 레포 임포트용 시스템 프롬프트 */
const SYSTEM_PROMPT_REPO = `You are an expert React component generator for AgentDesk — a developer OS for running AI agents.

## OUTPUT FORMAT (strict)
Return EXACTLY two code blocks in this order — nothing else:

1. An SVG icon block:
\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <!-- simple, recognizable icon representing the library's purpose -->
  <!-- use stroke="currentColor" so the color is themeable -->
</svg>
\`\`\`

2. A TSX component block:
\`\`\`tsx
// full component code here
\`\`\`

No prose, no other text, no explanations outside the two blocks.

## COMPONENT RULES
- Component name: CustomFeatureWidget (default export)
- Props: { config: { refresh: string; theme: string; sizePreset: string; params?: Record<string, unknown> } }
- You CAN use static import statements for npm packages that are pre-installed:
  Example: import Defuddle from 'defuddle';
- Do NOT use dynamic import() — use static imports at the top of the file
- If the library does DOM manipulation, use it inside useEffect with a ref

## STYLE (mandatory)
- fontFamily: "var(--th-font-mono)" on root
- Fill container: width:"100%", height:"100%", display:"flex", flexDirection:"column"
- CSS variables: var(--th-bg-elevated), var(--th-bg-panel), var(--th-border), var(--th-text-primary), var(--th-text-muted), var(--th-text-heading), var(--th-accent) #f59e0b, var(--th-attr-elite) #22c55e, var(--th-danger-text)

## HOOKS
- useState, useEffect, useMemo, useCallback — no other hooks or external libraries except the specified npm package

## AVAILABLE AGENTDESK APIs (fetch /api/*)
- GET /api/agents → { agents: [{id, name, status, avatar_emoji, department_id, current_task_id}] }
- GET /api/tasks → { tasks: [{id, title, status, priority, assigned_agent_id}] }

## SECURITY
- No eval(), new Function(), require(), import(), document.write(), window.location=, localStorage.clear()
- fetch() only to /api/* paths`;

/** pending_install 앱을 컴파일해 bundle 저장 (앱 첫 실행 시 호출) */
export async function compileFeature(
  db: DbLike,
  featureId: string,
  nowMs: () => number,
): Promise<void> {
  const srcPath = join(AI_DIR, `${featureId}.tsx`);
  if (!existsSync(srcPath)) {
    db.prepare("UPDATE custom_features SET status = 'error', error_msg = ?, updated_at = ? WHERE id = ?")
      .run("소스 파일을 찾을 수 없습니다: " + srcPath, nowMs(), featureId);
    return;
  }
  // 이미 컴파일 중이면 중복 실행 방지
  const row = db.prepare("SELECT status FROM custom_features WHERE id = ?").get(featureId) as
    | { status: string } | undefined;
  if (row?.status === "active" || row?.status === "draft") return;

  // 재시도: draft로 전환 + error_msg 초기화
  db.prepare("UPDATE custom_features SET status = 'draft', error_msg = NULL, bundle = NULL, updated_at = ? WHERE id = ?")
    .run(nowMs(), featureId);

  try {
    const code = readFileSync(srcPath, "utf-8");
    const blocked = validateBundle(code);
    if (blocked) throw new Error(`Safety check failed: ${blocked}`);

    // 소스에서 npm 패키지 추출 → 컴파일 전 재설치 (서버 재시작 후에도 안전)
    const npmPkgs = extractNpmImports(code);
    if (npmPkgs.length > 0) {
      logger.info(`[compile] npm install --no-save ${npmPkgs.join(" ")}`);
      await installNpmPackages(npmPkgs);
    }

    const iife = await compileToIife(code);
    db.prepare("UPDATE custom_features SET bundle = ?, status = 'active', error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, nowMs(), featureId);
    logger.info(`[compile] done feature=${featureId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[compile] error feature=${featureId}: ${msg}`);
    // 실패해도 pending_install 유지 — 아이콘이 사라지지 않고 렌더 페이지에서 재시도 가능
    db.prepare("UPDATE custom_features SET status = 'pending_install', error_msg = ?, updated_at = ? WHERE id = ?")
      .run(msg.slice(0, 400), nowMs(), featureId);
  }
}

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

    const providerLabel = provider
      ? `${provider.name} / ${resolveModel(provider)}`
      : `claude CLI 폴백 (Settings > API Providers에 키 없음 — defaultProvider: ${cliProvider})`;
    appendLog(db, featureId, `AI 호출 중: ${providerLabel}`, nowMs);
    logger.info(`[custom-feature-ai] generating feature=${featureId} provider=${providerLabel}`);

    const raw = provider
      ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT, userPrompt, controller.signal)
      : await callClaudeCli(SYSTEM_PROMPT, userPrompt, controller.signal);
    appendLog(db, featureId, "AI 응답 완료 — 코드 파싱 중...", nowMs);
    let code = extractCodeBlock(raw);
    // 코드 블록이 없으면 1회 재시도
    try { assertValidCode(code); } catch {
      appendLog(db, featureId, "코드 블록 없음 — AI 재시도 중...", nowMs);
      const raw2 = provider
        ? await callProvider(provider, resolveModel(provider), SYSTEM_PROMPT, userPrompt, controller.signal)
        : await callClaudeCli(SYSTEM_PROMPT, userPrompt, controller.signal);
      code = extractCodeBlock(raw2);
      assertValidCode(code);
    }

    // feature/ai/<featureId>.tsx 에 소스 저장
    ensureDir(AI_DIR);
    saveSource(join(AI_DIR, `${featureId}.tsx`), code);
    appendLog(db, featureId, `소스 저장: feature/ai/${featureId}.tsx`, nowMs);

    const blocked = validateBundle(code);
    if (blocked) {
      appendLog(db, featureId, `✗ Safety check: ${blocked}`, nowMs);
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    appendLog(db, featureId, "esbuild 번들 컴파일 중...", nowMs);
    logger.info(`[custom-feature-ai] compiling feature=${featureId}`);
    let iife: string;
    try {
      iife = await compileToIife(code);
    } catch (buildErr) {
      const buildMsg = buildErr instanceof Error ? buildErr.message : String(buildErr);
      appendLog(db, featureId, `✗ 컴파일 실패: ${buildMsg}`, nowMs);
      throw buildErr;
    }

    db.prepare("UPDATE custom_features SET bundle = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, "active", nowMs(), featureId);

    appendLog(db, featureId, "✓ 완료!", nowMs);
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
