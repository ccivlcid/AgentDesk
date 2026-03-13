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

## 7. 작업 목록 (2026-03-13 기준)

> 우선순위: **P0** 즉시 | **P1** 1~2주 | **P2** 3~6주 | **P3** 장기

---

### 🔴 P0 — 즉시 처리 (버그·보안)

#### [P0-1] 미팅 참여자 필터링 버그 ← 가장 심각
- **파일:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts:274-284`
- **문제:** `assignment_mode === "auto"` 일 때 `loadManualProjectAgentScope()` 가 null 반환 → 프로젝트에 배정되지 않은 에이전트가 태스크 실행에 참여 가능
- **작업:**
  1. `loadManualProjectAgentScope()` null 체크 추가
  2. auto 모드에서도 `project_agents` 테이블 기반 에이전트 풀 제한 적용
  3. 회귀 테스트 추가

#### [P0-2] OAuth 비밀번호 해싱 취약
- **파일:** `server/oauth/helpers.ts:14`
- **문제:** SHA-256 단순 해시 사용 (salt 없음, KDF 없음) → brute-force 취약
- **작업:**
  1. `crypto.pbkdf2` 또는 `bcrypt` 로 교체
  2. 기존 해시 마이그레이션 스크립트 작성 (기존 사용자 재로그인 유도)

#### [P0-3] API Rate Limiting 전무
- **파일:** `server/app.ts` (미들웨어 등록 위치)
- **문제:** 모든 API 엔드포인트 무제한 요청 가능
- **작업:**
  1. `pnpm add express-rate-limit`
  2. 전역 미들웨어: 100 req/min per IP
  3. 실행 트리거 엔드포인트 (`POST /api/tasks/:id/run`): 10 req/min per user

#### [P0-4] WebSocket 연결 수 무제한
- **파일:** `server/ws/hub.ts`
- **문제:** 클라이언트당 WebSocket 연결 수 제한 없음 → DoS 가능
- **작업:**
  1. 연결 등록 시 IP별 최대 연결 수 체크 (권장: 5개)
  2. 초과 시 코드 `4008` 으로 즉시 close

#### [P0-5] 환경 변수 시작 시 검증 누락
- **파일:** `server/index.ts` (또는 `server/config.ts`)
- **문제:** 필수 환경 변수 (`DATABASE_URL`, `JWT_SECRET` 등) 누락 시 런타임에 에러 발생
- **작업:**
  1. 서버 부팅 시 필수 env 목록 검증하는 `validateEnv()` 함수 추가
  2. 누락 시 명확한 에러 메시지와 함께 `process.exit(1)`

---

### 🟠 P1 — 단기 (1~2주)

#### [P1-1] App.tsx 상태 관리 분리 — Zustand 도입
- **파일:** `src/App.tsx` (현재 461줄, 46개 useState)
- **문제:** prop drilling 3단계+, 에이전트 50+ 시 렌더 성능 저하 예상
- **작업:**
  1. `pnpm add zustand`
  2. 스토어 파일 생성:
     - `src/store/projectStore.ts` — selectedProject, projects, categories
     - `src/store/agentStore.ts` — agents, departments, activeAgent
     - `src/store/taskStore.ts` — tasks, taskBoard, scheduledTasks
     - `src/store/uiStore.ts` — activeView, modals, toasts, commandPalette
  3. App.tsx에서 해당 useState 제거 → 스토어로 교체
  4. 하위 컴포넌트에서 props 대신 `useProjectStore()` 등 직접 구독

#### [P1-2] WorkflowPackKey 완전 제거
- **파일:** 약 20개 파일 (grep: `workflow_pack_key`)
- **문제:** "팩 = 실행 컨텍스트"인지 "카테고리 = 프로젝트 유형"인지 혼동 유발
- **작업:**
  1. DB 마이그레이션: `workflow_pack_key` → `category_id` (FK) 전환
  2. API 응답에서 `workflow_pack_key` 필드 제거 (하위 호환 기간 2주)
  3. 프론트엔드 타입 정의 업데이트 (`src/types/`)
  4. `/api/workflow-packs` 엔드포인트 → `/api/categories` 로 리다이렉트 후 제거

#### [P1-3] 메신저 수신 재시도 로직
- **파일:** `server/modules/messenger/telegram-receiver.ts`, `discord-receiver.ts`
- **문제:** 외부 메신저 API 일시 장애 시 메시지 손실 (재시도 없음)
- **작업:**
  1. exponential backoff 재시도 (최대 3회, 2s→4s→8s)
  2. 실패한 메시지 `dead_letter_queue` 테이블에 보관
  3. 관리자 알림 (시스템 토스트 또는 이메일)

#### [P1-4] DB 마이그레이션 버전 추적
- **파일:** `server/bootstrap/schema/task-schema-migrations.ts` (현재 1,180줄)
- **문제:** 마이그레이션 버전 테이블 없음 → 서버 재시작마다 전체 마이그레이션 재실행 (멱등성 의존)
- **작업:**
  1. `schema_migrations` 테이블 생성 (`version`, `applied_at`)
  2. 각 마이그레이션 블록에 버전 번호 태깅
  3. 이미 적용된 버전 스킵 로직 추가
  4. 마이그레이션 파일을 버전별로 분리 (`migrations/001_initial.sql` 등)

#### [P1-5] In-Memory Map 메모리 누수 방지
- **파일:** `server/ws/hub.ts`, `server/modules/lifecycle.ts`
- **문제:** WebSocket 연결 Map, 실행 중 에이전트 Map이 명시적 cleanup 없음
- **작업:**
  1. 연결 종료 시 Map 항목 삭제 확인 (`onClose` 핸들러)
  2. 24시간 이상 된 stale 항목 주기적 sweep (setInterval)
  3. 메모리 사용량 로깅 추가 (디버그 모드)

#### [P1-6] 구조화 로깅 도입 (pino)
- **파일:** 전체 서버 (`console.log` 약 200+ 곳)
- **문제:** console.log 난발, 프로덕션에서 로그 레벨 제어 불가
- **작업:**
  1. `pnpm add pino pino-pretty`
  2. `server/lib/logger.ts` 생성 (레벨: debug/info/warn/error)
  3. console.log → `logger.info()` 단계적 교체 (핵심 파일부터)
  4. 프로덕션: JSON 출력 / 개발: pino-pretty 컬러 출력

---

### 🟡 P2 — 중기 (3~6주)

#### [P2-1] Agent Flow Graph 구현 🎯 핵심 기능
- **설계 문서:** `docs/strategy/agent-flow-graph-design.md` (완성)
- **목표:** 에이전트 간 관계·태스크 흐름을 실시간 SVG 그래프로 시각화
- **작업:**
  1. 디렉토리 생성: `src/components/flow-graph/`
  2. `AgentFlowGraph.tsx` — SVG 렌더러, 줌/팬 (transform), 노드 클릭
  3. `useFlowLayout.ts` — force-directed 레이아웃 알고리즘 (설계서 3.2절 참조)
  4. `nodes/AgentNode.tsx` — macOS 스타일 노드 (상태별 색상, pulsing dot)
  5. `nodes/TaskNode.tsx` — 태스크 노드 (진행률 바)
  6. `edges/FlowEdge.tsx` — 방향성 엣지 (animated stroke for active)
  7. WebSocket 구독 연결 (기존 `useWebSocket` 재사용)
  8. 사이드바 메뉴 "Flow" 항목으로 진입점 추가
- **예상 작업량:** 3~4주

#### [P2-2] 에이전트 실행 비용 추적
- **관련 화면:** Dashboard, 에이전트 상세
- **작업:**
  1. `task_executions` 테이블에 `tokens_in`, `tokens_out`, `cost_usd` 컬럼 추가
  2. 실행 완료 시 Claude/OpenAI 응답 헤더에서 토큰 수 파싱
  3. 프론트: 에이전트 상세 화면에 "이번 달 비용" 뱃지 추가
  4. Dashboard에 전체 비용 합산 위젯 추가

#### [P2-3] 동시 실행 제한 (FIFO 대기 큐)
- **파일:** `server/modules/workflow/orchestration.ts`
- **문제:** 20개+ 에이전트 동시 실행 시 자원 고갈 위험 (큐 없음)
- **작업:**
  1. `MAX_CONCURRENT_AGENTS` 환경 변수 추가 (기본값: 10)
  2. FIFO 대기 큐 구현 (`server/modules/workflow/agent-queue.ts`)
  3. 큐 대기 중 태스크는 `queued` 상태로 표시
  4. Dashboard에 큐 길이 표시 위젯

#### [P2-4] spawn 시 DB 쿼리 배치화
- **파일:** `server/modules/workflow/orchestration/execution-start-task.ts`
- **문제:** 태스크 실행 시작마다 DB 6회 개별 조회 (Rules, Memory, Hooks, Skills, Agent, Project)
- **작업:**
  1. 단일 JOIN 쿼리로 통합 (또는 Promise.all 병렬화)
  2. 페이로드 빌드 함수 분리 (`buildExecutionPayload()`)
  3. 실행 전 preheat: 프로젝트 선택 시점에 미리 조회해 캐싱

#### [P2-5] 에이전트 타임라인 뷰
- **목표:** 에이전트 상세 화면에 실행 이력을 타임라인 형태로 표시
- **작업:**
  1. `task_logs` 에서 타임스탬프 + 이벤트 타입 파싱
  2. `AgentTimeline.tsx` 컴포넌트 — 수직 타임라인 (시간축, 이벤트 dot)
  3. 이벤트 종류: task_start, hook_run, memory_save, skill_learn, task_done/fail
  4. 에이전트 상세 모달 탭에 "Timeline" 탭 추가

#### [P2-6] 태스크 핸드오프 (에이전트 → 에이전트)
- **목표:** 한 에이전트가 완료한 태스크의 결과를 다른 에이전트에게 자동 전달
- **작업:**
  1. `tasks` 테이블에 `handoff_to_agent_id`, `handoff_condition` 컬럼 추가
  2. 태스크 완료 시 핸드오프 조건 평가 → 후속 태스크 자동 생성
  3. UI: 태스크 생성 폼에 "완료 후 핸드오프" 옵션 추가
  4. Flow Graph에서 핸드오프 엣지 시각화

#### [P2-7] 페르소나 시스템 UI 완성
- **현황:** PersonaCatalog, PersonaCard, PersonaBadge 구현됨 (80%)
- **작업:**
  1. 에이전트 상세 모달에 `PersonaDetailPanel.tsx` 추가
  2. 페르소나 선택 시 "어떤 방식으로 생각하는가" 미리보기 카드 표시
  3. 페르소나 적용 중인 에이전트에 배지 표시 (에이전트 목록)

#### [P2-8] WebSocket broadcast 최적화
- **파일:** `server/ws/hub.ts`
- **문제:** 에이전트 50+ 동시 실행 시 개별 이벤트마다 모든 클라이언트에 broadcast
- **작업:**
  1. 100ms debounce 배치화 (현재 즉시 전송)
  2. 구독 채널 분리: 클라이언트가 관심 있는 에이전트 ID만 구독
  3. 대용량 stdout 청크 분할 전송 (현재 무제한)

---

### 🔵 P3 — 장기 (3개월+)

#### [P3-1] "더 큰 IDE" — Split-Pane Layout
- **설계:** `docs/strategy/bigger-ide-vision.md` Phase 3
- **작업:**
  1. `pnpm add allotment` (또는 `react-resizable-panels`)
  2. IDE처럼 패널 분할 레이아웃: Dashboard + Flow + Tasks + Logs 동시 표시
  3. 패널 크기 사용자 설정 저장 (localStorage)
  4. 단축키로 레이아웃 프리셋 전환 (⌘1~5)

#### [P3-2] Visual Workflow Builder
- **설계:** `docs/strategy/bigger-ide-vision.md` Phase 2
- **작업:**
  1. `pnpm add @xyflow/react`
  2. 노드 기반 워크플로 UI: AgentNode, GateNode, TriggerNode, ConditionNode
  3. 기존 workflow pack 백엔드와 연결
  4. 드래그&드롭으로 에이전트 파이프라인 시각적 구성

#### [P3-3] Keyboard-First UX 완성
- **설계:** `docs/strategy/bigger-ide-vision.md` Phase 3 + `docs/design/AI-GUIDE.md` 섹션 8
- **작업:**
  1. `g f` → Flow Graph 뷰, `g d` → Dashboard, `g t` → Tasks
  2. `j/k` → 리스트 위아래 이동, `Enter` → 선택, `Esc` → 뒤로
  3. `n` → 현재 화면 컨텍스트에 맞는 새 항목 생성
  4. CommandPalette에 최근 실행 명령 히스토리 추가

#### [P3-4] 테스트 커버리지 확대
- **현황:** `src/i18n.test.ts`, `src/hooks/useWebSocket.test.ts` 정도만 존재
- **작업:**
  1. 핵심 백엔드 모듈 단위 테스트: `hook-executor`, `project-scoped-rules`, `persona-catalog`
  2. API 통합 테스트 (`supertest`): 주요 엔드포인트 50개
  3. 프론트 컴포넌트 테스트 (`@testing-library/react`): CommandPalette, AgentFlowGraph
  4. CI 파이프라인 연동 (GitHub Actions): 머지 전 테스트 자동 실행

#### [P3-5] 이상 감지 인덱스 최적화
- **파일:** `server/modules/lifecycle.ts`
- **문제:** 현재 60초 주기로 전체 실행 중 태스크 풀스캔
- **작업:**
  1. `task_executions(status, started_at)` 복합 인덱스 추가
  2. 풀스캔 → 인덱스 기반 최신 N개만 조회로 변경
  3. stalled 감지 임계값 설정 가능하게 (현재 하드코딩 90초)

#### [P3-6] Slack 연동
- **설계:** `docs/strategy/bigger-ide-vision.md`
- **작업:**
  1. `server/modules/messenger/slack-receiver.ts` 신규 구현
  2. Slack Bot Token, Channel 설정 UI 추가
  3. 기존 Telegram/Discord 패턴 재사용

---

### 📊 우선순위 요약

| 코드 | 작업 | 예상 기간 | 임팩트 |
|------|------|---------|--------|
| P0-1 | 미팅 참여자 필터링 버그 | 0.5일 | 🔴 P0 버그 |
| P0-2 | OAuth 해싱 취약 | 1일 | 🔴 보안 |
| P0-3 | Rate Limiting | 0.5일 | 🔴 보안 |
| P0-4 | WebSocket 연결 제한 | 0.5일 | 🔴 보안 |
| P0-5 | 환경 변수 검증 | 0.5일 | 🔴 안정성 |
| P1-1 | Zustand 상태 관리 | 4일 | 성능·개발속도 |
| P1-2 | WorkflowPackKey 제거 | 3일 | 코드 명확성 |
| P1-3 | 메신저 재시도 | 1일 | 안정성 |
| P1-4 | DB 마이그레이션 버전 | 2일 | 안정성 |
| P1-5 | Map 메모리 누수 | 1일 | 안정성 |
| P1-6 | 구조화 로깅 | 2일 | 운영성 |
| P2-1 | Agent Flow Graph | 3~4주 | 🎯 핵심 비전 |
| P2-2 | 실행 비용 추적 | 3일 | 사용성 |
| P2-3 | 동시 실행 큐 | 3일 | 확장성 |
| P2-4 | spawn DB 배치화 | 2일 | 성능 |
| P2-5 | 에이전트 타임라인 | 3일 | 시각화 |
| P2-6 | 태스크 핸드오프 | 4일 | 기능 확장 |
| P2-7 | 페르소나 UI 완성 | 2일 | UI 완성도 |
| P2-8 | WebSocket 최적화 | 2일 | 성능 |
| P3-1 | Split-Pane Layout | 3~4일 | IDE 비전 |
| P3-2 | Visual Workflow Builder | 3~4주 | IDE 비전 |
| P3-3 | Keyboard-First UX | 1주 | UX 완성도 |
| P3-4 | 테스트 커버리지 | 3~4주 | 품질 |
| P3-5 | 이상 감지 최적화 | 1일 | 성능 |
| P3-6 | Slack 연동 | 3일 | 기능 확장 (최후순위) |



---

## 8. 문서 지도

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

## 9. 빠른 시작

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
