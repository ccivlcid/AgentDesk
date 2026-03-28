# AgentDesk — Feature Inventory

> Multi-LLM orchestrator for software development.
> GUI (non-developers) + TUI (developers).
>
> Last updated: 2026-03-28

---

## 1. Dual Interface

| Interface | Audience | Access | Description |
|-----------|----------|--------|-------------|
| **GUI** | Non-developers (PM, designers, managers) | Browser `localhost:8800` | macOS desktop metaphor — visual management and monitoring |
| **TUI** | Developers | Terminal `agentdesk` | OpenCode-style conversational interface — natural language |
| **CLI** | Developers | Terminal `agentdesk <cmd>` | Quick commands — `status`, `tasks`, `agents`, `kickoff`, `logs` |

Both share the same server (localhost:8790), API, database, and PM orchestration engine.

---

## 2. GUI Features (Non-developers)

### Desktop OS (macOS metaphor)

| Feature | File | Description |
|---------|------|-------------|
| Desktop | `Desktop.tsx` | Free-placement icons, drag, jiggle mode, rubber-band selection |
| MenuBar | `MenuBar.tsx` | Logo, project selector, kickoff indicator, cost, notifications, clock |
| Dock | `Dock.tsx` | Fixed app bar — Orchestration, Library, Settings |
| Mission Control | `MissionControl.tsx` | `Ctrl+Up` window grid overview |
| Command Palette | `CommandPalette.tsx` | `Cmd+K` Spotlight search |
| Quick Look | `QuickLook.tsx` | `Space` project preview |
| App Switcher | `AppSwitcher.tsx` | `Cmd+Tab` window switching |
| Notifications | `NotificationCenter.tsx` | Bell icon → slide panel |

### Windows

| Window | Description |
|--------|-------------|
| Orchestration Timeline | 4-tab main view: Timeline (agent lanes), Logs (error-first stream), Agents (team table), Room (communication) |
| Project Folder | 6-tab: Files, Tasks, Agents, Terminal, Details, Git |
| Agent Manager | Agent/department CRUD, card grid |
| Library | Skills, Rules, Memory, Hooks (4 tabs) — operational knowledge base |
| Settings | General, API providers, OAuth, CLI, Data |
| CLI Terminal | PTY terminal with agent selector |
| Decision Inbox | APPROVE/REVISE/CANCEL for PM decisions |

---

## 3. TUI Features (Developers)

| Feature | Description |
|---------|-------------|
| Conversational interface | Talk to PM agent in natural language |
| Plan mode | PM plans but doesn't execute (preview) |
| Build mode | PM plans + assigns + executes automatically |
| YOLO mode | Build + PM auto-decides (no confirmation) |
| Real-time streaming | Agent execution output via WebSocket |
| Slash commands | `/status`, `/tasks`, `/agents`, `/logs`, `/yolo`, etc. |
| @ file reference | Fuzzy file search for context |
| Intent interpretation | Server-side LLM converts natural language to API calls |
| Session management | Conversation history persisted per session |

---

## 4. Agent System (Multi-provider)

> Core differentiator: Multiple LLM providers in one project, agents collaborating simultaneously.

### Agent Properties

| Property | Description |
|----------|-------------|
| Role | `team_leader` (PM), `senior`, `junior` |
| Specialty | Department-based (dev, planning, design, qa) |
| CLI Provider | claude, codex, gemini, cursor, opencode, copilot, antigravity, ollama |
| API Provider | HTTP API mode (Anthropic, OpenAI-compatible) |
| Model | Per-provider model selection |

### Execution Branching

| Condition | Execution |
|-----------|-----------|
| `cli_provider === "api"` + `api_provider_id` | HTTP API streaming |
| `cli_provider === "copilot"` or `"antigravity"` | OAuth HTTP agent |
| `cli_provider === "claude"/"codex"/"gemini"/...` | CLI subprocess (PTY) |
| `cli_provider === "ollama"` + `api_provider_id` | Local Ollama HTTP API |

