# AgentDesk — 프로젝트 OS 개요

> **핵심 컨셉:** 다양한 AI 에이전트를 등록해 개발 작업을 수행할 때,
> UI/UX를 통해 모든 과정을 실시간으로 모니터링하고 제어한다.

---

## 1. 왜 AgentDesk인가

### 근본 문제

AI 에이전트가 여러 개 돌아갈 때:
- 어떤 에이전트가 무슨 태스크를 하고 있는지 보이지 않는다
- 룰·메모리·훅·스킬이 어디에 적용되는지 알 수 없다
- 에이전트 간 협업 흐름을 추적할 수 없다
- 문제가 생겨도 어디서 왜 생겼는지 파악하기 어렵다

### AgentDesk의 답

```
에이전트는 CLI 프로세스다.
프로젝트는 그 에이전트들이 일하는 OS다.
UI/UX는 그 OS의 제어판이다.
```

개발자·팀 리드가 **여러 에이전트를 동시에 돌리면서**, 각 에이전트의 실행 상태, 출력, 의사결정, 협업 흐름을 **한 화면에서 실시간으로 모니터링**할 수 있게 한다.

---

## 2. Project OS 개념

AgentDesk는 단순한 태스크 관리 툴이 아니라 **에이전트를 위한 운영체제**다.

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentDesk — Project OS                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   PROJECT    │  │    AGENTS    │  │   LIBRARY    │       │
│  │              │  │              │  │              │       │
│  │ 목표·리스크   │  │ 에이전트 팀  │  │ Skills       │       │
│  │ 게이트·산출물 │  │ 부서 구조    │  │ Rules        │       │
│  │ 번다운 차트   │  │ 페르소나     │  │ Memory       │       │
│  │              │  │              │  │ Hooks        │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                  │               │
│         └────────────────►│◄─────────────────┘               │
│                           │                                  │
│                    ┌──────▼───────┐                          │
│                    │    TASKS     │                          │
│                    │              │                          │
│                    │ 태스크 보드   │                          │
│                    │ 실행·스케줄   │                          │
│                    │ 모니터 뷰    │                          │
│                    └──────┬───────┘                          │
│                           │                                  │
│              ┌────────────▼────────────┐                     │
│              │   MONITORING / UIUX     │                     │
│              │                         │                     │
│              │ 터미널 스트리밍          │                     │
│              │ 에이전트 상태 실시간     │                     │
│              │ CLI 사용량 추적          │                     │
│              │ 이상 감지 알림          │                     │
│              └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### OS 계층 구조

```
Organization
  └── Department (부서 — 에이전트 그룹)
        └── Agent (에이전트 — CLI 프로세스)
              └── Task (태스크 — 실행 단위)

Category (프로젝트 유형 템플릿)
  └── Project (프로젝트 — 작업 공간)
        ├── Objectives / Risks / Gates / Outputs
        └── project_agents (배정된 에이전트 팀)
```

---

## 3. 에이전트 모니터링 — UIUX가 보여주는 것

AgentDesk의 핵심 가치는 **"보이지 않던 것을 보이게 만드는 UI"**다.

### 실시간 모니터링 요소

| 화면 | 모니터링 내용 |
|---|---|
| **태스크 보드** | 전체 태스크 상태(대기/실행/완료/실패), 에이전트 배정 현황 |
| **터미널 패널** | 에이전트 CLI 출력 실시간 스트리밍 (stdout) |
| **에이전트 상세** | 현재 상태, 실행 중인 태스크, 스킬·룰·메모리 적용 현황 |
| **현황 모니터** | 에이전트 전체 활동 대시보드, 이상 감지 |
| **CLI 사용량** | 에이전트별 토큰 소비, 비용 추적 |
| **태스크 리포트** | 완료된 태스크의 결과물·diff·로그 |

### 프로젝트 범위 Library 필터링

에이전트를 프로젝트에 배정하면, 해당 프로젝트에서 보이는 스킬·룰·메모리·훅은 **그 프로젝트에 배정된 에이전트의 것만** 표시된다. 사용자가 "어떤 에이전트가 어떤 설정으로 돌아가는지"를 명확히 이해할 수 있다.

