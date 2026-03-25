# AgentDesk Documentation Index

> **Start here:** [`/CLAUDE.md`](../CLAUDE.md) — Coding rules, file map, core flows.
>
> **Drift check:** `pnpm lint:docs` — automated verification of code↔docs sync (12 checks).

---

## Essential

| Document | Purpose |
|----------|---------|
| [`/CLAUDE.md`](../CLAUDE.md) | Coding rules, file map, kickoff/PM/review flows, terminology |
| [FEATURES.md](FEATURES.md) | **All features** — 23 categories, code-based complete inventory |
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
| [kova-comparison.md](architecture/kova-comparison.md) | Kova vs AgentDesk — strengths, weaknesses, integration points |
| [any-type-removal-guide.md](architecture/any-type-removal-guide.md) | `any` type removal — 589 occurrences, 4-phase execution plan |

## Design

| Document | Purpose |
|----------|---------|
| [DESIGN.md](design/DESIGN.md) | CSS variables, component style rules |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Screen & modal specs (macOS desktop metaphor) |

## Strategy & Analysis

| Document | Purpose |
|----------|---------|
| [SYSTEM-PROBLEMS-4-AXIS.md](strategy/SYSTEM-PROBLEMS-4-AXIS.md) | System problems — product, architecture, operations, UX (4-axis) |
| [AGENTDESK-STRENGTHS-AND-WEAKNESSES-ko.md](strategy/AGENTDESK-STRENGTHS-AND-WEAKNESSES-ko.md) | Strengths & weaknesses analysis (Korean) |
| [FEATURE-PRIORITIZATION-ko.md](strategy/FEATURE-PRIORITIZATION-ko.md) | Korean prioritization of core features to strengthen vs features to reduce or deprioritize |

## Pending Work

| Document | Purpose |
|----------|---------|
| [I18N-LOCALIZATION-PLAN.md](strategy/I18N-LOCALIZATION-PLAN.md) | i18n plan (2,454 strings remaining) |
| [I18N-AGENT-WORKPACK.md](strategy/I18N-AGENT-WORKPACK.md) | i18n execution spec for AI agents |
