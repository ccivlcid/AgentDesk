# AgentDesk Full-Stack Architecture

> Multi-LLM orchestrator for software development.
> Two audiences, two interfaces, one server.

---

## 1. Philosophy

```
GUI  →  Non-developers (PM, designers, managers)
         Visual management and monitoring of AI agent teams

TUI  →  Developers
         Code while directing AI agent teams from the terminal
```

Both interfaces share the same server, API, database, and PM orchestration engine.
A PM can create a project in GUI, a developer can add tasks in TUI — all in sync.

---

## 2. System Architecture

```
                ┌──────────────────────────────────────┐
                │          AgentDesk Server             │
                │        Express + WebSocket            │
                │          localhost:8790                │
                │                                       │
                │  ┌─────────────────────────────────┐  │
                │  │     PM Orchestration Engine      │  │
                │  │  kickoff → meeting → plan        │  │
                │  │  → assign → execute → review     │  │
                │  └─────────────────────────────────┘  │
                │                │                      │
                │  ┌─────────────┴─────────────────┐    │
                │  │         API Layer              │    │
                │  │   REST API (278 endpoints)     │    │
                │  │   WebSocket (real-time events) │    │
                │  │   Intent Interpreter (NEW)     │    │
                │  └─────────────┬─────────────────┘    │
                │                │                      │
                │  ┌─────────────┴─────────────────┐    │
                │  │       SQLite Database          │    │
                │  │   + tui_sessions (NEW)         │    │
                │  │   + tui_messages (NEW)         │    │
                │  └───────────────────────────────┘    │
                └──────────┬──────────┬─────────────────┘
                           │          │
          ┌────────────────┘          └────────────────┐
          │                                            │
┌─────────┴──────────┐                   ┌─────────────┴─────────┐
│   GUI Client        │                   │    TUI Client          │
│   React + Vite      │                   │    ink (React CLI)     │
│   localhost:8800     │                   │    Terminal            │
│                      │                   │                        │
│   FOR: Non-devs      │                   │   FOR: Developers      │
│   macOS Desktop UI   │                   │   OpenCode-style Chat  │
│   - Visual timeline  │                   │   - Natural language   │
│   - Click to manage  │                   │   - Plan/Build modes   │
│   - Settings forms   │                   │   - Real-time logs     │
│   - Agent cards      │                   │   - Slash commands     │
└──────────────────────┘                   └────────────────────────┘

GUI: button click → REST API
TUI: natural language → Intent Interpreter → REST API
```

---

## 3. Two Audiences

### GUI — Non-developers

| Who | How they use it |
|-----|-----------------|
| PM / Manager | Create projects, set goals, review progress visually |
| Designer | Monitor design tasks, view deliverables |
| Stakeholder | Check project status, approve decisions |

**Key GUI features:**
- macOS desktop metaphor (Dock, MenuBar, windows)
- Orchestration Timeline — visual agent lanes + progress bars
- Project folder windows — files, tasks, agents, terminal, git
- Settings — API providers, agent config, OAuth
- Decision Inbox — approve/revise/cancel with context

### TUI — Developers

| Who | How they use it |
|-----|-----------------|
| Backend dev | "Add error handling to the payment module" |
| Frontend dev | "Refactor the login page to use the new design system" |
| DevOps | "Set up CI/CD pipeline for the auth service" |
| Tech lead | Monitor all agent execution, review task results |

**Key TUI features:**
- Conversational interface — talk to PM agent in natural language
- Plan mode — PM plans but doesn't execute (preview)
- Build mode — PM plans + assigns + executes automatically
- Real-time log streaming via WebSocket
- Slash commands — /status, /tasks, /agents, /logs
- No context switching — stay in terminal while coding

---

## 4. Server Components

### 4-1. Existing (no changes needed)

| Component | Description |
|-----------|-------------|
| REST API | 278 endpoints — projects, tasks, agents, kickoff, etc. |
| WebSocket Hub | Real-time events: task_update, agent_status, kickoff_stage, cli_output |
| Auth | Cookie + Bearer + loopback auto-auth |
| PM Orchestration | kickoff → meeting → plan → assign → execute → review |
| SQLite | agents, projects, tasks, departments, etc. |

### 4-2. New components for TUI

#### A. Intent Interpreter

Converts developer's natural language into existing API calls.

```
POST /api/tui/interpret
Body: { text: string, session_id: string, project_id?: string }

"결제를 토스로 전환해줘"
  → { intent: "kickoff", params: { name: "결제 리팩토링", goal: "Stripe→토스" } }

"에러 핸들링 추가해줘"
  → { intent: "add_tasks", params: { directive: "에러 핸들링 추가" } }

"지금 상태 어때?"
  → { intent: "status_query", params: { scope: "all" } }
```

- Uses `callLlmOneShotAuto()` server-side (CLAUDE.md rule 0-7)
- Prompt: `prompts/system/tui-intent.md`
- Returns structured intent + PM's natural language response
- File: `server/modules/routes/ops/tui/interpret.ts`

#### B. Session Manager

Persists TUI conversation history.

```
POST   /api/tui/sessions              — create session
GET    /api/tui/sessions              — list sessions
GET    /api/tui/sessions/:id          — session detail
DELETE /api/tui/sessions/:id          — delete session
POST   /api/tui/sessions/:id/messages — add message (+ interpret)
GET    /api/tui/sessions/:id/messages — message history
```

