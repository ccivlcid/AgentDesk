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
- User-visible plain text content (e.g. document titles, chat messages).

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
- New component files require: > 80 lines OR reused in 2+ places OR clearly separate concern.
- Do NOT create `utils.ts`, `helpers.ts`, or `constants.ts` barrel files for one-off functions.

### 0-5. DB Migrations — Append Only

- **NEVER** edit or delete an existing migration entry.
- Always append at the end of `migrations-e-recent.ts`.
- ID format: `YYYY-MM-DD-NNN-short-description` (chronological, zero-padded).
- **Last applied ID**: `2026-03-28-010-pm-activity-project-id-triggers`
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

---

## 1. Project Summary

**AgentDesk** = AI Agent OS — running, monitoring, and controlling multiple AI agents simultaneously.
macOS desktop metaphor — menu bar + desktop icons + Dock + app windows.
Electron + React(Vite) frontend + Express/tsx backend + SQLite(better-sqlite3).

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

- **PM Orchestrator** — PM agent plans, assigns, and reviews. Never executes tasks directly.
- **Evidence-based execution** — Agents must cite file/line, no speculation. 3-strike escalation on failure.
- **Review checklist** — PM reviews with structured 4-point checklist (scope match, errors, minimal scope, completeness).
- **Ship automation** — Task done → version bump → changelog entry → file sync.

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
     │  callProvider() 또는 callViaCliProvider()
     │  JSON 파싱 → tasks INSERT (assigned_agent_id = NULL)
     │
     ▼
[4] PM 에이전트 배정                                    ← stage: "assigning"
     │  비-PM 에이전트 라운드 로빈 배정
     │  appendTaskLog("pm_oversight", "PM assigned → {agent}")
     │
     ▼
[5] 업무 실행                                           ← stage: "executing"
     │  startTaskExecutionForAgent() 또는 startExecutionLoop()
     │  에이전트별 첫 번째 planned 태스크만 시작
     │
     ▼
