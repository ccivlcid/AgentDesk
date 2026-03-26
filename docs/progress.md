# AgentDesk — Development Progress

> Last updated: 2026-03-25 (Phase 26 Developer OS 전환 반영)

---

## Current State
- **Last applied migration**: `2026-03-29-001-drop-removed-features`
- **Latest completed phase**: Phase 26
- **Next work**: See Pending Work below

---

## Active Work

### Phase 26 — Developer OS 전환 (2026-03-25)

> **방향 전환:** "AI Agent OS" → "Developer-focused multi-LLM orchestrator OS"
> 핵심 운영 루프(프로젝트 -> 태스크 -> 실행 -> 리뷰)에 기여하지 않는 기능을 대규모 제거.

**완료:**

| # | Feature | Lines | Status |
|---|---------|-------|--------|
| 1 | Image Studio (텍스트-투-이미지, 인페인팅) | ~2,256 | 완전 제거 완료 |
| 2 | Synapse (Notion/Obsidian 연동) | ~3,307 | 완전 제거 완료 |
| 3 | App Runner (프로젝트 자동 실행) | ~1,248 | 완전 제거 완료 |
| 4 | Wallpaper Picker (배경화면) | ~475 | 완전 제거 완료 |
| 5 | Dashboard (메트릭 대시보드) | ~680 | 완전 제거 완료 |
| 6 | Workflow Builder (플로우 에디터) | ~7,994 | 완전 제거 완료 |
| 7 | Telegram Messenger | — | 완전 제거 완료 |
| 8 | Chat 시스템 (Direct/Group/Announcement/Directive) | ~35,000 | 완전 제거 완료 |
| 9 | Messenger 통합 (Discord/Slack/WhatsApp/Google Chat/Signal/iMessage) | ~34,000 | 완전 제거 완료 |

**제거 총량:** ~85,000줄
**DB 마이그레이션:** `2026-03-29-001-drop-removed-features`

| 10 | PM Activity Panel (RightShelf) 제거 | 완전 제거 완료 -- PM 결정 데이터는 Orchestration Timeline Event Log에서 인라인 표시 |
| 11 | Local LLM 관리 UI + 서버 모듈 제거 | 완전 제거 완료 -- 에이전트 cli_provider "ollama" 실행 경로는 유지 |

| 12 | TaskBoard 코드 완전 제거 | 완전 제거 완료 -- TaskBoardWindow, task-board/, create-task 참조, Dock "tasks" 아이콘, CSS, 관련 아이콘/스토어/컨텍스트메뉴 정리. WindowType "tasks"는 Orchestration Timeline용으로 예약 |
| 13 | Reports 윈도우 UI 완전 제거 | 완전 제거 완료 -- ReportWindow, ReportHistory, ReportsSection, 데스크톱 아이콘, Dock/AppSwitcher/MissionControl "reports" 항목, unreadReportCount/incUnreadReportCount 스토어 상태 제거. 서버 task-reports 라우트 및 TaskReportDetail 타입은 Orchestration Timeline용으로 유지 |

| 14 | Orchestration Timeline Phase 1 구현 | 완료 -- OrchestrationWindow + MetricsHeader + StageRail + TabBar + 4탭 (Timeline/Logs/Agents/Room). Dock 앰버 아이콘 + task badge. WindowType "tasks" 사용 |

---

### Phase 2 — `RuntimeContext` typing (`WorkflowCoreExports` batch 3) (2026-03-25)

- **`WorkflowCoreExports`:** Replaced worktree / project-context / CLI / meeting / one-shot `(...args: any[]) => any` stubs with concrete signatures (`createWorktree`, `mergeWorktree`, `mergeToDevAndCreatePR`, `buildTaskExecutionPrompt`, `injectTaskContext`, `runAgentOneShot`, etc.)
- **Cross-module alignment:** `chooseSafeReply` / `getAgentDisplayName` widened at the context boundary (`kind: string`, `agent: unknown`) with safe handling in `reply-core-tools.ts`; `buildDirectReplyPrompt` returns `Lang` via `isLang` in `meeting-prompt-tools.ts`
- **Consumers:** `planning-archive-tools` uses `AgentRow` from `conversation-types`; `PersonaRoutesCtx` uses typed `runAgentOneShot`; `direct-chat-types` uses `OneShotRunResult` / `OneShotRunOptions`; decision-inbox `AgentOneShotResult` aliases `OneShotRunResult`; `review-consensus-outcome` `getAgentDisplayName` accepts `unknown`
- **Verify:** `./node_modules/.bin/tsc -b --noEmit` OK

