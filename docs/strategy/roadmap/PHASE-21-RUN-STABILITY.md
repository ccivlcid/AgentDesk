# Phase 21: PM 에이전트 오케스트레이션 — 구현 스펙

> **목표**: 시스템 코드(타이머/if문/정규식)가 하던 29개 오케스트레이션 결정을 PM 에이전트의 LLM 판단으로 전환
>
> **핵심 원칙**: PM 에이전트 = 진짜 오케스트레이터. 시스템 코드는 인프라(이벤트 전달, DB, 프로세스)만 제공.
>
> **현재 문제**: PM은 이름뿐. 실제 결정은 setInterval + if문 + YOLO 정규식이 수행.

---

## 전체 오케스트레이션 결정 포인트 — 29개

아래는 현재 **시스템 코드가 자동으로 결정**하고 있는 모든 지점입니다.
PM 에이전트 전환 대상 여부를 3등급으로 분류합니다:

- **A등급**: PM LLM이 반드시 판단해야 함 (품질/전략 결정)
- **B등급**: PM 이벤트로 즉시 처리 (단순 라우팅, LLM 불필요)
- **C등급**: 시스템 유지 (인프라/보안, PM 관여 불필요)

### A등급 — PM LLM 판단 필요 (11개)

| # | 파일:라인 | 현재 결정 | PM이 할 일 |
|---|----------|----------|-----------|
| 1 | `state-updates.ts:77` | 성공 시 자동 `review` 전환 | PM이 결과를 읽고 승인 or 수정 지시 |
| 2 | `state-updates.ts:117` | 실패 시 자동 `inbox` 전환 | PM이 원인 분석 → retry/reassign/escalate |
| 3 | `finish-review.ts:268` | 자동으로 리뷰 회의 시작 | PM이 회의 필요 여부 판단, 회의 진행 |
| 4 | `review-consensus.ts:58+` | 시스템이 facilitator 선택 | PM이 직접 회의 주재 |
| 5 | `yolo-mode.ts:80-128` | 정규식으로 옵션 자동 선택 | PM LLM이 상황 판단 후 결정 |
| 6 | `planned-approval.ts:333` | 자동 승인 | PM이 계획 검토 후 승인 |
| 7 | `finalize-approved-review.ts:175-186` | 자동 `done` 전환 | PM이 최종 확인 후 완료 처리 |
| 8 | `subtask-delegation.ts:383` | 자동 서브태스크 배정 | PM이 적합 에이전트 판단 |
| 9 | `kickoff.ts:62-102` | 고정 스크립트 회의 진행 | PM이 LLM으로 자연스러운 회의 진행 |
| 10 | `run-complete-handler/core.ts:369` | 조건부 자동 취소 | PM이 취소 필요성 판단 |
| 11 | `progress-notify-tools.ts:9-38` | 5분 타이머로 진행 보고 | PM이 적절한 시점에 보고 |

### B등급 — PM 이벤트 기반 즉시 처리 (10개)

| # | 파일:라인 | 현재 결정 | 변경 |
|---|----------|----------|------|
| 12 | `execution-start-task.ts:177` | 큐에서 자동 시작 | 이벤트 → PM이 즉시 시작 지시 |
| 13 | `kickoff.ts:344-345` | 15초 타이머로 planned 시작 | 이벤트 → PM이 즉시 시작 |
| 14 | `task-scheduler.ts:351` | auto_run 플래그로 자동 실행 | 이벤트 → PM이 스케줄 실행 확인 |
| 15 | `finish-review.ts:50-95` | 프로젝트 리뷰 게이트 체크 | 이벤트 → PM이 게이트 상태 확인 |
| 16 | `subtask-delegation.ts:556` | 성공 시 자동 done | 이벤트 → PM이 즉시 확인 |
| 17 | `subtask-delegation.ts:561` | 실패 시 자동 blocked | 이벤트 → PM이 즉시 처리 |
| 18 | `subtask-delegation-batch.ts:562` | 위임 성공 시 자동 done | 이벤트 → PM이 즉시 확인 |
| 19 | `decision-inbox-routes.ts:143` | 보충 라운드 자동 전환 | 이벤트 → PM 결정 |
| 20 | `kickoff.ts:56-57` | facilitator 선택 | PM = facilitator (고정) |
| 21 | `run-complete-handler/core.ts:416` | 보고서 후 자동 requeue | 이벤트 → PM 결정 |

