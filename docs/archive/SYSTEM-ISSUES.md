# AgentDesk System Issues Report

> Comprehensive system inspection results as of 2026-03-22

---

## 1. CRITICAL — Immediate Fix Required

### 1-1. YOLO Autonomous Mode Race Condition
| Item | Details |
|------|---------|
| File | `server/modules/routes/ops/messages/decision-inbox-routes.ts:357-407` |
| Issue | `yoloAutopilotInFlight` flag is a simple boolean with no concurrency control |
| Scenario | User manual approval + YOLO automatic approval process the same decision simultaneously → duplicate task execution |
| Solution | Apply DB-based row-level lock or mutex pattern |

### 1-2. Worktree Isolation Failure — Silent Fallback
| Item | Details |
|------|---------|
| File | `server/modules/workflow/core/worktree/lifecycle.ts:206-224` |
| Issue | When worktree creation fails, it silently works directly on the main branch (directMode) without error |
| Scenario | Multiple agents work in the same project directory simultaneously → code conflicts |
| Solution | Show UI warning when entering directMode, prevent concurrent execution on the same path |

### 1-3. State Loss on Server Restart
| Item | Details |
|------|---------|
| File | `server/modules/routes/core/projects/kickoff.ts:229-232` |
| Issue | `pmOversightProjects`, `enqueuedTaskIds` are in-memory — all lost on server restart |
| Scenario | Server restart after kickoff → PM oversight stops, planned tasks permanently abandoned |
| Solution | Persist active sweep state to DB, restore on server start |

---

## 2. HIGH — Early Fix Recommended

### 2-1. No Automatic Retry for Failed Tasks
| Item | Details |
|------|---------|
| File | `server/modules/workflow/orchestration.ts` (entire file) |
| Issue | Tasks with exit code != 0 are permanently stuck in ERR state. No automatic retry mechanism |
| Scenario | Agent fails due to transient network error → manual re-execution required |
| Solution | Retry counter (max 2) + exponential backoff, add retry_count to `task_execution_meta` |

### 2-2. Agent Queue Slot Leak
| Item | Details |
|------|---------|
| File | `server/modules/workflow/orchestration/run-complete-handler/core.ts:79-103` |
| Issue | When a task enters the completion handler in cancel/pending state, early return occurs → `agentQueue.onComplete()` not called |
| Scenario | Repeated task cancellation → queue slot exhaustion → unable to execute new tasks |
| Solution | Add `agentQueue.onComplete(taskId)` to early return paths |

### 2-3. PM Oversight TTL Limited to 1 Hour
| Item | Details |
|------|---------|
| File | `server/modules/routes/core/projects/kickoff.ts:238` |
| Issue | `PM_OVERSIGHT_TTL = 3_600_000` (1 hour) — monitoring ends for long-running projects |
| Scenario | Project with 7 tasks, each taking 15 minutes → needs 1 hour 45 minutes → later tasks not executed |
| Solution | Auto-extend TTL as long as tasks are in progress, or remove entirely |

### 2-4. Incomplete Windows Process Termination
| Item | Details |
|------|---------|
| File | `server/modules/workflow/agents/cli-runtime.ts:297-304`, `server/ws/hub.ts:226-229` |
| Issue | `child.kill()` only terminates the cmd.exe shell on Windows — child processes (vite, node) remain |
| Scenario | After task timeout, zombie processes hold port/file locks |
| Solution | Use `taskkill /F /T /PID` (already documented in CLAUDE.md, some parts not applied) |

### 2-5. activeProcesses Map Memory Leak
| Item | Details |
|------|---------|
| File | `server/modules/workflow/agents/cli-runtime.ts:317-326` |
| Issue | After `activeProcesses.set(taskId, child)`, `delete` is not called in the `close` event |
| Scenario | Over long operation, hundreds of dead process references occupy memory |
| Solution | Add `activeProcesses.delete(taskId)` in `child.on("close", ...)` handler |

