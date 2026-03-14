# P2 태스크 상세 설계서 (P2-2 ~ P2-8)

> **목적:** AI 에이전트가 코드 탐색 없이 바로 구현에 착수할 수 있도록 각 태스크의 파일 경로, 현재 상태, 구현 단계를 명시한 문서
> **갱신일:** 2026-03-14

---

## P2-2 — 에이전트 실행 비용 추적

### 현재 상태

- `task_execution_events` 테이블 존재하지만 토큰/비용 컬럼 없음
- `notifications` 테이블에 `cost_alert` 타입 이미 있음
- `worktrees-and-usage.ts`에 비용 알림 설정 API (`/api/cost-alerts`) 이미 구현됨
- Claude API 응답에서 토큰 수를 파싱하는 코드 **없음**

### 구현 파일

| 파일 | 작업 |
|---|---|
| `server/modules/bootstrap/schema/versioned-migrations.ts` | 마이그레이션 추가 |
| `server/modules/workflow/agents/providers/api-provider-tools.ts` | 응답 헤더에서 토큰 파싱 |
| `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` | 완료 시 비용 저장 |
| `src/components/agent-detail/AgentDetailTabContent.tsx` | "이번 달 비용" 뱃지 추가 |
| `src/app/AppMainLayout.tsx` | Dashboard 비용 위젯 추가 |
| `src/api/index.ts` | 비용 조회 API 함수 추가 |

### 구현 단계

**Step 1: DB 마이그레이션**
```typescript
// versioned-migrations.ts 끝에 추가
{
  id: "2026-03-14-XXX-task-token-cost",
  up: (db) => {
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_in INTEGER DEFAULT 0"); } catch {}
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN tokens_out INTEGER DEFAULT 0"); } catch {}
    try { db.exec("ALTER TABLE task_execution_events ADD COLUMN cost_usd REAL DEFAULT 0"); } catch {}
  },
},
```

**Step 2: 토큰 파싱 (API 프로바이더)**

Claude API 응답 구조:
```typescript
// api-provider-tools.ts — launchApiProviderAgent 완료 콜백 내
// Anthropic SDK response.usage 구조:
// { input_tokens: number, output_tokens: number }
const inputTokens = response.usage?.input_tokens ?? 0;
const outputTokens = response.usage?.output_tokens ?? 0;
// Claude Sonnet 4.5 기준 요금 (달러): input $3/MTok, output $15/MTok
const costUsd = (inputTokens * 3 + outputTokens * 15) / 1_000_000;
```

**Step 3: 프론트 — 에이전트 상세 뱃지**
```tsx
// AgentDetailTabContent.tsx — 기존 "페르소나" 탭 옆에 추가
// GET /api/agents/:id/cost-summary → { thisMonthUsd: number, totalTokens: number }
```

**Step 4: Dashboard 위젯**
```tsx
// AppMainLayout.tsx dashboard 섹션에 추가
// 전체 에이전트 비용 합산 카드 (이번 달 합계)
```

---

## P2-3 — 동시 실행 제한 (FIFO 대기 큐)

### 현재 상태

- `orchestration.ts`의 `startTaskExecutionForAgent()` 호출 시 동시 실행 제한 **없음**
- `MAX_CONCURRENT_AGENTS` 환경변수 **없음**
- `db/runtime.ts`에 `readNonNegativeIntEnv()` 유틸 이미 있음 — 재사용 가능

### 구현 파일

| 파일 | 작업 |
|---|---|
| `server/modules/workflow/orchestration/agent-queue.ts` | 신규 생성 — FIFO 큐 |
| `server/modules/workflow/orchestration.ts` | 큐 통합 (line ~449, startTaskExecutionForAgent 호출부) |
| `server/db/runtime.ts` | `MAX_CONCURRENT_AGENTS` 상수 추가 |
| `src/components/AppHeaderBar.tsx` 또는 Dashboard | 큐 길이 표시 위젯 |

### 구현 단계

**Step 1: 큐 모듈 생성**
```typescript
// server/modules/workflow/orchestration/agent-queue.ts (신규)
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

**Step 2: orchestration.ts 통합**
```typescript
// server/db/runtime.ts에 추가
export const MAX_CONCURRENT_AGENTS = readNonNegativeIntEnv("MAX_CONCURRENT_AGENTS", 10);

