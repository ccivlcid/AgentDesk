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
| **Agent Detail** | Current state, running task, applied skills/rules/memory — right slide panel (360px, 4 tabs: Overview/Tasks/Chat/Timeline) |
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

---

## 4-A. New Task → Agent CLI — Full Flow

End-to-end flow when creating a task and running it via Agent CLI:

```
  [Desktop Icon / Dock +]
          │
          ▼
  CreateTaskModal
  (프로젝트 · 에이전트 · 설명 입력)
          │
          ▼
  POST /api/tasks  →  DB: tasks INSERT  (status = "pending")
          │
  WebSocket broadcast: task_created → taskStore / TaskBoard
          │
          ▼
  Agent Queue (task-scheduler.ts / execution-start-task.ts)
  에이전트 선택 + worktree 생성  →  status = "running"
          │
    ┌─────┴─────────────────────────┐
    ▼                               ▼
[Phase E: Planning]          [Agent CLI Window]
헤드리스 planningAgent        CliWindow.tsx
.agentdesk-task.md 생성        │
(goals · curl 완료 명령)        ├─ send("pty_create", { sessionId })
          │                    │       ↓
          └──► broadcast       │  server/modules/pty/  (PTY 생성)
           auto_open_cli ──────►       ↓
                               │  pty_ready 이벤트
                               │  on("pty_ready") → runAgentCli()
                               │  (2000ms fallback 포함)
                               │       ↓
                               │  XTerminal (xterm.js)
                               │  buildCliCmd() → claude / codex / gemini …
                               │
                               ▼
                         에이전트 작업 수행
                         (코드 변경 · API 호출 등)
                               │
                               ▼
                    POST /api/tasks/:id/cli-complete
                    (에이전트 자동 호출 or 사용자 완료 버튼)
                               │
                               ▼
                    run-complete-handler.ts
                    status = "review" → "done"
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
   ① autoSaveTaskReport  ② autoCheckDelivs  ③ emitTaskReportEvent
   task_report_archives  project_deliverable  → Reports Window
   마크다운 자동 저장      _checks 자동 체크     보고서 즉시 전달
   (lang 설정 반영)       (lang 설정 반영)
              │
   WebSocket broadcast: task_done → TaskBoard / NotificationCenter
```

### Window Roles in This Flow

| Window | Role |
|--------|------|
| 📋 **CreateTaskModal** | Task creation entry — project · agent · description |
| ▦  **TaskBoard** | Task status monitor (pending → running → done) |
| 🕸️ **Agent Graph** | Real-time visualization of agent↔task connections (desktop app) |
| ⚡ **Workflow Builder** | Multi-task automation pipeline design & execution |
| >_ **Agent CLI** | PTY terminal — runs Claude/Codex/Gemini; pty_ready auto-fires command |
| 📊 **Reports** | Completed task report archive viewer |
| 🔔 **Notifications** | Task completion & anomaly alerts |

### Auto Post-processing (on task done)

| Step | Function | Target |
|------|----------|--------|
| ① | `autoSaveTaskReport` | `task_report_archives` — markdown summary, language-aware |
| ② | `autoCheckProjectDeliverables` | `project_deliverable_checks` — keyword match auto-check |
| ③ | `emitTaskReportEvent` | Frontend receives archive on first API call |

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

### Completion (as of 2026-03-19)

