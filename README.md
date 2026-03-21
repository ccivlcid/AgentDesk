<div align="center">

# AgentDesk

**Project OS for AI Agent Teams**

Run, monitor, and collaborate with AI agents simultaneously — from a single macOS-style desktop interface.

[한국어](README_ko.md) · [Overview](#overview) · [Features](#key-features) · [Quick Start](#getting-started)

</div>

---

## Overview

AgentDesk is an open-source, self-hosted operating system for AI agent teams. Agents are runtime processes, the project is the OS they work within, and the UI is the control panel for that OS.

## Core Philosophy

AgentDesk is built on the principle that developers should see exactly what their AI agents are doing, in real time — which task is running, which rules are applied, where something failed — all from one screen, with no black boxes. Rather than delegating execution to external CLIs, AgentDesk owns the full loop: LLM calls, tool use, result storage, and streaming output.

---

## Key Features

<table>
<tr>
<td valign="top" width="50%">

### 🚀 Agent-Driven Kickoff
- LLM auto-plans 3–7 tasks from goal + directive
- Role names freely definable — PM, QA, Backend, anything
- Auto-assign fills all slots in one click
- Asks one clarifying question if info is missing
- First task executes automatically after planning

</td>
<td valign="top" width="50%">

### 📄 Project Directives
- Markdown doc injected into every agent prompt
- 10 built-in templates: MVP · Full-Stack · Mobile · API/Backend · Frontend · AI/ML · Open-Source · DevOps · Enterprise · Research
- Edit freely, load a template, or import a `.md` file directly

</td>
</tr>
<tr>
<td valign="top" width="50%">

### ⚡ Agent Runtime Engine
- Built-in LLM execution via Anthropic Claude API
- Turn-based tool-use loop with filesystem access
- Real-time token streaming to CLI Window over WebSocket
- Per-run execution history, token counts, cost tracking
- `My keys, my models` — no data proxying

</td>
<td valign="top" width="50%">

### 🖥️ Real-Time Monitoring
- Task Board: Kanban · Gantt · DAG views
- Flow Graph: live agent↔task connection diagram
- Agent Detail: state · running task · rules · memory · hooks
- Notification Center: grouped alerts with quick actions

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 📚 Knowledge Library
- Skills · Rules · Memory · Hooks
- Scoped globally, per department, agent, or project
- Priority: project > agent > department > global
- `/learn` auto-extracts from completed tasks

</td>
<td valign="top" width="50%">

### ⚙️ Workflow Automation
- Visual drag-and-drop pipeline builder
- Cron-based scheduler for recurring runs
- 7 built-in packs: development · research · novel · report · video · roleplay · asset management

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 💬 Multi-Agent Chat
- Direct messages + broadcast channel
- Telegram · Discord · Slack gateway
- `$` prefix → directive · `!` prefix → task
- Decision Inbox for mid-task agent requests

</td>
<td valign="top" width="50%">

### 🧩 Custom Widgets & Analytics
- Describe a widget → AI generates TypeScript (esbuild + iframe)
- 7 built-in widget templates
- Performance dashboard: success rate · completion time · sparklines
- Export to CSV / JSON

</td>
</tr>
</table>

---

## Technical Philosophy

| | |
|---|---|
| **Transparency** | Every token, tool call, and result is visible in real time — no black boxes |
| **Self-hosted** | SQLite-based, no external cloud services required |
| **My keys, my models** | Direct API key connection — data never passes through a proxy |
| **Local-first** | Optional Electron build packages the app as a native desktop application |
| **Open by default** | Apache 2.0, single local process, no vendor lock-in |

---

## Getting Started

```bash
git clone <repo-url> && cd AgentDesk
pnpm install
cp .env.example .env   # set SESSION_SECRET
pnpm setup
pnpm dev
```

Open **http://localhost:8800** — requires Node.js 22+, pnpm 10+.

```
1. Settings → API        Add an API provider (Claude / OpenAI / Gemini)
2. Agent Manager         Create a department → hire agents
3. New Project           Select type → edit directive → assign agents
4. Kickoff               Tasks planned automatically → first task starts
5. Monitor               Task Board · CLI Window · Flow Graph
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS · Zustand |
| Backend | Node.js · Express · tsx |
| Database | SQLite (`better-sqlite3`) · versioned migrations |
| Real-time | WebSocket |
| Flow diagrams | `@xyflow/react` |
| Testing | Vitest · Playwright |
| Desktop | Electron (optional) |

---

## Use Cases

Ideal for developers who want to run multiple AI agents in parallel and track the full picture from one screen, teams that need to observe agent reasoning and tool use in real time, organizations looking to enforce consistent behavior through shared rules and memory, and anyone who wants to self-host their entire AI agent infrastructure with full control over keys and models.

---

<div align="center">

Apache 2.0 · Self-hosted · [한국어](README_ko.md)

</div>
