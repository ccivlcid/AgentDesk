# CLAUDE.md — AgentDesk Developer Guide

> This file is read by AI agents (Claude Code, Cursor, Copilot, etc.) when they first open this repo.
> For detailed specs, refer to the linked documents.

---

## 0. Coding Rules (Strict — Must Follow)

> These rules are non-negotiable. Every AI agent and contributor must follow them exactly.

### 0-1. No Emoji in UI Components

**NEVER** use emoji characters in JSX/TSX UI code. All icons must be inline SVG.

```tsx
// ❌ WRONG
<span>🤖</span>
<button>Load ▾</button>
<span>✓</span>
<p>⚠ 에러</p>

// ✅ CORRECT
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">...</svg>
```

**Allowed exceptions:**
- Data values stored in the DB (e.g. `agent.avatar_emoji`, `category.icon`) — but these **must** be rendered through a SVG map with emoji→SVG lookup; raw emoji text is the fallback of last resort only.
- User-visible plain text content (e.g. document titles).

### 0-2. SVG Icon Conventions

All inline SVG icons must follow this standard:

```tsx
<svg
  width="16"        // always explicit px size
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"  // use CSS color inheritance
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  ...
</svg>
```

- Size: 16×16 (or 14×14 for tight spaces, 18×18 for larger contexts). Never use `1rem`/`1em` sizes.
- Color: always `stroke="currentColor"` so parent color applies. Use `fill="currentColor"` only for filled shapes.
- No hardcoded hex colors inside SVG — use `currentColor` + parent `style={{ color: "..." }}`.
- No emoji unicode inside SVG `<text>` elements.

### 0-3. TypeScript — Zero Tolerance

- Run `npx tsc -b --noEmit` after every code change. **Zero errors required** before task is complete.
- Never use `any` unless wrapping a third-party boundary that has no types. Document with a comment.
- Never use type assertions (`as Foo`) to silence errors — fix the root type instead.
- Unused imports must be removed immediately.

### 0-4. No New Files Without Clear Justification

- Prefer editing existing files over creating new ones.
- New component files require: >300 lines OR reused in 2+ places OR clearly separate concern.
- Do NOT create `utils.ts`, `helpers.ts`, or `constants.ts` barrel files for one-off functions.

### 0-5. DB Migrations — Append Only

- **NEVER** edit or delete an existing migration entry.
- Always append at the end of `migrations-e-recent.ts`.
- ID format: `YYYY-MM-DD-NNN-short-description` (chronological, zero-padded).
- **Last applied ID**: `2026-03-29-011-agent-llm-distribution`
- Every DDL must be wrapped in `try { ... } catch { /* already exists */ }`.

### 0-6. Component State Rules

- No `useState` for data that belongs in a Zustand store (tasks, agents, projects, UI open-state).
- `useCallback`/`useMemo` only when the dependency is genuinely expensive or causes referential instability. Don't wrap every function.
- Modal/overlay state (open/close) lives in `uiStore` if it needs to be triggered from multiple places.

### 0-7. API + Server Rules

- All new Express routes go in the relevant sub-router under `server/modules/routes/`. Never add routes directly in `server/index.ts`.
- Every new endpoint must be documented in `docs/specs/api.md` (bump the patch version).
- Server responses: always `res.json({ ok: true, ... })` for success, `res.status(4xx).json({ error: "snake_case_code" })` for errors.
- No `console.log` in server code — use the pino logger.
- **System-level LLM calls MUST use `callLlmOneShotAuto()`** from `llm-client.ts`. Never call `resolveProvider(db)` directly for system tasks (kickoff, auto-assign, app-runner) — it throws when no API provider exists. `callLlmOneShotAuto` auto-detects the best provider from agent configs (api_provider_id → CLI provider → settings.defaultProvider → claude). See `docs/architecture/llm-call-patterns.md`.

---

### 0-8. Verification — Every Change

> **MUST run after every code change. No exceptions.**

```bash
npx tsc -b --noEmit    # TypeScript — zero errors
pnpm test              # Tests — all passing
pnpm lint              # Lint — no warnings
```

