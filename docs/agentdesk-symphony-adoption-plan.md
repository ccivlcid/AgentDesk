# AgentDesk에 Symphony 개념 적용하기

기준 시점: 2026-03-09

이 문서는 [docs/agentdesk-vs-openai-symphony.md](C:\PythonProjects\AgentDesk\docs\agentdesk-vs-openai-symphony.md)의 후속 문서다.  
목적은 Symphony의 강점을 AgentDesk에 실제로 흡수하려면 무엇을, 어떤 순서로, 어느 계층에 넣어야 하는지 상세 설계 수준으로 정리하는 것이다.

참조 근거:

- AgentDesk 로컬
  - [README.md](C:\PythonProjects\AgentDesk\README.md)
  - [package.json](C:\PythonProjects\AgentDesk\package.json)
  - [docs/api.md](C:\PythonProjects\AgentDesk\docs\api.md)
  - [docs/architecture/README.md](C:\PythonProjects\AgentDesk\docs\architecture\README.md)
  - [server/modules/workflow.ts](C:\PythonProjects\AgentDesk\server\modules\workflow.ts)
- OpenAI Symphony 공개 문서
  - https://github.com/openai/symphony/blob/main/README.md
  - https://github.com/openai/symphony/blob/main/SPEC.md
  - https://github.com/openai/symphony/blob/main/elixir/README.md

## 1. 문서 목적

이 문서는 아래 질문에 답하기 위해 작성했다.

1. AgentDesk에 Symphony의 어떤 개념이 실제로 유효한가
2. 그것을 넣으려면 현재 구조 어디를 바꿔야 하는가
3. 무엇을 먼저 해야 실패 비용이 낮은가
4. UI 중심 제품인 AgentDesk의 강점을 해치지 않고 어떻게 도입할 것인가

이 문서는 비교 문서가 아니라 도입 설계 문서다.  
즉 "좋아 보인다" 수준이 아니라 "DB, API, 런타임, UI를 어떻게 바꿀지"까지 포함한다.

## 2. 현재 AgentDesk의 출발점

현재 AgentDesk는 이미 단순한 태스크 보드보다 훨씬 많은 기능을 가지고 있다.

- 조직 모델: 부서, 팀장, 배정, 보고, review round
- 실행 모델: 태스크 실행, 중단, 재개, terminal log, task execution session
- 격리: Git worktree 기반 분리 실행
- 인입: UI/API, 메신저, CEO directive, inbox
- 설정: workflow pack, 프로젝트 경로, provider 설정
- 복구: startup reconciliation
- 가시성: 대시보드, 칸반, 오피스 뷰, settings, decision inbox

즉 AgentDesk는 이미 "오케스트레이터를 품고 있는 제품"이다.  
다만 현재는 제품 UX가 매우 강하고, 실행 코어의 계약과 상태기계가 상대적으로 덜 명시적이다.

## 3. Symphony에서 가져와야 하는 핵심만 요약

Symphony에서 진짜 중요한 것은 다음 5가지다.

1. 저장소가 실행 정책을 소유한다
2. 오케스트레이터가 단일 권위 상태기계를 가진다
3. 실행은 워크스페이스 수명주기와 훅으로 관리된다
4. 인입과 실행 사이에 claim/reconcile 레이어가 있다
5. 자동 polling과 장시간 실행을 전제로 설계된다

반대로 그대로 가져오면 안 되는 것도 있다.

- 최소 UI 지향
- Codex 중심 단일 provider 가정
- 사람 개입이 적은 운영 모델

AgentDesk는 멀티 provider와 사람 개입 UX가 차별점이므로, Symphony의 개념은 코어 엔진에만 흡수해야 한다.

## 4. 도입 원칙

도입은 아래 원칙을 따라야 한다.

### 원칙 1: 제품 표면은 유지한다

오피스 뷰, 대시보드, 칸반, 메신저 연동은 줄이지 않는다.  
Symphony식 도입은 백엔드 오케스트레이터를 강화하는 방향이어야 한다.

### 원칙 2: 현재 개념을 재사용한다

이미 있는 개념:

- `workflow pack`
- `project_path`
- `task execution session`
- `decision inbox`
- `worktree`

새 개념은 이 위에 얹는다. 기존 개념을 폐기하지 않는다.

### 원칙 3: 사람이 보는 상태와 런타임 상태를 분리한다

