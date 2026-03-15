# 에이전트 실행 성능 감사 보고서

> 작성일: 2026-03-13 | 업데이트: 2026-03-15 (Phase 1·2 완료 반영)
> 분석 범위: 에이전트 실행 파이프라인 전체 (`server/modules/workflow/**`)
> 트리거: 다수 에이전트 동시 등록·운용 시 성능 저하 우려

---

## 개요

AgentDesk에 여러 에이전트를 등록해 개발 작업을 수행할 때 **동시 실행 성능**이 충분히 나오는지 점검한 결과, 10개의 병목을 확인했다. 현재 구조는 에이전트 1~3개의 소규모 사용에는 문제없으나, **5개 이상 동시 실행** 시 누적 지연이 발생하는 구조적 취약점이 존재한다.

---

## 병목 목록

### 🔴 P1 — 즉시 수정 (Critical)

#### ~~P1-A. 태스크 spawn 시 DB 쿼리 6회+ 반복 실행~~ ✅ 완료 (2026-03-14)

- **파일:** `server/modules/workflow/orchestration/execution-start-task.ts:118–174`
- **해결:** `buildExecutionPayload()` 헬퍼 함수 추출, 6개 함수 `Promise.all()` 병렬화 완료
- **효과:** 동시 spawn 시 DB 쿼리 대폭 감소, 병렬 실행으로 지연 제거

---

#### ~~P1-B. 룰·메모리 캐시 없음 — 매 태스크마다 전체 재계산~~ ✅ 완료 (2026-03-14)

- **파일 (룰):** `server/modules/workflow/core/project-scoped-rules.ts`
- **파일 (메모리):** `server/modules/workflow/orchestration/autonomous-memory.ts`
- **해결:** `Map<cacheKey, {data, expiresAt}>` 구조로 5분 TTL 인메모리 캐시 구현 완료
- **효과:** 동일 프로젝트 10개 태스크 동시 시작 시 DB 재조회 제거

---

#### ~~P1-C. 훅 실행이 동기 블로킹 (`execFileSync`)~~ ✅ 완료 (2026-03-14)

- **파일:** `server/modules/workflow/core/hook-executor.ts`
- **해결:** `execFileSync` → `execFile` (async) + `Promise.all` 병렬 실행으로 전환 완료
- **효과:** 최대 600s 메인 스레드 블로킹 제거, 훅별 독립 실패 처리

---

### 🟠 P2 — 단기 수정 (High)

#### ~~P2-A. 동시 에이전트 프로세스 수 무제한~~ ✅ 완료 (2026-03-14)

- **파일:** `server/modules/workflow/orchestration/agent-queue.ts` (신규)
- **해결:** `MAX_CONCURRENT_AGENTS` 환경변수 (기본값 10), FIFO 대기 큐 구현 완료
- **효과:** `GET /api/queue-status` API + 헤더 큐 상태 카운터 (실행 중 N / 대기 M)

---

#### ~~P2-B. `enabled` 필터 복합 인덱스 누락~~ ✅ 완료 (2026-03-14)

- **파일:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **해결:** 4개 복합 인덱스 마이그레이션으로 추가 완료 (`idx_agent_rules_enabled_scope`, `idx_memory_entries_enabled_scope`, `idx_hook_entries_enabled_event`, `idx_agent_usage_agent_time`)
- **효과:** `enabled+scope` 필터 풀스캔 해소

---

#### ~~P2-C. 에이전트 상태 변경 시 개별 WebSocket broadcast (배치 없음)~~ ✅ 완료 (2026-03-14)

- **파일:** `server/ws/hub.ts`
- **해결:** cli_output 250ms 배치, subtask_update 150ms 배치, `MAX_BATCH_QUEUE = 60` 오버플로 방지 구현 완료
- **효과:** 고빈도 이벤트 배칭으로 WebSocket 메시지 수 대폭 감소

---

### 🟡 P3 — 중기 개선 (Medium)

#### P3-A. 고아 태스크 복구 시 태스크당 쿼리 3회 순차 실행

- **파일:** `server/modules/lifecycle.ts` (`recoverOrphanInProgressTasks`)
- **문제:** `in_progress` 태스크 N개에 대해 각각 3회 순차 쿼리 + fs 호출
- **영향:** 고아 태스크 100개 = 300회 쿼리 + 100회 fs 호출 (서버 재시작 시 발생)
- **개선 방향:** 로그 조회를 단일 JOIN 쿼리로 배치화; fs 조회는 `Promise.all` 병렬 처리

---

#### ~~P3-B. 이상 감지가 인덱스 없는 윈도우 함수로 60초마다 실행~~ ✅ 완료 (2026-03-14)

- **파일:** `server/modules/bootstrap/schema/versioned-migrations.ts`
- **해결:** `tasks(status, execution_state, last_heartbeat_at DESC)` 복합 인덱스 추가 + `TASK_STALLED_THRESHOLD_MS` 환경변수로 임계값 설정 가능화

---

#### P3-C. 태스크 스케줄러 고정 60초 폴링

- **파일:** `server/modules/workflow/orchestration/task-scheduler.ts`
- **문제:** `setInterval(sweep, 60_000)` — 부하에 관계없이 60초 단위로만 처리
- **영향:** 즉시 실행 스케줄도 최대 60초 지연 가능
- **개선 방향:** `next_run_at`이 가장 빠른 스케줄 기준으로 동적 timeout 계산

---

## 우선순위 로드맵

```
┌──────────────────────────────────────────────────────────────────────┐
│  Phase 1 — ✅ 완료 (2026-03-14)   성능 개선: 동시 실행 3~5배 달성     │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P1-C  훅 async 병렬 실행 (최대 600s 블로킹 제거)                  │
│  ✅ P2-B  DB 복합 인덱스 4개 추가                                     │
│  ✅ P1-B  룰·메모리 5분 TTL 캐시 도입                                 │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 2 — ✅ 완료 (2026-03-14)   안정성·확장성 확보 달성             │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P1-A  spawn 시 DB 쿼리 배치화 (Promise.all 병렬화)                │
│  ✅ P2-A  동시 에이전트 수 상한 + FIFO 대기 큐                        │
│  ✅ P2-C  WebSocket broadcast 배치 (250ms/150ms)                     │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Phase 3 — 부분 완료              장기 운영 안정화 진행 중             │
├──────────────────────────────────────────────────────────────────────┤
│  ✅ P3-B  이상 감지 인덱스 추가 (watchdog 풀스캔 제거)                │
│  ⏳ P3-A  고아 태스크 복구 배치화 (잔존)                              │
│  ⏳ P3-C  태스크 스케줄러 동적 timeout (잔존)                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 동시 실행 한계 (현재 상태)

| 동시 에이전트 수 | Phase 1 전 (초기) | Phase 1 후 | Phase 2 후 (현재) |
|:-:|---|---|---|
| 1~3개 | ✅ 정상 | ✅ 정상 | ✅ 정상 |
| 5개 | ⚠️ 훅 블로킹·쿼리 누적 체감 | ✅ 정상 | ✅ 정상 |
| 10개 | ❌ 훅 최대 600s 블로킹 가능 | ⚠️ 경미한 지연 | ✅ 정상 |
| 20개+ | ❌ 프로세스 자원 고갈 위험 | ⚠️ 큐 없으면 위험 | ✅ 큐로 제어 |

---

## 관련 문서

- [종합 아키텍처 감사 보고서](../architecture/ARCHITECTURE-AUDIT-2026-Q1.md) — 백엔드 엔진 심층 점검 포함
- [API 명세](../specs/api.md)
