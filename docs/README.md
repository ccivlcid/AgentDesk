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
| [execution-path-consistency.md](architecture/execution-path-consistency.md) | P1: 실행 경로 불일치 — 태스크 실행 vs PM 리뷰 경로 분석 + 오케스트레이션 화면 연동 수정 계획 |

## Design

| Document | Purpose |
|----------|---------|
| [DESIGN.md](design/DESIGN.md) | CSS variables, component style rules |
| [UI-SCREENS.md](design/UI-SCREENS.md) | Screen & modal specs (macOS desktop metaphor) |
| [ORCHESTRATION-TIMELINE.md](design/ORCHESTRATION-TIMELINE.md) | Orchestration Timeline UI — TaskBoard 대체, 개발자 중심 실시간 오케스트레이션 뷰 |

## Strategy

| Document | Purpose |
|----------|---------|
| [I18N-LOCALIZATION-PLAN.md](strategy/I18N-LOCALIZATION-PLAN.md) | i18n plan (2,454 strings remaining) |
| [I18N-AGENT-WORKPACK.md](strategy/I18N-AGENT-WORKPACK.md) | i18n execution spec for AI agents |
