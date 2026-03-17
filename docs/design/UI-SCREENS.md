# AgentDesk — UI Screens & Interaction Specification

> **Last updated:** 2026-03-15 (6 macOS UX features added: Spotlight, Jiggle, QuickLook, MissionControl, Notification Slide Panel, App Menu)
> Menu Bar + Desktop Icons + Widgets + Dock + App Windows structure
> **Design reference:** `DESIGN.md` (CSS variables)

---

## Design Philosophy — macOS Hybrid

All screens follow the **dual-layer principle**:

| Layer | Role | Style |
|-------|------|-------|
| **Chrome** (container) | Windows, widgets, cards, menu bar | `borderRadius: 10`, `blur(12px)`, traffic lights |
| **Content** (inner) | Buttons, inputs, toasts, badges | `borderRadius: 0`, `font-mono`, CLI sigil language |

- **Menu Bar:** `backdropFilter: blur(12px)` — macOS Menu Bar style
- **App Windows:** `borderRadius: 10`, traffic light decorations — macOS window feel
- **Widgets:** `borderRadius: 10`, blur — glass panel feel
- **Brand color:** Amber `--th-accent` — live indicator, active state, primary CTA
- **Global font:** `var(--th-font-mono)` (JetBrains Mono) — no sans-serif

---

## Overall Structure — macOS Desktop OS

AgentDesk is designed using the macOS desktop metaphor. There is no sidebar.

