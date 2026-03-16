# AgentDesk 실행 파이프라인 버그 감사 보고서

> 작성일: 2026-03-16
> 분석 범위: 에이전트 설정 · 태스크 실행 · 에이전트 회의 · 에이전트 통신
> 상태: **✅ 전체 수정 완료 (2026-03-16)**

---

## 개요

소스코드 직접 분석을 통해 발견된 버그와 취약점 목록입니다.
AI 에이전트가 이 문서를 읽고 각 항목을 순서대로 수정할 수 있도록 작성되었습니다.

**수정 우선순위 기준:**
- 🔴 P0 — 서버 크래시 또는 데이터 손실 가능
- 🟡 P1 — 기능 오작동 (엣지케이스)
- 🔵 P2 — UX 불편 (사용자 피드백 누락)

---

## 버그 목록

### [BUG-01] 🔴 프롬프트 빌드 단계에 예외처리 없음

**파일:** `server/modules/routes/core/tasks/execution-run.ts`
**위치:** `buildTaskExecutionPrompt(...)` 호출 블록 (대략 라인 500~533)

**현재 코드:**
```typescript
const prompt = buildTaskExecutionPrompt(
  [
    (buildAvailableSkillsPromptBlock || ...)(provider, task.project_id),
    ...
    buildCharacterPersonaBlock(agent.persona_id, agent.id),
    buildDocumentGenerationGuidance(task.title, task.description, taskLang),
    ...
  ],
  { allowWarningFix: hasExplicitWarningFixRequest(task.title, task.description) },
);
```

**문제:**
`buildCharacterPersonaBlock()`, `buildDocumentGenerationGuidance()` 등 내부 함수가 예외를 발생시키면 try-catch 없이 호출 스택 전체가 폭발하여 태스크 실행 라우트 핸들러가 응답을 보내지 못하고 서버가 hanging 상태에 빠질 수 있음.

**수정 방법:**
`buildTaskExecutionPrompt(...)` 호출 전체를 try-catch로 감싸고, 실패 시 태스크를 `failed` 상태로 전환 후 400/500 응답 반환.

```typescript
let prompt: string;
try {
  prompt = buildTaskExecutionPrompt(
    [
      (buildAvailableSkillsPromptBlock || ...)(provider, task.project_id),
      ...
      buildCharacterPersonaBlock(agent.persona_id, agent.id),
      buildDocumentGenerationGuidance(task.title, task.description, taskLang),
      ...
    ],
    { allowWarningFix: hasExplicitWarningFixRequest(task.title, task.description) },
  );
} catch (err) {
  logger.error({ err, taskId: id }, "[execution-run] prompt build failed");
  db.prepare("UPDATE tasks SET status='failed', updated_at=? WHERE id=?").run(nowMs(), id);
  broadcast("task_updated", { id, status: "failed" });
  return res.status(500).json({ error: "prompt_build_failed", message: "Failed to build task prompt" });
}
```

---

### [BUG-02] 🟡 서브태스크 완료 감지 정규식이 따옴표 포함 제목에서 실패

**파일:** `server/modules/workflow/agents/providers/stream-tools.ts`
**위치:** `parseHttpAgentSubtasks()` 함수, 라인 45

**현재 코드:**
```typescript
const doneMatch = accum.buf.match(/\{"subtask_done"\s*:\s*"(.+?)"\}/);
```

**문제:**
`(.+?)` 패턴은 첫 번째 `"` 문자에서 캡처를 멈춤.
서브태스크 제목에 따옴표가 포함된 경우 (예: `Fix "auth" bug`) 파싱 실패.
에이전트가 `{"subtask_done": "Fix \"auth\" bug"}` 를 출력하면 `doneMatch`가 `null`이 되어 서브태스크가 영원히 완료 처리되지 않음.

**수정 방법:**
이스케이프된 따옴표까지 허용하는 패턴으로 교체.

```typescript
// 현재 (취약)
const doneMatch = accum.buf.match(/\{"subtask_done"\s*:\s*"(.+?)"\}/);

// 수정 후 (이스케이프 따옴표 허용)
const doneMatch = accum.buf.match(/\{"subtask_done"\s*:\s*"((?:[^"\\]|\\.)*)"\}/);
```

**패턴 설명:**
`(?:[^"\\]|\\.)*` = `"` 또는 `\` 이외의 문자이거나 `\.` (백슬래시 + 임의 문자) 반복

추가로 planMatch 패턴(라인 24)도 복잡한 중첩 JSON에서 greedy 문제가 있을 수 있으므로, 더 안전하게 하려면 JSON.parse를 먼저 시도하는 방식으로 리팩토링 고려.

---

### [BUG-03] 🔵 에이전트 저장 실패 시 UI 에러 피드백 없음

**파일:** `src/components/AgentManager.tsx`
**위치:** `handleSave()` 함수 내 catch 블록 (라인 168~172)

**현재 코드:**
```typescript
} catch (err) {
  console.error("Save failed:", err);
} finally {
  setSaving(false);
}
```

**문제:**
에이전트 생성/수정 실패 시 `console.error()`만 출력되고 사용자에게는 아무 피드백이 없음.
버튼 로딩 스피너만 사라지고 모달이 그대로 열린 채로 있어 사용자가 성공인지 실패인지 알 수 없음.

**수정 방법:**
컴포넌트 상태에 `saveError: string | null`을 추가하고 모달 내부에 에러 메시지를 표시.

```typescript
// 상태 추가
const [saveError, setSaveError] = useState<string | null>(null);

