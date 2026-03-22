# 에이전트 설정·실행 아키텍처 (현행 구현 기준)

> **목적:** AgentDesk에서 **에이전트가 DB·UI에 어떻게 저장되고**, **어떤 조건으로 어떤 실행 엔진(CLI / HTTP API / OAuth / 내장 런타임)** 이 선택되는지 **코드 기준**으로 한곳에 정리한다.  
> **관련 문서:** 전략·로드맵 성격은 [`../strategy/AGENT-RUNTIME-SPEC.md`](../strategy/AGENT-RUNTIME-SPEC.md)를 참고한다. 본 문서는 **이미 구현된 동작**에 초점을 둔다.

---

## 1. 문서 범위

| 포함 | 제외(또는 다른 문서) |
|------|---------------------|
| `agents` 테이블 필드와 런타임 분기 | REST 전체 스펙 → [`../specs/api.md`](../specs/api.md) |
| 태스크 실행 `/api/tasks/:id/run` | UI 화면 상세 → [`../design/UI-SCREENS.md`](../design/UI-SCREENS.md) |
| 직접 채팅 `scheduleAgentReply` | 제품 전략 → `strategy/` |
| `agent-runtime` (`startExecutionLoop`) | ERD 전체 → [`schema-erd.md`](schema-erd.md) |

---

## 2. 에이전트 데이터 모델

### 2.1 SQLite `agents` 테이블

정의: `server/modules/bootstrap/schema/base-schema.ts`

| 컬럼 | 의미 |
|------|------|
| `id`, `name`, `name_ko` / `name_ja` / `name_zh` | 식별·표시 이름 |
| `department_id` | 소속 부서 (`departments.prompt` 등과 결합) |
| `workflow_pack_key` | 워크플로 팩 (기본 `development` 등) |
| `role` | `team_leader` \| `senior` \| `junior` \| `intern` |
| `acts_as_planning_leader` | 기획 리더 역할 (0/1) |
| `cli_provider` | 실행 백엔드 종류 (아래 표) |
| `oauth_account_id` | Copilot / Antigravity 시 연결된 OAuth 행 |
| `api_provider_id`, `api_model` | HTTP API 실행 시 Provider 행·모델 |
| `cli_model`, `cli_reasoning_level` | CLI별 모델·추론 (제공자별 지원 다름) |
| `persona_id` | `prompts/personas/{id}.md` 연동 |
| `avatar_emoji`, `sprite_number` | UI 표현 |
| `status` | `idle` \| `working` \| `break` \| `offline` |
| `current_task_id` | 현재 붙은 태스크 (실행 중일 때) |
| `stats_tasks_done`, `stats_xp` | 통계 |

### 2.2 `cli_provider` 허용 값

스키마 CHECK와 프론트 `CliProvider` 타입 (`src/types/index.ts`)에 맞춤:

`claude` · `codex` · `gemini` · `opencode` · `copilot` · `antigravity` · `cursor` · `api` · `ollama`

### 2.3 PATCH 시 정규화 (설정 변경 규칙)

`server/modules/routes/core/agents/patch-body.ts` (`prepareAgentPatchBody`) 요지:

- `cli_provider` 변경 시 OAuth/API/CLI 모델 필드가 **제공자에 맞게 초기화·검증**됨.
- `api`가 아니면 `api_provider_id` / `api_model`을 비울 수 있음.
- `copilot` → `github`, `antigravity` → `google_antigravity` OAuth 계정만 허용.

---

## 3. 실행 엔진 선택 로직 (핵심)

에이전트는 **“한 명”이지만**, **진입점(태스크 vs 채팅 vs agent-runtime)** 에 따라 **다른 모듈**이 호출된다.

### 3.1 태스크 실행: `POST /api/tasks/:id/run`

파일: `server/modules/routes/core/tasks/execution-run.ts`

**Provider 결정 (중요):**

```text
api_provider_id 가 설정되어 있으면 → provider = "api"  (cli_provider 값과 무관)
그렇지 않으면              → provider = cli_provider || "claude"
```

즉 **에이전트에 API Provider를 붙이면 태스크는 항상 HTTP API 경로**로 간다.