사용자용 `status`와 시스템용 `execution_state`는 다르다.  
이걸 분리하지 않으면 자동화가 들어갈수록 상태가 흐려진다.

### 원칙 4: 자동화보다 먼저 복구 가능성을 만든다

polling을 넣기 전에 stall 감지, retry, reconciliation을 먼저 정리해야 한다.  
그렇지 않으면 자동화가 장애를 증폭한다.

### 원칙 5: 프로젝트별 계약을 Git 안에 둔다

장기적으로는 프로젝트 루트의 `WORKFLOW.md`가 가장 중요한 실행 계약이 되어야 한다.

## 5. 전체 목표 아키텍처

도입 후의 상위 구조는 아래처럼 보는 것이 적절하다.

1. Intake Layer
2. Contract Layer
3. Orchestrator Layer
4. Workspace Layer
5. Agent Runner Layer
6. Evidence and Review Layer
7. Operator UI Layer

### 5.1 Intake Layer

입력원:

- UI/API 수동 생성
- CEO directive
- 메신저 인입
- Tracker polling

역할:

- 모든 입력을 공통 스키마로 정규화
- idempotency 부여
- project binding 검증
- 초기 claim 후보로 적재

### 5.2 Contract Layer

역할:

- 앱 기본값
- workflow pack
- `WORKFLOW.md`
- 태스크 override

를 병합해 최종 실행 계약을 만든다.

### 5.3 Orchestrator Layer

역할:

- claim
- 상태 전이
- retry/backoff
- heartbeat/stall 감지
- reconciliation

을 단일 권위로 관리한다.

### 5.4 Workspace Layer

역할:

- worktree/direct mode 선택
- workspace 준비
- lifecycle hooks 실행
- merge/cleanup 규칙 수행

### 5.5 Agent Runner Layer

역할:

- provider 선택
- 실행 정책 적용
- timeout/approval/sandbox 강제
- stdout/stderr/heartbeat 수집

### 5.6 Evidence and Review Layer

역할:

- 실행 결과 증빙 묶음 생성
- review round와 연결
- decision inbox로 후속 결정 전달

### 5.7 Operator UI Layer

역할:

- 경영 UI는 유지
- 그 외에 orchestration 전용 관찰 화면 추가

## 6. 최우선 도입 항목

권장 우선순위는 아래와 같다.

1. `execution_state` 도입
2. heartbeat/stall/reconciliation 강화
3. `WORKFLOW.md` 계약 도입
4. workflow pack 병합기
5. workspace lifecycle hooks
6. tracker polling
7. orchestration 전용 운영 화면

이 순서가 좋은 이유:

- 1~2가 없으면 자동화 실패를 회복하지 못한다
- 3~4가 없으면 프로젝트별 정책 차이를 표현하지 못한다
- 5가 없으면 실행 품질이 제각각이다
- 6은 마지막에 붙여야 한다

## 7. 적용안 1: `WORKFLOW.md` 스타일의 저장소-소유 실행 계약

### 7.1 도입 목적

현재 AgentDesk는 앱 설정과 workflow pack이 정책의 중심이다.  
이 구조는 제품 운영에는 강하지만, 프로젝트 저장소 자체가 실행 규칙을 버전 관리하는 모델은 약하다.

필요한 목표는 다음과 같다.

- 프로젝트별 정책을 Git 히스토리로 남기기
- 실행 규칙을 코드리뷰 대상에 포함하기
- 앱 밖에서도 계약을 읽고 이해할 수 있게 하기
- project-specific policy를 UI 설정에서 분리하기

### 7.2 제안 포맷

프로젝트 루트에 `WORKFLOW.md`를 둔다.  
구성은 `YAML front matter + 설명문` 형태가 적절하다.

예시:

```md
---
version: 1
tracker:
  provider: linear
  poll_interval_sec: 60
  project_key: AGD
workspace:
  mode: worktree
  cleanup: on_success
  branch_prefix: agentdesk
agent:
  provider_priority: [codex, claude, gemini]
  fallback_providers: [claude]
  approval_policy: on-request
  sandbox_policy: workspace-write
  max_runtime_minutes: 45
  retry:
    max_attempts: 2
    initial_backoff_sec: 30
    multiplier: 3
hooks:
  on_workspace_prepare:
    - pnpm install --frozen-lockfile
  before_agent_run:
    - pnpm lint
  after_agent_run:
    - pnpm test
review:
  requires_human_review_before_merge: true
evidence:
  output_dir: docs/reports
  require_test_summary: true
---

# Project Execution Policy

- Backend changes must include API tests.
- Security-sensitive changes require a review round.
```

