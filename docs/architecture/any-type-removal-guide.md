# `any` Type Removal Guide

> Purpose: Detailed execution guide for AI agents to systematically remove `any` types.
> Rule: CLAUDE.md §0-3 — Zero tolerance for `any` unless wrapping a third-party boundary.

---

## 1. Current State

| Metric | Server | Frontend | Total |
|--------|--------|----------|-------|
| `any` occurrences | 563 | 26 | **589** |
| Files with `any` | 117 | 21 | **138** |
| `as any` casts | 144 | 10 | **154** |
| `as unknown as` double-casts | 37 | 10 | **47** |

**44% concentrated in 2 files:** `runtime-context-auto-augmented.ts` (153) + `runtime-context.ts` (107)

---

## 2. Priority Phases

### Phase 1: Quick Wins — `as any` casts in production code (estimated ~80 fixes)

These are explicit type silencing. Fix by defining proper types.

**Strategy:** For each `as any`, determine what the actual type is and replace.

**Common patterns and fixes:**

#### Pattern A: SQLite query result
```typescript
// BAD
const rows = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;

// GOOD
interface TaskRow { id: string; title: string; status: string; /* ... */ }
const rows = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow | undefined;
```

#### Pattern B: Express req/res
```typescript
// BAD
(req as any).body.title

// GOOD — define typed body
const body = req.body as { title?: string; description?: string };
```

#### Pattern C: Dynamic deps object
```typescript
// BAD
const { db, broadcast } = deps as Record<string, any>;

// GOOD — define interface
interface HandlerDeps { db: DatabaseSync; broadcast: (type: string, payload: unknown) => void; }
const { db, broadcast } = deps as HandlerDeps;
```

#### Pattern D: JSON parse
```typescript
// BAD
const data = JSON.parse(raw) as any;

// GOOD
interface ParsedData { tasks?: { title: string }[]; }
const data = JSON.parse(raw) as ParsedData;
```

**Files to fix (Phase 1):**

| # | File | Count | Fix Direction |
|---|------|-------|---------------|
| 1 | `routes/core/tasks/execution-control.ts` | 20 | Define `ExecutionControlReq` type for req, typed DB row interfaces |
| 2 | `workflow/orchestration/report-workflow-tools.ts` | 9 | Define `ReportDeps` interface, typed query results |
| 3 | `routes/core/tasks/subtasks.ts` | 9 | Define `SubtaskRow`, typed function params |
| 4 | `workflow/orchestration/execution-start-task.ts` | 8 | Typed deps, remove `as any` from workflow function calls |
| 5 | `routes/core/github-routes.ts` | 6 | Define `GitHubApiResponse` interfaces |
| 6 | `workflow/agents/subtask-seeding.ts` | 6 | Typed function params |
| 7 | `workflow/orchestration/run-complete-handler/error-analysis.ts` | 5 | Typed deps interface |
| 8 | `routes/ops/worktrees-and-usage.ts` | 5 | Typed query results |
| 9 | `routes/collab/subtask-delegation-batch.ts` | 5 | Typed function params |
| 10 | `workflow/orchestration/meetings/review-consensus-outcome.ts` | 4 | Typed meeting data |
| 11 | `workflow/core/worktree/lifecycle.ts` | 4 | Typed function returns |
| 12 | `workflow/agents/providers/oauth-tools.ts` | 4 | Typed OAuth response |
| 13 | `workflow/agents/providers/api-provider-tools.ts` | 4 | Typed API response |

**Execution instructions for each file:**

1. Read the file completely
2. Find each `any` occurrence
3. Trace the actual runtime type (check DB schema, API response, or caller)
4. Define an interface at the top of the file (or import from a shared types file)
5. Replace `any` with the interface
6. Run `npx tsc -b --noEmit` — zero errors required
7. One commit per file (or closely related file group)

---

### Phase 2: Runtime Context — The Big One (260 occurrences, 2 files)

**Files:**
- `server/types/runtime-context.ts` (107 `any`)
- `server/types/runtime-context-auto-augmented.ts` (153 `any`)

**Why these are special:**
These files define the `RuntimeContext` interface — a massive dependency-injection object passed throughout the workflow engine. Every property is typed as `(...args: any[]) => any` because the actual functions come from different modules loaded at runtime.

**Strategy: Gradual convergence (NOT big-bang replacement)**

1. Pick ONE function property (e.g., `appendTaskLog`)
2. Find the actual implementation (e.g., in `orchestration.ts`)
3. Define the correct signature: `(taskId: string, kind: string, message: string) => void`
4. Update the interface property
5. Fix all callers that now have type errors
6. Run `npx tsc -b --noEmit`
7. Commit
8. Repeat for the next property

