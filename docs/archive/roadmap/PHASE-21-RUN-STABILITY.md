# Phase 21: PM Agent Orchestration — Implementation Spec

> **Goal**: Convert 29 orchestration decisions previously handled by system code (timers/if-statements/regex) to PM agent LLM-based judgment
>
> **Core Principle**: PM agent = true orchestrator. System code only provides infrastructure (event delivery, DB, processes).
>
> **Current Problem**: PM is in name only. Actual decisions are made by setInterval + if-statements + YOLO regex.

---

## Full Orchestration Decision Points — 29 Total

Below are all points where **system code currently makes automatic decisions**.
Targets for PM agent conversion are classified into 3 grades:

- **Grade A**: PM LLM must judge (quality/strategy decisions)
- **Grade B**: Handled immediately via PM events (simple routing, no LLM needed)
- **Grade C**: Remains in system (infrastructure/security, no PM involvement needed)

### Grade A — PM LLM Judgment Required (11)

| # | File:Line | Current Decision | PM's Role |
|---|----------|----------|-----------|
| 1 | `state-updates.ts:77` | Auto transition to `review` on success | PM reads result and approves or requests revision |
| 2 | `state-updates.ts:117` | Auto transition to `inbox` on failure | PM analyzes cause → retry/reassign/escalate |
| 3 | `finish-review.ts:268` | Auto start review meeting | PM judges whether meeting is needed, conducts meeting |
| 4 | `review-consensus.ts:58+` | System selects facilitator | PM directly chairs the meeting |
| 5 | `yolo-mode.ts:80-128` | Regex auto-selects option | PM LLM judges the situation and decides |
| 6 | `planned-approval.ts:333` | Auto approval | PM reviews plan then approves |
| 7 | `finalize-approved-review.ts:175-186` | Auto transition to `done` | PM confirms and marks complete |
| 8 | `subtask-delegation.ts:383` | Auto subtask assignment | PM judges suitable agent |
| 9 | `kickoff.ts:62-102` | Fixed-script meeting flow | PM conducts natural meeting via LLM |
| 10 | `run-complete-handler/core.ts:369` | Conditional auto cancel | PM judges cancellation necessity |
| 11 | `progress-notify-tools.ts:9-38` | Progress report on 5-min timer | PM reports at appropriate timing |

### Grade B — Immediate Event-Based PM Processing (10)

| # | File:Line | Current Decision | Change |
|---|----------|----------|------|
| 12 | `execution-start-task.ts:177` | Auto start from queue | Event → PM immediately orders start |
| 13 | `kickoff.ts:344-345` | Start planned tasks on 15s timer | Event → PM immediately starts |
| 14 | `task-scheduler.ts:351` | Auto execution via auto_run flag | Event → PM confirms scheduled execution |
| 15 | `finish-review.ts:50-95` | Project review gate check | Event → PM checks gate status |
| 16 | `subtask-delegation.ts:556` | Auto done on success | Event → PM immediately confirms |
| 17 | `subtask-delegation.ts:561` | Auto blocked on failure | Event → PM immediately handles |
| 18 | `subtask-delegation-batch.ts:562` | Auto done on delegation success | Event → PM immediately confirms |
| 19 | `decision-inbox-routes.ts:143` | Auto transition to supplement round | Event → PM decision |
| 20 | `kickoff.ts:56-57` | Facilitator selection | PM = facilitator (fixed) |
| 21 | `run-complete-handler/core.ts:416` | Auto requeue after report | Event → PM decision |

### Grade C — Remains in System (8)

| # | File:Line | Current Decision | Reason |
|---|----------|----------|------|
| 22 | `execution-start-task.ts:239` | Pending on worktree failure | Infrastructure error — no PM involvement needed |
| 23 | `run-complete-handler/core.ts:242` | Orphan subtask cleanup | DB consistency — automatic processing |
| 24 | `subtask-delegation-batch.ts:210` | Blocked if no department | Infrastructure constraint |
| 25 | `subtask-delegation-batch.ts:427` | Blocked on delegation failure | Infrastructure — only event sent to PM |
| 26 | `subtask-delegation-batch.ts:433` | Inbox on delegation failure | Infrastructure |
| 27 | `task-scheduler.ts:242-358` | Schedule task creation | Cron-based — time trigger retained |
| 28 | `yolo-mode.ts:43-48` | YOLO mode on/off | Config value — replaced by PM orchestrator |
| 29 | `yolo-mode.ts:130-182` | YOLO loop | Fully replaced by PM orchestrator |

---

## Implementation Plan

### Step 1: Build Event Bus + PM Orchestrator Foundation

**Create 2 new files:**

#### `server/lib/event-bus.ts`

