# P2 Task Detailed Design (P2-2 ~ P2-8)

> **Purpose:** A document specifying file paths, current status, and implementation steps for each task so that AI agents can begin implementation immediately without exploring the codebase.
> **Updated:** 2026-03-14

---

## P2-2 — Agent Execution Cost Tracking

### Current Status

- `task_execution_events` table exists but has no token/cost columns
- `notifications` table already has a `cost_alert` type
- Cost alert settings API (`/api/cost-alerts`) already implemented in `worktrees-and-usage.ts`
- Code to parse token counts from Claude API responses: **not present**

### Implementation Files

| File | Task |
|---|---|
| `server/modules/bootstrap/schema/versioned-migrations.ts` | Add migration |
| `server/modules/workflow/agents/providers/api-provider-tools.ts` | Parse tokens from response headers |
| `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` | Save cost on completion |
| `src/components/agent-detail/AgentDetailTabContent.tsx` | Add "This Month's Cost" badge |
| `src/app/AppMainLayout.tsx` | Add Dashboard cost widget |
| `src/api/index.ts` | Add cost query API function |

### Implementation Steps

**Step 1: DB Migration**
```typescript
// Add to the end of versioned-migrations.ts
{
  id: "2026-03-14-XXX-task-token-cost",
  up: (db) => {
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_in INTEGER DEFAULT 0"); } catch {}
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_out INTEGER DEFAULT 0"); } catch {}
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN cost_usd REAL DEFAULT 0"); } catch {}
  },
},
```

**Step 2: Token Parsing (API Provider)**

Claude API response structure:
```typescript
// api-provider-tools.ts — inside launchApiProviderAgent completion callback
// Anthropic SDK response.usage structure:
// { input_tokens: number, output_tokens: number }
const inputTokens = response.usage?.input_tokens ?? 0;
const outputTokens = response.usage?.output_tokens ?? 0;
// Claude Sonnet 4.5 pricing (USD): input $3/MTok, output $15/MTok
const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
```

**Step 3: Frontend — Agent Detail Badge**
```tsx
// AgentDetailTabContent.tsx — add next to existing "Persona" tab
// GET /api/agents/:id/cost-summary → { thisMonthUsd: number, totalTokens: number }
```

**Step 4: Dashboard Widget**
```tsx
// Add to the dashboard section in AppMainLayout.tsx
// Aggregated cost card for all agents (this month's total)
```

---

## P2-3 — Concurrent Execution Limit (FIFO Queue)

### Current Status

- No concurrent execution limit when `startTaskExecutionForAgent()` is called in `orchestration.ts`
- `MAX_CONCURRENT_AGENTS` environment variable: **not present**
- `readNonNegativeIntEnv()` utility already exists in `db/runtime.ts` — can be reused

### Implementation Files

| File | Task |
|---|---|
| `server/modules/workflow/orchestration/agent-queue.ts` | Create new — FIFO queue |
| `server/modules/workflow/orchestration.ts` | Integrate queue (line ~449, at startTaskExecutionForAgent call site) |
| `server/db/runtime.ts` | Add `MAX_CONCURRENT_AGENTS` constant |
| `src/components/AppHeaderBar.tsx` or Dashboard | Display queue length widget |

### Implementation Steps

**Step 1: Create Queue Module**
```typescript
// server/modules/workflow/orchestration/agent-queue.ts (new)
export function createAgentQueue(maxConcurrent: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  function tryNext() {
    if (running >= maxConcurrent || queue.length === 0) return;
    running++;
    const next = queue.shift()!;
    next();
  }

  function enqueue(fn: () => void): void {
    queue.push(fn);
    tryNext();
  }

  function onComplete(): void {
    running--;
    tryNext();
  }

  function getQueueLength(): number { return queue.length; }
  function getRunningCount(): number { return running; }

  return { enqueue, onComplete, getQueueLength, getRunningCount };
}
```

**Step 2: Integrate into orchestration.ts**
```typescript
// Add to server/db/runtime.ts
export const MAX_CONCURRENT_AGENTS = readNonNegativeIntEnv("MAX_CONCURRENT_AGENTS", 10);

// orchestration.ts — wrap startTaskExecutionForAgent
const agentQueue = createAgentQueue(MAX_CONCURRENT_AGENTS);
// Enqueue on task execution request, call onComplete when run-complete fires
```

**Step 3: Broadcast Queue Status**
```typescript
broadcast("queue_status", { running: agentQueue.getRunningCount(), queued: agentQueue.getQueueLength() });
```

**Step 4: Frontend — Display Queue Status**
```tsx
// Simple counter in Dashboard or header
// "Running: N / Queued: M"
```

---

## P2-4 — Batch DB Queries on Spawn

### Current Status

Individual queries inside `startTaskExecutionForAgent()` in `execution-start-task.ts`:

