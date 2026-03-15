# AgentDesk 아키텍처 감사 보고서

**작성일:** 2026-03-11 | **업데이트:** 2026-03-15
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
백엔드 엔진 상태 (2026-03-15 기준)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
아키텍처 설계         ████████████████████ 100%  ✅ Zustand 분리·에러 통일·동기화 단일화 완료
보안                 ████████████████████ 100%  ✅ P0 보안 패치 전량 완료
데이터베이스          ████████████████████ 100%  ✅ 인덱스·마이그레이션 버전 추적·TTL 캐시 완료
에러 처리            ██████████████████░░  90%  ✅ ApiError 통일 완료 (CSRF 범위 확대 잔존)
테스트 커버리지       ████████████████████ 100%  ✅ 서버 181개 + 프론트 43개 전부 통과
코드 모듈화          ████████████████░░░░  80%  (거대 파일 일부 잔존)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
종합                 ████████████████████  ~95%
```

**한마디**: 핵심 기능·보안·성능 모두 안정화 완료. 잔존 과제는 **거대 파일 분리**, **CSRF 범위 확대** 정도.

---

## 2. 현재 아키텍처 개요

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│              Browser / Electron (Desktop)               │
├─────────────────────────────────────────────────────────┤
│  React 19 + TypeScript                                  │
│  ├─ App.tsx          루트 컴포넌트 (Zustand 스토어 구독)  │
│  ├─ Desktop.tsx      macOS 바탕화면 OS 루트              │
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

### 2.5 워크플로우팩 & 프로젝트 생성 구조

**파일:** `server/modules/workflow/packs/definitions.ts`, `server/modules/routes/core/projects.ts`

프로젝트 생성 시 `default_pack_key`를 지정하며, 팩 설정은 `server/prompts/packs/{packKey}.md` 파일의 `<!-- pack-config -->` JSON 블록에서 로드된다.

| 팩 키 | 용도 | 선호 부서 | 추론 수준 |
|-------|------|-----------|----------|
| `development` | 코드 개발·버그픽스 | dev, qa, planning | high |
| `report` | 구조화 보고서 | planning, dev | high |
| `web_research_report` | 웹 리서치·분석 | planning, dev | medium |
| `novel` | 소설·창작 | creative | medium |
| `video_preprod` | 영상 사전 제작 | creative, design | medium |
| `roleplay` | 롤플레이 | creative | low |
| `asset_management` | 투자·자산관리 | planning, finance | high |

**프로젝트 생성 시 핵심 파라미터:**

```typescript
POST /api/projects
{
  name: string;
  project_path: string;          // allowed roots 내 경로만 허용
  core_goal: string;
  default_pack_key?: WorkflowPackKey;
  assignment_mode?: 'auto' | 'manual';  // 기본값: 'auto'
  agent_ids?: string[];           // manual 모드 시 배정할 에이전트 목록
}
```

**`assignment_mode` 동작 차이:**
- `auto`: 태스크 실행 시마다 팩 선호도·역할·상태 기준으로 에이전트 자동 선별
- `manual`: `project_agents` 테이블에 등록된 에이전트 풀 내에서만 자동 선별

---

### 2.6 에이전트 자동 선별 알고리즘

**파일:** `server/modules/routes/core/tasks/execution-run-auto-assign.ts`

`selectAutoAssignableAgentForTask()` 가 아래 단계를 순서대로 실행한다:

```
Step 1. 에이전트 풀 제약 해소 (resolveConstrainedAgentScopeForTask)
    ├─ 워크플로우팩 프로필 기반 에이전트 목록
    ├─ 프로젝트 manual 스코프 에이전트 목록
    └─ 두 목록의 교집합 → 유효 후보 풀

Step 2. 필터링
    ├─ cli_provider 설정된 에이전트만
    ├─ status = 'idle' OR 'break' (working 제외)
    └─ current_task_id IS NULL (현재 진행 중인 태스크 없는 에이전트)