If any fails, fix before moving to the next task. Never leave broken builds.

### 0-9. Removed Features — Do Not Reintroduce

> The following features have been permanently removed. Do NOT reintroduce them.

**Removed:** Cross-Dept Cooperation, Video system, Report Workflow, non-dev Workflow Packs (novel, roleplay, asset_management, video_preprod, web_research_report), Announcement Response, non-dev departments (research, investment, video, data, marketing, content).

### 0-10. Dual Interface Rules

> AgentDesk has two interfaces. Respect the audience for each.

| Interface | Audience | Tech |
|-----------|----------|------|
| **GUI** (localhost:8800) | Non-developers (PM, designers, managers) | React + Vite |
| **TUI** (terminal `agentdesk`) | Developers | ink (React CLI) |
| **CLI** (terminal `agentdesk <cmd>`) | Developers | commander.js |

- GUI and TUI share the **same server** (localhost:8790), **same API**, **same DB**.
- GUI code lives in `src/`. TUI/CLI code lives in `cli/`.
- Shared types live in `shared/` (when created). Do NOT duplicate type definitions.
- Server changes must work for both GUI and TUI clients.

---

## 1. Project Summary

**AgentDesk** = Multi-LLM orchestrator for software development.
Two audiences: GUI for non-developers, TUI for developers. Same server, same data.
Electron + React(Vite) frontend + Express/tsx backend + SQLite(better-sqlite3) + ink TUI.

See `docs/architecture/FULLSTACK-ARCHITECTURE.md` for full architecture.

### 1-1. Terminology Mapping (DB ↔ UI)

> **IMPORTANT:** The DB schema uses legacy names that differ from what users see in the UI.
> When modifying code, always use the **DB name** in code but the **UI name** in user-facing text.

| DB / Code Name | UI Display Name (ko) | UI Display Name (en) | Notes |
|---------------|---------------------|---------------------|-------|
| `departments` table | 전문 분야 | Specialty Area | NOT "부서". Agents are grouped by expertise, not org structure |
| `department_id` column | 전문 분야 | Specialty Area | Same — label only, schema unchanged |
| `agents.role` = `team_leader` | PM | PM | Project Manager — orchestrates, doesn't code |
| `agents.role` = `senior` | 시니어 | Senior | Independent execution |
| `agents.role` = `junior` | 주니어 | Junior | Guided execution |
| `agents.role` = `intern` | *(removed)* | *(removed)* | No longer used in UI |

**Why not rename the DB?** The `departments` table is deeply referenced across 50+ files. Renaming would require a massive migration with high risk and zero user benefit. Instead, we keep the DB name and map to the correct UI label everywhere via `t()`.

### 1-2. Architecture Philosophy

- **PM Orchestrator** — PM agent plans, assigns, and reviews. Never executes tasks directly. PM은 프로젝트 책임자.
- **Evidence-based execution** — Agents must cite file/line, no speculation. 3-strike escalation on failure.
- **Review checklist** — PM reviews with structured 4-point checklist (scope match, errors, minimal scope, completeness).
- **Ship automation** — Task done → version bump → changelog entry → file sync.

### 1-2-1. PM 검토 → 완료 플로우 (중요)

> **모든 업무는 PM 에이전트의 LLM 검토를 거쳐야 완료됩니다.**
> 수동으로 "done"을 설정해도 PM이 있는 프로젝트에서는 자동으로 "review"로 전환됩니다.

#### 개별 태스크 검토

```
업무 실행 완료 → status: "review"
    │
    ▼
PM 에이전트가 LLM으로 검토 (prompts/pm/review-task.md)
    │  4-point checklist: scope match, errors, minimal scope, completeness
    │
    ├── 승인 (APPROVE) ──────────────────────────────┐
    │                                                  ▼
    │                              1. finishReview → status: "done"
    │                              2. PM이 LLM으로 검증 + progress.md 작성
    │                                 (prompts/pm/write-progress.md)
    │                              3. shipAutomation: 버전 범프 + CHANGELOG
    │                              4. 다음 태스크 시작 (pmStartNextTask)
    │
    └── 수정 요청 (REVISE) ──────────────────────────┐
                                                      ▼
                                   1. status: "planned" 으로 되돌림
                                   2. 에이전트에게 PM 피드백 전달
                                   3. 에이전트 재실행
```