```
┌─────────────────────────────────────────────────────────────────┐
│  AgentDesk  [▾ Project]                    $2.14  🔔  14:32     │  ← Menu Bar
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │  👤  │  │  📁  │  │  ▶   │  │  ⚡  │  │  📋  │  │  💬  │  │  >_  │  │  ← Desktop Icons
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│  Agent     Create    Run       Workflow   Library    Chat       Agent    │
│  Settings  Project   Task      Builder                          REPL     │
│                                                                  │
│  ┌─ Agents ──── [─][×]┐   ┌─ Tasks ───── [─][×]┐              │
│  │  (widget)           │   │  (widget)           │  ← Widgets  │
│  └────────────────────┘   └────────────────────┘              │
│                                                                  │
│                    [+ Add Widget]                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│      ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐              │  ← Dock
│      │  ⚡  │    │  📚  │    │  ⚙   │    │  💬  │              │
│      └──────┘    └──────┘    └──────┘    └──────┘              │
│     Workflow    Library    Settings     Chat                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Menu Bar

**File:** `src/components/MenuBar.tsx`

Always pinned to the top. Acts as the macOS Menu Bar.

| Area | Element | Role |
|------|---------|------|
| Left | **AgentDesk button** | **App menu dropdown** (wallpaper/widgets/shortcuts/Mission Control) |
| Center | Project selector dropdown | Switch current project |
| Right | CLI cost summary | Today / this month cost |
| Right | Notification bell 🔔 | **Slide panel** (320px, enters/exits from the right) |
| Right | Clock | Current time |

**App Menu Items:**
- About AgentDesk (version)
- Change Wallpaper... → Open WallpaperPicker
- Add Widget... → Open WidgetPicker
- Keyboard Shortcuts → Open KeyboardShortcutsGuide
- Mission Control (`Ctrl ↑`) → MissionControl overview

---

## 2. Desktop Icons

**File:** `src/components/desktop/DesktopIcon.tsx`

Placed on the desktop by default. Can be repositioned by dragging. Click to open the corresponding window/modal.

**Jiggle Mode:** Long-press on empty desktop for 600ms → icons jiggle + red ✕ badge appears on project icons.
Click ✕ to delete the project. Press Esc or click the desktop to exit.

**System App Icons (non-deletable):**

| Icon | Label | Opens on Click |
|------|-------|----------------|
| 👤 | Agent Settings | AgentManager window |
| 📁 | Create Project | ProjectCreateModal |
| ▶ | Run Task | CreateTaskModal |
| ⚡ | Workflow Builder | Workflow window |
| >_ | Agent REPL | REPL window |

**Project Folder Icons (deletable: true):**
- Active project: 📂, inactive: 📁
- Click: Switch to that project + select it
- Space (after selecting): Open Quick Look panel
- Right-click: Quick preview / switch project / delete project
- Click ✕ badge in Jiggle Mode: Delete immediately

> Right-click menu: Rename / Remove / Rearrange desktop

---

## 3. Widget System

**Files:** `src/components/desktop/Widget.tsx`, `src/components/desktop/WidgetPicker.tsx`

Users add widgets via the `[+ Add Widget]` button. Freely draggable, resizable, and closable.
Multiple widgets can be placed simultaneously. Position/size is saved in localStorage.

### Widget List

#### 3-1. Agents Widget
**File:** `src/components/desktop/widgets/AgentsWidget.tsx`
**Replaces:** Legacy Heartbeat Monitor

- Real-time agent status list (working/idle/error/review)
- Click an agent row → AgentDetail slide panel (right)
- Real-time updates via WebSocket `agent_status` events

#### 3-2. Tasks Widget
**File:** `src/components/desktop/widgets/TasksWidget.tsx`
**Replaces:** Legacy Task Board

- List of running tasks (mini kanban view or list)
- Click a task row → TerminalPanel drawer (bottom)
- `[+ New Task]` button → CreateTaskModal

#### 3-3. Alerts Widget
**File:** `src/components/desktop/widgets/AlertsWidget.tsx`
**Replaces:** Legacy alert banners

- Items requiring attention: errors, pending approvals, timeouts
- Click an item → DecisionInboxModal

#### 3-4. CLI Cost Widget
**File:** `src/components/desktop/widgets/CliCostWidget.tsx`
**Replaces:** Legacy CLI Usage (summary)

- Today / this month cost
- Number of running CLI processes
- Click → Settings window > CLI tab (details)

#### 3-5. Flow Graph Widget
**File:** `src/components/desktop/widgets/FlowGraphWidget.tsx`
**Replaces:** Legacy Flow Graph

- Mini SVG visualization of agent relationships (reuses `AgentFlowGraph`)
- Zoom/pan, click node → AgentDetail panel

---

## 4. Dock

**File:** `src/components/desktop/Dock.tsx`

Always pinned to the bottom. 4 app icons.

| Icon | App | Window Tabs |
|------|-----|-------------|
| ⚡ | Workflow | Workflow Builder / Scheduled Tasks |
| 📚 | Library | Skills / Agent Rules / Memory / Hooks / Deliverables |
| ⚙ | Settings | General / API / OAuth / CLI / Gateway / Data / Project Types / Agents |
| 💬 | Chat | Direct / Group / Announcement |

- Click to open the corresponding app window (if already open, brings it to the front)
- Running apps display an amber dot below their icon

---

## 5. App Windows (opened by clicking the Dock)

All windows use the **traffic lights + close button** style. Can be dragged to reposition.
Multiple windows can be open simultaneously. Managed via `uiStore.openWindows: Set<WindowType>`.

### 5-1. Workflow Window (⚡)

**File:** `src/components/windows/WorkflowWindow.tsx`

```
[  Workflow Builder  |  Scheduled Tasks  |  Composition  ]
```

**Workflow Builder Tab**
- **File:** `src/components/workflow-builder/WorkflowBuilder.tsx`
- **Dependency:** `@xyflow/react` v12
- Visual design of node-based agent pipelines
- Node types: `trigger` / `agent` / `gate` / `condition`
- Auto-saved to localStorage

**Scheduled Tasks Tab**
- **File:** `src/components/scheduled-tasks/ScheduledTasksPanel.tsx`
- List of recurring and scheduled tasks
- Displays next run time, frequency, and assigned agent

**Composition Tab** _(added 2026-03-15)_
- **File:** `src/components/agent-composition/AgentCompositionBuilder.tsx`
- **Dependency:** `@xyflow/react` v12
- Drag-and-drop composition builder based on agent roles
- Node: `CompAgentNode` — top border color differentiated by role
- Run: `AgentCompositionRunModal` — creates multiple tasks including dependencies
- Save/load templates: `/api/composition-templates` CRUD

---

### 5-2. Library Window (📚)

**File:** `src/components/windows/LibraryWindow.tsx`
**Project context:** Filtered by the selected `project_id`

```
[  Skills  |  Agent Rules  |  Memory  |  Hooks  |  Deliverables  ]
```

**Skills Tab** — `src/components/SkillsLibrary.tsx`
- Agent learning commands and tool list (provider/repo/agent scope)
- Embedded modals: `CustomSkillModal`, `LearningModal`, `ClassroomOverlay`

**Agent Rules Tab** — `src/components/AgentRulesLibrary.tsx`
- Agent behavior rules (global/dept/agent/project scope)
- Embedded modals: `RuleFormModal`, `RuleLearningModal`, `RuleHistoryPanel`

**Memory Tab** — `src/components/MemoryLibrary.tsx`
- Agent memory entries, 5-minute TTL cache
- Embedded modals: `MemoryFormModal`, `MemoryLearningModal`

**Hooks Tab** — `src/components/HooksLibrary.tsx`
- Task event trigger scripts (pre/post/on-error)
- Embedded modals: `HookFormModal`, `HookLearningModal`, `HookHistoryPanel`

**Deliverables Tab** — `src/components/deliverables/Deliverables.tsx`
- List of task output artifacts, filter and download by file type
- Embedded modal: `TextPreviewModal`

---

### 5-3. Settings Window (⚙)

**File:** `src/components/windows/SettingsWindow.tsx`

```
[  General  |  API  |  OAuth  |  CLI  |  Gateway  |  Data  |  Project Types  |  Agents  ]
```

| Tab | File | Content |
|-----|------|---------|
| General | `settings/GeneralTab.tsx` | Language, theme, default settings |
| API | `settings/ApiTab.tsx` | Provider and model configuration |
| OAuth | `settings/OAuthTab.tsx` | OAuth device flow account connection |
| CLI | `settings/CliTab.tsx` | CLI status, path, usage details |
| Gateway | `settings/gateway-settings/` | Telegram, Discord, Slack integration |
| Data | `settings/DataTab.tsx` | DB backup and reset |
| Project Types | `settings/CategoriesTab.tsx` | Project category management |
| Agents | `TeamPageView.tsx` → `AgentManager` | Agent and department management |

---

### 5-4. Chat Window (💬)

**File:** `src/components/windows/ChatWindow.tsx`

```
[  Direct  |  Group  |  Announcement  ]
```

- **Direct:** 1:1 chat with a specific agent
- **Group:** Group conversation with multiple agents (agent tags and mentions)
- **Announcement:** Team-wide announcements

---

### 5-5. AgentManager Window (👤 icon)

**File:** `src/components/windows/AgentManagerWindow.tsx`
**Trigger:** Click desktop icon 👤

- Agent card grid (grouped by department)
- Agent status badges (idle / working / error)
- `[+ Agent]` `[+ Department]` buttons
- Embedded modals: `AgentFormModal`, `DepartmentFormModal`

---

### 5-6. REPL Window (>_ icon)

**File:** `src/components/windows/ReplWindow.tsx`
**Trigger:** Click desktop icon `>_`

An interactive shell for sending commands directly to an agent and receiving immediate responses, without creating a Task.
Acts as macOS Terminal.app.

```
┌─────────────────────────────────────────────────────┐
│ ◉ ◎ ◎  Agent REPL            [▾ dev-01]   [─][×] │
│ ──────────────────────────────────────────────────  │
│ $ read src/auth/middleware.ts                        │
│ > Reading file... (342 lines)                       │
│ > Found: token expiry check missing on line 87      │
│                                                      │
│ $ fix the token expiry issue                        │
│ > Applying fix to src/auth/middleware.ts            │
│ > Done. Modified lines 87-93.                       │
│                                                      │
│ > _                                                  │
│ ──────────────────────────────────────────────────  │
│ [Select agent: dev-01 ▾]  [input_______________] [↵] │
└─────────────────────────────────────────────────────┘
```

Features:
- Agent selector dropdown (list of running agents)
- Enter command → execute immediately → stream results
- Command history (↑↓ keys)
- One-shot command execution without creating a Task
- Real-time streaming via WebSocket `cli_output`

---

## 6. Slide Panels & Drawers

Opened as a layer on top of the desktop when clicking an item in a widget or icon window.

### 6-1. AgentDetail Slide Panel
**File:** `src/components/agent-detail/AgentDetailPanel.tsx` _(구현 예정)_
**Design doc:** `docs/features/agent-detail-panel.md`
**Trigger:**
- AgentsWidget 에이전트 행 클릭
- FlowGraph Widget 에이전트 노드 클릭
- AgentManager 에이전트 카드 클릭 (선택사항)

**위치:** `position: fixed`, 우측 슬라이드, 메뉴바(28px) ~ Dock(48px), 너비 360px, `z-index: 300`
**애니메이션:** `translateX(360px → 0)` 200ms ease-out / 닫기 160ms ease-in
**상태:** `uiStore.selectedAgentId` (이미 존재) — 같은 에이전트 재클릭 시 토글 닫기, ESC 닫기

**섹션 구성 (단일 스크롤, 탭 없음):**
1. **헤더** — 아바타, 이름, 역할, 상태 뱃지, CLI 프로바이더, 부서
2. **현재 태스크** — 제목, 경과 시간, 터미널 바로가기 (`current_task_id` 없으면 숨김)
3. **스킬** — `/api/skills/available?agent_id=` (뱃지 3개 + 초과 시 +N)
4. **규칙** — `/api/agent-rules?agent_id=&limit=5` (scope 뱃지)
5. **메모리** — `/api/memory?agent_id=&limit=5`
6. **최근 태스크** — `/api/tasks?agent_id=&limit=3` (✓/✗ 상태)
7. **오늘 비용** — `/api/agents/:id/cost-summary` (토큰 수, USD, 성공률)

### 6-2. TerminalPanel Drawer
**File:** `src/components/TerminalPanel.tsx`
**Trigger:** Click a task row in the Tasks widget

Bottom drawer. Tabs: Terminal (real-time stdout) / Minutes (meeting notes)
Features: Thinking Block, log search/filter, Intervention input, Progress Hints

---

## 7. Modals & Overlays (36)

Centrally rendered in `src/app/AppOverlays.tsx`. Can be triggered from any window or widget.

### Communication

| # | Component | Trigger |
|---|-----------|---------|
| 7-1 | `ChatPanel` | AgentDetail > Chat tab |
| 7-2 | `GroupChatPanel` | Chat window > Group tab |
| 7-3 | `DecisionInboxModal` | Alerts widget click / notification bell |

### Agent Management

| # | Component | Trigger |
|---|-----------|---------|
| 7-4 | `AgentFormModal` | AgentManager window `[+ Agent]` |
| 7-5 | `DepartmentFormModal` | AgentManager window `[+ Department]` |
| 7-6 | `AgentStatusPanel` | Tasks widget → `onOpenAgentStatus` |

### Task Management

| # | Component | Trigger |
|---|-----------|---------|
| 7-7 | `CreateTaskModal` | Desktop icon ▶ / Tasks widget `[+ New Task]` |
| 7-8 | `BulkHideModal` | Tasks widget bulk hide |
| 7-9 | `DiffModal` | On task change conflict detection |

### Reports

| # | Component | Trigger |
|---|-----------|---------|
| 7-10 | `TaskReportPopup` | Click a completed task in the Tasks widget |
| 7-11 | `ReportHistory` | `onOpenReportHistory` |

### Project Management

| # | Component | Trigger |
|---|-----------|---------|
| 7-12 | `ProjectCreateModal` | Desktop icon 📁 |
| 7-13 | `ProjectManagerModal` | Menu bar project dropdown → Manage |

### Library Create / Learn Modals

| # | Modal | File | Access |
|---|-------|------|--------|
| 7-14 | CustomSkillModal | `skills-library/CustomSkillModal.tsx` | Library > Skills |
| 7-15 | LearningModal (Skills) | `skills-library/LearningModal.tsx` | Library > Skills |
| 7-16 | ClassroomOverlay | `skills-library/ClassroomOverlay.tsx` | Library > Skills |
| 7-17 | RuleFormModal | `agent-rules/RuleFormModal.tsx` | Library > Agent Rules |
| 7-18 | RuleLearningModal | `agent-rules/RuleLearningModal.tsx` | Library > Agent Rules |
| 7-19 | RuleHistoryPanel | `agent-rules/RuleHistoryPanel.tsx` | Library > Agent Rules |
| 7-20 | MemoryFormModal | `memory/MemoryFormModal.tsx` | Library > Memory |
| 7-21 | MemoryLearningModal | `memory/MemoryLearningModal.tsx` | Library > Memory |
| 7-22 | HookFormModal | `hooks/HookFormModal.tsx` | Library > Hooks |
| 7-23 | HookLearningModal | `hooks/HookLearningModal.tsx` | Library > Hooks |
| 7-24 | HookHistoryPanel | `hooks/HookHistoryPanel.tsx` | Library > Hooks |

### Settings & Integrations

| # | Modal | File | Access |
|---|-------|------|--------|
| 7-25 | CategoryFormModal | `category-editor/CategoryFormModal.tsx` | Settings > Project Types |
| 7-26 | ChatEditorModal | `settings/gateway-settings/ChatEditorModal.tsx` | Settings > Gateway |
| 7-27 | ChannelGuideModal | `settings/gateway-settings/ChannelGuideModal.tsx` | Settings > Gateway |
| 7-28 | GitHubImportPanel | `GitHubImportPanel.tsx` | ProjectManagerModal |
| 7-29 | TextPreviewModal | `deliverables/TextPreviewModal.tsx` | Library > Deliverables |

### Global Utilities

| # | Component | Trigger |
|---|-----------|---------|
| 7-30 | `CommandPalette` | `Ctrl+Shift+K` |
| 7-31 | `KeyboardShortcutsGuide` | `?` key |
| 7-32 | `NotificationCenter` | Menu bar 🔔 |
| 7-33 | `ConfirmDialog` | On delete or warning |

---

## 8. Legacy 14 Menu Items → New Location Mapping (all preserved)

| Legacy Menu | New Location | How to Access |
|-------------|-------------|---------------|
| Dashboard | Desktop itself | Always visible |
| Agents & Departments | Desktop icon 👤 | Click → AgentManager window |
| Heartbeat Monitor | Agents widget | `[+ Add Widget]` → select Agents |
| Flow Graph | Flow Graph widget | `[+ Add Widget]` → select Flow Graph |
| Task Board | Tasks widget | `[+ Add Widget]` → select Tasks |
| Scheduled Tasks | Dock ⚡ Workflow window tab | Workflow window → Scheduled tab |
| Deliverables | Dock 📚 Library window tab | Library window → Deliverables tab |
| Workflow Builder | Desktop icon ⚡ + Dock ⚡ | Both open the same window |
| Skills | Dock 📚 Library window tab | Library window → Skills tab |
| Agent Rules | Dock 📚 Library window tab | Library window → Rules tab |
| Memory | Dock 📚 Library window tab | Library window → Memory tab |
| Hooks | Dock 📚 Library window tab | Library window → Hooks tab |
| CLI Usage | CLI Cost widget + Settings > CLI | Widget (summary) / Settings (details) |
| Project Types | Dock ⚙ Settings window tab | Settings window → Project Types tab |
| Settings | Dock ⚙ | Click → Settings window |

---

## 9. Core UI Architecture Patterns

### App Structure

```
App.tsx
  └── Desktop.tsx              ← Desktop (menu bar + icons + widgets + Dock)
        ├── MenuBar.tsx
        ├── DesktopIcons.tsx
        ├── WidgetLayer.tsx    ← Widget drag/resize layer
        ├── Dock.tsx
        └── WindowLayer.tsx   ← App window overlay layer
              ├── WorkflowWindow.tsx
              ├── LibraryWindow.tsx
              ├── SettingsWindow.tsx
              ├── ChatWindow.tsx
              └── AgentManagerWindow.tsx
  └── AppOverlays.tsx          ← Modal layer (highest z-index)
  └── SlidePanels.tsx          ← AgentDetail, TerminalPanel layer