지원 provider 문자열 (태스크): `claude`, `codex`, `gemini`, `opencode`, `copilot`, `antigravity`, `api`.

### 3.2 직접(1:1) 채팅: `scheduleAgentReply`

파일: `server/modules/routes/collab/direct-chat-handlers.ts` → `server/modules/routes/collab/direct-chat-runtime-reply.ts` (`runDirectReplyExecution`)

분기 요약:

| 조건 | 동작 |
|------|------|
| `cli_provider === "api"` 이고 `api_provider_id` 있음 | `executeApiProviderAgent` — 스트리밍, `chat_stream` 이벤트 |
| `cli_provider` 가 `copilot` / `antigravity` | OAuth HTTP 에이전트, 스트리밍 |
| 그 외 (예: `claude`) | `runAgentOneShot` — 로컬 CLI `spawn` |

**태스크와의 차이:** 채팅은 `api_provider_id`만 있고 `cli_provider`가 `api`가 아닌 경우, **CLI 경로로 갈 수 있음** (태스크의 “API 우선 강제”와 불일치할 수 있음).

### 3.3 Agent Runtime (내장 LLM + Tool 루프)

파일: `server/modules/agent-runtime/execution-loop.ts` (`startExecutionLoop`)

- Anthropic API 호출 + `server/modules/agent-runtime/tools.ts` 기반 **툴 루프**.
- 진입 예:
  - `POST /api/agent-runtime/run` — `server/modules/agent-runtime/routes.ts`
  - 프로젝트 킥오프 후 첫 태스크 자동 실행 — `server/modules/routes/core/projects/kickoff.ts`

**메인 태스크 런(`execution-run`)과 별도 코드 경로**이므로, “전체가 항상 CLI” 또는 “항상 agent-runtime”이 아니다.

---

## 4. 태스크 실행 파이프라인 (상세)

### 4.1 공통 전처리

- 담당 에이전트 조회, `agent_busy` 검사 (`current_task_id` + `activeProcesses`).
- **Worktree** 생성·격리 (`createWorktree`) — 실패 시 실행 차단.
- 프롬프트 조립: 부서, 태스크 연속 컨텍스트, 스킬, 규칙, 메모리, **캐릭터 페르소나** 등 (`execution-start-task.ts` 등).

### 4.2 `provider === "api"`

- `launchApiProviderAgent` → `server/modules/workflow/agents/providers/api-provider-tools.ts`
- 요청 본문은 **텍스트 completion** 중심 (Anthropic `messages`, OpenAI 호환 `chat/completions` 등).
- **별도의 `tools` 배열(웹 검색 등)은 이 경로에서 일반적으로 붙지 않음** (직접 채팅·태스크 공통).

### 4.3 `provider === "claude"` 등 CLI

- `spawnCliAgent` + `server/modules/workflow/core/cli-tools.ts` 의 `buildAgentArgs`
- Claude 예: `--print`, `--output-format=stream-json`, `--dangerously-skip-permissions` 등.
- `noTools: true` 인 원샷(회의·간단 응답 등)에서는 `--tools=` 로 도구 비활성.

### 4.4 `copilot` / `antigravity`

- PTY가 아닌 **HTTP 기반** 실행 (`launchHttpAgent` 계열).

### 4.5 에이전트·태스크 상태

- 실행 시작 시 `agents.status = 'working'`, `current_task_id` 갱신, `task_update` / `agent_status` 브로드캐스트.

---

## 5. 직접 채팅 파이프라인 (상세)

### 5.1 트리거

- 클라이언트 `POST /api/messages` 등으로 메시지 저장 후, 수신 에이전트에 대해 `scheduleAgentReply` 호출 (`chat-routes.ts` 등).

### 5.2 의도·분기 (상위)

`direct-chat-handlers.ts`:

- 오프라인 → 즉시 안내 메시지.
- 프로젝트 바인딩 대기 중 → 후속 메시지로 상태 머신 처리.
- 태스크로 분류되는 메시지 → `runTaskFlowWithResolvedProject`.
- 그 외 → `runDirectReplyExecution`.

