# AgentDesk 아키텍처 감사 보고서

**작성일:** 2026-03-11 | **업데이트:** 2026-03-13
**버전:** AgentDesk 2.0.1
**분석 범위:** 프론트엔드 + 백엔드 + DB + 에이전트 실행 엔진
**에이전트 실행 성능 감사:** 별도 문서 참조 (`docs/strategy/agent-performance-audit.md`)

---

## 목차

1. [종합 평가](#1-종합-평가)
2. [현재 아키텍처 개요](#2-현재-아키텍처-개요)
3. [백엔드 엔진 강점](#3-백엔드-엔진-강점)
4. [문제점 분석](#4-문제점-분석)
5. [아키텍처 개선 방향](#5-아키텍처-개선-방향)
6. [플랫폼 로드맵](#6-플랫폼-로드맵)
7. [즉시 처리 권고](#7-즉시-처리-권고)
8. [부록 — 추가 발견사항](#8-부록--추가-발견사항)

---

## 1. 종합 평가

```
백엔드 엔진 상태 (2026-03-13 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
아키텍처 설계         ██████████████████░░ 90%
보안                 ████████████████░░░░ 80%
데이터베이스          ██████████████░░░░░░ 70%
에러 처리            ██████████████░░░░░░ 70%
테스트 커버리지       ████████████░░░░░░░░ 60%
코드 모듈화          ██████████░░░░░░░░░░ 50%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
종합                 ██████████████░░░░░░ ~70%
```

**한마디**: 핵심 기능은 견고하지만, **거대 파일 분리**, **SQL 안전성**, **에러 처리 체계화**에서 개선이 필요하다.

---

## 2. 현재 아키텍처 개요

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│              Browser / Electron (Desktop)               │
├─────────────────────────────────────────────────────────┤
│  React 19 + TypeScript                                  │
│  ├─ App.tsx          최상위 상태 관리 (useState × 40)    │
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

### 2.2 데이터 모델 계층

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

### 2.3 에이전트 실행 흐름

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

### 2.4 실시간 동기화 전략

| 메커니즘 | 파일 | 용도 |
|---------|------|------|
| WebSocket (push) | `useRealtimeSync.ts` | task_update, cli_output, agent_status |
| Polling (pull) | `usePolling.ts` | 상태 폴백 |
| Live Sync Scheduler | `useLiveSyncScheduler.ts` | 주기적 전체 동기화 |

---

## 3. 백엔드 엔진 강점

### 3-1. Deferred Runtime Proxy 패턴 — 우수

`server/modules/deferred-runtime.ts`

- 초기화 시점에 아직 없는 함수를 Proxy로 지연 참조 → 순환 의존성 없이 모듈 간 크로스 참조 해결
- 미해결 함수가 있으면 서버 시작 시점에 즉시 에러 발생 (`assertRuntimeFunctionsResolved()`)
- 200개+ 함수의 지연 바인딩 + 검증을 깔끔하게 구현. **변경 불필요.**

### 3-2. 보안 미들웨어 — 양호

`server/security/auth.ts` (222줄)

- `timingSafeEqual()` — 타이밍 공격 방지
- CSRF 토큰: SHA-256 해시 기반 생성/검증 (execution-control.ts에 적용)
- CORS: `isTrustedOrigin()` + 허용 도메인 리스트 + suffix 매칭
- 쿠키: `HttpOnly`, `SameSite=Strict`, 조건부 `Secure`
- 루프백 전용 접근 + Bearer 토큰 인증, WebSocket 연결 시 origin + 인증 검증

### 3-3. WebSocket Hub — 우수

`server/ws/hub.ts` (70줄)

- 고빈도 이벤트 배칭 (cli_output: 250ms, subtask_update: 150ms)
- `MAX_BATCH_QUEUE = 60` → 큐 오버플로 방지 (oldest 드롭)
- 연결 해제 시 `wsClients.delete()` → 메모리 누수 방지. **변경 불필요.**

### 3-4. 라이프사이클 관리 — 우수

`server/modules/lifecycle.ts` (616줄)

- 고아 태스크 복구 (startup + interval 모드), 프로세스 PID 생존 확인
- 로그 파일 mtime 확인 → 실제 출력 진행 중인지 판별
- 하트비트 + stalled 감지 (90초 임계), 서브태스크 위임 큐 sweep
- Graceful shutdown: 모든 프로세스 정리 + WebSocket 종료

### 3-5. SQLite 동시성 처리 — 양호

- `PRAGMA busy_timeout` + `withSqliteBusyRetry`: 지수 백오프 + 지터
- `runInTransaction`: 트랜잭션 래퍼 (9개 파일에서 23회 사용)
- 메시지 멱등성 보장 (`message-idempotency.ts`)

---

## 4. 문제점 분석

### 🔴 Critical — 확장성 한계

#### [A1] App.tsx 단일 상태 모노리스

**위치:** `src/App.tsx`

```typescript
// 현재: 모든 비즈니스 상태가 최상위에 집중 (40개 useState)
const [departments, setDepartments] = useState<Department[]>([]);
const [agents, setAgents] = useState<Agent[]>([]);
const [tasks, setTasks] = useState<Task[]>([]);
const [projects, setProjects] = useState<Project[]>([]);
const [categories, setCategories] = useState<Category[]>([]);
// ... + 35개 더 (총 40개)
// App → AppMainLayout: 40개+ props 전달 (3단계 prop-drilling)
// AppOverlays: 자체 상태 0개, App.tsx로부터 40개 props 수신
```

**문제:**
- 어떤 하위 컴포넌트 상태 변경이라도 App.tsx → 전체 트리 리렌더 유발
- 에이전트/프로젝트/태스크 수 증가 시 성능 저하 가속
- `useAppActions.ts`에 모든 비즈니스 로직 응집 → 단위 테스트 불가
- 상태 추가 시 prop-drilling 깊이 증가 (현재 3단계+)
- 전역 상태 라이브러리 없음 (ThemeContext 1개만 존재)

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

#### [A5] 프로젝트 스코핑 — ✅ 해결됨 (2026-03-12)

**구현 완료 현황:**
```
project_agents  ✓ DB ✓ 런타임  — 팀 멤버 관리 + auto-assign 필터 적용
project_rules   ✓ DB ✓ 런타임  — scope_type='project' CHECK 제약 추가,
                                  buildRulesPromptBlock()으로 프롬프트 주입
project_memory  ✓ DB ✓ 런타임  — scope_type='project' CHECK 제약 추가,
                                  searchRelevantMemories()에 projectId 필터 추가
project_hooks   ✓ DB ✓ 런타임  — scope_type='project' CHECK 제약 추가,
                                  executeHooks()로 pre-task/post-task/on-error/on-complete 실행
project_skills  ✓ DB ✓ 런타임  — project_skills 테이블 신규 생성,
                                  filterSkillsByProject() opt-out 모델로 필터링
```

**해결된 문제:**
- ~~에이전트가 프로젝트 A 태스크 실행 시, 프로젝트 B의 rules/memory/hooks/skills도 함께 적용됨~~ → 프로젝트 scope 필터링 적용
- ~~UI에서 사용자가 `scope_type='project'`로 설정해도 런타임에서 무시됨~~ → DB CHECK + 런타임 모두 적용
- 프로젝트가 독립된 실행 컨텍스트로 동작

**Scope 해상도 우선순위 (모든 기능 공통):**
```
project scope  > agent scope  > department scope  > global scope
└── 동일 scope 내에서는 priority DESC 순
```

**구현 파일:**
- `server/modules/bootstrap/schema/task-schema-migrations.ts` — scope_type CHECK 마이그레이션 + project_skills 테이블
- `server/modules/workflow/core/project-scoped-rules.ts` — buildRulesPromptBlock() (신규)
- `server/modules/workflow/core/hook-executor.ts` — executeHooks() (신규)
- `server/modules/workflow/orchestration/autonomous-memory.ts` — projectId 파라미터 추가
- `server/modules/workflow/core/prompt-skills.ts` — filterSkillsByProject() 추가
- `server/modules/routes/core/tasks/execution-run.ts` — rules/memory/hooks/skills 연동
- `server/modules/workflow/orchestration/execution-start-task.ts` — rules/memory/skills 연동
- `server/modules/workflow/orchestration/run-complete-handler/core.ts` — post-task hooks 연동

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

- 백엔드 에러 응답 4가지 형식 혼재 (`{ ok, data }`, `{ error }`, `{ ok, error }`, raw data)
- 에러 로그 집계 없음 (구조화 로거 미사용)
- **프론트엔드는 `handleApiError` 유틸로 일관화됨** — 백엔드 응답 형식만 미표준화

---

### 🔴 Critical — 보안

#### [A9] Rate Limiting 미구현

- API 전체에 rate limiting 없음. 인증된 사용자도 과도한 요청으로 서버 압도 가능.
- `/api/inbox` (public path) — webhook secret 의존적이지만 brute-force 가능

```typescript
// 권장: express-rate-limit 추가
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200 }));
app.use('/api/inbox', rateLimit({ windowMs: 60_000, max: 30 }));
```

#### [A10] OAuth 키 파생 취약

**위치:** `server/oauth/helpers.ts:14`

```typescript
// 현재: 단순 SHA-256 해시 (KDF 없음, salt 없음)
return createHash("sha256").update(OAUTH_ENCRYPTION_SECRET).digest();

// 권장: PBKDF2
return pbkdf2Sync(OAUTH_ENCRYPTION_SECRET, "agentdesk-oauth-salt", 100_000, 32, "sha256");
```

#### [A11] 미팅 참여자 필터링 버그 (HIGH)

**위치:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts:274-284`

`assignment_mode === "auto"` 프로젝트에서 `loadManualProjectAgentScope()`가 `null` 반환 → 프로젝트 미배정 에이전트가 미팅/리뷰에 참여 가능.

**영향:** 관련 없는 에이전트의 approve/hold 투표, 토큰 낭비, 프로젝트 정보 누출.

**수정:** `assignment_mode` 조건 제거 → 모든 모드에서 `project_agents` 테이블 기준 필터링.

#### [A12] 환경 변수 시작 시 검증 없음

```typescript
// 현재: OAUTH_ENCRYPTION_SECRET 미설정 → 조용히 빈 문자열
const OAUTH_ENCRYPTION_SECRET =
  process.env.OAUTH_ENCRYPTION_SECRET || process.env.SESSION_SECRET || "";
```

서버 시작 시 즉시 throw하도록 수정 필요.

---

### 🟠 High — 코드 부채

#### [A13] 거대 파일 문제

| 파일 | LOC | 문제 |
|------|-----|------|
| `gateway/client.ts` | 1,083 | 게이트웨이+메신저+Discord API+RPC 혼재, retry 없음 |
| `bootstrap/schema/task-schema-migrations.ts` | 1,180 | 마이그레이션 전체가 1파일, 버전 추적 없음 |
| `workflow/orchestration/review-finalize-tools.ts` | 875 | 리뷰 완료 로직 단일 파일 |
| `workflow/orchestration.ts` | 785 | 200개+ `__ctx` 변수 추출 패턴 반복 |

#### [A14] WebSocket 연결 수 제한 없음

`wsClients`에 최대 연결 수 제한 없음 → 악의적 클라이언트 다수 연결 가능.

#### [A15] In-Memory Map 15개

`orchestration.ts`에서 15개 Map/Set이 서버 프로세스 메모리에 존재:
- 서버 재시작 시 미팅/리뷰 세션 상태 전부 소실
- 수평 확장 불가능
- `reviewRoundState`, `taskExecutionSessions`, `meetingPresenceUntil` 등

#### [A16] 마이그레이션 버전 추적 없음

```typescript
// 매 서버 시작마다 전체 재실행, 모든 에러 무시
try {
  db.exec("ALTER TABLE agents ADD COLUMN persona_id TEXT");
} catch { /* 디스크 풀, 권한 오류 포함 모든 에러 무시 */ }
// schema_migrations 테이블: 없음
```

---

### 🟡 Medium

#### [A17] 메신저 재시도 없음

Discord/Telegram 수신기 공통: retry 없음, 지수 백오프 없음, circuit breaker 없음.
inbox 전달 실패 시 메시지 영구 유실.

#### [A18] 동적 SQL 24곳

```typescript
db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
```

현재는 컬럼명이 하드코딩되어 위험도 낮지만, 패턴이 24곳에 분산 → 실수 가능성.

#### [A19] 구조화 로깅 없음

`console.log`/`console.error`만 사용. 로그 레벨, 트레이스 ID, 구조화 JSON 없음.
→ `pino` 도입 권장.

#### [A20] 테스트 커버리지 불균형

총 39개 백엔드 테스트 / 200개+ 모듈 = **약 15% 커버리지**.

테스트 없는 핵심 모듈:
- `lifecycle.ts` (616줄) 🔴
- `bootstrap/schema/` — DB 마이그레이션 🔴
- `oauth/` 🔴
- `routes/core/tasks/execution-run.ts` (729줄) 🔴
- `gateway/` (1,083줄 대비 테스트 1개) 🟠

#### [A21] TypeScript `as any` 256개

`runtimeContext: Record<string, any>` 설계가 원인. 모듈 경계 타입 안전성 취약.

---

## 5. 아키텍처 개선 방향

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

### Phase C — 프로젝트 컨텍스트 완전 분리 (런타임 적용)

**목표:** 프로젝트가 독립된 실행 컨텍스트 — DB는 준비됨, 런타임 적용이 핵심

**현재 DB 모델 (이미 구현됨):**
```
agent_rules, memory_entries, hook_entries 모두
scope_type = 'global' | 'department' | 'agent' | 'workflow_pack' | 'project'
scope_id = 해당 scope의 참조 ID
→ 별도 project_* 테이블 불필요, 기존 통합 스코프 모델 활용
```

**스킬만 DB 스키마 보강 필요:**
```sql
-- skill_learning_history에 프로젝트 스코프 추가
ALTER TABLE skill_learning_history ADD COLUMN project_id TEXT REFERENCES projects(id);

-- 프로젝트별 스킬 활성화/비활성화 관리
CREATE TABLE project_skills (
  project_id TEXT NOT NULL REFERENCES projects(id),
  skill_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (project_id, skill_id)
);
```

**런타임 적용 — 4단계 구현:**

**C-1. Rules 프롬프트 주입** (신규)
```typescript
// execution-start-task.ts에 추가
function buildRulesPromptBlock(db, projectId, agentId, deptId): string {
  // priority: project > agent > department > global
  const rules = db.prepare(`
    SELECT rule_content, priority FROM agent_rules
    WHERE enabled = 1 AND (
      (scope_type = 'project' AND scope_id = ?) OR
      (scope_type = 'agent' AND scope_id = ?) OR
      (scope_type = 'department' AND scope_id = ?) OR
      (scope_type = 'global')
    )
    ORDER BY
      CASE scope_type
        WHEN 'project' THEN 1
        WHEN 'agent' THEN 2
        WHEN 'department' THEN 3
        WHEN 'global' THEN 4
      END,
      priority DESC
  `).all(projectId, agentId, deptId);
  // ...
}
```

**C-2. Memory 프로젝트 필터 추가** (기존 수정)
```typescript
// autonomous-memory.ts — searchRelevantMemories()에 projectId 파라미터 추가
if (projectId) {
  scopeConditions.push("(scope_type = 'project' AND scope_id = ?)");
  scopeParams.push(projectId);
}
// execution-start-task.ts — buildMemoryPromptBlock() 호출 시 projectId 전달
```

**C-3. Hooks 런타임 실행 엔진** (신규)
```typescript
// hook-executor.ts — 태스크 생명주기 이벤트에서 훅 실행
async function executeHooks(db, eventType, { projectId, agentId, deptId, taskId }) {
  const hooks = db.prepare(`
    SELECT command, working_directory, timeout_ms FROM hook_entries
    WHERE enabled = 1 AND event_type = ? AND (
      (scope_type = 'project' AND scope_id = ?) OR
      (scope_type = 'agent' AND scope_id = ?) OR
      (scope_type = 'department' AND scope_id = ?) OR
      (scope_type = 'global')
    )
    ORDER BY priority DESC
  `).all(eventType, projectId, agentId, deptId);
  // child_process.execFile() with timeout
}
// execution-run.ts — pre-task, post-task, on-error 시점에서 호출
```

**C-4. Skills 프로젝트 필터링** (기존 수정)
```typescript
// prompt-skills.ts — project_skills 테이블로 활성화된 스킬만 필터
function queryPromptSkillsByProject(db, provider, projectId): SkillBlock[] {
  // project_skills.enabled = true인 것만 반환
  // project_skills에 없는 스킬은 기본 활성화 (opt-out 모델)
}
```

**에이전트 실행 시 컨텍스트 우선순위 (scope 해상도):**
```
project scope  > agent scope  > department scope  > global scope
└── 동일 scope 내에서는 priority DESC 순
└── 같은 key/topic의 상위 scope 항목은 하위 scope에서 override 가능
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

## 6. 플랫폼 로드맵

### v2.1 — 안정화 (단기, ~4주)

| 항목 | 설명 | 공수 |
|------|------|------|
| WorkflowPackKey 완전 제거 | `task.workflow_pack_key` → `task.context_hint` | 1일 |
| ~~API 에러 핸들링 통일~~ | ✅ 구현 완료 — server/errors/ApiError.ts + errorMiddleware.ts + frontend handleApiError.ts 토스트 연동 | ~~2일~~ |
| ~~동기화 전략 단일화~~ | ✅ 구현 완료 — WS task_update 직접 적용 + adaptive polling interval | ~~2일~~ |
| project_path 검증 API | 서버에서 경로 존재 여부 확인 엔드포인트 | 1일 |
| ~~실행 상태 정합성 보정~~ | ✅ 이미 구현됨 — `lifecycle.ts` recoverOrphanInProgressTasks() (startup 60s grace + 30s sweep + heartbeat) | ~~1일~~ |

---

### v2.2 — 실행 엔진 강화 (중기, ~6주)

| 항목 | 설명 | 공수 |
|------|------|------|
| ~~에이전트 실행 상태 머신~~ | ✅ 구현 완료 — stalled 자동 복구 + 상태 전이 검증 가드 + agent idle 리셋 | ~~3일~~ |
| ~~실행 타임아웃 정책~~ | ✅ 구현 완료 — `timeout_minutes` 컬럼 + `enforceTaskTimeouts()` 30초 주기 검사 | ~~1일~~ |
| ~~에이전트 heartbeat~~ | ✅ 이미 구현됨 — 30초 heartbeat + 90초 stalled 감지 + 180초 자동 복구 | ~~2일~~ |
| 실행 비용 추적 | 토큰 × 가격 테이블 → 프로젝트별 비용 집계 | 2일 |
| 동시 실행 제한 | 에이전트당 max 1 active task 강제 | 1일 |

---

### v2.3 — Project OS 완성 (중기, ~8주)

| 항목 | 설명 | 공수 |
|------|------|------|
| ~~C-1. Rules 프롬프트 주입~~ | ~~buildRulesPromptBlock() 신규 구현~~ ✅ 완료 | ~~2일~~ |
| ~~C-2. Memory 프로젝트 필터~~ | ~~autonomous-memory.ts에 projectId 추가~~ ✅ 완료 | ~~1일~~ |
| ~~C-3. Hooks 런타임 실행~~ | ~~hook-executor.ts 신규~~ ✅ 완료 | ~~3일~~ |
| ~~C-4. Skills 프로젝트 스코핑~~ | ~~project_skills 테이블 + 필터링~~ ✅ 완료 | ~~2일~~ |
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

## 7. 즉시 처리 권고

### 이번 주 (보안/버그)

| 우선순위 | 항목 | 이슈 | 공수 |
|---------|------|------|------|
| **P0** | 미팅 참여자 필터링 버그 | [A11] execution-run-auto-assign.ts:419 | 0.5일 |
| **P0** | OAuth PBKDF2 전환 | [A10] oauth/helpers.ts:14 | 0.5일 |
| **P0** | Rate Limiting 추가 | [A9] express-rate-limit | 0.5일 |
| **P0** | WS 연결 수 제한 | [A14] ws/hub.ts | 0.5일 |
| **P0** | 환경 변수 시작 검증 | [A12] config/runtime.ts | 0.5일 |

### 2~3주 (안정성)

| 우선순위 | 항목 | 이슈 | 공수 |
|---------|------|------|------|
| **P1** | 메신저 inbox 재시도 | [A17] gateway/client.ts | 1일 |
| **P1** | In-memory Map sweep | [A15] orchestration.ts | 1일 |
| **P1** | 마이그레이션 버전 테이블 | [A16] bootstrap/schema/ | 1일 |
| **P2** | WorkflowPackKey 완전 제거 | [A4] 개념 혼동 청산 | 1일 |

### 중기 (코드 품질)

| 우선순위 | 항목 | 이슈 | 공수 |
|---------|------|------|------|
| **P3** | App.tsx → Zustand 분리 | [A1] 40개 useState | 4일 |
| **P3** | 구조화 로깅 (pino) | [A19] 전체 적용 | 2일 |
| **P3** | Zod 이미 설치 → 라우트 검증 | [A21] 응답 표준화 | 3일 |

### 완료된 항목 (참고)

| 항목 | 완료 시점 |
|------|---------|
| ~~실행 상태 정합성 보정~~ | ✅ lifecycle.ts orphan recovery + heartbeat |
| ~~API 에러 핸들링 통일~~ | ✅ ApiError class + global middleware + handleApiError |
| ~~에이전트 실행 상태 머신~~ | ✅ stalled 자동복구 + timeout + 상태전이 검증 |
| ~~동기화 전략 단일화~~ | ✅ task_update 직접 적용 + adaptive polling |
| ~~프로젝트 스코핑 런타임 적용~~ | ✅ C-1~C-4 완료 (rules/memory/hooks/skills) |

---

## 8. 부록 — 추가 발견사항

### B. 레이스 컨디션 위험

`lifecycle.ts`: SELECT 후 UPDATE가 원자적이지 않음. 서브태스크 위임 시 부모 태스크 상태 변경, 미팅 상태 동시 접근 등.

**권장:** 멀티스텝 상태 변경에 `runInTransaction()` 적용 확대 + optimistic locking (version 컬럼).

### C. 응답 형식 비일관성

```typescript
res.json({ agents })                           // raw
res.status(201).json({ ok: true, agent })      // ok + data
res.status(500).json({ ok: false, error })     // ok + error
res.status(400).json({ error: "code" })        // error만
```

**권장 표준:** 성공 `{ data: T }`, 에러 `{ error: { code, message } }`.

### D. CSRF 검증 범위 불완전

CSRF 검증은 `execution-control.ts:84~85`에만 적용됨.
agents CRUD, projects, settings, memory, rules, hooks 미적용.

### E. OpenAPI 스펙 동기화 문제

100개+ 엔드포인트 중 25개만 문서화 (25% 커버리지). `pnpm openapi:sync` 명령 존재 → CI에서 검증 추가 권장.

### F. 핵심 파일 참조

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
| WebSocket Hub | `server/ws/hub.ts` |
| 라이프사이클 | `server/modules/lifecycle.ts` |
| OAuth 키 | `server/oauth/helpers.ts` |
| 미팅 리더 선택 | `server/modules/workflow/orchestration/meetings/leader-selection.ts` |
| 타입 정의 | `src/types/index.ts` |
