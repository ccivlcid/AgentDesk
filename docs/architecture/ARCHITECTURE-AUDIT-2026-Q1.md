# AgentDesk 아키텍처 감사 보고서

**작성일:** 2026-03-11
**버전:** AgentDesk 2.0.1
**분석 범위:** 프론트엔드 + 백엔드 + DB + 에이전트 실행 엔진
**UX 감사:** 별도 문서 참조 (`docs/design/ux-audit-2026-q1.md`)

---

## 목차

1. [현재 아키텍처 개요](#1-현재-아키텍처-개요)
2. [문제점 분석](#2-문제점-분석)
3. [아키텍처 개선 방향](#3-아키텍처-개선-방향)
4. [플랫폼 로드맵](#4-플랫폼-로드맵)
5. [즉시 처리 권고](#5-즉시-처리-권고)

---

## 1. 현재 아키텍처 개요

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│              Browser / Electron (Desktop)               │
├─────────────────────────────────────────────────────────┤
│  React 19 + TypeScript                                  │
│  ├─ App.tsx          최상위 상태 관리 (useState × 14)    │
│  ├─ AppMainLayout    레이아웃 + 뷰 라우팅                │
│  ├─ api/             HTTP 클라이언트 레이어              │
│  └─ hooks/           WebSocket + 폴링                   │
└───────────────┬─────────────────────────────────────────┘
                │  HTTP /api/* + WebSocket ws://
┌───────────────▼─────────────────────────────────────────┐
│  Express 5 (Port 8790)                                  │
│  ├─ routes/core/     agents, tasks, projects, categories│
│  ├─ routes/ops/      memory, hooks, skills, terminal    │
│  ├─ workflow/        프롬프트 빌드 + 실행 컨텍스트       │
│  └─ gateway/client   외부 AI 제공자 통신                │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  SQLite (agentdesk.sqlite)                              │
│  ├─ 기존: departments, agents, tasks, messages          │
│  └─ 2.0: categories, projects, objectives/risks/gates   │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Agent Execution Layer                                  │
│  ├─ CLI 에이전트: child_process.spawn() (로컬)          │
│  └─ API 에이전트: HTTP (Claude API, OpenAI 등)          │
└─────────────────────────────────────────────────────────┘
```

### 1.2 데이터 모델 계층

```
Organization
└── Department (부서)
    └── Agent (에이전트)
        ├── cli_provider: claude | codex | gemini | api | ollama ...
        ├── persona_id: structured | creative | analytical ...
        └── role: team_leader | senior | junior | intern

Category (프로젝트 타입 템플릿)
└── Project (프로젝트)
    ├── project_path (필수 — 에이전트 실행 경로)
    ├── project_agents (팀 멤버)
    ├── project_objectives (목표)
    ├── project_risks (리스크)
    ├── project_gates (검토 단계)
    └── project_outputs (결과물)

Task (태스크)
├── project_id → Project
├── assigned_agent_id → Agent
└── execution_sessions (실행 기록)
```

### 1.3 에이전트 실행 흐름

```
POST /api/tasks/:id/run
        │
        ▼
에이전트 할당 (auto-assign or direct)
        │
        ▼
프롬프트 빌드
├── 워크플로우 팩 가이던스
├── 페르소나 블록
├── 사용 가능한 스킬 목록
└── 프로젝트 컨텍스트 (project_path, git 히스토리)
        │
        ▼
실행 선택
├── CLI: child_process.spawn() → stdout 스트리밍
└── API: HTTP POST → 스트리밍 응답
        │
        ▼
appendTaskLog() → task_logs 테이블
broadcast('cli_output') → WebSocket → TerminalPanel
        │
        ▼
완료: task.status = 'done' | 'failed'
broadcast('task_update')
```

### 1.4 실시간 동기화 전략

| 메커니즘 | 파일 | 용도 |
|---------|------|------|
| WebSocket (push) | `useRealtimeSync.ts` | task_update, cli_output, agent_status |
| Polling (pull) | `usePolling.ts` | 상태 폴백 |
| Live Sync Scheduler | `useLiveSyncScheduler.ts` | 주기적 전체 동기화 |

---

## 2. 문제점 분석

### 🔴 Critical — 확장성 한계

#### [A1] App.tsx 단일 상태 모노리스

**위치:** `src/App.tsx`

```typescript
// 현재: 모든 비즈니스 상태가 최상위에 집중
const [departments, setDepartments] = useState<Department[]>([]);
const [agents, setAgents] = useState<Agent[]>([]);
const [tasks, setTasks] = useState<Task[]>([]);
const [projects, setProjects] = useState<Project[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
// ... + 9개 더
```

**문제:**
- 어떤 하위 컴포넌트 상태 변경이라도 App.tsx → 전체 트리 리렌더 유발
- 에이전트/프로젝트/태스크 수 증가 시 성능 저하 가속
- `useAppActions.ts`에 모든 비즈니스 로직 응집 → 단위 테스트 불가
- 상태 추가 시 prop-drilling 깊이 증가

**영향도:** 프로젝트/에이전트 수 50+ 이상에서 체감 성능 저하

---

#### [A2] SQLite 단일 노드

**위치:** `server/db/runtime.ts`

**문제:**
- 동시 쓰기 제한 (WAL 모드에서도 단일 writer)
- 멀티 사용자/팀 협업 구조적으로 불가
- DB 파일 직접 노출 (백업 전략 없음)
- 수평 확장 불가능

**영향도:** 팀 단위 사용 시 즉시 한계 도달

---

#### [A3] 에이전트 실행 — 프로세스 직접 스폰

**위치:** `server/modules/routes/core/agents/spawn.ts`, `execution-run.ts`

**문제:**
- 에이전트 크래시 → task.status 영구 `"running"` 상태 잔존 가능
- 재시도/타임아웃 메커니즘 없음
- 여러 태스크 동시 실행 시 경합 조건 가능성
- 프로세스 고아(orphan) 발생 시 정리 로직 미흡

**영향도:** 장시간 운영 시 좀비 태스크 누적

---

### 🟠 High — 개념적 부채

#### [A4] WorkflowPackKey 잔존 (20개 파일)

**현황:**
```
Office Pack 제거 선언 (Phase 5 완료) ✓
그러나 DB 필드/API 타입으로 WorkflowPackKey 잔존 (20개 파일)
AgentManager: isIsolatedPack = false 하드코딩
```

**문제:**
- "팩 = 실행 컨텍스트"인지 "카테고리 = 프로젝트 타입"인지 이중 모델 혼재
- 신규 개발자 온보딩 시 혼란 유발
- 향후 기능 추가 시 어느 쪽에 붙어야 할지 불명확

---

#### [A5] 프로젝트 스코핑 불완전

**현황:**
```
project_agents  ✓ 구현됨 (팀 멤버 관리)
project_memory  ✗ 미구현 (전체 에이전트 글로벌 공유)
project_rules   ✗ 미구현 (전체 에이전트 글로벌 공유)
project_hooks   ✗ 미구현 (전체 에이전트 글로벌 공유)
project_skills  ✗ 미구현 (전체 에이전트 글로벌 공유)
```

**문제:**
- "Project OS" 비전과 달리, 프로젝트는 태스크 분류 레이블에 불과한 상태
- 에이전트가 프로젝트 A에서 학습한 내용이 프로젝트 B 실행에 영향
- 프로젝트 간 컨텍스트 오염 가능성

---

#### [A6] 실시간 동기화 전략 혼재

**문제:**
- WebSocket + Polling + LiveSyncScheduler 세 가지 동시 운용
- 동일 데이터에 대해 여러 채널에서 업데이트 도착 시 경쟁 조건
- 어느 채널이 정답인지 명확한 우선순위 정책 없음

---

### 🟡 Medium — 관찰가능성 부재

#### [A7] 에이전트 실행 블랙박스

**현황:**
- `task_logs` 테이블: raw stdout만 저장
- 에이전트가 어떤 파일을 수정했는지, 어떤 명령어를 실행했는지 구조적으로 추적 불가
- 에이전트 간 협업 흐름(task handoff) 가시성 없음
- 실행 비용(토큰 × 가격) 집계 없음

#### [A8] 에러 처리 비일관성

**패턴:**
```typescript
// 현재 코드 전반에 이 패턴 다수
someApi().catch(() => {})          // 에러 삼킴
someApi().catch(console.error)     // 로그만, 사용자 피드백 없음
```

- 백엔드 에러 응답 구조 비표준화
- 프론트에서 파싱 불가 → 일반적 에러 메시지 표시
- 에러 로그 집계 없음

---

## 3. 아키텍처 개선 방향

### Phase A — 상태 관리 재설계

**목표:** App.tsx 단일 모노리스 → 도메인별 독립 스토어

**권장 스택:** Zustand (React 19 호환, 최소 보일러플레이트)

```
현재:
App.tsx (모든 상태 + 비즈니스 로직)

목표:
projectStore   → 현재 프로젝트, 선택, 목표/리스크/게이트
agentStore     → 에이전트 목록, 실행 상태, 팀 구성
taskStore      → 태스크 CRUD, 실행 세션
uiStore        → view, modal, overlay, notification
categoryStore  → 카테고리 + 버전
```

**기대 효과:**
- 컴포넌트별 필요한 스토어만 구독 → 불필요한 리렌더 제거
- 스토어 단위 단위 테스트 가능
- DevTools로 상태 변화 디버깅

---

### Phase B — 에이전트 실행 엔진 강화

**목표:** 직접 프로세스 스폰 → 상태 머신 + 실행 큐

```
현재:
request → spawn() → WebSocket broadcast → done

목표:
request → ExecutionQueue
              │
              ▼
           Worker (상태 머신)
           ├── QUEUED      대기열
           ├── STARTING    프로세스 초기화
           ├── RUNNING     실행 중 (heartbeat)
           ├── PAUSED      일시정지
           ├── DONE        완료
           ├── FAILED      실패 (에러 + 재시도 여부)
           └── TIMED_OUT   타임아웃 초과
```

**추가 구현 항목:**
- `execution_sessions` 테이블 상태 머신 필드 추가
- 태스크 단위 타임아웃 정책 설정 (`timeout_minutes`)
- 에이전트 heartbeat (30초 간격) → 응답 없으면 FAILED 전환
- 크래시 감지 → 자동 상태 복구 (`RUNNING` → `FAILED`)
- 동시 실행 제한 (에이전트당 max 1 active task)

---

### Phase C — 프로젝트 컨텍스트 완전 분리

**목표:** 프로젝트가 독립된 실행 컨텍스트

**추가 DB 스키마:**

```sql
-- 프로젝트 스코프 메모리
CREATE TABLE project_memory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_id TEXT REFERENCES agents(id),  -- NULL = 프로젝트 공용
  content TEXT NOT NULL,
  tags TEXT,  -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 스코프 규칙
CREATE TABLE project_rules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_id TEXT REFERENCES agents(id),
  rule TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 프로젝트 스코프 스킬
CREATE TABLE project_skills (
  project_id TEXT NOT NULL REFERENCES projects(id),
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (project_id, skill_id)
);

-- 프로젝트 변수 / 컨텍스트
CREATE TABLE project_context (
  project_id TEXT NOT NULL REFERENCES projects(id),
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (project_id, key)
);
```

**에이전트 실행 시 컨텍스트 우선순위:**
```
project_rules  > agent_rules  > global_rules
project_memory > agent_memory > global_memory
project_skills (활성화된 것만 사용)
```

---

### Phase D — 관찰가능성 레이어

**목표:** 에이전트 실행 내부를 구조적으로 추적

**AgentTrace 모델:**
```sql
CREATE TABLE agent_traces (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  span_type TEXT NOT NULL,
  -- 'thinking' | 'tool_call' | 'file_write' | 'git_commit'
  -- | 'message' | 'api_call' | 'error'
  input_json TEXT,
  output_json TEXT,
  duration_ms INTEGER,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**대시보드 추가 뷰 — 에이전트 타임라인:**
```
[프로젝트 타임라인]
  ── Alice (claude)
     10:00  thinking      "분석 중..."
     10:01  file_write    src/components/Button.tsx (+45 lines)
     10:02  git_commit    "feat: add Button component"
     10:03  message       → Bob: "PR 리뷰 요청"
     총: 3분 12초 | 2,341 토큰 | $0.023

  ── Bob (codex)
     10:04  thinking      "리뷰 중..."
     ...
```

---

### Phase E — 동기화 전략 단일화

**목표:** WebSocket primary + HTTP fallback 구조

```
현재: WebSocket + Polling + LiveSyncScheduler (3중 채널)

목표:
Primary:  WebSocket (push)
           └── 모든 실시간 이벤트 (task, agent, message, cli_output)
Fallback: HTTP polling (30초 간격)
           └── WebSocket 연결 끊김 감지 시에만 활성화
Remove:   LiveSyncScheduler (WebSocket으로 흡수)
```

**이벤트 버전 관리:**
```typescript
// 각 이벤트에 sequence number 추가
{ type: 'task_update', seq: 1042, payload: {...} }
// 클라이언트: seq gap 감지 → 선택적 HTTP 재동기화
```

---

## 4. 플랫폼 로드맵

### v2.1 — 안정화 (단기, ~4주)

| 항목 | 설명 | 공수 |
|------|------|------|
| WorkflowPackKey 완전 제거 | `task.workflow_pack_key` → `task.context_hint` | 1일 |
| API 에러 핸들링 통일 | `ApiError` 클래스 + 프론트 토스트 연동 | 2일 |
| 동기화 전략 단일화 | WebSocket primary, polling fallback | 2일 |
| project_path 검증 API | 서버에서 경로 존재 여부 확인 엔드포인트 | 1일 |
| 실행 상태 정합성 보정 | 서버 재시작 시 `RUNNING` → `FAILED` 자동 전환 | 1일 |

---

### v2.2 — 실행 엔진 강화 (중기, ~6주)

| 항목 | 설명 | 공수 |
|------|------|------|
| 에이전트 실행 상태 머신 | QUEUED → RUNNING → DONE/FAILED/TIMED_OUT | 3일 |
| 실행 타임아웃 정책 | 태스크 단위 `timeout_minutes` 설정 | 1일 |
| 에이전트 heartbeat | 30초 간격 ping → 응답 없으면 FAILED | 2일 |
| 실행 비용 추적 | 토큰 × 가격 테이블 → 프로젝트별 비용 집계 | 2일 |
| 동시 실행 제한 | 에이전트당 max 1 active task 강제 | 1일 |

---

### v2.3 — Project OS 완성 (중기, ~8주)

| 항목 | 설명 | 공수 |
|------|------|------|
| 프로젝트 스코핑 완성 | project_memory / rules / hooks / skills 분리 | 5일 |
| App.tsx → Zustand 분리 | 도메인별 스토어 4개 | 4일 |
| 프로젝트 템플릿 | 카테고리 → objectives/gates 자동 생성 | 2일 |
| 에이전트 타임라인 뷰 | AgentTrace 기반 실행 가시화 | 3일 |
| 태스크 핸드오프 | A 완료 → B 자동 시작 (dependency chain) | 3일 |

---

### v3.0 — 협업 & 멀티테넌트 (장기, ~3개월)

| 항목 | 설명 |
|------|------|
| SQLite → PostgreSQL | 다중 사용자, 동시성, 수평 확장 |
| 팀 워크스페이스 | Organization → Teams → Projects 계층 |
| AgentDesk API | 외부에서 에이전트 실행 트리거 (REST/Webhook) |
| 에이전트 마켓플레이스 | 커뮤니티 에이전트 공유 + 설치 |
| 웹 버전 분리 | Electron 없이 브라우저만으로 사용 |

---

### v3.x — AI 인프라 플랫폼 (비전)

| 항목 | 설명 |
|------|------|
| 오케스트레이션 DSL | `project.agents.filter(role='senior').run(task, parallel=true)` |
| 실행 히스토리 기반 추천 | 과거 패턴으로 최적 에이전트 자동 배정 |
| 멀티클라우드 라우팅 | Claude / GPT-4 / Gemini 동적 선택 (비용 + 성능 최적화) |
| 자동 워크플로우 최적화 | 실행 패턴 학습 → 병렬화 제안 |

---

## 5. 즉시 처리 권고

**ROI 순 우선순위:**

| 우선순위 | 항목 | 이유 | 공수 |
|---------|------|------|------|
| **P0** | 실행 상태 정합성 보정 | 좀비 태스크 방지, 즉시 안정성 향상 | 1일 |
| **P0** | API 에러 핸들링 통일 | 사용자 신뢰도 직결 | 2일 |
| **P1** | 에이전트 실행 상태 머신 | 크래시 → 무한 "실행중" 완전 방지 | 3일 |
| **P1** | 동기화 전략 단일화 | WebSocket 신뢰성 + 코드 단순화 | 2일 |
| **P2** | WorkflowPackKey 완전 제거 | 개념 혼동 제거, 기술 부채 청산 | 1일 |
| **P2** | 프로젝트 스코핑 완성 | "Project OS" 핵심 가치 실현 | 5일 |
| **P3** | App.tsx → Zustand 분리 | 성능 + 장기 유지보수성 | 4일 |

---

## 부록 — 핵심 파일 참조

| 역할 | 경로 |
|------|------|
| 앱 상태 관리 | `src/App.tsx` |
| 비즈니스 로직 | `src/app/useAppActions.ts` |
| 초기 데이터 로드 | `src/app/useAppBootstrapData.ts` |
| 실시간 동기화 | `src/app/useRealtimeSync.ts` |
| HTTP 레이어 | `src/api/core.ts` |
| 에이전트 실행 | `server/modules/routes/core/tasks/execution-run.ts` |
| 프로세스 스폰 | `server/modules/routes/core/agents/spawn.ts` |
| DB 스키마 | `server/modules/bootstrap/schema/base-schema.ts` |
| WebSocket | `src/hooks/useWebSocket.ts` |
| 타입 정의 | `src/types/index.ts` |