// catch 블록 수정
} catch (err) {
  console.error("Save failed:", err);
  setSaveError(err instanceof Error ? err.message : "저장에 실패했습니다. 다시 시도해주세요.");
} finally {
  setSaving(false);
}

// JSX: 모달 하단 저장 버튼 위에 에러 표시
{saveError && (
  <div style={{ color: "var(--th-danger-text)", fontSize: 12, marginBottom: 8 }}>
    {saveError}
  </div>
)}
```

아울러 모달이 열릴 때 `setSaveError(null)` 초기화 필요.

---

### [BUG-04] 🔵 아바타 업로드/삭제 실패 시 UI 피드백 없음

**파일:** `src/components/AgentManager.tsx`
**위치:** 라인 156~163

**현재 코드:**
```typescript
await api.uploadAgentAvatar(agentId, form.pendingAvatarDataUrl).catch((e) =>
  console.error("Avatar upload failed:", e),
);
// ...
await api.deleteAgentAvatar(agentId).catch((e) =>
  console.error("Avatar delete failed:", e),
);
```

**문제:**
아바타 업로드/삭제 실패가 조용히 무시됨. 에이전트는 저장 성공으로 보이지만 아바타만 변경 안 된 상태가 됨.

**수정 방법:**
`.catch()` 내에서 `setSaveError()` 호출로 부분 실패를 사용자에게 알림 (BUG-03 수정 후).

```typescript
await api.uploadAgentAvatar(agentId, form.pendingAvatarDataUrl).catch((e) => {
  console.error("Avatar upload failed:", e);
  setSaveError("에이전트는 저장되었지만 아바타 업로드에 실패했습니다.");
});
```

---

### [BUG-05] 🔵 메신저 수신자 시작 실패 시 silent (로그 없음)

**파일:** `server/modules/lifecycle.ts`
**위치:** 라인 751~753

**현재 코드:**
```typescript
const telegramReceiver = startTelegramReceiver({ db });
const discordReceiver = startDiscordReceiver({ db });
const slackReceiver = startSlackReceiver({ db });
```

**문제:**
`startTelegramReceiver` 등이 내부 설정 오류로 예외를 발생시키면 아무 로그 없이 서버 초기화가 중단될 수 있음.
또한 정상 시작 이후 폴링 실패도 사용자가 인지하기 어려움.

**수정 방법:**
각 receiver 시작을 try-catch로 보호하고 실패 시 warn 로그 출력.

```typescript
let telegramReceiver: ReturnType<typeof startTelegramReceiver> | null = null;
let discordReceiver: ReturnType<typeof startDiscordReceiver> | null = null;
let slackReceiver: ReturnType<typeof startSlackReceiver> | null = null;

try { telegramReceiver = startTelegramReceiver({ db }); }
catch (err) { logger.warn({ err }, "[lifecycle] Telegram receiver failed to start"); }

try { discordReceiver = startDiscordReceiver({ db }); }
catch (err) { logger.warn({ err }, "[lifecycle] Discord receiver failed to start"); }