### 2-6. enqueuedTaskIds Unbounded Growth
| Item | Details |
|------|---------|
| File | `server/modules/routes/core/projects/kickoff.ts:232, 283-284` |
| Issue | When PM oversight TTL expires, only per-project task IDs are cleaned up — the global Set continues to grow |
| Scenario | Dozens of project kickoffs → thousands of IDs accumulate in Set |
| Solution | Remove all taskIds for the project from the Set on TTL expiry |

### 2-7. Unpaginated Large Task List Query
| Item | Details |
|------|---------|
| File | `server/modules/routes/core/projects/kickoff.ts:312-317` |
| Issue | `SELECT ... FROM tasks WHERE status = 'planned'` — no LIMIT |
| Scenario | 10,000 planned tasks → full table scan every 15 seconds |
| Solution | Add `LIMIT 50` + batch processing |

---

## 3. MEDIUM — Fix During Stabilization Phase

### 3-1. Missing DB Indexes
| Item | Details |
|------|---------|
| File | `server/modules/bootstrap/schema/versioned-migrations/` |
| Missing indexes | `tasks(project_id, status)`, `subtasks(task_id, status)`, `subtasks(delegated_task_id)`, `subtasks(target_department_id)` |
| Impact | Full table scan O(n) on subtask delegation/completion → performance degradation as task count grows |

### 3-2. N+1 Query Pattern
| Item | Details |
|------|---------|
| File | `server/modules/workflow/orchestration/run-complete-handler/reconcile-delegated-subtasks.ts:27-89` |
| Issue | After fetching subtask list, individual SELECT queries run in a loop — N+1 DB calls for N items |
| Solution | Batch query with a single query, or use `WHERE id IN (...)` |

### 3-3. No Transaction on Task Completion
| Item | Details |
|------|---------|
| File | `server/modules/workflow/orchestration/run-complete-handler/core.ts:233-250` |
| Issue | Task status update, agent status update, and subtask update execute as separate queries |
| Scenario | Server crash mid-way → task is done but subtask remains in pending state |
| Solution | Wrap in transaction: `db.exec("BEGIN"); ... db.exec("COMMIT");` |

### 3-4. No Full Sync on WebSocket Reconnection
| Item | Details |
|------|---------|
| File | `src/app/useRealtimeSync.ts:556-578` |
| Issue | WS disconnect → no compensation for missed events on reconnect (polling is at 30-second intervals) |
| Scenario | 5-minute disconnection → completed tasks and state changes during that time not reflected |
| Solution | Batch fetch all changes since `lastSyncTimestamp` on reconnect |

### 3-5. CLI Output Batch Queue Message Loss
| Item | Details |
|------|---------|
| File | `server/ws/hub.ts:81-88` |
| Issue | When queue exceeds 60 items (MAX_BATCH_QUEUE), the oldest messages are dropped |
| Scenario | Fast build output → user sees missing lines in terminal |
| Solution | Immediate flush on queue overflow or larger buffer |

### 3-6. Idle Timeout Resets on All Output
| Item | Details |
|------|---------|
| File | `server/modules/workflow/agents/cli-runtime.ts:306-310` |
| Issue | Idle timer resets on every stdout/stderr chunk — including spinners/log animations |
| Scenario | Agent outputs infinite logs → timeout impossible → unlimited resource consumption |
| Solution | Determine "meaningful output" (minimum change threshold) or enforce a hard timeout |

### 3-7. No Notification Flood Prevention
| Item | Details |
|------|---------|
| File | `server/modules/routes/ops/notifications.ts` |
| Issue | No rate limit on notification creation |
| Scenario | Bug causes infinite notification creation → DB bloat, UI rendering freeze |
| Solution | Limit to 1 notification per task per second, or prevent duplicate notifications |

### 3-8. Incomplete DB Cleanup on Review Meeting Abort
| Item | Details |
|------|---------|
| File | `server/modules/workflow/orchestration/meetings/review-consensus.ts:201-210` |
| Issue | On mid-meeting abort, already-recorded meeting_minute_entries are not rolled back |
| Scenario | Incomplete meeting minutes persist in DB → confusion in next meeting |
| Solution | On abort, clean up entries for that meeting_id or change status to 'aborted' |

---

## 4. LOW — Improvements

