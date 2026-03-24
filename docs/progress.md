# AgentDesk — Development Progress

> Last updated: 2026-03-24

---

## Current State
- **Last applied migration**: `2026-03-28-014-pm-oversight-review-round`
- **Latest completed phase**: Phase 25
- **Next work**: See Pending Work below

---

## Active Work

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

**App Runner UX Overhaul:**
- ProjectFolderWindow에서 AI Analysis 탭 제거 (AnalysisTab.tsx 삭제, 430줄)
- 앱/프로젝트 클릭 → 동일하게 ProjectFolderWindow (6탭: Files, Tasks, Agents, Terminal, Details, Git)
- 우클릭 "앱 실행" → AppRunnerWindow (autoRun: AI 자동 분석→설치→실행)
- AppRunnerWindow: 버튼 제거 → 프롬프트 입력 UI로 교체 (항상 표시)
- CreateTaskModal 삭제 (12파일, 3,657줄 dead code 제거)

### Documentation Overhaul (2026-03-24)

- Rebuilt `docs/README.md` as complete index (26 files)
- Translated all 23 Korean docs to English for AI agent readability
- Removed obsolete docs: `VISION-VS-REALITY.md`, `error/log.md`
- Removed orphaned `error/` directory
- Translated docs to English for AI agent readability
- Archived completed specs to `docs/archive/`

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

> Phase specs archived in `docs/archive/roadmap/`.

| Phase | Goal | Status |
|-------|------|--------|
| 1-20 | Core platform (desktop OS, agents, tasks, workflow, CLI, image studio, synapse, local LLM) | Done |
| 21 | PM Agent Orchestration — event-driven, LLM-based review/approve/retry | Done |
| 22 | Debug Experience — AI failure analysis, prompt history, one-click retry | Done |
| 23 | Learning Loop — auto-learn rules/memory, agent fitness, prompt versioning | Done |
| 24 | Stability — DB indexes, graceful shutdown, flood prevention | Done |
| 25 | Feature Extension — prompt UI, agent fitness scoring, i18n foundation | Done |

---

## Pending Work

| Priority | Item | Status |
|----------|------|--------|
| P2 | i18n full migration (2,454 strings, 235 files) | Not Started — see `strategy/I18N-AGENT-WORKPACK.md` |
| P2 | `any` types / double-casts cleanup | Phase 1-2 done, remaining ~1,200 cases |

### Completed (this session)
- Multi-provider agent runtime (Anthropic + OpenAI-compatible)
- `run_command` tool
- PM fitness-based agent assignment
- Project-level PM review (SATISFIED/GAPS_FOUND, max 3 rounds)
- Emoji → SVG violations (all files)
- SVG convention fixes
- Shell injection + memory leak fixes
- App Runner prompt UI + AnalysisTab separation
