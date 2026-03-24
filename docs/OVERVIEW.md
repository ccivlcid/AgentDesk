# AgentDesk — Project OS Overview

> **The operating system for AI agents.**
> Build, run, monitor, and collaborate with AI agent teams in one unified environment.

---

## 1. Why AgentDesk

### The Problem

When multiple AI agents are running simultaneously:
- No single view shows which agent is working on which task
- Rules, memory, hooks, and skills are applied invisibly
- Collaboration flow between agents cannot be tracked
- When something fails, root cause is hard to isolate

### AgentDesk's Answer

```
Agents are runtime processes.
The project is the OS those agents work within.
The UI is the control panel for that OS.
```

AgentDesk lets developers **run multiple agents simultaneously** while **monitoring each
agent's execution state, output, decision-making, and collaboration flow from a single
screen in real time**.

---

## 2. Project OS Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       AgentDesk — Project OS                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   PROJECT    │  │  AGENT TEAM  │  │   LIBRARY    │           │
│  │              │  │              │  │              │           │
│  │ Goal·Dirs    │  │ PM / PL / Dev│  │ Skills       │           │
│  │ Gates·Output │  │ Depts·Personas│  │ Rules        │           │
│  │ Burndown     │  │ Roles        │  │ Memory       │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         └──────────┬──────┘◄─────────────────┘                   │
│                    │                                             │
│           ┌────────▼────────┐                                    │
│           │    KICKOFF      │  LLM reads goal + directive        │
│           │  Auto-planning  │  → generates 3–7 tasks             │
│           │  Role-matching  │  → assigns PM/PL/Dev               │
│           └────────┬────────┘  → auto-executes first task        │
│                    │                                             │
│           ┌────────▼────────┐                                    │
│           │     TASKS       │                                    │
│           │  Task Board     │                                    │
│           │  Kanban/Gantt   │                                    │
│           │  DAG View       │                                    │
│           └────────┬────────┘                                    │
│                    │                                             │
│        ┌───────────▼───────────┐                                 │
│        │    AGENT RUNTIME      │                                 │
│        │  LLM API direct call  │                                 │
│        │  Tool Use loop        │                                 │
│        │  Real-time streaming  │                                 │
│        │  Execution history    │                                 │
│        └───────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────┘
```

### OS Layer Hierarchy

```
Organization
  └── Department (agent group with shared system prompt)
        └── Agent (runtime process — Runtime or CLI mode)
              └── Task (execution unit — with directives injected)

Category (project type template)
  └── Project (workspace + directive)
        ├── Objectives / Risks / Gates / Deliverables
        ├── project_agents: PM · PL · Dev (required) + extras
        └── project_clarifications (Kickoff Q&A log)
```

---

## 3. Project Lifecycle

### Step 1 — Create Project

```
1. Select project type (MVP / Full-Stack / Mobile / API / Frontend /
                        AI-ML / Open-Source / DevOps / Enterprise / Research)
2. Edit directive (Markdown — injected into every agent prompt)
3. Fill in name, path, one-line goal
4. Assign team:
   [PM] Project Manager   ← required
   [PL] Project Lead      ← required
   [Dev] Developer        ← required
```

### Step 2 — Kickoff (Automatic)

```
POST /api/projects/:id/kickoff
  ↓
LLM reads: directive + core_goal + team (PM/PL/Dev names + roles)
  ↓
Returns: { tasks: [{ title, description, agent_name }] }
  OR:    { needs_clarification: true, question: "..." }
  ↓
If clarification needed:
  → clarification_request WebSocket event → user modal → reply
  → re-kickoff with user's answer
  ↓
Tasks inserted → first task auto-executed (startExecutionLoop)
```

### Step 3 — Agent Execution

Two execution modes coexist per task:

**Mode A — Runtime Engine (native)**
```
Task assigned
  → Prompt assembly (persona + directive + rules + memory + tool defs)
  → Anthropic Messages API (streaming)
  → token stream → WebSocket → CLI Window (real-time)
  → Tool Use loop: LLM ↔ [list_files | read_file | write_file |
                            search_files | run_command]
  → Completion: task.status = done | failed
  → Task Report auto-saved
```

**Mode B — CLI Mode (external)**
```
Task assigned → PTY spawn → claude/codex/gemini CLI auto-run
             → stdout stream → CLI Window
             → cli-complete event → Task Report
