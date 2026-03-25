# Orchestration Timeline — UI 설계

> **목적:** 개발자를 위한 멀티 LLM 오케스트레이터 OS의 메인 뷰
> **현황:** Phase 1 구현 완료. WindowType `"tasks"` 사용. Dock 앰버 아이콘 + task badge.
> **원칙:** 프로세스 모니터 > 대시보드. GitHub Actions + htop + CI 파이프라인.
> **Updated:** 2026-03-25

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **정보 밀도** | 장식 최소화, 데이터 최대화 |
| **실시간** | WebSocket 스트리밍. 폴링 없음 |
| **드릴다운** | 한 줄 요약 → 클릭 → 전체 로그/Diff/Reasoning |
| **키보드 중심** | 탭 전환(`0`-`3`), 커맨드(`/`), 내비게이션(`j`/`k`) |
| **터미널 미학** | JetBrains Mono, 어두운 배경, 상태 색상만 강조 |
| **소음 제어** | 에러/대기/현재 선택에만 시각 강조. 동시 강조 금지 |

### 1-1. 3초 스캔 순서

1. **헤더**: 토큰, 비용, 활성 에이전트, 경고
2. **파이프라인 단계**: 현재 프로젝트가 어느 단계인가
3. **활성 포커스**: 실행 중인 태스크와 담당 에이전트
4. **드릴다운**: 로그, diff, reasoning

---

## 2. 전체 레이아웃

```
┌─────────────────────────────────────────────────────────────────────┐
│ ORCHESTRATOR_OS   TOKENS 82k/128k  BUDGET $1.24/$10.0              │
│                   AGENTS 3 Active / 1 Idle          [icons] [!1]   │
├──────┬──────────────────────────────────────────────────────────────┤
│      │                                                              │
│ MEET │                                                              │
│ ──── │                                                              │
│ PLAN │              ACTIVE TAB CONTENT                              │
│ ──── │                                                              │
│ ASGN │     (Timeline / Logs / Agents / Room)                        │
│ ──── │                                                              │
│►EXEC │                                                              │
│ ──── │                                                              │
│ REVW │                                                              │
│      │                                                              │
├──────┴──────────────────────────────────────────────────────────────┤
│  [TIMELINE]    [LOGS]    [AGENTS]    [ROOM]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2-1. 고정 영역

| 영역 | 위치 | 내용 |
|------|------|------|
| **Header** | 상단 | `ORCHESTRATOR_OS` + 토큰/비용/에이전트 카운트 + 알림 아이콘 |
| **Stage Rail** | 좌측 사이드바 | Meeting → Planning → Assigning → Executing → Review (수직) |
| **Tab Bar** | 하단 | `[0] TIMELINE` `[1] LOGS` `[2] AGENTS` `[3] ROOM` |

### 2-2. Header 메트릭

```
ORCHESTRATOR_OS   TOKENS 82k/128k   BUDGET $1.24/$10.0   AGENTS 3 Active / 1 Idle
```

| 메트릭 | 소스 | 설명 |
|--------|------|------|
| `TOKENS` | 프로젝트 누적 | input + output 토큰 합계 / 예산 |
| `BUDGET` | 프로젝트 누적 | 비용 USD / 예산 |
| `AGENTS` | 실시간 | working 수 / idle 수 |

CPU, MEM 등 시스템 리소스는 표시하지 않음. AI 에이전트 오케스트레이터에서 의미 있는 메트릭은 토큰/비용/에이전트 상태.

### 2-3. Stage Rail (좌측 사이드바)

킥오프 파이프라인 단계를 수직으로 표시. 현재 단계 강조.

```
  ⊕ MEETING
  △ PLANNING
  ■ ASSIGNING
 ►■ EXECUTING     ← 현재 단계 (앰버 강조)
  ☐ REVIEW