| Location | Current Query |
|---|---|
| `buildRulesPromptBlock()` | `SELECT ... FROM agent_rules WHERE ...` |
| `buildMemoryPromptBlock()` | `SELECT ... FROM memory_entries WHERE ...` |
| `buildAvailableSkillsPromptBlock()` | `SELECT ... FROM skill_learning_history WHERE ...` |
| `loadPendingInterruptPrompts()` | `SELECT ... FROM task_interrupt_injections WHERE ...` |
| `getRecentConversationContext()` | `SELECT ... FROM messages WHERE ...` |
| `getTaskContinuationContext()` | `SELECT ... FROM task_logs WHERE ...` |

Each is a separate round-trip (6+ total).

### Implementation Files

| File | Task |
|---|---|
| `server/modules/workflow/orchestration/execution-start-task.ts` | Extract `buildExecutionPayload()` function + Promise.all |
| Related helpers in `server/modules/workflow/core/` | Add batch input option to each function |

### Implementation Steps

**Step 1: Parallelize with Promise.all** (fastest approach)
```typescript
// Inside startTaskExecutionForAgent
const [rulesBlock, memoryBlock, skillsBlock, interruptPrompts, convCtx, continuationCtx] =
  await Promise.all([
    Promise.resolve(buildRulesPromptBlock(db, { projectId, agentId, departmentId }, taskLang)),
    Promise.resolve(buildMemoryPromptBlock({ db }, { agentId, ... }, taskLang)),
    Promise.resolve(buildAvailableSkillsPromptBlock(provider, projectId)),
    Promise.resolve(loadPendingInterruptPrompts(db, taskId, sessionId)),
    Promise.resolve(getRecentConversationContext(agentId)),
    Promise.resolve(getTaskContinuationContext(taskId)),
  ]);
```

> **Note:** `better-sqlite3` / `node:sqlite` use a synchronous API, so this is not true I/O parallelization.
> The goal is to clarify code structure and enable easy migration when switching to Worker Threads later.

**Step 2: Preheat cache (optional)**
- When a project is selected, pre-fetch Rules/Memory/Skills and cache in `Map<projectId, payload>`
- TTL: 5 minutes (Rules/Memory already have a 5-minute TTL cache — apply the same pattern)

---

## P2-5 — Agent Timeline View

### Current Status

- `task_logs` table exists (`task_id, level, message, created_at` columns)
- `task_execution_events` table exists (`event_type, from_state, to_state, created_at`)
- Agent detail modal: `src/components/agent-detail/AgentDetailTabContent.tsx`
  - Current tabs: only "Persona"
- `AgentDetailTabContent` props: `{ agent, tasks }` (passed from AgentDetail.tsx)

### Implementation Files

| File | Task |
|---|---|
| `src/components/agent-detail/AgentTimeline.tsx` | Create new — timeline component |
| `src/components/agent-detail/AgentDetailTabContent.tsx` | Add "Timeline" tab |
| `src/api/index.ts` | Add `getAgentTimeline(agentId)` API function |
| `server/modules/routes/core/agents/` | Add GET `/api/agents/:id/timeline` route |

### API Design

```typescript
// GET /api/agents/:id/timeline
// Response:
interface TimelineEvent {
  id: string;
  type: "task_start" | "task_done" | "task_fail" | "skill_learn" | "memory_save" | "hook_run";
  taskId?: string;
  taskTitle?: string;
  message: string;
  created_at: number; // unix ms
}
```

### Timeline UI Pattern

```tsx
// AgentTimeline.tsx
// Vertical timeline — descending by time
<div className="flex flex-col">
  {events.map(ev => (
    <div key={ev.id} className="flex gap-3 py-2">
      {/* Time axis */}
      <div className="w-16 text-[10px] text-[var(--th-text-muted)] font-mono shrink-0">
        {formatTime(ev.created_at)}
      </div>
      {/* Event dot + line */}
      <div className="flex flex-col items-center">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLOR[ev.type] }} />
        <div style={{ flex: 1, width: 1, background: "var(--th-border)" }} />
      </div>
      {/* Event content */}
      <div className="text-[11px] font-mono text-[var(--th-text-secondary)] pb-2">
        {ev.message}
      </div>
    </div>
  ))}
</div>
```

---

## P2-6 — Task Handoff (Agent → Agent)

### Current Status

- `tasks` table has no `handoff_to_agent_id` or `handoff_condition` columns
- Completion logic is split across `core.ts`, `state-updates.ts`, etc. in `run-complete-handler/`
- On task completion, the handler in `run-complete-handler.ts` is called

### Implementation Files

| File | Task |
|---|---|
| `server/modules/bootstrap/schema/versioned-migrations.ts` | Add migration |
| `server/modules/workflow/orchestration/run-complete-handler/core.ts` | Evaluate handoff condition + create follow-up task |
| `src/components/taskboard/CreateTaskModal.tsx` | Add "Handoff on completion" option |
| `src/api/index.ts` | Add handoff fields to task creation API |

### Implementation Steps

**Step 1: DB Migration**
```typescript
{
  id: "YYYY-MM-DD-XXX-task-handoff",
  up: (db) => {
    try { db.exec("ALTER TABLE tasks ADD COLUMN handoff_to_agent_id TEXT REFERENCES agents(id)"); } catch {}
    try { db.exec("ALTER TABLE tasks ADD COLUMN handoff_condition TEXT"); } catch {}
    // handoff_condition: "always" | "on_success" | "on_fail"
  },
},
```

