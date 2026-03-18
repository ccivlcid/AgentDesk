# CLAUDE.md — AgentDesk Developer Guide

> This file is read by AI agents (Claude Code, Cursor, Copilot, etc.) when they first open this repo.
> For detailed specs, refer to the linked documents.

---

## 1. Project Summary

**AgentDesk** = A developer OS for running, monitoring, and controlling multiple AI agents simultaneously.
macOS desktop metaphor — menu bar + desktop icons + widgets + Dock + app windows.
Electron + React(Vite) frontend + Express/tsx backend + SQLite(better-sqlite3).

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

**UI structure:** No sidebar. macOS desktop OS — menu bar + desktop icons + widgets + Dock + app windows.

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
│   │   ├── Widget.tsx           ← Widget common container (drag · resize)
│   │   ├── QuickLook.tsx        ← Project quick-preview panel (Space key)
│   │   ├── MissionControl.tsx   ← All windows/widgets overview (Ctrl+↑)
│   │   ├── WallpaperPicker.tsx  ← Wallpaper selector (10 gradients)
│   │   └── widgets/             ← AgentsWidget, TasksWidget, AlertsWidget, CliCostWidget, FlowGraphWidget,
│   │                               LocalLlmWidget, SynapseWidget, ImageStudioWidget
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
│   └── uiStore.ts               ← openWindows(Set), widgetLayout, desktopIconLayout, wallpaper, jiggleMode, missionControlOpen
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

### 4-1. Add a new widget

| # | File | Action |
|---|------|--------|
| 1 | `src/components/desktop/widgets/` | Create new widget component |
| 2 | `src/components/desktop/WidgetPicker.tsx` | Add entry to widget list |
| 3 | `src/store/uiStore.ts` | Add new widget ID to `widgetLayout` type |

### 4-2. Add a new desktop icon

| # | File | Action |
|---|------|--------|
| 1 | Window/modal component | Create under `src/components/windows/` |
| 2 | `src/components/desktop/Desktop.tsx` | Add icon entry (label, icon, onClick) |
| 3 | `src/store/uiStore.ts` | Add window open action |

### 4-3. Add a tab to a Dock app window

| # | File | Action |
|---|------|--------|
| 1 | Tab component | Create under `src/components/` |
| 2 | Corresponding window file | `src/components/windows/` → add to tabs array |

### 4-4. Add a new Dock app

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
| **App Menu** | Click "AgentDesk" text | `MenuBar.tsx` (wallpaper / widgets / shortcuts / Mission Control) |

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

1. **APPEND only** to `server/modules/bootstrap/schema/versioned-migrations.ts`
2. **ID format**: `YYYY-MM-DD-NNN-short-description` (zero-padded, chronological)
3. **Last known ID**: `2026-03-22-002-projects-folder-id` → next: `2026-03-22-003-*` or `2026-03-23-001-*`
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
| [`docs/OVERVIEW.md`](docs/OVERVIEW.md) | Full architecture overview + completed milestones |
| [`docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md`](docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | Architecture & backend audit report |
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | Full screen & modal specifications (macOS desktop OS structure) |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS variables + component style rules |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API full specification (v1.6.0) |
| [`docs/strategy/bigger-ide-vision.md`](docs/strategy/bigger-ide-vision.md) | "Bigger IDE" strategy (Phase 1–3 complete) |
| [`docs/progress.md`](docs/progress.md) | Development progress log |