### C등급 — 시스템 유지 (8개)

| # | 파일:라인 | 현재 결정 | 사유 |
|---|----------|----------|------|
| 22 | `execution-start-task.ts:239` | worktree 실패 시 pending | 인프라 오류 — PM 관여 불필요 |
| 23 | `run-complete-handler/core.ts:242` | 고아 서브태스크 정리 | DB 일관성 — 자동 처리 |
| 24 | `subtask-delegation-batch.ts:210` | 부서 없으면 blocked | 인프라 제약 |
| 25 | `subtask-delegation-batch.ts:427` | 위임 실패 시 blocked | 인프라 — PM에게 이벤트만 |
| 26 | `subtask-delegation-batch.ts:433` | 위임 실패 시 inbox | 인프라 |
| 27 | `task-scheduler.ts:242-358` | 스케줄 태스크 생성 | cron 기반 — 시간 트리거 유지 |
| 28 | `yolo-mode.ts:43-48` | YOLO 모드 on/off | 설정 값 — PM 오케스트레이터가 대체 |
| 29 | `yolo-mode.ts:130-182` | YOLO 루프 | PM 오케스트레이터로 완전 대체 |

---

## 구현 계획

### Step 1: 이벤트 버스 + PM 오케스트레이터 기반 구축

**새 파일 2개 생성:**

#### `server/lib/event-bus.ts`

```typescript
import { EventEmitter } from "node:events";

export interface TaskStatusEvent {
  type: "task_status_changed";
  taskId: string;
  projectId: string | null;
  fromStatus: string;
  toStatus: string;
  agentId: string | null;
  exitCode?: number;
  result?: string | null;
}

class AgentDeskEventBus extends EventEmitter {
  emitTaskStatus(event: TaskStatusEvent): void {
    this.emit("task_status_changed", event);
  }
}

export const eventBus = new AgentDeskEventBus();
eventBus.setMaxListeners(50);
```

#### `server/modules/workflow/orchestration/pm-orchestrator.ts`

PM 오케스트레이터의 핵심 로직. 이벤트를 수신하고 PM LLM을 호출하여 판단.

```typescript
export function startPmOrchestrator(deps: PmOrchestratorDeps) {
  // A등급: PM LLM 판단이 필요한 11개 결정 포인트
  eventBus.on("task_status_changed", async (event) => {
    const pm = findProjectPm(event.projectId);
    if (!pm) return; // PM 없으면 기존 로직 fallback

    switch (event.toStatus) {
      case "review":   return pmReviewTask(pm, event);    // #1
      case "failed":   return pmHandleFailure(pm, event); // #2
      case "done":     return pmStartNextTask(pm, event); // B등급 #12,13
    }
  });
}
```

**PM이 호출하는 5가지 핵심 함수:**

| 함수 | 역할 | 트리거 |
|------|------|--------|
| `pmReviewTask()` | 완료된 태스크 결과 검토 → 승인/수정 | `toStatus === "review"` |
| `pmHandleFailure()` | 실패 원인 분석 → 재시도/재배정/에스컬레이션 | `toStatus === "failed"` |
| `pmStartNextTask()` | 다음 planned 태스크 시작 | `toStatus === "done"` |
| `pmFacilitateMeeting()` | 리뷰 회의 주재 | `finishReview` 호출 시 |
| `pmDecideInbox()` | 의사결정 항목 판단 | decision item 생성 시 |

---

### Step 2: 이벤트 발행 포인트 추가

기존 status 변경 코드에 이벤트 발행을 추가. **기존 로직은 유지**하되, PM 오케스트레이터가 이벤트를 듣고 추가 판단.

| 파일 | 위치 | 이벤트 |
|------|------|--------|
| `state-updates.ts` | `applySuccessStateUpdate` 끝 | `in_progress → review` |
| `state-updates.ts` | `applyFailureStateUpdate` 끝 | `in_progress → failed` |
| `finalize-approved-review.ts` | done 마킹 후 | `review → done` |
| `tasks/crud.ts` | PATCH handler | 수동 status 변경 |
| `cli-runtime.ts` | `child.on("close")` | `process_exit` |

