# AgentDesk — Project OS Overview

> **Core concept:** Register multiple AI agents to carry out development work,
> and monitor and control every step of the process in real time through the UI/UX.

---

## 1. Why AgentDesk

### The Problem

When multiple AI agents are running simultaneously:
- It is impossible to see which agent is working on which task
- There is no way to know where rules, memory, hooks, and skills are being applied
- Collaboration flow between agents cannot be tracked
- When something goes wrong, it is difficult to identify where and why

### AgentDesk's Answer

```
Agents are CLI processes.
The project is the OS those agents work within.
The UI/UX is the control panel for that OS.
```

AgentDesk lets developers and team leads **run multiple agents simultaneously** while **monitoring each agent's execution state, output, decision-making, and collaboration flow from a single screen in real time**.

---

## 2. Project OS Concept

AgentDesk is not a simple task management tool — it is an **operating system for agents**.

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentDesk — Project OS                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   PROJECT    │  │    AGENTS    │  │   LIBRARY    │       │
│  │              │  │              │  │              │       │
│  │ Goals·Risks  │  │ Agent Team   │  │ Skills       │       │
│  │ Gates·Output │  │ Dept Struct  │  │ Rules        │       │
│  │ Burndown     │  │ Personas     │  │ Memory       │       │
│  │              │  │              │  │ Hooks        │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └────────────────►│◄─────────────────┘               │
│                           │                                  │
│                    ┌──────▼───────┐                          │
│                    │    TASKS     │                          │
│                    │              │                          │
│                    │ Task Board   │                          │
│                    │ Run·Schedule │                          │
│                    │ Monitor View │                          │
│                    └──────┬───────┘                          │
│                           │                                  │
│              ┌────────────▼────────────┐                     │
│              │   MONITORING / UIUX     │                     │
│              │                         │                     │
│              │ Terminal streaming      │                     │
│              │ Agent status real-time  │                     │
│              │ CLI usage tracking      │                     │
│              │ Anomaly detection alerts│                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### OS Layer Hierarchy

```
Organization
  └── Department (agent group)
        └── Agent (CLI process)
              └── Task (execution unit)

Category (project type template)
  └── Project (workspace)
        ├── Objectives / Risks / Gates / Outputs
        └── project_agents (assigned agent team)
```

---

## 3. Agent Monitoring — What the UI/UX Reveals

The core value of AgentDesk is **"a UI that makes the invisible visible"**.

### Real-Time Monitoring Elements

| View | What is monitored |
|---|---|
| **Task Board** | Overall task status (pending/running/done/failed), agent assignment status |
| **Terminal Panel** | Real-time streaming of agent CLI output (stdout) |
| **Agent Detail** | Current state, running task, applied skills/rules/memory |
| **Status Monitor** | Full agent activity dashboard, anomaly detection |
| **CLI Usage** | Per-agent token consumption, cost tracking |
| **Task Report** | Outputs, diffs, and logs for completed tasks |

### Project-Scoped Library Filtering

When an agent is assigned to a project, the skills, rules, memory, and hooks visible within that project show **only those belonging to agents assigned to that project**. This lets users clearly understand "which agent is running with which configuration".

```
GET /api/agent-rules?project_id=<id>
  → Rules for project-assigned agents + project rules + global rules
  (rules for agents in other projects are not shown)
```

The same `project_id` filter applies to `/api/memory`, `/api/hooks`, and `/api/skills/available`.

---

## 4. Agent Execution Pipeline

What happens internally when a user runs a task:

```
User: "Run this task"
    │
    ▼
① Agent assignment (automatic or manual)
    │
    ▼
② Prompt build
   ├── Workflow pack guidance (role, behavioral guidelines)
   ├── Persona block (Jobs, Torvalds, etc.)
   ├── Rules injection  ←── cache (5-min TTL)
   ├── Memory injection ←── cache (5-min TTL)
   └── List of available skills
    │
    ▼
③ pre-task Hooks execution (parallel async)
    │
    ▼
④ CLI process spawn (child_process)
   → stdout streaming → WebSocket → terminal panel
    │
    ▼
⑤ Completion handling
   ├── post-task / on-error Hooks (fire-and-forget parallel)
   ├── Skill learning record
   ├── Memory auto-extraction and storage
   └── task.status = done | failed → broadcast
```

### How the Library is Injected into Agent Prompts

```
Priority: project > agent > department > global

[Agent Rules]
  1. [project] Code review required: always run tests before PR
  2. [agent]   Use TypeScript strict mode
  3. [global]  Respond in English

[Agent Memory]
  1. [context] Previously discovered API bug patterns
  2. [knowledge] Frequently used library configurations
```