### 7.3 계약 해석 모델

계약은 아래 순서로 병합한다.

1. 앱 기본값
2. workflow pack
3. 프로젝트 `WORKFLOW.md`
4. 태스크 override

단, 모든 필드가 override 가능하면 위험하다.  
따라서 권장 분류는 아래와 같다.

#### 완전 override 가능

- `provider_priority`
- `max_runtime_minutes`
- `review.requires_human_review_before_merge`

#### pack 또는 contract만 변경 가능

- `sandbox_policy`
- `workspace.cleanup`
- `hooks`

#### 시스템 전역값만 허용

- 허용되지 않은 shell prefix
- 민감 경로 접근 정책
- 비밀값 처리 정책

### 7.4 현재 AgentDesk에 연결할 지점

필요한 연결 포인트:

- 프로젝트 조회 시 `project_path` 기준 `WORKFLOW.md` 탐색
- `workflow pack` 라우팅 결과와 병합
- 태스크 실행 전 최종 contract snapshot 생성
- 이 snapshot의 hash를 task와 evidence에 저장

가능한 구현 위치:

- 프로젝트/워크플로우 라우팅 모듈
- `buildTaskExecutionPrompt`
- `startTaskExecutionForAgent`
- worktree 생성 직후 contract 적용 단계

### 7.5 데이터 모델 제안

프로젝트 테이블 또는 별도 테이블에 아래 필드를 고려한다.

- `workflow_contract_path`
- `workflow_contract_hash`
- `workflow_contract_loaded_at`
- `workflow_contract_error`

task 쪽에는 다음이 필요하다.

- `resolved_workflow_contract_hash`
- `resolved_workflow_contract_json`

### 7.6 실패 처리

`WORKFLOW.md`가 잘못되었을 때의 정책이 중요하다.

권장 동작:

- 파싱 실패: task 실행 금지, decision inbox 등록
- 허용되지 않은 필드: 경고 + 무시 또는 실행 금지
- hook command allowlist 위반: 실행 금지

### 7.7 기대 효과

- 프로젝트 정책을 코드처럼 관리 가능
- UI 설정과 저장소 계약의 책임 분리
- 자동화 도입 시 프로젝트별 편차를 안정적으로 흡수

## 8. 적용안 2: 태스크 실행 상태기계 표준화

### 8.1 문제 정의

현재 `status` 하나로는 아래 상황을 정확히 표현하기 어렵다.

- 이미 태스크는 `in_progress`인데 workspace 준비 중인 경우
- 태스크는 `planned`인데 실제 프로세스는 재시도 대기 중인 경우
- 태스크는 `paused`지만 런타임 입장에서는 `recovering`인 경우

이 문제를 해결하려면 사용자 상태와 런타임 상태를 분리해야 한다.

### 8.2 제안 상태 모델

#### 사용자용 `status`

- `planned`
- `in_progress`
- `review`
- `done`
- `paused`
- `cancelled`

#### 시스템용 `execution_state`

- `queued`
- `claiming`
- `workspace_preparing`
- `ready`
- `running`
- `awaiting_review`
- `retry_backoff`
- `blocked`
- `stalled`
- `recovering`
- `succeeded`
- `failed`
- `cancelled`

### 8.3 상태 의미

`queued`
: 실행 자격은 있지만 아직 claim되지 않음

`claiming`
: 오케스트레이터가 담당 agent/workspace를 확보 중

`workspace_preparing`
: worktree 생성, branch 준비, hook 수행 중

`ready`
: 실행 직전 상태

`running`
: 실제 CLI 프로세스 또는 app-server 세션 동작 중

`awaiting_review`
: 실행은 끝났고 merge/review 판정 대기

`retry_backoff`
: 실패했지만 retry 정책상 재시도 예정

`blocked`
: 계약 위반, 권한 부족, human input 필요 등으로 중단

`stalled`
: heartbeat 또는 output이 일정 시간 이상 없음

`recovering`
: 서버 재시작 또는 세션 재부착 중

### 8.4 상태 전이 규칙

정상 경로:

