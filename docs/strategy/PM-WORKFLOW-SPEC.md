# PM 워크플로우 — 현재 구현 명세

> Last updated: 2026-03-23
> Status: **구현 완료**

---

## 전체 흐름

```
[1] 킥오프 (POST /api/projects/:id/kickoff)
     │
     ▼
[2] 킥오프 회의 (runKickoffMeeting)                    ← stage: "meeting"
     │  PM이 프로젝트 목표 공유
     │  각 에이전트가 역량 보고
     │  PM이 태스크 생성·배정 예고
     │  회의록 → meeting_minutes (project_id 포함)
     │
     ▼
[3] 태스크 생성 (LLM 호출)                              ← stage: "planning"
     │  callProvider() 또는 callViaCliProvider()
     │  JSON 파싱 → tasks INSERT (assigned_agent_id = NULL)
     │  프롬프트: prompts/system/project-kickoff.md
     │
     ▼
[4] PM 에이전트 배정                                    ← stage: "assigning"
     │  비-PM 에이전트 라운드 로빈 배정
     │  appendTaskLog("pm_oversight", "PM assigned → {agent}")
     │
     ▼
[5] 업무 실행                                           ← stage: "executing"
     │  startTaskExecutionForAgent() 또는 startExecutionLoop()
     │  에이전트별 첫 번째 planned 태스크만 시작
     │
     ▼
[6] 태스크 완료 → review 상태
     │  execution-loop.ts → status = 'review'
     │  eventBus.emitTaskStatus({ toStatus: "review" })
     │
     ▼
[7] PM 오케스트레이터 검토 (pm-orchestrator.ts)
     │  YOLO 모드 → 즉시 자동 승인
     │  일반 모드 → PM LLM 호출 (4점 체크리스트)
     │    - Scope Match / Errors / Minimal Scope / Completeness
     │    - APPROVE → finishReview() → merge → done
     │    - REVISE → planned으로 재배정 → 재실행
     │  3-strike 룰: 동일 태스크 3회 실패 → 에스컬레이션
     │
     ▼
[8] Ship 자동화 (finishReview 완료 후)
     │  버전 범프 (patch): 0.1.2 → 0.1.3
     │  CHANGELOG 엔트리 생성
     │  파일 동기화: VERSION, package.json, CHANGELOG.md
     │
     ▼
[9] 다음 태스크 시작
     │  PM 오케스트레이터가 다음 planned 태스크 자동 시작
     │  전체 과정이 PM Activity 패널에 실시간 표시
```

---

## 추가 업무 흐름 (POST /api/projects/:id/add-tasks)

```
[1] 추가 업무 요청
     │  additional_directive + attached_file (optional .md → docs/ 저장)
     │
     ▼
[2] 추가 업무 회의 (runAddTasksMeeting)              ← stage: "meeting"
     │  PM이 추가 지시 공유 (짧은 회의)
     │  에이전트 확인
     │
     ▼
[3] 태스크 생성 (LLM)                                ← stage: "planning"
     │  기존 done 태스크를 컨텍스트로 포함 (중복 방지)
     │
     ▼
[4] PM 배정 → 실행                                   ← stage: "assigning" → "executing" → "done"
```

**UI:** 업무보드에서 전부 done 시 "추가 업무" 버튼 (인라인 입력 + .md 첨부 가능)

---

## 자율 모드 (YOLO)

- PM 오케스트레이터가 모든 의사결정 자동 처리
- Decision Inbox: 빈 배열 반환, "자율 모드" 메시지 표시
- PM Activity: 승인/수정 버튼 숨김
- 유저는 승인/보류/취소 불가 — PM이 전권

---

## 핵심 파일

| 파일 | 역할 |
|------|------|
| `server/modules/routes/core/projects/kickoff.ts` | 킥오프 파이프라인 전체 |
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | PM 검토/배정/에스컬레이션 |
| `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts` | 승인 → merge → done |
| `server/modules/workflow/orchestration/review-finalize-tools/ship-automation.ts` | 버전 범프 + CHANGELOG |
| `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts` | 에러 패턴 매칭 + 새니타이즈 |
| `server/modules/agent-runtime/execution-loop.ts` | CLI/API 모드 에이전트 실행 |
| `server/modules/routes/core/projects/pm-activity.ts` | PM Activity API |
| `prompts/system/project-kickoff.md` | 킥오프 LLM 프롬프트 (agent_name 없음) |
| `prompts/pm/review-task.md` | PM 리뷰 체크리스트 프롬프트 |

---

## PM Activity 패널

**위치**: 오른쪽 슬라이드 패널 (`src/components/desktop/RightShelf.tsx`)

**트리거**: 오른쪽 가장자리 오렌지 빛나는 라인 → 마우스 호버 시 슬라이드-인

**데이터 소스** (`GET /api/projects/:id/pm-activity`):
1. `task_logs` (system + pm_oversight) — 태스크 상태 변경, PM 배정/승인/거절
2. `messages` — PM 보고 메시지
3. `project_review_decision_events` — 검토 결정 이벤트
4. `meeting_minutes` + `meeting_minute_entries` — 킥오프/리뷰 회의록

**필터**: 전체 / 회의록 / 지시 / 상태 / 검토 / 보고

**실시간 갱신**: WebSocket `pm_activity` + `task_update` 이벤트

---

## 킥오프 스테이지 오버레이

**위치**: 화면 정중앙 (`src/components/desktop/Desktop.tsx` — `KickoffStageOverlay`)

**4단계**: 회의 → 태스크 생성 → 에이전트 배정 → 업무 실행

**WebSocket**: `kickoff_stage` 이벤트 (`meeting` → `planning` → `assigning` → `executing` → `done`)

**UI**: Framer Motion 슬라이드-인/아웃, 완료 시 2초 후 자동 숨김

---

## 에러 처리

| 패턴 | 분류 | 대응 |
|------|------|------|
| ECONNREFUSED / ETIMEDOUT | 네트워크 | 재시도 |
| Cannot find module | 의존성 | 설치 안내 |
| ENOENT | 파일 없음 | 경로 확인 |
| SyntaxError / TypeError | 코드 에러 | 재실행 |
| timed out | 타임아웃 | 재시도 (120s) |
| merge conflict | Git 충돌 | 수동 해결 |
| 3회 연속 실패 | 에스컬레이션 | 유저에게 알림, 자동 재시도 중단 |

**에러 새니타이즈**: 홈 디렉토리, API 키, 토큰 자동 마스킹 후 저장.

---

## 규칙

1. 회의가 **반드시 먼저**. 태스크 생성은 회의 완료 콜백 안에서 실행.
2. PM 에이전트에게 태스크 배정 금지. `project_role !== "pm"` 필터.
3. 회의록은 `meeting_minutes`에 `project_id` 포함. `task_id`는 NULL 허용.
4. 킥오프 실패 시에도 태스크 생성 파이프라인 실행 (안전장치).
5. 킥오프 프롬프트에서 `agent_name` 없음 — 배정은 PM이 함.
6. 에이전트 실행 프롬프트에 증거 기반 룰 주입 ("추측 금지", "3회 실패 시 중단").
7. 리뷰는 4점 체크리스트 (scope match, errors, minimal scope, completeness).
8. 태스크 done 시 자동 버전 범프 + CHANGELOG.