---

## 5. Core Components — Library

Four building blocks that define agent behavior:

| Element | Role | Scope |
|---|---|---|
| **Skills** | Tools and commands the agent has learned | provider/repo/agent |
| **Rules** | Rules the agent must follow | global/dept/agent/project |
| **Memory** | Context and knowledge the agent remembers | global/dept/agent/project |
| **Hooks** | Scripts that run automatically on task events | global/dept/agent/project |

Managing these four elements **per project** allows the same agent to behave differently depending on the project.

---

## 6. Current System Status

### Completion (as of 2026-03-16)

```
Agent spawn & management         ████████████████████ 100% (timeout enforcement + orphan batching complete)
Multi-agent orchestration        ████████████████████ 100% (scheduler dynamic timeout + orphan recovery complete)
Database & infrastructure        ████████████████████ 100% (versioned migrations + project templates)
Skill learning & memory          ████████████████████ 100% (WebSocket real-time streaming + auto-extraction complete)
Heartbeat & anomaly detection    ████████████████████ 100% (AlertsWidget real-time polling complete)
Workflow cron scheduling         ████████████████████ 100% (per-workflow cron scheduler + WbScheduleModal complete)
UI/UX monitoring                 ████████████████████ 100% (macOS UX complete + Custom Widget Platform)
Security hardening               ████████████████████ 100% (2nd patch complete)
Persona system                   ████████████████████ 100% (complete)
Visual agent graph               ████████████████████ 100% (complete)
Agent composition templates      ████████████████████ 100% (drag-and-drop + Run complete)
Custom Widget Platform           ████████████████████ 100% (Phase 1~5 complete — template + AI + esbuild bundle)
Project management               ████████████████████ 100% (cost summary + templates + burndown complete)
Analytics & performance          ████████████████████ 100% (AgentPerformanceDashboard + Data Export complete)
Notification center              ████████████████████ 100% (date groups + hover actions + type filter badges)
```

### Known Bugs (2026-03-16 Pipeline Audit)

> 상세 수정 지침: **`docs/bugs/PIPELINE-AUDIT-2026-03-16.md`**

| Code | Severity | File | Issue | Status |
|------|----------|------|-------|--------|
| BUG-01 | 🔴 P0 | `server/modules/routes/core/tasks/execution-run.ts` | `buildTaskExecutionPrompt()` 호출에 try-catch 없음 — 내부 예외 시 서버 hang | ⬜ Open |
| BUG-02 | 🟡 P1 | `server/modules/workflow/agents/providers/stream-tools.ts` | `subtask_done` 정규식이 따옴표 포함 제목 파싱 실패 | ⬜ Open |
| BUG-03 | 🔵 P2 | `src/components/AgentManager.tsx` | 에이전트 저장 실패 시 UI 에러 표시 없음 | ⬜ Open |
| BUG-04 | 🔵 P2 | `src/components/AgentManager.tsx` | 아바타 업로드/삭제 실패 silent | ⬜ Open |
| BUG-05 | 🔵 P2 | `server/modules/lifecycle.ts` | 메신저 수신자 시작 실패 시 예외처리 없음 | ⬜ Open |
| BUG-06 | 🟡 P1 | `server/modules/workflow/agents/providers/stream-tools.ts` | 스트림 버퍼 2KB 고정 → 장문 응답에서 서브태스크 손실 | ⬜ Open |

> UI 기능 감사 (Workflow Builder · REPL · Flow Graph): **`docs/bugs/UI-AUDIT-2026-03-16.md`**

| Code | Severity | File | Issue | Status |
|------|----------|------|-------|--------|
| WB-01 | ❌ 미구현 | `src/components/workflow-builder/WbRunModal.tsx` | Condition 노드 조건 평가 없음 — 항상 모든 하위 에이전트 실행 | ⬜ Open |
| WB-02 | 🟡 P1 | `src/components/workflow-builder/WbRunModal.tsx` | 의존성 설정 실패 시 롤백 없음 — 고아 Task 생성 | ⬜ Open |
| WB-03 | 🔵 P2 | `src/components/workflow-builder/WbRunModal.tsx` | Trigger 타입 정보 Task에 미전달 | ⬜ Open |
| FG-01 | ❌ TODO | `src/components/flow-graph/useFlowLayout.ts` | Delegation 엣지 명시적 TODO — SubTask 데이터 미전달 | ⬜ Open |
| FG-02 | 🟡 P1 | `src/components/desktop/widgets/FlowGraphWidget.tsx` | 노드 클릭 → 에이전트 상세 패널 콜백 미연결 | ⬜ Open |
| FG-03 | 🔵 P2 | `src/components/flow-graph/useFlowLayout.ts` | 50+ 에이전트 시 3열 고정 레이아웃 극단 축소 | ⬜ Open |
| REPL | ✅ | — | Agent REPL 전체 정상 동작 (버그 없음) | ✅ OK |