### 5.3 지연

`direct-chat-runtime-reply.ts`: `runDirectReplyExecution` 시작 시 **약 1~3초** `setTimeout` (의도적 지연).

### 5.4 CLI 실패 시

- `runAgentOneShot` **reject** 시 과거에는 사용자 메시지 없이 로그만 남을 수 있었음 → 현행은 try/catch로 `buildCliFailureMessage` 전달 등 개선 가능 (구현 시점 기준 코드 확인).

---

## 6. 페르소나·프롬프트 파일

`server/modules/workflow/core/character-persona.ts`

| 우선순위 | 소스 |
|----------|------|
| 1 (주) | `prompts/agents/{agentId}.md` |
| 2 (베이스) | `prompts/personas/{personaId}.md` |

에이전트 전용 `.md`가 있으면 그것이 본문, `persona_id` 파일은 `[Base Persona]`로 앞에 붙을 수 있음.

---

## 7. 원샷 실행 `runAgentOneShot`

파일: `server/modules/workflow/core/one-shot-runner.ts`

- 회의 발언, 프로젝트 종류 추론, 페르소나 자동 멘트, **직접 채팅의 CLI 경로** 등에서 사용.
- `provider === "api"` 이면 `executeApiProviderAgent` 호출.
- 그 외는 `buildAgentArgs` + `child_process.spawn` (Windows에서는 `shell: true` 등 플랫폼 차이 있음).

---

## 8. 프론트엔드 타입·표시

- `src/types/index.ts` 의 `Agent` 인터페이스가 API 응답과 대응.
- 단톡/그룹 채팅 메시지 헤더는 `sender_id` / `sender_name` / `sender_agent` 조합으로 발신자 표시 (`GroupChatMessageList.tsx` 등).

---

## 9. WebSocket 이벤트 (실행 관찰)

대표 타입 (코드 전반):

- `cli_output` — 태스크 구독 시 스트림 (직접 채팅 API 스트림은 `chat_stream` 등 별도).
- `task_update`, `agent_status` — 보드·에이전트 상태.
- `new_message` — 메시지 저장 후 브로드캐스트.

---

## 10. 관련 소스 파일 인덱스

| 영역 | 경로 |
|------|------|
| 스키마 | `server/modules/bootstrap/schema/base-schema.ts` |
| 에이전트 PATCH | `server/modules/routes/core/agents/patch-body.ts`, `register-agent-routes-*.ts` |
| 태스크 실행 | `server/modules/routes/core/tasks/execution-run.ts`, `execution-start-task.ts` |
| 직접 채팅 | `server/modules/routes/collab/direct-chat-handlers.ts`, `direct-chat-runtime-reply.ts` |
| CLI 인자 | `server/modules/workflow/core/cli-tools.ts` |
| 원샷 | `server/modules/workflow/core/one-shot-runner.ts` |
| API Provider HTTP | `server/modules/workflow/agents/providers/api-provider-tools.ts` |
| 내장 런타임 | `server/modules/agent-runtime/execution-loop.ts`, `routes.ts` |
| 페르소나 | `server/modules/workflow/core/character-persona.ts`, `prompts/agents/`, `prompts/personas/` |
| 직접 프롬프트 문구 | `server/modules/workflow/core/meeting-prompt-tools.ts` (`buildDirectReplyPrompt`) |
| 안전 응답 가공 | `server/modules/workflow/core/reply-core-tools.ts` (`chooseSafeReply`) |

---

## 11. 설계 시 주의할 불일치 포인트

1. **태스크는 `api_provider_id` 있으면 무조건 API** — 채팅은 `cli_provider`에 더 종속.
2. **태스크 메인 런**과 **agent-runtime**은 서로 다른 스택(후자는 서버 내장 툴 루프).
3. **API Provider 경로**는 범용 스트리밍 completion이라 **웹 검색 도구 자동 부착은 기본 없음** (제품 정책·API 스펙 확장 시 별도 구현).

---

## 12. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-16 | 초안 작성 — 현행 코드 기준 통합 |

---

*이 문서는 구현 변경 시 함께 갱신하는 것을 권장한다.*