// orchestration.ts — startTaskExecutionForAgent 래핑
const agentQueue = createAgentQueue(MAX_CONCURRENT_AGENTS);
// 태스크 실행 요청 시 enqueue, run-complete 시 onComplete 호출
```

**Step 3: 큐 상태 broadcast**
```typescript
broadcast("queue_status", { running: agentQueue.getRunningCount(), queued: agentQueue.getQueueLength() });
```

**Step 4: 프론트 — 큐 상태 표시**
```tsx
// Dashboard 또는 헤더에 간단한 카운터
// "실행 중: N / 대기: M"
```

---

## P2-4 — spawn 시 DB 쿼리 배치화

### 현재 상태

`execution-start-task.ts`의 `startTaskExecutionForAgent()` 내부에서 개별 조회:

| 위치 | 현재 쿼리 |
|---|---|
| `buildRulesPromptBlock()` | `SELECT ... FROM agent_rules WHERE ...` |
| `buildMemoryPromptBlock()` | `SELECT ... FROM memory_entries WHERE ...` |
| `buildAvailableSkillsPromptBlock()` | `SELECT ... FROM skill_learning_history WHERE ...` |
| `loadPendingInterruptPrompts()` | `SELECT ... FROM task_interrupt_injections WHERE ...` |
| `getRecentConversationContext()` | `SELECT ... FROM messages WHERE ...` |
| `getTaskContinuationContext()` | `SELECT ... FROM task_logs WHERE ...` |

각각 별도 왕복 (총 6회+).

### 구현 파일

| 파일 | 작업 |
|---|---|
| `server/modules/workflow/orchestration/execution-start-task.ts` | `buildExecutionPayload()` 함수 추출 + Promise.all |
| `server/modules/workflow/core/` 관련 헬퍼들 | 각 함수에 배치 입력 옵션 추가 |

### 구현 단계

**Step 1: Promise.all 병렬화** (가장 빠른 접근)
```typescript
// startTaskExecutionForAgent 내부
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

> **주의:** `better-sqlite3` / `node:sqlite`는 동기 API이므로 실제 I/O 병렬화는 아님.
> 목적은 코드 구조 명확화 + 나중에 Worker Thread 전환 시 쉽게 마이그레이션하기 위함.

**Step 2: preheat 캐시 (선택)**
- 프로젝트 선택 시 Rules/Memory/Skills를 미리 조회해 `Map<projectId, payload>` 캐시
- TTL: 5분 (현재 Rules/Memory에 이미 5분 TTL 캐시 있음 — 동일 패턴 적용)

---

## P2-5 — 에이전트 타임라인 뷰

### 현재 상태

- `task_logs` 테이블 존재 (`task_id, level, message, created_at` 컬럼)
- `task_execution_events` 테이블 존재 (`event_type, from_state, to_state, created_at`)
- 에이전트 상세 모달: `src/components/agent-detail/AgentDetailTabContent.tsx`
  - 현재 탭: "페르소나" 하나만 있음
- `AgentDetailTabContent` props: `{ agent, tasks }` (AgentDetail.tsx에서 전달)

### 구현 파일

| 파일 | 작업 |
|---|---|
| `src/components/agent-detail/AgentTimeline.tsx` | 신규 생성 — 타임라인 컴포넌트 |
| `src/components/agent-detail/AgentDetailTabContent.tsx` | "Timeline" 탭 추가 |
| `src/api/index.ts` | `getAgentTimeline(agentId)` API 함수 추가 |
| `server/modules/routes/core/agents/` | GET `/api/agents/:id/timeline` 라우트 추가 |

### API 설계

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

### 타임라인 UI 패턴

```tsx
// AgentTimeline.tsx
// 수직 타임라인 — 시간 내림차순
<div className="flex flex-col">
  {events.map(ev => (
    <div key={ev.id} className="flex gap-3 py-2">
      {/* 시간축 */}
      <div className="w-16 text-[10px] text-[var(--th-text-muted)] font-mono shrink-0">
        {formatTime(ev.created_at)}
      </div>
      {/* 이벤트 dot + 선 */}
      <div className="flex flex-col items-center">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLOR[ev.type] }} />
        <div style={{ flex: 1, width: 1, background: "var(--th-border)" }} />
      </div>
      {/* 이벤트 내용 */}
      <div className="text-[11px] font-mono text-[var(--th-text-secondary)] pb-2">
        {ev.message}
      </div>
    </div>
  ))}
</div>
```

---

## P2-6 — 태스크 핸드오프 (에이전트 → 에이전트)

### 현재 상태

- `tasks` 테이블에 `handoff_to_agent_id`, `handoff_condition` 컬럼 **없음**
- `run-complete-handler/` 디렉토리에 `core.ts`, `state-updates.ts` 등 완료 처리 로직 분리됨
- 태스크 완료 시 `run-complete-handler.ts`의 핸들러가 호출됨

### 구현 파일

| 파일 | 작업 |
|---|---|
| `server/modules/bootstrap/schema/versioned-migrations.ts` | 마이그레이션 추가 |
| `server/modules/workflow/orchestration/run-complete-handler/core.ts` | 핸드오프 조건 평가 + 후속 태스크 생성 |
| `src/components/taskboard/CreateTaskModal.tsx` | "완료 후 핸드오프" 옵션 추가 |
| `src/api/index.ts` | 태스크 생성 API에 handoff 필드 추가 |

### 구현 단계

**Step 1: DB 마이그레이션**
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

**Step 2: 완료 핸들러 통합**
```typescript
// run-complete-handler/core.ts — 태스크 완료 처리 후
const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
if (task.handoff_to_agent_id && shouldHandoff(task.handoff_condition, exitCode)) {
  const newTaskId = createHandoffTask(db, task, task.handoff_to_agent_id);
  broadcast("task_update", db.prepare("SELECT * FROM tasks WHERE id = ?").get(newTaskId));
}
```

