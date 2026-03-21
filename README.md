<div align="center">

# AgentDesk

**Project OS for AI Agent Teams**

Run, monitor, and collaborate with AI agents simultaneously — from a single macOS-style desktop interface.

[한국어](README_ko.md) · [Overview](#overview) · [Features](#key-features) · [Screenshots](#screenshots) · [Quick Start](#getting-started)

</div>

<p align="center">
  <img src="docs/screen/desktop-01.png" alt="AgentDesk — macOS-style desktop with Dock, menu bar, and widgets" width="920" />
</p>
<p align="center"><sub><strong>One desktop</strong> for every agent — run, stream output, and steer work in real time.</sub></p>

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

## Screenshots

<p align="center"><sub>Click an image to open the full file in the repository.</sub></p>

<table>
<tr>
<td width="50%" valign="top" align="center"><strong>Desktop &amp; workspace</strong><br/><a href="docs/screen/desktop-02.png"><img src="docs/screen/desktop-02.png" width="100%" alt="Desktop workspace"/></a></td>
<td width="50%" valign="top" align="center"><strong>Multi-window layout</strong><br/><a href="docs/screen/desktop-03.png"><img src="docs/screen/desktop-03.png" width="100%" alt="Windows and overlays"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>Project kickoff</strong><br/><a href="docs/screen/project-create-01.png"><img src="docs/screen/project-create-01.png" width="100%" alt="Project creation"/></a></td>
<td width="50%" valign="top" align="center"><strong>Directives &amp; planning</strong><br/><a href="docs/screen/project-create-02.png"><img src="docs/screen/project-create-02.png" width="100%" alt="Directive editor"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>CLI — live stream</strong><br/><a href="docs/screen/cli-window-01.png"><img src="docs/screen/cli-window-01.png" width="100%" alt="CLI window"/></a></td>
<td width="50%" valign="top" align="center"><strong>CLI session</strong><br/><a href="docs/screen/cli-window-02.png"><img src="docs/screen/cli-window-02.png" width="100%" alt="CLI execution"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>Library</strong><br/><a href="docs/screen/library-01.png"><img src="docs/screen/library-01.png" width="100%" alt="Skills rules memory hooks"/></a></td>
<td width="50%" valign="top" align="center"><strong>Knowledge scope</strong><br/><a href="docs/screen/knowledge-01.png"><img src="docs/screen/knowledge-01.png" width="100%" alt="Knowledge"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>Widgets</strong><br/><a href="docs/screen/widget-01.png"><img src="docs/screen/widget-01.png" width="100%" alt="Widgets"/></a></td>
<td width="50%" valign="top" align="center"><strong>Command palette</strong><br/><a href="docs/screen/command-palette.png"><img src="docs/screen/command-palette.png" width="100%" alt="Spotlight-style search"/></a></td>
</tr>
<tr>
<td width="50%" valign="top" align="center"><strong>Workflow builder</strong><br/><a href="docs/screen/workflow-builder.png"><img src="docs/screen/workflow-builder.png" width="100%" alt="Workflow"/></a></td>
<td width="50%" valign="top" align="center"><strong>Local LLM</strong><br/><a href="docs/screen/local-llm.png"><img src="docs/screen/local-llm.png" width="100%" alt="Local LLM"/></a></td>
</tr>
</table>

<details>
<summary><strong>More</strong> — extra desktops, project step, image studio, reference JPGs</summary>

<br/>

| | |
|:---:|:---:|
| <a href="docs/screen/widget-02.png"><img src="docs/screen/widget-02.png" width="380" alt="Widget 2"/></a> | <a href="docs/screen/widget-03.png"><img src="docs/screen/widget-03.png" width="380" alt="Widget 3"/></a> |
| <a href="docs/screen/desktop-04.png"><img src="docs/screen/desktop-04.png" width="380" alt="Desktop 4"/></a> | <a href="docs/screen/desktop-05.png"><img src="docs/screen/desktop-05.png" width="380" alt="Desktop 5"/></a> |
| <a href="docs/screen/desktop-06.png"><img src="docs/screen/desktop-06.png" width="380" alt="Desktop 6"/></a> | <a href="docs/screen/project-create-03.png"><img src="docs/screen/project-create-03.png" width="380" alt="Project step 3"/></a> |

<p align="center"><a href="docs/screen/image-studio.png"><img src="docs/screen/image-studio.png" width="560" alt="Image Studio"/></a><br/><sub><strong>Image Studio</strong></sub></p>

| | |
|:---:|:---:|
| <a href="docs/screen/cli-setup.jpg"><img src="docs/screen/cli-setup.jpg" width="380" alt="CLI setup"/></a> | <a href="docs/screen/cli-session-01.jpg"><img src="docs/screen/cli-session-01.jpg" width="380" alt="CLI session 1"/></a> |
| <a href="docs/screen/cli-session-02.jpg"><img src="docs/screen/cli-session-02.jpg" width="380" alt="CLI session 2"/></a> | <a href="docs/screen/agent-persona.jpg"><img src="docs/screen/agent-persona.jpg" width="380" alt="Agent persona"/></a> |
| <a href="docs/screen/wallpaper-change.jpg"><img src="docs/screen/wallpaper-change.jpg" width="380" alt="Wallpaper"/></a> | <a href="docs/screen/flow-routing.jpg"><img src="docs/screen/flow-routing.jpg" width="380" alt="Flow routing"/></a> |

<p align="center"><a href="docs/screen/desktop-snapshot-2026-03-19.jpg"><img src="docs/screen/desktop-snapshot-2026-03-19.jpg" width="560" alt="Desktop snapshot"/></a><br/><sub><strong>Desktop snapshot</strong> (2026-03-19)</sub></p>

</details>

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
