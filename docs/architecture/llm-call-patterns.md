# LLM Call Patterns — Architecture Reference

> Last updated: 2026-03-25
> Purpose: Document all LLM invocation patterns to prevent inconsistency bugs.
>
> **Rule: All LLM prompts must be in `.md` files under `prompts/`.** No hardcoded prompt strings in server code.
> Use `loadPrompt("path/name", { vars })` from `server/lib/prompt-loader.ts`.

---

## 1. Two Fundamentally Different Call Types

AgentDesk has two distinct LLM call categories:

| Type | Who decides provider? | Entry point | Example |
|------|----------------------|-------------|---------|
| **Agent-level** | Each agent's `cli_provider` + `api_provider_id` | Task execution, direct chat | Agent runs a task, agent replies in chat |
| **System-level** | `callLlmOneShotAuto()` auto-detects from agent configs | Kickoff, auto-assign | System generates tasks, system assigns agents |

**This distinction is critical.** Agent-level calls never had the "No API provider" problem because they read each agent's own config. System-level calls had the problem because they used `resolveProvider()` which only checks the `api_providers` table.

---

## 2. Agent-Level Calls (Per-Agent Config)

### How provider is selected

Each agent has `cli_provider` and optionally `api_provider_id` in the `agents` table:

```
agent.cli_provider = "api" AND agent.api_provider_id exists
  → HTTP API call (Anthropic or OpenAI-compatible)

agent.cli_provider = "copilot" | "antigravity"
  → OAuth HTTP agent (streaming)

agent.cli_provider = "claude" | "codex" | "gemini" | "cursor" | "opencode"
  → CLI subprocess spawn (stdin/stdout)

agent.cli_provider = "ollama" AND agent.api_provider_id exists
  → HTTP API call to local Ollama server
```

### 2.1 Task Execution

**File:** `server/modules/routes/core/tasks/execution-run.ts`

```
If api_provider_id is set → provider = "api" (regardless of cli_provider)
Otherwise                 → provider = cli_provider || "claude"
```

### 2.2 Direct Chat

**File:** `server/modules/routes/collab/direct-chat-runtime-reply.ts`

```
runDirectReplyExecution(agent, message)
  ├── agent.cli_provider === "api" && api_provider_id
  │   → executeApiProviderAgent() (HTTP streaming + chat_stream WS events)
  │
  ├── agent.cli_provider === "copilot"
  │   → executeCopilotAgent() (OAuth HTTP)
  │
  ├── agent.cli_provider === "antigravity"
  │   → executeAntigravityAgent() (OAuth HTTP)
  │
  └── else (claude/codex/gemini/cursor/opencode)
      → runAgentOneShot(agent, prompt) (CLI spawn)
```

### 2.3 Agent Runtime (Built-in LLM + Tool Loop)

**File:** `server/modules/agent-runtime/execution-loop.ts`

- Anthropic/OpenAI-compatible API streaming + tool loop
- Tools: `list_files`, `read_file`, `write_file`, `search_files`, `run_command`
- Up to 20 turns per execution

---

## 3. System-Level Calls (`callLlmOneShotAuto`)

### The problem that was solved

System-level calls (kickoff task creation, auto-assign) need to call an LLM but aren't tied to a specific agent. Previously these used `resolveProvider(db)` which only checked:
1. `api_providers` table
2. `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` env vars

Users with only CLI providers (e.g., `claude` via `claude login`) had empty `api_providers` and no env keys → **all system LLM calls failed**.

### The solution: `callLlmOneShotAuto()`

**File:** `server/modules/agent-runtime/llm-client.ts`

Single function that auto-detects the best available provider:

```
callLlmOneShotAuto({ db, systemPrompt, userPrompt, maxTokens?, timeoutMs? })
  │
  ▼
resolveCliProviderFromAgents(db)
  │
  ├── 1. Any agent has api_provider_id? → API HTTP call
  │     (uses that agent's api_provider_id to resolve provider)
  │
  ├── 2. Any agent has cli_provider = claude/codex/gemini/cursor/opencode?
  │     → CLI --print mode (stdin → stdout, no tools)
  │
  ├── 3. settings.defaultProvider set?
  │     → CLI --print mode with that provider
  │
  └── 4. Ultimate fallback → "claude" CLI
```

**If API call fails (timeout, auth error), automatically falls back to CLI.**

### CLI --print mode commands