### 4-1. Language Detection vs Settings Mismatch
| Item | Details |
|------|---------|
| Location | Multiple server files |
| Issue | `resolveLang(text)` checks settings first, but uses text-based detection if settings are not configured |
| Impact | Korean settings but English task title → agent responds in English |
| Solution | Partially fixed (getPreferredLanguage applied in review-consensus.ts). Unify remaining locations |

### 4-2. Potential Worktree Branch Name Collision
| Item | Details |
|------|---------|
| File | `server/modules/workflow/core/worktree/lifecycle.ts:253-304` |
| Issue | 4 branch name candidates tried — concurrent execution may select the same name |
| Solution | UUID-based branch names or DB-level reservation |

### 4-3. Frontend Memory: Codex Thread Map Unbounded Growth
| Item | Details |
|------|---------|
| File | `src/app/useRealtimeSync.ts:327-345` |
| Issue | `threadMap` cleanup only occurs on `cli_output` events |
| Solution | Periodic 5-minute timer to clean expired entries |

### 4-4. Project Context Size Limit
| Item | Details |
|------|---------|
| File | `server/modules/workflow/core/project-context-tools.ts:256-279` |
| Issue | Project context capped at 6000 characters — structural information lost for large projects |
| Solution | Dynamic adjustment based on model context window |

### 4-5. No Settings Table Caching
| Item | Details |
|------|---------|
| File | Multiple locations with repeated `db.prepare("SELECT value FROM settings WHERE key = ?")` calls |
| Issue | Settings rarely change but are queried on every request |
| Solution | In-memory cache + invalidate on settings change |

### 4-6. No Graceful Shutdown Implementation
| Item | Details |
|------|---------|
| File | `server/modules/workflow` (entire directory) |
| Issue | No active process kill, queue cleanup, or worktree cleanup on server shutdown |
| Solution | Iterate and terminate `activeProcesses` in `process.on("SIGTERM", ...)` handler |

---

## 5. Items Already Fixed (This Session)

| Item | Status |
|------|--------|
| notifications CHECK constraint missing (`task_started`, `kickoff`) | Fixed |
| Decision Inbox missing `task_review_ready` kind | Fixed |
| "Planning Team Leader" (기획팀장) → "PM" terminology unification (19 files) | Fixed |
| PM agent as the reporting subject (findProjectPm) | Fixed |
| PM Activity report tab query missing | Fixed |
| Kickoff prompt ambiguity → causing ERR | Fixed |
| YOLO auto-approval for task_review_ready | Fixed |
| Automatic chaining to next task after task completion | Fixed |
| Settings language → reflected in meetings/reports | Fixed |
| Prompt .md file separation | Fixed |
| Window drag/resize performance (rAF + transition) | Fixed |
| Autonomous mode default ON | Fixed |
| PM agent orchestration (event-based) | Phase 21 |
| PM oversight sweep timer removed | Phase 21 |
| YOLO regex → PM LLM judgment | Phase 21 |
| Failed task PM retry/reassignment/escalation | Phase 21 |
| PM oversight restoration on server restart | Phase 21 |
| AI error analysis (8 cause categories) | Phase 22 |
| Prompt history API + UI tab | Phase 22+25 |
| One-click task re-execution | Phase 22 |
| Automatic Rules/Memory learning | Phase 23 |
| Project retrospective report | Phase 23 |
| activeProcesses memory leak fix | Phase 21 |
| DB performance indexes (7) | Phase 24 |
| Graceful shutdown (planned restoration) | Phase 24 |
| Notification flood prevention (5s dedupe) | Phase 24 |
| Agent fitness tracking | Phase 25 |
| TaskCardActions emoji → SVG | Review fix |

---

## Remaining Work Roadmap

### Mid-term
- [ ] Token budget/cost management
- [ ] Prompt version management
- [ ] Concurrency control (file locks, branch conflicts)
- [ ] N+1 query batching
- [ ] Settings cache

### Long-term
- [ ] WebSocket reconnection sync
- [ ] Dynamic project context adjustment
- [ ] Plugin system
- [ ] Team/Cloud (SSO, RBAC)