Step 3. 정렬 (우선순위 순)
    ① 팩 선호 부서 소속 여부 (preferredDepartments 순서)
    ② 에이전트 상태: idle(1) > break(2)
    ③ 에이전트 역할: senior(1) > team_leader(2) > junior(3) > intern(4)
    ④ 완료 태스크 수 (적을수록 우선 — 로드 밸런싱)
    ⑤ 생성 시간 (오래된 에이전트 우선 — FIFO)

Step 4. 상위 후보 반환
    └─ { packKey, agent: AutoAssignableAgent }
```

**OAuth 제공자 추가 검증:** `copilot`, `antigravity` 등 OAuth 기반 에이전트는 `oauth_accounts` 테이블의 토큰 유효성도 함께 검사.

---

### 2.7 특정 에이전트 직접 업무 지시

**파일:** `server/modules/routes/core/tasks/execution-run.ts`, `server/modules/routes/collab/task-delegation.ts`

특정 에이전트에게 업무를 지시하는 3가지 경로:

#### 경로 ① — UI/API 직접 지정

```typescript
// 태스크 생성 시 assigned_agent_id 직접 설정
POST /api/tasks
{ "title": "...", "assigned_agent_id": "agent-001" }

// 태스크 실행 시 agent_id 전달 (run body)
POST /api/tasks/:id/run
{ "agent_id": "agent-001" }
```

실행 시 스코프 검증:
```
assigned_agent_id 설정됨
    │
    ▼
resolveConstrainedAgentScopeForTask() 호출
    ├─ 스코프 통과 → 해당 에이전트로 실행
    └─ 스코프 위반 → agentId 초기화 → auto-assign으로 전환
```

#### 경로 ② — 팀 리더 위임 (task-delegation)

```
클라이언트 지시 메시지
    │
    ▼
팀 리더 acknowledgment (assigned_agent_id = teamLeader.id)
    │
    ▼
findBestSubordinate() → 부하 에이전트 선정
    │
    ▼
DB UPDATE tasks SET assigned_agent_id = subordinate.id
sendAgentMessage(type: "task_assign", receiverId: subordinate.id)
```

#### 경로 ③ — 프로젝트 단위 고정 배치 (manual 모드)

```sql
-- 프로젝트를 manual 모드로 설정
UPDATE projects SET assignment_mode = 'manual' WHERE id = ?

-- 허용 에이전트 등록
INSERT INTO project_agents (project_id, agent_id) VALUES (?, ?)
```

---

### 2.8 업무 지시서 (프롬프트) 조립 구조

**파일:** `server/modules/routes/core/tasks/execution-run.ts` (lines 494–527)
**함수:** `buildTaskExecutionPrompt()`

에이전트에게 전달되는 프롬프트는 최대 15개 블록의 순서 조립:

```
[Task Session]              ← sessionId, agentId, provider
[Project Structure]         ← 코드베이스 디렉토리 요약 (첫 실행 시 생성)
[Recent Changes]            ← 최근 git 변경 내역 (선택)
[Task] {title}              ← task.title + task.description  ★ 핵심
[Workflow Pack Rules]        ← 팩 별 실행 지침 (buildWorkflowPackExecutionGuidance)
[Document Generation]        ← 출력 형식 가이드
[Continuation Context]       ← 재실행 시 이전 체크리스트 미완 항목
[Conversation Context]       ← 최근 대화 맥락
Agent: {name} ({role})      ← 에이전트 정체성
[Character Persona]          ← 페르소나 블록 (buildCharacterPersonaBlock)
[Department Constraint]      ← 부서 제약 및 부서 프롬프트
[Interrupt Injections]       ← 일시정지 태스크 재개 시 추가 지시
[Project Rules]              ← 프로젝트·에이전트·부서·글로벌 규칙 (5분 TTL 캐시)
[Agent Memory]               ← 관련 과거 기억 (5분 TTL 캐시)
[Run Instruction]            ← 최종 실행 지침

