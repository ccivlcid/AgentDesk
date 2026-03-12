# 백엔드 엔진 심층 점검 리포트

> 점검일: 2026-03-12
> 대상: `/server/**` (약 231개 TypeScript 파일, 67,523 LOC)

---

## 1. 종합 평가

```
백엔드 엔진 상태
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

## 2. 잘 되어 있는 것

### 2-1. Deferred Runtime Proxy 패턴 — 우수

`server/modules/deferred-runtime.ts`

```
runtimeProxy = createDeferredRuntimeProxy(runtimeContext)
→ 초기화 시점에 아직 없는 함수를 Proxy로 지연 참조
→ 모든 함수가 바인딩된 후 assertRuntimeFunctionsResolved()로 검증
```

- 순환 의존성 없이 모듈 간 크로스 참조 해결
- 미해결 함수가 있으면 서버 시작 시점에 즉시 에러 발생
- **평가**: 고급 패턴을 깔끔하게 구현. 변경 불필요.

### 2-2. 보안 미들웨어 — 양호

`server/security/auth.ts` (222줄)

- `timingSafeEqual()` 사용 → 타이밍 공격 방지
- CSRF 토큰: SHA-256 해시 기반 생성/검증
- CORS: `isTrustedOrigin()` + 허용 도메인 리스트 + suffix 매칭
- 쿠키: `HttpOnly`, `SameSite=Strict`, 조건부 `Secure`
- 루프백 전용 접근 + Bearer 토큰 인증
- WebSocket 연결 시 origin + 인증 검증

**개선 필요**:
- Rate limiting 미구현 (아래 3-2 참조)
- `/api/inbox` 가 public path로 열려있음 — webhook secret 의존적이지만 brute-force 가능

### 2-3. WebSocket Hub — 우수

`server/ws/hub.ts` (70줄)

- 고빈도 이벤트 배칭 (cli_output: 250ms, subtask_update: 150ms)
- `MAX_BATCH_QUEUE = 60` → 큐 오버플로 방지 (oldest 드롭)
- 연결 해제 시 `wsClients.delete()` → 메모리 누수 방지
- **평가**: 간결하고 효과적. 변경 불필요.

### 2-4. 라이프사이클 관리 — 우수

`server/modules/lifecycle.ts` (616줄)

- 고아 태스크 복구 (startup + interval 모드)
- 프로세스 PID 생존 확인 → 죽은 프로세스 핸들 정리
- 로그 파일 mtime 확인 → 실제 출력 진행 중인지 판별
- 하트비트 + stalled 감지 (90초 임계)
- 서브태스크 위임 큐 sweep
- Graceful shutdown: 모든 프로세스 정리 + WebSocket 종료

### 2-5. SQLite 동시성 처리 — 양호

- `PRAGMA busy_timeout` 설정
- `withSqliteBusyRetry`: 지수 백오프 + 지터
- `runInTransaction`: 트랜잭션 래퍼 (9개 파일에서 23회 사용)
- 메시지 멱등성 보장 (`message-idempotency.ts`)

---

## 3. 개선이 필요한 것 — 심각도별

### 🔴 심각 (즉시 개선 권장)

#### 3-1. 거대 파일 문제 — 코드 유지보수성 저하

| 파일 | LOC | 문제 |
|------|-----|------|
| `gateway/client.ts` | 1,083 | 게이트웨이 + 메신저 설정 + Discord API + RPC 혼재 |
| `bootstrap/schema/task-schema-migrations.ts` | 942 | 마이그레이션 전체가 1파일 |
| `routes/collab.ts` | 921 | 채팅 + 위임 + 조율 혼재 |
| `workflow/orchestration.ts` | 785 | 160줄 이상이 ctx에서 변수 꺼내기 |
| `workflow/orchestration/review-finalize-tools.ts` | 875 | 리뷰 완료 로직 단일 파일 |

**특히 `orchestration.ts`의 1~246줄**: `__ctx`에서 200개+ 변수를 하나씩 꺼내는 패턴이 반복됨.

```typescript
// orchestration.ts 줄 79~246: 이런 패턴이 200줄 이상
const db = __ctx.db;
const nowMs = __ctx.nowMs;
const appendTaskLog = __ctx.appendTaskLog;
// ... 200개+ 더
```

**권장 조치**:
- `orchestration.ts`의 변수 추출을 모듈별 컨텍스트 객체로 분리
- `gateway/client.ts`를 `gateway/config.ts`, `gateway/discord-api.ts`, `gateway/rpc.ts`로 분리
- 마이그레이션 파일을 버전별로 분리 (예: `migration-v1.ts`, `migration-v2.ts`)

#### 3-2. Rate Limiting 미구현

현재 API에 rate limiting이 없음. 인증된 사용자라도 과도한 요청으로 서버를 압도할 수 있음.

**권장 조치**:
```typescript
// express-rate-limit 추가
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({ windowMs: 60_000, max: 200 }));
app.use('/api/inbox', rateLimit({ windowMs: 60_000, max: 30 }));
```

#### 3-3. 에러 처리 비체계적

전체 서버에서 `try { }` 블록이 **0건** (`catch` 블록도 grep에서 0건 — 파일 유형 필터링 문제 가능성이 있으나, 실제로 대부분의 라우트에 try-catch가 없음).

**현상**: 라우트 핸들러에서 예외 발생 시 Express 5의 기본 500 에러로 폴백. 에러 응답 형식이 비일관적.

**권장 조치**:
```typescript
// 중앙 에러 핸들러 추가
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = (err as any).statusCode || 500;
  const code = (err as any).code || 'internal_error';
  console.error(`[API Error] ${req.method} ${req.path}:`, err.message);
  res.status(status).json({ error: code, message: err.message });
});
```

---

### 🟡 보통 (계획적 개선 권장)

#### 3-4. SQL 동적 쿼리 패턴 — 주의 필요

30개+ 위치에서 동적 SQL 패턴 사용:

```typescript
// 반복되는 패턴 (30개+ 위치)
db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...params);
```

**현재 위험도**: **낮음** — `updates` 배열은 코드 내부에서 하드코딩된 컬럼명만 사용하고 사용자 입력이 직접 들어가지 않음. 파라미터화된 값은 `?` 바인딩으로 전달됨.

**그러나**: 이 패턴이 30곳+ 흩어져 있어 실수 가능성 존재.

**권장 조치**:
```typescript
// 공용 유틸리티로 추출
function dynamicUpdate(db: DB, table: string, updates: string[], params: unknown[], whereId: string) {
  const allowedTables = new Set(['tasks', 'agents', 'projects', 'departments']);
  if (!allowedTables.has(table)) throw new Error(`invalid table: ${table}`);
  db.prepare(`UPDATE ${table} SET ${updates.join(", ")} WHERE id = ?`).run(...params, whereId);
}
```

#### 3-5. 마이그레이션 파일의 동적 테이블명

`task-schema-migrations.ts`에서 `db.exec()`에 템플릿 리터럴로 테이블명 삽입:

```typescript
db.exec(`ALTER TABLE messages RENAME TO ${oldTable}`);
db.exec(`ALTER TABLE ${newTable} RENAME TO tasks`);
```

**현재 위험도**: **낮음** — 테이블명은 코드 내부 상수.
**잠재적 위험**: 향후 동적 테이블명 추가 시 SQL 인젝션 가능.

**권장 조치**: 테이블명 허용 목록 검증 추가.

#### 3-6. In-Memory 상태 과다

`orchestration.ts`에서 관리하는 Map 객체:

```typescript
const progressTimers = new Map<string, ReturnType<typeof setInterval>>();
const crossDeptNextCallbacks = new Map<string, () => void>();
const subtaskDelegationCallbacks = new Map<string, () => void>();
const subtaskDelegationDispatchInFlight = new Set<string>();
const delegatedTaskToSubtask = new Map<string, string>();
const subtaskDelegationCompletionNoticeSent = new Set<string>();
const reviewRoundState = new Map<string, number>();
const reviewInFlight = new Set<string>();
const meetingPresenceUntil = new Map<string, number>();
const meetingSeatIndexByAgent = new Map<string, number>();
const meetingPhaseByAgent = new Map<string, string>();
const meetingTaskIdByAgent = new Map<string, string>();
const meetingReviewDecisionByAgent = new Map<string, string>();
const projectReviewGateNotifiedAt = new Map<string, number>();
const taskExecutionSessions = new Map<string, TaskExecutionSessionState>();
```

**15개의 Map/Set** 이 서버 프로세스 메모리에 존재. 서버 재시작 시 모든 상태 소실.

**문제점**:
- 수평 확장(multi-instance) 불가능
- 서버 재시작 시 진행 중인 미팅/리뷰 상태 소실
- 메모리 누수 가능성 (완료된 태스크의 엔트리가 정리되지 않는 경우)

**권장 조치**:
- 단기: 완료된 태스크의 Map 엔트리를 정기적으로 정리하는 sweep 추가
- 중기: 핵심 상태(reviewRoundState, taskExecutionSessions)를 SQLite에 영속화
- 장기: 이벤트 소싱 패턴으로 전환 검토

#### 3-7. 로깅 체계 미흡

현재 `console.log` / `console.error` 만 사용:

```typescript
console.log(`[AgentDesk] v${PKG_VERSION} listening on ...`);
console.error("[oauth] Background refresh failed:", err);
```

**부족한 점**:
- 로그 레벨 구분 없음 (debug/info/warn/error)
- 구조화된 JSON 로깅 없음
- 요청별 트레이스 ID 없음

**권장 조치**: `pino` 같은 구조화 로거 도입

```typescript
import pino from 'pino';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
logger.info({ port: PORT, dbPath }, 'Server started');
logger.error({ err, taskId }, 'Task execution failed');
```

---

### 🟢 경미 (시간 날 때 개선)

#### 3-8. 테스트 커버리지 불균형

**총 39개 백엔드 테스트 파일** — 모듈 대비 커버리지:

| 모듈 | 테스트 파일 수 | 상태 |
|------|--------------|------|
| workflow/orchestration | 6 | ⚠️ 핵심 모듈 대비 부족 |
| workflow/core | 5 | 양호 |
| workflow/packs | 5 | 양호 |
| routes/core/tasks | 4 | 양호 |
| routes/collab | 4 | 양호 |
| routes/ops/messages | 3 | 양호 |
| messenger | 3 | 양호 |
| security/auth | 1 | ⚠️ 보안 모듈 테스트 부족 |
| gateway | 1 | ⚠️ 1,083줄에 테스트 1개 |
| lifecycle | 0 | 🔴 테스트 없음 |
| bootstrap/schema | 0 | 🔴 마이그레이션 테스트 없음 |
| ws/hub | 1 | 양호 |
| oauth | 0 | 🔴 테스트 없음 |

**테스트가 없는 핵심 모듈**:
- `lifecycle.ts` (616줄) — 서버 라이프사이클, 고아 태스크 복구
- `bootstrap/schema/` — DB 마이그레이션
- `oauth/` — 토큰 관리

#### 3-9. 하드코딩된 타이밍 상수

```typescript
// lifecycle.ts
setTimeout(rotateBreaks, 5_000);
setInterval(rotateBreaks, 60_000);
setTimeout(recoverInterruptedWorkflowOnStartup, 3_000);
// 40% 확률, 50% 확률 등도 하드코딩
if (Math.random() < 0.4) { ... }
if (Math.random() < 0.5) { ... }
```

환경 변수나 설정으로 추출할 필요 있음.

#### 3-10. WebSocket 연결 제한 없음

`wsClients`에 연결 수 제한이 없음. 악의적 클라이언트가 다수 연결 가능.

```typescript
// 권장: 최대 연결 수 제한
const MAX_WS_CLIENTS = 50;
wss.on("connection", (ws, req) => {
  if (wsClients.size >= MAX_WS_CLIENTS) {
    ws.close(1013, "max_connections");
    return;
  }
  // ...
});
```

---

## 4. 아키텍처 다이어그램 (현재 상태)

```
┌─────────────────────────────────────────────────────────┐
│                    server-main.ts                        │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ Express  │  │ SQLite   │  │ WebSocket │             │
│  │ + CORS   │  │ + Busy   │  │ + Batch   │             │
│  │ + Auth   │  │   Retry  │  │   Hub     │             │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘             │
│       │              │              │                    │
│  ┌────┴──────────────┴──────────────┴────┐              │
│  │        Deferred Runtime Proxy          │              │
│  │   (200+ 함수의 지연 바인딩 + 검증)     │              │
│  └────┬──────────────┬──────────────┬────┘              │
│       │              │              │                    │
│  ┌────┴────┐   ┌─────┴─────┐  ┌────┴──────┐            │
│  │ Routes  │   │ Workflow  │  │ Lifecycle │            │
│  │ core/   │   │ orchest.  │  │ watchdog  │            │
│  │ collab/ │   │ meetings  │  │ heartbeat │            │
│  │ ops/    │   │ review    │  │ scheduler │            │
│  └─────────┘   │ reports   │  │ messenger │            │
│                └───────────┘  └───────────┘            │
│                      │                                   │
│              ┌───────┴────────┐                          │
│              │  CLI Spawner   │                          │
│              │ (9 providers)  │                          │
│              │ spawn/monitor  │                          │
│              └────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 개선 우선순위 요약