### Safe Concurrency Limits

| Concurrent agents | Before Phase 1 | After Phase 1 (current) | After Phase 2 |
|:-:|:-:|:-:|:-:|
| 1–3 | ✅ | ✅ | ✅ |
| 5 | ⚠️ noticeable lag | ✅ | ✅ |
| 10 | ❌ blocking risk | ⚠️ minor lag | ✅ |
| 20+ | ❌ resource exhaustion | ⚠️ no queue, risky | ✅ queue control |

### Phase 1 Performance Improvements Complete (2026-03-13)

- **Parallel hook execution**: `execFileSync` → `execFileAsync + Promise.all` (up to 600s blocking eliminated)
- **4 composite DB indexes added**: full-scan on enabled+scope filter eliminated
- **Rules & Memory 5-min TTL cache**: DB re-queries eliminated when 10 tasks start simultaneously in the same project

---

## 7. Completed Major Milestones

All planned features and improvement tasks have been completed. Key achievements are listed below.

### Security Hardening
- OAuth PBKDF2-SHA256 key derivation, API rate limiting, WebSocket connection limit, environment variable validation, and 13 security vulnerability patches including path traversal, ReDoS, and OAuth bypass

### Performance Optimization
- Hook async parallel execution (up to 600s blocking eliminated), 4 composite DB indexes added, Rules & Memory 5-min TTL cache, spawn DB query batching, FIFO concurrent execution queue

### Core Features
- Agent Flow Graph (real-time SVG agent relationship visualization), Visual Workflow Builder (@xyflow/react), agent persona system, task handoff, agent timeline, cost tracking, Slack integration

### UI/UX
- Zustand state management introduced, Keyboard-First UX (vim-style `g+key` shortcuts), macOS OS metaphor complete (Mission Control, Jiggle Mode, Quick Look, Command Palette), i18n for 4 languages (ko/en/ja/zh)
- **Custom Widget Platform**: No-code widget/app creation via templates (7 types) or AI natural language → esbuild TSX→IIFE bundle → sandbox iframe rendering
- **macOS UX polish**: TrafficLights on all panels, desktop icon inline rename (double-click), macOS-style dialogs with rounded corners

### Analytics & Export
- **Agent Performance Dashboard** (`src/components/performance/AgentPerformanceDashboard.tsx`): success rate badges, status stack bars (done/review/in_progress/cancelled), daily sparklines; project + days filter, sort by total/done/rate/speed; Library → Performance tab
- **Data Export** (`src/components/export/ExportModal.tsx` + `server/modules/routes/ops/data-export.ts`): tasks/deliverables/agents/costs → CSV (UTF-8 BOM, Excel-compatible) or JSON; project/status/date-range filters; triggered from AgentDesk app menu
- **Backend**: `GET /api/export?type=&format=&project_id=&since=&until=` — toCsv() helper with BOM prefix, Content-Disposition attachment, duration_ms column

### Workflow Cron Scheduling
- **Cron parser** (`server/modules/workflow/cron-utils.ts`): pure 5-field cron without external deps — `parseCronField`, `nextCronRunAfter`, `validateCron`
- **Workflow scheduler daemon** (`server/modules/workflow/workflow-scheduler.ts`): `startWorkflowScheduler(db)` → `setInterval(60s)` tick, fires agent-node tasks when `next_run_at <= now`, advances schedule
- **DB table** (`workflow_schedules`): migration `2026-03-17-001`, indexed on `next_run_at`
- **REST API** (`server/modules/routes/ops/workflow-schedules.ts`): CRUD for `GET/POST/PUT/DELETE /api/workflow-schedules`
- **UI** (`src/components/workflow-builder/WbScheduleModal.tsx`): 6 cron presets, custom cron input, schedule list with toggle/delete, ⏰ toolbar button in WorkflowBuilder

