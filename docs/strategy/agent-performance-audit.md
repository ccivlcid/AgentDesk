# 에이전트 실행 성능 감사 보고서

> 작성일: 2026-03-13
> 분석 범위: 에이전트 실행 파이프라인 전체 (`server/modules/workflow/**`)
> 트리거: 다수 에이전트 동시 등록·운용 시 성능 저하 우려

---

## 개요

AgentDesk에 여러 에이전트를 등록해 개발 작업을 수행할 때 **동시 실행 성능**이 충분히 나오는지 점검한 결과, 10개의 병목을 확인했다. 현재 구조는 에이전트 1~3개의 소규모 사용에는 문제없으나, **5개 이상 동시 실행** 시 누적 지연이 발생하는 구조적 취약점이 존재한다.

---

## 병목 목록

### 🔴 P1 — 즉시 수정 (Critical)

#### P1-A. 태스크 spawn 시 DB 쿼리 6회+ 반복 실행

- **파일:** `server/modules/workflow/orchestration/execution-start-task.ts:118–174`
- **문제:** 단일 태스크 실행 시작 시 동일 레코드를 여러 번 개별 SELECT
  - 선행 의존성 조회 (118–124)
  - 태스크 전체 재조회 (142) → WebSocket broadcast용
  - 에이전트 전체 재조회 (154–155) → 상태 broadcast용
  - 태스크 데이터 재조회 (163–174) → 프롬프트 빌드용
- **영향:** 에이전트 10개 동시 spawn = 최소 60회 SELECT 순차 실행
- **개선 방향:** 태스크·에이전트 데이터를 함수 진입 시 1회만 로드하여 재사용; CTE로 배치 조회

---

#### P1-B. 룰·메모리 캐시 없음 — 매 태스크마다 전체 재계산

- **파일 (룰):** `server/modules/workflow/core/project-scoped-rules.ts:53–68`
- **파일 (메모리):** `server/modules/workflow/orchestration/autonomous-memory.ts:74–109`
- **문제:**
  - 동일 project+agent+dept 조합이어도 태스크마다 DB 전체 재조회
  - 메모리는 50건 로드 후 Node.js에서 키워드 스코어링 루프 (O(keywords × memories))
  - 캐시·TTL 로직 전혀 없음
- **영향:** 같은 프로젝트에서 태스크 10개 동시 시작 = 동일 쿼리 10회 + 10회 스코어링 연산
- **개선 방향:** `Map<cacheKey, {data, expiresAt}>` 구조로 5분 TTL 인메모리 캐시; 스코어링을 SQL CASE/WHEN으로 이관

---

#### P1-C. 훅 실행이 동기 블로킹 (`execFileSync`)

- **파일:** `server/modules/workflow/core/hook-executor.ts:92–126`
- **문제:**
  ```typescript
  for (const hook of hooks) {           // 최대 20개 순차 실행
    execFileSync("/bin/sh", ["-c", hook.command], {
      timeout,                           // 개당 최대 300,000ms
      stdio: "ignore",
    });
  }
  ```
  - 훅이 1개라도 느리면 이후 모든 훅이 대기
  - 훅 20개 × 타임아웃 30s = 최대 600s 메인 스레드 점유
- **영향:** 동시 에이전트 N개 × 훅 수 × 타임아웃 = 잠재적 수백 초 블로킹
- **개선 방향:** `execFile` (async) + `Promise.all` 병렬 실행; 훅별 독립 실패 처리

---

### 🟠 P2 — 단기 수정 (High)

#### P2-A. 동시 에이전트 프로세스 수 무제한

- **파일:** `server/modules/workflow/agents/cli-runtime.ts:316`
- **문제:**
  ```typescript
  activeProcesses.set(taskId, child);   // 크기 제한 없음
  ```
  - 최대 동시 실행 수 설정 없음 → 메모리·CPU·파일 핸들 고갈 가능
  - 대기 큐 없음; 요청 즉시 spawn
- **개선 방향:** `MAX_CONCURRENT_AGENTS` 환경변수 설정; 초과 시 `pending` 큐 후 FIFO 처리

---

#### P2-B. `enabled` 필터 복합 인덱스 누락

- **파일:** `server/modules/bootstrap/schema/base-schema.ts:385–415`
- **문제:** 현재 인덱스:
  ```sql
  CREATE INDEX idx_agent_rules_scope ON agent_rules(scope_type, scope_id);
  CREATE INDEX idx_memory_entries_scope ON memory_entries(scope_type, scope_id);
  ```
  `enabled = 1` 필터가 모든 쿼리에 포함되지만 인덱스에 `enabled` 없음 → 부분 풀스캔
- **누락 인덱스:**
  ```sql
  -- 필요한 인덱스
  CREATE INDEX idx_agent_rules_enabled_scope   ON agent_rules(enabled, scope_type, scope_id);
  CREATE INDEX idx_memory_entries_enabled_scope ON memory_entries(enabled, scope_type, scope_id);
  CREATE INDEX idx_hook_entries_enabled_event   ON hook_entries(enabled, event_type, scope_type, scope_id);
  CREATE INDEX idx_agent_usage_agent_time       ON agent_usage_logs(agent_id, created_at DESC);
  ```