DB tables:
```sql
CREATE TABLE tui_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  mode TEXT DEFAULT 'build',    -- plan | build | yolo
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE tui_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,            -- user | pm | agent | system
  content TEXT NOT NULL,
  agent_name TEXT,
  metadata TEXT,                 -- JSON: intent, tool_calls, diffs
  created_at INTEGER
);
```

File: `server/modules/routes/ops/tui/sessions.ts`

#### C. WebSocket Session Events

New event type + subscription:
```typescript
// Client → Server
{ type: "subscribe_session", sessionId: "xxx" }

// Server → Client (subscribers only)
{ type: "session_message", payload: { session_id, role, content, metadata } }
```

---

## 5. Client Architecture

### 5-1. Directory Structure

```
AgentDesk/
├── shared/                          ← PLANNED: shared types (not yet created)
│   ├── types.ts                      Agent, Task, Project types
│   ├── api-types.ts                  API response shapes
│   ├── ws-events.ts                  WebSocket event definitions
│   └── constants.ts                  Status labels, role mappings
│
├── src/                             ← GUI (non-developers)
│   ├── components/
│   │   ├── desktop/                  macOS desktop (Dock, MenuBar, icons)
│   │   ├── orchestration/            Timeline, Logs, Agents, Room tabs
│   │   └── windows/                  Library, Settings, Agent Manager, etc.
│   ├── store/                        Zustand (agentStore, taskStore, uiStore)
│   └── types/index.ts               re-exports from shared/
│
├── cli/                             ← TUI + CLI (developers)
│   ├── index.ts                      Entry: no args → TUI, with args → CLI
│   ├── lib/                          API client, WebSocket, formatting
│   ├── commands/                     CLI mode: status, tasks, agents, etc.
│   └── tui/                          TUI mode: ink components
│       ├── App.tsx
│       ├── components/               HeaderBar, ChatArea, InputBar, etc.
│       └── hooks/                    useSession, useWebSocket, useInterpret
│
├── server/                          ← Shared server
│   └── modules/routes/ops/tui/      PLANNED: Intent + Session APIs
│
└── prompts/system/
    └── tui-intent.md                PLANNED: Intent classification prompt
```

### 5-2. Code Sharing

| Layer | GUI | TUI | Shared? |
|-------|-----|-----|---------|
| Types | src/types/ | cli/ inline | **Yes** → shared/types.ts |
| API client | browser fetch | node fetch (cli/lib/api.ts) | Shapes only |
| WebSocket | browser WS | ws package (cli/lib/ws.ts) | Event types only |
| State | Zustand stores | React useState | **No** — different runtimes |
| Components | React DOM | ink components | **No** — different renderers |

### 5-3. Entry Point

```typescript
// cli/index.ts
if (process.argv.length <= 2) {
  // No args → TUI mode (developer)
  const { startTui } = await import("./tui/index.js");
  startTui();
} else {
  // Has args → CLI mode (agentdesk status, agentdesk tasks, ...)
  program.parse();
}
```

---

## 6. Feature Scope

### Keep (software development core)

| Feature | Used by |
|---------|---------|
| PM Orchestration (kickoff → review → done) | Both |
| Agent Management (CRUD, CLI/API providers) | Both |
| Task Execution (worktree, PTY, CLI) | Both |
| Orchestration Timeline (4 tabs) | GUI |
| Library (Skills, Rules, Memory, Hooks) | GUI |
| API Providers (Claude, GPT, Gemini, Ollama) | Both |
| Git Integration (clone, branch, worktree) | Both |
| File Browser + Editor | GUI |
| Terminal (PTY) | GUI |
| Decision Inbox | GUI |
| Cost Tracking | Both |
| Conversational Interface | TUI |
| Intent Interpreter | TUI |
| Slash Commands | TUI |
| Plan/Build Mode | TUI |

### Remove (not software development)

| Feature | Reason |
|---------|--------|
| Workflow Packs (novel, roleplay, video, etc.) | Non-dev workflows |
| Cross-Dept Cooperation / Report Routing | Over-engineered org simulation |
| Video rendering system | Non-dev feature |
| Announcement Response | Unused (already stub) |
| Language Policy | i18n simplification |

### Simplify

| Feature | From | To |
|---------|------|----|
| Categories | 10 types | 6 (mvp, fullstack, mobile, ai-ml, research, custom) |
| Directives | 11 prompts | 3-4 core |
| i18n | 4 languages | ko + en only |

---

## 7. Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| TUI framework | **ink** (React for CLI) | React-based, team familiarity |
| Intent interpretation | **Server-side LLM** | callLlmOneShotAuto rule, needs DB |
| Project structure | **Monolith + shared/** | Minimal disruption, solo developer |
| State management | **GUI: Zustand, TUI: React state** | Different runtimes, can't share |
| CLI distribution | **tsx for dev, esbuild for npm** | Dev uses tsx directly |

---

## 8. Implementation Phases

### Phase 1: Server Foundation
1. Extract shared types to `shared/`
2. DB migration: tui_sessions, tui_messages
3. Session API (CRUD + messages)
4. Intent interpreter prompt + endpoint
5. WebSocket session subscription

### Phase 2: TUI Core
6. ink setup + entry point
7. HeaderBar + StatusBar
8. ChatArea + Message rendering
9. InputBar (text input + send)
10. useSession, useWebSocket, useInterpret hooks

### Phase 3: TUI Features
11. Slash commands + autocomplete
12. Plan/Build mode toggle (Tab)
13. Tool call collapse/expand
14. File diff rendering
15. @ file fuzzy search

### Phase 4: Polish
16. Session save/load (/new, /projects)
17. Project selector UI
18. CLI build script (npm publish)