#### 프로젝트 레벨 리뷰 (모든 태스크 완료 후)

> **모든 태스크가 done이 되면, PM이 프로젝트 전체를 목표 대비 평가합니다.**
> 부족한 부분이 있으면 추가 태스크를 자동 생성하여 다시 실행합니다. (최대 3라운드)

```
모든 태스크 done → pmProjectLevelReview()
    │
    ▼
PM이 LLM으로 프로젝트 전체 평가 (prompts/pm/project-review.md)
    │  평가 기준: Goal Coverage, Critical Gaps, Integration
    │  라운드 N / 최대 3라운드 표시
    │
    ├── SATISFIED ───────────────────────────────────┐
    │                                                 ▼
    │                              1. 회고 보고서(retrospective) 생성
    │                              2. pm_oversight_state 삭제 → 프로젝트 완료
    │                              3. 알림: "Project completed"
    │
    └── GAPS_FOUND ─────────────────────────────────┐
                                                     ▼
                                  1. PM의 gap 분석 → additionalDirective
                                  2. runInternalAddTasksPipeline() 호출
                                     → LLM 태스크 생성 (task_type 포함)
                                     → fitness 기반 에이전트 배정
                                     → 실행 시작
                                  3. 새 태스크 완료 → 다시 프로젝트 리뷰
                                  4. 최대 3라운드 → 초과 시 자동 완료
```

**무한 루프 방지**: `pm_oversight_state.project_review_round` 카운터 (DB 저장, 최대 3).

**progress.md 작성 구조** (PM이 LLM으로 생성):
- 검증 결과: 달성/부분달성/미달성 + 사유
- 담당 에이전트명
- 핵심 변경 사항
- PM 소견 (품질 평가, 누락 사항, 후속 작업 필요 여부)

**Key files:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — PM 검토/승인/progress 작성 + 프로젝트 레벨 리뷰
- `server/modules/workflow/orchestration/review-finalize-tools/ship-automation.ts` — 버전 범프/CHANGELOG
- `server/modules/routes/core/projects/kickoff.ts` — `runInternalAddTasksPipeline()` (프로젝트 리뷰 후 추가 태스크)
- `prompts/system/agent-runtime.md` — 에이전트 런타임 시스템 프롬프트 ({{agentName}}, {{agentRole}} + evidence-based rules)
- `prompts/system/project-kickoff.md` — 킥오프 태스크 생성 프롬프트 (task_type 포함)
- `prompts/system/project-analysis.md` — 앱 분석 사용자 프롬프트 (---JSON--- separator)
- `prompts/system/app-analysis-system.md` — 앱 분석 시스템 프롬프트
- `prompts/pm/review-task.md` — 개별 태스크 검토 프롬프트
- `prompts/pm/project-review.md` — 프로젝트 레벨 리뷰 프롬프트 (SATISFIED/GAPS_FOUND)
- `prompts/pm/handle-failure.md` — 실패 처리 프롬프트
- `prompts/pm/auto-learn.md` — 자동 학습 프롬프트
- `prompts/pm/write-progress.md` — PM progress.md 작성 프롬프트 (ko/en/ja/zh)

### 1-2-2. YOLO(자율) 모드

> **YOLO 모드 = PM 에이전트에게 모든 통제권을 위임하는 모드.**
> PM이 LLM 리뷰를 스킵하는 것이 **아님**. PM이 리뷰하고, 승인/수정을 자동으로 결정한다.

