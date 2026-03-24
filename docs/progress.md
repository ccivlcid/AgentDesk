# AgentDesk — Development Progress

> Last updated: 2026-03-24

---

## Current State
- **Last applied migration**: `2026-03-28-013-project-app-type`
- **Latest completed phase**: Phase 25
- **Next work**: See Pending Work below

---

## Active Work

### Documentation Overhaul (2026-03-24)

- Rebuilt `docs/README.md` as complete index (26 files)
- Translated all 23 Korean docs to English for AI agent readability
- Removed obsolete docs: `VISION-VS-REALITY.md`, `error/log.md`
- Removed orphaned `error/` directory
- Translated `strategy/roadmap/README.md` to English
- `roadmap/README.md` is now the single source of truth for phase status

### Coding Rule Audit (2026-03-24)

- Full audit against CLAUDE.md Section 0 rules
- Generated `docs/reports/coding-rule-violations-2026-03-24.md`
- Findings:
  - Rule 0-1 (no emoji in UI): 60+ violations across 25+ files
  - Rule 0-2 (SVG conventions): 35+ violations across 15+ files
  - Rule 0-3 (`any` types): ~1,500+ cases across 488 files
  - Rule 0-3 (`as Foo` assertions): 81+ cases (40+ double-casts)
  - Rule 0-7 (no `console.log`): 0 violations — passed

### Skills Installation (2026-03-24)

- Installed 6 agent skills to `.agents/skills/`:
  - `vercel-react-best-practices` (Tier 1)
  - `playwright-best-practices` (Tier 1)
  - `frontend-design` (Tier 1)
  - `vitest` (Tier 2)
  - `web-design-guidelines` (Tier 2)
  - `vercel-composition-patterns` (Tier 2)

---

## Completed Phases

> Phase specs are in `docs/strategy/roadmap/`. See [roadmap/README.md](strategy/roadmap/README.md) for details.

| Phase | Goal | Status |
|-------|------|--------|
| 1-20 | Core platform (desktop OS, agents, tasks, workflow, CLI, image studio, synapse, local LLM) | Done |
| 21 | PM Agent Orchestration — event-driven, LLM-based review/approve/retry | Done |
| 22 | Debug Experience — AI failure analysis, prompt history, one-click retry | Done |
| 23 | Learning Loop — auto-learn rules/memory, agent fitness, prompt versioning | Done |
| 24 | Stability — DB indexes, graceful shutdown, flood prevention | Done |
| 25 | Feature Extension — prompt UI, agent fitness scoring, i18n foundation | Done |

---

## Pending Work

> See [roadmap/BACKLOG.md](strategy/roadmap/BACKLOG.md) for full backlog with priorities.

| Priority | Item | Reference |
|----------|------|-----------|
| P0 | Fix coding rule violations (emoji, SVG, `any`, double-casts) | `docs/reports/coding-rule-violations-2026-03-24.md` |
| P1 | Multi-provider agent runtime (currently Anthropic-only) | `roadmap/BACKLOG.md` |
| P1 | PM fitness-based agent assignment | `roadmap/BACKLOG.md` |
| P1 | `run_command` tool implementation | `roadmap/BACKLOG.md` |
| P2 | i18n full migration (Phase 1 done, hardcoded strings remain) | `strategy/I18N-AGENT-WORKPACK.md` |
| P2 | System stability issues | `SYSTEM-ISSUES.md` |