---

### Step 3: PM 프롬프트 파일

#### `prompts/pm/review-task.md`

```markdown
You are the Project Manager. An agent completed a task. Review the output.

Task: {{taskTitle}}
Description: {{taskDescription}}
Agent Output (tail):
{{taskResult}}

Decide:
- APPROVE: output meets requirements → respond "APPROVE: <brief reason>"
- REVISE: needs changes → respond "REVISE: <specific feedback for the agent>"

Respond in {{lang}}. Be concise (2-4 sentences).
```

#### `prompts/pm/handle-failure.md`

```markdown
You are the Project Manager. A task failed.

Task: {{taskTitle}}
Error: {{errorSummary}}
Retry: {{retryCount}}/{{maxRetries}}

Decide:
- RETRY: transient error → respond "RETRY: <reason>"
- REASSIGN: wrong agent for this task → respond "REASSIGN: <reason>"
- ESCALATE: needs human help → respond "ESCALATE: <what user should do>"

Be concise (1-2 sentences).
```

#### `prompts/pm/decide-inbox.md`

```markdown
You are the Project Manager. A decision is pending.

Decision Type: {{kind}}
Summary: {{summary}}
Options:
{{options}}

Choose the best option number and explain briefly.
Respond: "OPTION <number>: <reason>"
```

#### `prompts/pm/start-next.md`

```markdown
You are the Project Manager. A task just completed.

Completed: {{completedTitle}}
Project: {{projectName}}
Remaining planned tasks:
{{plannedTasks}}

Idle agents:
{{idleAgents}}

Which task(s) should start next? Respond with task IDs to start, one per line.
If all tasks are done, respond "PROJECT_COMPLETE".
```

---

### Step 4: 기존 폴링/YOLO 제거

#### 제거 대상

| 코드 | 파일:라인 | 대체 |
|------|----------|------|
| `setInterval(_pmSweepFn, 15000)` | `kickoff.ts:405` | `eventBus.on("task_status_changed")` |
| `setInterval(runYoloAutopilot, 2500)` | `decision-inbox-routes.ts:405` | `pmDecideInbox()` |
| `buildYoloDecisionReplyPayload()` | `yolo-mode.ts:80-128` | PM LLM 판단 |
| `runYoloDecisionAutopilot()` | `yolo-mode.ts:130-182` | PM 오케스트레이터 |
| `startPmOversightSweep()` | `kickoff.ts:243-406` | PM 이벤트 리스너 |
| `setTimeout(startTaskExec, 2000)` | `finalize-approved-review.ts:340` | `pmStartNextTask()` |

#### 유지 대상 (시스템 인프라)

| 코드 | 파일 | 사유 |
|------|------|------|
| WS 배치 flush (150-250ms) | `hub.ts` | 네트워크 최적화 |
| Cron scheduler (60s) | `task-scheduler.ts` | 시간 기반 트리거 |
| Heartbeat (60s) | `heartbeat.ts` | 외부 프로세스 감시 |
| Agent anomaly (60s) | `agent-anomaly-monitor.ts` | 좀비 감지 |
| OAuth refresh (5min) | `lifecycle.ts` | 외부 서비스 |
| Stalled task recovery (30s) | `lifecycle.ts` | 인프라 안전망 |

---

### Step 5: DB 마이그레이션

```sql
-- 2026-03-27-001-task-retry-support
ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 2;
ALTER TABLE tasks ADD COLUMN last_error_summary TEXT;

-- 2026-03-27-002-pm-oversight-persistence
CREATE TABLE IF NOT EXISTS pm_oversight_state (
  project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  pm_agent_id TEXT,
  started_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()*1000)
);
```

---