### Notification Center (Improved)
- **Date bucket grouping**: Today / Yesterday / Older sections with per-section unread counts
- **Hover quick-actions**: mark-read ✓ + delete × with CSS opacity transition, slide-out animation on delete
- **Per-type unread badges**: filter chips now show count of unread notifications per type
- **Bulk clear read**: "Clear N read" link + 🗑 button in title bar
- **Default behavior**: `hideRead` defaults to `false` (shows all notifications)

### Quality
- pino structured logging, 186 server tests + 43 frontend tests all passing

### Project Management
- **Cost summary**: `GET /api/projects/:id/cost-summary` — per-project USD cost, token in/out, agent breakdown, workflow breakdown; displayed in `ProjectInsightsPanel`
- **Project templates**: 4 built-in templates (Web App, Research Report, Video Production, Data Analysis) auto-seed objectives + gates on project creation
- **`context_hint` refactoring**: `workflow_pack_key → context_hint` dual-write migration across 16+ server files

---

## 8. Completion History

---

### 🔴 P0 — Immediate (bugs & security)

#### ~~[P0-1] Meeting participant filtering bug~~ ✅ Done (2026-03-14)
- **File:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts`
- **Fix:** Removed `assignment_mode !== "manual"` condition from `loadManualProjectAgentScope()` → agent pool restriction via `project_agents` table now applies in all modes
- **Effect:** Prevents unassigned agents from participating in tasks/reviews even in auto-mode projects

#### ~~[P0-2] OAuth password hashing vulnerability~~ ✅ Already complete
- **File:** `server/oauth/helpers.ts`
- **Status:** PBKDF2-SHA256 (100k iterations) v2 key already implemented. `encryptSecret()` is v2-only; `decryptSecret()` supports v1/v2 backward compatibility

#### ~~[P0-3] No API rate limiting~~ ✅ Already complete
- **File:** `server/security/auth.ts`
- **Status:** In-process sliding-window rate limiter implemented
  - General API: 300 req/min per IP
  - Task execution trigger (`POST /tasks/:id/run`): 20 req/min per IP
  - Stale bucket sweep every 5 minutes to prevent memory leaks

#### ~~[P0-4] Unlimited WebSocket connections~~ ✅ Already complete
- **File:** `server/modules/lifecycle.ts`
- **Status:** `MAX_WS_CLIENTS = 20` global limit implemented. Exceeding connections are immediately closed with code `4008`

#### ~~[P0-5] No environment variable validation at startup~~ ✅ Already complete
- **File:** `server/server-main.ts`
- **Status:** `validateEnv()` validates OAUTH_ENCRYPTION_SECRET and API_AUTH_TOKEN at server startup and prints warnings. When OAuth is actually used, `oauthEncryptionKeyV2()` throws immediately on failure

---

### 🟠 P1 — Short-term (1–2 weeks)

#### ~~[P1-1] App.tsx state management separation — Zustand~~ ✅ Done (2026-03-14)
- **Files:** `src/store/agentStore.ts`, `src/store/taskStore.ts`, `src/store/projectStore.ts`, `src/store/uiStore.ts`
- **Completed:**
  1. 4 Zustand store files created
  2. All 46 useState calls removed from App.tsx → replaced with store subscriptions (reduced to 349 lines)
  3. All WebSocket events, bootstrap data, and action handlers use store setters

#### ~~[P1-2] WorkflowPackKey → category_id bridge~~ ✅ Done (2026-03-14)
- **Files:** `versioned-migrations.ts`, `category-seeds.ts`, `task-pack-resolver.ts`, `tasks/crud.ts`, `src/types/index.ts`
- **Implemented:**
  1. DB migration `2026-03-14-003`: added `pack_key TEXT` column to `categories` table, pack key mappings applied to 6 existing categories
  2. DB migration `2026-03-14-004`: added `category_id TEXT REFERENCES categories(id)` to `tasks` table
  3. Added `resolveCategoryPackKey()` function — looks up `category_id → categories.pack_key`
  4. `resolveWorkflowPackKeyForTask()` priority chain: explicit → **category** → sourceTask → projectDefault → fallback
  5. POST `/api/tasks` accepts `category_id` → validated from DB before INSERT
  6. PATCH `/api/tasks/:id` allows `category_id`
  7. Added `category_id?: string | null` to the `Task` interface
- **Category → pack mappings:**
  - `cat_software_dev` → `development`
  - `cat_marketing` → `asset_management`
  - `cat_research` → `web_research_report`
  - `cat_product_launch` → `development`
  - `cat_content` → `novel`
  - `cat_operations` → `report`
- **Backward compatibility:** `workflow_pack_key` column retained (existing data preserved); tasks without a category continue to work as before

#### ~~[P1-3] Messenger receive retry logic~~ ✅ Done (2026-03-14)
- **Files:** `server/messenger/telegram-receiver.ts`, `server/messenger/discord-receiver.ts`
- **Fix:** Added `forwardToInboxWithRetry()` helper (up to 3 retries, exponential backoff: 2s→4s→8s)
- **Effect:** Automatic retry on transient inbox delivery failures, preventing permanent message loss

#### ~~[P1-4] DB migration version tracking~~ ✅ Already complete
- **File:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **Status:** `schema_migrations` table + `runVersionedMigrations()` already implemented. Tracks which versions have been applied and prevents duplicate execution

#### ~~[P1-5] In-memory map memory leak prevention~~ ✅ Already complete
- **Files:** `server/modules/lifecycle.ts`, `server/security/auth.ts`
- **Status:** `wsClients.delete()` implemented in WebSocket `onClose/onError` handlers. Rate limiter buckets are automatically cleaned up by a 5-minute periodic sweep

#### ~~[P1-6] Structured logging (pino)~~ ✅ Done
- **Files:** `server/lib/logger.ts` (new), 40+ server files
- **Completed:**
  1. Added `pino` + `pino-pretty` dependencies
  2. `server/lib/logger.ts` — environment-aware logger (dev: pino-pretty colors, prod: JSON, supports `LOG_LEVEL` env var)
  3. All `console.log/warn/error` across the server replaced with `logger.info/warn/error`
  4. Structured error logging: `logger.error({ err }, "message")` pattern for automatic stack trace serialization

---

### 🟡 P2 — Medium-term (3–6 weeks)

> **P2-2~P2-8 detailed design:** `docs/strategy/p2-tasks-design.md`
> (file paths, current state, implementation steps, code examples)

#### ~~[P2-1] Agent Flow Graph implementation~~ ✅ Done (2026-03-14)
- **Files:** `src/components/flow-graph/` (AgentFlowGraph, useFlowLayout, AgentNode, MeetingCluster, FlowEdge)
- **Completed:** Real-time SVG agent relationship visualization, zoom/pan, node click, meeting clusters, integrated as a toggle view in Dashboard

#### ~~[P2-2] Agent execution cost tracking~~ ✅ Done (2026-03-14)
- **Completed:**
  1. Added `tokens_in`, `tokens_out`, `cost_usd` columns to `task_execution_events` table (migration `2026-03-14-005`)
  2. `api-provider-tools.ts` — parses Anthropic SDK `response.usage` and saves to DB (`COST_PER_INPUT_MTOK` / `COST_PER_OUTPUT_MTOK` env vars)
  3. Added `GET /api/agents/:id/cost-summary` and `GET /api/cost-summary` APIs
  4. "This month's cost" badge in agent detail + total cost widget in Dashboard

#### ~~[P2-3] Concurrent execution limit (FIFO queue)~~ ✅ Done (2026-03-14)
- **Completed:**
  1. `server/modules/workflow/orchestration/agent-queue.ts` (new) — FIFO queue module
  2. `MAX_CONCURRENT_AGENTS` env var (default 10) — `server/db/runtime.ts`
  3. Integrated into `orchestration.ts` — enqueue wrapper + onComplete hook
  4. `GET /api/queue-status` API + header queue status counter (running N / queued M)

#### ~~[P2-4] Spawn DB query batching~~ ✅ Done (2026-03-14)
- **Completed:**
  1. Extracted `buildExecutionPayload()` helper function
  2. Parallelized 6 functions (`buildRulesPromptBlock`, `buildMemoryPromptBlock`, `buildAvailableSkillsPromptBlock`, `loadPendingInterruptPrompts`, `getRecentConversationContext`, `getTaskContinuationContext`) with `Promise.all()`
  3. `startTaskExecutionForAgent` converted to async

#### ~~[P2-5] Agent timeline view~~ ✅ Done (2026-03-14)
- **Completed:**
  1. `GET /api/agents/:id/timeline` API — based on `task_execution_events`
  2. `src/components/agent-detail/AgentTimeline.tsx` — vertical timeline, color-coded dots per event type
  3. Added "Timeline" tab to AgentDetail

#### ~~[P2-6] Task handoff (agent → agent)~~ ✅ Done (2026-03-14)
- **Completed:**
  1. Added `handoff_to_agent_id`, `handoff_condition` columns to `tasks` table (migration `2026-03-14-007`)
  2. `run-complete-handler/core.ts` — evaluates handoff condition on completion → automatically creates follow-up task
  3. POST/PATCH `/api/tasks` supports handoff fields
  4. `CreateTaskModal` — "HANDOFF ON COMPLETE" section (toggle + agent select + condition select)

#### ~~[P2-7] Persona system UI completion~~ ✅ Done (2026-03-14)
- **Completed:**
  1. `src/components/persona/PersonaDetailPanel.tsx` (new) — name, keywords, best_for, style description
  2. AgentDetailTabContent — catalog/direct-edit mode toggle + persona_id update
  3. PersonaBadge integrated into AgentManager agent list

#### ~~[P2-8] WebSocket broadcast optimization~~ ✅ Done (2026-03-14)
- **Completed:**
  1. `server/ws/hub.ts` — `cli_output` split into 4KB chunks for transmission
  2. Per-task channel subscription — client subscription management via `subscribe_task` / `unsubscribe_task` messages
  3. `src/hooks/useWebSocket.ts` — added `send()` function
  4. Automatic subscribe/unsubscribe on terminal panel mount/unmount

---

### 🔵 P3 — Long-term (3+ months)

#### ~~[P3-1] "Bigger IDE" — Split-Pane Layout~~ ✅ Done (2026-03-14)
- **Files:** `src/hooks/useSplitPane.ts` (new), `src/app/SplitPaneSecondary.tsx` (new), `src/app/AppMainLayout.tsx`, `src/app/AppHeaderBar.tsx`
- **Completed:**
  1. Pure CSS + mouse drag resize implemented without external libraries
  2. Right secondary panel: Flow Graph ◎ / Heartbeat ♡ / Dashboard ▦ tab switching
  3. Split ratio 25–75% drag adjustment, auto-saved to localStorage
  4. Header `⊟` toggle button (desktop only), `\` keyboard shortcut
  5. Added `\` entry to keyboard shortcuts guide

#### ~~[P3-2] Visual Workflow Builder~~ ✅ Done (2026-03-14)
- **Design:** `docs/strategy/bigger-ide-vision.md` Phase 2
- **Completed:**
  1. Installed `pnpm add @xyflow/react` (v12.10.1)
  2. Node-based workflow UI: `WbTriggerNode`, `WbAgentNode`, `WbGateNode`, `WbConditionNode` (4 types)
  3. `src/components/workflow-builder/WorkflowBuilder.tsx` — ReactFlow canvas, Background/Controls/MiniMap, node palette
  4. Drag & drop visual composition of agent pipelines, edge connections between nodes
  5. Auto save/load to localStorage, workflow name editing
  6. Integrated as Workflow window tab in header, `g w` keyboard shortcut registered

#### ~~[P3-3] Keyboard-First UX completion~~ ✅ Done (2026-03-14)
- **Files:** `src/app/AppMainLayout.tsx`, `src/components/KeyboardShortcutsGuide.tsx`
- **Completed:**
  1. `g + key` vim-style navigation: `g d` → Dashboard, `g t` → Task Board, `g a` → Agents, `g f` → Flow Graph, `g s` → Skills, `g m` → Memory, `g r` → Rules, `g h` → Hooks (1-second timeout)
  2. `n` → opens command palette (except when editing)
  3. Added `g + key` section to KeyboardShortcutsGuide (i18n 4 languages)

#### ~~[P3-4] Test coverage expansion~~ ✅ Done (2026-03-14)
- **Completed:**
  1. Fixed server logger import paths: `hub.ts`, `hook-executor.ts`, `task-execution-meta.ts`, `worktree/lifecycle.ts`
  2. Fixed test harnesses: added missing tables to `versioned-migrations.test.ts` makeDb(), added missing columns to `crud.workflow-pack-filter.test.ts`
  3. Added taskId subscription logic to `hub.test.ts` cli_output tests (reflecting subscription-filtered delivery)
  4. Added `commit.gpgsign=false` to temporary git repos in `worktree/lifecycle.test.ts` (for environments without a signing server)
  5. **Result: 181 tests across 40 server test files all passing / 43 tests across 12 frontend test files all passing**

#### ~~[P3-5] Anomaly detection index optimization~~ ✅ Done (2026-03-14)
- **Files:** `server/modules/bootstrap/schema/versioned-migrations.ts`, `server/db/runtime.ts`, `server/modules/lifecycle.ts`
- **Completed:**
  1. Migration `2026-03-14-008-watchdog-index`: added composite index `tasks(status, execution_state, last_heartbeat_at DESC)` — eliminates full-scan on watchdog queries
  2. `server/db/runtime.ts` — `TASK_STALLED_THRESHOLD_MS` / `TASK_STALLED_RECOVERY_THRESHOLD_MS` now configurable via env vars (defaults 90s / 180s, minimums enforced)
  3. `lifecycle.ts` — hardcoded constants replaced with imports from `db/runtime.ts`

#### ~~[P3-6] Slack integration~~ ✅ Done (2026-03-14)
- **File:** `server/messenger/slack-receiver.ts` (new)
- **Completed:**
  1. `conversations.history` polling-based receiver implemented (reusing Discord pattern)
  2. Bot User OAuth Token (`xoxb-...`) support, channel ID-based routing
  3. `lifecycle.ts` — `startSlackReceiver()` registered, `onBeforeClose()` cleanup
  4. Added `GET /api/messenger/receiver/slack` status endpoint (`core.ts`)

---

---

### 🔐 Security Patches (2026-03-14)

#### Patch Round 1

| # | Vulnerability | Severity | File | Status |
|---|--------|--------|------|------|
| S1 | Path Traversal | 🔴 High | `task-reports/routes.ts` | ✅ Done |
| S2 | GitHub PAT validation bypass | 🔴 High | `github-routes.ts` | ✅ Done |
| S3 | git clone path escape | 🔴 High | `github-routes.ts` | ✅ Done |
| S4 | OAuth `.ts.net` redirect bypass | 🔴 High | `oauth/helpers.ts` | ✅ Done |
| S5 | Content-Disposition filename injection | 🟡 Medium | `chat-upload.ts` | ✅ Done |
| S6 | Prompt Injection (projectPath) | 🟡 Medium | `api-provider-tools.ts` | ✅ Done |
| S7 | ReDoS (lookbehind regex) | 🟡 Medium | `reply-core-tools.ts`, `messenger-notice-format.ts` | ✅ Done |
| S8 | TOCTOU file read race condition | 🟡 Medium | `chat-upload.ts` | ✅ Done |
| S9 | Non-atomic file writes | 🟢 Low | `custom-skills.ts` | ✅ Done |

#### Patch Round 2

| # | Vulnerability | Severity | File | Status |
|---|--------|--------|------|------|
| S10 | Error message information disclosure (update API) | 🔴 High | `register.ts` | ✅ Done |
| S11 | Error message information disclosure (GitHub API) | 🔴 High | `github-routes.ts` | ✅ Done |
| S12 | git clone stderr WS broadcast | 🔴 High | `github-routes.ts` | ✅ Done |
| S13 | Error message information disclosure (API Providers) | 🟡 Medium | `api-providers.ts` | ✅ Done |

---

### 📊 Priority Summary (as of 2026-03-14)

| Code | Task | Est. Duration | Impact | Status |
|------|------|---------|--------|------|
| ~~P0-1~~ | ~~Meeting participant filtering bug~~ | 0.5d | 🔴 P0 bug | ✅ Done |
| ~~P0-2~~ | ~~OAuth hashing vulnerability~~ | 1d | 🔴 Security | ✅ Done |
| ~~P0-3~~ | ~~Rate limiting~~ | 0.5d | 🔴 Security | ✅ Done |
| ~~P0-4~~ | ~~WebSocket connection limit~~ | 0.5d | 🔴 Security | ✅ Done |
| ~~P0-5~~ | ~~Environment variable validation~~ | 0.5d | 🔴 Stability | ✅ Done |
| ~~P1-1~~ | ~~Zustand state management~~ | 4d | Perf & dev velocity | ✅ Done |
| ~~P1-2~~ | ~~WorkflowPackKey → category_id bridge~~ | 3d | Code clarity | ✅ Done |
| ~~P1-3~~ | ~~Messenger retry~~ | 1d | Stability | ✅ Done |
| ~~P1-4~~ | ~~DB migration versioning~~ | 2d | Stability | ✅ Done |
| ~~P1-5~~ | ~~Map memory leak~~ | 1d | Stability | ✅ Done |
| ~~P1-6~~ | ~~Structured logging (pino)~~ | 2d | Operability | ✅ Done |
| ~~P2-1~~ | ~~Agent Flow Graph~~ | 3–4w | 🎯 Core vision | ✅ Done |
| ~~P2-2~~ | ~~Execution cost tracking~~ | 3d | Usability | ✅ Done |
| ~~P2-3~~ | ~~Concurrent execution queue~~ | 3d | Scalability | ✅ Done |
| ~~P2-4~~ | ~~Spawn DB batching~~ | 2d | Performance | ✅ Done |
| ~~P2-5~~ | ~~Agent timeline~~ | 3d | Visualization | ✅ Done |
| ~~P2-6~~ | ~~Task handoff~~ | 4d | Feature expansion | ✅ Done |
| ~~P2-7~~ | ~~Persona UI completion~~ | 2d | UI completeness | ✅ Done |
| ~~P2-8~~ | ~~WebSocket optimization~~ | 2d | Performance | ✅ Done |
| ~~P3-1~~ | ~~Split-Pane Layout~~ | 3–4d | IDE vision | ✅ Done |
| ~~P3-2~~ | ~~Visual Workflow Builder~~ | 3–4w | IDE vision | ✅ Done |
| ~~P3-3~~ | ~~Keyboard-First UX~~ | 1w | UX completeness | ✅ Done |
| ~~P3-4~~ | ~~Test coverage~~ | 3–4w | Quality | ✅ Done |
| ~~P3-5~~ | ~~Anomaly detection optimization~~ | 1d | Performance | ✅ Done |
| ~~P3-6~~ | ~~Slack integration~~ | 3d | Feature expansion | ✅ Done |
| ~~S1~9~~ | ~~Security patch round 1 (path traversal, OAuth, ReDoS, etc.)~~ | 1d | 🔴 Security | ✅ Done |
| ~~S10~13~~ | ~~Security patch round 2 (error disclosure, stderr broadcast)~~ | 0.5d | 🔴 Security | ✅ Done |
| ~~Ph5~~ | ~~Phase 5 (ReplWindow, shortcuts, CommandPalette)~~ | 1d | UI completeness | ✅ Done |
| ~~Ph14~~ | ~~Workflow cron scheduler + WbScheduleModal~~ | 2d | Automation | ✅ Done |
| ~~Ph15~~ | ~~Agent Performance Dashboard~~ | 2d | Analytics | ✅ Done |
| ~~Ph16~~ | ~~Data Export (CSV/JSON)~~ | 1d | Analytics | ✅ Done |
| ~~Ph17~~ | ~~Notification Center improvements~~ | 1d | UX polish | ✅ Done |



---

## 9. Document Map

| Document | Contents |
|---|---|
| [`docs/OVERVIEW.md`](./OVERVIEW.md) | **This document** — full overview + completion history |
| [`docs/progress.md`](./progress.md) | Development progress tracker (latest work log) |
| [`docs/bugs/PIPELINE-AUDIT-2026-03-16.md`](./bugs/PIPELINE-AUDIT-2026-03-16.md) | **Pipeline audit — 6 bugs with exact fix instructions (AI-ready)** |
| [`docs/specs/api.md`](./specs/api.md) | Full REST API specification |
| [`docs/architecture/SYSTEM-STRUCTURE-MAP.md`](./architecture/SYSTEM-STRUCTURE-MAP.md) | System structure map |
| [`docs/architecture/schema-erd.md`](./architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md`](./architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Comprehensive architecture + backend audit |
| [`docs/strategy/agent-performance-audit.md`](./strategy/agent-performance-audit.md) | Agent execution performance audit |
| [`docs/strategy/bigger-ide-vision.md`](./strategy/bigger-ide-vision.md) | "Bigger IDE" strategic vision |
| [`docs/features/custom-widget-platform.md`](./features/custom-widget-platform.md) | Custom Widget Platform — spec + implementation summary |
| [`docs/features/local-llm-manager.md`](./features/local-llm-manager.md) | Local LLM Manager — 기획 문서 (Ollama 연동, 모델 관리, 에이전트 연결) |
| [`docs/features/knowledge-base-integrations.md`](./features/knowledge-base-integrations.md) | Knowledge Base Integrations — Notion / Obsidian / NotebookLM 연결 기획 |
| [`docs/design/DESIGN.md`](./design/DESIGN.md) | UI CSS variables + component patterns |
| [`docs/design/UI-SCREENS.md`](./design/UI-SCREENS.md) | Full screen & modal specification |

---

## 10. Quick Start

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
# → http://localhost:8800
```

### First Agent Registration Flow

```
1. Settings → Configure API Provider (Claude / OpenAI / etc.)
2. Agents → Create agent + configure persona
3. Projects → Create project + assign agents
4. Library → Configure Rules / Memory / Hooks for the project
5. Tasks → Create task → Run → monitor in real time from the terminal panel
```