| 항목 | 일반 모드 | YOLO 모드 |
|------|-----------|-----------|
| PM LLM 리뷰 | 수행 | **수행 (동일)** |
| PM 승인/수정 결정 | PM이 결정 | **PM이 결정 (동일)** |
| 사용자 의사결정 창 | 활성화 (승인/보류/취소) | **비활성화** |
| `bypassProjectDecisionGate` | `false` | `true` |
| progress.md 작성 | PM이 LLM으로 작성 | **PM이 LLM으로 작성 (동일)** |

**핵심 차이**: YOLO 모드에서는 사용자가 승인/보류/취소를 할 수 없다. PM이 알아서 결정한다.

### 1-3. Kickoff Pipeline (킥오프 → 업무 실행 흐름)

> **IMPORTANT:** This is the canonical execution flow. All kickoff-related code must follow this order.

```
[1] 킥오프 시작 (POST /api/projects/:id/kickoff)
     │
     ▼
[2] 킥오프 회의 (runKickoffMeeting)                    ← stage: "meeting"
     │  PM이 프로젝트 목표 공유
     │  각 에이전트가 역량 보고
     │  PM이 태스크 생성·배정 예고
     │
     ▼
[3] 태스크 생성 (LLM 호출)                              ← stage: "planning"
     │  callLlmOneShot() 또는 callViaCliProvider()
     │  JSON 파싱 → tasks INSERT (assigned_agent_id = NULL, task_type = LLM 지정)
     │
     ▼
[4] PM 에이전트 배정                                    ← stage: "assigning"
     │  fitness 기반 배정 (agent_task_fitness 테이블 조회)
     │  fitness 데이터 없으면 round-robin fallback
     │  PM 에이전트는 배정 대상에서 제외
     │  appendTaskLog("pm_oversight", "PM assigned → {agent} [fitness/round-robin]")
     │
     ▼
[5] 업무 실행                                           ← stage: "executing"
     │  startTaskExecutionForAgent() 또는 startExecutionLoop()
     │  에이전트별 첫 번째 planned 태스크만 시작
     │
     ▼
[6] 개별 태스크 실행 → PM 리뷰 → done    (§1-2-1 참조)
     │
     ▼
[7] 모든 태스크 done → PM 프로젝트 리뷰  (§1-2-1 참조)
     │  SATISFIED → 프로젝트 완료
     │  GAPS_FOUND → 추가 태스크 생성 → [4]로 돌아감 (최대 3라운드)
     │
     ▼
[8] 완료                                                ← stage: "done"
```

**Key files:**
- `server/modules/routes/core/projects/kickoff.ts` — 전체 파이프라인 + `runInternalAddTasksPipeline()`
- `src/components/desktop/Desktop.tsx` — `KickoffStageOverlay` (4-step UI)
- `src/store/uiStore.ts` — `kickoffStage` state
- `src/app/useRealtimeSync.ts` — `kickoff_stage` WebSocket listener

**Rules:**
- 회의가 **반드시 먼저**. 태스크 생성은 회의 완료 콜백(`postMeetingCreateAndRun`) 안에서 실행.
- PM 에이전트에게 태스크 배정 금지. `project_role !== "pm"` 필터 적용.
- 회의록은 `meeting_minutes` 테이블에 `project_id` 포함하여 저장. `task_id`는 NULL 허용.
- 킥오프 실패 시에도 `postMeetingCreateAndRun()` 실행 (안전장치).
- 킥오프 프롬프트(`prompts/system/project-kickoff.md`)에서 `agent_name` 필드 없음 — 배정은 PM이 함. `task_type` 필드는 LLM이 지정.
- task_logs/messages INSERT 시 `project_id` 자동 스탬프 (SQLite AFTER INSERT 트리거).
- YOLO(자율) 모드: PM에게 모든 통제권 위임. PM이 LLM으로 리뷰 + 자동 결정. 의사결정 창 비활성화. (상세: §1-2-2)
- 프로젝트 레벨 리뷰: 모든 태스크 done → PM이 전체 목표 대비 평가 → 부족하면 추가 태스크 생성 (최대 3라운드). (상세: §1-2-1)
- Fitness 기반 배정: `agent_task_fitness` 테이블의 성공률로 최적 에이전트 선택. 데이터 없으면 round-robin fallback.

