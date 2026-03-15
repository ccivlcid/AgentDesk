# AgentDesk

> **A Developer OS for managing, monitoring, and controlling multiple AI agents simultaneously.**

AgentDesk brings a macOS-style desktop metaphor to AI agent orchestration — menubar, desktop icons, draggable widgets, Dock, and floating app windows, all in one dark terminal-inspired interface.

> 🇰🇷 [한국어 README](README_ko.md)

---

## Screenshots

<table>
  <tr>
    <td><img src="docs/screen/01-desktop.png" width="420" alt="Desktop"/><br/><sub>Desktop</sub></td>
    <td><img src="docs/screen/28-agent-manager.png" width="420" alt="Agent Manager"/><br/><sub>Agent Manager</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/37-agent-create.png" width="420" alt="Hire Agent"/><br/><sub>Hire Agent</sub></td>
    <td><img src="docs/screen/38-dept-create.png" width="420" alt="Add Department"/><br/><sub>Add Department</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/23-workflow-builder.png" width="420" alt="Workflow Builder"/><br/><sub>Workflow Builder</sub></td>
    <td><img src="docs/screen/25-workflow-composition.png" width="420" alt="Agent Composition"/><br/><sub>Agent Composition</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/26-chat-direct.png" width="420" alt="Direct Chat"/><br/><sub>Direct Chat</sub></td>
    <td><img src="docs/screen/27-chat-group.png" width="420" alt="Group Chat"/><br/><sub>Group Broadcast Chat</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/31-widget-dashboard.png" width="420" alt="Agents Widget"/><br/><sub>Agents Widget</sub></td>
    <td><img src="docs/screen/34-widget-alerts.png" width="420" alt="Alerts Widget"/><br/><sub>Alerts Widget</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/12-settings-general.png" width="420" alt="Settings"/><br/><sub>Settings</sub></td>
    <td><img src="docs/screen/18-library-skills.png" width="420" alt="Library — Skills"/><br/><sub>Library — Skills</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screen/30-mission-control.png" width="420" alt="Mission Control"/><br/><sub>Mission Control (Ctrl+↑)</sub></td>
    <td><img src="docs/screen/11-command-palette.png" width="420" alt="Command Palette"/><br/><sub>Command Palette (Ctrl+Shift+K)</sub></td>
  </tr>
</table>

---

## 🌍 Multi-Language Support

AgentDesk supports **Korean · English · Japanese · Chinese** — all UI text adapts to the selected language. See [README_ko.md](README_ko.md) for the full Korean version with language comparison screenshots.

---

## What is AgentDesk?

AgentDesk is a **project operating system** for AI agent teams. It runs as a local web app and lets you:

- **Create & manage AI agents** — define personas, roles, departments, CLI providers, and API models
- **Orchestrate workflows** — visual builder, scheduled tasks, multi-agent composition pipelines
- **Monitor in real-time** — heartbeat widgets, task boards, alert feeds, flow graphs, CLI cost tracking
- **Chat with your agents** — direct messages, group broadcast, Telegram/Discord/Slack gateway
- **Build a shared knowledge base** — Skills, Rules, Memory, Hooks, and Deliverables library
- **Control everything** — macOS-style desktop with Spotlight search, Mission Control, Quick Look

---

## Key Features

### 🖥️ macOS-Inspired Desktop OS
- Menubar + desktop icons + Dock + floating windows
- Drag & drop icon placement with Jiggle Mode
- Quick Look (Space) for project previews
- Mission Control overview (Ctrl+↑)
- Spotlight-style command palette (Ctrl+Shift+K)
- 10 animated wallpaper themes

### 👤 Agent & Department Management
- Hire agents with custom avatars, personas, and role levels (Team Leader / Senior / Junior / Intern)
- Organize into departments with shared system prompts
- Assign CLI providers (Claude, OpenAI, Gemini, etc.) or API models
- Real-time heartbeat monitoring

### ⚡ Workflow Automation
- Visual drag-and-drop workflow builder
- Scheduled tasks with cron expressions
- Multi-agent composition pipelines with custom node types
- 7 built-in workflow packs (development, research, novel, report, video, roleplay, asset management)

### 💬 Multi-Agent Chat
- Direct messaging to individual agents
- Group broadcast channel to all agents
- Telegram / Discord / Slack gateway integration
- `$` directive and `!` task flows via messenger

### 📚 Knowledge Library
- **Skills** — reusable task templates
- **Rules** — behavior constraints and guidelines
- **Memory** — persistent agent context
- **Hooks** — event-driven automation scripts
- **Deliverables** — output artifact tracking

### 📊 Real-Time Dashboard Widgets
| Widget | Description |
|--------|-------------|
| 💓 Agents | Live agent status list (working / idle / offline) |
| 📋 Tasks | Active task board |
| 🔔 Alerts | Anomaly & error notifications |
| 💰 CLI Cost | Token usage & rate limit tracking |
| 🔀 Flow Graph | Agent communication flow graph |
| 🗂 File Tree | Project directory browser |

### 🌍 Multi-Language Support
Korean · English · Japanese · Chinese (configured per user)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Flow diagrams | `@xyflow/react` v12 |
| Backend | Node.js + Express + tsx |
| Database | SQLite (`better-sqlite3`) + versioned migrations |
| Real-time | WebSocket |
| Logging | pino |
| Testing | Vitest (unit + integration) + Playwright (E2E) |
| Package manager | pnpm |
| Desktop (optional) | Electron |

---

## Quick Start

**Requirements:** Node.js ≥ 22, pnpm ≥ 10

```bash
git clone <repo-url> && cd AgentDesk
pnpm install
cp .env.example .env      # Set SESSION_SECRET (required)
pnpm setup                # Initialize DB + run migrations
pnpm dev                  # Frontend (8800) + API (8790)
```

Open **http://localhost:8800** in your browser.

### First Agent Setup

```
1. Settings → API → Add API Provider (Claude / OpenAI / Gemini)
2. Agent Manager → Add Department → Hire Agent
3. Desktop → 📁 New Project → assign agents
4. Library → configure Rules / Memory / Hooks (optional)
5. Desktop → ▶ Run Task → monitor via terminal panel
```

### Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (frontend + API) |
| `pnpm build` | Production build |
| `pnpm test` | Full test suite (frontend + server) |
| `pnpm run test:web` | Frontend tests only (Vitest) |
| `pnpm run test:api` | Server tests only (Vitest) |
| `pnpm lint` | Lint check |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm setup` | Re-run DB migrations |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+K` / `Cmd+K` | Command Palette |
| `Ctrl+↑` | Mission Control |
| `g w` | Toggle Workflow window |
| `g l` | Toggle Library window |
| `g s` | Toggle Settings window |
| `g c` | Toggle Chat window |
| `g a` | Toggle Agent Manager |
| `g e` | Toggle REPL |
| `Space` | Quick Look (when icon selected) |
| `?` | Keyboard shortcuts guide |

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/OVERVIEW.md`](docs/OVERVIEW.md) | Architecture overview + feature completion roadmap |
| [`docs/design/AI-GUIDE.md`](docs/design/AI-GUIDE.md) | AI developer design principles |
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | Full screen & modal specifications |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS variables + component style rules |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API specification |

---

## License

Apache 2.0