### Phase 1 — `any` removal: `execution-control.ts` (2026-03-25)

- **Guide:** `docs/architecture/any-type-removal-guide.md` Phase 1 (quick wins)
- **Changes:** Removed all `any` / `as any` in task inject/stop/resume routes — `Request`/`Response` for CSRF guard, `SQLInputValue[]` for dynamic `UPDATE` bind arrays, untyped `db` casts replaced (call sites match `DbLike` from interrupt + task-execution-meta modules)
- **Types:** Exported `TaskExecutionSession` from `session-review-tools.ts`; `validateInterruptProof` / `buildInterruptProofPayload` use it (map values still `any` at `RuntimeContext` boundary — narrowed at read sites)
- **Verify:** `npx tsc -p tsconfig.node.json --noEmit` OK. `vitest` not run here (rollup `@rollup/rollup-linux-x64-gnu` missing in this environment)

### Phase 2 — `RuntimeContext` typing (batch 2) (2026-03-25)

- **`WorkflowOrchestrationExports`:** Replaced remaining `any` stubs with concrete signatures — `ensureTaskExecutionSession`, `endTaskExecutionSession`, `isTaskWorkflowInterrupted`, `clearTaskWorkflowState`, progress timers, `scheduleNextReviewRound` (uses `Lang`), `notifyClient`, `archivePlanningConsolidatedReport` (async), `isAgentInMeeting`, `startTaskExecutionForAgent` (`AgentRow`), `startPlannedApprovalMeeting`, `handleTaskRunComplete`, `finishReview`
- **Imports:** `AgentRow` from `conversation-types`, `Lang` from `lang.ts` in `runtime-context.ts`
- **`agents/providers.ts`:** `handleTaskRunComplete` forwarder typed (no rest/`any`)
- **`task-delegation.ts`:** `startPlannedApprovalMeeting` callback param `planningNotes` optional to match orchestration
- **`routes/core.ts`:** Kickoff `startTaskExecutionForAgent` shim uses `castSqliteRow<WorkflowAgentRow>` like orchestration
- **Verify:** `npx tsc -b --noEmit` OK

### Phase 2 — `RuntimeContext` typing (batch 1) (2026-03-25)

- **Guide:** `docs/architecture/any-type-removal-guide.md` Phase 2 (gradual context convergence)
- **`appendTaskLog`:** `(taskId: string or null, kind, message) => void` on `WorkflowAgentExports` + `process-tools` implementation (matches auto-update `null` task id)
- **`taskExecutionSessions`:** `Map<string, TaskExecutionSession>` — `runtime-context.ts` imports session type; `orchestration.ts` drops duplicate `TaskExecutionSessionState`; `execution-control` drops redundant casts; test harness builds full `TaskExecutionSession` rows
- **`resolveProjectPath`:** exported `ResolveProjectPathInput` (`string` \| task-like object, `title` allows `null`); `coordination.ts` treats plain string as `project_id` (fixes kickoff `resolveProjectPath(projectId)` semantics); `collab.ts` forwarder typed
- **Verify:** `npx tsc -b --noEmit` OK

### Phase 1 — `any` removal: guide order #2–#13 scan + #4, #5 (2026-03-25)

- **Skipped (already clean):** `report-workflow-tools.ts`, `subtasks.ts`, `subtask-seeding.ts`, `error-analysis.ts`, `worktrees-and-usage.ts`, `subtask-delegation-batch.ts`, `review-consensus-outcome.ts`, `worktree/lifecycle.ts`, `oauth-tools.ts`, `api-provider-tools.ts` — no `as any` / `: any` matches
- **`execution-start-task.ts`:** `notifyTaskStatus` concrete signature; `execAgent: AgentRow` from `conversation-types.ts`; removed `db as any` for rules / interrupt / video / department / consume paths (DB matches module `DbLike` types)
- **`github-routes.ts`:** GitHub REST response interfaces (`GitHubRepoJson`, `GitHubSearchRepositoriesJson`, `GitHubBranchJson`, `GitHubRepoDetailJson`) replace `any` on repo list + branches endpoints
- **Verify:** `npx tsc -b --noEmit` OK

