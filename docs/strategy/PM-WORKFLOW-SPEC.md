# PM 워크플로우 전면 재설계 — 구현 계획서

## Context

### 현재 문제
1. **PM이 개별 태스크 검토 불가** — 태스크 완료 후 `review` 상태로 전환되지만, decision inbox 항목은 **모든 태스크가 review**일 때만 생성됨. 개별 태스크 완료 즉시 PM이 검토할 수 없음.
2. **검토 → 병합 → 다음 태스크 시작** 연결 끊김 — PM 승인 후 worktree merge → 다음 planned 태스크 시작까지의 자동화 흐름이 불완전.
3. **PM 활동 비가시** — 클라이언트(사용자)가 PM의 업무 지시, 회의록, 검토 내역을 확인할 UI가 없음.
4. **오른쪽 패널(RightShelf)** — 현재 앱 아이콘 런처(80px)로만 사용. PM 활동 로그 패널로 교체 필요.

### 목표 흐름
```
킥오프 → PM 업무 지시 → 에이전트 headless 실행 →
태스크 완료 → PM 개별 검토 (decision inbox) →
PM 승인 → worktree merge → PM이 다음 planned 시작 →
전체 과정이 PM Activity Log 패널에 실시간 표시
```

---

## Phase 1: PM 개별 태스크 검토 흐름 (Server)

### 1-1. 개별 태스크 review decision item 생성

**파일**: `server/modules/routes/ops/messages/decision-inbox/task-review-items.ts` (신규)

태스크가 `review` 상태로 전환되면 **개별적으로** decision inbox 항목 생성.
기존 `buildProjectReviewDecisionItems()`(모든 태스크 review 시)와 **공존**.

```typescript
export function createTaskReviewDecisionItems(deps: {
  db: DatabaseSync;
  nowMs: () => number;
  getPreferredLanguage: () => string;
  pickL: (...args: any[]) => string;
  l: (...args: any[]) => unknown;
}): {
  buildTaskReviewDecisionItems: () => DecisionInboxRouteItem[];
}
```

**SQL**:
```sql
SELECT t.id, t.title, t.assigned_agent_id, t.project_id,
       a.name AS agent_name, a.name_ko AS agent_name_ko
FROM tasks t
LEFT JOIN agents a ON a.id = t.assigned_agent_id
WHERE t.status = 'review'
  AND t.source_task_id IS NULL
  AND t.project_id IS NOT NULL
ORDER BY t.updated_at ASC
```

**각 항목 옵션**:
1. `approve_task_review:<taskId>` — 승인 + merge
2. `request_revision:<taskId>` — 수정 요청 (note 입력)
3. `keep_waiting` — 보류

### 1-2. Decision inbox에 등록

**파일**: `server/modules/routes/ops/messages/decision-inbox-routes.ts`

`getDecisionInboxItems()` 함수에서 기존 항목 + 새 `buildTaskReviewDecisionItems()` 추가:
```typescript
const items = [
  ...buildTaskReviewDecisionItems(),   // ← 신규: 개별 태스크
  ...buildProjectReviewDecisionItems(), // 기존: 프로젝트 전체
  ...buildReviewRoundDecisionItems(),
  ...buildTimeoutResumeDecisionItems(),
];
```

### 1-3. 개별 태스크 reply 핸들러

**파일**: `server/modules/routes/ops/messages/decision-inbox/task-review-reply.ts` (신규)

```typescript
export function handleTaskReviewDecisionReply(input: TaskReviewReplyInput): boolean
```

- `approve_task_review:<taskId>` → `finishReview(taskId, title)` 호출 → merge → `resolved: true`
- `request_revision:<taskId>` → 태스크를 `in_progress`로 되돌리고 재실행 → `resolved: true`
- `keep_waiting` → `resolved: false` (항목 유지)

### 1-4. 승인 후 즉시 다음 planned 태스크 시작

**파일**: `server/modules/routes/core/projects/kickoff.ts`

`triggerImmediatePmSweep(projectId)` 함수 추가:
```typescript
export function triggerImmediatePmSweep(projectId: string): void
```
finishReview 완료 후 호출 → 15초 대기 없이 즉시 해당 프로젝트의 planned 태스크 시작.

### 1-5. PM 활동 WebSocket 이벤트

**이벤트 타입**: `pm_activity`
**발행 시점**:
- 태스크 → review 전환
- PM 승인/거절
- Worktree merge 완료
- 다음 planned 태스크 시작
- 킥오프 회의 완료

**Payload**: `{ projectId, taskId, action, agentName, summary, timestamp }`

---

## Phase 2: PM Activity Log API (Server)

### 2-1. 엔드포인트

**파일**: `server/modules/routes/core/projects/pm-activity.ts` (신규)

`GET /api/projects/:id/pm-activity?limit=50&since=<timestamp>`

### 2-2. 데이터 소스 (기존 테이블 활용, 신규 테이블 불필요)

| 소스 | 테이블 | 내용 |
|------|--------|------|
| 킥오프 회의 | `meeting_minutes` + `meeting_minute_entries` | 회의 참석자, 발언 내용 |
| PM 업무 지시 | `task_logs` WHERE `kind='pm_oversight'` | 태스크 시작 지시 |
| 태스크 상태 변경 | `task_logs` WHERE `kind='system'` | planned→in_progress→review→done |
| PM 보고 메시지 | `messages` WHERE PM agent가 sender/receiver | 완료 보고, 에러 보고 |
| 검토 결정 | `project_review_decision_events` | 승인/거절 이벤트 |

### 2-3. 응답 형식