```

- 완료 단계: 아이콘 채움 + `--th-text-code` (초록)
- 현재 단계: 아이콘 채움 + `--th-accent` (앰버) + 텍스트 강조
- 대기 단계: 아이콘 빈 상태 + `--th-text-muted`
- 프로젝트 리뷰 라운드: `REVIEW (Round 2/3)` 표시

---

## 3. [0] TIMELINE — 메인 운영 뷰

가장 자주 보는 화면. 에이전트별 실시간 작업 흐름 + 태스크 상세.

### 3-1. 좌측: Active Agent Lanes

```
ACTIVE AGENT LANES                              ● CLUSTER_STABLE

┌─ ALPHA_LEAD_ARCHITECT ──────────────────────── SYNCED ─┐
│  ID: AGNT-0882-X                                       │
│  ┌ CURRENT_TASK #402 ───────────────── 82% ─┐          │
│  │ Refactoring Dependency Injection Graph    │          │
│  │ ████████████████████░░░░                  │          │
│  └──────────────────────────────────────────┘          │
│  ↳ NEXT: Unit Test Generation for Core/IO              │
└────────────────────────────────────────────────────────┘

┌─ BRAVO_SR_BACKEND ─────────────────────── EXECUTING ───┐
│  ID: AGNT-1011-B                                       │
│  ┌ CURRENT_TASK #101 ───────────────── 35% ─┐          │
│  │ Schema Validation Logic Implementation    │          │
│  │ ███████░░░░░░░░░░░░░░                    │          │
│  └──────────────────────────────────────────┘          │
│  ↳ NEXT: Migration Script for v4.2.1-stable            │
└────────────────────────────────────────────────────────┘

┌─ CHARLIE_QA_ENGINEER ──────────────────── WATCHING ────┐
│  ID: AGNT-9902-Q                                       │
│  ┌ CURRENT_TASK #88 ────────────────── 12% ─┐          │
│  │ Stress Test: API Rate Limiting Bypass     │          │
│  │ ██░░░░░░░░░░░░░░░░░░                    │          │
│  └──────────────────────────────────────────┘          │
│  ↳ NEXT: Security Audit Report Generation              │
└────────────────────────────────────────────────────────┘
```

**레인 헤더:**
- 에이전트 이름 (대문자, 앰버/초록/흰색)
- ID: `AGNT-XXXX-X` 형식
- 상태 뱃지: `SYNCED` / `EXECUTING` / `WATCHING` / `IDLE` / `STALLED`

**태스크 카드:**
- `CURRENT_TASK #번호` + 진행률 퍼센트
- 태스크 제목
- 프로그레스 바 (앰버)
- `NEXT:` 다음 예정 태스크 (회색, 한 줄)

**상태 색상:**

| 상태 | 색상 | 에이전트 뱃지 |
|------|------|-------------|
| Executing/Working | `--th-accent` (앰버) | `EXECUTING` |
| Synced/Done | `--th-text-code` (초록) | `SYNCED` |
| Watching/Review | 파랑 | `WATCHING` |
| Idle | 회색 | `IDLE` |
| Stalled/Error | 빨강 | `STALLED` |

### 3-2. 우측: Task Inspector

에이전트 레인에서 태스크 클릭 시 우측에 상세 패널 표시.

```
TASK INSPECTOR                    FOCUS: BRAVO_SR_BACKEND
                                  TASK_ID: 101

FILES CHANGED
  ● src/schemas/validation.ts              +142  -0
  ✎ src/core/router.ts                     +12   -4
  ✎ package.json                           +1    -0

CLI HISTORY
  $ npm install zod validator
    added 12 packages, and audited 452 packages...
  $ touch src/schemas/validation.ts
  $ vi src/schemas/validation.ts
    writing 142 lines to validation.ts... done.
  $ tsc --noEmit
    Success: Type check passed (2.4s)
  _

ORCHESTRATION LOGIC
  "The system identified a bottleneck in the current
   JSON parsing layer. Agent BRAVO was instructed to
   implement Zod-based schema validation to prevent
   malformed telemetry data from corrupting the Stage
   Rail sequence."
```