- **개선 방향:** 스키마 마이그레이션으로 인덱스 추가

---

#### P2-C. 에이전트 상태 변경 시 개별 WebSocket broadcast (배치 없음)

- **파일:** `server/modules/lifecycle.ts:93`, `execution-start-task.ts:142,154`
- **문제:**
  - 태스크 spawn마다 `broadcast("task_update", ...)` + `broadcast("agent_status", ...)` 2회
  - `rotateBreaks()` (60s 주기): 전체 에이전트 조회 → 각 상태 변경마다 개별 broadcast
- **영향:** 에이전트 10개 동시 spawn = 20회 개별 WebSocket 메시지
- **개선 방향:** 100ms debounce 배치 broadcast; 상태 변경을 집계 후 단일 메시지 전송

---

### 🟡 P3 — 중기 개선 (Medium)

#### P3-A. 고아 태스크 복구 시 태스크당 쿼리 3회 순차 실행

- **파일:** `server/modules/lifecycle.ts:176–290` (`recoverOrphanInProgressTasks`)
- **문제:** `in_progress` 태스크 N개에 대해 각각:
  1. `task_logs`에서 최근 활동 조회
  2. 파일시스템 `statSync` 호출
  3. 최신 실행 로그 메시지 조회
- **영향:** 고아 태스크 100개 = 300회 쿼리 + 100회 fs 호출 (서버 재시작 시 발생)
- **개선 방향:** 로그 조회를 단일 JOIN 쿼리로 배치화; fs 조회는 `Promise.all` 병렬 처리

---

#### P3-B. 이상 감지가 인덱스 없는 윈도우 함수로 60초마다 실행

- **파일:** `server/modules/workflow/orchestration/agent-anomaly-monitor.ts:82–101`
- **문제:**
  - `agent_usage_logs`에 `(agent_id, created_at)` 인덱스 없음
  - `ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY created_at DESC)` → 풀스캔
  - 60초 고정 주기로 반복
- **개선 방향:** `(agent_id, created_at)` 복합 인덱스 추가 (P2-B와 함께 처리); 주기를 부하 기반 적응형으로 변경

---

#### P3-C. 태스크 스케줄러 고정 60초 폴링

- **파일:** `server/modules/workflow/orchestration/task-scheduler.ts:209–334`
- **문제:** `setInterval(sweep, 60_000)` — 부하에 관계없이 60초 단위로만 처리
- **영향:** 즉시 실행 스케줄도 최대 60초 지연 가능
- **개선 방향:** `next_run_at`이 가장 빠른 스케줄 기준으로 동적 timeout 계산

---

## 우선순위 로드맵

```
┌──────────────────────────────────────────────────────────────────────┐
│  Phase 1 — 즉시 (1~2일)          예상 성능 개선: 동시 실행 3~5배     │
├──────────────────────────────────────────────────────────────────────┤
│  P1-C  훅 async 병렬 실행                                             │
│  P2-B  DB 복합 인덱스 추가 (마이그레이션)                             │
│  P1-B  룰·메모리 TTL 캐시 도입                                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 2 — 단기 (3~5일)          예상 성능 개선: 안정성·확장성 확보   │
├──────────────────────────────────────────────────────────────────────┤
│  P1-A  spawn 시 DB 쿼리 배치화                                        │
│  P2-A  동시 에이전트 수 상한 + 대기 큐                                │
│  P2-C  WebSocket broadcast 배치 debounce                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 3 — 중기 (1~2주)          예상 성능 개선: 장기 운영 안정화     │
├──────────────────────────────────────────────────────────────────────┤
│  P3-B  이상 감지 인덱스 + 적응형 주기                                 │
│  P3-A  고아 태스크 복구 배치화                                        │
│  P3-C  태스크 스케줄러 동적 timeout                                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 현재 동시 실행 한계 추정

| 동시 에이전트 수 | 현재 상태 | Phase 1 후 | Phase 2 후 |
|:-:|---|---|---|
| 1~3개 | ✅ 정상 | ✅ 정상 | ✅ 정상 |
| 5개 | ⚠️ 훅 블로킹·쿼리 누적 체감 | ✅ 정상 | ✅ 정상 |
| 10개 | ❌ 훅 최대 600s 블로킹 가능 | ⚠️ 경미한 지연 | ✅ 정상 |
| 20개+ | ❌ 프로세스 자원 고갈 위험 | ⚠️ 큐 없으면 위험 | ✅ 큐로 제어 |

---

## 관련 문서

- [백엔드 엔진 심층 점검](./backend-engine-audit.md)
- [아키텍처 감사 보고서](../architecture/ARCHITECTURE-AUDIT-2026-Q1.md)
- [API 명세](../specs/api.md)
