# LLM Call Patterns — Architecture Reference

> Last updated: 2026-03-24
> Purpose: Document all LLM invocation patterns across the codebase to prevent inconsistency bugs.

---

## 1. Overview

AgentDesk calls LLMs in **4 distinct patterns** across the codebase.
All paths ultimately use `resolveProvider()` from `llm-client.ts` to determine whether to call Anthropic Messages API or OpenAI-compatible Chat Completions API.

```
┌───────────────────────────────────────────────────────────────────────┐
│                        resolveProvider(db)                           │
│  1. DB api_providers (by id or first enabled)                       │
│  2. env ANTHROPIC_API_KEY fallback                                  │
│  3. env OPENAI_API_KEY fallback                                     │
│  → returns { type: "anthropic" | "openai-compatible", apiKey, ... } │
└───────────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
  callAnthropicStream()             callOpenAICompatibleStream()
  (Anthropic Messages API)          (OpenAI Chat Completions API)
```

---

## 2. The 4 Call Patterns

### Pattern A — Streaming + Tool Use (Agent Runtime)

**File:** `server/modules/agent-runtime/execution-loop.ts`
**Used by:** Agent task execution (the main runtime loop)

```
resolveProvider(db, apiProviderId)
  → provider.type === "anthropic"
    ? callAnthropicStream({ apiKey, model, systemPrompt, messages, tools, ... })
    : callOpenAICompatibleStream({ apiKey, baseUrl, model, systemPrompt, messages, tools, ... })
```

- **Streaming:** Yes (SSE)
- **Tool use:** Yes (TOOL_DEFINITIONS: list_files, read_file, write_file, search_files, run_command)
- **Multi-turn:** Yes (up to maxTurns, default 20)
- **Message format:** Anthropic-native internally, converted via `toOpenAIMessages()` for OpenAI-compat
- **Both providers fully working:** Yes

### Pattern B — CLI Subprocess (Agent Runtime)

**File:** `server/modules/agent-runtime/execution-loop.ts` → `runViaCli()`
**Used by:** Agents with `cli_provider` set (claude, codex, gemini, cursor, opencode)

```
agent.cli_provider exists AND no api_provider_id
  → spawn("claude" | "codex" | "gemini", args)
  → stdin: system prompt + task title
  → stdout: real-time streaming to WebSocket
```

- **Streaming:** Yes (process stdout)
- **Tool use:** Handled by CLI tool itself (not AgentDesk tools)
- **Codex-specific:** NDJSON parsing via `CodexLineBuffer` + `parseCodexJsonLine()`
- **Timeout:** 120s
- **Auth error detection:** Pattern matching on stderr output
- **Both providers fully working:** Yes (each CLI has its own auth)

### Pattern C — One-Shot Non-Streaming (Kickoff / Projects / PM)

**Files:**
- `server/modules/routes/core/projects.ts` → `callLlmOneShot()`
- `server/modules/routes/core/projects/kickoff.ts` → `callLlmOneShot()` + `runInternalAddTasksPipeline()`
- `server/modules/workflow/orchestration/pm-orchestrator.ts` → `callProviderCompat()` + `pmProjectLevelReview()`

```
resolveProvider(db)
  → if anthropic:
      fetch("https://api.anthropic.com/v1/messages", { model, max_tokens, system, messages })
      → parse response.content[].text
  → else:
      fetch(`${baseUrl}/chat/completions`, { model, max_tokens, messages: [system, user] })
      → parse response.choices[0].message.content
```

- **Streaming:** No
- **Tool use:** No
- **Multi-turn:** No (single request-response)
- **Both providers fully working:** Yes
- **PROBLEM: Code is duplicated in 3 files** (identical logic copy-pasted)

### Pattern D — One-Shot Non-Streaming (App Runner AI Analysis)

**File:** `server/modules/routes/ops/app-runner.ts` (lines 276-360)
**Used by:** `POST /api/apps/:projectId/analyze` — AppRunnerWindow AI analysis

```
resolveProvider(db)
  → if anthropic:
      fetch(`${provider.baseUrl}/messages`, { model, max_tokens: 1200, messages })
      → parse response.content[0].text
  → else:
      fetch(`${provider.baseUrl}/chat/completions`, { model, max_tokens: 1200, messages })
      → parse response.choices[0].message.content
```

- **Streaming:** No
- **Tool use:** No
- **Prompt:** `prompts/system/project-analysis.md` (expects `---JSON---` separator in response)
- **Both providers working:** Yes — BUT with a subtle difference (see Bug section below)

---

## 3. Fixed Bug: App Runner Anthropic Call Missing `system` Field

> **Status: FIXED** (commit f2bb161)

**Previous issue in** `server/modules/routes/ops/app-runner.ts`:

```typescript
// OLD CODE — both branches identical, no system prompt separation:
const body = isAnthropic
  ? JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
  : JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] });
```

**Problems fixed:**
1. Anthropic call lacked `system` field — prompt was in user message only
2. Both branches were identical — ternary was meaningless
3. No system/user prompt separation for any provider

**Fix:** Replaced with shared `callLlmOneShot()` which properly separates system/user prompts for both Anthropic (via `system` field) and OpenAI-compatible (via `role: "system"` message).

