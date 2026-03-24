# AgentDesk Documentation Index

> **Start here:** [`/CLAUDE.md`](../CLAUDE.md) — Coding rules, file map, core flows.
>
> **Archive:** [`docs/archive/`](./archive/) — Completed specs. Code is the source of truth.

---

## Essential

| Document | Purpose |
|----------|---------|
| [`/CLAUDE.md`](../CLAUDE.md) | Coding rules, file map, kickoff/PM/review flows, terminology |
| [GLOSSARY.md](GLOSSARY.md) | System terminology — DB/UI mapping, state machines, domain concepts |
| [schema-erd.md](architecture/schema-erd.md) | DB schema ER diagram, tables, indexes |
| [api.md](specs/api.md) | REST API spec (v1.6.4) |
| [progress.md](progress.md) | Current state — what's done, what's pending |

## Architecture

| Document | Purpose |
|----------|---------|
| [AGENT-CONFIGURATION-AND-EXECUTION.md](architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent execution branching — CLI/API/OAuth/runtime |
| [llm-call-patterns.md](architecture/llm-call-patterns.md) | LLM call patterns — all prompts must be .md files |
| [PM-WORKFLOW-SPEC.md](strategy/PM-WORKFLOW-SPEC.md) | PM orchestration — kickoff, review, project-level review, fitness |
| [websocket-protocol.md](specs/websocket-protocol.md) | WebSocket event types and payloads |

## Design

| Document | Purpose |
|----------|---------|
| [DESIGN.md](design/DESIGN.md) | CSS variables, component style rules |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Screen & modal specs (macOS desktop metaphor) |

## Pending Work

| Document | Purpose |
|----------|---------|
| [I18N-LOCALIZATION-PLAN.md](strategy/I18N-LOCALIZATION-PLAN.md) | i18n plan (2,454 strings remaining) |
| [I18N-AGENT-WORKPACK.md](strategy/I18N-AGENT-WORKPACK.md) | i18n execution spec for AI agents |
