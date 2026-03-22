# Phase 22: Debug 경험 — 구현 스펙

> **목표**: "왜 실패했는가"를 AI가 분석해주고, 프롬프트 히스토리를 UI에서 확인하고, 원클릭 재실행할 수 있는 디버깅 시스템 구축
>
> **핵심 원칙**: 디버깅도 AI가 자동으로 수행. 사용자가 로그 파일을 직접 탐색하는 것이 아니라, AI가 분석 결과를 제시.
>
> **예상 작업량**: 중규모 (파일 10~15개 수정/생성)
>
> **선행 조건**: Phase 21 (Run 안정성) — EventBus 필요
>
> **이벤트 연동**: Phase 21의 EventBus 활용
> - `task_status_changed` (toStatus: "failed") → 자동으로 `analyzeTaskFailure()` 트리거
> - 폴링 없이 실패 즉시 분석 시작

---

## 22-1. 태스크 실패 원인 AI 분석

### 목적
태스크 실패 시 CLI 출력 로그를 LLM에게 보내서 실패 원인을 한 줄 요약 + 해결 방안 제시.

### DB 변경

```sql
-- migration: 2026-03-28-001-task-error-analysis
ALTER TABLE tasks ADD COLUMN error_analysis TEXT;
-- JSON: { summary: string, cause: string, suggestion: string, analyzed_at: number }
```

### 서버 변경

**새 파일**: `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts`

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

  // 1. 로그 파일 읽기 (마지막 2000자)
  const logFile = path.join(logsDir, `${taskId}.log`);
  let logContent = "";
  try {
    const raw = fs.readFileSync(logFile, "utf8");
    logContent = raw.length > 2000 ? "..." + raw.slice(-2000) : raw;
  } catch { return; }

  // 2. 프롬프트 파일 읽기 (마지막 500자)
  const promptFile = path.join(logsDir, `${taskId}.prompt.txt`);
  let promptTail = "";
  try {
    const raw = fs.readFileSync(promptFile, "utf8");
    promptTail = raw.length > 500 ? "..." + raw.slice(-500) : raw;
  } catch { /* optional */ }

  // 3. LLM에게 분석 요청
  const systemPrompt = loadPrompt("system/error-analysis");
  const userContent = [
    `Task: ${taskTitle}`,
    `Exit Code: ${exitCode}`,
    promptTail ? `\n[Task Prompt Tail]\n${promptTail}` : "",
    `\n[CLI Output Log]\n${logContent}`,
  ].filter(Boolean).join("\n");

  const provider = findApiProvider(db, "api");
  if (!provider) return; // API 키 없으면 스킵

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

**새 프롬프트 파일**: `prompts/system/error-analysis.md`

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

### 호출 위치

**파일**: `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts`

```typescript
// applyFailureStateUpdate() 끝에 추가 (retry 로직 이후):
// 최종 실패 시에만 분석 실행
if (taskRow.retry_count >= taskRow.max_retries) {
  void analyzeTaskFailure({ taskId, taskTitle, exitCode, ... });
}
```

### 프론트엔드 변경

**파일**: `src/components/taskboard/task-card/TaskCardHeader.tsx`

ERR 카드에 error_analysis 표시:
```tsx
{task.error_analysis && (
  <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 4 }}>
    {JSON.parse(task.error_analysis).summary}
  </div>
)}
```

**파일**: `src/components/taskboard/task-card/index.tsx`

ERR 카드 클릭 시 상세 분석 팝업:
- summary (한 줄 요약)
- cause (원인 분류)
- suggestion (해결 방안)
- "재실행" 버튼

---

## 22-2. 프롬프트 히스토리 UI

### 목적
에이전트에게 전달된 프롬프트를 UI에서 확인. ".prompt.txt" 파일 직접 탐색 불필요.

### API 엔드포인트

**파일**: `server/modules/routes/core/tasks/crud.ts`

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

### 프론트엔드 변경

**파일**: `src/components/terminal-panel/TerminalPanelTabs.tsx`

