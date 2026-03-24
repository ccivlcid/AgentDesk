# Phase 22: Debug Experience — Implementation Spec

> **Goal**: Build a debugging system where AI analyzes "why it failed," prompt history is viewable in the UI, and one-click re-execution is available
>
> **Core Principle**: Debugging is also performed automatically by AI. Instead of users manually exploring log files, AI presents analyzed results.
>
> **Estimated Effort**: Medium (10~15 files modified/created)
>
> **Prerequisites**: Phase 21 (Run Stability) — EventBus required
>
> **Event Integration**: Uses Phase 21's EventBus
> - `task_status_changed` (toStatus: "failed") → automatically triggers `analyzeTaskFailure()`
> - Analysis starts immediately on failure without polling

---

## 22-1. AI Analysis of Task Failure Causes

### Purpose
When a task fails, send CLI output logs to LLM for a one-line failure summary + suggested fix.

### DB Changes

```sql
-- migration: 2026-03-28-001-task-error-analysis
ALTER TABLE tasks ADD COLUMN error_analysis TEXT;
-- JSON: { summary: string, cause: string, suggestion: string, analyzed_at: number }
```

### Server Changes

**New file**: `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts`

```typescript
export async function analyzeTaskFailure(deps: {
  taskId: string;
  taskTitle: string;
  exitCode: number;
  logsDir: string;
  db: DatabaseSync;
  findApiProvider: Function;
  callProvider: Function;
  resolveModel: Function;
  appendTaskLog: Function;
}): Promise<void> {
  const { taskId, taskTitle, exitCode, logsDir, db } = deps;

  // 1. Read log file (last 2000 chars)
  const logFile = path.join(logsDir, `${taskId}.log`);
  let logContent = "";
  try {
    const raw = fs.readFileSync(logFile, "utf8");
    logContent = raw.length > 2000 ? "..." + raw.slice(-2000) : raw;
  } catch { return; }

  // 2. Read prompt file (last 500 chars)
  const promptFile = path.join(logsDir, `${taskId}.prompt.txt`);
  let promptTail = "";
  try {
    const raw = fs.readFileSync(promptFile, "utf8");
    promptTail = raw.length > 500 ? "..." + raw.slice(-500) : raw;
  } catch { /* optional */ }

  // 3. Request analysis from LLM
  const systemPrompt = loadPrompt("system/error-analysis");
  const userContent = [
    `Task: ${taskTitle}`,
    `Exit Code: ${exitCode}`,
    promptTail ? `\n[Task Prompt Tail]\n${promptTail}` : "",
    `\n[CLI Output Log]\n${logContent}`,
  ].filter(Boolean).join("\n");

  const provider = findApiProvider(db, "api");
  if (!provider) return; // Skip if no API key

  try {
    const model = resolveModel(provider);
    const signal = AbortSignal.timeout(15_000);
    const rawText = await callProvider(provider, model, systemPrompt, userContent, signal);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const analysis = JSON.parse(jsonMatch[0]);
    db.prepare("UPDATE tasks SET error_analysis = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify({
        summary: analysis.summary ?? "Unknown error",
        cause: analysis.cause ?? "",
        suggestion: analysis.suggestion ?? "",
        analyzed_at: Date.now(),
      }), Date.now(), taskId);

    appendTaskLog(taskId, "system", `Error analysis: ${analysis.summary}`);
  } catch { /* best effort */ }
}
```

**New prompt file**: `prompts/system/error-analysis.md`

```markdown
You are a task failure analyst. Given a failed CLI agent task, analyze why it failed.

Respond ONLY with a valid JSON object:
{
  "summary": "One-line failure summary (max 100 chars)",
  "cause": "Root cause category: auth_error | timeout | missing_dependency | code_error | prompt_unclear | disk_full | network_error | unknown",
  "suggestion": "One specific action the user can take to fix this (max 200 chars)"
}

Common patterns:
- "command not found" → missing_dependency
- "SIGTERM" or "timed out" → timeout
- "permission denied" or "401" → auth_error
- "ENOSPC" → disk_full
- Vague task description with no output → prompt_unclear
```

### Call Site

**File**: `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts`

```typescript
// Add at the end of applyFailureStateUpdate() (after retry logic):
// Only run analysis on final failure
if (taskRow.retry_count >= taskRow.max_retries) {
  void analyzeTaskFailure({ taskId, taskTitle, exitCode, ... });
}
```

### Frontend Changes

**File**: `src/components/taskboard/task-card/TaskCardHeader.tsx`

Display error_analysis on ERR cards:
```tsx
{task.error_analysis && (
  <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 4 }}>
    {JSON.parse(task.error_analysis).summary}
  </div>
)}
```

**File**: `src/components/taskboard/task-card/index.tsx`