```
Agent spawn & management         ████████████████████ 100% (timeout enforcement + orphan batching complete)
Multi-agent orchestration        ████████████████████ 100% (scheduler dynamic timeout + orphan recovery complete)
Database & infrastructure        ████████████████████ 100% (versioned migrations + project templates)
Skill learning & memory          ████████████████████ 100% (WebSocket real-time streaming + auto-extraction complete)
Heartbeat & anomaly detection    ████████████████████ 100% (anomaly detection + real-time polling complete)
Workflow cron scheduling         ████████████████████ 100% (per-workflow cron scheduler + WbScheduleModal complete)
UI/UX monitoring                 ████████████████████ 100% (macOS UX complete)
Security hardening               ████████████████████ 100% (2nd patch complete)
Persona system                   ████████████████████ 100% (complete)
Visual agent graph               ████████████████████ 100% (delegation edges + agent detail panel complete)
Agent composition templates      ████████████████████ 100% (drag-and-drop + Run complete)
Custom Feature Platform          ████████████████████ 100% (Phase 1~5 complete — template + AI + esbuild bundle)
Project management               ████████████████████ 100% (cost summary + templates + folders + cross-project handoff)
Analytics & performance          ████████████████████ 100% (AgentPerformanceDashboard + Data Export complete)
Notification center              ████████████████████ 100% (date groups + hover actions + type filter badges)
Local LLM manager                ████████████████████ 100% (Ollama + LM Studio + llama.cpp + Jan, Phase 1~5 complete)
Knowledge base (Synapse)         ████████████████████ 100% (Notion + Obsidian + NotebookLM, Phase 1~5 complete)
Task Board window                ████████████████████ 100% (TaskBoardWindow standalone app + Dock integration)
Agent detail panel               ████████████████████ 100% (right-slide inspector, skills/rules/memory/tasks/cost)
Image Studio                     ████████████████████ 100% (txt2img · inpaint · gallery · task link, Phase 15 complete)
Cross-Project Handoff            ████████████████████ 100% (deliverable checklist + source context injection, Phase 16)
Project Folders                  ████████████████████ 100% (folder container + disk move + FolderWindow, Phase 17)
Agent CLI                        ████████████████████ 100% (실제 PTY 터미널 + 에이전트 셀렉트 + CLI 자동 실행, Phase 18+)
Figma Integration                ████████████████████ 100% (task URL attach + context fetch + prompt injection)
Bug fixes (pipeline + UI audit)  ████████████████████ 100% (BUG-01~06, WB-01~03, FG-01~03 all resolved)
Hooks project-scope filter       ████████████████████ 100% (project-only filter + FloatingWindow scope lock UI, 2026-03-19)
Default hook seeds               ████████████████████ 100% (5 global hooks seeded on fresh install, 2026-03-19)
hook_entries project scope       ████████████████████ 100% (DB migration 2026-03-23-001, project scope_type added)
Custom Features dev execution    ████████████████████ 100% (ANSI/pnpm/port/IIFE/ready/taskkill 버그 6건 수정, 2026-03-19)
Custom Features trash system     ████████████████████ 100% (휴지통 → 복원/영구삭제 + 파일 정리, 2026-03-19)
macOS UX Improvements (MX-01~07) ░░░░░░░░░░░░░░░░░░░░   0% (스펙 완료, 구현 대기 — docs/design/MACOS-UX-IMPROVEMENTS.md)
```

### Known Bugs (2026-03-16 Pipeline Audit) — 전체 수정 완료

> 상세 수정 이력: **`docs/progress.md` → "2026-03-16 실행 파이프라인 감사" 섹션**

| Code | Severity | File | Issue | Status |
|------|----------|------|-------|--------|
| BUG-01 | 🔴 P0 | `server/modules/routes/core/tasks/execution-run.ts` | `buildTaskExecutionPrompt()` 호출에 try-catch 없음 — 내부 예외 시 서버 hang | ✅ Done |
| BUG-02 | 🟡 P1 | `server/modules/workflow/agents/providers/stream-tools.ts` | `subtask_done` 정규식이 따옴표 포함 제목 파싱 실패 | ✅ Done |
| BUG-03 | 🔵 P2 | `src/components/AgentManager.tsx` | 에이전트 저장 실패 시 UI 에러 표시 없음 | ✅ Done |
| BUG-04 | 🔵 P2 | `src/components/AgentManager.tsx` | 아바타 업로드/삭제 실패 silent | ✅ Done |
| BUG-05 | 🔵 P2 | `server/modules/lifecycle.ts` | 메신저 수신자 시작 실패 시 예외처리 없음 | ✅ Done |
| BUG-06 | 🟡 P1 | `server/modules/workflow/agents/providers/stream-tools.ts` | 스트림 버퍼 2KB 고정 → 장문 응답에서 서브태스크 손실 (8KB로 확장) | ✅ Done |

> UI 기능 감사 이력 (Workflow Builder · Agent CLI · Flow Graph): **`docs/progress.md` → "2026-03-16 UI 기능 감사" 섹션**

