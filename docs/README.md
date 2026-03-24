# AgentDesk Documentation Index

> **Start here:** [`/CLAUDE.md`](../CLAUDE.md) — Developer guide, coding rules, file map, core flows.
>
> **Completed specs** are in [`docs/archive/`](./archive/) — implementation is done, code is the source of truth.

---

## Essential (always read)

| Document | Description |
|----------|-------------|
| [`/CLAUDE.md`](../CLAUDE.md) | Coding rules, file map, kickoff/PM flows, terminology |
| [schema-erd.md](architecture/schema-erd.md) | DB schema ER diagram + state machines + indexes |
| [api.md](specs/api.md) | REST API specification (v1.6.4) |
| [progress.md](progress.md) | Current state — active work, completed phases, pending items |
| [GLOSSARY.md](GLOSSARY.md) | System terminology — DB/UI name mapping, state machines, domain concepts |

---

## Reference (read when needed)

| Document | Description |
|----------|-------------|
| [AGENT-CONFIGURATION-AND-EXECUTION.md](architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent execution branching — CLI/API/OAuth/runtime selection logic |
| [llm-call-patterns.md](architecture/llm-call-patterns.md) | LLM call patterns — streaming, one-shot, CLI, all prompts in .md |
| [PM-WORKFLOW-SPEC.md](strategy/PM-WORKFLOW-SPEC.md) | PM orchestration — kickoff, review, project-level review, fitness assignment |
| [websocket-protocol.md](specs/websocket-protocol.md) | WebSocket event types and payloads |
| [BACKLOG.md](strategy/roadmap/BACKLOG.md) | Post-Phase 25 backlog (priorities) |
| [roadmap/README.md](strategy/roadmap/README.md) | Phase status (single source of truth) |

---

## Design

| Document | Description |
|----------|-------------|
| [DESIGN.md](design/DESIGN.md) | CSS variables + component style rules |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Screen & modal specs (macOS desktop metaphor) |

---

## Strategy (active)

| Document | Description |
|----------|-------------|
| [PROJECT-DIRECTION.md](strategy/PROJECT-DIRECTION.md) | Product positioning + priorities |
| [I18N-LOCALIZATION-PLAN.md](strategy/I18N-LOCALIZATION-PLAN.md) | i18n plan (Phase 1 done, 2,454 strings remaining) |
| [I18N-AGENT-WORKPACK.md](strategy/I18N-AGENT-WORKPACK.md) | i18n execution spec for AI agents |

---

## Archive (implementation complete — code is source of truth)

Moved to [`docs/archive/`](./archive/). Do not reference for new development.

| Archived | Reason |
|----------|--------|
| PHASE-21/22/23, SHIP-AUTOMATION, LIBRARY-IMPROVEMENT | Phase specs — all implemented |
| REPO-STORE, REPO-STORE-APP-RUNNER, APP-RUNNER-AUTORUN | App runner — implemented |
| AGENT-RUNTIME-SPEC, PROJECT-DIRECTIVE-SPEC, PROJECT-ADDITIONAL-TASK-SPEC | Feature specs — implemented |
| AgentDesk_OpenSource_Product_Strategy | Strategy doc — not dev reference |
| OVERVIEW | Superseded by CLAUDE.md |
| SYSTEM-ISSUES, coding-rule-violations | Mostly resolved |
| STRATEGY-IMPROVEMENT | Future proposal |