**Inspector 섹션:**

| 섹션 | 내용 |
|------|------|
| **FILES CHANGED** | 변경 파일 목록 + diff 요약 (`+N -N`) |
| **CLI HISTORY** | 에이전트가 실행한 터미널 명령과 출력 |
| **ORCHESTRATION LOGIC** | PM이 이 태스크를 배정한 이유, 판단 근거 |

---

## 4. [1] LOGS — 디버그 콘솔

에이전트 실행 로그 실시간 스트림. 에러 우선 모드.

### 4-1. 레이아웃

```
┌─ 좌측 사이드바 ──────┬─ 로그 스트림 ──────────────────────────────┐
│                      │                                            │
│ ACTIVE_AGENTS        │ ERROR_FIRST_MODE: ON  LEVEL: ALL           │
│                      │                              AUTO_SCROLL ■ │
│ ● BRAVO      [1]     │                                            │
│ ● CHARLIE            │ ┌─[CRITICAL_SEQUENCE_FAILURE]──── T-04:12─┐│
│ ○ ALPHA              │ │ 10:42:12 [ERROR] BRAVO:                 ││
│                      │ │   'zod' is not defined @ runtime:142:9  ││
│                      │ │ 10:42:13 [SYSTEM]                       ││
│                      │ │   Initiating recovery hook for BRAVO... ││
│                      │ └─────────────────────────────────────────┘│
│                      │                                            │
│                      │ 10:42:15 [INFO] CHARLIE                    │
│                      │   Parsing orchestration manifest... OK     │
│                      │ 10:42:16 [INFO] CHARLIE                    │
│                      │   Executing plan step: FETCH_REMOTE_ASSETS │
│                      │ 10:42:19 [PLAN] BRAVO                      │
│                      │   RETRY_ATTEMPT 1/3: Re-importing core...  │
│                      │ 10:42:28 >_ STREAM_IDLE_AWAITING_BUFFER... │
├──────────────────────┴────────────────────────────────────────────┤
│ / Global search or command... (e.g. /filter BRAVO error)          │
│                                            [EXECUTE]  [CLEAR]     │
└───────────────────────────────────────────────────────────────────┘
```

### 4-2. 기능

| 기능 | 설명 |
|------|------|
| **ERROR_FIRST_MODE** | 에러/크리티컬 로그를 상단에 고정 표시 |
| **LEVEL 필터** | ALL / ERROR / WARN / INFO / DEBUG |
| **에이전트 필터** | 좌측 에이전트 목록 클릭으로 필터링. `[1]` = 에러 카운트 뱃지 |
| **AUTO_SCROLL** | 최신 로그 자동 스크롤 토글 |
| **Command Bar** | `/filter BRAVO error`, `/jump task:101`, `/retry` 등 명령 |

### 4-3. 로그 포맷

```
HH:MM:SS [LEVEL] AGENT_NAME  메시지 내용
```

| 레벨 | 색상 |
|------|------|
| `[ERROR]` | 빨강 배경 하이라이트 |
| `[WARN]` | 앰버 텍스트 |
| `[INFO]` | 초록 텍스트 |
| `[DEBUG]` | `--th-text-muted` |
| `[PLAN]` | 앰버 텍스트 |
| `[SYSTEM]` | 파랑 텍스트 |

### 4-4. 메트릭 바 (LOGS 탭 상단)

```
TOKEN_THROUGHPUT 1.2M/hr    ERR_RATE_24H 0.04%    ACTIVE_THREADS 14 Active
```

---

## 5. [2] AGENTS — 팀 관리 뷰

참여 에이전트 전체 상태, fitness, 현재 작업을 테이블로 표시.

### 5-1. 레이아웃