탭 추가: "프롬프트" 탭 — 해당 태스크의 프롬프트 전문 표시 (코드 블록, 복사 버튼)

```tsx
// 탭 목록에 추가:
{ id: "prompt", label: t({ ko: "프롬프트", en: "Prompt" }) }

// 내용:
{activeTab === "prompt" && (
  <PromptViewer taskId={selectedTaskId} />
)}
```

**새 컴포넌트**: `src/components/terminal-panel/PromptViewer.tsx`

```tsx
export default function PromptViewer({ taskId }: { taskId: string }) {
  const [prompt, setPrompt] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/tasks/${taskId}/prompt`).then(r => r.json()).then(d => setPrompt(d.prompt));
  }, [taskId]);

  if (!prompt) return <p>프롬프트 없음</p>;
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, padding: 12 }}>
      {prompt}
    </pre>
  );
}
```

---

## 22-3. 원클릭 태스크 재실행

### 목적
ERR 상태 태스크를 UI에서 한 번 클릭으로 재실행.

### API 엔드포인트

**파일**: `server/modules/routes/core/tasks/crud.ts`

```typescript
// POST /api/tasks/:id/retry
app.post("/api/tasks/:id/retry", (req, res) => {
  const taskId = String(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  if (!task) return res.status(404).json({ error: "not_found" });
  if (task.status !== "failed" && task.status !== "error") {
    return res.status(400).json({ error: "task_not_failed" });
  }

  // status → planned, retry_count 리셋
  db.prepare(
    "UPDATE tasks SET status = 'planned', retry_count = 0, error_analysis = NULL, updated_at = ? WHERE id = ?"
  ).run(nowMs(), taskId);

  appendTaskLog(taskId, "system", "Manual retry requested");
  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
  broadcast("task_update", updated);

  // YOLO 모드면 즉시 실행
  if (readYoloModeEnabled(db) && task.assigned_agent_id) {
    setTimeout(() => {
      startTaskExecutionForAgent(taskId, task.assigned_agent_id);
    }, 1000);
  }

  res.json({ ok: true, task: updated });
});
```

### 프론트엔드 변경

**파일**: `src/components/taskboard/task-card/TaskCardActions.tsx`

ERR 카드에 재실행 버튼 추가:
```tsx
{task.status === "failed" && (
  <button onClick={() => retryTask(task.id)}>
    {t({ ko: "재실행", en: "Retry" })}
  </button>
)}
```

**파일**: `src/api/tasks.ts`

```typescript
export async function retryTask(taskId: string): Promise<void> {
  await post(`/api/tasks/${taskId}/retry`);
}
```

---

## 22-4. 에이전트 충돌 감지

### 목적
복수 에이전트가 같은 파일을 동시에 수정하는 상황 감지 + 경고.

### 서버 변경

**파일**: `server/modules/workflow/orchestration/execution-start-task.ts`

태스크 시작 시 동일 project_path에서 이미 실행 중인 태스크 확인:

```typescript
// buildExecutionPayload() 시작 부분:
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

### 프론트엔드 변경

WebSocket `agent_conflict_warning` 이벤트 수신 → 토스트 경고 표시.

---

## 구현 순서

```
22-3 원클릭 재실행     (30분, API + 버튼)
22-2 프롬프트 히스토리  (45분, API + 뷰어 컴포넌트)
22-1 실패 원인 AI 분석 (1시간, LLM 호출 + DB + UI)
22-4 충돌 감지         (30분, 감지 로직 + 경고)
```

### 검증 기준

- [ ] ERR 태스크 클릭 → "원인: timeout, 제안: API 키 확인" 표시
- [ ] 프롬프트 탭 → 에이전트에게 전달된 전체 프롬프트 확인 가능
- [ ] ERR 카드 "재실행" 클릭 → planned 전환 → 자동 실행
- [ ] 같은 프로젝트 2개 태스크 동시 실행 (worktree 없음) → 경고 토스트