### 1-4. Add Tasks Pipeline (추가 업무 흐름)

> 기존 프로젝트에 추가 태스크를 넣는 흐름. 킥오프와 유사하되 짧은 회의.

```
[1] 추가 업무 요청 (POST /api/projects/:id/add-tasks)
     │  additional_directive + attached_file (optional .md)
     │
     ▼
[2] 추가 업무 회의 (runAddTasksMeeting)              ← stage: "meeting"
     │  PM이 추가 지시 공유, 에이전트 확인 (짧은 회의)
     │  첨부 파일 → {project_path}/docs/ 저장
     │
     ▼
[3] 태스크 생성 (LLM) + 기존 done 태스크 컨텍스트    ← stage: "planning"
     │
     ▼
[4] PM 배정 + 실행                                   ← stage: "assigning" → "executing" → "done"
```

**UI:**
- 업무보드: 태스크 전부 done → "추가 업무" 버튼 (인라인 입력 + .md 첨부)
- 킥오프 버튼: 태스크 0개일 때만 표시

---

## 2. Key Commands

```bash
# Dev server (frontend 8800, API 8790)
pnpm dev

# TUI (developer interface — requires server running)
pnpm cli                    # TUI mode (interactive)
pnpm cli status             # CLI mode (quick command)
pnpm cli kickoff --name "My Project" --goal "Build auth" --yolo

# Or directly with tsx
npx tsx cli/index.ts         # TUI mode
npx tsx cli/index.ts status  # CLI mode

# Tests
pnpm test              # frontend + server (all)
pnpm run test:web      # frontend only (vitest)
pnpm run test:api      # server only (vitest)

# Type check
tsc -b

# Lint
pnpm lint
pnpm lint:fix

# Build
pnpm build
```

---

## 3. Core File Map

**UI structure:** No sidebar. macOS desktop OS — menu bar + desktop icons + Dock + app windows.

```
src/
├── App.tsx                      ← Root: store subscriptions + WebSocket connection
├── components/
│   ├── desktop/
│   │   ├── Desktop.tsx          ← Desktop root (shortcuts · jiggle · QuickLook · MissionControl)
│   │   ├── MenuBar.tsx          ← Top menu bar (logo · app menu · project · cost · notifications · clock)
│   │   ├── DesktopIcon.tsx      ← Desktop icons (drag · jiggle · ✕ delete badge · inline rename)
│   │   ├── FolderDesktopIcon.tsx ← Project folder icons (drag · drop · context menu)
│   │   ├── Dock.tsx             ← Bottom Dock (+ popup menu · Orchestration · Library · Settings)
│   │   ├── QuickLook.tsx        ← Project quick-preview panel (Space key)
│   │   └── MissionControl.tsx   ← All windows overview (Ctrl+↑)
│   ├── orchestration/           ← Orchestration Timeline (WindowType "tasks"):
│   │   ├── OrchestrationWindow.tsx  ← Main window (AppWindow wrapper)
│   │   ├── MetricsHeader.tsx        ← TOKENS/BUDGET/AGENTS metrics bar
│   │   ├── StageRail.tsx            ← Left sidebar pipeline stages (Meeting→Review)
│   │   ├── TabBar.tsx               ← Bottom 4-tab bar (keyboard 0-3 switching)
│   │   └── tabs/                    ← TimelineTab, LogsTab, AgentsTab, RoomTab
│   ├── windows/                 ← App windows:
│   │                               LibraryWindow, SettingsWindow,
│   │                               AgentManagerWindow, FolderWindow, CliWindow (Agent CLI)
│   ├── agent-detail/            ← AgentDetailPanel (right-slide inspector · 4 tabs)
│   ├── export/                  ← ExportModal (triggered from AgentDesk app menu)
│   └── settings/                ← Settings window tabs
├── app/
│   ├── types.ts                 ← WindowType: "library"|"settings"|"agent-manager"
│   │                                           |"cli"|"tasks"
│   └── AppOverlays.tsx          ← Modal/overlay collection
├── store/
│   ├── agentStore.ts            ← agents, departments
│   ├── taskStore.ts             ← tasks, subtasks
│   ├── projectStore.ts          ← projects, categories
│   └── uiStore.ts               ← openWindows(Set), desktopIconLayout, jiggleMode, missionControlOpen
└── types/index.ts               ← Agent, Task, SubAgent and other domain types

server/
├── index.ts                     ← Server entry point
├── lib/logger.ts                ← pino logger (note: import path depth varies by file location)
├── db/runtime.ts                ← DB connection + env variable constants
├── modules/
│   ├── lifecycle.ts             ← Service start/stop hooks
│   ├── routes/core.ts           ← REST API route registration
│   ├── routes/ops/agent-performance.ts    ← GET /api/agents/performance
│   ├── routes/ops/data-export.ts          ← GET /api/export (CSV/JSON download)
│   ├── routes/ops/filesystem.ts           ← Filesystem API (project file save)
│   └── workflow/                ← Task execution engine
│       ├── cron-utils.ts        ← 5-field cron parser (no external deps)
│       └── workflow-scheduler.ts ← Cron scheduler daemon (60s tick)
└── ws/hub.ts                    ← WebSocket broadcast hub
```