**Batching strategy:**
- Group related functions (e.g., all `broadcast*` functions, all `appendTaskLog*` functions)
- Fix 5-10 properties per batch
- ~26-52 batches to complete

**Risk mitigation:**
- NEVER use `@ts-expect-error` or `@ts-ignore` as a workaround
- If a property is used in 10+ files, fix all callers in the same commit
- If a property has polymorphic callers (different arg patterns), use function overloads
- Keep `any` fallback comment: `// third-party boundary` if truly untyped

**Properties to start with (most commonly used, clearest signatures):**

| Property | Current | Target Signature |
|----------|---------|-----------------|
| `appendTaskLog` | `(...args: any[]) => any` | `(taskId: string, kind: string, message: string) => void` |
| `broadcast` | `(...args: any[]) => any` | `(type: string, payload: unknown) => void` |
| `nowMs` | `(...args: any[]) => any` | `() => number` |
| `insertNotification` | `(...args: any[]) => any` | `(params: { type: string; title: string; body?: string \| null; task_id?: string \| null; agent_id?: string \| null }) => string \| void` |
| `resolveProjectPath` | `(...args: any[]) => any` | `(projectId: string) => string` |

---

### Phase 3: `as unknown as` Double-Casts (47 occurrences)

These completely bypass the type system and are the most dangerous pattern.

**Files with double-casts:**

| File | Count | Pattern |
|------|-------|---------|
| `server/modules/workflow.ts` | ~5 | Large object `as unknown as WorkflowCoreExports & ...` |
| `server/modules/routes/core/tasks/execution-run.ts` | ~3 | `agent as unknown as AgentRow` |
| `server/modules/figma/context-fetcher.ts` | ~2 | `.get(taskId) as unknown as FigmaTaskRow` |
| `server/modules/routes/core/webhooks.ts` | ~2 | `.all() as unknown as WebhookRow[]` |
| `server/modules/routes/collab/task-delegation.ts` | ~1 | Complex property access |
| Test files | ~20+ | Mock objects (acceptable with comment) |

**Fix strategy:**
- For SQLite queries: Add generic DB wrapper or define row types
- For `agent as unknown as AgentRow`: Fix the variable's original type
- For workflow exports: Define proper export interface
- For test mocks: Leave as-is with `// test mock — third-party boundary` comment

---

### Phase 4: Frontend (26 occurrences)

Small scope — fix alongside other frontend work.

| File | Count | Fix |
|------|-------|-----|
| `useRealtimeSync.ts` | 3 | Define WebSocket message payload types |
| `AgentManager.tsx` | 2 | Type JSON parse results |
| Various components | 1 each | Inline type definitions |

---

## 3. Rules for AI Agents

1. **Read the file BEFORE editing** — understand the context
2. **One file per commit** (or closely related group)
3. **Run `npx tsc -b --noEmit` after EVERY change** — zero errors required
4. **NEVER use `@ts-expect-error` or `@ts-ignore`** — fix the root type
5. **NEVER use `as any` to fix another `any`** — define the real type
6. **Define interfaces at file top** or import from `server/types/` or `src/types/`
7. **Third-party boundary exception**: Express `req`/`res`, external API responses, or untyped library callbacks may keep `any` with a `// third-party boundary` comment
8. **Test files**: `as any` for mocks is acceptable with `// test mock` comment
9. **Verify callers**: When changing a function signature, check ALL files that call it
10. **Commit message format**: `fix(types): <file> — remove N any types`

---

## 4. Verification

After each phase:

```bash
# TypeScript check — must be zero errors
npx tsc -b --noEmit

# Count remaining any
grep -rn '\bany\b' server/modules/ --include="*.ts" --exclude="*.test.*" | grep -v "// third-party\|// test mock\|node_modules" | wc -l

# Count as any
grep -rn 'as any' server/modules/ --include="*.ts" --exclude="*.test.*" | wc -l

# Count as unknown as
grep -rn 'as unknown as' server/modules/ --include="*.ts" --exclude="*.test.*" | wc -l
```

---

## 5. Expected Outcome

| Phase | Files | any Removed | Effort |
|-------|-------|-------------|--------|
| Phase 1 (quick wins) | 13 files | ~80 | 1-2 sessions |
| Phase 2 (runtime-context) | 2 files | ~260 | 3-5 sessions |
| Phase 3 (double-casts) | 6 files | ~27 | 1 session |
| Phase 4 (frontend) | 21 files | ~26 | 1 session |
| **Total** | **42 files** | **~393** | **6-9 sessions** |

Remaining after all phases: ~196 (test files + legitimate third-party boundaries)
