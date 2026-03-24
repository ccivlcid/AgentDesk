# AgentDesk Development Roadmap

> Collection of implementation spec documents for AI agents to carry out development.

---

## Current Status

```
Create   ████████░░  80%
Run      █████████░  85%  ✅ Phase 21 complete
Observe  █████████░  90%  ✅ Phase 25 complete
Debug    ████████░░  75%  ✅ Phase 22 complete
Optimize ███████░░░  65%  ✅ Phase 23 complete

Overall  ████████░░  79%
```

**Phases 21-25 all complete.**

---

## Phase Structure

| Phase | Goal | Document | Scope | Dependencies |
|-------|------|----------|-------|--------------|
| **21** | **PM Orchestration** | [PHASE-21-RUN-STABILITY.md](./PHASE-21-RUN-STABILITY.md) | Medium | None |
| **22** | **Debug Experience** | [PHASE-22-DEBUG-EXPERIENCE.md](./PHASE-22-DEBUG-EXPERIENCE.md) | Medium | Phase 21 required |
| **23** | **Optimize Learning** | [PHASE-23-OPTIMIZE-LEARNING.md](./PHASE-23-OPTIMIZE-LEARNING.md) | Large | Phase 21, 22 |
| **24** | **Stability** | *(no separate spec — DB indexes, graceful shutdown, flood prevention)* | Medium | Phase 21-23 |
| **25** | **Feature Extension** | *(no separate spec — prompt UI, agent fitness scoring, i18n foundation)* | Medium | Phase 24 |

---

## Phase 21: PM Agent Orchestration

**Core**: Orchestration previously handled by timers/system code is now performed by the PM agent via LLM reasoning.

| # | Item | Key Change |
|---|------|------------|
| 21-1 | PM orchestration engine | pm-orchestrator.ts — PM receives events → LLM reasoning → action |
| 21-2 | PM prompt files | prompts/pm/review-task.md, handle-failure.md |
| 21-3 | Event bus | event-bus.ts — task state change events |
| 21-4 | Remove legacy polling | Remove PM oversight setInterval, YOLO regex auto-click |
| 21-5 | Failure retry (PM decision) | PM decides retry/reassign/escalate |
| 21-6 | Server recovery + Shutdown | pm_oversight_state table, graceful shutdown |

## Phase 22: Debug Experience

The phase where PM can analyze failures and review prompt history. (Phase 21's `pmHandleFailure()` provides basic analysis. Phase 22 enhances UI/UX.)

| # | Item | Key Change |
|---|------|------------|
| 22-1 | PM failure analysis UI | Display PM's error_analysis in task card |
| 22-2 | Prompt history UI | /api/tasks/:id/prompt + viewer component |
| 22-3 | One-click task retry | POST /api/tasks/:id/retry → request re-execution from PM |
| 22-4 | Agent conflict detection | PM detects concurrent execution → warning |

## Phase 23: Optimize Learning Loop

Build a feedback loop so the system continuously improves.

| # | Item | Key Change |
|---|------|------------|
| 23-1 | Auto-learning | Auto-extract Rules/Memory on task completion |
| 23-2 | Agent fitness tracking | agent_task_fitness table + kickoff recommendations |
| 23-3 | Prompt version management | prompt_versions table + success rate comparison |
| 23-4 | Project retrospective report | Auto-generate retrospective on full project completion |

---

## AI Agent Development Guide

### Phase Document Structure

All Phase documents follow the same structure:

1. **Purpose** — Why this work is needed
2. **DB Changes** — Migration SQL (must follow CLAUDE.md rules)
3. **Server Changes** — File paths + code snippets + call sites
4. **Frontend Changes** — Components + API functions
5. **Test Scenarios** — Verification criteria
6. **Implementation Order** — Dependency-based execution order

### Development Rules (Strict CLAUDE.md Compliance)

> **Full rules**: [`/CLAUDE.md` Section 0](../../../CLAUDE.md) (source of truth)
> **Quick reference**: [`.agents/rules/coding-rules.md`](../../../.agents/rules/coding-rules.md)
>
> Key rules: No emoji in JSX (0-1), SVG conventions (0-2), zero `any`/`as Foo` (0-3), append-only migrations (0-5), pino logger only (0-7).
> Last migration ID: `2026-03-28-013-project-app-type` → next: `2026-03-28-014-*`

### Architecture Principles (Phase 21+)

- **Event-driven**: No `setInterval` polling. Use EventBus from `server/lib/event-bus.ts`.
- **Immediate reaction**: Task state change → event emitted → listener processes immediately.
- **AI reasoning**: Instead of time-based checks (TTL, timers), AI evaluates the situation and decides.
- **Polling exceptions**: WS batching (150-250ms), cron (60s), external API polling (OAuth/Notion).

### How to Proceed

```
1. Read the Phase document
2. Proceed in implementation order
3. Verify against test criteria after each item
4. Confirm type check passes
5. Update roadmap status if needed
```