```typescript
import { EventEmitter } from "node:events";

export interface TaskStatusEvent {
  type: "task_status_changed";
  taskId: string;
  projectId: string | null;
  fromStatus: string;
  toStatus: string;
  agentId: string | null;
  exitCode?: number;
  result?: string | null;
}

class AgentDeskEventBus extends EventEmitter {
  emitTaskStatus(event: TaskStatusEvent): void {
    this.emit("task_status_changed", event);
  }
}

export const eventBus = new AgentDeskEventBus();
eventBus.setMaxListeners(50);
```

#### `server/modules/workflow/orchestration/pm-orchestrator.ts`

Core logic of the PM orchestrator. Receives events and calls PM LLM for judgment.

```typescript
export function startPmOrchestrator(deps: PmOrchestratorDeps) {
  // Grade A: 11 decision points requiring PM LLM judgment
  eventBus.on("task_status_changed", async (event) => {
    const pm = findProjectPm(event.projectId);
    if (!pm) return; // Fallback to existing logic if no PM

    switch (event.toStatus) {
      case "review":   return pmReviewTask(pm, event);    // #1
      case "failed":   return pmHandleFailure(pm, event); // #2
      case "done":     return pmStartNextTask(pm, event); // Grade B #12,13
    }
  });
}
```

**5 core functions called by PM:**

| Function | Role | Trigger |
|------|------|--------|
| `pmReviewTask()` | Review completed task result → approve/revise | `toStatus === "review"` |
| `pmHandleFailure()` | Analyze failure cause → retry/reassign/escalate | `toStatus === "failed"` |
| `pmStartNextTask()` | Start next planned task | `toStatus === "done"` |
| `pmFacilitateMeeting()` | Chair review meeting | When `finishReview` is called |
| `pmDecideInbox()` | Judge decision items | When decision item is created |

---

### Step 2: Add Event Emission Points

Add event emission to existing status change code. **Existing logic is preserved**, but PM orchestrator listens to events for additional judgment.

| File | Location | Event |
|------|------|--------|
| `state-updates.ts` | End of `applySuccessStateUpdate` | `in_progress → review` |
| `state-updates.ts` | End of `applyFailureStateUpdate` | `in_progress → failed` |
| `finalize-approved-review.ts` | After done marking | `review → done` |
| `tasks/crud.ts` | PATCH handler | Manual status change |
| `cli-runtime.ts` | `child.on("close")` | `process_exit` |

---

### Step 3: PM Prompt Files

#### `prompts/pm/review-task.md`

```markdown
You are the Project Manager. An agent completed a task. Review the output.

Task: {{taskTitle}}
Description: {{taskDescription}}
Agent Output (tail):
{{taskResult}}

Decide:
- APPROVE: output meets requirements → respond "APPROVE: <brief reason>"
- REVISE: needs changes → respond "REVISE: <specific feedback for the agent>"

Respond in {{lang}}. Be concise (2-4 sentences).
```

#### `prompts/pm/handle-failure.md`

```markdown
You are the Project Manager. A task failed.

Task: {{taskTitle}}
Error: {{errorSummary}}
Retry: {{retryCount}}/{{maxRetries}}

Decide:
- RETRY: transient error → respond "RETRY: <reason>"
- REASSIGN: wrong agent for this task → respond "REASSIGN: <reason>"
- ESCALATE: needs human help → respond "ESCALATE: <what user should do>"

Be concise (1-2 sentences).
```

#### `prompts/pm/decide-inbox.md`

```markdown
You are the Project Manager. A decision is pending.

Decision Type: {{kind}}
Summary: {{summary}}
Options:
{{options}}

Choose the best option number and explain briefly.
Respond: "OPTION <number>: <reason>"
```

#### `prompts/pm/start-next.md`

```markdown
You are the Project Manager. A task just completed.

Completed: {{completedTitle}}
Project: {{projectName}}
Remaining planned tasks:
{{plannedTasks}}

Idle agents:
{{idleAgents}}

Which task(s) should start next? Respond with task IDs to start, one per line.
If all tasks are done, respond "PROJECT_COMPLETE".
```

---

### Step 4: Remove Existing Polling/YOLO

#### Removal Targets

| Code | File:Line | Replacement |
|------|----------|------|
| `setInterval(_pmSweepFn, 15000)` | `kickoff.ts:405` | `eventBus.on("task_status_changed")` |
| `setInterval(runYoloAutopilot, 2500)` | `decision-inbox-routes.ts:405` | `pmDecideInbox()` |
| `buildYoloDecisionReplyPayload()` | `yolo-mode.ts:80-128` | PM LLM judgment |
| `runYoloDecisionAutopilot()` | `yolo-mode.ts:130-182` | PM orchestrator |
| `startPmOversightSweep()` | `kickoff.ts:243-406` | PM event listener |
| `setTimeout(startTaskExec, 2000)` | `finalize-approved-review.ts:340` | `pmStartNextTask()` |

#### Retained (System Infrastructure)

