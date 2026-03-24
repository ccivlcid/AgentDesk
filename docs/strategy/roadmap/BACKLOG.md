# AgentDesk — Development Backlog & Priority

> Last updated: 2026-03-28
> Remaining work items after Phase 25 completion. P1~P3 backlog items listed below.

---

## Priority 1: Core Engine (Agent Runtime Completion)

> Completeness of the engine where agents actually operate. Required before open-source release.

### P1-1. Multi-Provider Agent Runtime

**Current State**: `llm-client.ts` only supports Anthropic API. Even when OpenAI/Ollama/Groq etc. are registered in Settings, they cannot be used in Agent Runtime.

**Work**:
- Add OpenAI Chat Completions API streaming + tool use to `llm-client.ts`
- Auto-branch based on provider type (Anthropic → Messages API, others → OpenAI-compatible)
- Auto-support for Ollama/LM Studio/Groq/Together/OpenRouter (OpenAI-compatible API)

**Impact**: Per-agent model selection actually works. "Usable with just an OpenAI key" → removes entry barrier.

**Files**: `server/modules/agent-runtime/llm-client.ts`, `execution-loop.ts`

**Acceptance Criteria**:
- [ ] OpenAI Chat Completions API streaming works end-to-end with tool use in `llm-client.ts`
- [ ] Provider auto-branching correctly routes Anthropic calls to Messages API and all others to OpenAI-compatible API
- [ ] Ollama, LM Studio, Groq, Together, and OpenRouter each complete a basic agent task successfully
- [ ] Per-agent model selection in Settings UI reflects in actual runtime execution
- [ ] No regressions in existing Anthropic API streaming and tool use
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

### P1-2. PM Fitness-Based Agent Assignment — **DONE**

**Status**: Implemented.

**What was done**:
- Replaced round-robin with fitness-scored assignment in both kickoff and add-tasks flows
- Score = successRate - loadPenalty (balances workload across agents)
- LLM now generates `task_type` during kickoff (development/design/analysis/documentation/general)
- Fallback to round-robin when no fitness data exists
- Added project-level PM review: when all tasks done, PM evaluates entire project against goal
- GAPS_FOUND → automatic follow-up task creation via `runInternalAddTasksPipeline()`
- Max 3 review rounds to prevent infinite loops (`pm_oversight_state.project_review_round`)

**Acceptance Criteria**:
- [x] `postMeetingCreateAndRun` uses `agent_task_fitness` data instead of round-robin for agent assignment
- [x] Agents with higher success rates for a given task type are preferred over lower-performing agents
- [x] Fallback to round-robin when no fitness data exists for a task type
- [x] `npx tsc -b --noEmit` produces zero errors

---

### P1-3. Add run_command Tool

**Current State**: Defined in spec but not implemented in `tools.ts`. Currently only 4 tools provided: list_files/read_file/write_file/search_files.

**Work**:
- Add `run_command` tool (shell command execution, 30s timeout)
- Security via allowlist or user confirmation

**Impact**: Agents can execute build/test/lint etc. Enables "real development automation."

**Files**: `server/modules/agent-runtime/tools.ts`

**Acceptance Criteria**:
- [ ] `run_command` tool is registered in `tools.ts` and callable by agents during task execution
- [ ] Command execution enforces a 30-second timeout and returns stderr/stdout to the agent
- [ ] Security allowlist or user confirmation prompt prevents arbitrary dangerous commands
- [ ] Agents can successfully run `npm test`, `tsc`, and `eslint` via the tool in an execution loop
- [ ] Tool result is logged in `agent_runtime_runs` with command and exit code
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

## Priority 2: UI/UX Completion

> Complete existing declared UI components + dashboard.

### P2-1. Reports Window

**Current State**: WindowType `"reports"` is declared. Component exists but data connection unconfirmed.

**Work**:
- Per-project progress (planned/in_progress/done/failed ratios)
- Per-agent utilization + success rate (using agent_task_fitness)
- Token consumption / cost estimation (agent_runtime_runs aggregation)
- Trend charts by period

**Files**: `src/components/windows/ReportsWindow.tsx` (verify/create as needed)

**Depends on**: P1-1 (multi-provider support needed for meaningful token/cost aggregation across providers)

**Acceptance Criteria**:
- [ ] Reports window displays per-project task status breakdown (planned/in_progress/done/failed ratios)
- [ ] Per-agent utilization and success rate charts render correctly using `agent_task_fitness` data
- [ ] Token consumption and cost estimation are aggregated from `agent_runtime_runs` and displayed per project
- [ ] Trend charts show data over configurable time periods (daily/weekly/monthly)
- [ ] Reports window opens via Dock and keyboard shortcut without errors
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

### P2-2. Unused WindowType Cleanup

**Current State**: WindowTypes replaced by modals remain in type declarations.