| Code | Severity | File | Issue | Status |
|------|----------|------|-------|--------|
| WB-01 | ❌ 미구현 | `src/components/workflow-builder/WbRunModal.tsx` | Condition 노드 조건 평가 없음 — 항상 모든 하위 에이전트 실행 | ✅ Done |
| WB-02 | 🟡 P1 | `src/components/workflow-builder/WbRunModal.tsx` | 의존성 설정 실패 시 롤백 없음 — 고아 Task 생성 | ✅ Done |
| WB-03 | 🔵 P2 | `src/components/workflow-builder/WbRunModal.tsx` | Trigger 타입 정보 Task에 미전달 | ✅ Done |
| FG-01 | ❌ TODO | `src/components/flow-graph/useFlowLayout.ts` | Delegation 엣지 명시적 TODO — SubTask 데이터 미전달 | ✅ Done |
| FG-02 | 🟡 P1 | `src/components/flow-graph/AgentFlowGraph.tsx` | 노드 클릭 → 에이전트 상세 패널 콜백 미연결 | ✅ Done |
| FG-03 | 🔵 P2 | `src/components/flow-graph/useFlowLayout.ts` | 50+ 에이전트 시 3열 고정 레이아웃 극단 축소 | ✅ Done |
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
- **Custom Feature Platform**: No-code feature/app creation via templates (7 types) or AI natural language → esbuild TSX→IIFE bundle → sandbox iframe rendering
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

### Image Studio (Phase 15)
- **txt2img + inpaint**: DALL-E 3/2 via `api_providers` encrypted key, Photoshop-style layout (240px panel + canvas), MaskCanvas brush editor
- **Gallery**: auto-fill grid, right detail panel, prompt search, provider filter, download/delete
- **Task integration**: link generation to tasks, TaskCard "Generated Images" section (3-col thumbnail grid)
- **API**: `POST /api/image-studio/generate`, `GET /api/image-studio/gallery`, image streaming, `GET /api/image-studio/task/:id/images`

### Cross-Project Handoff (Phase 16)
- **Deliverable checklist**: `project_deliverable_checks` table, progress bar + checkbox UI in ProjectInsightsPanel
- **Source linking**: `project_sources` table (max 5, circular-ref guard), ProjectEditorPanel source dropdown
- **Context injection**: `buildSourceContextBlock()` — completed deliverables from source projects auto-injected into task prompt (`execution-run.ts`)

### Project Folders (Phase 17)
- **Folder container**: `project_folders` table, `FolderDesktopIcon` (stacked SVG + badge + context menu), `FolderWindow` (project grid + add/eject)
- **Disk move**: `fs.renameSync` on folder rename (non-fatal, returns `moved_on_disk` flag)
- **Desktop**: right-click "Move to Folder" submenu, drag-to-folder drop event

### Agent CLI (Phase 18)
- **REPL → CLI rename**: `WindowType "repl"→"cli"`, Dock icon, desktop icon, MissionControl label all updated
- **CliSession Map**: per-agent shell sessions, `[agent @ project] $` prompt, `:switch`/`:status`/`:history`/`:reset` commands
- **Entry points**: AgentDetailPanel `>_` button, FlowGraph node right-click "Open CLI"

### Figma Integration
- **Task attach**: Figma URL field in CreateTaskModal, parsed + previewed in `FigmaUrlSection.tsx`
- **Context fetch**: `server/modules/figma/context-fetcher.ts` — Figma REST API → `buildFigmaContextBlock()`
- **Prompt injection**: `execution-run.ts` auto-injects Figma context block when task has `figma_url`
- **Auth**: Figma PAT stored in `synapse_connections` (platform='figma'), managed in Settings → Synapse

### Design Workflow Template
- **4-node chain**: Design Analysis → Component Design → Implementation → Code Review
- **Template picker**: `TemplatePickerModal.tsx` with `figma_required: true` Figma URL field
- **Run**: `WbRunModal.tsx` injects Figma URL into first agent task, auto-creates dependency chain

### Quality
- pino structured logging, 186 server tests + 43 frontend tests all passing