---

## 4. Adding UI Elements

### 4-1. Add a new desktop icon

| # | File | Action |
|---|------|--------|
| 1 | Window/modal component | Create under `src/components/windows/` |
| 2 | `src/components/desktop/Desktop.tsx` | Add icon entry (label, icon, onClick) |
| 3 | `src/store/uiStore.ts` | Add window open action |

### 4-2. Add a tab to a Dock app window

| # | File | Action |
|---|------|--------|
| 1 | Tab component | Create under `src/components/` |
| 2 | Corresponding window file | `src/components/windows/` → add to tabs array |

### 4-3. Add a new Dock app

| # | File | Action |
|---|------|--------|
| 1 | `src/app/types.ts` | Add new value to `WindowType` union |
| 2 | `src/store/uiStore.ts` | Update `openWindows` toggle action |
| 3 | `src/components/desktop/Dock.tsx` | Add Dock icon |
| 4 | `src/components/windows/` | Create app window component |
| 5 | `src/components/desktop/Desktop.tsx` | Add window render block |

To pass data: use `Zustand store → uiStore.openWindows` chain.

---

## 4-5. macOS UX Features

| Feature | Entry Point | Implementation |
|---------|-------------|----------------|
| **Spotlight Search** | `Ctrl+Shift+K` or `Cmd+K` | `CommandPalette.tsx` (640px centered, 🔍 icon) |
| **Jiggle Mode** | 600ms long-press on empty desktop | `Desktop.tsx` + `DesktopIcon.tsx` |
| **Quick Look** | Select project + `Space` or right-click → Quick Preview | `QuickLook.tsx` |
| **Mission Control** | `Ctrl+↑` or AgentDesk menu | `MissionControl.tsx` |
| **Notification Slide Panel** | Bell icon click | `NotificationCenter.tsx` (320px right slide) |
| **App Menu** | Click "AgentDesk" text | `MenuBar.tsx` (shortcuts / Mission Control) |

---

## 5. Adding a New API Endpoint

1. Add route to `server/modules/routes/core.ts` or the relevant sub-router
2. Add endpoint documentation to `docs/specs/api.md` (bump version)
3. Add the fetch function in `src/` that calls it

---

## 6. Common Mistakes & Gotchas

### logger import path depth
When importing `server/lib/logger.ts`, the number of `../` varies by file depth:

```
server/ws/hub.ts                            → "../lib/logger"          (1 level)
server/modules/lifecycle.ts                  → "../lib/logger"          (1 level)
server/modules/workflow/core/hook-executor.ts → "../../../lib/logger"   (3 levels)
server/modules/workflow/core/worktree/*.ts   → "../../../../lib/logger" (4 levels)
```

### WebSocket cli_output subscription
`hub.broadcast("cli_output", { taskId, ... })` is only sent to clients subscribed to that `taskId`.
In tests, call `hub.handleClientMessage(ws, JSON.stringify({ type: "subscribe_task", taskId }))` before broadcasting.