**Step 3: 프론트 — CreateTaskModal**
```tsx
// 태스크 생성 폼 하단에 "완료 후 핸드오프" 토글 + 에이전트 선택 드롭다운
// P2-1 Flow Graph에서 핸드오프 엣지 시각화는 P2-1 완료 후 연동
```

---

## P2-7 — 페르소나 시스템 UI 완성

### 현재 상태 (80% 완료)

| 컴포넌트 | 파일 | 상태 |
|---|---|---|
| `PersonaCatalog` | `src/components/persona/PersonaCatalog.tsx` | ✅ 완성 — 카테고리 필터 + 그리드 |
| `PersonaCard` | `src/components/persona/PersonaCard.tsx` | ✅ 완성 — 방식키워드·인물명·태그 표시 |
| `PersonaBadge` | `src/components/persona/PersonaBadge.tsx` | ✅ 있음 |
| 에이전트 상세 인라인 편집 | `agent-detail/AgentDetailTabContent.tsx` | ✅ 페르소나 텍스트 편집 (raw .md) |
| `PersonaDetailPanel` | 없음 | ❌ 미구현 |
| 에이전트 목록 배지 | `AgentManager.tsx` | ❌ 미연동 |

**API:**
- `GET /api/personas` → `{ personas: Persona[] }` (하드코딩된 배열, `personas.ts` 내)
- `GET /api/agents/:id/persona` → `.md` 파일 내용 (텍스트)
- `POST /api/agents/:id/persona` → `.md` 파일 저장

**`Persona` 타입** (`src/types/index.ts`):
```typescript
interface Persona {
  id: string;
  name: string;            // 인물명 (e.g. "아인슈타인")
  category: string;        // "tech" | "biz" | "creative" | ...
  style_keywords: string[];
  best_for: string[];
  accent_color: string;    // hex 색상
}
```

### 미완성 항목 구현 단계

**Step 1: PersonaDetailPanel 컴포넌트** (신규)
```tsx
// src/components/persona/PersonaDetailPanel.tsx
// 페르소나 선택 시 오른쪽 패널에 표시
// - 인물 이름 + 카테고리
// - style_keywords 전체
// - "이 에이전트는 이렇게 생각합니다" 미리보기 텍스트 (persona.description 필드 추가 필요)
// - best_for 태그 전체
```

**Step 2: 에이전트 목록에 페르소나 배지 연동**
```tsx
// AgentManager.tsx — 에이전트 카드에 PersonaBadge 추가
// agent.persona_id 있으면 배지 표시
// PersonaBadge: persona 이름 + accent_color 배경
```

**Step 3: 에이전트 상세 모달 — PersonaCatalog 탭**
```tsx
// AgentDetailTabContent.tsx — 기존 raw 편집 외에 카탈로그 선택 탭 추가
// "카탈로그에서 선택" 탭 → PersonaCatalog 렌더
// 선택 시 agent.persona_id 업데이트 API 호출
```

---

## P2-8 — WebSocket broadcast 최적화

### 현재 상태

`server/ws/hub.ts` 현재 구현:
- `cli_output`: 250ms 배치 ✅ (이미 구현)
- `subtask_update`: 150ms 배치 ✅ (이미 구현)
- 나머지 (`task_update`, `agent_status` 등): 즉시 전송
- 구독 채널 분리: **없음** — 모든 클라이언트에 전체 broadcast
- stdout 청크 분할: **없음**

### 구현 파일

| 파일 | 작업 |
|---|---|
| `server/ws/hub.ts` | 채널 구독 + stdout 청크 분할 추가 |
| `src/hooks/useWebSocket.ts` | 클라이언트 구독 채널 전송 |
| `server/modules/lifecycle.ts` | WS 연결 시 구독 채널 처리 |

### 구현 단계

**Step 1: stdout 청크 분할** (가장 빠른 효과)
```typescript
// hub.ts — cli_output broadcast 전 청크 분할
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

**Step 2: 채널 구독 분리**
```typescript
// 클라이언트가 연결 시 관심 있는 agentId/taskId를 구독
// WS 메시지: { type: "subscribe", channels: ["agent:agent-1", "task:task-2"] }
// hub.ts: wsClient마다 구독 Set 유지 → broadcast 시 구독 여부 확인
```

> **구현 우선순위:** Step 1(청크 분할)이 리스크 없고 즉시 효과적. Step 2는 클라이언트 프로토콜 변경 필요 — 별도 PR 권장.

---

## 참조

- 마이그레이션 패턴: `server/modules/bootstrap/schema/versioned-migrations.ts`
- DB 테이블 전체 목록: `server/modules/bootstrap/schema/base-schema.ts`
- 서버 진입점 맵: `docs/design/AI-GUIDE.md` 섹션 11
- 프론트 진입점 맵: `docs/design/AI-GUIDE.md` 섹션 0
- 코드베이스 현황: `docs/OVERVIEW.md` 섹션 7