[6] 완료                                                ← stage: "done"
```

**Key files:**
- `server/modules/routes/core/projects/kickoff.ts` — 전체 파이프라인
- `src/components/desktop/Desktop.tsx` — `KickoffStageOverlay` (4-step UI)
- `src/store/uiStore.ts` — `kickoffStage` state
- `src/app/useRealtimeSync.ts` — `kickoff_stage` WebSocket listener

**Rules:**
- 회의가 **반드시 먼저**. 태스크 생성은 회의 완료 콜백(`postMeetingCreateAndRun`) 안에서 실행.
- PM 에이전트에게 태스크 배정 금지. `project_role !== "pm"` 필터 적용.
- 회의록은 `meeting_minutes` 테이블에 `project_id` 포함하여 저장. `task_id`는 NULL 허용.
- 킥오프 실패 시에도 `postMeetingCreateAndRun()` 실행 (안전장치).
- 킥오프 프롬프트(`prompts/system/project-kickoff.md`)에서 `agent_name` 필드 없음 — 배정은 PM이 함.
- task_logs/messages INSERT 시 `project_id` 자동 스탬프 (SQLite AFTER INSERT 트리거).
- YOLO(자율) 모드: PM 오케스트레이터가 자동 승인. 의사결정 창 비활성화. 유저는 승인/보류/취소 불가.

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
│   │   ├── Dock.tsx             ← Bottom Dock (+ popup menu · Synapse · Tasks · Library · Settings · Chat)
│   │   ├── QuickLook.tsx        ← Project quick-preview panel (Space key)
│   │   ├── MissionControl.tsx   ← All windows overview (Ctrl+↑)
│   │   └── WallpaperPicker.tsx  ← Wallpaper selector (10 gradients)
│   ├── windows/                 ← App windows:
│   │                               WorkflowWindow, LibraryWindow, SettingsWindow, ChatWindow,
│   │                               AgentManagerWindow, TaskBoardWindow, SynapseWindow,
│   │                               ImageStudioWindow, FolderWindow, CliWindow (Agent CLI)
│   ├── agent-detail/            ← AgentDetailPanel (right-slide inspector · 4 tabs)
│   ├── flow-graph/              ← AgentFlowGraph (reused in FlowGraphWidget)
│   ├── workflow-builder/        ← WorkflowBuilder (@xyflow/react) + WbScheduleModal (cron)
│   ├── agent-composition/       ← AgentCompositionBuilder + AgentCompositionRunModal + nodes/CompAgentNode
│   ├── image-studio/            ← GenerateTab, GalleryTab, MaskCanvas, ProviderSelector
│   ├── synapse/                 ← SynapsePanel (Notion · Obsidian · rules)
│   ├── local-llm/               ← BackendsPanel, ModelsPanel, MetricsPanel, AdvancedSettingsPanel
│   ├── performance/             ← AgentPerformanceDashboard (Library → Performance tab)
│   ├── export/                  ← ExportModal (triggered from AgentDesk app menu)
│   └── settings/                ← Settings window tabs
├── app/
│   ├── types.ts                 ← WindowType: "workflow"|"library"|"settings"|"chat"|"agent-manager"
│   │                                           |"cli"|"tasks"|"synapse"|"image-studio"|"reports"
│   └── AppOverlays.tsx          ← Modal/overlay collection
├── store/
│   ├── agentStore.ts            ← agents, departments
│   ├── taskStore.ts             ← tasks, subtasks
│   ├── projectStore.ts          ← projects, categories
│   └── uiStore.ts               ← openWindows(Set), desktopIconLayout, wallpaper, jiggleMode, missionControlOpen
└── types/index.ts               ← Agent, Task, SubAgent and other domain types

server/
├── index.ts                     ← Server entry point
├── lib/logger.ts                ← pino logger (note: import path depth varies by file location)
├── db/runtime.ts                ← DB connection + env variable constants
├── modules/
│   ├── lifecycle.ts             ← Service start/stop hooks (synapse watchers, LLM metrics, workflow scheduler)
│   ├── routes/core.ts           ← REST API route registration
│   ├── routes/ops/composition-templates.ts ← CRUD /api/composition-templates
│   ├── routes/ops/workflow-schedules.ts    ← CRUD /api/workflow-schedules (cron)
│   ├── routes/ops/agent-performance.ts    ← GET /api/agents/performance
│   ├── routes/ops/data-export.ts          ← GET /api/export (CSV/JSON download)
│   ├── routes/ops/image-studio.ts         ← Image Studio API (generate · gallery · stream)
│   ├── routes/ops/synapse.ts              ← Synapse API (connections · rules · context)
│   ├── routes/ops/local-llm.ts            ← Local LLM API (backends · models · metrics)
│   ├── routes/ops/filesystem.ts           ← Filesystem API (project file save)
│   ├── image-studio/            ← image-service.ts · providers/openai.ts
│   ├── synapse/                 ← context-fetcher, notion-client, obsidian-client, rule-engine,
│   │                               notion-poller, obsidian-watcher
│   ├── local-llm/               ← backend-manager, ollama-client, lmstudio-client,
│   │                               llamacpp-client, jan-client, inference-logger, metrics-collector
│   └── workflow/                ← Task execution engine
│       ├── cron-utils.ts        ← 5-field cron parser (no external deps)
│       └── workflow-scheduler.ts ← Cron scheduler daemon (60s tick)
├── ws/hub.ts                    ← WebSocket broadcast hub
└── messenger/                   ← Discord/Slack receivers
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
| **App Menu** | Click "AgentDesk" text | `MenuBar.tsx` (wallpaper / shortcuts / Mission Control) |

---

## 5. Adding a New API Endpoint

1. Add route to `server/modules/routes/core.ts` or the relevant sub-router
2. Add endpoint documentation to `docs/specs/api.md` (bump version)
3. Add the fetch function in `src/` that calls it

---

## 6. Common Mistakes & Gotchas

### Custom Features — GitHub 레포 임포트 2단계 흐름

**Phase 1 (다운로드)** — `runGithubRepoImport`
- git clone → AI SVG 아이콘 생성 → `status = 'pending_install'`, `config.repo_dir` 저장
- 창 자동 닫힘, 바탕화면 아이콘 즉시 생성

**Phase 2 (첫 클릭 설치)** — `compileFromRepo`
- `config.repo_dir` 확인 → README 읽기 → npm 패키지 설치 → AI 위젯 tsx 생성 → esbuild 컴파일 → `status = 'active'`

**npm 패키지 설치**: `npm install --no-save pkg` 는 pnpm 프로젝트에서 실패함.
대신 `npm install --prefix feature --no-save pkg` 사용 → `feature/node_modules/` 에 격리 설치.
esbuild `resolveDir = FEATURE_DIR` 로 설정 → `feature/node_modules/` 우선, 상위 `node_modules/` (react 등) 폴백.

**파일 경로 규칙**:
- 클론 위치: `feature/github/<user>-<repo>/`
- AI 생성 tsx: `feature/ai/<featureId>.tsx`
- 패키지 설치 위치: `feature/node_modules/`

**앱 분류 (`compileFromRepo`)**:
- `"web-app"`: `run-dev` 엔드포인트로 실제 dev 서버 실행 → iframe 포트 포워딩
- `"library"` / `"cli"`: AI가 위젯 tsx 직접 생성 → esbuild 번들 → iframe 렌더링

**dev 서버 실행 (`run-dev` / `custom-features-ai.ts`)**:
- `j.running` vs `j.ready`: 프로세스 spawn 직후 `running=true`지만 `ready`는 Vite가 localhost URL 출력할 때만 `true`. 폴링 UI는 반드시 `j.ready && j.port` 조건 사용.
- ANSI 코드 제거: Vite 출력에 `\x1B[32m...\x1B[0m` 이스케이프 코드가 포함됨. 포트 감지 전 `line.replace(/\x1B\[[0-9;]*m/g, "")` 먼저 적용.
- pnpm regex: `pnpm run dev` 에서 script 이름 추출은 `/(?:(?:pnpm|yarn)(?:\s+run)?|npm(?:\s+run)?)\s+(\S+)/` 사용. `npm run` regex는 "run"을 캡처해서 틀림.
- Windows 프로세스 트리 종료: `child.kill()` 은 cmd.exe 셸만 종료하고 자식 vite 프로세스는 남김. 반드시 `taskkill /F /T /PID <pid>` (win32만) 사용.

**IIFE 전역 스코프**:
iframe에 주입하는 HTML에서 `onclick="startDev()"` 같은 속성은 전역 스코프를 사용.
함수가 `(function(){...})()` IIFE 안에 있으면 onclick에서 접근 불가.
IIFE 끝에 `window.startDev = startDev;` 명시적 노출 필요.

**iframe sandbox allow-popups**:
`sandbox="allow-scripts allow-same-origin"` 만 있으면 iframe 내부에서 `target="_blank"` 링크가 완전히 차단됨.
외부 링크가 필요한 앱에는 `allow-popups allow-popups-to-escape-sandbox` 추가 필수.

**Custom Features 삭제 → 휴지통 → 파일 정리**:
- 아이콘 우클릭 삭제: DB는 유지하고 `addFeatureToTrash()` (localStorage) → 바탕화면에서만 숨김 (복원 가능)
- 휴지통 비우기: `DELETE /api/custom-features/:id` 호출 → DB 삭제 + 파일 정리
  - `config.repo_dir` → `rmSync` (recursive, force)
  - `feature/ai/<id>.tsx` → `unlinkSync`
  - `feature/github/<id>-*` 파일 → `readdirSync` + 접두사 필터 후 `unlinkSync`
- `POST /api/custom-features/stop-all-dev`: 서버 종료 전 또는 즉시 호출 → 모든 dev 서버 포트 종료

---

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
After updating the shortcut map in `Desktop.tsx`, also add the entry to `KeyboardShortcutsGuide.tsx`.
Current shortcuts:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` / `Cmd+K` | Command Palette (Spotlight) |
| `Ctrl+↑` | Mission Control |
| `g w` | Toggle Workflow window |
| `g l` | Toggle Library window |
| `g s` | Toggle Settings window |
| `g c` | Toggle Chat window |
| `g a` | Toggle Agent Manager |
| `g e` | Toggle CLI (Agent CLI) |
| `g i` | Toggle Image Studio |
| `Space` (with icon selected) | Open Quick Look |
| `Esc` | Exit Jiggle / Close Quick Look / Close Mission Control |
| 600ms long-press on empty screen | Jiggle Mode ON |
| `?` | Keyboard shortcuts guide |

---

## 6-B. DB Migration Checklist

Use this checklist every time you add a DB column or table:

1. **APPEND only** — add a new `{ id, up }` entry at the **end** of the `MIGRATIONS` chain (typically append to the last chunk under `server/modules/bootstrap/schema/versioned-migrations/`, e.g. `migrations-e-recent.ts`, or add a new chunk and spread it from `versioned-migrations.ts`). Never edit applied migration bodies.
2. **ID format**: `YYYY-MM-DD-NNN-short-description` (zero-padded, chronological)
3. **Last known ID**: `2026-03-28-010-pm-activity-project-id-triggers` → next: `2026-03-28-011-*` or `2026-03-29-001-*`
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

## 6-C. CreateTaskModal Extension Guide

When adding a new field to the task creation form, follow this full chain:

| # | File | Change |
|---|------|--------|
| 1 | `src/components/taskboard/constants.ts` | Add field to `CreateTaskDraft` type |
| 2 | `src/components/taskboard/CreateTaskModal.tsx` | Add `useState`, pass to `onCreate` |
| 3 | `src/components/taskboard/create-modal/CreateTaskModalView.tsx` | Add UI input element |
| 4 | `src/components/taskboard/create-modal/useDraftState.ts` | Include field in draft save/restore |
| 5 | `server/modules/routes/core/tasks/crud.ts` | Read field in create/update handler |
| 6 | `server/modules/bootstrap/schema/versioned-migrations.ts` | Add DB column migration |
| 7 | `src/api/tasks.ts` | Include field in API request type |

**Reference**: `kb_context_sources` field (Synapse integration) is the canonical example of this pattern.

---

## 7. Tech Stack

| Area | Technology |
|------|------------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State management | Zustand |
| Flow diagrams | `@xyflow/react` v12 |
| Backend | Node.js + Express + tsx (TypeScript direct execution) |
| DB | SQLite (`better-sqlite3`) + versioned migrations |
| Logging | pino |
| Testing | Vitest (frontend + server), Playwright (E2E) |
| Package manager | pnpm |
| Desktop app | Electron (optional build) |

---

## 8. Documentation

| Document | Description |
|----------|-------------|
| [`docs/OVERVIEW.md`](docs/OVERVIEW.md) | Project OS concept, agent execution, monitoring |
| [`docs/progress.md`](docs/progress.md) | Development progress — current + completed phases |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API specification (v1.6.1) |
| [`docs/architecture/schema-erd.md`](docs/architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS variables + component style rules |
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | Screen & modal specifications (macOS desktop OS) |
| [`docs/strategy/AGENT-RUNTIME-SPEC.md`](docs/strategy/AGENT-RUNTIME-SPEC.md) | **Agent Runtime Engine spec (Phase 19)** |
| [`docs/strategy/AgentDesk_OpenSource_Product_Strategy.md`](docs/strategy/AgentDesk_OpenSource_Product_Strategy.md) | Open source product strategy |
