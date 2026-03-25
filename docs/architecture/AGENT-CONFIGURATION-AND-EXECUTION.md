# Agent Configuration and Execution Architecture (Based on Current Implementation)

> **Purpose:** Consolidate in one place **how agents are stored in the DB and UI**, and **under what conditions which execution engine (CLI / HTTP API / OAuth / built-in runtime)** is selected, **based on actual code**.
> **Purpose:** Consolidate how agents are stored in the DB/UI, and which execution engine is selected. This document focuses on **already-implemented behavior**.

---

## 1. Document Scope

| Included | Excluded (or in other documents) |
|----------|----------------------------------|
| `agents` table fields and runtime branching | Full REST spec → [`../specs/api.md`](../specs/api.md) |
| Task execution `/api/tasks/:id/run` | UI screen details → [`../design/UI-SCREENS.md`](../design/UI-SCREENS.md) |
| Direct chat `scheduleAgentReply` | Product strategy → `strategy/` |
| `agent-runtime` (`startExecutionLoop`) | Full ERD → [`schema-erd.md`](schema-erd.md) |

---

## 2. Agent Data Model

### 2.1 SQLite `agents` Table

Definition: `server/modules/bootstrap/schema/base-schema.ts`

| Column | Meaning |
|--------|---------|
| `id`, `name`, `name_ko` / `name_ja` / `name_zh` | Identifier and display names |
| `department_id` | Associated department (combined with `departments.prompt`, etc.) |
| `workflow_pack_key` | Workflow pack (default `development`, etc.) |
| `role` | `team_leader` \| `senior` \| `junior` \| `intern` |
| `acts_as_planning_leader` | Planning leader role (0/1) |
| `cli_provider` | Execution backend type (see table below) |
| `oauth_account_id` | Linked OAuth row for Copilot / Antigravity |
| `api_provider_id`, `api_model` | Provider row and model for HTTP API execution |
| `cli_model`, `cli_reasoning_level` | Per-CLI model and reasoning (support varies by provider) |
| `persona_id` | Links to `prompts/personas/{id}.md` |
| `avatar_emoji`, `sprite_number` | UI representation |
| `status` | `idle` \| `working` \| `break` \| `offline` |
| `current_task_id` | Currently attached task (when executing) |
| `stats_tasks_done`, `stats_xp` | Statistics |

### 2.2 `cli_provider` Allowed Values

Aligned with schema CHECK and frontend `CliProvider` type (`src/types/index.ts`):

`claude` · `codex` · `gemini` · `opencode` · `copilot` · `antigravity` · `cursor` · `api` · `ollama`

### 2.3 Normalization on PATCH (Configuration Change Rules)

Key points from `server/modules/routes/core/agents/patch-body.ts` (`prepareAgentPatchBody`):

- When `cli_provider` changes, OAuth/API/CLI model fields are **initialized/validated to match the provider**.
- If not `api`, `api_provider_id` / `api_model` may be cleared.
- `copilot` → only `github` OAuth accounts allowed, `antigravity` → only `google_antigravity` OAuth accounts allowed.

---

## 3. Execution Engine Selection Logic (Core)

An agent is **a single entity**, but **different modules** are invoked depending on the **entry point (task vs. chat vs. agent-runtime)**.

### 3.1 Task Execution: `POST /api/tasks/:id/run`

File: `server/modules/routes/core/tasks/execution-run.ts`

**Provider Determination (Important):**

```text
If api_provider_id is set    → provider = "api"  (regardless of cli_provider value)
Otherwise                    → provider = cli_provider || "claude"
```

In other words, **if an API Provider is attached to the agent, tasks always go through the HTTP API path**.

Supported provider strings (task): `claude`, `codex`, `gemini`, `opencode`, `copilot`, `antigravity`, `api`.

### 3.2 Direct (1:1) Chat: `scheduleAgentReply`

File: `server/modules/routes/collab/direct-chat-handlers.ts` → `server/modules/routes/collab/direct-chat-runtime-reply.ts` (`runDirectReplyExecution`)

Branching summary:

| Condition | Behavior |
|-----------|----------|
| `cli_provider === "api"` and `api_provider_id` exists | `executeApiProviderAgent` — streaming, `chat_stream` events |
| `cli_provider` is `copilot` / `antigravity` | OAuth HTTP agent, streaming |
| Otherwise (e.g., `claude`) | `runAgentOneShot` — local CLI `spawn` |

