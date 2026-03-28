# AgentDesk Documentation

> **AgentDesk** — Multi-LLM Orchestrator for Software Development
>
> GUI (non-developers) + TUI (developers), same server, same data.

---

## Quick Start

```bash
# Start server first
pnpm dev

# GUI (PM, designers, managers) — open in browser
open http://localhost:8800

# TUI (developers) — interactive terminal
pnpm cli

# CLI (developers) — quick commands
pnpm cli status
pnpm cli agents
pnpm cli tasks
pnpm cli kickoff --name "Auth Service" --goal "OAuth2 implementation"
pnpm cli logs -f --project <id>
```

---

## Core Docs

| Document | Audience | Purpose |
|----------|----------|---------|
| [`/CLAUDE.md`](../CLAUDE.md) | AI agents | Coding rules, file map, core flows |
| [FULLSTACK-ARCHITECTURE.md](architecture/FULLSTACK-ARCHITECTURE.md) | All | System architecture — dual client, server, Intent API |
| [progress.md](progress.md) | All | Development status and roadmap |

## Design

| Document | Audience | Purpose |
|----------|----------|---------|
| [TUI-DESIGN.md](design/TUI-DESIGN.md) | Developers | TUI spec — conversational terminal interface |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Non-developers | GUI spec — macOS desktop metaphor |
| [DESIGN.md](design/DESIGN.md) | Frontend | CSS variables, component style rules |

## Architecture

| Document | Purpose |
|----------|---------|
| [schema-erd.md](architecture/schema-erd.md) | DB schema ER diagram |
| [AGENT-CONFIGURATION-AND-EXECUTION.md](architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent execution — CLI/API/OAuth branching |
| [llm-call-patterns.md](architecture/llm-call-patterns.md) | LLM call patterns — all prompts in .md files |
| [cli-detection.md](architecture/cli-detection.md) | CLI tool detection flow |
| [cli-execution.md](architecture/cli-execution.md) | CLI execution — spawn to streaming |
| [PM-WORKFLOW-SPEC.md](strategy/PM-WORKFLOW-SPEC.md) | PM orchestration — kickoff, review, fitness |

## Specs

| Document | Purpose |
|----------|---------|
| [api.md](specs/api.md) | REST API specification |
| [websocket-protocol.md](specs/websocket-protocol.md) | WebSocket event types and payloads |

## Reference

| Document | Purpose |
|----------|---------|
| [FEATURES.md](FEATURES.md) | Complete feature inventory |
| [GLOSSARY.md](GLOSSARY.md) | Terminology — DB/UI mapping, domain concepts |