### Fitness-based Assignment

| Item | Description |
|------|-------------|
| Table | `agent_task_fitness` — per agent per task_type success rate |
| Score | `successRate - (currentLoad * 0.1)` |
| Fallback | Round-robin when no fitness data |

---

## 5. PM Orchestration

### Kickoff Pipeline

```
[1] POST /api/projects/:id/kickoff
[2] Kickoff Meeting (PM shares goal, agents report capabilities)    ← meeting
[3] Task Creation (LLM generates tasks with task_type)              ← planning
[4] Agent Assignment (fitness-based, PM excluded)                   ← assigning
[5] Execution (agents run tasks in worktrees)                       ← executing
[6] Per-task PM Review (4-point checklist → APPROVE/REVISE)
[7] Project-level Review (all done → PM evaluates vs goal)
[8] Complete (or add tasks for gaps, max 3 rounds)                  ← done
```

### PM Review Checklist
1. Scope match — does the output match the task?
2. Errors — any bugs or failures?
3. Minimal scope — no unnecessary changes?
4. Completeness — is the task fully done?

### YOLO Mode
- PM still does LLM review (same quality)
- PM auto-decides APPROVE/REVISE (no user confirmation)
- Decision Inbox disabled

---

## 6. Task System

### Task Status Flow

```
planned → in_progress → review → done
                          |
                     (PM REVISE)
                          |
                      planned (retry)
```

### Task Types (LLM assigns at kickoff)

`general` | `development` | `design` | `analysis` | `presentation` | `documentation`

### Task Features

| Feature | Description |
|---------|-------------|
| Subtasks | Agent-to-agent delegation |
| Interrupt | `POST /api/tasks/:id/inject` — inject prompt into running task |
| Worktree | Per-task git worktree isolation |
| Dependencies | Gate conditions between tasks |

---

## 7. Library System

Operational knowledge that agents learn and reuse.

| Category | Description | Example |
|----------|-------------|---------|
| **Skills** | Learned capabilities | "Run vitest with coverage" |
| **Rules** | Behavioral guidelines | "Always use pnpm, not npm" |
| **Memory** | Contextual knowledge | "Auth module uses JWT tokens" |
| **Hooks** | Event triggers | "Run lint after code changes" |

Each supports auto-learning from task execution history.

---

## 8. API Providers

| Provider | Type | Description |
|----------|------|-------------|
| Anthropic (Claude) | API + CLI | Primary provider |
| OpenAI (GPT) | API | HTTP API streaming |
| Google (Gemini) | CLI | gemini CLI tool |
| Ollama | API | Local LLM |
| OpenAI-compatible | API | Any compatible endpoint |
| Cursor, OpenCode, Copilot | CLI | IDE-based tools |

---

## 9. Removed Features (Phase 26-27)

> These features were removed to focus on software development.

| Feature | Lines Removed | Reason |
|---------|---------------|--------|
| Image Studio | ~2,256 | Not dev |
| Synapse (Notion/Obsidian) | ~3,307 | Not dev |
| App Runner | ~1,248 | Not dev |
| Wallpaper Picker | ~475 | Not dev |
| Dashboard | ~680 | Replaced by Orchestration Timeline |
| Workflow Builder | ~7,994 | Not dev |
| Chat System | ~35,000 | Not dev |
| Messenger (Discord/Slack/etc.) | ~34,000 | Not dev |
| TaskBoard | — | Replaced by Orchestration Timeline |
| Reports Window | — | Absorbed into Orchestration |

### Also Removed (Phase 27)

| Feature | Reason |
|---------|--------|
| Workflow Packs (novel, roleplay, video, asset, report) | Non-dev workflows |
| Cross-Dept Cooperation / Report Routing | Over-engineered |
| Video rendering system | Non-dev feature |
| Announcement Response | Unused stub |
| Non-dev departments (research, investment, video, data, marketing, content) | Not software dev |
| 12 non-dev agent seeds | Belonged to removed departments |