```

### Step 4 — Monitor & Collaborate

| View | Purpose |
|------|---------|
| **CLI Window** | Real-time token/stdout stream per agent |
| **Task Board** | Kanban / Gantt / DAG — task states + execution states |
| **Flow Graph** | Live agent↔task connection graph |
| **Agent Detail** | State · running task · applied rules/memory (4 tabs) |
| **Decision Inbox** | Agent-to-user decision requests |
| **Reports** | Completed task outputs + diffs + logs |
| **Notifications** | Completion + anomaly alerts |

---

## 4. Agent Runtime Engine (Phase 19)

### Execution Loop

```
startExecutionLoop(agentId, taskId, projectId)
  │
  ├─ DB: agent_runtime_runs (status = running)
  ├─ Prompt: persona + rules + memory + hooks + directive + task desc
  │
  ├─ LLM stream loop ──────────────────────────────────────┐
  │   ├─ Anthropic Messages API (claude-sonnet-4-6)        │
  │   ├─ WebSocket broadcast: cli_output { taskId, chunk } │
  │   ├─ On tool_call → toolExecutor.run(tool, args)       │
  │   │   Tools: list_files · read_file · write_file       │
  │   │          search_files · run_command                │
  │   └─ Tool result fed back → continue ──────────────────┘
  │
  └─ Completion
      ├─ task.status = done | failed
      ├─ DB: agent_runtime_runs (status = completed, tokens counted)
      └─ broadcast: task_update, execution_complete
```

### Runtime Tables

```sql
agent_runtime_runs    — run id, task/agent/project ids, status, tokens, timing
agent_runtime_events  — sequential events (text | tool_call | tool_result | error | status)
```

### Module Files

```
server/modules/agent-runtime/
├── execution-loop.ts   ← LLM ↔ Tool loop (core)
├── llm-client.ts       ← Anthropic API abstraction + key resolution
├── tool-executor.ts    ← Tool dispatch (5 built-in tools)
├── prompt-assembler.ts ← Prompt composition (rules, memory, directive)
└── execution-store.ts  ← DB read/write for runs + events
```

---

## 5. Directive System (Phase 19-B)

Every project has a **directive** — a Markdown document injected into agent prompts at execution time.

### 10 Built-in Project Types

| Slug | Name | Focus |
|------|------|-------|
| `mvp` | MVP | Hypothesis validation, fast iteration |
| `fullstack` | Full-Stack | End-to-end feature delivery |
| `mobile` | Mobile | iOS/Android performance, UX |
| `api-backend` | API/Backend | REST design, security, scalability |
| `frontend` | Frontend | Component architecture, accessibility |
| `ai-ml` | AI/ML | Experimentation, reproducibility |
| `open-source` | Open-Source | Docs, contribution guidelines |
| `devops` | DevOps | CI/CD, IaC, monitoring |
| `enterprise` | Enterprise | Compliance, audit trail, SLA |
| `research` | Research | Evidence gathering, reporting |

### Directive Contents (per type)

```markdown
## Work Principles     — rules agents must follow in this project
## Task Decomposition  — how to break down large goals
## Quality Criteria    — definition of "done"
## Review Process      — review rounds and focus areas
## Priorities          — trade-off decisions
```

User can freely edit. Directive is injected into **every task execution prompt** for the project.

---

## 6. Role-Based Team System (Phase 20-B)

When creating a project, exactly three roles must be filled:

| Role | Badge | Responsibility |
|------|-------|---------------|
| **Project Manager** | `PM` | Schedule, budget, risk management |
| **Project Lead** | `PL` | Technical direction, architecture |
| **Developer** | `Dev` | Feature implementation, coding |

Stored in `project_agents.project_role TEXT CHECK(IN 'pm','pl','dev')`.

Kickoff prompt includes role labels:
```
- Alice [PROJECT MANAGER], dept: planning, seniority: team_leader
- Bob [PROJECT LEAD], dept: dev, seniority: senior
- Carol [DEVELOPER], dept: dev, seniority: junior
```

LLM uses this to assign each generated task to the best-fit agent.

---

## 6-B. PM Agent Orchestration (Phase 21)

The PM agent is the **real orchestrator** — not system timers or polling loops.

### Event-Driven Architecture

```
Task completes (exit=0)
  → EventBus: task_status_changed (review)
  → PM LLM: reads output, decides APPROVE or REVISE
    → APPROVE → finishReview → consensus meeting → done
    → REVISE  → sends feedback to agent → re-executes