### Bug Fix: App Runner ESM require() crash (2026-03-25) [App Runner: Phase 26에서 제거됨]

- **Root cause:** `app-runner.ts` used 5x `require("node:fs")` / `require("node:child_process")` inside function bodies — fails in ESM mode (`require is not defined`)
- **Symptoms:** (1) `AI description generation failed — llmErr: {}` (directory listing `require` fails inside try-catch), (2) `Unhandled error: require is not defined` (spawn `require` fails outside try-catch)
- **Fix:** Replaced all `require()` calls with top-level ESM `import` statements (`readdirSync` from `fs`, `spawn` from `child_process`)
- **Fix 2:** AutoRun skipped when DB had `app_status='analyzed'` from previous attempt — changed condition to only skip when `running`/`installing`
- **Fix 3:** LLM error logged as empty `{}` — pino only serializes `err` key, changed `llmErr` → `err` with message extraction
- **Fix 4:** AI analysis had no CLI fallback — `resolveProvider()` only checks `api_providers` table, not CLI providers. Added `callViaCliProvider()` fallback matching kickoff.ts pattern
- **Fix 5:** Unified all system-level LLM calls into `callLlmOneShotAuto()` in `llm-client.ts`
  - Auto-detects provider from agent configs: api_provider_id → cli_provider → settings.defaultProvider → "claude"
  - Removed 3x duplicate `callViaCliProvider` from projects.ts, kickoff.ts, app-runner.ts
  - Added cursor + opencode CLI support
  - Key: Agent-level calls (task/chat) were never affected — only system-level calls needed this fix
- **Files changed:** `llm-client.ts`, `app-runner.ts`, `kickoff.ts`, `projects.ts`, `AppRunnerWindow.tsx`
- **Docs rewritten:** `llm-call-patterns.md` (full rewrite), `AGENT-CONFIGURATION-AND-EXECUTION.md` §11, `CLAUDE.md` §0-7

**Documentation Drift Prevention (12 automated checks):**
- Added `scripts/verify-docs-sync.mjs` — 12 checks, 20 doc-vs-code assertions
- Checks: Migration ID, API version, CLI providers, WSEventType, keyboard shortcuts (g-key), TaskStatus, TaskExecutionState, AgentRole, TaskType, WorkflowPackKey, Messenger channels, WindowType (core)
- Integrated into `pnpm lint` (auto-runs after eslint) + standalone `pnpm lint:docs`
- Fixed drift: stale migration ID in archive, missing `g d` shortcut in CLAUDE.md + GLOSSARY.md
- All 20/20 assertions passing

### Bug Fixes & Code Quality (2026-03-24)

**Security & Stability Fixes:**
- Shell injection fix in `agent-runtime/tools.ts` — `searchFiles()` used `execSync` with unescaped shell args; replaced with `execFileSync` array args
- Memory leak fix in `agent-runtime/store.ts` — `seqCounter` Map entries now cleaned up when runs reach terminal state
- App Runner error handlers added — `startRun()`, `/run-app`, `/install-app` all had missing `child.on("error")` handlers causing silent failures
- Install process tracking added — install processes now registered in `runningProcesses` for proper stop/cleanup

**LLM Client Refactoring:**
- Extracted shared `callLlmOneShot()` into `llm-client.ts` with proper system/user prompt separation
- Replaced 4 duplicate one-shot LLM implementations (`projects.ts`, `kickoff.ts`, `pm-orchestrator.ts`, `app-runner.ts`)
- Fixed app-runner AI analysis bug — Anthropic calls were missing `system` field, OpenAI calls had no system message
- Added architecture doc: `docs/architecture/llm-call-patterns.md`

**Emoji → SVG Fixes (Rule 0-1):**
- Fixed 14 files, ~40+ violations replaced with inline SVG:
  - `settings/constants.tsx`, `TaskBoardKanban.tsx`, `HeartbeatBody.tsx`, `utils.ts`
  - `LlmGuideModal.tsx`, `HeartbeatGuideModal.tsx`, `CommandPaletteResults.tsx`, `CliUsagePanel.tsx`
  - `MemoryMemorySection.tsx`, `TeamPageView.tsx`, `ScreenGuidePanel.tsx`, `ExportModal.tsx`
  - `SkillsLibrary.tsx`, `AnomalySection.tsx`
