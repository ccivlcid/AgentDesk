# AgentDesk

AI Agent Office Simulator - Command your AI agent team from the CEO desk.

## Features

- Pixel-art animated office with departments and agent movement
- CEO dashboard with KPI metrics and agent rankings
- Multiple AI provider support (Claude Code, Codex CLI, Gemini CLI, etc.)
- Task management with Kanban board
- Messenger integration (Telegram, Discord, Slack, etc.)
- Multi-language UI (English, Korean, Japanese, Chinese)

## Requirements

- Node.js >= 22
- pnpm >= 10

## Quick Start

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
```

Open http://localhost:8800 in your browser.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm test` | Run all tests |
| `pnpm lint` | Code linting |
| `pnpm setup` | Initial setup |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, PixiJS
- **Backend**: Express 5, SQLite, WebSocket
- **Testing**: Vitest, Playwright

## License

Apache 2.0