```

### State Management

```typescript
// uiStore.ts
openWindows: Set<"workflow"|"library"|"settings"|"chat"|"agent-manager"|"repl">
widgetLayout: WidgetConfig[]    // widget position, size, visibility
desktopIconLayout: IconConfig[] // icon positions
selectedAgentId: string | null  // AgentDetail panel
openTaskId: string | null       // TerminalPanel drawer
```

### Window Management Pattern
- Multiple windows can be open simultaneously
- Even when windows are open, the desktop (widgets) continue to update in real time
- Close window: `×` button or `Escape`

### Widget Persistence
Widget layout (position, size, list) is saved in `localStorage`.
Supports different widget configurations per project.

### Project Context Filtering
Library tabs (Skills/Rules/Memory/Hooks) filter server data by the selected `project_id`:
```
GET /api/agent-rules?project_id=<id>
```

### Real-time WebSocket

| Event | Updates |
|-------|---------|
| `agent_status` | Agents widget, Flow Graph widget |
| `task_update` | Tasks widget, Alerts widget |
| `cli_output` | TerminalPanel drawer |
| `decision_request` | Alerts widget → DecisionInboxModal |

### Internationalization
Supports 4 languages: Korean, English, Japanese, Chinese.

---

## 10. Quick File Reference

```
src/
├── App.tsx
├── components/
│   ├── desktop/
│   │   ├── Desktop.tsx              # Desktop root
│   │   ├── MenuBar.tsx              # Top menu bar
│   │   ├── DesktopIcon.tsx          # Desktop icons
│   │   ├── Dock.tsx                 # Bottom Dock
│   │   ├── Widget.tsx               # Widget common container
│   │   ├── WidgetPicker.tsx         # Widget add selection popup
│   │   └── widgets/
│   │       ├── AgentsWidget.tsx     # Replaces Heartbeat Monitor
│   │       ├── TasksWidget.tsx      # Replaces Task Board
│   │       ├── AlertsWidget.tsx     # Attention alerts
│   │       ├── CliCostWidget.tsx    # Replaces CLI Usage
│   │       └── FlowGraphWidget.tsx  # Replaces Flow Graph
│   ├── windows/
│   │   ├── WorkflowWindow.tsx       # ⚡ Dock app window
│   │   ├── LibraryWindow.tsx        # 📚 Dock app window
│   │   ├── SettingsWindow.tsx       # ⚙ Dock app window
│   │   ├── ChatWindow.tsx           # 💬 Dock app window
│   │   ├── AgentManagerWindow.tsx   # 👤 icon app window
│   │   └── ReplWindow.tsx           # >_ icon app window (Agent REPL)
│   ├── flow-graph/                  # AgentFlowGraph (reused in widget)
│   ├── workflow-builder/            # WorkflowBuilder (@xyflow/react)
│   ├── scheduled-tasks/             # ScheduledTasksPanel
│   ├── taskboard/                   # CreateTaskModal, BulkHideModal
│   ├── deliverables/                # Deliverables, TextPreviewModal
│   ├── agent-manager/               # AgentFormModal, DepartmentFormModal
│   ├── skills-library/              # Skills + learning modals
│   ├── agent-rules/                 # Rules + learning modals
│   ├── memory/                      # Memory + learning modals
│   ├── hooks/                       # Hooks + learning modals
│   ├── settings/                    # Settings tabs
│   └── ui/                          # Shared components (ConfirmDialog, etc.)
└── store/
    ├── uiStore.ts                   # openWindows, widgetLayout, desktopIconLayout, wallpaper, jiggleMode, missionControlOpen
    ├── agentStore.ts
    ├── taskStore.ts
    └── projectStore.ts