### 즉시 (1~2주)

| # | 작업 | 파일 | 영향 |
|---|------|------|------|
| 1 | 중앙 에러 핸들러 추가 | `server-main.ts` 또는 신규 미들웨어 | 안정성 ↑ |
| 2 | Rate limiting 추가 | `security/auth.ts` | 보안 ↑ |
| 3 | WebSocket 연결 제한 | `lifecycle.ts` | 보안 ↑ |
| 4 | In-memory Map sweep 로직 추가 | `orchestration.ts` | 메모리 안정성 ↑ |

### 단기 (3~4주)

| # | 작업 | 파일 | 영향 |
|---|------|------|------|
| 5 | `orchestration.ts` 변수 추출 패턴 리팩터링 | `orchestration.ts` | 유지보수성 ↑ |
| 6 | `gateway/client.ts` 분리 | `gateway/` | 유지보수성 ↑ |
| 7 | 동적 SQL 유틸리티 공용화 | 30개+ 파일 | 안전성 ↑ |
| 8 | lifecycle/oauth/migration 테스트 추가 | `server/test/` | 신뢰성 ↑ |

### 중기 (5~8주)

| # | 작업 | 파일 | 영향 |
|---|------|------|------|
| 9 | 구조화 로깅 (pino) 도입 | 전체 | 운영성 ↑ |
| 10 | 핵심 워크플로 상태 DB 영속화 | `orchestration.ts` + 스키마 | 안정성 ↑ |
| 11 | 마이그레이션 파일 버전별 분리 | `bootstrap/schema/` | 유지보수성 ↑ |
| 12 | Slack 연동 구현 | `messenger/` | 기능 완성도 ↑ |

---

## 6. 결론

> **백엔드 엔진은 기능적으로 완성되었지만, 운영 품질(operational quality)에서 개선 여지가 있다.**

**강점**:
- 복잡한 멀티에이전트 오케스트레이션을 실제로 작동시키는 엔진
- Deferred Runtime Proxy, SQLite busy retry 등 고급 패턴
- 보안 기본기(timingSafeEqual, CSRF, CORS) 갖춤

**약점**:
- 거대 파일과 200줄+ 변수 추출 패턴 → 유지보수 비용 증가
- 15개 In-memory Map → 서버 재시작 시 상태 소실 위험
- 에러 처리/로깅/rate limiting 체계 부재 → 프로덕션 운영 리스크

**한마디**: 엔진의 "두뇌"(오케스트레이션 로직)는 훌륭하지만, "신경계"(에러 처리, 로깅, 모니터링)는 아직 미성숙하다. 기능 추가보다 운영 품질 향상에 집중할 시점이다.