Task fails (exit≠0)
  → EventBus: task_status_changed (failed)
  → AI Error Analysis: log analysis → cause + suggestion
  → PM LLM: decides RETRY / REASSIGN / ESCALATE
    → RETRY    → planned + re-execute (exponential backoff)
    → REASSIGN → assigns to different agent
    → ESCALATE → notifies user

Task done
  → EventBus: task_status_changed (done)
  → PM Auto-Learning: extracts Rules/Memory from output
  → PM Agent Fitness: records success rate per task type
  → PM starts next planned task (idle agents only)
  → If all tasks done → PM generates retrospective report
```

### Key Design Principles

- **Zero timers in task workflow**: No `setInterval` or `setTimeout` for orchestration
- **PM decides, system executes**: PM calls LLM, system provides tools (DB, process management)
- **Prompts in .md files**: All PM decision prompts in `prompts/pm/` directory
- **Graceful fallback**: If PM agent is missing, system auto-approves/retries

### Module Files

```
server/lib/event-bus.ts                          ← Event hub (TaskStatusEvent)
server/modules/workflow/orchestration/
├── pm-orchestrator.ts                           ← PM decision engine
├── auto-learning.ts                             ← Rules/Memory extraction + retrospective
├── run-complete-handler/error-analysis.ts       ← AI error analysis
prompts/pm/
├── review-task.md                               ← PM review prompt
├── handle-failure.md                            ← PM failure handling prompt
├── auto-learn.md                                ← Knowledge extraction prompt
├── project-retrospective.md                     ← Retrospective prompt
├── decide-inbox.md                              ← Decision inbox prompt
└── start-next.md                                ← Next task selection prompt
```

---

## 7. Library — Agent Behavior Building Blocks

| Element | Role | Scope |
|---------|------|-------|
| **Skills** | Reusable task templates and tool commands | provider / repo / agent |
| **Rules** | Behavior constraints the agent must follow | global / dept / agent / project |
| **Memory** | Persistent context and knowledge | global / dept / agent / project |
| **Hooks** | Scripts that fire automatically on task events | global / dept / agent / project |

**Priority**: project > agent > department > global

**Learning**: rules, memory, and hooks can be extracted automatically from completed tasks
via the `/learn` endpoints.

---

## 8. Collaboration Infrastructure

### Decision Inbox
Agents can request decisions from the user mid-task. Stored in `decision_inbox_messages`,
surfaced via the Decision Inbox window and notification bell.

### Direct Chat
Bi-directional messaging between users and agents:
- `$` prefix — client directive (project-bound orchestration)
- `#` prefix — task registration on the board (orchestrator flow)
- Telegram / Discord / Slack gateway (messenger module)

### Subtask Delegation
Tasks can be decomposed into subtasks. Each subtask is delegated to the best-fit agent
based on department and role. Coordination plans are stored and tracked.

### Review Consensus
Workflow orchestration supports multi-agent review rounds. Agents vote on task outputs;
consensus triggers task progression.

---

## 9. Feature Surface

### macOS Desktop UX

| Feature | Trigger | Component |
|---------|---------|-----------|
| Spotlight Search | `Ctrl+Shift+K` | `CommandPalette.tsx` |
| Mission Control | `Ctrl+↑` | `MissionControl.tsx` |
| Quick Look | `Space` (icon selected) | `QuickLook.tsx` |
| Jiggle Mode | 600ms long-press empty | `Desktop.tsx` |
| Notification Center | Bell icon | `NotificationCenter.tsx` |
| App Menu | "AgentDesk" text | `MenuBar.tsx` |
| Control Center | Menu bar right | `ControlCenter.tsx` |
| Right Shelf | Side panel | `RightShelf.tsx` |
| Trash | Desktop icon | Deletes DB project on drop; **empty trash** removes listed folders on disk via `POST /api/projects/delete-directory` (allowed roots only) |

### App Windows (Dock)