```

---

## macOS UX Feature Specifications (6 features)

### Feature 1 — Spotlight (Command Palette)

**File:** `src/components/CommandPalette.tsx`

| Item | Value |
|------|-------|
| Trigger | `Ctrl+Shift+K` or `Cmd+K` |
| Size | 640px, centered |
| Search input | Height 64px, font 18px, 🔍 icon |
| Features | Search agents/tasks/projects/views, recent items, keyboard navigation |
| Background | `rgba(0,0,0,0.55)` + `backdropFilter: blur(6px)` |
| Close | Esc or click outside |

---

### Feature 2 — Icon Jiggle Mode

**Files:** `src/components/desktop/DesktopIcon.tsx`, `src/store/uiStore.ts`

| Item | Value |
|------|-------|
| Trigger | Long-press on empty desktop for 600ms |
| State | `uiStore.jiggleMode: boolean` |
| Animation | `@keyframes jiggle { 0%,100%{rotate(-2.5deg)} 50%{rotate(2.5deg)} }` |
| Delete badge | Red ✕ circle (18px) at top-left of project icons; click to delete project |
| System icons | Jiggle animation only, no ✕ (non-deletable) |
| Exit | Esc key or click desktop |

---

### Feature 3 — Quick Look

**File:** `src/components/desktop/QuickLook.tsx`

| Item | Value |
|------|-------|
| Trigger | Click a project icon then press `Space`, or right-click → Quick Preview |
| Size | 420px, fixed at screen center |
| Content | Project name, core_goal, project_path, task_count, last_used_at, agent avatars |
| Style | Glass panel `rgba(22,22,28,0.96)` + `blur(32px)` |
| Close | Esc, close button, or click outside |

---

### Feature 4 — Mission Control

**File:** `src/components/desktop/MissionControl.tsx`

| Item | Value |
|------|-------|
| Trigger | `Ctrl+↑` or AgentDesk menu → Mission Control |
| State | `uiStore.missionControlOpen: boolean` |
| Content | Section 1: open window card grid / Section 2: active widget card grid |
| Style | Full-screen overlay `rgba(0,0,0,0.65)` + `blur(8px)` + `@keyframes mcFadeIn` |
| Card click | Activate that window + close Mission Control |
| Close | Esc or click background |

---

### Feature 5 — Notification Center Slide Panel

**File:** `src/components/NotificationCenter.tsx`

| Item | Value |
|------|-------|
| Trigger | Click the bell icon in the menu bar |
| Position | `position: fixed, top: 44px, right: 0, width: 320px, bottom: 80px` |
| Enter animation | `translateX(0)` ← `translateX(320px)`, `transition: 0.28s cubic-bezier(0.4,0,0.2,1)` |
| Background | `rgba(18,18,22,0.96)` + `backdropFilter: blur(20px)` |
| Background overlay | Semi-transparent `rgba(0,0,0,0.3)`, click to close |
| Features | Date groups (Today/Yesterday/Older), per-section unread counts, hover quick-actions (mark-read ✓, delete ×), type filter badges with unread counts, bulk "Clear N read" link, `hideRead` defaults to false |
| Delete animation | `translateX(320px)` + `opacity: 0`, `transition: 0.25s` |

---

### Feature 6 — MenuBar App Menu

**File:** `src/components/desktop/MenuBar.tsx`

| Item | Value |
|------|-------|
| Trigger | Click the "AgentDesk" button at the top-left of the menu bar |
| State | `appMenuOpen: boolean` (local state) |
| Dropdown position | `position: absolute, top: calc(100% + 6px), left: 0` |
| Style | `rgba(20,20,24,0.97)` + `blur(20px)`, `borderRadius: 10` |
| Items | About (version) / Change Wallpaper / Add Widget / Keyboard Shortcuts / ↓ Export Data / Mission Control (Ctrl↑) |
| Close | Select an item or click outside |

---

## Complete Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` / `Cmd+K` | Spotlight (CommandPalette) |
| `Ctrl+↑` | Mission Control |
| `Space` (after selecting a project) | Quick Look |
| `Esc` | Exit Jiggle / Close Quick Look / Close Mission Control |
| Long-press empty screen 600ms | Enter Jiggle Mode |
| `g w` | Toggle Workflow window |
| `g l` | Toggle Library window |
| `g s` | Toggle Settings window |
| `g c` | Toggle Chat window |
| `g a` | Toggle Agent Manager |
| `g e` | Toggle REPL |
| `?` | Keyboard shortcuts guide |