| Code | File | Reason |
|------|------|------|
| WS batch flush (150-250ms) | `hub.ts` | Network optimization |
| Cron scheduler (60s) | `task-scheduler.ts` | Time-based trigger |
| Heartbeat (60s) | `heartbeat.ts` | External process monitoring |
| Agent anomaly (60s) | `agent-anomaly-monitor.ts` | Zombie detection |
| OAuth refresh (5min) | `lifecycle.ts` | External service |
| Stalled task recovery (30s) | `lifecycle.ts` | Infrastructure safety net |

---

### Step 5: DB Migration

```sql
-- 2026-03-27-001-task-retry-support
ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 2;
ALTER TABLE tasks ADD COLUMN last_error_summary TEXT;

-- 2026-03-27-002-pm-oversight-persistence
CREATE TABLE IF NOT EXISTS pm_oversight_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  pm_agent_id TEXT,
  started_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()*1000)
);
```

---

### Step 6: Files to Modify (Exact Change Scope)

| File | Change Type | Description |
|------|----------|------|
| **New** `server/lib/event-bus.ts` | Create | Event bus |
| **New** `server/modules/workflow/orchestration/pm-orchestrator.ts` | Create | PM orchestration engine |
| **New** `prompts/pm/review-task.md` | Create | PM review prompt |
| **New** `prompts/pm/handle-failure.md` | Create | PM failure handling prompt |
| **New** `prompts/pm/decide-inbox.md` | Create | PM decision prompt |
| **New** `prompts/pm/start-next.md` | Create | PM next task prompt |
| `server/modules/workflow/orchestration.ts` | Modify | PM orchestrator initialization + deps injection |
| `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` | Modify | Add event emission |
| `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts` | Modify | Add event emission + remove existing auto-chaining |
| `server/modules/workflow/orchestration/review-finalize-tools/finish-review.ts` | Modify | Switch to PM-chaired meeting |
| `server/modules/workflow/orchestration/meetings/review-consensus.ts` | Modify | Fix PM = facilitator |
| `server/modules/routes/core/projects/kickoff.ts` | Modify | Remove PM oversight sweep → event-based |
| `server/modules/routes/ops/messages/decision-inbox-routes.ts` | Modify | Remove YOLO timer → PM judgment |
| `server/modules/routes/ops/messages/decision-inbox/yolo-mode.ts` | Modify | YOLO regex → PM LLM call |
| `server/modules/routes/core/tasks/crud.ts` | Modify | Add event emission |
| `server/modules/workflow/agents/cli-runtime.ts` | Modify | activeProcesses leak + event emission |
| `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` | Modify | Add 2 migrations |

**Total 17 files** (6 new + 11 modified)

---

## Implementation Order

```
Phase 21-A: Foundation (1 day)
  1. Create event-bus.ts
  2. Create 4 PM prompt files
  3. Create pm-orchestrator.ts skeleton
  4. Initialize PM orchestrator in orchestration.ts
  5. Add 2 DB migrations

Phase 21-B: Connect PM Judgment (1 day)
  6. Add event emission to state-updates.ts
  7. Add event emission to finalize-approved-review.ts
  8. Add event emission to tasks/crud.ts
  9. Fix cli-runtime.ts memory leak + add event emission
  10. Implement pmReviewTask, pmHandleFailure, pmStartNextTask in pm-orchestrator.ts

Phase 21-C: Remove Existing Polling (1 day)
  11. kickoff.ts — Remove PM oversight sweep
  12. decision-inbox-routes.ts — Remove YOLO timer
  13. yolo-mode.ts — Switch regex → PM LLM call
  14. finish-review.ts — Connect PM meeting chair
  15. review-consensus.ts — Fix PM = facilitator
  16. finalize-approved-review.ts — Remove auto-chaining (PM replaces it)
  17. Add graceful shutdown
```

---

## Verification Criteria

### Grade A (PM LLM Judgment)
- [ ] Task completion → PM LLM reads result and responds with "APPROVE" or "REVISE: ..."
- [ ] Task failure → PM LLM decides "RETRY" / "REASSIGN" / "ESCALATE"
- [ ] Decision item → PM LLM selects option (AI judgment, not regex)
- [ ] Review meeting → PM chairs as facilitator

### Grade B (Event-Based)
- [ ] Task done → PM immediately starts next task (no 15s wait)
- [ ] Event emission → PM orchestrator reacts immediately

### Removal Verification
- [ ] `setInterval(_pmSweepFn, 15000)` removed
- [ ] `setInterval(runYoloAutopilot, 2500)` removed
- [ ] `buildYoloDecisionReplyPayload()` no longer uses regex
- [ ] PM LLM judgment logs recorded in PM Activity

### Stability
- [ ] PM LLM call failure → fallback to existing logic
- [ ] Server restart → restore from pm_oversight_state → PM immediately active
- [ ] Ctrl+C → terminate active processes + in_progress → planned
