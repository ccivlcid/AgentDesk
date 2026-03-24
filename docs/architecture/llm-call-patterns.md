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
- `server/modules/routes/core/projects/kickoff.ts` → `callLlmOneShot()`
- `server/modules/workflow/orchestration/pm-orchestrator.ts` → `callProviderCompat()`

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
**Used by:** `POST /api/apps/:projectId/analyze` — AI project analysis tab

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

## 3. Bug / Issue: App Runner Anthropic Call Missing `system` Field

**Location:** `server/modules/routes/ops/app-runner.ts` lines 305-307

```typescript
// CURRENT CODE (lines 305-307):
const body = isAnthropic
  ? JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
  : JSON.stringify({ model, max_tokens: 1200, messages: [{ role: "user", content: prompt }] });
```

**Issues found:**

1. **Anthropic call lacks `system` field** — The prompt is sent as a `user` message instead of using the `system` parameter. This works but is suboptimal (system prompts get better instruction-following). Compare with Pattern C which correctly uses `system: systemPrompt`.

2. **Both branches are identical** — The ternary is meaningless; `isAnthropic` and `else` produce the same JSON body. The OpenAI-compatible branch should use `messages: [{ role: "system", content: prompt }]` or `[{ role: "system", content: "" }, { role: "user", content: prompt }]`.

3. **No `system` prompt separation** — Unlike Pattern C (`callLlmOneShot`) which separates system/user prompts, Pattern D puts everything in one user message. The project-analysis prompt would benefit from system/user separation.

**Impact:** AI analysis may produce lower-quality results because the entire prompt is crammed into the user message. For OpenAI-compatible providers, there's no system message at all.

---

## 4. Code Duplication Map

The same "one-shot LLM call" pattern is independently implemented in **4 places**:

| # | File | Function | max_tokens | system param |
|---|------|----------|-----------|--------------|
| 1 | `routes/core/projects.ts` | `callLlmOneShot()` | 2048 | Yes (separate) |
| 2 | `routes/core/projects/kickoff.ts` | `callLlmOneShot()` | 4096 | Yes (separate) |
| 3 | `workflow/orchestration/pm-orchestrator.ts` | `callProviderCompat()` | 2048 | Yes (separate) |
| 4 | `routes/ops/app-runner.ts` | inline in `/analyze` | 1200 | **No (combined)** |

**Recommendation:** Extract a shared `callLlmOneShot()` into `llm-client.ts` with configurable `maxTokens` and proper system/user separation. All 4 callers should use it.

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
| `src/components/windows/AppRunnerWindow.tsx` | `AppRunnerWindow` | Standalone App Runner window (Analyze → Install → Run) |
| `src/components/desktop/project-folder-window/AnalysisTab.tsx` | `AnalysisTab` | Folder window's "Analysis" tab (auto-analyzes on mount) |
| `src/api/app-runner.ts` | `analyzeApp()`, `getAppStatus()`, `runApp()`, etc. | API client functions |

---

## 6. Provider Support Matrix

| Provider | API Streaming (Pattern A) | CLI Mode (Pattern B) | One-Shot (Pattern C) | App Analysis (Pattern D) |
|----------|--------------------------|---------------------|---------------------|-------------------------|
| Anthropic | callAnthropicStream | claude CLI | callLlmOneShot | inline fetch |
| OpenAI | callOpenAICompatibleStream | codex CLI | callLlmOneShot | inline fetch |
| Gemini | — (no compat) | gemini CLI | — | — |
| Ollama | callOpenAICompatibleStream | — | callLlmOneShot | inline fetch |
| Groq | callOpenAICompatibleStream | — | callLlmOneShot | inline fetch |
| Together | callOpenAICompatibleStream | — | callLlmOneShot | inline fetch |
| OpenRouter | callOpenAICompatibleStream | — | callLlmOneShot | inline fetch |
| Cerebras | callOpenAICompatibleStream | — | callLlmOneShot | inline fetch |
| Cursor | — | cursor CLI | — | — |
| Copilot | — | HTTP agent | — | — |
| Antigravity | — | HTTP agent | — | — |

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

| Priority | Item | Details |
|----------|------|---------|
| **P0** | Fix app-runner Anthropic body | Add `system` field to Anthropic call, add `system` message to OpenAI call |
| **P1** | Extract shared `callLlmOneShot()` | Move to `llm-client.ts`, replace 4 duplicate implementations |
| **P2** | Add Google AI (Gemini) API support | Currently only CLI mode; no direct API streaming |