**Step 2: Integrate into Completion Handler**
```typescript
// run-complete-handler/core.ts — after task completion processing
const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
if (task.handoff_to_agent_id && shouldHandoff(task.handoff_condition, exitCode)) {
  const newTaskId = createHandoffTask(db, task, task.handoff_to_agent_id);
  broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(newTaskId));
}
```

**Step 3: Frontend — CreateTaskModal**
```tsx
// Add "Handoff on completion" toggle + agent selection dropdown at the bottom of the task creation form
// Visualizing handoff edges in the P2-1 Flow Graph will be integrated after P2-1 is complete
```

---

## P2-7 — Persona System UI Completion

### Current Status (80% complete)

| Component | File | Status |
|---|---|---|
| `PersonaCatalog` | `src/components/persona/PersonaCatalog.tsx` | ✅ Complete — category filter + grid |
| `PersonaCard` | `src/components/persona/PersonaCard.tsx` | ✅ Complete — style keywords, name, tags displayed |
| `PersonaBadge` | `src/components/persona/PersonaBadge.tsx` | ✅ Present |
| Agent detail inline editing | `agent-detail/AgentDetailTabContent.tsx` | ✅ Persona text editing (raw .md) |
| `PersonaDetailPanel` | Not present | ❌ Not implemented |
| Agent list badge | `AgentManager.tsx` | ❌ Not connected |

**API:**
- `GET /api/personas` → `{ personas: Persona[] }` (hardcoded array inside `personas.ts`)
- `GET /api/agents/:id/persona` → `.md` file contents (text)
- `POST /api/agents/:id/persona` → saves `.md` file

**`Persona` type** (`src/types/index.ts`):
```typescript
interface Persona {
  id: string;
  name: string;            // Display name (e.g. "Einstein")
  category: string;        // "tech" | "biz" | "creative" | ...
  style_keywords: string[];
  best_for: string[];
  accent_color: string;    // hex color
}
```

### Incomplete Items — Implementation Steps

**Step 1: PersonaDetailPanel Component** (new)
```tsx
// src/components/persona/PersonaDetailPanel.tsx
// Displayed in the right panel when a persona is selected
// - Person name + category
// - Full style_keywords list
// - Preview text: "This agent thinks like..." (requires adding persona.description field)
// - Full best_for tags
```

**Step 2: Connect Persona Badge to Agent List**
```tsx
// AgentManager.tsx — add PersonaBadge to agent cards
// Show badge if agent.persona_id is set
// PersonaBadge: persona name + accent_color background
```

**Step 3: Agent Detail Modal — PersonaCatalog Tab**
```tsx
// AgentDetailTabContent.tsx — add catalog selection tab alongside existing raw editor
// "Select from catalog" tab → renders PersonaCatalog
// On selection, call API to update agent.persona_id
```

---

## P2-8 — WebSocket Broadcast Optimization

### Current Status

Current implementation in `server/ws/hub.ts`:
- `cli_output`: 250ms batching ✅ (already implemented)
- `subtask_update`: 150ms batching ✅ (already implemented)
- Others (`task_update`, `agent_status`, etc.): sent immediately
- Channel subscription separation: **not present** — broadcasts to all clients
- stdout chunk splitting: **not present**

### Implementation Files

| File | Task |
|---|---|
| `server/ws/hub.ts` | Add channel subscriptions + stdout chunk splitting |
| `src/hooks/useWebSocket.ts` | Send client subscription channels |
| `server/modules/lifecycle.ts` | Handle subscription channels on WS connection |

### Implementation Steps

**Step 1: stdout Chunk Splitting** (fastest impact)
```typescript
// hub.ts — split chunks before cli_output broadcast
const MAX_CHUNK_SIZE = 4096; // 4KB
function broadcastCliOutput(taskId: string, line: string): void {
  if (line.length <= MAX_CHUNK_SIZE) {
    broadcast("cli_output", { taskId, line });
    return;
  }
  for (let i = 0; i < line.length; i += MAX_CHUNK_SIZE) {
    broadcast("cli_output", { taskId, line: line.slice(i, i + MAX_CHUNK_SIZE) });
  }
}
```

**Step 2: Channel Subscription Separation**
```typescript
// Clients subscribe to agentId/taskId of interest on connection
// WS message: { type: "subscribe", channels: ["agent:agent-1", "task:task-2"] }
// hub.ts: maintain a subscription Set per wsClient → check subscription on broadcast
```

> **Implementation priority:** Step 1 (chunk splitting) is risk-free and immediately effective. Step 2 requires client protocol changes — recommended as a separate PR.

---

## References

- Migration pattern: `server/modules/bootstrap/schema/versioned-migrations.ts`
- Full DB table listing: `server/modules/bootstrap/schema/base-schema.ts`
- Server entry point map: `CLAUDE.md` — Core File Map section
- Codebase overview: `docs/OVERVIEW.md` sections 2–6
