import { build as esbuild } from "esbuild";
import { spawn } from "node:child_process";
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
    // 바이너리·HTML 등 거부
    if (contentType.includes("text/html")) {
      throw new Error("URL이 HTML 페이지를 반환했습니다. raw 파일 URL을 사용하세요.");
    }

    const code = (await resp.text()).trim();
    if (!code) throw new Error("빈 파일입니다.");

    // 코드 블록 래퍼가 있으면 제거
    const cleaned = extractCodeBlock(code);

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

/** npm 패키지 임시 설치 (--no-save) */
function installNpmPackage(pkgName: string): Promise<void> {
  return new Promise((resolve) => {
    const isWin = process.platform === "win32";
    const child = spawn("npm", ["install", "--no-save", pkgName], { shell: isWin, stdio: "ignore" });
    child.on("close", () => resolve()); // 성공·실패 무관하게 진행
    child.on("error", () => resolve());
    setTimeout(() => { try { child.kill(); } catch { /* ignore */ } resolve(); }, 30_000);
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
  const timeout = setTimeout(() => controller.abort(), 120_000); // 2분

  try {
    const parsed = parseGithubRepo(repoUrl);
    if (!parsed) throw new Error("유효한 GitHub 레포 URL이 아닙니다.");
    const { user, repo } = parsed;

    appendLog(db, featureId, `레포 분석 시작: ${user}/${repo}`, nowMs);

    // README + package.json 병렬 fetch
    appendLog(db, featureId, "README.md · package.json 가져오는 중...", nowMs);
    const [readme, pkgJsonText] = await Promise.all([
      fetchGithubRaw(user, repo, "README.md", controller.signal),
      fetchGithubRaw(user, repo, "package.json", controller.signal),
    ]);

    if (!readme) throw new Error("README.md를 찾을 수 없습니다. 공개 레포인지 확인해주세요.");
    appendLog(db, featureId, `README.md 완료 (${readme.length.toLocaleString()} chars)`, nowMs);

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
      appendLog(db, featureId, `npm 패키지 발견: ${npmName}${pkgDescription ? ` — ${pkgDescription}` : ""}`, nowMs);
      appendLog(db, featureId, `npm install --no-save ${npmName} ...`, nowMs);
      await installNpmPackage(npmName);
      appendLog(db, featureId, `npm install 완료`, nowMs);
    } else {
      appendLog(db, featureId, "package.json 없음 — npm 설치 생략", nowMs);
    }

    // provider 조회
    const cliProvider = readDefaultProvider(db);
    const provider = findApiProvider(db, cliProvider);
    if (!provider) throw new Error(
      `API 프로바이더가 설정되지 않았습니다. Settings → API Providers에서 API 키를 추가해주세요.`,
    );

    const model = resolveModel(provider);
    appendLog(db, featureId, `AI 호출 중: ${provider.name} / ${model}`, nowMs);

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

    const raw = await callProvider(provider, model, SYSTEM_PROMPT_REPO, userPrompt, controller.signal);
    appendLog(db, featureId, "AI 응답 완료 — SVG 아이콘 + TSX 파싱 중...", nowMs);

    const { svg, code } = extractSvgAndCode(raw);

    const blocked = validateBundle(code);
    if (blocked) throw new Error(`Safety check failed: ${blocked}`);

    appendLog(db, featureId, "esbuild 번들 컴파일 중...", nowMs);
    const iife = await compileToIife(code);

    db.prepare("UPDATE custom_features SET bundle = ?, icon_svg = ?, status = ?, error_msg = NULL, updated_at = ? WHERE id = ?")
      .run(iife, svg ?? null, "active", nowMs(), featureId);

    appendLog(db, featureId, "✓ 완료! 앱이 데스크톱에 추가됩니다.", nowMs);
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
      const errMsg = "API 프로바이더가 설정되지 않았습니다. Settings → API Providers에서 API 키를 추가해주세요.";
      appendLog(db, featureId, `✗ ${errMsg}`, nowMs);
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", errMsg, nowMs(), featureId);
      return;
    }

    const model = resolveModel(provider);
    appendLog(db, featureId, `AI 호출 중: ${provider.name} / ${model}`, nowMs);
    logger.info(`[custom-feature-ai] generating feature=${featureId} provider=${provider.name} model=${model}`);

    const raw = await callProvider(provider, model, SYSTEM_PROMPT, userPrompt, controller.signal);
    appendLog(db, featureId, "AI 응답 완료 — 코드 파싱 중...", nowMs);
    const code = extractCodeBlock(raw);

    const blocked = validateBundle(code);
    if (blocked) {
      appendLog(db, featureId, `✗ Safety check: ${blocked}`, nowMs);
      db.prepare("UPDATE custom_features SET status = ?, error_msg = ?, updated_at = ? WHERE id = ?")
        .run("error", `Safety check failed: ${blocked}`, nowMs(), featureId);
      return;
    }

    appendLog(db, featureId, "esbuild 번들 컴파일 중...", nowMs);
    logger.info(`[custom-feature-ai] compiling feature=${featureId}`);
    const iife = await compileToIife(code);

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