### Step 6: 수정 대상 파일 목록 (정확한 변경 범위)

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| **신규** `server/lib/event-bus.ts` | 생성 | 이벤트 버스 |
| **신규** `server/modules/workflow/orchestration/pm-orchestrator.ts` | 생성 | PM 오케스트레이션 엔진 |
| **신규** `prompts/pm/review-task.md` | 생성 | PM 리뷰 프롬프트 |
| **신규** `prompts/pm/handle-failure.md` | 생성 | PM 실패 처리 프롬프트 |
| **신규** `prompts/pm/decide-inbox.md` | 생성 | PM 의사결정 프롬프트 |
| **신규** `prompts/pm/start-next.md` | 생성 | PM 다음 태스크 프롬프트 |
| `server/modules/workflow/orchestration.ts` | 수정 | PM 오케스트레이터 초기화 + deps 전달 |
| `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` | 수정 | 이벤트 발행 추가 |
| `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts` | 수정 | 이벤트 발행 + 기존 자동 체이닝 제거 |
| `server/modules/workflow/orchestration/review-finalize-tools/finish-review.ts` | 수정 | PM 회의 주재로 전환 |
| `server/modules/workflow/orchestration/meetings/review-consensus.ts` | 수정 | PM = facilitator 고정 |
| `server/modules/routes/core/projects/kickoff.ts` | 수정 | PM oversight sweep 제거 → 이벤트 기반 |
| `server/modules/routes/ops/messages/decision-inbox-routes.ts` | 수정 | YOLO timer 제거 → PM 판단 |
| `server/modules/routes/ops/messages/decision-inbox/yolo-mode.ts` | 수정 | YOLO 정규식 → PM LLM 호출 |
| `server/modules/routes/core/tasks/crud.ts` | 수정 | 이벤트 발행 추가 |
| `server/modules/workflow/agents/cli-runtime.ts` | 수정 | activeProcesses 누수 + 이벤트 발행 |
| `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` | 수정 | 마이그레이션 2개 추가 |

**총 17개 파일** (신규 6개 + 수정 11개)

---

## 구현 순서

```
Phase 21-A: 기반 (1일)
  1. event-bus.ts 생성
  2. PM 프롬프트 4개 파일 생성
  3. pm-orchestrator.ts 골격 생성
  4. orchestration.ts에서 PM 오케스트레이터 초기화
  5. DB 마이그레이션 2개 추가

Phase 21-B: PM 판단 연결 (1일)
  6. state-updates.ts에 이벤트 발행 추가
  7. finalize-approved-review.ts에 이벤트 발행 추가
  8. tasks/crud.ts에 이벤트 발행 추가
  9. cli-runtime.ts 메모리 누수 + 이벤트 발행
  10. pm-orchestrator.ts에 pmReviewTask, pmHandleFailure, pmStartNextTask 구현

Phase 21-C: 기존 폴링 제거 (1일)
  11. kickoff.ts — PM oversight sweep 제거
  12. decision-inbox-routes.ts — YOLO timer 제거
  13. yolo-mode.ts — 정규식 → PM LLM 호출 전환
  14. finish-review.ts — PM 회의 주재 연결
  15. review-consensus.ts — PM = facilitator 고정
  16. finalize-approved-review.ts — 자동 체이닝 제거 (PM이 대체)
  17. Graceful shutdown 추가
```

---

## 검증 기준

### A등급 (PM LLM 판단)
- [ ] 태스크 완료 → PM LLM이 결과 읽고 "APPROVE" 또는 "REVISE: ..." 응답
- [ ] 태스크 실패 → PM LLM이 "RETRY" / "REASSIGN" / "ESCALATE" 판단
- [ ] 의사결정 → PM LLM이 옵션 선택 (정규식 아닌 AI 판단)
- [ ] 리뷰 회의 → PM이 facilitator로 주재

### B등급 (이벤트 기반)
- [ ] 태스크 done → PM이 즉시 다음 태스크 시작 (15초 대기 없음)
- [ ] 이벤트 발행 → PM 오케스트레이터 즉시 반응

### 제거 확인
- [ ] `setInterval(_pmSweepFn, 15000)` 제거됨
- [ ] `setInterval(runYoloAutopilot, 2500)` 제거됨
- [ ] `buildYoloDecisionReplyPayload()` 정규식 사용 안 함
- [ ] PM Activity에 PM LLM 판단 로그 기록됨

### 안정성
- [ ] PM LLM 호출 실패 시 기존 로직 fallback
- [ ] 서버 재시작 → pm_oversight_state에서 복원 → PM 즉시 활동
- [ ] Ctrl+C → 활성 프로세스 종료 + in_progress → planned
