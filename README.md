# AgentDesk

**Product Requirements — Overview**

AgentDesk is a **Project OS**: an operator cockpit for AI agents that run as CLI processes. You manage projects, tasks, and agent teams in one place, with messenger integration and a pixel-office view.

---

## Concept

| Item | Description |
|------|-------------|
| **One-liner** | **Work your way, get the results you need** — you (the client) define projects, tasks, and agents; manage execution flow and deliverables in one place. |
| **Metaphor** | Pixel-art **office simulator**: space where departments and agents move. Dashboard, Kanban, and terminal connect as one working environment. |
| **Design concept** | **CLI management tool** feel (k9s, lazygit-style). Dark terminal tone, monospace, ⌘K command palette. Execution view uses terminal-output style. |
| **Tagline (EN)** | A Project Operating System Tailored to Your Workflow |
| **Tagline (KR)** | 어떤 팀이든 맞춤 설계하는 프로젝트 운영체제 |

---

## 1. Product Overview

| Item | Description |
|------|-------------|
| **Vision** | A project operating system tailored to your workflow — goals, risks, gates, and deliverables in one control plane. |
| **Positioning** | CLI agent management tool (k9s/lazygit-style), not a generic dashboard. |
| **Default** | Dark theme, mono typography, keyboard-first (e.g. ⌘K command palette). |

---

## 2. Goals & Success

- **Primary:** Operators can create projects, assign tasks to agents, and track execution (terminal logs, reports) without leaving the app.
- **Secondary:** Messenger-driven directives (`$` / `!`) and decision-inbox flows; project-level team and dashboard quadrants (objectives, risks, gates, outputs).

---

## 3. Target Users

- **Primary:** People who run projects and coordinate AI agents (team leads, PMs, small-org leads).
- **Usage:** Create/select project → dashboard/task board/team → run agents → review reports and deliverables.

---

## 4. In Scope (Key Features)

| Area | Description |
|------|-------------|
| **Dashboard** | Project overview, team panel, agent activity, ops sections. |
| **WorkMap** | Pixel-art office view with departments and agents. |
| **Tasks** | Kanban board, scheduled tasks, deliverables. |
| **Agents & Team** | Agents, departments, heartbeat monitor; project team assignment. |
| **Library** | Skills, Agent Rules, Memory, Hooks. |
| **CLI Usage** | Usage and cost views. |
| **Settings** | API providers, OAuth, gateway/messenger, data, etc. |
| **Messenger** | Telegram, Discord, Slack, etc.; inbox webhook; `$` directive / `!` task flows. |

---

## 5. Out of Scope (Current)

- Multi-tenant SaaS; SSO; mobile-only app; public marketplace for categories/skills.

---

## 6. Requirements & Quick Start

**Requirements:** Node.js ≥ 22, pnpm ≥ 10

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
```

Open **http://localhost:8800** in your browser.

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint |
| `pnpm setup` | Initial setup |

---

## 7. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, PixiJS
- **Backend:** Express 5, SQLite, WebSocket
- **Testing:** Vitest, Playwright

---

## 8. Docs & License

- **Docs:** [docs/README.md](docs/README.md) — design, specs, architecture, strategy.
- **API:** [docs/specs/api.md](docs/specs/api.md); Swagger UI at `/api/docs` when server is running.
- **License:** Apache 2.0