| CLI Provider | Command | stdin→stdout |
|-------------|---------|:---:|
| `claude` (default) | `claude --dangerously-skip-permissions --print --max-turns 1` | O |
| `codex` | `codex exec --json` | O |
| `gemini` | `gemini --yolo` | O |
| `cursor` | `agent --print` | O |
| `opencode` | `opencode run --format json` | O |
| `copilot` / `antigravity` | *(HTTP agent — CLI fallback unavailable)* | X |
| `ollama` (no api_provider_id) | *(no stdin mode — skipped, uses other agent's CLI)* | X |

### Where `callLlmOneShotAuto` is used

| Caller | File | Purpose | maxTokens | timeout |
|--------|------|---------|-----------|---------|
| Auto-assign | `routes/core/projects.ts` | AI agent role assignment | 2048 | 30s |
| Kickoff task creation | `routes/core/projects/kickoff.ts` | LLM generates tasks from project goal | 4096 | 120s |
| Add-tasks pipeline | `routes/core/projects/kickoff.ts` | Additional task generation | 4096 | 120s |

### PM Orchestrator (special case)

**File:** `server/modules/workflow/orchestration/pm-orchestrator.ts`

PM orchestrator uses `callProviderCompat()` → `callLlmOneShot()` (low-level), wrapped with `findApiProviderCompat()` which returns `null` if no API provider. It does NOT use `callLlmOneShotAuto` yet — PM review requires API providers or uses `runAgentOneShot` (agent-level).

---

## 4. Provider Resolution Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT-LEVEL CALLS                            │
│  (task execution, direct chat)                                  │
│                                                                 │
│  Each agent's own config:                                       │
│    agents.cli_provider + agents.api_provider_id                 │
│    → No "No API provider" error possible                        │
│    → Agent without api_provider_id uses its CLI directly        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM-LEVEL CALLS                           │
│  (kickoff, auto-assign, add-tasks)                              │
│                                                                 │
│  callLlmOneShotAuto({ db, ... })                               │
│    1. agent with api_provider_id → API call                    │
│    2. agent with CLI provider → CLI --print                    │
│    3. settings.defaultProvider → CLI --print                   │
│    4. "claude" fallback                                        │
│    → Never throws "No API provider" — always has a path        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Core LLM Infrastructure Files

| File | Key Exports | Purpose |
|------|-------------|---------|
| `server/modules/agent-runtime/llm-client.ts` | `callLlmOneShotAuto`, `callLlmOneShot`, `resolveProvider`, `resolveCliProviderFromAgents`, `callAnthropicStream`, `callOpenAICompatibleStream` | Central LLM client |
| `server/modules/agent-runtime/execution-loop.ts` | `startExecutionLoop`, `cancelRun` | Agent runtime (Pattern A + B) |
| `server/modules/agent-runtime/tools.ts` | `TOOL_DEFINITIONS`, `executeTool` | 5 built-in tools |
| `server/modules/agent-runtime/types.ts` | `LlmMessage`, `ToolDefinition`, etc. | Type definitions |
| `server/modules/routes/collab/direct-chat-runtime-reply.ts` | `runDirectReplyExecution` | Chat provider branching |
| `server/modules/routes/core/tasks/execution-run.ts` | task run handler | Task provider branching |

---

## 6. Provider Support Matrix

| Provider | Task/Chat (Agent-level) | System One-Shot API | System One-Shot CLI |
|----------|------------------------|--------------------|--------------------|
| Anthropic | API streaming + tools | callLlmOneShot | claude --print |
| OpenAI | API streaming + tools | callLlmOneShot | codex exec --json |
| Gemini | gemini CLI | — | gemini --yolo |
| Ollama | API streaming (local) | callLlmOneShot | — |
| Groq | API streaming | callLlmOneShot | — |
| Together | API streaming | callLlmOneShot | — |
| OpenRouter | API streaming | callLlmOneShot | — |
| Cerebras | API streaming | callLlmOneShot | — |
| Cursor | cursor CLI | — | agent --print |
| OpenCode | opencode CLI | — | opencode run --format json |
| Copilot | OAuth HTTP | — | — (HTTP only) |
| Antigravity | OAuth HTTP | — | — (HTTP only) |

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

## 8. Rules for Future Development

1. **Agent-level calls:** Use the agent's `cli_provider` and `api_provider_id` directly. Never use `resolveProvider(db)` without a specific agent context.
2. **System-level calls:** Always use `callLlmOneShotAuto({ db, ... })`. Never call `resolveProvider(db)` directly — it throws when no API provider exists.
3. **CLI fallback is mandatory.** Any new system-level LLM call site must use `callLlmOneShotAuto` to ensure CLI-only environments work.
4. **No duplicate `callViaCliProvider` implementations.** Use the centralized `callViaCliProviderInternal` in `llm-client.ts`.
5. **Prompts in `.md` files only.** Use `loadPrompt("path/name", { vars })`.