- Previously fixed by other sessions: `TrafficLights.tsx`, `CalloutBox.tsx`, `GenerateTab.tsx`, `GalleryTab.tsx`

**API Response Format Fix (Rule 0-7):**
- `categories.ts` — all endpoints now return `{ ok: true, ... }` format

**PM Fitness-Based Agent Assignment (P1-2):**
- Replaced round-robin with fitness-scored assignment in kickoff + add-tasks
- Queries `agent_task_fitness` table for success rates per task type
- Score = successRate - loadPenalty (balances workload across agents)
- Fallback to round-robin when no fitness data exists
- Both kickoff and add-tasks pipelines updated

**Project-Level PM Review (신규):**
- 모든 태스크 done → PM이 프로젝트 전체를 원래 목표 대비 평가
- SATISFIED → 회고 보고서 + 프로젝트 완료
- GAPS_FOUND → PM gap 분석 → 추가 태스크 자동 생성 (runInternalAddTasksPipeline)
- 최대 3라운드 (pm_oversight_state.project_review_round)
- 프롬프트: `prompts/pm/project-review.md`
- DB 마이그레이션: `2026-03-28-014-pm-oversight-review-round`

**Task Type from LLM:**
- 킥오프 시 LLM이 task_type 지정 (development/design/analysis/documentation/general)
- 프롬프트 업데이트: `prompts/system/project-kickoff.md`
- fitness 사이클 완성: LLM이 타입 지정 → 타입별 fitness 배정 → 완료 시 타입별 기록
- Both `postMeetingCreateAndRun` and add-tasks pipelines updated

**App Runner UX Overhaul:** [App Runner: Phase 26에서 제거됨]
- ProjectFolderWindow에서 AI Analysis 탭 제거 (AnalysisTab.tsx 삭제, 430줄)
- 앱/프로젝트 클릭 → 동일하게 ProjectFolderWindow (6탭: Files, Tasks, Agents, Terminal, Details, Git)
- CreateTaskModal 삭제 (12파일, 3,657줄 dead code 제거)

### Documentation Overhaul (2026-03-24)

- Rebuilt `docs/README.md` as complete index (26 files)
- Translated all 23 Korean docs to English for AI agent readability
- Removed obsolete docs: `VISION-VS-REALITY.md`, `error/log.md`
- Removed orphaned `error/` directory
- Translated docs to English for AI agent readability
- Archived completed specs (later deleted — code is source of truth, git history preserves)

### Coding Rule Audit (2026-03-24)

- Rule 0-1 (emoji): **All fixed** — 60+ violations resolved across 25+ files
- Rule 0-2 (SVG conventions): **Fixed** — hex→currentColor, size style→attr
- Rule 0-3 (`any` types): ~1,200 remaining (Phase 1-2 done)
- Rule 0-7 (no `console.log`): 0 violations — passed

### Skills Installation (2026-03-24)

- Installed 6 agent skills to `.agents/skills/`:
  - `vercel-react-best-practices` (Tier 1)
  - `playwright-best-practices` (Tier 1)
  - `frontend-design` (Tier 1)
  - `vitest` (Tier 2)
  - `web-design-guidelines` (Tier 2)
  - `vercel-composition-patterns` (Tier 2)

---

## Completed Phases

> Phase specs removed (code is source of truth; recoverable from git history).

| Phase | Goal | Status |
|-------|------|--------|
| 1-20 | Core platform (desktop OS, agents, tasks, workflow, CLI) | Done |
| 21 | PM Agent Orchestration — event-driven, LLM-based review/approve/retry | Done |
| 22 | Debug Experience — AI failure analysis, prompt history, one-click retry | Done |
| 23 | Learning Loop — auto-learn rules/memory, agent fitness, prompt versioning | Done |
| 24 | Stability — DB indexes, graceful shutdown, flood prevention | Done |
| 25 | Feature Extension — prompt UI, agent fitness scoring, i18n foundation | Done |
| 26 | Developer OS 전환 — Tier 3 기능 대규모 제거 (~85,000줄) | Done |