| Window | Shortcut | Purpose |
|--------|---------|---------|
| Task Board | Dock icon | Kanban / Gantt / DAG |
| Workflow Builder | `g w` | Visual workflow editor + cron scheduler |
| Library | `g l` | Skills · Rules · Memory · Hooks · Templates |
| Settings | `g s` | API providers · Categories · Data |
| Chat | `g c` | Direct + group broadcast |
| Agent Manager | `g a` | Agent CRUD + department structure |
| CLI Window | `g e` | PTY terminal + Runtime streaming |
| Image Studio | `g i` | txt2img · inpaint · gallery |
| Dashboard | `g d` | Overview / entry to task flows |
| Repo Store | Dock **+** menu | GitHub Trending browse · clone · register project |
| Synapse | — | Notion · Obsidian integration |
| Local LLM | — | Ollama · LM Studio · llama.cpp |

### Analytics & Export

- **Agent Performance** — success rate, avg completion time, trend sparklines; filter by project/period
- **Data Export** — tasks / deliverables / agents / costs → CSV (UTF-8 BOM) or JSON
- **Cost Summary** — total + this month + breakdown by agent and workflow

---

## 10. Current Status

```
Phase 1–18  (Desktop UX, Workflow, Library, Monitoring, CLI, …) ████████████ 100%
Phase 19    Agent Runtime Engine                                  ████████████ 100%
Phase 19-B  Project Directive System                             ████████████ 100%
Phase 19-C  Auto-execute first task after kickoff               ████████████ 100%
Phase 20    Agent-Driven Kickoff + Multi-agent Distribution      ████████████ 100%
Phase 20-B  PM/PL/Dev Role-Based Team System                    ████████████ 100%
Phase 20-C  Kickoff Meeting + New Round Panel                   ████████████ 100%
Phase 21    PM Agent Orchestration (event-driven)                ████████████ 100%
Phase 22    Debug Experience (AI error analysis)                 ████████████ 100%
Phase 23    Optimize Learning Loop (auto-learn + retrospective)  ████████████ 100%
Phase 24    Stability (indexes, shutdown, flood prevention)      ████████████ 100%
Phase 25    Feature Extension (prompt UI, agent fitness)         ████████████ 100%
─────────────────────────────────────────────────────────────────
Phase 26    Platform (queue · plugin system)                     ░░░░░░░░░░░░ Planned
Phase 27    Team & Cloud (workspaces · SSO/RBAC)                 ░░░░░░░░░░░░ Future
```

**Phase 21–25 highlights**: PM agent as orchestrator (event-driven, zero timers in task flow),
AI error analysis + auto-retry/reassign/escalate, prompt history UI, auto-learning (Rules/Memory extraction),
project retrospective, agent-task fitness tracking, graceful shutdown recovery, DB performance indexes.

---

## 11. Document Map

| Document | Contents |
|----------|---------|
| [`OVERVIEW.md`](./OVERVIEW.md) | **This document** — concept, architecture, feature surface |
| [`progress.md`](./progress.md) | Development progress log — all phases |
| [`specs/api.md`](./specs/api.md) | REST API specification (v1.6.4) |
| [`architecture/schema-erd.md`](./architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`architecture/AGENT-CONFIGURATION-AND-EXECUTION.md`](./architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent DB fields, task vs chat vs runtime execution paths (as-built) |
| [`design/DESIGN.md`](./design/DESIGN.md) | CSS variables + component style rules |
| [`design/UI-SCREENS.md`](./design/UI-SCREENS.md) | Screen & modal specifications |
| [`strategy/AGENT-RUNTIME-SPEC.md`](./strategy/AGENT-RUNTIME-SPEC.md) | Agent Runtime Engine spec |
| [`strategy/AgentDesk_OpenSource_Product_Strategy.md`](./strategy/AgentDesk_OpenSource_Product_Strategy.md) | Open-source product strategy |

---

## 12. Quick Start

```bash
pnpm install
cp .env.example .env      # set SESSION_SECRET
pnpm setup                # run DB migrations
pnpm dev                  # frontend :8800  API :8790
```

### First Project Run (new flow)

```
1. Settings → API → Add API Provider (Claude / OpenAI / Gemini)
2. Agent Manager → Add Department → Hire agents (at least 3)
3. Desktop → New Project:
   ① Select type (MVP / Full-Stack / …)
   ② Edit directive (Markdown — agent behavior rules)
   ③ Name + path + one-line goal
   ④ Assign PM · PL · Dev (all three required)
4. Kickoff runs automatically:
   → Agent reads goal + directive → plans 3–7 tasks
   → If info missing: asks you one question → you reply → continues
   → First task auto-executes
5. Monitor: Task Board · CLI Window · Flow Graph
```
