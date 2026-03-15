# Agent Execution Performance Audit Report

> Created: 2026-03-13 | Updated: 2026-03-15 (Phase 1 & 2 completion reflected)
> Scope: Full agent execution pipeline (`server/modules/workflow/**`)
> Trigger: Concern about performance degradation when multiple agents are registered and running simultaneously

---

## Overview

An audit of **concurrent execution performance** when multiple agents are registered in AgentDesk to perform development tasks identified 10 bottlenecks. The current architecture handles small-scale usage of 1–3 agents without issue, but has structural weaknesses that cause cumulative latency when **5 or more agents run simultaneously**.

---

## Bottleneck List

### 🔴 P1 — Fix Immediately (Critical)

#### ~~P1-A. 6+ repeated DB queries on task spawn~~ ✅ Completed (2026-03-14)

- **File:** `server/modules/workflow/orchestration/execution-start-task.ts:118–174`
- **Resolution:** Extracted `buildExecutionPayload()` helper function; parallelized 6 functions with `Promise.all()`
- **Effect:** Significant reduction in DB queries during concurrent spawns; latency eliminated via parallel execution

---

#### ~~P1-B. No rule/memory cache — full recalculation on every task~~ ✅ Completed (2026-03-14)

- **File (rules):** `server/modules/workflow/core/project-scoped-rules.ts`
- **File (memory):** `server/modules/workflow/orchestration/autonomous-memory.ts`
- **Resolution:** Implemented in-memory cache with `Map<cacheKey, {data, expiresAt}>` structure and 5-minute TTL
- **Effect:** DB re-queries eliminated when 10 tasks start simultaneously in the same project

---

#### ~~P1-C. Hook execution was synchronous blocking (`execFileSync`)~~ ✅ Completed (2026-03-14)

- **File:** `server/modules/workflow/core/hook-executor.ts`
- **Resolution:** Switched from `execFileSync` to `execFile` (async) with `Promise.all` parallel execution
- **Effect:** Eliminated up to 600s main thread blocking; each hook now fails independently

---

### 🟠 P2 — Fix Short-Term (High)

#### ~~P2-A. Unlimited concurrent agent processes~~ ✅ Completed (2026-03-14)

- **File:** `server/modules/workflow/orchestration/agent-queue.ts` (new)
- **Resolution:** Implemented `MAX_CONCURRENT_AGENTS` environment variable (default: 10) with FIFO wait queue
- **Effect:** `GET /api/queue-status` API + header queue status counter (Running N / Waiting M)

---

#### ~~P2-B. Missing composite index on `enabled` filter~~ ✅ Completed (2026-03-14)

- **File:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **Resolution:** Added 4 composite indexes via migration (`idx_agent_rules_enabled_scope`, `idx_memory_entries_enabled_scope`, `idx_hook_entries_enabled_event`, `idx_agent_usage_agent_time`)
- **Effect:** Eliminated full table scans on `enabled+scope` filter queries

---

#### ~~P2-C. Individual WebSocket broadcast per agent status change (no batching)~~ ✅ Completed (2026-03-14)

- **File:** `server/ws/hub.ts`
- **Resolution:** Implemented 250ms batching for cli_output, 150ms batching for subtask_update, and `MAX_BATCH_QUEUE = 60` overflow protection
- **Effect:** Significant reduction in WebSocket message volume via high-frequency event batching

---

### 🟡 P3 — Medium-Term Improvement (Medium)

#### P3-A. 3 sequential queries per task during orphan task recovery

- **File:** `server/modules/lifecycle.ts` (`recoverOrphanInProgressTasks`)
- **Problem:** For each `in_progress` task N, runs 3 sequential queries + 1 fs call
- **Impact:** 100 orphan tasks = 300 queries + 100 fs calls (occurs on server restart)
- **Improvement Direction:** Batch log lookups into a single JOIN query; parallelize fs lookups with `Promise.all`

---

#### ~~P3-B. Anomaly detection runs every 60s using window functions without an index~~ ✅ Completed (2026-03-14)

- **File:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **Resolution:** Added composite index `tasks(status, execution_state, last_heartbeat_at DESC)` + made threshold configurable via `TASK_STALLED_THRESHOLD_MS` environment variable

---

#### P3-C. Task scheduler uses fixed 60-second polling

- **File:** `server/modules/workflow/orchestration/task-scheduler.ts`
- **Problem:** `setInterval(sweep, 60_000)` — processes on a fixed 60-second interval regardless of load
- **Impact:** Even immediate-execution schedules can be delayed by up to 60 seconds
- **Improvement Direction:** Calculate dynamic timeout based on the earliest `next_run_at` schedule

---

## Priority Roadmap

```
┌──────────────────────────────────────────────────────────────────────┐
│  Phase 1 — ✅ Completed (2026-03-14)   Performance: 3–5x concurrent  │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P1-C  Hook async parallel execution (up to 600s blocking removed) │
│  ✅ P2-B  4 composite DB indexes added                               │
│  ✅ P1-B  Rule & memory 5-minute TTL cache introduced                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 2 — ✅ Completed (2026-03-14)   Stability & scalability        │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P1-A  DB query batching on spawn (Promise.all parallelization)    │
│  ✅ P2-A  Concurrent agent cap + FIFO wait queue                     │
│  ✅ P2-C  WebSocket broadcast batching (250ms/150ms)                 │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 3 — Partially Complete     Long-term operational stability     │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P3-B  Anomaly detection index added (watchdog full scan removed)  │
│  ⏳ P3-A  Orphan task recovery batching (pending)                    │
│  ⏳ P3-C  Task scheduler dynamic timeout (pending)                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Concurrent Execution Limits (Current State)

| Concurrent Agents | Before Phase 1 (initial) | After Phase 1 | After Phase 2 (current) |
|:-:|---|---|---|
| 1–3 | ✅ Normal | ✅ Normal | ✅ Normal |
| 5 | ⚠️ Hook blocking & query accumulation noticeable | ✅ Normal | ✅ Normal |
| 10 | ❌ Hook can block up to 600s | ⚠️ Minor latency | ✅ Normal |
| 20+ | ❌ Risk of process resource exhaustion | ⚠️ Risky without queue | ✅ Controlled via queue |

---

## Related Documents

- [Comprehensive Architecture Audit Report](../architecture/ARCHITECTURE-AUDIT-2026-Q1.md) — Includes in-depth backend engine review
- [API Specification](../specs/api.md)