`queued -> claiming -> workspace_preparing -> ready -> running -> awaiting_review -> succeeded`

재시도 경로:

`running -> retry_backoff -> queued`

장애 복구 경로:

`running -> stalled -> recovering -> queued`

차단 경로:

`claiming -> blocked`

중단 경로:

`running -> cancelled`

### 8.5 DB 변경 제안

`tasks`에 아래 필드 추가를 권장한다.

- `execution_state TEXT NOT NULL DEFAULT 'queued'`
- `execution_attempt INTEGER NOT NULL DEFAULT 0`
- `claimed_by TEXT NULL`
- `claim_expires_at TEXT NULL`
- `last_heartbeat_at TEXT NULL`
- `last_output_at TEXT NULL`
- `retry_after TEXT NULL`
- `execution_error_code TEXT NULL`
- `execution_error_summary TEXT NULL`
- `resolved_workflow_contract_hash TEXT NULL`

추가로 별도 이벤트 테이블도 권장한다.

`task_execution_events`

- `id`
- `task_id`
- `event_type`
- `from_state`
- `to_state`
- `summary`
- `metadata_json`
- `created_at`

### 8.6 API 변경 제안

기존 API를 깨지 않으면서 아래를 추가한다.

- `GET /api/tasks/:id/execution`
- `GET /api/tasks/:id/execution-events`
- `POST /api/tasks/:id/retry-now`
- `POST /api/tasks/:id/reconcile`

기존 `GET /api/tasks` 응답에는 선택적으로 다음 필드 추가:

- `execution_state`
- `execution_attempt`
- `last_heartbeat_at`
- `retry_after`

### 8.7 UI 반영

칸반의 `status`는 유지한다.  
대신 task card에 작게 `execution_state` badge를 표시한다.

예시:

- `IN PROGRESS` + `workspace_preparing`
- `IN PROGRESS` + `retry_backoff`
- `PAUSED` + `blocked`

### 8.8 기대 효과

- 협업 상태와 런타임 상태를 모두 정확히 표현 가능
- retry/recovery/stall을 시스템 수준에서 다룰 수 있음
- 나중에 polling worker를 넣어도 상태 혼선이 적음

## 9. 적용안 3: 워크스페이스 수명주기와 hooks 정식화

### 9.1 문제 정의

현재 AgentDesk는 worktree를 생성하고 task를 실행하는 능력이 있다.  
하지만 실행 수명주기가 표준화되어 있지 않으면 프로젝트별 품질과 복구 규칙이 흔들린다.

### 9.2 목표

실행 수명주기를 아래 단계로 나눈다.

1. workspace resolve
2. workspace prepare
3. pre-run validation
4. agent run
5. post-run validation
6. review/merge
7. cleanup/archive

### 9.3 제안 hook 집합

- `on_workspace_prepare`
- `before_agent_run`
- `after_agent_run`
- `before_merge`
- `before_cleanup`
- `on_failure`

### 9.4 각 hook의 역할

`on_workspace_prepare`
: 의존성 설치, generated file 준비, repo health check

`before_agent_run`
: 브랜치 상태, dirty state, path policy, secret presence 검증

`after_agent_run`
: 테스트, lint, artifact scan, summary 생성

`before_merge`
: 리뷰 통과 여부, 위험 변경 감지, merge 차단 조건 검증

`before_cleanup`
: evidence bundle flush, logs archive

`on_failure`
: 실패 유형 분류, retry 가능 여부 판정, operator notice

### 9.5 Hook 실행 결과 모델

모든 hook은 구조화된 결과를 남긴다.

```json
{
  "hook": "after_agent_run",
  "ok": false,
  "exit_code": 1,
  "started_at": "2026-03-09T10:00:00Z",
  "ended_at": "2026-03-09T10:02:31Z",
  "summary": "API tests failed",
  "artifacts": [
    {
      "type": "test-report",
      "path": "reports/test-summary.json"
    }
  ]
}
```

### 9.6 실행 정책

권장 정책:

- 모든 hook은 timeout 필수
- stdout/stderr 저장 필수
- exit code 외에 summary 생성 필수
- artifact path는 workspace 내부 경로만 허용

### 9.7 AgentDesk와의 연결

이 hook 체계는 아래와 잘 붙는다.

- security gate
- factcheck
- 보고서/PPT 산출물
- merge/discard/worktree 정리