---

## 4. Code Duplication — Resolved

> **Status: FIXED** — All 4 callers now use shared `callLlmOneShot()` from `llm-client.ts`.

| # | File | Wrapper Function | maxTokens | Status |
|---|------|-----------------|-----------|--------|
| 1 | `routes/core/projects.ts` | `callLlmOneShot()` → shared | 2048 (default) | Refactored |
| 2 | `routes/core/projects/kickoff.ts` | `callLlmOneShot()` → shared | 4096 | Refactored |
| 3 | `workflow/orchestration/pm-orchestrator.ts` | `callProviderCompat()` → shared | 2048 (default) | Refactored |
| 4 | `routes/ops/app-runner.ts` | direct call to shared | 1200 | Refactored + bug fixed |

---

## 5. Full File Reference

### Core LLM Infrastructure

| File | Exports | Purpose |
|------|---------|---------|
| `server/modules/agent-runtime/llm-client.ts` | `resolveProvider`, `resolveAnthropicKey`, `getDefaultModel`, `callAnthropicStream`, `callOpenAICompatibleStream` | Central LLM client — provider resolution + streaming calls |
| `server/modules/agent-runtime/execution-loop.ts` | `startExecutionLoop`, `cancelRun`, `CodexLineBuffer`, `parseCodexJsonLine`, `parseCodexJsonChunk` | Agent runtime execution (Pattern A + B) |
| `server/modules/agent-runtime/types.ts` | `LlmMessage`, `LlmContent`, `ToolDefinition`, `ToolCall`, `ToolResult`, `StartRunOptions` | Type definitions |
| `server/modules/agent-runtime/tools.ts` | `TOOL_DEFINITIONS`, `executeTool` | 5 tools: list_files, read_file, write_file, search_files, run_command |
| `server/modules/agent-runtime/store.ts` | `createRun`, `updateRunStatus`, `appendEvent`, `getRun`, etc. | Runtime run/event DB persistence |
| `server/modules/agent-runtime/routes.ts` | `registerAgentRuntimeRoutes` | REST API: `/api/agent-runtime/*` |

### LLM Callers (Pattern C — One-Shot)

| File | Function | Used For |
|------|----------|----------|
| `server/modules/routes/core/projects.ts` | `callLlmOneShot()` | Project-level LLM calls (feature generation, etc.) |
| `server/modules/routes/core/projects/kickoff.ts` | `callLlmOneShot()` + `callViaCliProvider()` | Kickoff task creation (LLM + CLI fallback) |
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | `callProviderCompat()` | PM review, approval, progress.md generation |

### LLM Caller (Pattern D — App Analysis)

| File | Function | Used For |
|------|----------|----------|
| `server/modules/routes/ops/app-runner.ts` | inline in POST `/api/apps/:projectId/analyze` | AI project analysis (file scan + LLM description) |
| `prompts/system/project-analysis.md` | — | Analysis prompt template (expects `---JSON---` separator) |

### Frontend (Analysis UI)

| File | Component | Context |
|------|-----------|---------|
| `src/components/windows/AppRunnerWindow.tsx` | `AppRunnerWindow` | App Runner window with prompt input (AI analyze → install → run) |
| ~~`AnalysisTab.tsx`~~ | ~~removed~~ | ~~Deleted — app analysis is now exclusively in AppRunnerWindow~~ |
| `src/api/app-runner.ts` | `analyzeApp()`, `getAppStatus()`, `runApp()`, etc. | API client functions |

---

## 6. Provider Support Matrix

| Provider | API Streaming (Pattern A) | CLI Mode (Pattern B) | One-Shot (Pattern C+D) |
|----------|--------------------------|---------------------|----------------------|
| Anthropic | callAnthropicStream | claude CLI | callLlmOneShot (shared) |
| OpenAI | callOpenAICompatibleStream | codex CLI | callLlmOneShot (shared) |
| Gemini | — (no compat) | gemini CLI | — |
| Ollama | callOpenAICompatibleStream | — | callLlmOneShot (shared) |
| Groq | callOpenAICompatibleStream | — | callLlmOneShot (shared) |
| Together | callOpenAICompatibleStream | — | callLlmOneShot (shared) |
| OpenRouter | callOpenAICompatibleStream | — | callLlmOneShot (shared) |
| Cerebras | callOpenAICompatibleStream | — | callLlmOneShot (shared) |
| Cursor | — | cursor CLI | — |
| Copilot | — | HTTP agent | — |
| Antigravity | — | HTTP agent | — |

---

## 7. Default Models per Provider

From `llm-client.ts`:

```typescript
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
```

---

## 8. Action Items

| Priority | Item | Status |
|----------|------|--------|
| ~~P0~~ | ~~Fix app-runner Anthropic body~~ | **Done** — system/user prompts now properly separated |
| ~~P1~~ | ~~Extract shared `callLlmOneShot()`~~ | **Done** — single implementation in `llm-client.ts`, 4 callers refactored |
| **P2** | Add Google AI (Gemini) API support | Pending — currently only CLI mode; no direct API streaming |
