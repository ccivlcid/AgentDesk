# AgentDesk Architecture Audit Report

**Created:** 2026-03-11 | **Updated:** 2026-03-15
**Version:** AgentDesk 2.0.1
**Scope:** Frontend + Backend + DB + Agent Execution Engine
**Agent Execution Performance Audit:** See separate document (`docs/strategy/agent-performance-audit.md`)

---

## Table of Contents

1. [Overall Assessment](#1-overall-assessment)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Backend Engine Strengths](#3-backend-engine-strengths)
4. [Issue Analysis](#4-issue-analysis)
5. [Architecture Improvement Directions](#5-architecture-improvement-directions)
6. [Platform Roadmap](#6-platform-roadmap)
7. [Immediate Action Recommendations](#7-immediate-action-recommendations)
8. [Appendix — Additional Findings](#8-appendix--additional-findings)

---

## 1. Overall Assessment

```
Backend Engine Status (as of 2026-03-15)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Architecture Design      ████████████████████ 100%  ✅ Zustand separation, error unification, sync consolidation complete
Security                 ████████████████████ 100%  ✅ All P0 security patches complete
Database                 ████████████████████ 100%  ✅ Indexes, migration version tracking, TTL cache complete
Error Handling           ██████████████████░░  90%  ✅ ApiError unification complete (CSRF scope expansion remaining)
Test Coverage            ████████████████████ 100%  ✅ Server 181 + Frontend 43 tests all passing
Code Modularity          ████████████████░░░░  80%  (some large files remain)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall                  ████████████████████  ~95%
```

**Summary:** Core functionality, security, and performance are all stabilized. Remaining tasks are **large file decomposition** and **CSRF scope expansion**.

---

## 2. Current Architecture Overview

### 2.1 Overall Structure

```
┌─────────────────────────────────────────────────────────┐
│              Browser / Electron (Desktop)               │
├─────────────────────────────────────────────────────────┤
│  React 19 + TypeScript                                  │
│  ├─ App.tsx          Root component (Zustand store sub) │
│  ├─ Desktop.tsx      macOS desktop OS root              │
│  ├─ api/             HTTP client layer                  │
│  └─ hooks/           WebSocket + polling                │
└───────────────┬─────────────────────────────────────────┘
                │  HTTP /api/* + WebSocket ws://
┌───────────────▼─────────────────────────────────────────┐
│  Express 5 (Port 8790)                                  │
│  ├─ routes/core/     agents, tasks, projects, categories│
│  ├─ routes/ops/      memory, hooks, skills, terminal    │
│  ├─ workflow/        prompt build + execution context   │
│  └─ gateway/client   external AI provider communication │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  SQLite (agentdesk.sqlite)                              │
│  ├─ legacy: departments, agents, tasks, messages        │
│  └─ 2.0: categories, projects, objectives/risks/gates   │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Agent Execution Layer                                  │
│  ├─ CLI agents: child_process.spawn() (local)           │
│  └─ API agents: HTTP (Claude API, OpenAI, etc.)         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Model Hierarchy

```
Organization
└── Department
    └── Agent
        ├── cli_provider: claude | codex | gemini | api | ollama ...
        ├── persona_id: structured | creative | analytical ...
        └── role: team_leader | senior | junior | intern

Category (project type template)
└── Project
    ├── project_path (required — agent execution path)
    ├── project_agents (team members)
    ├── project_objectives (objectives)
    ├── project_risks (risks)
    ├── project_gates (review stages)
    └── project_outputs (deliverables)

Task
├── project_id → Project
├── assigned_agent_id → Agent
└── execution_sessions (execution history)
```

### 2.3 Agent Execution Flow

```
POST /api/tasks/:id/run
        │
        ▼
Agent assignment (auto-assign or direct)
        │
        ▼
Prompt build
├── workflow pack guidance
├── persona block
├── available skills list
└── project context (project_path, git history)
        │
        ▼
Execution selection
├── CLI: child_process.spawn() → stdout streaming
└── API: HTTP POST → streaming response
        │
        ▼
appendTaskLog() → task_logs table
broadcast('cli_output') → WebSocket → TerminalPanel
        │
        ▼
Complete: task.status = 'done' | 'failed'
broadcast('task_update')
```

### 2.4 Real-Time Sync Strategy

| Mechanism | File | Purpose |
|-----------|------|---------|
| WebSocket (push) | `useRealtimeSync.ts` | task_update, cli_output, agent_status |
| Polling (pull) | `usePolling.ts` | status fallback |
| Live Sync Scheduler | `useLiveSyncScheduler.ts` | periodic full sync |

---

### 2.5 Workflow Pack & Project Creation Structure

**Files:** `server/modules/workflow/packs/definitions.ts`, `server/modules/routes/core/projects.ts`

When creating a project, a `default_pack_key` is specified. Pack configuration is loaded from the `<!-- pack-config -->` JSON block in `server/prompts/packs/{packKey}.md`.

| Pack Key | Purpose | Preferred Departments | Reasoning Level |
|----------|---------|----------------------|-----------------|
| `development` | Code development & bug fixes | dev, qa, planning | high |
| `report` | Structured reports | planning, dev | high |
| `web_research_report` | Web research & analysis | planning, dev | medium |
| `novel` | Fiction & creative writing | creative | medium |
| `video_preprod` | Video pre-production | creative, design | medium |
| `roleplay` | Roleplay | creative | low |
| `asset_management` | Investment & asset management | planning, finance | high |

**Key parameters for project creation:**

```typescript
POST /api/projects
{
  name: string;
  project_path: string;          // only paths within allowed roots
  core_goal: string;
  default_pack_key?: WorkflowPackKey;
  assignment_mode?: 'auto' | 'manual';  // default: 'auto'
  agent_ids?: string[];           // agents to assign in manual mode
}
```

**`assignment_mode` behavior difference:**
- `auto`: At each task execution, agents are automatically selected based on pack preference, role, and status
- `manual`: Automatic selection is limited to agents registered in the `project_agents` table

---

### 2.6 Agent Auto-Assignment Algorithm

**File:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts`

`selectAutoAssignableAgentForTask()` executes the following steps in order:

```
Step 1. Resolve agent pool constraints (resolveConstrainedAgentScopeForTask)
    ├─ Agent list based on workflow pack profile
    ├─ Agent list from project manual scope
    └─ Intersection of both lists → valid candidate pool

Step 2. Filtering
    ├─ Only agents with cli_provider configured
    ├─ status = 'idle' OR 'break' (excluding 'working')
    └─ current_task_id IS NULL (agents with no ongoing task)

Step 3. Sorting (in priority order)
    ① Membership in pack preferred departments (by preferredDepartments order)
    ② Agent status: idle(1) > break(2)
    ③ Agent role: senior(1) > team_leader(2) > junior(3) > intern(4)
    ④ Number of completed tasks (fewer = higher priority — load balancing)
    ⑤ Creation time (older agents first — FIFO)

Step 4. Return top candidate
    └─ { packKey, agent: AutoAssignableAgent }
```

**OAuth provider additional validation:** OAuth-based agents such as `copilot` and `antigravity` also have their token validity checked in the `oauth_accounts` table.

---

### 2.7 Direct Agent Task Assignment

**Files:** `server/modules/routes/core/tasks/execution-run.ts`, `server/modules/routes/collab/task-delegation.ts`

Three paths for assigning work to a specific agent:

#### Path 1 — UI/API Direct Assignment

```typescript
// Set assigned_agent_id directly when creating a task
POST /api/tasks
{ "title": "...", "assigned_agent_id": "agent-001" }

// Pass agent_id when running a task (run body)
POST /api/tasks/:id/run
{ "agent_id": "agent-001" }
```

Scope validation at execution time:
```
assigned_agent_id is set
    │
    ▼
resolveConstrainedAgentScopeForTask() called
    ├─ Scope passes → execute with that agent
    └─ Scope violation → reset agentId → fall back to auto-assign
```

#### Path 2 — Team Leader Delegation (task-delegation)

```
Client instruction message
    │
    ▼
Team leader acknowledgment (assigned_agent_id = teamLeader.id)
    │
    ▼
findBestSubordinate() → select subordinate agent
    │
    ▼
DB UPDATE tasks SET assigned_agent_id = subordinate.id
sendAgentMessage(type: "task_assign", receiverId: subordinate.id)
```

#### Path 3 — Project-Level Fixed Assignment (manual mode)

```sql
-- Set project to manual mode
UPDATE projects SET assignment_mode = 'manual' WHERE id = ?

-- Register allowed agents
INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)
```

---

### 2.8 Task Brief (Prompt) Assembly Structure

**File:** `server/modules/routes/core/tasks/execution-run.ts` (lines 494–527)
**Function:** `buildTaskExecutionPrompt()`

The prompt delivered to the agent is assembled in order from up to 15 blocks:

```
[Task Session]              ← sessionId, agentId, provider
[Project Structure]         ← codebase directory summary (generated on first run)
[Recent Changes]            ← recent git changes (optional)
[Task] {title}              ← task.title + task.description  ★ core
[Workflow Pack Rules]        ← pack-specific execution guidance (buildWorkflowPackExecutionGuidance)
[Document Generation]        ← output format guide
[Continuation Context]       ← incomplete checklist items from previous run
[Conversation Context]       ← recent conversation context
Agent: {name} ({role})      ← agent identity
[Character Persona]          ← persona block (buildCharacterPersonaBlock)
[Department Constraint]      ← department constraints and department prompt
[Interrupt Injections]       ← additional instructions when resuming a paused task
[Project Rules]              ← project/agent/department/global rules (5-min TTL cache)
[Agent Memory]               ← relevant past memories (5-min TTL cache)
[Run Instruction]            ← final execution instruction

Scope priority: project > agent > department > global
```

---

### 2.9 Agent Meeting System (Review Consensus Meeting)

**File:** `server/modules/workflow/orchestration/meetings/review-consensus.ts`

After task completion, `startReviewConsensusMeeting()` is automatically called and runs a consensus process of up to 3 rounds.

**Roles per meeting phase:**

| Round | Phase Name | Participants | Role |
|-------|-----------|--------------|------|
| Round 1 | Parallel Remediation | Each department leader | Independent revision proposals |
| Round 2 | Merge Synthesis | Team leaders | Collect and integrate feedback |
| Round 3 | Final Decision | Planning leader | Final approval/rejection |

**Meeting flow:**

```
callLeadersToClientOffice()          ← agent status → meeting
    │
    ▼
for each leader agent (async):
    ① emitMeetingSpeech(agent, phase) → WebSocket broadcast
    ② runAgentOneShot(agent, meetingPrompt)
    ③ appendMeetingMinuteEntry(agent, content) → meeting_minute_entries
    ④ collect decision: approve | revise | pending
    │
    ▼
processReviewConsensusOutcome()
    ├─ all/majority approve  → finishReview(task) → status: 'done'
    ├─ revise requested      → seedReviewRevisionSubtasks() → create revision subtasks
    └─ Round 3 exceeded      → force approval
    │
    ▼
dismissLeadersFromClientOffice()     ← agent status → idle
```

**Runtime Meeting State Maps (In-Memory):**

| Map | Key | Value |
|-----|-----|-------|
| `meetingPhaseByAgent` | agentId | opening·feedback·summary·approval |
| `meetingPresenceUntil` | agentId | meeting end timestamp |
| `meetingSeatIndexByAgent` | agentId | seat number (0–5, max 6 participants) |
| `meetingReviewDecisionByAgent` | agentId | approve·revise·pending |
| `meetingTaskIdByAgent` | agentId | taskId of current meeting |

> ⚠️ **[A15]** The 5 Maps above are reset on server restart → risk of losing in-progress meeting session state

---

### 2.10 Outcome Derivation & Learning Mechanism

**File:** `server/modules/workflow/orchestration/run-complete-handler.ts`

After agent process exit, `handleTaskRunComplete(taskId, exitCode)` executes sequentially:

```
① Save result
   task.result = last 2,000 characters of logs
   task.status = 'review' (exit 0) | 'failed' (exit ≠ 0)

② Artifact sync (video_preprod)
   └─ handleVideoArtifactSync() — check rendered video files

③ Output gate validation (runAfterExitGates)
   └─ Check if workflow pack outputTemplate section exists

④ Learning extraction (runExtractLearnings)
   └─ Parse agent output JSON → { type: 'learning', content } format
   └─ Save to memory_entries → reused via buildMemoryPromptBlock() in next task

⑤ Skill extraction (runExtractSkills)
   └─ New tools/patterns → save to skill_learning_history

⑥ Record usage (recordAgentUsage)
   └─ Token count, execution time, cost → update task_executions

⑦ Execute hooks (fire-and-forget, parallel async)
   ├─ exit 0: executeHooks('post-task')
   └─ exit ≠ 0: executeHooks('on-error')

⑧ Notifications
   ├─ notifyClient()      → UI toast
   ├─ sendAgentMessage()  → messenger (Discord/Telegram)
   └─ insertNotification() → audit log

⑨ Worktree cleanup
   └─ cleanupWorktree() — delete isolated git worktree
```

**Task status transitions:**

```
inbox → planned → in_progress → review → done
                            └──────────→ failed → (retry counter incremented)
```

**Subtask delegation (cross-department):**

```
Parent task reaches 'review' status
    │
    ▼
processSubtaskDelegations()
    ├─ Incomplete external subtasks → grouped by target department
    └─ Sequential delegation by department → batch request to each department team leader
```

---

## 3. Backend Engine Strengths

### 3-1. Deferred Runtime Proxy Pattern — Excellent

`server/modules/deferred-runtime.ts`

- Functions not yet available at initialization time are referenced lazily via Proxy → cross-module references resolved without circular dependencies
- If any unresolved functions remain, an error is thrown immediately at server startup (`assertRuntimeFunctionsResolved()`)
- Cleanly implements deferred binding + validation for 200+ functions. **No changes needed.**

### 3-2. Security Middleware — Good

`server/security/auth.ts` (222 lines)

- `timingSafeEqual()` — timing attack prevention
- CSRF tokens: SHA-256 hash-based generation/validation (applied in execution-control.ts)
- CORS: `isTrustedOrigin()` + allowed domain list + suffix matching
- Cookies: `HttpOnly`, `SameSite=Strict`, conditional `Secure`
- Loopback-only access + Bearer token authentication, origin + auth validation on WebSocket connection

### 3-3. WebSocket Hub — Excellent

`server/ws/hub.ts` (70 lines)

- High-frequency event batching (cli_output: 250ms, subtask_update: 150ms)
- `MAX_BATCH_QUEUE = 60` → queue overflow prevention (oldest dropped)
- `wsClients.delete()` on disconnect → memory leak prevention. **No changes needed.**

### 3-4. Lifecycle Management — Excellent

`server/modules/lifecycle.ts` (616 lines)

- Orphaned task recovery (startup + interval mode), process PID liveness check
- Log file mtime check → determines if actual output is ongoing
- Heartbeat + stalled detection (90-second threshold), subtask delegation queue sweep
- Graceful shutdown: clean up all processes + close WebSocket connections

### 3-5. SQLite Concurrency Handling — Good

- `PRAGMA busy_timeout` + `withSqliteBusyRetry`: exponential backoff + jitter
- `runInTransaction`: transaction wrapper (used 23 times across 9 files)
- Message idempotency guarantee (`message-idempotency.ts`)

---

## 4. Issue Analysis

### 🔴 Critical — Scalability Limits

#### ~~[A1] App.tsx Single-State Monolith~~ ✅ Resolved (2026-03-14)

**Resolution:** Introduced 4 Zustand stores (agentStore, taskStore, projectStore, uiStore). All 46 useState calls in App.tsx removed → replaced with store subscriptions. Components subscribe only to the stores they need, eliminating unnecessary re-renders.

---

#### [A2] SQLite Single Node

**Location:** `server/db/runtime.ts`

**Issues:**
- Concurrent write limitation (single writer even in WAL mode)
- Multi-user/team collaboration structurally impossible
- Direct DB file exposure (no backup strategy)
- Horizontal scaling not possible

**Impact:** Immediate bottleneck when used by teams

---

#### [A3] Agent Execution — Direct Process Spawn

**Location:** `server/modules/routes/core/agents/spawn.ts`, `execution-run.ts`

**Issues:**
- Agent crash → task.status can remain permanently stuck at `"running"`
- No retry/timeout mechanism
- Race conditions possible when running multiple tasks concurrently
- Insufficient cleanup logic when process orphans occur

**Impact:** Accumulation of zombie tasks over prolonged operation

---

### 🟠 High — Conceptual Debt

#### [A4] WorkflowPackKey Remnants (20 files)

**Current state:**
```
Office Pack removal declared (Phase 5 complete) ✓
However WorkflowPackKey remains in DB fields/API types (20 files)
AgentManager: isIsolatedPack = false hardcoded
```

**Issues:**
- Dual model confusion: "pack = execution context" vs "category = project type"
- Causes confusion for new developer onboarding
- Unclear where new features should attach

---

#### [A5] Project Scoping — ✅ Resolved (2026-03-12)

**Implementation status:**
```
project_agents  ✓ DB ✓ Runtime  — team member management + auto-assign filter applied
project_rules   ✓ DB ✓ Runtime  — scope_type='project' CHECK constraint added,
                                  injected into prompt via buildRulesPromptBlock()
project_memory  ✓ DB ✓ Runtime  — scope_type='project' CHECK constraint added,
                                  projectId filter added to searchRelevantMemories()
project_hooks   ✓ DB ✓ Runtime  — scope_type='project' CHECK constraint added,
                                  pre-task/post-task/on-error/on-complete executed via executeHooks()
project_skills  ✓ DB ✓ Runtime  — project_skills table newly created,
                                  filterSkillsByProject() opt-out model filtering
```

**Resolved issues:**
- ~~When an agent runs a Project A task, Project B's rules/memory/hooks/skills were also applied~~ → project scope filtering applied
- ~~Even when user sets scope_type='project' in UI, it was ignored at runtime~~ → DB CHECK + runtime both applied
- Projects now operate as independent execution contexts

**Scope resolution priority (common to all features):**
```
project scope  > agent scope  > department scope  > global scope
└── within the same scope, ordered by priority DESC
```

**Implementation files:**
- `server/modules/bootstrap/schema/task-schema-migrations.ts` — scope_type CHECK migration + project_skills table
- `server/modules/workflow/core/project-scoped-rules.ts` — buildRulesPromptBlock() (new)
- `server/modules/workflow/core/hook-executor.ts` — executeHooks() (new)
- `server/modules/workflow/orchestration/autonomous-memory.ts` — projectId parameter added
- `server/modules/workflow/core/prompt-skills.ts` — filterSkillsByProject() added
- `server/modules/routes/core/tasks/execution-run.ts` — rules/memory/hooks/skills integration
- `server/modules/workflow/orchestration/execution-start-task.ts` — rules/memory/skills integration
- `server/modules/workflow/orchestration/run-complete-handler/core.ts` — post-task hooks integration

---

#### [A6] Mixed Real-Time Sync Strategy

**Issues:**
- Three simultaneous mechanisms: WebSocket + Polling + LiveSyncScheduler
- Race conditions when updates arrive from multiple channels for the same data
- No clear priority policy for which channel is authoritative

---

### 🟡 Medium — Lack of Observability

#### [A7] Agent Execution Black Box

**Current state:**
- `task_logs` table: stores raw stdout only
- No structural tracking of which files agents modified or which commands they ran
- No visibility into inter-agent collaboration flow (task handoff)
- No aggregation of execution cost (tokens × price)

#### [A8] Inconsistent Error Handling

**Pattern:**
```typescript
// This pattern appears many times throughout the codebase
someApi().catch(() => {})          // error swallowed
someApi().catch(console.error)     // logged only, no user feedback
```

- 4 mixed formats for backend error responses (`{ ok, data }`, `{ error }`, `{ ok, error }`, raw data)
- No error log aggregation (structured logger not used)
- **Frontend is unified with `handleApiError` utility** — only backend response format is non-standard

---

### 🔴 Critical — Security

#### ~~[A9] Rate Limiting Not Implemented~~ ✅ Resolved

`server/security/auth.ts` — In-process sliding window rate limiter implemented. General API: 300 req/min per IP, task execution: 20 req/min per IP.

#### ~~[A10] Weak OAuth Key Derivation~~ ✅ Resolved

`server/oauth/helpers.ts` — `oauthEncryptionKeyV2()`: PBKDF2-SHA256 (100k iterations) implemented. Backward compatible with v1/v2.

#### ~~[A11] Meeting Participant Filtering Bug~~ ✅ Resolved (2026-03-14)

`assignment_mode` condition removed → `project_agents` table-based filtering applied in all modes.

#### ~~[A12] No Environment Variable Validation at Startup~~ ✅ Resolved

`server/server-main.ts` — `validateEnv()` function validates required environment variables at server startup and outputs warnings. Throws immediately when OAuth is actually used.

---

### 🟠 High — Code Debt

#### [A13] Large File Problem

| File | LOC | Issue |
|------|-----|-------|
| `gateway/client.ts` | 1,083 | Gateway + messenger + Discord API + RPC mixed, no retry |
| `bootstrap/schema/task-schema-migrations.ts` | 1,180 | All migrations in 1 file, no version tracking |
| `workflow/orchestration/review-finalize-tools.ts` | 875 | Review completion logic in single file |
| `workflow/orchestration.ts` | 785 | `__ctx` variable extraction pattern repeated 200+ times |

#### ~~[A14] No WebSocket Connection Limit~~ ✅ Resolved

`server/modules/lifecycle.ts` — `MAX_WS_CLIENTS = 20` global limit. Immediately closes with code `4008` when exceeded.

#### [A15] 15 In-Memory Maps

15 Maps/Sets exist in server process memory in `orchestration.ts`:
- Meeting/review session state lost entirely on server restart
- Horizontal scaling not possible
- `reviewRoundState`, `taskExecutionSessions`, `meetingPresenceUntil`, etc.

#### ~~[A16] No Migration Version Tracking~~ ✅ Resolved

`server/modules/bootstrap/schema/versioned-migrations.ts` — `schema_migrations` table + `runVersionedMigrations()` implemented. Tracks which versions have been applied and prevents duplicate execution.

---

### 🟡 Medium

#### ~~[A17] No Messenger Retry~~ ✅ Resolved (2026-03-14)

`server/messenger/` — `forwardToInboxWithRetry()` helper added. Up to 3 retries with exponential backoff (2s→4s→8s).

#### [A18] Dynamic SQL in 24 Places

```typescript
db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
```

Currently low risk because column names are hardcoded, but the pattern is spread across 24 places → potential for mistakes.

#### ~~[A19] No Structured Logging~~ ✅ Resolved

`server/lib/logger.ts` — pino introduced. Environment-specific logger (dev: pino-pretty, prod: JSON). Replaced `console.log/warn/error` → `logger.info/warn/error` across 40+ server files.

#### ~~[A20] Uneven Test Coverage~~ ✅ Resolved

Server tests 181 + frontend tests 43, all passing. Test coverage significantly expanded for key modules (lifecycle, versioned-migrations, hub, gateway, etc.).

Core modules without tests:
- `lifecycle.ts` (616 lines) 🔴
- `bootstrap/schema/` — DB migrations 🔴
- `oauth/` 🔴
- `routes/core/tasks/execution-run.ts` (729 lines) 🔴
- `gateway/` (1,083 lines vs 1 test) 🟠

#### [A21] TypeScript `as any` — 256 Occurrences

`runtimeContext: Record<string, any>` design is the root cause. Weak type safety at module boundaries.

---

## 5. Architecture Improvement Directions

### ~~Phase A — State Management Redesign~~ ✅ Complete (2026-03-14)

4 Zustand stores (agentStore, taskStore, projectStore, uiStore) introduced. All 46 useState calls in App.tsx removed. Components subscribe only to the stores they need, eliminating unnecessary re-renders.

---

### Phase B — Agent Execution Engine Hardening

**Goal:** Direct process spawn → state machine + execution queue

```
Current:
request → spawn() → WebSocket broadcast → done

Target:
request → ExecutionQueue
              │
              ▼
           Worker (state machine)
           ├── QUEUED      waiting in queue
           ├── STARTING    process initialization
           ├── RUNNING     executing (heartbeat)
           ├── PAUSED      paused
           ├── DONE        completed
           ├── FAILED      failed (error + retry decision)
           └── TIMED_OUT   timeout exceeded
```

**Additional implementation items:**
- Add state machine fields to `execution_sessions` table
- Per-task timeout policy configuration (`timeout_minutes`)
- Agent heartbeat (30-second interval) → transition to FAILED if no response
- Crash detection → automatic state recovery (`RUNNING` → `FAILED`)
- Concurrent execution limit (max 1 active task per agent)

---

### Phase C — Full Project Context Isolation (Runtime Application)

**Goal:** Project as an independent execution context — DB is ready, runtime application is the key

**Current DB model (already implemented):**
```
agent_rules, memory_entries, hook_entries all have
scope_type = 'global' | 'department' | 'agent' | 'workflow_pack' | 'project'
scope_id = reference ID of the corresponding scope
→ Separate project_* tables not needed, use existing unified scope model
```

**Only skills require DB schema enhancement:**
```sql
-- Add project scope to skill_learning_history
ALTER TABLE skill_learning_history ADD COLUMN project_id TEXT REFERENCES projects(id);

-- Manage per-project skill activation/deactivation
CREATE TABLE project_skills (
  project_id TEXT NOT NULL REFERENCES projects(id),
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (project_id, skill_id)
);
```

**Runtime application — 4-step implementation:**

**C-1. Rules Prompt Injection** (new)
```typescript
// Add to execution-start-task.ts
function buildRulesPromptBlock(db, projectId, agentId, deptId): string {
  // priority: project > agent > department > global
  const rules = db.prepare(`
    SELECT rule_content, priority FROM agent_rules
    WHERE enabled = 1 AND (
      (scope_type = 'project' AND scope_id = ?) OR
      (scope_type = 'agent' AND scope_id = ?) OR
      (scope_type = 'department' AND scope_id = ?) OR
      (scope_type = 'global')
    )
    ORDER BY
      CASE scope_type
        WHEN 'project' THEN 1
        WHEN 'agent' THEN 2
        WHEN 'department' THEN 3
        WHEN 'global' THEN 4
      END,
      priority DESC
  `).all(projectId, agentId, deptId);
  // ...
}
```

**C-2. Memory Project Filter Addition** (existing modification)
```typescript
// autonomous-memory.ts — add projectId parameter to searchRelevantMemories()
if (projectId) {
  scopeConditions.push("(scope_type = 'project' AND scope_id = ?)");
  scopeParams.push(projectId);
}
// execution-start-task.ts — pass projectId when calling buildMemoryPromptBlock()
```

**C-3. Hooks Runtime Execution Engine** (new)
```typescript
// hook-executor.ts — execute hooks at task lifecycle events
async function executeHooks(db, eventType, { projectId, agentId, deptId, taskId }) {
  const hooks = db.prepare(`
    SELECT command, working_directory, timeout_ms FROM hook_entries
    WHERE enabled = 1 AND event_type = ? AND (
      (scope_type = 'project' AND scope_id = ?) OR
      (scope_type = 'agent' AND scope_id = ?) OR
      (scope_type = 'department' AND scope_id = ?) OR
      (scope_type = 'global')
    )
    ORDER BY priority DESC
  `).all(eventType, projectId, agentId, deptId);
  // child_process.execFile() with timeout
}
// execution-run.ts — called at pre-task, post-task, on-error points
```

**C-4. Skills Project Filtering** (existing modification)
```typescript
// prompt-skills.ts — filter only skills enabled via project_skills table
function queryPromptSkillsByProject(db, provider, projectId): SkillBlock[] {
  // return only those with project_skills.enabled = true
  // skills not in project_skills are enabled by default (opt-out model)
}
```

**Context priority during agent execution (scope resolution):**
```
project scope  > agent scope  > department scope  > global scope
└── within the same scope, ordered by priority DESC
└── items in higher scope with the same key/topic can override lower scope
```

---

### Phase D — Observability Layer

**Goal:** Structurally track the internals of agent execution

**AgentTrace model:**
```sql
CREATE TABLE agent_traces (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  span_type TEXT NOT NULL,
  -- 'thinking' | 'tool_call' | 'file_write' | 'git_commit'
  -- | 'message' | 'api_call' | 'error'
  input_json TEXT,
  output_json TEXT,
  duration_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Dashboard additional view — Agent Timeline:**
```
[Project Timeline]
  ── Alice (claude)
     10:00  thinking      "Analyzing..."
     10:01  file_write    src/components/Button.tsx (+45 lines)
     10:02  git_commit    "feat: add Button component"
     10:03  message       → Bob: "PR review request"
     Total: 3 min 12 sec | 2,341 tokens | $0.023

  ── Bob (codex)
     10:04  thinking      "Reviewing..."
     ...
```

---

### Phase E — Sync Strategy Consolidation

**Goal:** WebSocket primary + HTTP fallback structure

```
Current: WebSocket + Polling + LiveSyncScheduler (3 channels)

Target:
Primary:  WebSocket (push)
           └── all real-time events (task, agent, message, cli_output)
Fallback: HTTP polling (30-second interval)
           └── only activated when WebSocket disconnection is detected
Remove:   LiveSyncScheduler (absorbed into WebSocket)
```

**Event versioning:**
```typescript
// Add sequence number to each event
{ type: 'task_update', seq: 1042, payload: {...} }
// Client: detect seq gap → selective HTTP re-sync
```

---

## 6. Platform Roadmap

### v2.1 — Stabilization (Short-term, ~4 weeks)

| Item | Description | Effort |
|------|-------------|--------|
| Complete WorkflowPackKey removal | `task.workflow_pack_key` → `task.context_hint` | 1 day |
| ~~Unify API error handling~~ | ✅ Implemented — server/errors/ApiError.ts + errorMiddleware.ts + frontend handleApiError.ts toast integration | ~~2 days~~ |
| ~~Sync strategy consolidation~~ | ✅ Implemented — WS task_update direct apply + adaptive polling interval | ~~2 days~~ |
| project_path validation API | Endpoint to verify path existence on server | 1 day |
| ~~Execution state consistency correction~~ | ✅ Already implemented — `lifecycle.ts` recoverOrphanInProgressTasks() (startup 60s grace + 30s sweep + heartbeat) | ~~1 day~~ |

---

### v2.2 — Execution Engine Hardening (Medium-term, ~6 weeks)

| Item | Description | Effort |
|------|-------------|--------|
| ~~Agent execution state machine~~ | ✅ Implemented — stalled auto-recovery + state transition validation guard + agent idle reset | ~~3 days~~ |
| ~~Execution timeout policy~~ | ✅ Implemented — `timeout_minutes` column + `enforceTaskTimeouts()` 30-second interval check | ~~1 day~~ |
| ~~Agent heartbeat~~ | ✅ Already implemented — 30s heartbeat + 90s stalled detection + 180s auto-recovery | ~~2 days~~ |
| Execution cost tracking | Token × price table → per-project cost aggregation | 2 days |
| Concurrent execution limit | Enforce max 1 active task per agent | 1 day |

---

### v2.3 — Project OS Completion (Medium-term, ~8 weeks)

| Item | Description | Effort |
|------|-------------|--------|
| ~~C-1. Rules prompt injection~~ | ~~New buildRulesPromptBlock() implementation~~ ✅ Complete | ~~2 days~~ |
| ~~C-2. Memory project filter~~ | ~~Add projectId to autonomous-memory.ts~~ ✅ Complete | ~~1 day~~ |
| ~~C-3. Hooks runtime execution~~ | ~~New hook-executor.ts~~ ✅ Complete | ~~3 days~~ |
| ~~C-4. Skills project scoping~~ | ~~project_skills table + filtering~~ ✅ Complete | ~~2 days~~ |
| App.tsx → Zustand separation | 4 domain-specific stores | 4 days |
| Project templates | Category → auto-generate objectives/gates | 2 days |
| Agent timeline view | Execution visualization based on AgentTrace | 3 days |
| Task handoff | A completes → B auto-starts (dependency chain) | 3 days |

---

### v3.0 — Collaboration & Multi-tenant (Long-term, ~3 months)

| Item | Description |
|------|-------------|
| SQLite → PostgreSQL | Multi-user, concurrency, horizontal scaling |
| Team workspaces | Organization → Teams → Projects hierarchy |
| AgentDesk API | External agent execution trigger (REST/Webhook) |
| Agent marketplace | Community agent sharing + installation |
| Standalone web version | Browser-only usage without Electron |

---

### v3.x — AI Infrastructure Platform (Vision)

| Item | Description |
|------|-------------|
| Orchestration DSL | `project.agents.filter(role='senior').run(task, parallel=true)` |
| Execution history-based recommendations | Optimal agent assignment from past patterns |
| Multi-cloud routing | Dynamic selection of Claude / GPT-4 / Gemini (cost + performance optimization) |
| Automatic workflow optimization | Learn execution patterns → suggest parallelization |

---

## 7. Immediate Action Recommendations

### Completed P0 Items (as of 2026-03-14)

| Priority | Item | Issue | Status |
|----------|------|-------|--------|
| ~~**P0**~~ | ~~Meeting participant filtering bug~~ | [A11] `loadManualProjectAgentScope()` assignment_mode condition removed | ✅ Complete |
| ~~**P0**~~ | ~~OAuth PBKDF2 migration~~ | [A10] `oauthEncryptionKeyV2()` PBKDF2-SHA256 100k iter already implemented | ✅ Complete |
| ~~**P0**~~ | ~~Add rate limiting~~ | [A9] `auth.ts` in-process sliding window RL (300/20 req/min) implemented | ✅ Complete |
| ~~**P0**~~ | ~~WS connection limit~~ | [A14] `lifecycle.ts` MAX_WS_CLIENTS=20, code 4008 | ✅ Complete |
| ~~**P0**~~ | ~~Environment variable startup validation~~ | [A12] `server-main.ts` validateEnv() + oauthEncryptionKeyV2 throw | ✅ Complete |

### ~~Remaining P1 Items~~ — All Complete

| Item | Issue | Status |
|------|-------|--------|
| ~~App.tsx → Zustand separation~~ | [A1] 46 useState → 4 stores | ✅ Complete |
| ~~WorkflowPackKey → category_id bridge~~ | [A4] category_id connection complete | ✅ Complete |
| ~~Structured logging (pino)~~ | [A19] Full server pino migration | ✅ Complete |

### ~~Medium-term P2 Items~~ — All Complete

| Item | Status |
|------|--------|
| ~~Agent Flow Graph implementation~~ | ✅ Complete |
| ~~Execution cost tracking~~ | ✅ Complete |
| ~~Concurrent execution queue (FIFO)~~ | ✅ Complete |
| ~~Agent timeline view~~ | ✅ Complete |
| ~~Task handoff~~ | ✅ Complete |
| ~~Persona UI completion~~ | ✅ Complete |

### Complete List of Resolved Items

| Item | Completion |
|------|------------|
| ~~Meeting participant filtering bug~~ | ✅ 2026-03-14 — loadManualProjectAgentScope fix |
| ~~Messenger inbox retry~~ | ✅ 2026-03-14 — forwardToInboxWithRetry (3 retries, exponential backoff) |
| ~~OAuth PBKDF2~~ | ✅ Already implemented — oauthEncryptionKeyV2 |
| ~~Rate Limiting~~ | ✅ Already implemented — auth.ts in-process RL |
| ~~WS connection limit~~ | ✅ Already implemented — MAX_WS_CLIENTS=20 |
| ~~Environment variable validation~~ | ✅ Already implemented — validateEnv() |
| ~~DB migration version tracking~~ | ✅ Already implemented — versioned-migrations.ts |
| ~~In-memory Map leak~~ | ✅ Already implemented — onClose/onError delete + RL sweep |
| ~~Execution state consistency correction~~ | ✅ lifecycle.ts orphan recovery + heartbeat |
| ~~API error handling unification~~ | ✅ ApiError class + global middleware + handleApiError |
| ~~Agent execution state machine~~ | ✅ stalled auto-recovery + timeout + state transition validation |
| ~~Sync strategy consolidation~~ | ✅ task_update direct apply + adaptive polling |
| ~~Project scoping runtime application~~ | ✅ C-1~C-4 complete (rules/memory/hooks/skills) |

---

## 8. Appendix — Additional Findings

### B. Race Condition Risks

`lifecycle.ts`: SELECT followed by UPDATE is not atomic. Parent task state changes during subtask delegation, concurrent meeting state access, etc.

**Recommendation:** Expand use of `runInTransaction()` for multi-step state changes + optimistic locking (version column).

### C. Inconsistent Response Formats

```typescript
res.json({ agents })                           // raw
res.status(201).json({ ok: true, agent })      // ok + data
res.status(500).json({ ok: false, error })     // ok + error
res.status(400).json({ error: "code" })        // error only
```

**Recommended standard:** Success `{ data: T }`, Error `{ error: { code, message } }`.

### D. Incomplete CSRF Validation Scope

CSRF validation is only applied in `execution-control.ts:84~85`.
Not applied to: agents CRUD, projects, settings, memory, rules, hooks.

### E. OpenAPI Spec Sync Issue

Only 25 of 100+ endpoints are documented (25% coverage). `pnpm openapi:sync` command exists → recommend adding CI validation.

### F. Key File Reference

| Role | Path |
|------|------|
| App state management | `src/App.tsx` |
| Business logic | `src/app/useAppActions.ts` |
| Initial data load | `src/app/useAppBootstrapData.ts` |
| Real-time sync | `src/app/useRealtimeSync.ts` |
| HTTP layer | `src/api/core.ts` |
| Agent execution | `server/modules/routes/core/tasks/execution-run.ts` |
| Process spawn | `server/modules/routes/core/agents/spawn.ts` |
| DB schema | `server/modules/bootstrap/schema/base-schema.ts` |
| WebSocket Hub | `server/ws/hub.ts` |
| Lifecycle | `server/modules/lifecycle.ts` |
| OAuth keys | `server/oauth/helpers.ts` |
| Meeting leader selection | `server/modules/workflow/orchestration/meetings/leader-selection.ts` |
| Type definitions | `src/types/index.ts` |