즉 AgentDesk가 이미 강한 "산출물 증빙" 계층을 훨씬 안정적으로 만들 수 있다.

## 10. 적용안 4: workflow pack과 workflow contract 병합

### 10.1 왜 둘 다 필요하나

`workflow pack`은 앱이 제공하는 시작점이다.  
`WORKFLOW.md`는 프로젝트가 소유하는 최종 정책이다.

둘은 대체 관계가 아니다.

### 10.2 권장 역할 분리

`workflow pack`

- UI에서 선택 가능
- 조직 표준 템플릿
- 빠른 onboarding에 적합

`WORKFLOW.md`

- 프로젝트별 실제 실행 계약
- Git versioning 대상
- 장기 유지에 적합

### 10.3 병합 알고리즘

1. 시스템 기본값 로드
2. workflow pack 적용
3. project contract 적용
4. task runtime override 적용
5. validation
6. resolved snapshot hash 계산

### 10.4 병합 충돌 예시

시스템:

```json
{ "agent": { "approval_policy": "on-request" } }
```

pack:

```json
{ "agent": { "provider_priority": ["claude", "codex"] } }
```

contract:

```json
{ "agent": { "provider_priority": ["codex"], "max_runtime_minutes": 25 } }
```

task override:

```json
{ "agent": { "max_runtime_minutes": 15 } }
```

최종:

```json
{
  "agent": {
    "approval_policy": "on-request",
    "provider_priority": ["codex"],
    "max_runtime_minutes": 15
  }
}
```

### 10.5 금지 override

아래는 태스크 override 금지를 권장한다.

- `sandbox_policy`
- shell hook allowlist
- workspace cleanup safety
- merge 권한 정책

### 10.6 노출 방식

UI에는 "최종 실행 계약 요약"을 보여주고, 상세 diff는 펼침형으로 제공한다.

예시:

- base pack: `backend-safe`
- contract: `WORKFLOW.md loaded`
- overrides: `runtime max 15m`
- final provider: `codex`

## 11. 적용안 5: Intake Pipeline 재설계

### 11.1 현재 한계

현재는 입력원이 다르다.

- `/api/tasks`
- `/api/inbox`
- `/api/directives`
- 메신저 receiver

이 구조에서 tracker polling까지 붙이면 중복 생성과 충돌이 늘어난다.

### 11.2 목표

모든 입력은 공통 `task intake pipeline`을 거쳐야 한다.

### 11.3 공통 intake 스키마 제안

- `source_type`
- `source_id`
- `source_event_id`
- `source_title`
- `source_body`
- `project_id`
- `project_path`
- `workflow_pack_key`
- `idempotency_key`
- `requested_agent_id`
- `priority`
- `labels_json`
- `created_at`

### 11.4 Candidate 단계 도입

바로 `tasks`로 넣지 않고 먼저 `work_items` 또는 `candidate_work_items`에 적재한다.

권장 필드:

- `id`
- `source_type`
- `source_event_id`
- `idempotency_key`
- `project_id`
- `project_path`
- `normalized_title`
- `normalized_body`
- `status`
- `claim_status`
- `validation_error`
- `created_at`

### 11.5 Candidate 상태

- `received`
- `validated`
- `claimed`
- `converted_to_task`
- `rejected`
- `deduplicated`

### 11.6 왜 필요한가

이 단계가 있으면 다음이 가능해진다.

- 동일 tracker item 중복 생성 방지
- project_path 검증 선행
- policy validation 선행
- 사람이 이미 만든 수동 task와의 충돌 방지

### 11.7 AgentDesk 연결 포인트

기존 `decision inbox`와 잘 맞는다.  
validation 실패나 ambiguous mapping은 decision inbox로 바로 보낼 수 있다.

## 12. 적용안 6: Tracker Polling 오케스트레이터

### 12.1 도입 목표

AgentDesk는 현재 사람 지시 기반 입력이 강하다.  
여기에 tracker 기반 자동 인입을 추가하면 "사람이 만들지 않은 일"도 잡아낼 수 있다.

### 12.2 지원 대상

단계적으로:

1. Linear
2. GitHub Issues
3. Jira

### 12.3 실행 구조

polling worker는 아래 루프로 동작한다.

1. provider별 due item 조회
2. candidate work item 생성 또는 dedupe
3. project binding
4. contract resolve
5. claim 가능 여부 판단
6. task 생성
7. 실행 큐 등록