```
TEAM_AGENTS
ACTIVE INSTANCES: 03 / TOTAL NODES: 12

              [+ DEPLOY NEW AGENT]  [EXPORT_LOGS.CSV]

TOKEN_THROUGHPUT  1.2M/hr       COST_EFFICIENCY  0.002$/1k
████████████░░░░░░░░░░░░░░░░    ████████████████████████████████

AGENT / IDENTITY      ROLE / DOMAIN     STATUS    CURRENT_PROCESS          FITNESS_METRICS    ACTION
─────────────────────────────────────────────────────────────────────────────────────────────────────
A  ALPHA_NODE         PROJECT MANAGER   ● WORKING Orchestrating Sprint...  DEV: 95%            ⋮
   ID: 0x882A-PM                                  ██████████████████░░     SEC: 92%

B  BRAVO_NODE         BACKEND ENG       ● REVIEW  Refactoring Postgres...  DEV: 92%            ⋮
   ID: 0x442C-BE                                  ████████████████████     SEC: 88%

C  CHARLIE_NODE       SYSTEM ADMIN      ○ IDLE    No active task in queue  DEV: 85%            ⋮
   ID: 0x110F-SYS                                 ░░░░░░░░░░░░░░░░░░░░    SEC: 72%
```

### 5-2. 테이블 컬럼

| 컬럼 | 설명 |
|------|------|
| **AGENT / IDENTITY** | 아바타 이니셜 + 이름 + ID |
| **ROLE / DOMAIN** | 역할 뱃지 (PROJECT MANAGER / BACKEND ENG / SYSTEM ADMIN 등) |
| **STATUS** | `● WORKING` (앰버) / `● REVIEW` (파랑) / `○ IDLE` (회색) |
| **CURRENT_PROCESS** | 현재 태스크 제목 + 프로그레스 바 |
| **FITNESS_METRICS** | task_type별 성공률 (DEV: 95%, SEC: 92% 등) |
| **ACTION** | `⋮` 컨텍스트 메뉴 (Stop, Reassign, View Logs, etc.) |

### 5-3. 메트릭 바 (CPU/MEM 제외)

| 메트릭 | 설명 |
|--------|------|
| `TOKEN_THROUGHPUT` | 시간당 토큰 처리량 |
| `COST_EFFICIENCY` | 1k 토큰당 비용 |

---

## 6. [3] ROOM — 협업 + Reasoning 뷰

에이전트 간 통신 로그와 PM 판단 로직을 한 화면에서 추적.

### 6-1. 레이아웃 (2분할)

```
┌─ COMM_CHANNEL://TEAM_ROOM ● PEERS:04 ─┬─ LOGIC_VIEW://REASONING_TREE ──┐
│                              LAT:14ms  │                                 │
│ [SYSTEM_EVT] Agent_0x42 initiated      │ MISSION_OBJECTIVE               │
│   Mission: "Add Zod Validation"  14:02 │ ┌─────────────────────────────┐ │
│                                        │ │ ADD_ZOD_VALIDATION  ACTIVE  │ │
│ PM_LEAD @Instruction                   │ │ STATUS: SCHEMA_IMPL         │ │
│ ┌────────────────────────────────────┐ │ │ PROGRESS: 62.4%             │ │
│ │ Implement comprehensive Zod       │ │ └─────────────────────────────┘ │
│ │ schema validation for all API     │ │                                 │
│ │ routes in the auth-module.        │ │ ✓ ROUTE ANALYSIS                │
│ └────────────────────────────────────┘ │   12 endpoints identified      │
│                                        │                                 │
│ [SUCCESS] Route Analysis completed.    │ ● SCHEMA IMPLEMENTATION         │
│   Found 12 vulnerable endpoints.      │   ··· auth_schema.ts  ████░     │
│                                        │   ··· user_schema.ts  ████████  │
│ DEV_AGENT_ZETA @Status                 │                                 │
│ ┌────────────────────────────────────┐ │ ○ INTEGRATION TESTING           │
│ │ Parsing `auth.routes.ts`.         │ │   Waiting for dependency        │
│ │ Mapping to `z.object` defs.       │ │                                 │
│ │ ████████████████████░░░░░         │ │ ○ PRODUCTION PUSH               │
│ └────────────────────────────────────┘ │                                 │
│                                        │ ACTIVE_DEPENDENCIES             │
│ [BLOCKER] Inconsistent interface       │ ┌ Lib: Zod@3.22      READY  ┐ │
│   detected in `user.service.ts` ln44   │ │ Mod: User_Svc    CONFLICT │ │
│                                        │ │ Env: Staging       LOCKED  │ │
│ QA_BOT_01 @Peer-Review                 │ └───────────────────────────┘ │
│ ┌────────────────────────────────────┐ │                                 │
│ │ Dependency conflict in proposed   │ │                                 │
│ │ schema. UserRoles enum must match │ │                                 │
│ │ Prisma client definitions.        │ │                                 │
│ └────────────────────────────────────┘ │                                 │
├────────────────────────────────────────┴─────────────────────────────────┤
│ >_ ENTER COMMAND OR MESSAGE...               [ESC: CANCEL] [ENTER: SEND]│
└─────────────────────────────────────────────────────────────────────────┘
```