### Project Management
- **Cost summary**: `GET /api/projects/:id/cost-summary` — per-project USD cost, token in/out, agent breakdown, workflow breakdown; displayed in `ProjectInsightsPanel`
- **Project templates**: 4 built-in templates (Web App, Research Report, Video Production, Data Analysis) auto-seed objectives + gates on project creation
- **`context_hint` refactoring**: `workflow_pack_key → context_hint` dual-write migration across 16+ server files

---

## 8. Completion History

> Full per-task implementation details are in `docs/progress.md`. Summary only below.

### All Tasks Complete — Summary

| Category | Items | Status |
|----------|-------|--------|
| 🔴 P0 — Security & Critical Bugs | P0-1~5 (participant filter, OAuth, rate limit, WS limit, env validation) | ✅ All Done |
| 🟠 P1 — Short-term | P1-1~6 (Zustand, pack key bridge, messenger retry, DB migrations, memory leak, pino) | ✅ All Done |
| 🟡 P2 — Medium-term | P2-1~8 (Flow Graph, cost tracking, FIFO queue, DB batching, timeline, handoff, persona, WS opt) | ✅ All Done |
| 🔵 P3 — Long-term | P3-1~6 (Split-Pane, Workflow Builder, Keyboard UX, tests, anomaly index, Slack) | ✅ All Done |
| 🔐 Security Patches | S1~S13 (path traversal, OAuth bypass, ReDoS, error disclosure, stderr broadcast) | ✅ All Done |
| 📦 Feature Phases | Ph5, Ph13~18, Figma, CLI hybrid A~E, Image Studio, Folders, Hooks filter | ✅ All Done |

### Key Milestone Dates

| Date | Milestone |
|------|-----------|
| 2026-03-14 | All P0/P1/P2/P3 tasks + security patches S1~S13 complete |
| 2026-03-14 | Zustand, Flow Graph, Workflow Builder, Cost tracking, Timeline, Persona all live |
| 2026-03-15 | Architecture audit complete (ARCHITECTURE-AUDIT-2026-Q1.md) |
| 2026-03-16 | Pipeline audit BUG-01~06, WB-01~03, FG-01~03 all resolved |
| 2026-03-17 | Workflow cron scheduling + WbScheduleModal complete |
| 2026-03-20 | Figma integration + Design Workflow Template complete |
| 2026-03-22 | Project Folders (Phase 17) complete |
| 2026-03-23 | CLI hybrid execution Phase A~E complete; PTY terminal live |
| 2026-03-19 | CliWindow UX overhaul + LibraryGuideWindow + QuickCreateAgentModal |
| 2026-03-19 | Hooks: project-only filter + FloatingWindow + scope lock + 5 default seeds |
| 2026-03-19 | Custom Features dev server 실행 버그 6건 수정 (ANSI·pnpm·port·IIFE·ready·taskkill) |
| 2026-03-19 | Custom Features 휴지통 시스템: 복원/영구삭제 + 서버 파일 정리 + stop-all-dev 엔드포인트 |

---

## 9. Document Map

| Document | Contents |
|---|---|
| [`docs/OVERVIEW.md`](./OVERVIEW.md) | **This document** — full overview + completion history |
| [`docs/progress.md`](./progress.md) | Development progress tracker — detailed work log (all phases, bug fixes, recent work) |
| [`docs/specs/api.md`](./specs/api.md) | Full REST API specification (v1.6.0) |
| [`docs/architecture/schema-erd.md`](./architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md`](./architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Comprehensive architecture + backend audit (2026-Q1) |
| [`docs/design/DESIGN.md`](./design/DESIGN.md) | UI CSS variables + component patterns |
| [`docs/design/UI-SCREENS.md`](./design/UI-SCREENS.md) | Full screen & modal specification |
| [`docs/design/MACOS-UX-IMPROVEMENTS.md`](./design/MACOS-UX-IMPROVEMENTS.md) | macOS UX 개선 스펙 (MX-01~07: 리사이즈·토스트·Cmd+Tab·스냅·배지·전체화면·컨텍스트메뉴) |

> **Removed docs (all implementation complete, content consolidated into progress.md / OVERVIEW.md):**
> `strategy/bigger-ide-vision.md`, `strategy/agent-performance-audit.md`, `strategy/cli-hybrid-execution.md`, `architecture/SYSTEM-STRUCTURE-MAP.md`

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
