# PM Workflow — Current Implementation Specification

> Last updated: 2026-03-23
> Status: **Implementation complete**

---

## Overall Flow

```
[1] Kickoff (POST /api/projects/:id/kickoff)
     │
     ▼
[2] Kickoff Meeting (runKickoffMeeting)                    ← stage: "meeting"
     │  PM shares project goals
     │  Each agent reports capabilities
     │  PM announces task creation and assignment
     │  Meeting minutes → meeting_minutes (includes project_id)
     │
     ▼
[3] Task Creation (LLM call)                               ← stage: "planning"
     │  callProvider() or callViaCliProvider()
     │  JSON parsing → tasks INSERT (assigned_agent_id = NULL)
     │  Prompt: prompts/system/project-kickoff.md
     │
     ▼
[4] PM Agent Assignment                                    ← stage: "assigning"
     │  Fitness-based assignment (agent_task_fitness table)
     │  Fallback to round-robin when no fitness data exists
     │  PM agents excluded from assignment
     │  appendTaskLog("pm_oversight", "PM assigned → {agent} [fitness/round-robin]")
     │
     ▼
[5] Task Execution                                         ← stage: "executing"
     │  startTaskExecutionForAgent() or startExecutionLoop()
     │  Only the first planned task per agent is started
     │
     ▼
[6] Task Completion → review status
     │  execution-loop.ts → status = 'review'
     │  eventBus.emitTaskStatus({ toStatus: "review" })
     │
     ▼
[7] PM Orchestrator Review (pm-orchestrator.ts)
     │  YOLO mode → immediate auto-approval
     │  Normal mode → PM LLM call (4-point checklist)
     │    - Scope Match / Errors / Minimal Scope / Completeness
     │    - APPROVE → finishReview() → merge → done
     │    - REVISE → reassign to planned → re-execute
     │  3-strike rule: 3 consecutive failures on same task → escalation
     │
     ▼
[8] Ship Automation (after finishReview completes)
     │  Version bump (patch): 0.1.2 → 0.1.3
     │  Generate CHANGELOG entry
     │  File sync: VERSION, package.json, CHANGELOG.md
     │
     ▼
[9] Start Next Task
     │  PM orchestrator auto-starts next planned task
     │
     ▼
[10] All Tasks Done → Project-Level Review (pmProjectLevelReview)
     │  PM evaluates entire project against original goal
     │  SATISFIED → retrospective + project complete
     │  GAPS_FOUND → create follow-up tasks via runInternalAddTasksPipeline()
     │    → new tasks assigned (fitness-based) → execute → review → done
     │    → triggers project-level review again (max 3 rounds)
     │  Max 3 rounds enforced via pm_oversight_state.project_review_round
```

---

## Add Tasks Flow (POST /api/projects/:id/add-tasks)

```
[1] Add Tasks Request
     │  additional_directive + attached_file (optional .md → saved to docs/)
     │
     ▼
[2] Add Tasks Meeting (runAddTasksMeeting)              ← stage: "meeting"
     │  PM shares additional instructions (short meeting)
     │  Agent confirmation
     │
     ▼
[3] Task Creation (LLM)                                ← stage: "planning"
     │  Includes existing done tasks as context (duplicate prevention)
     │
     ▼
[4] PM Assignment → Execution                          ← stage: "assigning" → "executing" → "done"
```

**UI:** When all tasks are done on the task board, an "Add Tasks" button appears (inline input + .md attachment supported)

---

## Autonomous Mode (YOLO)

- PM orchestrator handles all decisions automatically
- Decision Inbox: returns empty array, displays "Autonomous mode" message
- PM Activity: hides approval/revision buttons
- User cannot approve/hold/cancel — PM has full authority

---

## Key Files