| WindowType | Status | Action |
|------------|------|------|
| `create-task` | Replaced by CreateTaskModal | Consider removal |
| `create-agent` | Replaced by QuickCreateAgentModal | Consider removal |
| `create-department` | Replaced by modal within Agent Manager | Consider removal |
| `project-create` | Replaced by ProjectCreateModal | Consider removal |
| `llm-guide` | Not implemented, review necessity | Remove or implement |
| `user-guide` | Not implemented, overlaps with KeyboardShortcutsGuide? | Remove or implement |

**Acceptance Criteria**:
- [ ] Each WindowType in the table above is resolved: either removed from the `WindowType` union or implemented as a functional component
- [ ] Removing a WindowType does not leave orphan references in `uiStore.ts`, `Dock.tsx`, or `Desktop.tsx`
- [ ] No dead code paths remain that reference removed WindowTypes
- [ ] If `llm-guide` or `user-guide` are kept, they render meaningful content and are accessible from the UI
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

## Priority 3: Stability + Developer Experience

> Open-source release quality standards.

### P3-1. 1-Minute Install Experience Verification

**Current State**: Runnable via `git clone → pnpm install → pnpm dev`, but lacks API key setup guidance for first-time users.

**Work**:
- First-run onboarding flow (guide to Settings → API tab)
- Path to start immediately with Local LLM without an API key
- Improve error messages ("No API key" → specific guidance)

**Acceptance Criteria**:
- [ ] First-run experience detects missing API keys and displays a guided onboarding flow pointing to Settings > API tab
- [ ] A user with only a local LLM backend (Ollama/LM Studio) can start and use AgentDesk without any API key
- [ ] Error messages for missing API keys include actionable guidance (not generic errors)
- [ ] `git clone && pnpm install && pnpm dev` works on a clean machine with Node >=22 and pnpm installed
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

### P3-2. README Rebranding

**Current State**: "Agent Operating System" positioning is documented in `AgentDesk_OpenSource_Product_Strategy.md` but not reflected in GitHub README.

**Work**:
- Demo GIF/screenshots in README
- Feature list + architecture diagram
- "Agent Operating System for Developers" positioning

**Depends on**: P3-1 (onboarding flow should be finalized before documenting it in README)

**Acceptance Criteria**:
- [ ] README includes a demo GIF or screenshot set showing the desktop OS interface
- [ ] Feature list covers all major capabilities (agent runtime, PM orchestration, multi-provider, Synapse, Image Studio)
- [ ] Architecture diagram is present and matches the current system structure
- [ ] "Agent Operating System for Developers" positioning is clearly stated in the first section
- [ ] Quick start instructions match the actual `git clone && pnpm install && pnpm dev` flow
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

### P3-3. Test Coverage Enhancement

**Current State**: vitest tests exist but Agent Runtime-related tests unconfirmed.

**Work**:
- Agent Runtime execution-loop unit tests
- PM orchestrator event flow tests
- API endpoint integration tests

**Depends on**: P1-1, P1-2, P1-3 (runtime features must be implemented before they can be tested)

**Acceptance Criteria**:
- [ ] Unit tests exist for `execution-loop.ts` covering start, tool invocation, completion, and error paths
- [ ] PM orchestrator tests verify the full event flow: kickoff > meeting > planning > assigning > executing > review > done
- [ ] API integration tests cover all critical endpoints in `server/modules/routes/core/`
- [ ] Test coverage for agent-runtime modules reaches at least 70% line coverage
- [ ] All new tests run successfully in both `pnpm run test:web` and `pnpm run test:api`
- [ ] `npx tsc -b --noEmit` produces zero errors
- [ ] All tests pass (`pnpm test`)

---

## Priority 4: Scalability (Phase 2+)

> Roadmap after open-source release.

### P4-1. PostgreSQL Support

**Current State**: SQLite (better-sqlite3) for single user only.

**Work**: DB abstraction layer + PostgreSQL driver

---

### P4-2. Queue/Worker Architecture

**Current State**: In-process execution. Limited concurrent agent count.

**Work**: Redis/BullMQ-based job queue

---

### P4-3. Team Workspace

**Current State**: Local single-user usage.

**Work**: Multi-user, permission management, shared projects

---

## Completion Status

```
⬚ P1-1  Multi-provider agent runtime — not started
⬚ P1-2  PM fitness-based assignment — not started
⬚ P1-3  run_command tool — not started
⬚ P2-1  Reports dashboard — not started
⬚ P2-2  WindowType cleanup — not started
⬚ P3-1  1-minute install experience — not started
⬚ P3-2  README rebranding — not started
⬚ P3-3  Test coverage enhancement — not started
⏭️ P4-*  Scalability (PostgreSQL, Queue, Team) — after release
```