### 12.4 Claim 규칙

claim은 중요하다.  
권장 규칙:

- 같은 `idempotency_key`는 동시에 하나만 claim 가능
- 이미 사람 수동 task가 연결된 source는 자동 claim 금지
- project assignment가 없으면 claim 금지
- contract validation 실패 시 claim 금지

### 12.5 Tracker 전용 테이블 제안

`tracker_bindings`

- `id`
- `provider`
- `external_project_id`
- `project_id`
- `project_path`
- `workflow_pack_key`
- `enabled`

`tracker_sync_cursor`

- `provider`
- `binding_id`
- `cursor`
- `synced_at`

### 12.6 운영상 장점

- 반복 업무 자동화
- backlog 누락 감소
- 사람 지시 흐름과 병행 가능

### 12.7 주의점

Tracker polling은 제일 나중에 넣어야 한다.  
그 전에 state machine과 reconciliation이 정리되어 있어야 한다.

## 13. 적용안 7: Provider 정책 표준화

### 13.1 문제 정의

Symphony 레퍼런스는 Codex app-server 중심이다.  
하지만 AgentDesk는 Claude, Codex, Gemini를 동시에 다루는 제품이다.

따라서 provider 정책을 먼저 추상화해야 한다.

### 13.2 권장 contract 필드

- `provider_priority`
- `allowed_providers`
- `fallback_providers`
- `required_capabilities`
- `approval_policy`
- `sandbox_policy`
- `max_runtime_minutes`
- `max_cost`
- `requires_app_server`

### 13.3 capability 예시

- `long_running`
- `tool_use`
- `structured_output`
- `report_generation`
- `code_modification`
- `web_research`

### 13.4 배정 알고리즘 예시

1. task type 분석
2. required capability 계산
3. contract의 `allowed_providers` 필터링
4. 우선순위 순서대로 online/available 체크
5. 실패 시 fallback provider 선택
6. 선택 사유 저장

### 13.5 저장해야 하는 근거

선택된 provider뿐 아니라 이유도 남겨야 한다.

- `selected_provider`
- `selection_reason`
- `fallback_applied`
- `required_capabilities`

### 13.6 기대 효과

- 멀티 provider 환경에서도 contract-driven 실행 가능
- 왜 특정 태스크가 특정 에이전트에 갔는지 설명 가능

## 14. 적용안 8: Heartbeat, Stall, Recovery 강화

### 14.1 필요한 이유

장시간 실행 시스템에서 가장 위험한 것은 "죽지도 살지도 않은 실행"이다.  
AgentDesk는 startup reconciliation이 이미 있으므로 이 축을 강화하는 것이 비용 대비 효과가 크다.

### 14.2 저장할 런타임 신호

- `last_heartbeat_at`
- `last_output_at`
- `process_pid`
- `session_id`
- `workspace_ready_at`
- `runner_started_at`
- `runner_finished_at`

### 14.3 Stall 판단 규칙 예시

예시 정책:

- 5분 이상 heartbeat 없음
- 7분 이상 output 없음
- 프로세스 alive 여부 확인 실패

이면 `stalled`

### 14.4 Recovery 시나리오

서버 재기동 후:

1. 실행 중 tasks 조회
2. task execution session 복원 시도
3. PID/session 재연결 시도
4. 성공 시 `running` 유지
5. 실패 시 `recovering`
6. 이후 재실행 가능 여부 판단

### 14.5 자동 조치 정책

`stalled` 발생 시:

- 1차: 자동 재확인
- 2차: 자동 retry 가능하면 backoff 후 재큐잉
- 3차: decision inbox 등록

### 14.6 decision inbox와의 결합

운영자 선택지:

- `retry now`
- `wait more`
- `handoff provider`
- `cancel`
- `force review`

### 14.7 기대 효과

- 장시간 실행 운영 신뢰도 상승
- "애매하게 멈춘 실행"의 운영 비용 감소

## 15. 적용안 9: Evidence Bundle 표준화

### 15.1 목표

AgentDesk는 이미 보고서와 산출물 계층이 강하다.  
여기에 Symphony식 "모든 실행은 증빙을 남긴다" 원칙을 명시적으로 도입한다.

### 15.2 권장 evidence 구조

태스크 완료 시 evidence bundle 생성:

- `summary.json`
- `timeline.json`
- `contract.json`
- `artifacts.json`
- `review.md`
- `logs/terminal.log`