| File | Role |
|------|------|
| `server/modules/routes/core/projects/kickoff.ts` | Entire kickoff pipeline |
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | PM review/assignment/escalation/project-level review |
| `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts` | Approval → merge → done |
| `server/modules/workflow/orchestration/review-finalize-tools/ship-automation.ts` | Version bump + CHANGELOG |
| `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts` | Error pattern matching + sanitization |
| `server/modules/agent-runtime/execution-loop.ts` | CLI/API mode agent execution |
| `server/modules/routes/core/projects/pm-activity.ts` | PM Activity API |
| `prompts/system/project-kickoff.md` | Kickoff LLM prompt (no agent_name, includes task_type) |
| `prompts/system/agent-runtime.md` | Agent runtime system prompt (evidence-based rules) |
| `prompts/system/app-analysis-system.md` | App analysis system prompt |
| `prompts/system/project-analysis.md` | App analysis user prompt (---JSON--- separator) |
| `prompts/pm/review-task.md` | PM individual task review checklist prompt |
| `prompts/pm/project-review.md` | PM project-level review prompt (SATISFIED/GAPS_FOUND) |
| `prompts/pm/handle-failure.md` | PM failure handling (3-strike escalation) |
| `prompts/pm/auto-learn.md` | PM auto-learning (rules/memory extraction) |

---

## PM Activity Panel

**Location**: Right slide panel (`src/components/desktop/RightShelf.tsx`)

**Trigger**: Glowing orange line on the right edge → slides in on mouse hover

**Data Source** (`GET /api/projects/:id/pm-activity`):
1. `task_logs` (system + pm_oversight) — task status changes, PM assignment/approval/rejection
2. `messages` — PM report messages
3. `project_review_decision_events` — review decision events
4. `meeting_minutes` + `meeting_minute_entries` — kickoff/review meeting minutes

**Filters**: All / Meeting Minutes / Instructions / Status / Review / Reports

**Real-time refresh**: WebSocket `pm_activity` + `task_update` events

---

## Kickoff Stage Overlay

**Location**: Screen center (`src/components/desktop/Desktop.tsx` — `KickoffStageOverlay`)

**4 stages**: Meeting → Task Creation → Agent Assignment → Task Execution

**WebSocket**: `kickoff_stage` event (`meeting` → `planning` → `assigning` → `executing` → `done`)

**UI**: Framer Motion slide-in/out, auto-hide 2 seconds after completion

---

## Error Handling

| Pattern | Classification | Response |
|---------|---------------|----------|
| ECONNREFUSED / ETIMEDOUT | Network | Retry |
| Cannot find module | Dependency | Installation guide |
| ENOENT | File not found | Path verification |
| SyntaxError / TypeError | Code error | Re-execution |
| timed out | Timeout | Retry (120s) |
| merge conflict | Git conflict | Manual resolution |
| 3 consecutive failures | Escalation | User notification, stop automatic retry |

**Error sanitization**: Home directory, API keys, and tokens are automatically masked before saving.

---

## Rules

1. Meeting **must come first**. Task creation executes inside the meeting completion callback.
2. Task assignment to PM agent is prohibited. `project_role !== "pm"` filter applied.
3. Meeting minutes stored in `meeting_minutes` with `project_id` included. `task_id` allows NULL.
4. Even on kickoff failure, the task creation pipeline runs (safety net).
5. No `agent_name` in kickoff prompt — assignment is done by the PM.
6. Evidence-based rules injected into agent execution prompts ("no guessing", "stop after 3 failures").
7. Individual review uses a 4-point checklist (scope match, errors, minimal scope, completeness).
8. Automatic version bump + CHANGELOG on task done.
9. **Project-level review**: When all tasks are done, PM evaluates the entire project against the original goal. GAPS_FOUND triggers follow-up task creation (max 3 rounds).
10. **Fitness-based assignment**: Agents assigned by `agent_task_fitness` success rate per task type. Falls back to round-robin when no data exists. LLM generates `task_type` during kickoff.
11. **Max review rounds**: `pm_oversight_state.project_review_round` counter prevents infinite loops (max 3).
