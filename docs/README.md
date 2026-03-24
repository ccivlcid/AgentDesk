# AgentDesk Documentation Index

> **Start here:** [`OVERVIEW.md`](./OVERVIEW.md) — What AgentDesk is and how it works.
>
> **Coding rules:** [`/CLAUDE.md`](../CLAUDE.md) — Developer guide, coding conventions, file map.

---

## Core

| Document | Description |
|----------|-------------|
| [OVERVIEW.md](OVERVIEW.md) | Full architecture, agent execution, monitoring, phase status |
| [GLOSSARY.md](GLOSSARY.md) | Domain terminology — all project terms, DB mappings, state machines, UI concepts |
| [progress.md](progress.md) | Development progress — active work, completed phases, pending items |
| [SYSTEM-ISSUES.md](SYSTEM-ISSUES.md) | System stability issue tracker (CRITICAL / HIGH / MEDIUM / LOW) |

---

## architecture/

| Document | Description |
|----------|-------------|
| [schema-erd.md](architecture/schema-erd.md) | DB schema ER diagram + state machines |
| [AGENT-CONFIGURATION-AND-EXECUTION.md](architecture/AGENT-CONFIGURATION-AND-EXECUTION.md) | Agent config & execution — DB fields, task/chat/runtime branching, CLI/API/persona (as-built) |

---

## design/

| Document | Description |
|----------|-------------|
| [DESIGN.md](design/DESIGN.md) | CSS variables + component style rules |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Screen & modal specs (macOS desktop OS metaphor) |
| [STRATEGY-IMPROVEMENT.md](design/STRATEGY-IMPROVEMENT.md) | Design improvement vision v2.0 (future — phase TBD) |

---

## specs/

| Document | Description |
|----------|-------------|
| [api.md](specs/api.md) | REST API specification (v1.6.4) |
| [websocket-protocol.md](specs/websocket-protocol.md) | WebSocket event protocol — all event types, payloads, and subscriptions |

---

## strategy/

| Document | Description |
|----------|-------------|
| [PROJECT-DIRECTION.md](strategy/PROJECT-DIRECTION.md) | Project direction — positioning, product principles, short/mid-term priorities |
| [AGENT-RUNTIME-SPEC.md](strategy/AGENT-RUNTIME-SPEC.md) | Agent Runtime Engine spec (Phase 19) — LLM direct execution + Tool Use Loop |
| [PM-WORKFLOW-SPEC.md](strategy/PM-WORKFLOW-SPEC.md) | PM orchestration spec — kickoff / review / approve / re-execute pipeline |
| [PROJECT-DIRECTIVE-SPEC.md](strategy/PROJECT-DIRECTIVE-SPEC.md) | Project directive system spec (Phase 19-B) |
| [PROJECT-ADDITIONAL-TASK-SPEC.md](strategy/PROJECT-ADDITIONAL-TASK-SPEC.md) | Add-tasks feature spec — append tasks to existing projects |
| [AgentDesk_OpenSource_Product_Strategy.md](strategy/AgentDesk_OpenSource_Product_Strategy.md) | Open-source product strategy + README draft |
| [REPO-STORE.md](strategy/REPO-STORE.md) | GitHub repo app store concept (future — phase TBD) |
| [REPO-STORE-APP-RUNNER.md](strategy/REPO-STORE-APP-RUNNER.md) | Repo Store + App Runner integration concept |
| [APP-RUNNER-AUTORUN.md](strategy/APP-RUNNER-AUTORUN.md) | App Runner auto-run spec |
| [I18N-LOCALIZATION-PLAN.md](strategy/I18N-LOCALIZATION-PLAN.md) | i18n separation plan — hardcoded strings to key-based translation catalog (Phase 1 done) |
| [I18N-AGENT-WORKPACK.md](strategy/I18N-AGENT-WORKPACK.md) | i18n agent workpack — execution spec for AI agents (parallel-safe) |

---

## strategy/roadmap/

| Document | Description |
|----------|-------------|
| [README.md](strategy/roadmap/README.md) | Roadmap status — phase structure, dev guidelines (**single source of truth for phase status**) |
| [PHASE-21-RUN-STABILITY.md](strategy/roadmap/PHASE-21-RUN-STABILITY.md) | Phase 21: PM orchestration + run stability (29-point decision matrix) |
| [PHASE-22-DEBUG-EXPERIENCE.md](strategy/roadmap/PHASE-22-DEBUG-EXPERIENCE.md) | Phase 22: Debug experience (AI error analysis) |
| [PHASE-23-OPTIMIZE-LEARNING.md](strategy/roadmap/PHASE-23-OPTIMIZE-LEARNING.md) | Phase 23: Learning loop optimization (auto-learn + retrospective) |
| [BACKLOG.md](strategy/roadmap/BACKLOG.md) | Post-Phase 25 backlog (P1-P3 priorities) |
| [SHIP-AUTOMATION.md](strategy/roadmap/SHIP-AUTOMATION.md) | Ship automation — version bump / CHANGELOG generation |
| [LIBRARY-IMPROVEMENT.md](strategy/roadmap/LIBRARY-IMPROVEMENT.md) | Library UI/UX improvement proposal |

---

## reports/

| Document | Description |
|----------|-------------|
| [coding-rule-violations-2026-03-24.md](reports/coding-rule-violations-2026-03-24.md) | CLAUDE.md coding rule violations — emoji / SVG / `any` / type assertions |

---

## Rules

- **Links:** Use relative paths only.
- **Phase status:** `strategy/roadmap/README.md` is the single source of truth.
- **Removed docs:** `progress.md`, `VISION-VS-REALITY.md`, `error/log.md`, `ARCHITECTURE-AUDIT-2026-Q1.md`, `MACOS-UX-IMPROVEMENTS.md`, `LARGE-SOURCE-FILES.md`, `bigger-ide-vision.md`, `agent-performance-audit.md`, `cli-hybrid-execution.md`, `SYSTEM-STRUCTURE-MAP.md`