### 6-2. 좌측: Communication Feed

에이전트 간 메시지, 시스템 이벤트, PM 지시를 시간순으로 표시.

| 메시지 타입 | 스타일 |
|------------|--------|
| `[SYSTEM_EVT]` | 파랑 텍스트, 라벨 |
| `PM_LEAD @Instruction` | 빨강 이름, 카드형 본문 |
| `[SUCCESS]` | 초록 라벨 |
| `[BLOCKER]` | 빨강 배경 하이라이트 |
| `DEV_AGENT @Status` | 앰버 이름, 프로그레스 바 포함 |
| `QA_BOT @Peer-Review` | 흰색 이름, 카드형 본문 |

### 6-3. 우측: Reasoning Tree (Logic View)

현재 미션의 논리적 진행 상태를 트리 형태로 표시.

| 섹션 | 내용 |
|------|------|
| **MISSION_OBJECTIVE** | 현재 프로젝트/태스크 그룹의 목표 + 진행률 |
| **단계 트리** | 하위 작업 단계별 상태 (done/running/waiting/pending) |
| **ACTIVE_DEPENDENCIES** | 외부 의존성 상태 (READY/CONFLICT/LOCKED) |

---

## 7. 인터랙션 및 단축키

### 7-1. 전역

| 키 | 동작 |
|----|------|
| `0`-`3` | 탭 즉시 전환 |
| `/` | Command Bar 포커스 |
| `Esc` | 포커스 해제 / 메인 복귀 |

### 7-2. Timeline 탭

| 키 | 동작 |
|----|------|
| `j` / `k` | 에이전트/태스크 이동 |
| `Enter` | Task Inspector 열기/닫기 |
| `o` | 선택 에이전트 CLI Window 열기 |
| `r` | 실패 태스크 재시도 |
| `d` | diff 포커스 |
| `l` | CLI 로그 포커스 |

### 7-3. 소음 제어

- 자동 애니메이션: running, stalled, error만 허용
- pulse: 화면당 최대 3개
- 선택 상태는 배경 대비로 표현, 상태 색과 경쟁 금지
- 비활성 탭은 WS 구독 최소화

---

## 8. 상태 아이콘

| 아이콘 | 의미 | 색상 | 애니메이션 |
|--------|------|------|-----------|
| `●` | Running | 앰버 | Soft pulse |
| `○` | Idle/Planned | 회색 | None |
| `✓` | Done | 초록 | Fade-in |
| `✗` | Failed | 빨강 | Single shake |
| `◐` | Review | 파랑 | None |

---

## 9. 데이터 흐름