### 15.3 `summary.json` 예시 필드

- `task_id`
- `project_id`
- `execution_attempt`
- `selected_provider`
- `resolved_workflow_contract_hash`
- `workspace_path`
- `git_head`
- `result`
- `test_summary`
- `artifact_count`

### 15.4 `timeline.json` 예시

- state transition 목록
- hook 실행 결과
- operator intervention 이벤트
- retry 발생 시각

### 15.5 아티팩트 분류

- `report`
- `ppt`
- `patch`
- `test-report`
- `security-report`
- `factcheck`
- `screenshot`

### 15.6 UI 노출

task detail에는 요약만 보여주고, 상세 evidence는 다운로드 또는 펼침형으로 제공한다.

### 15.7 기대 효과

- 회고와 감사가 쉬워짐
- 산출물과 실행 과정을 분리해서 저장 가능
- 나중에 검색/분석 기반 기능 확장이 쉬움

## 16. 적용안 10: 사람 개입 정책을 계약으로 승격

### 16.1 왜 중요한가

AgentDesk는 사람 개입 UX가 이미 강하다.

- CEO directive
- 팀장 회의
- decision inbox
- review round

이건 약점이 아니라 강점이다.  
따라서 Symphony식 자동화를 넣을 때 제거할 것이 아니라 contract field로 승격해야 한다.

### 16.2 권장 정책 필드

- `requires_planning_meeting`
- `allow_direct_execution_without_meeting`
- `requires_human_review_before_merge`
- `auto_retry_enabled`
- `max_auto_handoffs`
- `escalate_to_decision_inbox_on_failure`

### 16.3 프로젝트별 예시

보수적 프로젝트:

- 회의 필수
- merge 전 human review 필수
- auto retry 1회

실험적 프로젝트:

- 회의 생략 가능
- auto retry 3회
- 특정 라벨에 한해 자동 merge 허용

### 16.4 기대 효과

- AgentDesk 고유의 협업 흐름이 자동화와 공존
- 프로젝트 성격에 따라 운영 모드를 바꿀 수 있음

## 17. 적용안 11: 운영자 UI 분리

### 17.1 왜 필요한가

현재 AgentDesk UI는 경영 시뮬레이션형 관점이 강하다.  
자동화가 강해질수록 인프라 관찰 화면이 따로 필요하다.

### 17.2 추가 권장 화면

- Orchestrator Queue
- Workspace Lifecycle
- Retry/Backoff Monitor
- Tracker Intake Board
- Contract Diff Viewer

### 17.3 화면별 기능

`Orchestrator Queue`

- execution_state 기준 정렬
- queued, running, stalled, retry_backoff 집계
- claim owner 표시

`Workspace Lifecycle`

- workspace 생성, 준비, hook, cleanup timeline
- 실패 hook 강조

`Retry/Backoff Monitor`

- retry_after 시각
- 실패 코드
- auto retry 횟수

`Tracker Intake Board`

- candidate work item 목록
- validation 실패 이유
- task 변환 여부

`Contract Diff Viewer`

- pack vs `WORKFLOW.md` vs runtime override 비교
- 최종 resolved snapshot 요약

### 17.4 기존 UI와의 관계

오피스 뷰는 유지하고, 위 화면은 운영/설정 영역에 넣는 것이 좋다.  
즉 "경영 UI"와 "오케스트레이터 UI"를 분리한다.

## 18. API 변경안 요약

권장 신규 API:

- `GET /api/tasks/:id/execution`
- `GET /api/tasks/:id/execution-events`
- `POST /api/tasks/:id/retry-now`
- `POST /api/tasks/:id/reconcile`
- `GET /api/projects/:id/workflow-contract`
- `POST /api/projects/:id/workflow-contract/reload`
- `GET /api/work-items`
- `POST /api/work-items/:id/claim`
- `POST /api/work-items/:id/convert`
- `GET /api/orchestrator/queue`
- `GET /api/orchestrator/metrics`

기존 API 응답 확장:

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `GET /api/worktrees`

여기에 `execution_state`, contract hash, workspace lifecycle 요약을 추가하는 방향이 적절하다.

## 19. DB 변경안 요약

### 19.1 `tasks` 확장

