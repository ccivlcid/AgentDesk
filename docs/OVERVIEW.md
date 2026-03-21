# AgentDesk — Project OS Overview

> **The operating system for AI agents.**
> Build, run, monitor, and debug AI agents in one unified environment.

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
Agents are runtime processes.
The project is the OS those agents work within.
The UI/UX is the control panel for that OS.
```

AgentDesk lets developers **run multiple agents simultaneously** while **monitoring each agent's execution state, output, decision-making, and collaboration flow from a single screen in real time**.

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
│              │      AGENT RUNTIME      │                     │
│              │                         │                     │
│              │ LLM API direct call     │                     │
│              │ Tool use loop           │                     │
│              │ Real-time streaming     │                     │
│              │ Execution history       │                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### OS Layer Hierarchy

```
Organization
  └── Department (agent group)
        └── Agent (runtime process)
              └── Task (execution unit)

Category (project type template)
  └── Project (workspace)
        ├── Objectives / Risks / Gates / Outputs
        └── project_agents (assigned agent team)
```

---

## 3. Agent Execution — Two Modes

### Mode A: Runtime Mode (AgentDesk native)

AgentDesk가 직접 LLM API를 호출하여 에이전트를 자율 실행.

```
Task created
    │
    ▼
① Prompt assembly
   persona + rules + memory + tool definitions
    │
    ▼
② LLM API stream (Anthropic/OpenAI/Local)
   → token-by-token WebSocket → CLI Window
    │
    ▼
③ Tool use loop (반복)
   LLM → tool_call → execute → result → LLM
   (list_files, read_file, write_file, search_files, run_command)
    │
    ▼
④ Completion
   task.status = done | failed
   → Task Report auto-save
   → WebSocket broadcast
```

### Mode B: CLI Mode (external agent)

외부 에이전트 CLI(claude/codex/gemini)를 PTY 터미널에서 실행.

```
Task created → PTY spawn → CLI auto-run → cli-complete → Task Report
```

두 모드는 공존. Task 생성 시 사용자가 선택.

---

## 4. Monitoring — What the UI Reveals

| View | What is monitored |
|---|---|
| **CLI Window** | Real-time streaming of agent output (Runtime: token stream / CLI: stdout) |
| **Task Board** | Task status (pending → running → done/failed), agent assignment |
| **Agent Detail** | Current state, running task, applied skills/rules/memory (4 tabs) |
| **Flow Graph** | Real-time agent↔task connections, live status animation |
| **Reports** | Completed task outputs, diffs, logs |
| **Notifications** | Task completion & anomaly alerts |

---

## 5. Library — Agent Behavior Building Blocks

| Element | Role | Scope |
|---|---|---|
| **Skills** | Tools and commands the agent has learned | provider/repo/agent |
| **Rules** | Rules the agent must follow | global/dept/agent/project |
| **Memory** | Context and knowledge the agent remembers | global/dept/agent/project |
| **Hooks** | Scripts that run automatically on task events | global/dept/agent/project |

Priority: project > agent > department > global

---

## 6. Current Status

```
Phase 1–18 (UI, monitoring, workflow, security, etc.)  ████████████████████ 100%
Phase 19 — Agent Runtime Engine                         ░░░░░░░░░░░░░░░░░░░░   0%
```

> Phase 1–18 includes: Agent CRUD, Task Board, Workflow Builder, CLI Window (PTY),
> Flow Graph, Image Studio, Synapse (Notion/Obsidian), Local LLM Manager,
> Custom Features, Project Folders, Figma Integration, macOS UX (MX-01~12),
> Security hardening, Performance optimization, 229 tests passing.

---

## 7. Document Map

| Document | Contents |
|---|---|
| [`OVERVIEW.md`](./OVERVIEW.md) | **This document** — project concept + architecture |
| [`progress.md`](./progress.md) | Development progress — current + completed phases |
| [`specs/api.md`](./specs/api.md) | REST API specification (v1.6.1) |
| [`architecture/schema-erd.md`](./architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [`design/DESIGN.md`](./design/DESIGN.md) | CSS variables + component style rules |
| [`design/UI-SCREENS.md`](./design/UI-SCREENS.md) | Screen & modal specifications |
| [`strategy/AGENT-RUNTIME-SPEC.md`](./strategy/AGENT-RUNTIME-SPEC.md) | **Agent Runtime Engine implementation spec (Phase 19)** |
| [`strategy/AgentDesk_OpenSource_Product_Strategy.md`](./strategy/AgentDesk_OpenSource_Product_Strategy.md) | Open source product strategy |

---

## 8. Quick Start

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
# → http://localhost:8800
```

### First Agent Run

```
1. Settings → Configure API Provider (Anthropic / OpenAI / Local LLM)
2. Agents → Create agent + configure persona
3. Projects → Create project + assign agents
4. Tasks → Create task → Run → monitor in real time
```