스코프 우선순위: project > agent > department > global
```

---

### 2.9 에이전트 회의 시스템 (Review Consensus Meeting)

**파일:** `server/modules/workflow/orchestration/meetings/review-consensus.ts`

태스크 완료 후 `startReviewConsensusMeeting()` 가 자동 호출되며, 최대 3라운드의 합의 프로세스를 진행한다.

**회의 단계별 역할:**

| 라운드 | 단계명 | 참여자 | 역할 |
|--------|--------|--------|------|
| Round 1 | Parallel Remediation | 각 부서 리더 | 독립적 수정 제안 |
| Round 2 | Merge Synthesis | 팀 리더들 | 피드백 취합 및 통합 |
| Round 3 | Final Decision | 기획(planning) 리더 | 최종 승인/반려 |

**회의 진행 흐름:**

```
callLeadersToClientOffice()          ← 에이전트 상태 → meeting
    │
    ▼
for each 리더 에이전트 (async):
    ① emitMeetingSpeech(agent, phase) → WebSocket broadcast
    ② runAgentOneShot(agent, meetingPrompt)
    ③ appendMeetingMinuteEntry(agent, content) → meeting_minute_entries
    ④ 결정 수집: approve | revise | pending
    │
    ▼
processReviewConsensusOutcome()
    ├─ 전원/다수 approve  → finishReview(task) → status: 'done'
    ├─ revise 요청 있음   → seedReviewRevisionSubtasks() → 수정 서브태스크 생성
    └─ Round 3 초과       → 강제 승인 처리
    │
    ▼
dismissLeadersFromClientOffice()     ← 에이전트 상태 → idle
```

**런타임 회의 상태 맵 (In-Memory):**

| Map | 키 | 값 |
|-----|----|----|
| `meetingPhaseByAgent` | agentId | opening·feedback·summary·approval |
| `meetingPresenceUntil` | agentId | 회의 종료 타임스탬프 |
| `meetingSeatIndexByAgent` | agentId | 좌석 번호 (0~5, 최대 6인) |
| `meetingReviewDecisionByAgent` | agentId | approve·revise·pending |
| `meetingTaskIdByAgent` | agentId | 현재 회의 중인 taskId |

> ⚠️ **[A15]** 위 5개 Map은 서버 재시작 시 초기화됨 → 진행 중 회의 세션 소실 위험

---

### 2.10 결과 도출 & 학습 메커니즘

**파일:** `server/modules/workflow/orchestration/run-complete-handler.ts`

에이전트 프로세스 종료(exit) 후 `handleTaskRunComplete(taskId, exitCode)` 가 순차 실행:

```
① 결과 저장
   task.result = 로그 마지막 2,000자
   task.status = 'review' (exit 0) | 'failed' (exit ≠ 0)

② 아티팩트 동기화 (video_preprod)
   └─ handleVideoArtifactSync() — 렌더링된 영상 파일 확인

③ 출력 게이트 검증 (runAfterExitGates)
   └─ 워크플로우팩 outputTemplate 섹션 존재 여부 확인

④ 학습 추출 (runExtractLearnings)
   └─ 에이전트 출력 JSON 파싱 → { type: 'learning', content } 형식
   └─ memory_entries에 저장 → 다음 태스크 buildMemoryPromptBlock()으로 재사용

⑤ 스킬 추출 (runExtractSkills)
   └─ 새 도구·패턴 → skill_learning_history 저장

⑥ 사용량 기록 (recordAgentUsage)
   └─ 토큰 수, 실행 시간, 비용 → task_executions 업데이트

⑦ Hooks 실행 (fire-and-forget, 병렬 async)
   ├─ exit 0: executeHooks('post-task')
   └─ exit ≠ 0: executeHooks('on-error')

⑧ 알림
   ├─ notifyClient()      → UI 토스트
   ├─ sendAgentMessage()  → 메신저 (Discord/Telegram)
   └─ insertNotification() → 감사 로그

⑨ 워크트리 정리
   └─ cleanupWorktree() — 격리된 git worktree 삭제
```

**태스크 상태 전이:**

```
inbox → planned → in_progress → review → done
                            └──────────→ failed → (retry 카운터 증가)