**Difference from tasks:** In chat, if only `api_provider_id` is set but `cli_provider` is not `api`, **it may take the CLI path** (which can be inconsistent with the task's "API-first enforcement").

### 3.3 Agent Runtime (Built-in LLM + Tool Loop)

File: `server/modules/agent-runtime/execution-loop.ts` (`startExecutionLoop`)

- Anthropic API calls + **tool loop** based on `server/modules/agent-runtime/tools.ts`.
- Entry examples:
  - `POST /api/agent-runtime/run` — `server/modules/agent-runtime/routes.ts`
  - Auto-execution of first task after project kickoff — `server/modules/routes/core/projects/kickoff.ts`

**This is a separate code path from the main task run (`execution-run`)**, so it is NOT the case that "everything always uses CLI" or "everything always uses agent-runtime".

### 3.4 Agent Assignment Logic

**Kickoff / Add-Tasks** (`kickoff.ts`):
- Agents are selected from `project_agents` table (only agents assigned to the project)
- PM agents (`project_role = 'pm'`) are excluded from task assignment
- **Fitness-based scoring**: queries `agent_task_fitness` table for success rate per `task_type`
- Score = `successRate - (currentLoad * 0.1)` — balances quality and workload
- Falls back to **round-robin** when no fitness data exists for a task type
- LLM generates `task_type` during kickoff (development/design/analysis/documentation/general)

**Auto-Assignment on Run** (`execution-run.ts`):
- If task has no `assigned_agent_id`, `selectAutoAssignableAgentForTask()` picks one
- Respects `project_agents` constraint

### 3.5 Project-Level PM Review

After all tasks in a project reach "done" status:
1. `pmProjectLevelReview()` in `pm-orchestrator.ts` evaluates entire project against original goal
2. **SATISFIED** → retrospective report + project complete
3. **GAPS_FOUND** → PM's gap analysis fed to `runInternalAddTasksPipeline()` as `additionalDirective`
4. New tasks created, assigned (fitness-based), and executed
5. Cycle repeats until SATISFIED or max **3 rounds** (`pm_oversight_state.project_review_round`)

---

## 4. Task Execution Pipeline (Detailed)

### 4.1 Common Preprocessing

- Look up assigned agent, check `agent_busy` (`current_task_id` + `activeProcesses`).
- **Worktree** creation and isolation (`createWorktree`) — blocks execution on failure.
- Prompt assembly: department, task continuation context, skills, rules, memory, **character persona**, etc. (`execution-start-task.ts`, etc.).

### 4.2 `provider === "api"`

- `launchApiProviderAgent` → `server/modules/workflow/agents/providers/api-provider-tools.ts`
- Request body is **text completion** oriented (Anthropic `messages`, OpenAI-compatible `chat/completions`, etc.).
- **A separate `tools` array (web search, etc.) is generally not attached in this path** (common to both direct chat and tasks).

### 4.3 `provider === "claude"` etc. (CLI)

- `spawnCliAgent` + `buildAgentArgs` from `server/modules/workflow/core/cli-tools.ts`
- Claude example: `--print`, `--output-format=stream-json`, `--dangerously-skip-permissions`, etc.
- For one-shot calls (`noTools: true`) such as meetings or simple responses, tools are disabled with `--tools=`.

### 4.4 `copilot` / `antigravity`

- **HTTP-based** execution (`launchHttpAgent` family), not PTY.

### 4.5 Agent/Task State

- On execution start: `agents.status = 'working'`, `current_task_id` updated, `task_update` / `agent_status` broadcast.

---

## 5. Direct Chat Pipeline (Detailed)

### 5.1 Trigger

- After the client saves a message via `POST /api/messages` etc., `scheduleAgentReply` is called for the receiving agent (`chat-routes.ts`, etc.).

### 5.2 Intent/Branching (High Level)

`direct-chat-handlers.ts`:

- Offline → immediate informational message.
- Waiting for project binding → state machine processing via follow-up message.
- Message classified as a task → `runTaskFlowWithResolvedProject`.
- Otherwise → `runDirectReplyExecution`.

### 5.3 Delay

`direct-chat-runtime-reply.ts`: At the start of `runDirectReplyExecution`, an intentional **~1–3 second** `setTimeout` delay.

### 5.4 On CLI Failure

- When `runAgentOneShot` **rejects**, in the past it could result in only a log with no user message → current implementation has improved with try/catch delivering `buildCliFailureMessage`, etc. (verify based on code at time of implementation).

---

## 6. Persona/Prompt Files

`server/modules/workflow/core/character-persona.ts`

| Priority | Source |
|----------|--------|
| 1 (Primary) | `prompts/agents/{agentId}.md` |
| 2 (Base) | `prompts/personas/{personaId}.md` |

If an agent-specific `.md` exists, it becomes the main body; the `persona_id` file may be prepended as `[Base Persona]`.

---

## 7. One-Shot Execution `runAgentOneShot`

File: `server/modules/workflow/core/one-shot-runner.ts`

- Used for meeting remarks, project type inference, persona auto-comments, **direct chat CLI path**, etc.
- If `provider === "api"`, calls `executeApiProviderAgent`.
- Otherwise, `buildAgentArgs` + `child_process.spawn` (platform differences on Windows such as `shell: true`).

---

## 8. Frontend Types/Display

- The `Agent` interface in `src/types/index.ts` corresponds to API responses.
- Group chat message headers display the sender using a combination of `sender_id` / `sender_name` / `sender_agent` (`GroupChatMessageList.tsx`, etc.).

---

## 9. WebSocket Events (Execution Observation)

Representative types (throughout the code):

- `cli_output` — Stream on task subscription (direct chat API stream uses separate `chat_stream`, etc.).
- `task_update`, `agent_status` — Board and agent state.
- `new_message` — Broadcast after message save.

---

## 10. Related Source File Index

| Area | Path |
|------|------|
| Schema | `server/modules/bootstrap/schema/base-schema.ts` |
| Agent PATCH | `server/modules/routes/core/agents/patch-body.ts`, `register-agent-routes-*.ts` |
| Task execution | `server/modules/routes/core/tasks/execution-run.ts`, `execution-start-task.ts` |
| Direct chat | `server/modules/routes/collab/direct-chat-handlers.ts`, `direct-chat-runtime-reply.ts` |
| CLI arguments | `server/modules/workflow/core/cli-tools.ts` |
| One-shot | `server/modules/workflow/core/one-shot-runner.ts` |
| API Provider HTTP | `server/modules/workflow/agents/providers/api-provider-tools.ts` |
| Built-in runtime | `server/modules/agent-runtime/execution-loop.ts`, `routes.ts` |
| Runtime prompt | `prompts/system/agent-runtime.md` (system prompt with evidence-based rules) |
| App analysis | `prompts/system/project-analysis.md` + `prompts/system/app-analysis-system.md` |
| Persona | `server/modules/workflow/core/character-persona.ts`, `prompts/agents/`, `prompts/personas/` |
| Direct prompt text | `server/modules/workflow/core/meeting-prompt-tools.ts` (`buildDirectReplyPrompt`) |
| Safe reply processing | `server/modules/workflow/core/reply-core-tools.ts` (`chooseSafeReply`) |

---

## 11. System-Level vs Agent-Level LLM Calls

> **IMPORTANT:** There are two distinct call types. Confusing them causes bugs.

### Agent-Level (task execution, direct chat)

Each agent's `cli_provider` + `api_provider_id` determines execution. No system-wide provider lookup needed. **Never fails due to missing `api_providers` table entries.**

### System-Level (kickoff, auto-assign, app-runner AI analysis)

Uses `callLlmOneShotAuto()` from `llm-client.ts`. Auto-detects best provider:

1. Agent with `api_provider_id` → API HTTP call
2. Agent with `cli_provider` (claude/codex/gemini/cursor/opencode) → CLI `--print`
3. `settings.defaultProvider` → CLI fallback
4. `"claude"` → ultimate fallback

**Never call `resolveProvider(db)` directly for system-level tasks** — it throws when no API provider exists. Always use `callLlmOneShotAuto`.

See `docs/architecture/llm-call-patterns.md` for full details.

---

## 12. Design Inconsistency Points to Note

1. **Tasks always use API if `api_provider_id` is set** — Chat is more dependent on `cli_provider`.
2. **Main task run** and **agent-runtime** are different stacks (the latter is a server-side built-in tool loop).
3. **The API Provider path** is a general-purpose streaming completion, so **web search tool auto-attachment is not included by default**.
4. **PM Orchestrator** uses `callProviderCompat()` (not yet migrated to `callLlmOneShotAuto`) — requires API provider or uses `runAgentOneShot` for agent-level calls.

---

## 13. Change History

| Date | Content |
|------|---------|
| 2026-03-16 | Initial draft — consolidated based on current code |
| 2026-03-25 | Added §11 System-Level vs Agent-Level distinction. Updated §12 inconsistency notes. |

---

*It is recommended to update this document whenever the implementation changes.*