```
GET /api/agent-rules?project_id=<id>
  → 프로젝트 배정 에이전트의 룰 + 프로젝트 룰 + 글로벌 룰
  (다른 프로젝트 에이전트의 룰은 보이지 않음)
```

동일하게 `/api/memory`, `/api/hooks`, `/api/skills/available`도 `project_id` 필터 적용.

---

## 4. 에이전트 실행 파이프라인

사용자가 태스크를 실행하면 내부에서 일어나는 일:

```
사용자: "이 태스크 실행"
    │
    ▼
① 에이전트 배정 (자동 또는 수동)
    │
    ▼
② 프롬프트 빌드
   ├── 워크플로우 팩 가이던스 (role, 행동 방침)
   ├── 페르소나 블록 (Jobs, Torvalds 등)
   ├── Rules 주입  ←── 캐시 (5분 TTL)
   ├── Memory 주입 ←── 캐시 (5분 TTL)
   └── 사용 가능한 스킬 목록
    │
    ▼
③ pre-task Hooks 실행 (병렬 async)
    │
    ▼
④ CLI 프로세스 spawn (child_process)
   → stdout 스트리밍 → WebSocket → 터미널 패널
    │
    ▼
⑤ 완료 처리
   ├── post-task / on-error Hooks (fire-and-forget 병렬)
   ├── 스킬 학습 기록
   ├── Memory 자동 추출·저장
   └── task.status = done | failed → broadcast
```

### Library가 에이전트 프롬프트에 주입되는 방식

```
우선순위: project > agent > department > global

[Agent Rules]
  1. [project] 코드 리뷰 필수: PR 전 항상 테스트 실행
  2. [agent]   TypeScript strict 모드 사용
  3. [global]  한국어로 응답

[Agent Memory]
  1. [context] 이전에 발견한 API 버그 패턴
  2. [knowledge] 자주 사용하는 라이브러리 설정
```

---

## 5. 핵심 구성 요소 — Library

에이전트의 행동을 정의하는 4가지 레고 블록:

| 요소 | 역할 | 스코프 |
|---|---|---|
| **Skills** | 에이전트가 학습한 도구·명령 모음 | provider/repo/agent |
| **Rules** | 에이전트가 따라야 할 규칙 | global/dept/agent/project |
| **Memory** | 에이전트가 기억하는 맥락·지식 | global/dept/agent/project |
| **Hooks** | 태스크 이벤트에 자동 실행되는 스크립트 | global/dept/agent/project |

이 4가지를 **프로젝트 단위**로 관리하면, 같은 에이전트도 프로젝트마다 다른 행동 방식을 가질 수 있다.

---

## 6. 현재 시스템 상태

### 완성도 (2026-03-13 기준)

```
에이전트 스폰·관리          ██████████████████░░ 95%
멀티에이전트 오케스트레이션  ██████████████████░░ 90%
데이터베이스·인프라          ██████████████████░░ 90%
스킬 학습·메모리             █████████████████░░░ 85%
하트비트·이상 감지           █████████████████░░░ 85%
스케줄링                    █████████████████░░░ 85%
UIUX 모니터링               ████████████████░░░░ 80%
페르소나 시스템              ████████████████░░░░ 80%  (백엔드 완성, FE 일부 미완)
시각적 에이전트 그래프       ░░░░░░░░░░░░░░░░░░░░  0%  (설계 완성, 구현 미시작)
```

### 동시 실행 안전 한계

| 동시 에이전트 수 | Phase 1 전 | Phase 1 후 (현재) | Phase 2 후 |
|:-:|:-:|:-:|:-:|
| 1~3개 | ✅ | ✅ | ✅ |
| 5개 | ⚠️ 체감 지연 | ✅ | ✅ |
| 10개 | ❌ 블로킹 위험 | ⚠️ 경미한 지연 | ✅ |
| 20개+ | ❌ 자원 고갈 | ⚠️ 큐 없어 위험 | ✅ 큐 제어 |

### Phase 1 성능 개선 완료 (2026-03-13)