try { slackReceiver = startSlackReceiver({ db }); }
catch (err) { logger.warn({ err }, "[lifecycle] Slack receiver failed to start"); }
```

`onBeforeClose()` 정리 코드도 null 체크 추가 필요:
```typescript
telegramReceiver?.stop();
discordReceiver?.stop();
slackReceiver?.stop();
```

---

### [BUG-06] 🔵 스트림 버퍼 고정 2KB 제한 — 장문 응답에서 서브태스크 손실

**파일:** `server/modules/workflow/agents/providers/stream-tools.ts`
**위치:** 라인 55~58

**현재 코드:**
```typescript
// Prevent unbounded growth: keep only last 2KB
if (accum.buf.length > 2048) {
  accum.buf = accum.buf.slice(-1024);
}
```

**문제:**
HTTP 에이전트(Copilot/Antigravity/로컬 LLM)가 2KB 이상의 청크를 출력하면서 JSON 경계 직전에 버퍼가 잘리면 `{"subtasks": [...]}` 또는 `{"subtask_done": "..."}` 패턴을 놓침.

**수정 방법:**
버퍼 크기 임계값을 8KB로 늘리되, JSON 토큰(`{`, `}`)이 완성된 구간은 이미 처리 후 제거되므로 실질적 누수는 미완성 JSON 구간에서만 발생. 임계값 상향이 가장 안전.

```typescript
// 수정: 8KB로 상향
if (accum.buf.length > 8192) {
  accum.buf = accum.buf.slice(-4096);
}
```

---

## 기능별 전체 현황

### 에이전트 설정 (생성/편집/삭제)
| 항목 | 상태 | 관련 버그 |
|------|------|----------|
| 에이전트 CRUD | ✅ 정상 | — |
| 프로필 이미지 업로드 | ✅ 정상 | BUG-04 (실패 피드백 없음) |
| AI 페르소나 생성 | ✅ 정상 | — |
| API 프로바이더 연결 | ✅ 정상 | — |
| 저장 에러 피드백 | ❌ 누락 | **BUG-03** |

### 태스크 생성
| 항목 | 상태 |
|------|------|
| 태스크 CRUD | ✅ 정상 |
| 칸반 보드 드래그&드롭 | ✅ 정상 |
| 배치 작업 | ✅ 정상 |
| 에이전트 자동 할당 | ✅ 정상 |
| 태스크 핸드오프 | ✅ 정상 |

### 태스크 실행 파이프라인
| 항목 | 상태 | 관련 버그 |
|------|------|----------|
| 에이전트 선택 → 스폰 | ✅ 정상 | — |
| 프롬프트 빌드 (Rules/Memory/Skills 주입) | ✅ 정상 | **BUG-01** (예외처리 없음) |
| CLI 프로세스 스폰 | ✅ 정상 | — |
| API 직접 호출 (Anthropic/OpenAI/Google) | ✅ 정상 | — |
| SSE 스트림 → WebSocket 터미널 | ✅ 정상 | — |
| 서브태스크 파싱 | ⚠️ 취약 | **BUG-02**, **BUG-06** |
| 토큰 비용 기록 | ✅ 정상 | — |
| post-task Hooks | ✅ 정상 | — |

### 에이전트 회의(Meeting)
| 항목 | 상태 |
|------|------|
| 회의 리더 선정 | ✅ 정상 |
| 회의 참석 등록 (좌석 배정) | ✅ 정상 |
| 발언 기록 (`meeting_minute_entries`) | ✅ 정상 |
| 검토 결정 분류 (review consensus) | ✅ 정상 |
| 다음 라운드 예약 | ✅ 정상 |
| 회의록 조회 `GET /api/tasks/:id/meeting-minutes` | ✅ 정상 |
| 회의 타임아웃 65초 | ✅ 정상 (설정 가능) |

### 에이전트 간 통신
| 항목 | 상태 | 관련 버그 |
|------|------|----------|
| 그룹 채팅 | ✅ 정상 | — |
| 공지사항/지시사항 | ✅ 정상 | — |
| 메신저 연동 (Discord/Slack/Telegram) | ✅ 정상 | **BUG-05** (시작 실패 무시) |
| WebSocket 실시간 스트리밍 | ✅ 정상 | — |

---

## 수정 순서 권장

```
1. BUG-01  server/modules/routes/core/tasks/execution-run.ts  (크래시 방지)
2. BUG-02  server/modules/workflow/agents/providers/stream-tools.ts  (서브태스크 파싱)
3. BUG-06  server/modules/workflow/agents/providers/stream-tools.ts  (버퍼 크기)
4. BUG-03  src/components/AgentManager.tsx  (에러 UI)
5. BUG-04  src/components/AgentManager.tsx  (아바타 에러 UI)
6. BUG-05  server/modules/lifecycle.ts  (메신저 시작 보호)
```

BUG-02와 BUG-06은 같은 파일이므로 한 번에 수정.

---

## 수정 완료 후 검증 방법

### BUG-01 검증
1. `buildCharacterPersonaBlock`이 오류를 던지도록 임시 변경
2. `POST /api/tasks/:id/run` 호출
3. 응답이 `{ "error": "prompt_build_failed" }` 500이어야 함
4. DB의 해당 태스크 `status = 'failed'` 확인

### BUG-02 검증
1. 서브태스크 제목에 따옴표 포함: `Fix "auth" bug`
2. HTTP 에이전트가 `{"subtask_done": "Fix \"auth\" bug"}` 출력하도록 테스트
3. 서브태스크가 `done` 상태로 전환되는지 확인

### BUG-03 검증
1. API 서버를 내린 상태에서 에이전트 저장 시도
2. 모달 내부에 빨간 에러 메시지가 표시되어야 함

---

## 관련 파일 경로 요약

```
server/modules/routes/core/tasks/
├── execution-run.ts           ← BUG-01 수정 대상
└── execution-run-auto-assign.ts

server/modules/workflow/agents/providers/
├── stream-tools.ts            ← BUG-02, BUG-06 수정 대상
└── api-provider-tools.ts

server/modules/
└── lifecycle.ts               ← BUG-05 수정 대상

src/components/
└── AgentManager.tsx           ← BUG-03, BUG-04 수정 대상
```