### 9-1. 초기 로드 (REST)

```
GET /api/tasks?project_id=X        → 태스크 목록
GET /api/agents                     → 에이전트 + fitness
GET /api/subtasks?project_id=X      → 서브태스크
GET /api/projects/:id/cost-summary  → 토큰/비용 메트릭
```

### 9-2. 실시간 (WebSocket)

| 이벤트 | 탭 | 용도 |
|--------|---|------|
| `task_update` | Timeline, Agents | 태스크 상태/진행률 |
| `agent_status` | Timeline, Agents | 에이전트 상태 |
| `cli_output` | Timeline(Inspector), Logs | CLI 실시간 출력 |
| `kickoff_stage` | Stage Rail | 파이프라인 단계 전환 |
| `subtask_update` | Timeline | 서브태스크 상태 |
| `task_report` | Timeline(Inspector) | 완료 리포트 |

### 9-3. 클라이언트 파생 상태

- 활성 에이전트 수 (agents.filter working)
- 에러율 (task_logs error count / total)
- 토큰 처리량 (cost-summary delta / time)
- stalled 후보 (heartbeat 기반)

---

## 10. 구현 마일스톤

| Phase | 내용 | 상태 |
|-------|------|------|
| **1** | 레이아웃 (Header + Stage Rail + Tab Bar + 탭 전환) + 4탭 초기 UI | COMPLETED |
| **2** | Timeline (Agent Lanes + Task Inspector) 실데이터 연동 | Not Started |
| **3** | Logs (에러 우선 모드 + 에이전트 필터 + Command Bar) 실데이터 연동 | Not Started |
| **4** | Agents (팀 테이블 + fitness + 메트릭) 실데이터 연동 | Not Started |
| **5** | Room (Communication Feed + Reasoning Tree) 실데이터 연동 | Not Started |

### Phase 1 구현 파일 구조

```
src/components/orchestration/
├── OrchestrationWindow.tsx      ← AppWindow wrapper, WindowType "tasks"
├── MetricsHeader.tsx            ← TOKENS/BUDGET/AGENTS metrics bar
├── StageRail.tsx                ← Left sidebar pipeline stages (Meeting→Planning→Assigning→Executing→Review)
├── TabBar.tsx                   ← Bottom 4-tab bar (keyboard 0-3 switching)
└── tabs/
    ├── TimelineTab.tsx          ← Agent Lanes with progress bars
    ├── LogsTab.tsx              ← Error-first log stream + command bar
    ├── AgentsTab.tsx            ← Team table with fitness metrics
    └── RoomTab.tsx              ← Communication feed + Reasoning Tree
```

- Dock: 앰버 아이콘 + task badge
- Desktop: `openWindows.has("tasks")` → `OrchestrationWindow` 렌더링

### 구현 우선순위

1. **Timeline이 최우선** — 개발자가 가장 자주 보는 화면
2. **Logs** — 에러 디버깅은 핵심 워크플로우
3. **Agents** — 팀 상태 확인은 보조적
4. **Room** — 협업 로그 + reasoning은 고도화 단계

---

## 11. 디자인 레퍼런스

목업 이미지:

- `docs/design/Orchestration-Timeline.png` — Timeline 탭
- `docs/design/Orchestration-AGENTLOGS.png` — Logs 탭
- `docs/design/Orchestration-agent.png` — Agents 탭
- `docs/design/Orchestration-room.png` — Room 탭

---

## 12. 관련 문서

- [DESIGN.md](DESIGN.md) — CSS 변수, 컴포넌트 스타일
- [UI-SCREENS.md](UI-SCREENS.md) — 전체 화면 스펙
- [PM-WORKFLOW-SPEC.md](../strategy/PM-WORKFLOW-SPEC.md) — PM 오케스트레이션 흐름
- [websocket-protocol.md](../specs/websocket-protocol.md) — WebSocket 이벤트 목록