---

## New Modals / Panels (v1.3.0)

### WbScheduleModal — Workflow Cron Scheduler

**File:** `src/components/workflow-builder/WbScheduleModal.tsx`

| Item | Value |
|------|-------|
| Trigger | ⏰ toolbar button in WorkflowBuilder (only when a template is loaded) |
| Props | `templateId: string`, `workflowName: string`, `onClose: () => void` |
| Width | 560px centered modal, `backdrop-blur(20px)` |
| Preset chips | 6 cron presets: every 5 min / hourly / daily 9am / midnight / Mon 9am / weekdays 9am |
| Custom input | Raw cron expression field with validation error display |
| Schedule list | Shows `cron_expr` (amber monospace), enabled badge (green/gray), next/last run timestamps |
| Row actions | Toggle (⏸/▶) to enable/disable, × to delete |
| API calls | `GET/POST/PUT/DELETE /api/workflow-schedules` |

---

### AgentPerformanceDashboard — Library → Performance Tab

**File:** `src/components/performance/AgentPerformanceDashboard.tsx`

| Item | Value |
|------|-------|
| Location | Library window → Performance tab |
| Filters | Project dropdown, days selector (7/14/30/60/90) |
| Sort buttons | Total / Done / Rate / Speed |
| Summary bar | Total agents, total tasks, completed tasks, overall success rate |
| Agent card | Emoji avatar, name, success rate badge (green ≥80% / amber ≥50% / red <50%), task counts grid, daily sparkline (SVG polyline) |
| Status bar | Stacked horizontal bar (done=green, review=amber, in_progress=blue, cancelled=muted) |
| Sparkline | SVG 60×28px, `polyline` + circles for data points |
| API call | `GET /api/agents/performance?project_id=&days=` |

---

### ExportModal — Data Export

**File:** `src/components/export/ExportModal.tsx`

| Item | Value |
|------|-------|
| Trigger | AgentDesk app menu → "↓ 데이터 내보내기 / Export Data..." |
| Width | 640px centered modal |
| Export types | 2×2 card grid: Tasks / Deliverables / Agents / Costs (icons + descriptions) |
| Format toggle | CSV / JSON toggle buttons |
| Filters | Project dropdown, status (tasks only), from/until date inputs |
| Download | Creates `<a download>` element, programmatic click, auto-cleanup via `URL.revokeObjectURL` |
| Footer | Selected type + format summary line |
| API call | `GET /api/export?type=&format=&project_id=&since=&until=` |
