# Kova vs AgentDesk — Comparison & Integration Analysis

> Source: `feature/github/kova-main/` (Kova 0.1.0 beta)
> Purpose: AI agents reference this to understand both systems and potential integration points.

---

## 1. One-Line Summary

```
Kova    = Developer's local terminal workspace for AI-assisted coding (Git + tmux)
AgentDesk = PM's orchestration OS for running multiple AI agent teams (planning + review + execution)
```

**Relationship:** Complementary layers, not competitors.

---

## 2. Tech Stack Comparison

| Layer | Kova | AgentDesk |
|-------|------|-----------|
| Framework | Tauri v2 (Rust + WebView) | Electron + Express + SQLite |
| Frontend | React 19 + Zustand + Tailwind | React 19 + Zustand + Tailwind |
| Backend | Rust (services + IPC) | Node.js + Express + tsx |
| DB | SQLite (rusqlite) | SQLite (better-sqlite3) |
| Terminal | xterm.js 6.0 + tmux (core) | xterm.js (optional panel) |
| Git | d3-shape visual graph + worktree GUI | Worktree auto-management (no GUI) |
| Package | Bun | pnpm |
| Platform | macOS only | macOS + Windows + Linux |

---

## 3. Kova Strengths (AgentDesk Lacks)

| Strength | Detail | Integration Opportunity |
|----------|--------|------------------------|
| **Native performance** | Tauri/Rust — low memory, fast startup | N/A (architecture difference) |
| **tmux terminal** | Scrollback on server, split panes, session persistence | Add tmux-backed terminal option to AgentDesk CLI Window |
| **AI-aware Git graph** | `Co-Authored-By` detection, d3 visual graph, branch dimming | Add Git visualization tab to ProjectFolderWindow |
| **Worktree GUI** | One-click create/merge/delete worktrees | Add worktree management UI (currently code-only) |
| **Korean IME** | 22+ stability patches for xterm.js | Port IME fixes to AgentDesk terminal |
| **Hook injection** | Auto-inject hooks into Claude/Codex/Gemini configs | Reuse hook patterns for agent monitoring |
| **Inline editor** | CodeMirror 6 with 60+ languages | Add inline file editor to Files tab |

---

## 4. AgentDesk Strengths (Kova Lacks)

| Strength | Detail |
|----------|--------|
| **Multi-agent orchestration** | PM plans, assigns, reviews, re-executes |
| **LLM direct execution** | Anthropic + OpenAI-compatible streaming + tool use |
| **Fitness-based assignment** | Per-agent per-task-type success rate scoring |
| **Project-level review** | All tasks done → PM evaluates vs goal → GAPS_FOUND → auto follow-up |
| **9 CLI providers** | claude, codex, gemini, cursor, copilot, antigravity, opencode, api, ollama |
| **Cross-platform** | macOS + Windows + Linux |
| **Rich UI** | Desktop OS metaphor, kanban, workflow builder, image studio |
| **Auto-learning** | Rules/memory/skills auto-extraction from completed tasks |
| **Ship automation** | Version bump + CHANGELOG on task completion |
| **App Runner** | AI auto-analyze → install → run with prompt UI |

---

## 5. Kova Weaknesses

| Weakness | Impact |
|----------|--------|
| macOS only | No Windows/Linux users |
| No PM/orchestration | Individual developer tool — no team workflow |
| No LLM direct call | Depends on external CLI tools for agent execution |
| 3 agents only | Claude Code, Codex, Gemini — no role-based assignment |
| No task management | No kanban, no status tracking, no review cycle |
| No fitness/learning | No performance tracking or auto-improvement |
| Simple DB | Project metadata + notifications only |

---

## 6. AgentDesk Weaknesses

| Weakness | Impact |
|----------|--------|
| Heavy runtime | Electron + Express — higher resource usage than Tauri |
| Weak terminal | Optional panel, no tmux integration |
| No Git visualization | No commit graph, no AI commit detection |
| No worktree GUI | Auto-managed in code but user cannot see/control |
| No inline editor | Files tab is read-only preview |
| i18n incomplete | 2,454 hardcoded strings remaining |
| `any` types | ~589 occurrences (concentrated in runtime-context) |

---

## 7. Potential Integration Points

| Feature | Source | Target | Effort |
|---------|--------|--------|--------|
| Git graph component | Kova (d3-shape) | AgentDesk ProjectFolderWindow Git tab | Large |
| Worktree management UI | Kova | AgentDesk ProjectFolderWindow | Medium |
| tmux terminal backend | Kova | AgentDesk CLI Window | Large |
| Hook injection patterns | Kova (Rust) | AgentDesk (Node.js port) | Medium |
| CodeMirror inline editor | Kova | AgentDesk Files tab | Medium |
| AI commit detection | Kova (`Co-Authored-By`) | AgentDesk Git tab | Small |

---

## 8. Key Architecture Decisions

### Why Kova chose Tauri
- Native macOS feel (WKWebView)
- Rust for Git/tmux operations (performance-critical)
- Single binary distribution via Homebrew
- Trade-off: macOS only

### Why AgentDesk chose Electron
- Cross-platform (macOS + Windows + Linux)
- Express backend enables rich server-side logic (LLM, orchestration)
- SQLite for complex data model (tasks, agents, fitness, meetings)
- Trade-off: Higher resource usage