Detailed analysis popup on ERR card click:
- summary (one-line summary)
- cause (cause classification)
- suggestion (suggested fix)
- "Retry" button

---

## 22-2. Prompt History UI

### Purpose
View prompts sent to agents in the UI. No need to manually browse ".prompt.txt" files.

### API Endpoint

**File**: `server/modules/routes/core/tasks/crud.ts`

```typescript
// GET /api/tasks/:id/prompt
app.get("/api/tasks/:id/prompt", (req, res) => {
  const taskId = String(req.params.id);
  const promptFile = path.join(logsDir, `${taskId}.prompt.txt`);
  try {
    const content = fs.readFileSync(promptFile, "utf8");
    res.json({ ok: true, prompt: content });
  } catch {
    res.json({ ok: true, prompt: null });
  }
});
```

### Frontend Changes

**File**: `src/components/terminal-panel/TerminalPanelTabs.tsx`

Add tab: "Prompt" tab — displays the full prompt for the task (code block, copy button)

```tsx
// Add to tab list:
{ id: "prompt", label: t({ ko: "프롬프트", en: "Prompt" }) }

// Content:
{activeTab === "prompt" && (
  <PromptViewer taskId={selectedTaskId} />
)}
```

**New component**: `src/components/terminal-panel/PromptViewer.tsx`

```tsx
export default function PromptViewer({ taskId }: { taskId: string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/tasks/${taskId}/prompt`).then(r => r.json()).then(d => setPrompt(d.prompt));
  }, [taskId]);

  if (!prompt) return <p>No prompt available</p>;
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, padding: 12 }}>
      {prompt}
    </pre>
  );
}
```

---

## 22-3. One-Click Task Retry

### Purpose
Re-execute an ERR-status task with a single click in the UI.

### API Endpoint

**File**: `server/modules/routes/core/tasks/crud.ts`

```typescript
// POST /api/tasks/:id/retry
app.post("/api/tasks/:id/retry", (req, res) => {
  const taskId = String(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "not_found" });
  if (task.status !== "failed" && task.status !== "error") {
    return res.status(400).json({ error: "task_not_failed" });
  }

  // status → planned, reset retry_count
  db.prepare(
    "UPDATE tasks SET status = 'planned', retry_count = 0, error_analysis = NULL, updated_at = ? WHERE id = ?"
  ).run(nowMs(), taskId);

  appendTaskLog(taskId, "system", "Manual retry requested");
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  broadcast("task_update", updated);

  // If YOLO mode, execute immediately
  if (readYoloModeEnabled(db) && task.assigned_agent_id) {
    setTimeout(() => {
      startTaskExecutionForAgent(taskId, task.assigned_agent_id);
    }, 1000);
  }

  res.json({ ok: true, task: updated });
});
```

### Frontend Changes

**File**: `src/components/taskboard/task-card/TaskCardActions.tsx`

Add retry button to ERR cards:
```tsx
{task.status === "failed" && (
  <button onClick={() => retryTask(task.id)}>
    {t({ ko: "재실행", en: "Retry" })}
  </button>
)}
```

**File**: `src/api/tasks.ts`

```typescript
export async function retryTask(taskId: string): Promise<void> {
  await post(`/api/tasks/${taskId}/retry`);
}
```

---

## 22-4. Agent Conflict Detection

### Purpose
Detect and warn when multiple agents are simultaneously modifying the same file.

### Server Changes

**File**: `server/modules/workflow/orchestration/execution-start-task.ts`

Check for already-running tasks in the same project_path when starting a task:

```typescript
// At the beginning of buildExecutionPayload():
const concurrentTasks = db.prepare(
  "SELECT id, title, assigned_agent_id FROM tasks WHERE project_id = ? AND status = 'in_progress' AND id != ?"
).all(projectId, taskId);

if (concurrentTasks.length > 0 && !worktreeIsolated) {
  appendTaskLog(taskId, "system",
    `WARNING: ${concurrentTasks.length} other task(s) running in same project without worktree isolation`
  );
  broadcast("agent_conflict_warning", {
    taskId,
    projectId,
    concurrentTaskIds: concurrentTasks.map(t => t.id),
  });
}
```

### Frontend Changes

Receive WebSocket `agent_conflict_warning` event → display toast warning.

---

## Implementation Order

```
22-3 One-click retry        (30min, API + button)
22-2 Prompt history          (45min, API + viewer component)
22-1 Failure cause AI analysis (1 hour, LLM call + DB + UI)
22-4 Conflict detection      (30min, detection logic + warning)
```

### Verification Criteria

- [ ] Click ERR task → displays "Cause: timeout, Suggestion: Check API key"
- [ ] Prompt tab → full prompt sent to agent is viewable
- [ ] Click "Retry" on ERR card → transitions to planned → auto execution
- [ ] 2 tasks running simultaneously in same project (no worktree) → warning toast