- **훅 병렬 실행**: `execFileSync` → `execFileAsync + Promise.all` (최대 600s 블로킹 제거)
- **DB 복합 인덱스 4개 추가**: enabled+scope 필터 풀스캔 해소
- **Rules·Memory 5분 TTL 캐시**: 동일 프로젝트 10개 태스크 동시 시작 시 DB 재조회 제거

---

## 7. 코드베이스 현황 스냅샷 (AI 에이전트용)

> 이 섹션은 AI 에이전트가 작업 시작 전 코드 구조를 빠르게 파악하기 위한 참조 지도입니다.

### 7-1. 프론트엔드 진입점

| 파일 | 역할 |
|---|---|
| `src/App.tsx` | 루트 컴포넌트. Zustand 스토어 구독, WebSocket 연결, 이벤트 핸들러 정의 |
| `src/app/AppMainLayout.tsx` | 뷰 라우팅 허브. `view` prop 값에 따라 각 화면 렌더링 |
| `src/app/AppOverlays.tsx` | 모달·패널 오버레이 렌더링 (AgentDetail, TaskPanel 등) |
| `src/components/Sidebar.tsx` | 좌측 네비게이션. `NAV_STRUCTURE` 배열로 메뉴 정의 |

### 7-2. 현재 View 타입 전체 목록

```typescript
// src/app/types.ts
export type View =
  | "agents"            // 에이전트 & 부서
  | "heartbeat"         // 현황 모니터
  | "dashboard"         // 대시보드
  | "project-types"     // 프로젝트 유형
  | "cli-usage"         // CLI 사용량
  | "tasks"             // 태스크 (기본)
  | "tasks-board"       // 태스크 보드 (칸반)
  | "tasks-scheduled"   // 스케줄 태스크
  | "tasks-deliverables"// 산출물
  | "skills"            // 스킬 라이브러리
  | "agent-rules"       // 룰 라이브러리
  | "memory"            // 메모리 라이브러리
  | "hooks"             // 훅 라이브러리
  | "settings";         // 설정
// ⬆ "flow-graph" 아직 없음 — P2-1 작업 시 추가 필요
```

### 7-3. Zustand 스토어 구조

| 스토어 파일 | 관리하는 상태 |
|---|---|
| `src/store/agentStore.ts` | `agents`, `departments`, `subAgents`, `selectedAgent` 등 |
| `src/store/taskStore.ts` | `tasks`, `subtasks`, `crossDeptDeliveries`, `meetingPresence` 등 |
| `src/store/projectStore.ts` | `projects`, `categories`, `currentProjectId`, `projectAgentIds` |
| `src/store/uiStore.ts` | `view`, `loading`, `settings`, 각종 모달 열림 상태 |

### 7-4. 핵심 타입 파일

| 타입 | 파일 |
|---|---|
| `Agent`, `Department`, `Task`, `SubTask` | `src/types/index.ts` |
| `SubAgent` | `src/types/index.ts` (line ~65) |
| `MeetingPresence` | `src/types/index.ts` (line ~56) |
| `CrossDeptDelivery` | `src/types/index.ts` (line ~72) |
| `View`, `RuntimeOs`, `OAuthCallbackResult` | `src/app/types.ts` |

### 7-5. AppMainLayout 현재 props (P2-1 통합 시 참고)

현재 `AppMainLayout`에 **없는** props (Flow Graph 통합 시 추가 필요):
- `subAgents: SubAgent[]` — agentStore에서 공급, App.tsx 250번째 줄 참고
- `crossDeptDeliveries: CrossDeptDelivery[]` — taskStore에서 공급
- `meetingPresence: MeetingPresence[]` — taskStore에서 공급

현재 있는 관련 props:
- `agents: Agent[]` ✅
- `departments: Department[]` ✅
- `tasks: Task[]` ✅
- `projectAgentIds?: Set<string>` ✅ (AppMainLayout 내부 상태로 관리, line ~227)
- `onSelectAgent: (agent: Agent) => void` ✅

### 7-6. Sidebar 확장 포인트 (P2-1)