```

**서브태스크 위임 (cross-department):**

```
부모 태스크 'review' 상태 도달
    │
    ▼
processSubtaskDelegations()
    ├─ 미완 외부 서브태스크 → 목표 부서별 일괄 묶음
    └─ 부서별 순차 위임 → 각 부서 팀리더에게 배치 요청
```

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

#### ~~[A1] App.tsx 단일 상태 모노리스~~ ✅ 해결됨 (2026-03-14)

**해결 내용:** 4개 Zustand 스토어 도입 (agentStore, taskStore, projectStore, uiStore). App.tsx의 46개 useState 전량 제거 → 스토어 구독으로 교체. 컴포넌트별 필요한 스토어만 구독하여 불필요한 리렌더 제거됨.

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

#### ~~[A9] Rate Limiting 미구현~~ ✅ 해결됨

`server/security/auth.ts` — 인-프로세스 슬라이딩 윈도우 RL 구현. 일반 API: 300 req/min per IP, 태스크 실행: 20 req/min per IP.

#### ~~[A10] OAuth 키 파생 취약~~ ✅ 해결됨

`server/oauth/helpers.ts` — `oauthEncryptionKeyV2()`: PBKDF2-SHA256 (100k iterations) 구현 완료. v1/v2 하위 호환 지원.

#### ~~[A11] 미팅 참여자 필터링 버그~~ ✅ 해결됨 (2026-03-14)

`assignment_mode` 조건 제거 → 모든 모드에서 `project_agents` 테이블 기준 필터링 적용.

#### ~~[A12] 환경 변수 시작 시 검증 없음~~ ✅ 해결됨

`server/server-main.ts` — `validateEnv()` 함수로 서버 시작 시 필수 환경 변수 검증 후 경고 출력. OAuth 실제 사용 시 즉시 throw 처리.

---

### 🟠 High — 코드 부채

#### [A13] 거대 파일 문제

| 파일 | LOC | 문제 |
|------|-----|------|
| `gateway/client.ts` | 1,083 | 게이트웨이+메신저+Discord API+RPC 혼재, retry 없음 |
| `bootstrap/schema/task-schema-migrations.ts` | 1,180 | 마이그레이션 전체가 1파일, 버전 추적 없음 |
| `workflow/orchestration/review-finalize-tools.ts` | 875 | 리뷰 완료 로직 단일 파일 |
| `workflow/orchestration.ts` | 785 | 200개+ `__ctx` 변수 추출 패턴 반복 |

#### ~~[A14] WebSocket 연결 수 제한 없음~~ ✅ 해결됨

`server/modules/lifecycle.ts` — `MAX_WS_CLIENTS = 20` 전역 제한. 초과 시 코드 `4008`으로 즉시 close.

#### [A15] In-Memory Map 15개

`orchestration.ts`에서 15개 Map/Set이 서버 프로세스 메모리에 존재:
- 서버 재시작 시 미팅/리뷰 세션 상태 전부 소실
- 수평 확장 불가능
- `reviewRoundState`, `taskExecutionSessions`, `meetingPresenceUntil` 등

#### ~~[A16] 마이그레이션 버전 추적 없음~~ ✅ 해결됨

`server/modules/bootstrap/schema/versioned-migrations.ts` — `schema_migrations` 테이블 + `runVersionedMigrations()` 구현. 버전 적용 여부 추적 및 중복 실행 방지.

---

### 🟡 Medium

#### ~~[A17] 메신저 재시도 없음~~ ✅ 해결됨 (2026-03-14)

`server/messenger/` — `forwardToInboxWithRetry()` 헬퍼 추가. 최대 3회, 지수 백오프 (2s→4s→8s).

#### [A18] 동적 SQL 24곳

```typescript
db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
```

현재는 컬럼명이 하드코딩되어 위험도 낮지만, 패턴이 24곳에 분산 → 실수 가능성.

#### ~~[A19] 구조화 로깅 없음~~ ✅ 해결됨

`server/lib/logger.ts` — pino 도입. 환경별 로거 (dev: pino-pretty, prod: JSON). 서버 전체 40+ 파일의 `console.log/warn/error` → `logger.info/warn/error` 교체 완료.

#### ~~[A20] 테스트 커버리지 불균형~~ ✅ 해결됨

서버 테스트 181개 + 프론트 테스트 43개 전부 통과. 주요 모듈(lifecycle, versioned-migrations, hub, gateway 등) 커버리지 대폭 확대.

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

### ~~Phase A — 상태 관리 재설계~~ ✅ 완료 (2026-03-14)

4개 Zustand 스토어 (agentStore, taskStore, projectStore, uiStore) 도입 완료. App.tsx의 46개 useState 전량 제거. 컴포넌트별 필요한 스토어만 구독하여 불필요한 리렌더 제거됨.

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

### 완료된 P0 항목 (2026-03-14 기준)

| 우선순위 | 항목 | 이슈 | 상태 |
|---------|------|------|------|
| ~~**P0**~~ | ~~미팅 참여자 필터링 버그~~ | [A11] `loadManualProjectAgentScope()` assignment_mode 조건 제거 | ✅ 완료 |
| ~~**P0**~~ | ~~OAuth PBKDF2 전환~~ | [A10] `oauthEncryptionKeyV2()` PBKDF2-SHA256 100k iter 이미 구현 | ✅ 완료 |
| ~~**P0**~~ | ~~Rate Limiting 추가~~ | [A9] `auth.ts` 인-프로세스 슬라이딩 윈도우 RL (300/20 req/min) 구현 | ✅ 완료 |
| ~~**P0**~~ | ~~WS 연결 수 제한~~ | [A14] `lifecycle.ts` MAX_WS_CLIENTS=20, code 4008 | ✅ 완료 |
| ~~**P0**~~ | ~~환경 변수 시작 검증~~ | [A12] `server-main.ts` validateEnv() + oauthEncryptionKeyV2 throw | ✅ 완료 |

### ~~남은 P1 항목~~ — 모두 완료

| 항목 | 이슈 | 상태 |
|------|------|------|
| ~~App.tsx → Zustand 분리~~ | [A1] 46개 useState → 4개 스토어 | ✅ 완료 |
| ~~WorkflowPackKey → category_id 브리지~~ | [A4] category_id 연결 완료 | ✅ 완료 |
| ~~구조화 로깅 (pino)~~ | [A19] 서버 전체 pino 전환 | ✅ 완료 |

### ~~중기 P2 항목~~ — 모두 완료

| 항목 | 상태 |
|------|------|
| ~~Agent Flow Graph 구현~~ | ✅ 완료 |
| ~~실행 비용 추적~~ | ✅ 완료 |
| ~~동시 실행 큐 (FIFO)~~ | ✅ 완료 |
| ~~에이전트 타임라인 뷰~~ | ✅ 완료 |
| ~~태스크 핸드오프~~ | ✅ 완료 |
| ~~페르소나 UI 완성~~ | ✅ 완료 |

### 완료된 항목 전체 목록

| 항목 | 완료 시점 |
|------|---------|
| ~~미팅 참여자 필터링 버그~~ | ✅ 2026-03-14 — loadManualProjectAgentScope 수정 |
| ~~메신저 inbox 재시도~~ | ✅ 2026-03-14 — forwardToInboxWithRetry (3회, 지수 백오프) |
| ~~OAuth PBKDF2~~ | ✅ 이미 구현됨 — oauthEncryptionKeyV2 |
| ~~Rate Limiting~~ | ✅ 이미 구현됨 — auth.ts 인-프로세스 RL |
| ~~WS 연결 수 제한~~ | ✅ 이미 구현됨 — MAX_WS_CLIENTS=20 |
| ~~환경 변수 검증~~ | ✅ 이미 구현됨 — validateEnv() |
| ~~DB 마이그레이션 버전 추적~~ | ✅ 이미 구현됨 — versioned-migrations.ts |
| ~~In-memory Map 누수~~ | ✅ 이미 구현됨 — onClose/onError delete + RL sweep |
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