> **Note (Phase 1-20):** Image Studio, Synapse, App Runner, Workflow Builder, Dashboard, Wallpaper, Local LLM 관리 UI는 Phase 26에서 제거됨. 코드 이력은 git history에 보존.

---

## Pending Work

| Priority | Item | Status |
|----------|------|--------|
| ~~**P0**~~ | ~~**Orchestration Timeline Phase 2-5**~~ | **Done** — real progress bars (`execution_state`), fitness data, TOKENS/BUDGET API, Task Inspector (click-to-expand), team-board.md feed in RoomTab, execution events in LogsTab |
| ~~**P0**~~ | ~~**Orchestration Timeline Spec Alignment**~~ | **Done** — Timeline: FILES CHANGED + CLI HISTORY + ORCHESTRATION LOGIC in Task Inspector; Logs: ERROR_FIRST_MODE + LEVEL filter + agent error badges + TOKEN_THROUGHPUT/ERR_RATE metrics; Agents: ACTION menu + task_type fitness breakdown + real metrics bar; Room: message type styling + step progress tree + ACTIVE_DEPENDENCIES |
| ~~P1~~ | ~~Execution path consistency~~ | **Done** — 10/10 phases: `resolveProviderForAgent()` unification, PM review parsing + structured logs, context expansion, max-turns fix, Task Inspector, shared .md team communication |
| ~~P1~~ | ~~Document drift prevention~~ | **Done** — `lint:docs` 19/19 pass, API v1.6.5, all version refs synced |
| P2 | i18n full migration (2,454 strings, 235 files) | Not Started — see `strategy/I18N-AGENT-WORKPACK.md` |
| P2 | `any` types / double-casts cleanup | Phase 1-2 done, remaining ~1,200 cases |

### Tier 3 Feature Removal (2026-03-25) — 완료

> 기능 우선순위 분석 (`docs/strategy/FEATURE-PRIORITIZATION-ko.md`) 기반.
> 핵심 운영 루프(프로젝트 -> 태스크 -> 실행 -> 리뷰)에 기여하지 않는 기능 제거.

| # | Feature | Lines | Status |
|---|---------|-------|--------|
| 1 | Wallpaper Picker | ~475 | 완료 |
| 2 | Image Studio | ~2,256 | 완료 |
| 3 | App Runner | ~1,248 | 완료 |
| 4 | Synapse | ~3,307 | 완료 |
| 5 | Dashboard | ~680 | 완료 |
| 6 | Workflow Builder | ~7,994 | 완료 |
| 7 | Telegram Messenger | — | 완료 |
| 8 | Chat 시스템 (Direct/Group/Announcement/Directive) | ~35,000 | 완료 |
| 9 | Messenger 통합 (Discord/Slack/WhatsApp/Google Chat/Signal/iMessage) | ~34,000 | 완료 |

**제거 총량:** ~85,000줄 · **DB 마이그레이션:** `2026-03-29-001-drop-removed-features`

### System Analysis (2026-03-25)

4축 시스템 분석 (`docs/strategy/SYSTEM-PROBLEMS-4-AXIS.md`) 리뷰 결과:
- **Product:** 타겟 유저(다중 AI 에이전트 운영자)는 명확하나, 기능 계층(tier-1/2) 미정립
- **Architecture:** 실행 경로 다양성은 핵심 가치이나, 경로 간 동작 일관성이 부족 (task=API우선, chat=cli_provider 의존)
- **Operations:** 문서 드리프트 실재 확인 (GLOSSARY migration ID 구식)
- **UX:** 데스크톱 메타포 리스크는 단축키/CommandPalette로 상당 부분 해소됨, 과대평가
- **결론:** 기능 추가보다 기존 시스템의 일관성·예측 가능성 강화가 우선

### Completed (this session)
- Multi-provider agent runtime (Anthropic + OpenAI-compatible)
- `run_command` tool
- PM fitness-based agent assignment
- Project-level PM review (SATISFIED/GAPS_FOUND, max 3 rounds)
- Emoji → SVG violations (all files)
- SVG convention fixes
- Shell injection + memory leak fixes
- Phase 26: Developer OS 전환 — Tier 3 기능 대규모 제거 (~85,000줄)