```typescript
// src/components/Sidebar.tsx — 수정 위치
const NAV_STRUCTURE: NavEntry[] = [  // line ~24
  ...
  {
    label: "agents-section",
    children: [{ view: "agents" }, { view: "heartbeat" }],
    //          ↑ 여기에 { view: "flow-graph" } 추가
  },
];
const AGENTS_CHILDREN: View[] = ["agents", "heartbeat"]; // line ~51, "flow-graph" 추가
```

---

## 8. 작업 목록 (2026-03-13 기준)

> 우선순위: **P0** 즉시 | **P1** 1~2주 | **P2** 3~6주 | **P3** 장기

---

### 🔴 P0 — 즉시 처리 (버그·보안)

#### ~~[P0-1] 미팅 참여자 필터링 버그~~ ✅ 완료 (2026-03-14)
- **파일:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts`
- **수정 내용:** `loadManualProjectAgentScope()`의 `assignment_mode !== "manual"` 조건 제거 → 모든 모드에서 `project_agents` 테이블 기반 에이전트 풀 제한 적용
- **효과:** auto 모드 프로젝트에서도 미배정 에이전트의 태스크/리뷰 참여 차단

#### ~~[P0-2] OAuth 비밀번호 해싱 취약~~ ✅ 이미 완료
- **파일:** `server/oauth/helpers.ts`
- **현황:** PBKDF2-SHA256 (100k iterations) 방식의 v2 키 이미 구현됨. `encryptSecret()`은 v2 전용, `decryptSecret()`은 v1/v2 하위 호환 지원

#### ~~[P0-3] API Rate Limiting 전무~~ ✅ 이미 완료
- **파일:** `server/security/auth.ts`
- **현황:** 인-프로세스 슬라이딩 윈도우 Rate Limiter 구현됨
  - 일반 API: 300 req/min per IP
  - 태스크 실행 트리거 (`POST /tasks/:id/run`): 20 req/min per IP
  - 5분 주기 stale 버킷 sweep으로 메모리 누수 방지

#### ~~[P0-4] WebSocket 연결 수 무제한~~ ✅ 이미 완료
- **파일:** `server/modules/lifecycle.ts`
- **현황:** `MAX_WS_CLIENTS = 20` 전역 제한 구현됨. 초과 시 코드 `4008` 즉시 close

#### ~~[P0-5] 환경 변수 시작 시 검증 누락~~ ✅ 이미 완료
- **파일:** `server/server-main.ts`
- **현황:** `validateEnv()` 함수로 서버 시작 시 OAUTH_ENCRYPTION_SECRET, API_AUTH_TOKEN 검증 후 경고 출력. OAuth 실제 사용 시 `oauthEncryptionKeyV2()`에서 throw로 즉시 실패 처리

---

### 🟠 P1 — 단기 (1~2주)

#### ~~[P1-1] App.tsx 상태 관리 분리 — Zustand 도입~~ ✅ 완료 (2026-03-14)
- **파일:** `src/store/agentStore.ts`, `src/store/taskStore.ts`, `src/store/projectStore.ts`, `src/store/uiStore.ts`
- **완료 내용:**
  1. 4개 Zustand 스토어 파일 생성 완료
  2. App.tsx의 46개 useState 전량 제거 → 스토어 구독으로 교체 (349줄로 축소)
  3. 모든 WebSocket 이벤트, 부트스트랩 데이터, 액션 핸들러가 스토어 setter 사용

#### ~~[P1-2] WorkflowPackKey → category_id 브리지 연결~~ ✅ 완료 (2026-03-14)
- **파일:** `versioned-migrations.ts`, `category-seeds.ts`, `task-pack-resolver.ts`, `tasks/crud.ts`, `src/types/index.ts`
- **구현 내용:**
  1. DB 마이그레이션 `2026-03-14-003`: `categories` 테이블에 `pack_key TEXT` 컬럼 추가, 기존 6개 카테고리에 팩키 매핑 적용
  2. DB 마이그레이션 `2026-03-14-004`: `tasks` 테이블에 `category_id TEXT REFERENCES categories(id)` 추가
  3. `resolveCategoryPackKey()` 함수 추가 — `category_id → categories.pack_key` 조회
  4. `resolveWorkflowPackKeyForTask()` 우선순위 체인: explicit → **category** → sourceTask → projectDefault → fallback
  5. POST `/api/tasks`에서 `category_id` 수신 → DB에서 검증 후 INSERT
  6. PATCH `/api/tasks/:id`에서 `category_id` 허용
  7. `Task` 인터페이스에 `category_id?: string | null` 추가
- **카테고리 → 팩 매핑:**
  - `cat_software_dev` → `development`
  - `cat_marketing` → `asset_management`
  - `cat_research` → `web_research_report`
  - `cat_product_launch` → `development`
  - `cat_content` → `novel`
  - `cat_operations` → `report`
- **하위 호환:** `workflow_pack_key` 컬럼 유지 (기존 데이터 보존), category 없는 태스크는 기존 방식 그대로 동작

#### ~~[P1-3] 메신저 수신 재시도 로직~~ ✅ 완료 (2026-03-14)
- **파일:** `server/messenger/telegram-receiver.ts`, `server/messenger/discord-receiver.ts`
- **수정 내용:** `forwardToInboxWithRetry()` 헬퍼 추가 (최대 3회, 지수 백오프: 2s→4s→8s)
- **효과:** inbox 전달 일시 실패 시 자동 재시도, 영구 메시지 손실 방지

#### ~~[P1-4] DB 마이그레이션 버전 추적~~ ✅ 이미 완료
- **파일:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **현황:** `schema_migrations` 테이블 + `runVersionedMigrations()` 이미 구현됨. 버전 적용 여부 추적 및 중복 실행 방지

#### ~~[P1-5] In-Memory Map 메모리 누수 방지~~ ✅ 이미 완료
- **파일:** `server/modules/lifecycle.ts`, `server/security/auth.ts`
- **현황:** WebSocket `onClose/onError` 핸들러에서 `wsClients.delete()` 구현됨. Rate Limiter 버킷은 5분 주기 sweep으로 stale 항목 자동 정리

#### ~~[P1-6] 구조화 로깅 도입 (pino)~~ ✅
- **파일:** `server/lib/logger.ts` (신규), 서버 전체 40+ 파일
- **완료 내용:**
  1. `pino` + `pino-pretty` 의존성 추가
  2. `server/lib/logger.ts` — 환경별 로거 (dev: pino-pretty 컬러, prod: JSON, `LOG_LEVEL` 환경변수 지원)
  3. 서버 전체 `console.log/warn/error` → `logger.info/warn/error` 교체 완료
  4. 구조화 에러 로깅: `logger.error({ err }, "message")` 패턴으로 스택 트레이스 자동 직렬화

---

### 🟡 P2 — 중기 (3~6주)

> **P2-2~P2-8 상세 설계서:** `docs/strategy/p2-tasks-design.md`
> (파일 경로, 현재 상태, 구현 단계, 코드 예시 포함)

#### ~~[P2-1] Agent Flow Graph 구현~~ ✅ 완료 (2026-03-14)
- **구현 파일:** `src/components/flow-graph/` (AgentFlowGraph, useFlowLayout, AgentNode, MeetingCluster, FlowEdge)
- **완료 내용:** SVG 실시간 에이전트 관계 시각화, 줌/팬, 노드 클릭, 미팅 클러스터, Sidebar "플로우 그래프 ◎" 메뉴 추가

#### ~~[P2-2] 에이전트 실행 비용 추적~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `task_execution_events` 테이블에 `tokens_in`, `tokens_out`, `cost_usd` 컬럼 추가 (migration `2026-03-14-005`)
  2. `api-provider-tools.ts` — Anthropic SDK `response.usage` 파싱 후 DB 저장 (`COST_PER_INPUT_MTOK` / `COST_PER_OUTPUT_MTOK` 환경변수)
  3. `GET /api/agents/:id/cost-summary`, `GET /api/cost-summary` API 추가
  4. 에이전트 상세 "이번 달 비용" 뱃지 + Dashboard 총 비용 위젯

#### ~~[P2-3] 동시 실행 제한 (FIFO 대기 큐)~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `server/modules/workflow/orchestration/agent-queue.ts` 신규 — FIFO 큐 모듈
  2. `MAX_CONCURRENT_AGENTS` 환경변수 (기본값 10) — `server/db/runtime.ts`
  3. `orchestration.ts` 통합 — enqueue 래핑 + onComplete 훅
  4. `GET /api/queue-status` API + 헤더 큐 상태 카운터 (실행 중 N / 대기 M)

#### ~~[P2-4] spawn 시 DB 쿼리 배치화~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `buildExecutionPayload()` 헬퍼 함수 추출
  2. 6개 함수(`buildRulesPromptBlock`, `buildMemoryPromptBlock`, `buildAvailableSkillsPromptBlock`, `loadPendingInterruptPrompts`, `getRecentConversationContext`, `getTaskContinuationContext`) `Promise.all()` 병렬화
  3. `startTaskExecutionForAgent` async 전환

#### ~~[P2-5] 에이전트 타임라인 뷰~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `GET /api/agents/:id/timeline` API — `task_execution_events` 기반
  2. `src/components/agent-detail/AgentTimeline.tsx` — 수직 타임라인, 이벤트 타입별 색상 dot
  3. AgentDetail "Timeline" 탭 추가

#### ~~[P2-6] 태스크 핸드오프 (에이전트 → 에이전트)~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `tasks` 테이블에 `handoff_to_agent_id`, `handoff_condition` 컬럼 추가 (migration `2026-03-14-007`)
  2. `run-complete-handler/core.ts` — 완료 시 핸드오프 조건 평가 → 후속 태스크 자동 생성
  3. POST/PATCH `/api/tasks` 핸드오프 필드 지원
  4. `CreateTaskModal` — "HANDOFF ON COMPLETE" 섹션 (토글 + 에이전트 선택 + 조건 선택)

#### ~~[P2-7] 페르소나 시스템 UI 완성~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `src/components/persona/PersonaDetailPanel.tsx` 신규 — 인물명·키워드·best_for·스타일 설명
  2. AgentDetailTabContent — 카탈로그/직접편집 모드 전환 + persona_id 업데이트
  3. AgentManager 에이전트 목록에 PersonaBadge 연동

#### ~~[P2-8] WebSocket broadcast 최적화~~ ✅ 완료 (2026-03-14)
- **완료 내용:**
  1. `server/ws/hub.ts` — `cli_output` 4KB 청크 분할 전송
  2. 태스크 채널 구독 분리 — `subscribe_task` / `unsubscribe_task` 메시지로 클라이언트별 구독 관리
  3. `src/hooks/useWebSocket.ts` — `send()` 함수 추가
  4. 터미널 패널 마운트/언마운트 시 자동 구독/해제

---

### 🔵 P3 — 장기 (3개월+)

#### ~~[P3-1] "더 큰 IDE" — Split-Pane Layout~~ ✅ 완료 (2026-03-14)
- **파일:** `src/hooks/useSplitPane.ts` (신규), `src/app/SplitPaneSecondary.tsx` (신규), `src/app/AppMainLayout.tsx`, `src/app/AppHeaderBar.tsx`
- **완료 내용:**
  1. 외부 라이브러리 없이 순수 CSS + 마우스 드래그 리사이즈 구현
  2. 우측 보조 패널: Flow Graph ◎ / Heartbeat ♡ / Dashboard ▦ 탭 전환
  3. 분할 비율 25~75% 드래그 조정, localStorage 자동 저장
  4. 헤더 `⊟` 토글 버튼 (데스크톱 전용), `\` 키보드 단축키
  5. 단축키 가이드에 `\` 항목 추가

#### [P3-2] Visual Workflow Builder
- **설계:** `docs/strategy/bigger-ide-vision.md` Phase 2
- **작업:**
  1. `pnpm add @xyflow/react`
  2. 노드 기반 워크플로 UI: AgentNode, GateNode, TriggerNode, ConditionNode
  3. 기존 workflow pack 백엔드와 연결
  4. 드래그&드롭으로 에이전트 파이프라인 시각적 구성

#### ~~[P3-3] Keyboard-First UX 완성~~ ✅ 완료 (2026-03-14)
- **파일:** `src/app/AppMainLayout.tsx`, `src/components/KeyboardShortcutsGuide.tsx`
- **완료 내용:**
  1. `g + 키` vim-style 네비게이션: `g d` → Dashboard, `g t` → Task Board, `g a` → Agents, `g f` → Flow Graph, `g s` → Skills, `g m` → Memory, `g r` → Rules, `g h` → Hooks (1초 타임아웃 포함)
  2. `n` → 커맨드 팔레트 오픈 (편집 중 제외)
  3. KeyboardShortcutsGuide에 `g + 키` 섹션 추가 (i18n 4개국어)

#### [P3-4] 테스트 커버리지 확대
- **현황:** `src/i18n.test.ts`, `src/hooks/useWebSocket.test.ts` 정도만 존재
- **작업:**
  1. 핵심 백엔드 모듈 단위 테스트: `hook-executor`, `project-scoped-rules`, `persona-catalog`
  2. API 통합 테스트 (`supertest`): 주요 엔드포인트 50개
  3. 프론트 컴포넌트 테스트 (`@testing-library/react`): CommandPalette, AgentFlowGraph
  4. CI 파이프라인 연동 (GitHub Actions): 머지 전 테스트 자동 실행

#### ~~[P3-5] 이상 감지 인덱스 최적화~~ ✅ 완료 (2026-03-14)
- **파일:** `server/modules/bootstrap/schema/versioned-migrations.ts`, `server/db/runtime.ts`, `server/modules/lifecycle.ts`
- **완료 내용:**
  1. migration `2026-03-14-008-watchdog-index`: `tasks(status, execution_state, last_heartbeat_at DESC)` 복합 인덱스 추가 — watchdog 쿼리 풀스캔 제거
  2. `server/db/runtime.ts` — `TASK_STALLED_THRESHOLD_MS` / `TASK_STALLED_RECOVERY_THRESHOLD_MS` 환경변수 설정 가능하게 (기본값 90s / 180s, 최솟값 강제)
  3. `lifecycle.ts` — 하드코딩 상수 → `db/runtime.ts` 임포트로 교체

#### ~~[P3-6] Slack 연동~~ ✅ 완료 (2026-03-14)
- **파일:** `server/messenger/slack-receiver.ts` (신규)
- **완료 내용:**
  1. `conversations.history` 폴링 방식 수신기 구현 (Discord 패턴 재사용)
  2. Bot User OAuth Token(`xoxb-...`) 지원, 채널 ID 기반 라우팅
  3. `lifecycle.ts` — `startSlackReceiver()` 등록, `onBeforeClose()` 정리
  4. `GET /api/messenger/receiver/slack` 상태 엔드포인트 추가 (`core.ts`)

---

### 📊 우선순위 요약 (2026-03-14 기준)

| 코드 | 작업 | 예상 기간 | 임팩트 | 상태 |
|------|------|---------|--------|------|
| ~~P0-1~~ | ~~미팅 참여자 필터링 버그~~ | 0.5일 | 🔴 P0 버그 | ✅ 완료 |
| ~~P0-2~~ | ~~OAuth 해싱 취약~~ | 1일 | 🔴 보안 | ✅ 완료 |
| ~~P0-3~~ | ~~Rate Limiting~~ | 0.5일 | 🔴 보안 | ✅ 완료 |
| ~~P0-4~~ | ~~WebSocket 연결 제한~~ | 0.5일 | 🔴 보안 | ✅ 완료 |
| ~~P0-5~~ | ~~환경 변수 검증~~ | 0.5일 | 🔴 안정성 | ✅ 완료 |
| ~~P1-1~~ | ~~Zustand 상태 관리~~ | 4일 | 성능·개발속도 | ✅ 완료 |
| ~~P1-2~~ | ~~WorkflowPackKey → category_id 브리지~~ | 3일 | 코드 명확성 | ✅ 완료 |
| ~~P1-3~~ | ~~메신저 재시도~~ | 1일 | 안정성 | ✅ 완료 |
| ~~P1-4~~ | ~~DB 마이그레이션 버전~~ | 2일 | 안정성 | ✅ 완료 |
| ~~P1-5~~ | ~~Map 메모리 누수~~ | 1일 | 안정성 | ✅ 완료 |
| ~~P1-6~~ | ~~구조화 로깅 (pino)~~ | 2일 | 운영성 | ✅ 완료 |
| ~~P2-1~~ | ~~Agent Flow Graph~~ | 3~4주 | 🎯 핵심 비전 | ✅ 완료 |
| ~~P2-2~~ | ~~실행 비용 추적~~ | 3일 | 사용성 | ✅ 완료 |
| ~~P2-3~~ | ~~동시 실행 큐~~ | 3일 | 확장성 | ✅ 완료 |
| ~~P2-4~~ | ~~spawn DB 배치화~~ | 2일 | 성능 | ✅ 완료 |
| ~~P2-5~~ | ~~에이전트 타임라인~~ | 3일 | 시각화 | ✅ 완료 |
| ~~P2-6~~ | ~~태스크 핸드오프~~ | 4일 | 기능 확장 | ✅ 완료 |
| ~~P2-7~~ | ~~페르소나 UI 완성~~ | 2일 | UI 완성도 | ✅ 완료 |
| ~~P2-8~~ | ~~WebSocket 최적화~~ | 2일 | 성능 | ✅ 완료 |
| ~~P3-1~~ | ~~Split-Pane Layout~~ | 3~4일 | IDE 비전 | ✅ 완료 |
| P3-2 | Visual Workflow Builder | 3~4주 | IDE 비전 | ⬜ 미시작 |
| ~~P3-3~~ | ~~Keyboard-First UX~~ | 1주 | UX 완성도 | ✅ 완료 |
| P3-4 | 테스트 커버리지 | 3~4주 | 품질 | ⬜ 미시작 |
| ~~P3-5~~ | ~~이상 감지 최적화~~ | 1일 | 성능 | ✅ 완료 |
| ~~P3-6~~ | ~~Slack 연동~~ | 3일 | 기능 확장 | ✅ 완료 |



---

## 9. 문서 지도

| 문서 | 내용 |
|---|---|
| [`docs/OVERVIEW.md`](./OVERVIEW.md) | **지금 이 문서** — 전체 개요 |
| [`docs/specs/api.md`](./specs/api.md) | REST API 전체 명세 |
| [`docs/architecture/SYSTEM-STRUCTURE-MAP.md`](./architecture/SYSTEM-STRUCTURE-MAP.md) | 시스템 구조 맵 |
| [`docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md`](./architecture/ARCHITECTURE-AUDIT-2026-Q1.md) | **종합 아키텍처 + 백엔드 감사** (FE/BE/보안/성능/로드맵) |
| [`docs/strategy/agent-performance-audit.md`](./strategy/agent-performance-audit.md) | 에이전트 실행 성능 감사 + 로드맵 (Phase 1 완료) |
| [`docs/strategy/bigger-ide-vision.md`](./strategy/bigger-ide-vision.md) | "더 큰 IDE" 전략 비전 |
| [`docs/strategy/agent-persona-system.md`](./strategy/agent-persona-system.md) | 에이전트 페르소나 시스템 |
| [`docs/design/DESIGN.md`](./design/DESIGN.md) | UI 구현 레퍼런스 — CSS 변수 전체 + 컴포넌트 패턴 |
| [`docs/design/AI-GUIDE.md`](./design/AI-GUIDE.md) | AI 개발자 디자인 가이드 — 원칙·체크리스트·코드 예시 |
| [`docs/design/UI-SCREENS.md`](./design/UI-SCREENS.md) | 전체 화면·모달 명세 (13 + 36개) |

---

## 10. 빠른 시작

```bash
pnpm install
cp .env.example .env
pnpm setup
pnpm dev
# → http://localhost:8800
```

### 첫 에이전트 등록 흐름

```
1. Settings → API Provider 설정 (Claude / OpenAI / 등)
2. Agents → 에이전트 생성 + 페르소나 설정
3. Projects → 프로젝트 생성 + 에이전트 배정
4. Library → 프로젝트용 Rules / Memory / Hooks 설정
5. Tasks → 태스크 생성 → 실행 → 터미널 패널에서 실시간 모니터링
```