### git commit in tests
To prevent GPG signing errors in temporary test repos:
```typescript
runGit(dir, ["config", "commit.gpgsign", "false"]);
```

### App window keyboard shortcuts
Current shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` / `Cmd+K` | Command Palette (Spotlight) |
| `Ctrl+↑` | Mission Control |
| `g l` | Toggle Library window |
| `g s` | Toggle Settings window |
| `g a` | Toggle Agent Manager |
| `g e` | Toggle CLI (Agent CLI) |
| `Space` (with icon selected) | Open Quick Look |
| `Esc` | Exit Jiggle / Close Quick Look / Close Mission Control |
| 600ms long-press on empty screen | Jiggle Mode ON |
| `?` | Keyboard shortcuts guide |

---

## 6-B. DB Migration Checklist

Use this checklist every time you add a DB column or table:

1. **APPEND only** — add a new `{ id, up }` entry at the **end** of the `MIGRATIONS` chain (typically append to the last chunk under `server/modules/bootstrap/schema/versioned-migrations/`, e.g. `migrations-e-recent.ts`, or add a new chunk and spread it from `versioned-migrations.ts`). Never edit applied migration bodies.
2. **ID format**: `YYYY-MM-DD-NNN-short-description` (zero-padded, chronological)
3. **Last known ID**: `2026-03-29-011-agent-llm-distribution` → next: `2026-03-29-012-*`
4. Wrap each DDL in `try { ... } catch { /* already exists */ }` for idempotency
5. NEVER change or remove existing entries

```typescript
// Template
{
  id: "YYYY-MM-DD-NNN-description",
  up: (db) => {
    try {
      db.exec("ALTER TABLE foo ADD COLUMN bar TEXT");
    } catch { /* already exists */ }
  },
},
```

---

## 6-C. Task Creation Guide

> **Note:** `CreateTaskModal` has been removed (dead code — never imported). Task creation in the UI is handled by the **Add Tasks** inline input in `TaskBoardToolbar.tsx`.

**New task flow:** Add Tasks button → `POST /api/projects/:id/add-tasks` → LLM generates tasks (with `task_type`) → fitness-based agent assignment → execution.

When adding a new field to the task schema:

| # | File | Change |
|---|------|--------|
| 1 | `server/modules/routes/core/tasks/crud.ts` | Read field in create/update handler |
| 2 | `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` | Add DB column migration |
| 3 | `src/api/organization-projects.ts` | Include field in `createTask()` / `updateTask()` API types |
| 4 | `src/types/index.ts` | Add field to `Task` type |

---

## 7. Tech Stack

| Area | Technology |
|------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State management | Zustand |
| Backend | Node.js + Express + tsx (TypeScript direct execution) |
| DB | SQLite (`better-sqlite3`) + versioned migrations |
| Logging | pino |
| Testing | Vitest (frontend + server), Playwright (E2E) |
| Package manager | pnpm |
| Desktop app | Electron (optional build) |

---

## 8. Documentation

> Full index: [`docs/README.md`](docs/README.md). Drift check: `pnpm lint:docs`.

| Document | Description |
|----------|-------------|
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | System terminology — DB/UI mapping, domain concepts |
| [`docs/progress.md`](docs/progress.md) | Development progress — current + completed phases |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API specification (v1.6.5) |
| [`docs/architecture/schema-erd.md`](docs/architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`docs/architecture/llm-call-patterns.md`](docs/architecture/llm-call-patterns.md) | LLM call patterns — all prompts in .md |
| [`docs/architecture/AGENT-CONFIGURATION-AND-EXECUTION.md`](docs/architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent execution branching |
| [`docs/strategy/PM-WORKFLOW-SPEC.md`](docs/strategy/PM-WORKFLOW-SPEC.md) | PM orchestration — kickoff, review, project-level review |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS variables + component style rules |
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | Screen & modal specifications (macOS desktop OS) |