- `execution_state`
- `execution_attempt`
- `claimed_by`
- `claim_expires_at`
- `last_heartbeat_at`
- `last_output_at`
- `retry_after`
- `execution_error_code`
- `execution_error_summary`
- `resolved_workflow_contract_hash`

### 19.2 신규 테이블

`task_execution_events`

`candidate_work_items`

`tracker_bindings`

`tracker_sync_cursor`

`workflow_contract_cache`

`workspace_hook_runs`

### 19.3 인덱스 권장

- `tasks(execution_state, retry_after)`
- `candidate_work_items(idempotency_key)`
- `task_execution_events(task_id, created_at)`
- `tracker_sync_cursor(provider, binding_id)`

## 20. 단계별 구현 로드맵

### Phase 1: 상태기계 기반 다지기

범위:

- `execution_state` 추가
- heartbeat/output timestamp 추가
- basic execution event log 추가
- startup reconciliation 강화

완료 조건:

- 실행 중 task가 서버 재시작 후 일관되게 복구 또는 `recovering`으로 이동
- stalled 감지 규칙이 동작

### Phase 2: Contract Layer 도입

범위:

- `WORKFLOW.md` 파서
- workflow pack 병합기
- resolved contract snapshot 저장

완료 조건:

- project_path 기반 contract load 가능
- task detail에서 final contract summary 확인 가능

### Phase 3: Workspace Lifecycle 정식화

범위:

- hook runner
- hook result 저장
- evidence bundle 초안

완료 조건:

- 최소 `before_agent_run`, `after_agent_run` 동작
- hook 실패가 execution_state에 반영

### Phase 4: Intake Pipeline/Tracker

범위:

- candidate work item 도입
- tracker polling worker
- claim/convert 로직

완료 조건:

- Linear 또는 GitHub Issues 중 하나가 자동 task 생성 가능
- 중복 생성 방지

### Phase 5: 운영 화면

범위:

- orchestrator queue
- retry monitor
- contract diff viewer

완료 조건:

- 운영자가 자동화 상태를 UI에서 디버깅 가능

## 21. 추천 우선순위

가장 현실적인 순서는 아래다.

1. `execution_state`
2. heartbeat/stall/recovery
3. execution event log
4. `WORKFLOW.md` parser
5. pack + contract 병합기
6. workspace hooks
7. evidence bundle
8. candidate work item
9. tracker polling
10. orchestration UI

이 순서를 따르는 이유는 "안정성 -> 계약 -> 자동화 -> 가시성"이 가장 낮은 리스크 경로이기 때문이다.

## 22. 리스크와 대응

### 리스크 1: 상태가 너무 많아져 UI가 복잡해짐

대응:

- `status`와 `execution_state`를 분리
- 기본 UI에는 요약만 노출

### 리스크 2: `WORKFLOW.md`가 너무 강력해져 보안 위험 발생

대응:

- 허용 필드 제한
- shell hook allowlist
- 전역 정책은 override 금지

### 리스크 3: polling이 중복 task를 양산

대응:

- `candidate_work_items`
- `idempotency_key`
- claim 단계 도입

### 리스크 4: 멀티 provider 정책이 복잡해짐

대응:

- capability 기반 추상화
- selection reason 저장

### 리스크 5: 기존 UX와 충돌

대응:

- 경영 UI와 orchestration UI 분리
- 사람 개입 정책을 contract로 승격

## 23. 하지 말아야 할 것

- workflow pack을 제거하고 `WORKFLOW.md`만 강제하는 것
- 오피스 뷰를 최소 UI로 축소하는 것
- Codex 기준 설계를 멀티 provider 구조에 그대로 복붙하는 것
- 사람 개입 플로우를 단순화한다는 이유로 제거하는 것
- polling을 먼저 넣고 나중에 recovery를 붙이는 것

## 24. 결론

AgentDesk에 가장 적용해볼 만한 Symphony 개념은 "이슈 polling" 그 자체보다 아래 3가지다.

1. 저장소가 실행 정책을 소유하는 계약 구조
2. 오케스트레이터가 단일 권위로 관리하는 실행 상태기계
3. 워크스페이스 수명주기, retry, recovery를 문서화된 규칙으로 다루는 방식

이 세 가지를 먼저 도입하면, AgentDesk는 지금의 강한 UI와 멀티 에이전트 운영 경험을 유지한 채로, 더 안정적이고 더 장시간 동작 가능한 orchestration platform으로 진화할 수 있다.
