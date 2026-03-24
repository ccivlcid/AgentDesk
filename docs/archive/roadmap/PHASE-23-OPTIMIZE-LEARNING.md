# Phase 23: Optimize Learning Loop — Implementation Spec

> **Goal**: Build a feedback loop that automatically learns patterns from completed tasks and applies them to future projects
>
> **Core Principle**: Learning is also event-driven and automatic. Task completion events trigger learning.
>
> **Estimated Effort**: Large (12~18 files modified/created)
>
> **Prerequisites**: Phase 21 (Run Stability), Phase 22 (Debug Experience) completed
>
> **Event Integration**: Uses Phase 21's EventBus
> - `task_status_changed` (toStatus: "done") → automatically triggers `runAutoLearning()`
> - All tasks in project done → automatically triggers `generateProjectRetrospective()`

---

## 23-1. Automatic Learning After Task Completion

### Purpose
When a task reaches done status, LLM analyzes the result and automatically generates Rules/Memory.

### Server Changes

**New file**: `server/modules/workflow/orchestration/run-complete-handler/auto-learning.ts`

```typescript
export async function runAutoLearning(deps: {
  taskId: string;
  taskTitle: string;
  projectId: string | null;
  agentId: string | null;
  logsDir: string;
  db: DatabaseSync;
  findApiProvider: Function;
  callProvider: Function;
  resolveModel: Function;
  appendTaskLog: Function;
}): Promise<void> {
  // 1. Read task log + prompt
  // 2. Request LLM to analyze "lessons learned from this task"
  // 3. Automatically save results to rules/memory

  const systemPrompt = loadPrompt("system/auto-learning");
  // ... LLM call ...
  // Response: { rules: [...], memories: [...] }
  // rules → rule_entries table (scope: project)
  // memories → skill_learning_history table
}
```

**New prompt file**: `prompts/system/auto-learning.md`

```markdown
You are a learning extraction agent. Given a completed task's prompt and output log,
extract reusable knowledge.

Respond with JSON:
{
  "rules": [
    { "title": "brief rule name", "content": "rule description", "category": "coding|testing|architecture|workflow" }
  ],
  "memories": [
    { "title": "brief memory name", "content": "what was learned", "category": "pattern|pitfall|preference" }
  ]
}

Rules:
- Only extract knowledge that would be useful for FUTURE similar tasks
- Do NOT extract task-specific details (file names, variable names)
- Focus on patterns: "In this project, React components always use Tailwind CSS"
- Focus on pitfalls: "Must use pnpm add -D instead of npm install --save-dev"
- Max 3 rules, max 3 memories per task
- If nothing useful, return empty arrays
```

### Call Site

**File**: `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts`

```typescript
// After marking task as done:
void runAutoLearning({ taskId, taskTitle, projectId, agentId, ... });
```

### Frontend Changes

**File**: `src/components/TaskReportPopup.tsx`

Add "Auto-Learning Results" section to report:
- List of extracted Rules
- List of extracted Memories
- "Delete" button (to remove incorrectly extracted items)

---

## 23-2. Agent-Task Fitness Tracking

### Purpose
Track which agents have higher success rates on which types of tasks.

### DB Changes

```sql
-- migration: 2026-03-29-001-agent-task-fitness
CREATE TABLE IF NOT EXISTS agent_task_fitness (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,          -- 'frontend', 'backend', 'testing', 'devops', etc.
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_agent_fitness ON agent_task_fitness(agent_id, task_type);
```

### Server Changes

Update fitness table on task completion/failure:

```typescript
// finalize-approved-review.ts or state-updates.ts:
function updateAgentFitness(agentId: string, taskType: string, success: boolean, durationMs: number) {
  const existing = db.prepare(
    "SELECT * FROM agent_task_fitness WHERE agent_id = ? AND task_type = ?"
  ).get(agentId, taskType);

  if (existing) {
    const field = success ? "success_count" : "failure_count";
    const newAvg = Math.round((existing.avg_duration_ms * (existing.success_count + existing.failure_count) + durationMs) /
      (existing.success_count + existing.failure_count + 1));
    db.prepare(
      `UPDATE agent_task_fitness SET ${field} = ${field} + 1, avg_duration_ms = ?, last_updated = ? WHERE id = ?`
    ).run(newAvg, Date.now(), existing.id);
  } else {
    db.prepare(
      "INSERT INTO agent_task_fitness (agent_id, task_type, success_count, failure_count, avg_duration_ms) VALUES (?, ?, ?, ?, ?)"
    ).run(agentId, taskType, success ? 1 : 0, success ? 0 : 1, durationMs);
  }
}
```

### Using Fitness Data During Kickoff Task Assignment

**File**: `prompts/system/project-kickoff.md`

Add per-agent fitness information to the prompt:
```
Available agents (with fitness scores):
- Alice [PM] — frontend: 95% (12/12), backend: 80% (8/10)
- Bob [Dev] — backend: 100% (5/5), testing: 60% (3/5)
```

---

## 23-3. Prompt Version Management

### Purpose
Track prompt change history. Compare which prompt versions have higher success rates.

### DB Changes

```sql
-- migration: 2026-03-29-002-prompt-versions
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  prompt_name TEXT NOT NULL,         -- 'system/project-kickoff'
  version INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT NOT NULL,        -- MD5 of prompt content
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()*1000),
  UNIQUE(prompt_name, content_hash)
);
```

### Server Changes

**File**: `server/lib/prompt-loader.ts`

Automatically record version when loading prompt:

```typescript
export function loadPromptWithVersion(name: string, vars?: Record<string, string>): { content: string; versionId: string } {
  const content = loadPrompt(name, vars);
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 16);
  // Record version in DB (create if not exists)
  // Return: content + versionId
}
```

Update success/failure count for the corresponding prompt version on task completion/failure.

### Frontend Changes

Settings → "Prompt Performance" tab:
- Display success rate per prompt
- Version history (when changes occurred)
- Warning for prompts with declining success rate

---

## 23-4. Project Retrospective Report on Completion

### Purpose
Automatically generate a retrospective report when all tasks in a project are completed.

### Server Changes

When project completion is detected during PM Oversight sweep:

```typescript
// kickoff.ts - When project completes (planned=0, in_progress=0):
void generateProjectRetrospective(projectId);
```

**New function**: `generateProjectRetrospective()`

```typescript
async function generateProjectRetrospective(projectId: string) {
  // 1. Collect project info + all task summaries
  // 2. Request retrospective analysis from LLM
  // 3. Save results to project

  const systemPrompt = loadPrompt("system/project-retrospective");
  // Response: { summary, what_went_well, what_to_improve, recommendations }
  // Save to DB → display in project folder window
}
```

**New prompt file**: `prompts/system/project-retrospective.md`

---

## Implementation Order

```
23-1 Auto-learning             (1.5 hours, LLM + DB + UI)
23-2 Fitness tracking          (1 hour, DB + kickoff integration)
23-4 Retrospective report      (1 hour, LLM + project view)
23-3 Prompt version management (2 hours, high complexity)
```

### Verification Criteria

- [ ] Task completion → automatically generates 1~3 Rules → viewable in Library
- [ ] 10 tasks completed → agent fitness table generated per agent
- [ ] During kickoff, agent recommendation based on fitness scores
- [ ] All project tasks complete → retrospective report auto-generated
- [ ] Prompt file modified → new version auto-recorded → success rate comparison available
