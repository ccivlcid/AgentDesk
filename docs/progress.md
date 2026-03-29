# AgentDesk — Development Progress

> Last updated: 2026-03-28
>
> Direction: Multi-LLM orchestrator for software development.
> GUI (non-developers) + TUI (developers).

---

## Current State

- **Last applied migration**: `2026-03-29-011-agent-llm-distribution`
- **Next migration ID**: `2026-03-29-012-*`
- **Active phase**: Phase 27 — CLI + TUI

---

## Phase 27 — CLI + TUI (2026-03-28)

> Two audiences: GUI for non-developers, TUI for developers.
> Same server, same API, same data.

### Completed

| # | Work | Status |
|---|------|--------|
| 1 | CLI command mode (`cli/`) — status, tasks, agents, kickoff, logs, add-tasks, open | Done |
| 2 | CLI session auth (cookie via `/api/auth/session`) | Done |
| 3 | Full-stack architecture design (`docs/architecture/FULLSTACK-ARCHITECTURE.md`) | Done |
| 4 | TUI UI/UX design (`docs/design/TUI-DESIGN.md`) | Done |
| 5 | Documentation cleanup — removed i18n docs, any-type-removal, execution-path-consistency, ORCHESTRATION-TIMELINE | Done |
| 6 | All docs rewritten for dual-audience direction | Done |
| 7 | shared/ type extraction (`shared/types.ts`, `ws-events.ts`, `constants.ts`) | Done |
| 8 | DB migration `2026-03-29-008-agents-dedup-korean` (tui_sessions, agents dedup/korean) | Done |
| 9 | Intent Interpreter API (`POST /api/tui/interpret`) + prompt (`tui-intent.md`) | Done |
| 10 | Session API (`/api/tui/sessions`) — CRUD + messages | Done |
| 11 | WebSocket session subscription (`session_message` event) | Done |
| 12 | TUI ink implementation — HeaderBar, ChatArea, Message, InputBar, StatusBar, CommandPalette | Done |
| 13 | TUI hooks — useSession, useWebSocket (ref fix), useInterpret | Done |
| 14 | Slash commands (13 commands) + Plan/Build mode (Tab toggle) | Done |
| 15 | Session management — /new, /setup, /projects switch, first-time setup | Done |
| 16 | Code review fixes — CRITICAL (exit/ws-open), HIGH (stale closure, validation, cleanup) | Done |

| 17 | @ file fuzzy search (FileSearch.tsx) | Done |
| 18 | Tool call collapse/expand (ToolCall.tsx + /details) | Done |
| 19 | File diff rendering (FileDiff.tsx) | Done |

| 20 | CLI build script (`scripts/build-cli.mjs`) + TUI usage docs | Done |
| 21 | Sidebar (Project, Agents, Tasks, Pipeline, Cost) + StatusBar metrics | Done |
| 22 | /connect, /providers, /models (provider setup) | Done |
| 23 | /agent create/list/delete/assign (agent management) | Done |
| 24 | /inbox, /approve, /revise (PM decisions) | Done |
| 25 | /skills, /rules, /memory, /hooks (library management) | Done |
| 26 | /cost, /usage (monitoring) | Done |
| 27 | /sessions, /fork, /resume (session management) | Done |
| 28 | Leader key system (Ctrl+X → 2s timeout, 11 bindings) | Done |
| 29 | 16ms WebSocket event batching | Done |
| 30 | Welcome screen + language selector + cheat sheet | Done |

### Phase 27 Complete

All TUI features implemented. 40+ slash commands, Sidebar, StatusBar metrics, Leader keys, event batching.

### Feature cleanup (completed)

| Feature | Status |
|---------|--------|
| Workflow Packs (novel, roleplay, video, asset, report) | Removed |
| Cross-Dept Cooperation / Report Routing | Removed |
| Video rendering system (12 files) | Removed |
| Announcement Response | Removed |
| Non-dev departments (6) + agent seeds (12) | Removed |
| Seeds reduced | 1053 → 687 lines |

---

## Phase 26 — Developer OS Pivot (2026-03-25)

> "AI Agent OS" → "Developer-focused multi-LLM orchestrator OS"
> Removed ~85,000 lines of non-core features.

| Removed Feature | Lines |
|----------------|-------|
| Image Studio | ~2,256 |
| Synapse (Notion/Obsidian) | ~3,307 |
| App Runner | ~1,248 |
| Wallpaper Picker | ~475 |
| Dashboard | ~680 |
| Workflow Builder | ~7,994 |
| Telegram Messenger | — |
| Chat System | ~35,000 |
| Messenger (Discord/Slack/etc.) | ~34,000 |
| PM Activity Panel | — |
| Local LLM UI | — |
| TaskBoard | — |
| Reports Window | — |

**Added:** Orchestration Timeline (4 tabs: Timeline, Logs, Agents, Room)

---

## Earlier Work

- RuntimeContext typing (any removal, batch 1-3)
- Security fixes (shell injection, memory leak)
- LLM client refactoring (`callLlmOneShotAuto`)
- Emoji-to-SVG enforcement (Rule 0-1)
- PM fitness-based agent assignment
- Documentation drift prevention (12 automated checks)
- Project type cleanup (6 categories → mvp, fullstack, mobile, ai-ml, research, custom)