```typescript
{
  ok: true,
  items: Array<{
    id: string;
    type: "meeting" | "task_status" | "pm_message" | "decision" | "oversight";
    timestamp: number;
    taskId: string | null;
    taskTitle: string | null;
    agentId: string | null;
    agentName: string | null;
    summary: string;
    detail?: string;
    meetingEntries?: Array<{ speaker: string; content: string }>;
  }>;
  counts: { planned: number; in_progress: number; review: number; done: number; total: number };
  pmAgent: { id: string; name: string; nameKo: string } | null;
}
```

---

## Phase 3: PM Activity Log 패널 (Client)

### 3-1. WindowType 추가

**파일**: `src/app/types.ts`

`WindowType` 유니온에 `"pm-activity"` 추가.

### 3-2. RightShelf → PM Activity Log 패널 변환

**파일**: `src/components/desktop/RightShelf.tsx` (전면 리라이트)

**기존**: 80px 앱 아이콘 런처
**변경**: 340px PM Activity Log 패널 (NotificationCenter 패턴 참고)

#### 레이아웃:
```
┌─────────────────────────────┐
│ PM Activity Log      [━] [×]│  ← 헤더 + 프로젝트 선택
├─────────────────────────────┤
│ 계획 3 │ 진행 1 │ 검토 2 │ 완료 4│  ← 상태 요약 바
├─────────────────────────────┤
│ [전체] [회의] [검토] [지시]   │  ← 필터 칩
├─────────────────────────────┤
│ ▼ 킥오프 회의 02:21          │
│   Leonardo: 구조 설계 담당    │
│   Steve: API 개발 담당        │
│                              │
│ ► PM → Leonardo: 태스크 시작  │
│   FastAPI 구조 생성           │
│                              │
│ ✓ Leonardo 완료 → 검토 대기   │
│   [승인] [수정요청]           │
│                              │
│ ► PM → Steve: 태스크 시작     │
│   PostgreSQL 연결 설정        │
└─────────────────────────────┘
```

#### 동작:
- 프로젝트가 활성화되면 자동 확장
- 항목별로 회의록 접기/펴기
- 검토 대기 항목에 [승인] [수정요청] 버튼 (decision inbox 대체)
- WebSocket `pm_activity` 이벤트로 실시간 갱신

### 3-3. UI Store 상태

**파일**: `src/store/uiStore.ts`

```typescript
pmActivityProjectId: string | null;
pmActivityExpanded: boolean;
setPmActivityProjectId: (id: string | null) => void;
togglePmActivityExpanded: () => void;
```

### 3-4. API 클라이언트

**파일**: `src/api/pm-activity.ts` (신규)

```typescript
export function fetchPmActivity(projectId: string, opts?: {
  limit?: number; since?: number;
}): Promise<PmActivityResponse>
```

### 3-5. WebSocket 연동

**파일**: `src/app/useRealtimeSync.ts`

`pm_activity` 이벤트 구독 → PM Activity 패널 자동 갱신.

### 3-6. Desktop 연동

**파일**: `src/components/desktop/Desktop.tsx`

RightShelf props에 PM activity 데이터 전달. 프로젝트 킥오프 시 자동 활성화.

---

## 구현 순서

```
Phase 1 (서버 — PM 검토 흐름)
  1-1. task-review-items.ts 생성
  1-2. decision-inbox-routes.ts 등록
  1-3. task-review-reply.ts 생성
  1-4. kickoff.ts triggerImmediatePmSweep
  1-5. pm_activity WS 이벤트

Phase 2 (서버 — PM Activity API)
  2-1. pm-activity.ts 엔드포인트
  2-2. projects.ts 라우터 등록

Phase 3 (클라이언트 — PM Activity 패널)
  3-1. types.ts WindowType 추가
  3-2. uiStore.ts 상태 추가
  3-3. pm-activity.ts API 클라이언트
  3-4. RightShelf.tsx 전면 리라이트
  3-5. useRealtimeSync.ts WS 연동
  3-6. Desktop.tsx 연동
```

## 수정 파일 목록

| 파일 | 변경 |
|------|------|
| `server/modules/routes/ops/messages/decision-inbox/task-review-items.ts` | **신규** |
| `server/modules/routes/ops/messages/decision-inbox/task-review-reply.ts` | **신규** |
| `server/modules/routes/core/projects/pm-activity.ts` | **신규** |
| `src/api/pm-activity.ts` | **신규** |
| `server/modules/routes/ops/messages/decision-inbox-routes.ts` | 등록 추가 |
| `server/modules/routes/ops/messages/decision-inbox/types.ts` | 타입 추가 |
| `server/modules/routes/core/projects/kickoff.ts` | triggerImmediatePmSweep |
| `server/modules/routes/core/projects.ts` | pm-activity 라우터 등록 |
| `src/app/types.ts` | WindowType 추가 |
| `src/types/index.ts` | WSEventType 추가 |
| `src/store/uiStore.ts` | PM activity 상태 추가 |
| `src/components/desktop/RightShelf.tsx` | **전면 리라이트** |
| `src/app/useRealtimeSync.ts` | WS 이벤트 핸들러 |
| `src/components/desktop/Desktop.tsx` | 연동 |

## 검증 방법

1. **PM 검토 흐름**: 프로젝트 킥오프 → 태스크 완료 → decision inbox에 개별 항목 등장 → 승인 → merge → 다음 태스크 시작 확인
2. **PM Activity API**: `curl /api/projects/:id/pm-activity` → 회의록 + 지시 + 검토 내역 반환 확인
3. **PM Activity 패널**: 오른쪽 패널에서 실시간 타임라인 확인, [승인] 버튼으로 직접 검토 가능
4. **TypeScript**: `npx tsc -b --noEmit` 에러 없음
5. **로그**: `logs/server.log`에서 PM 활동 이벤트 확인
