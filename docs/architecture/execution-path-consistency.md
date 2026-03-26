# Execution Path Consistency — P1 분석 및 수정 계획

> **목적:** 태스크 실행 경로와 PM 리뷰 경로 간 불일치 분석, 오케스트레이션 화면 연동을 위한 수정 계획
> **우선순위:** P1 (Critical) — 단, PM 프로바이더 라우팅(§2-1)은 이미 해소됨
> **관련 화면:** Orchestration Window (모든 탭)
> **Updated:** 2026-03-26
>
> **변경 이력:**
> - 2026-03-25: 초안 작성
> - 2026-03-26: 코덱스 코드 검증 기반 보정 — PM 본선 경로가 이미 `runAgentOneShot(pm)`으로
>   에이전트 고유 프로바이더를 정확히 사용함을 확인. Phase 2를 "bug fix"→"시스템 원샷 경로
>   정합화"로 재정의. Phase 1-B/5를 기존 인프라 재사용으로 축소. 우선순위 재배치.

---

## 0. 프로바이더 아키텍처 (전제 지식)

수정 계획을 이해하려면 프로바이더 시스템의 이중 구조를 먼저 알아야 한다.

### 0-1. 에이전트별 프로바이더 설정

```sql
agents.cli_provider  -- "claude"|"codex"|"gemini"|"opencode"|"copilot"|"antigravity"|"cursor"|"api"|"ollama"
agents.api_provider_id  -- api_providers.id (cli_provider="api"일 때만 사용)
agents.api_model        -- 모델명 (cli_provider="api"일 때만 사용)
agents.cli_model        -- CLI 모델 오버라이드 (claude, codex 등에서)
agents.cli_reasoning_level  -- Codex reasoning level
```

**핵심:** `cli_provider`가 `"api"`이면 HTTP 호출, 그 외는 CLI 프로세스 spawn.

### 0-2. API 프로바이더 테이블

```sql
api_providers (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,           -- openai|anthropic|google|ollama|openrouter|together|groq|cerebras|custom
  base_url TEXT,
  api_key_enc TEXT,    -- AES-256-GCM 암호화
  enabled INTEGER,
  models_cache TEXT,   -- JSON array
  models_cached_at INTEGER
)
```

### 0-3. 프로바이더 해석 흐름 (3가지)

**A. 태스크 실행** — 에이전트 고유 설정 직접 사용:
```
agent.cli_provider 읽기
  ├── "api" → resolveProvider(db, agent.api_provider_id)
  │            → api_providers 조회 → api_key 복호화 → HTTP 호출
  ├── "claude"/"codex"/"gemini"/... → CLI spawn (--max-turns 200)
  └── "ollama" → Ollama API 호출
```

**B. PM 원샷** — `runAgentOneShot(pm, ...)` → PM 에이전트 고유 설정 직접 사용:
```
pm-orchestrator.ts → runAgentOneShot(pm, prompt, { ... })
  → one-shot-runner.ts:113 에서 agent.cli_provider 읽기
    ├── "api" → agent.api_provider_id + agent.api_model → HTTP 호출
    ├── "claude"/"codex"/... → agent.cli_model, agent.cli_reasoning_level → CLI spawn
    └── 폴백 → "claude"
```
> PM 오케스트레이터는 `callLlmOneShotAuto()`를 사용하지 않음 (import조차 안 됨).
> PM의 4개 호출 지점(L210, L437, L548, L664) 모두 `runAgentOneShot(pm, ...)`으로
> PM 에이전트 자신의 프로바이더 설정을 정확히 사용한다.

**C. 시스템 원샷** — `callLlmOneShotAuto()` → `resolveCliProviderFromAgents()`:
```
kickoff.ts, projects.ts 등 시스템성 호출에서 사용
1. 아무 에이전트에서 api_provider_id 있으면 → API 모드 (해당 provider로 HTTP)
2. 아무 에이전트에서 CLI provider 있으면 → CLI 모드
3. settings.defaultProvider → CLI 모드
4. 폴백 → "claude"
```

**현재 상태:** 경로 A와 B는 모두 **해당 에이전트**의 설정을 정확히 사용. 경로 C만 **아무 에이전트**의 설정을 사용하며, 이는 킥오프/자동 배정 등 특정 에이전트가 없는 시스템 호출에 한정된다.

### 0-4. 설정 화면에서의 등록 흐름

```
[Settings → API 탭]  API 프로바이더 CRUD → api_providers 테이블
[Settings → CLI 탭]  CLI 도구 상태 확인 + 모델 선택
[Settings → General] defaultProvider 설정 → settings 테이블
[Settings → API 탭]  "Assign" → 에이전트에 api_provider_id + api_model 할당
```

### 0-5. 기본 모델 매핑 (`llm-client.ts`)

```typescript
const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.0-flash",
  ollama: "llama3.2",
  openrouter: "anthropic/claude-sonnet-4-6",
  together: "meta-llama/Llama-3-70b-chat-hf",
  groq: "llama-3.3-70b-versatile",
  cerebras: "llama-3.3-70b",
  custom: "gpt-4o",
};
```

### 0-6. 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/settings/ApiSettingsTab.tsx` | API 프로바이더 CRUD UI |
| `src/components/settings/CliSettingsTab.tsx` | CLI 도구 상태 + 모델 선택 UI |
| `src/components/settings/GeneralSettingsTab.tsx` | 기본 프로바이더 설정 UI |
| `src/components/settings/ApiAssignModal.tsx` | 에이전트에 API 모델 할당 모달 |
| `src/components/settings/useApiProvidersState.ts` | API 프로바이더 상태 훅 |
| `src/api/providers-reports-github.ts` | API 프로바이더 fetch/CRUD |
| `server/modules/routes/ops/api-providers.ts` | API 프로바이더 CRUD 라우트 |
| `server/modules/agent-runtime/llm-client.ts` | 프로바이더 해석 + LLM 호출 |
| `server/modules/routes/ops/settings-stats.ts` | 설정 GET/PUT |

---

## 1. 문제 정의

AgentDesk에는 세 개의 LLM 실행 경로가 존재한다:

| 경로 | 용도 | 진입점 | 프로바이더 선택 |
|------|------|--------|---------------|
| **태스크 실행** | 에이전트가 태스크를 수행 | `execution-start-task.ts` → `execution-loop.ts` | 해당 에이전트의 `cli_provider` + `api_provider_id` |
| **PM 원샷** | PM이 리뷰/배정/실패 처리 | `pm-orchestrator.ts` → `runAgentOneShot(pm, ...)` | **PM 에이전트 고유 설정** (§0-3 경로 B) |
| **시스템 원샷** | 킥오프/자동 배정 등 | `kickoff.ts` → `callLlmOneShotAuto()` | **아무 에이전트**에서 자동 감지 (§0-3 경로 C) |

> **2026-03-26 검증 결과:** PM 프로바이더 라우팅은 이미 정확함.
> `pm-orchestrator.ts`의 4개 호출 지점(L210, L437, L548, L664) 모두
> `runAgentOneShot(pm, ...)`을 사용하며, `one-shot-runner.ts:113`에서
> PM 에이전트의 `cli_provider`, `api_provider_id`, `api_model` 등을 직접 읽는다.
> `callLlmOneShotAuto()`는 pm-orchestrator에서 import조차 되지 않는다.

태스크 실행과 PM 원샷은 **서로 다른 시기에, 다른 설계 목표로** 만들어졌다:
- 태스크 실행: "자율 에이전트 작업" → 풍부한 컨텍스트, 도구 접근, 멀티턴
- PM 원샷: "경량 오케스트레이션 판단" → 최소 컨텍스트, 도구 없음, 싱글턴

**프로바이더 라우팅은 해소되었으나**, 다음 불일치가 여전히 존재한다:
1. ~~PM이 자신의 프로바이더가 아닌 다른 에이전트의 프로바이더를 사용 (라우팅 버그)~~ → 해소됨
2. 오케스트레이션 화면에 표시할 PM 데이터가 빈약함
3. 시스템 원샷(킥오프/자동 배정)의 프로바이더 선택이 비결정적임 (경로 C)
4. 프로바이더/언어/타임아웃 등 기본 설정이 경로마다 다름

### 원칙: 모델 선택은 유저의 판단

> **어떤 LLM 모델을 PM으로 사용할지는 유저가 결정한다.**
> 시스템이 "이 모델은 PM 역할에 부적합합니다"라고 막아서는 안 된다.
> 유저가 Ollama + llama3.2로 PM을 돌리겠다면 그것은 유저의 선택이다.
>
> 우리가 할 일:
> 1. **라우팅 정확히** — PM 에이전트가 설정한 프로바이더를 정확히 사용
> 2. **파싱 견고하게** — 어떤 LLM 출력이든 최선을 다해 해석
> 3. **실패 시 투명하게** — 시스템이 임의 결정하지 않고 유저에게 알림

---

## 2. 불일치 상세 분석

### 2-1. 프로바이더 선택 (~~CRITICAL~~ → RESOLVED / 잔여: LOW)

> **2026-03-26 코드 검증 결과: PM 본선 경로는 이미 정확함.**

```
태스크 실행:   agent.cli_provider + agent.api_provider_id  →  해당 에이전트 고유 설정
PM 원샷:      runAgentOneShot(pm, ...) → one-shot-runner.ts:113 → PM 에이전트 고유 설정  ✅ 정확
시스템 원샷:   callLlmOneShotAuto() → resolveCliProviderFromAgents() → 아무 에이전트  ⚠️ 잔여 이슈
```

**PM 원샷** (`pm-orchestrator.ts` → `one-shot-runner.ts:113`):
```typescript
// PM 에이전트의 설정을 직접 사용 — 이미 정확함
const provider = agent.cli_provider || "claude";
// agent.api_provider_id, agent.api_model, agent.cli_model, agent.cli_reasoning_level 직접 참조
```

**시스템 원샷** (`llm-client.ts:244-272` — 킥오프/자동 배정에서만 사용):
```typescript
// 4단계 폴백: 아무 에이전트의 설정을 가져옴
1. ANY agent with api_provider_id → 해당 provider로 HTTP
2. ANY agent with CLI provider → 해당 CLI spawn
3. settings.defaultProvider
4. "claude"
```

**잔여 이슈 (시스템 원샷만 해당):**

| 호출 위치 | 용도 | 문제 |
|-----------|------|------|
| `kickoff.ts:496` | 킥오프 태스크 생성 | 아무 에이전트의 프로바이더 사용 (비결정적) |
| `kickoff.ts:827` | 추가 태스크 생성 | 동일 |
| `kickoff.ts:1131` | 내부 파이프라인 태스크 생성 | 동일 |
| `projects.ts:104` | 자동 배정 | 동일 |

**영향 (잔여):**
- 시스템 원샷에서 어떤 에이전트의 프로바이더가 선택될지 비결정적
- PM 본선 경로(리뷰/실패 처리/프로젝트 리뷰)에는 영향 없음

**수정:** §4-2 참조 — 시스템 원샷 경로 정합화 (버그 수정이 아닌 아키텍처 정리)

---

### 2-2. 시스템 프롬프트 격차 (HIGH)

| 항목 | 태스크 실행 (~1000줄) | PM 리뷰 (~50줄) |
|------|----------------------|----------------|
| 에이전트 스킬 | `buildAvailableSkillsPromptBlock()` | 없음 |
| 부서 프롬프트 | `getDepartmentPromptForPack()` | 없음 |
| 페르소나 | `buildCharacterPersonaBlock()` | 없음 |
| 규칙 | `buildRulesPromptBlock()` | 없음 |
| 메모리 | `buildMemoryPromptBlock()` | 없음 |
| 이전 PM 피드백 | `loadPendingInterruptPrompts()` | 없음 |
| 대화 컨텍스트 | `getRecentConversationContext()` | 없음 |
| 워크플로우 가이드 | `buildWorkflowPackExecutionGuidance()` | 없음 |
| 증거 기반 정책 | `EVIDENCE_BASED_EXECUTION_LINES` | 없음 |
| **태스크 결과** | N/A | result tail 2000자 |
| **체크리스트** | N/A | 4항목 (scope, errors, minimal, completeness) |

**영향:**
- PM은 에이전트가 왜 특정 결정을 내렸는지 알 수 없음
- 규칙, 메모리, 이전 컨텍스트 없이 판단

**수정:** PM 리뷰 컨텍스트 보강 (§4-4 참조)

---

### 2-3. 도구 접근 (HIGH)

| | 태스크 실행 | PM 리뷰 |
|---|---|---|
| 도구 수 | 30+개 (list_files, read_file, write_file, run_command 등) | **0개** (`noTools: true`) |
| 실행 모드 | 스트리밍, 멀티턴 (max-turns 200) | 원샷, 싱글턴 (max-turns 1) |
| 타임아웃 | 에이전트 설정 | 30초 고정 |

```typescript
// pm-orchestrator.ts:210
runAgentOneShot(pm, prompt, {
  projectPath,
  timeoutMs: 30_000,
  noTools: true,       // ← 도구 완전 비활성화
});
```

**영향:**
- PM 리뷰는 순수 텍스트 분석만 가능
- 코드 변경 확인, 테스트 실행, 파일 검증 불가
- 증거 기반 실행 정책(evidence-based)과 모순

**완화:** §4-7의 공유 .md 기반 소통으로 PM이 도구 없이도 에이전트가 작성한 보고서/블로커/변경 파일 목록을 파일 경유로 전문 참조 가능. 도구 접근 자체를 주는 것은 아니지만, 판단 근거는 대폭 보강됨.

---

### 2-4. CLI 인수 불일치 (MEDIUM)

```typescript
// 태스크 실행 - Claude
["--dangerously-skip-permissions", "--print", "--verbose", "--max-turns", "200"]

// PM 원샷 - Claude
["claude", "--dangerously-skip-permissions", "--print", "--max-turns", "1"]
```

---

### 2-5. 언어 감지 (LOW)

```typescript
// 태스크 실행: 태스크 내용 기반
const taskLang = getPreferredLanguage() || resolveLang(taskData.description ?? taskData.title);

// PM 리뷰: 글로벌 설정만
const lang = getPreferredLanguage();
```

---

### 2-6. 결과 컨텍스트 (MEDIUM)

```typescript
// PM이 보는 것: 결과의 마지막 2000자만
resultTail = task.result.length > 2000
  ? "..." + task.result.slice(-2000)
  : task.result;
```

**수정:** §4-4에서 즉시 개선 (2000→4000), §4-7에서 근본 해결 (파일 기반 전문 저장)

---

### 2-7. 승인 판정 파싱의 견고성 (MEDIUM)

PM 승인 판정은 정규식 패턴 매칭에 의존:
```typescript
const isApprove = /^APPROVE[:\s]/im.test(text)
  || /승인|합격|통과|lgtm|approve/i.test(text);
```

PM은 유저가 선택한 어떤 LLM이든 될 수 있으므로(Claude, GPT, Gemini, Llama 등),
출력 포맷이 모델마다 다를 수 있다. 현재 정규식이 모든 모델의 출력을 안정적으로
파싱하지 못할 위험이 있다.

**수정 방향:** 모델을 제한하는 것이 아니라, **파싱을 방어적으로** 강화:
- 다중 패턴 매칭 (더 많은 변형 커버)
- 파싱 실패 시 시스템이 임의 결정하지 않고 유저에게 알림
- §4-3 참조

---

### 2-8. 에이전트 간 소통 컨텍스트 손실 (HIGH)

현재 PM↔에이전트 소통은 **DB 경유 + 하드 트렁케이션**으로 대부분의 컨텍스트가 소실된다.

#### 잘림 지점 전수 조사

| 위치 | 코드 | 잘림 |
|------|------|------|
| PM이 받는 태스크 결과 | `task.result.slice(-2000)` | 마지막 2000자만 (수만 자 결과 → 2000자) |
| PM 리뷰 로그 기록 | `text.slice(0, 200)` | PM 판정 근거 200자만 저장 |
| 프로젝트 리뷰 시 태스크 요약 | `result.slice(-500)` + 전체 8000자 제한 | 태스크당 500자, 전체 8000자 |
| 에이전트 재실행 컨텍스트 | `result.slice(-900)` | 이전 실행 결과 900자만 |
| 리뷰 노트 | `LIMIT 6` | 최근 6건만 |
| 회의 하이라이트 | `summarizeForMeetingBubble(content, 140)` | 발언당 140자 |
| 알림 본문 | `text.slice(0, 200~300)` | 200~300자 |

#### 현재 소통 구조의 한계

```
PM 리뷰 결과 (수천 자)
  → task_logs에 200자만 저장
    → 에이전트 재실행 시 900자만 주입
      → 에이전트는 PM이 왜 수정을 요청했는지 맥락 파악 불가
```

- **일방향**: PM→에이전트 피드백만 존재. 에이전트가 PM에게 의견/질문/블로커 보고 불가
- **휘발성**: DB 레코드는 세션이 끝나면 묻힘. 프로젝트 이력으로 남지 않음
- **팀 가시성 없음**: 에이전트 A의 작업이 에이전트 B에게 어떤 영향을 주는지 공유 안 됨

#### 근본 원인

DB 기반 소통은 **트랜잭션 기록용**으로 설계됨. 에이전트 간 풍부한 소통은 설계 목표가 아니었음.
CLI 에이전트는 이미 파일 시스템에 자유롭게 접근할 수 있으므로, 파일 기반 소통이 자연스러운 확장.

**수정:** §4-7 참조 — 공유 .md 기반 팀 소통

---

## 3. 오케스트레이션 화면과의 관계

### 3-1. 데이터 부족 매핑

| 화면 요소 | 필요 데이터 | 현재 상태 | 원인 |
|-----------|------------|----------|------|
| **Header: TOKENS/BUDGET** | 프로젝트별 토큰/비용 | `"—"` 하드코딩 | 두 경로 모두 토큰 미추적 |
| **Timeline: 프로그레스 바** | 태스크별 진행률 | 45% 하드코딩 | 진행률 필드 없음 |
| **Timeline: Task Inspector** | 파일 변경, CLI 히스토리, PM 배정 근거 | 완전 미구현 | 실행 경로에서 diff/CLI 저장 안 함 |
| **Logs: 로그 스트림** | 실시간 로그 + PM 리뷰 과정 | 100% 플레이스홀더 | PM 리뷰 로그가 한 줄(200자)뿐 |
| **Agents: Fitness** | task_type별 성공률 | 가짜 계산 | DB에 실데이터 있으나 UI 미연동 |
| **Room: Communication Feed** | PM 지시, 에이전트 상태, 블로커 | 태스크 제목만 나열 | PM 이벤트 구조가 빈약 |
| **Room: Reasoning Tree** | 상태 아이콘 (✓/●/○) | 유니코드 문자 | CLAUDE.md Rule 0-1 위반 |
| **Room: Team Communication** | PM 지시 전문 + 에이전트 의견/블로커 | DB 200자 잘림 | 소통이 DB 경유, 트렁케이션 (§2-8) |

### 3-2. 근본 원인 체인

```
PM 원샷 경로가 경량 설계
  → PM 리뷰 데이터가 빈약 (200자 로그, 구조 없음)
    → task_execution_events.metadata_json 미활용
      → 오케스트레이션 화면에 표시할 PM 데이터 부족
        → Logs/Room/Timeline Inspector 구현 불가

에이전트 간 소통이 DB 경유
  → 모든 컨텍스트가 200~2000자로 트렁케이션
    → PM은 태스크 결과 전문을 볼 수 없음
    → 에이전트는 PM 피드백 전문을 받을 수 없음
    → 에이전트 간 의견 교환/블로커 보고 채널 없음
      → Room 탭의 Team Communication이 빈약
```

---

## 4. 수정 계획

### 4-1. Phase 1: UI 전용 수정 (백엔드 변경 없음)

이미 존재하는 데이터를 UI에 연결하는 작업.

#### [1-A] 프로그레스 바: execution_state 매핑

**영향 탭:** Timeline, Agents, Room

```typescript
const EXECUTION_STATE_PROGRESS: Record<string, number> = {
  queued: 5,
  claiming: 10,
  workspace_preparing: 15,
  ready: 20,
  running: 40,
  awaiting_review: 80,
  succeeded: 100,
  failed: 0,
  cancelled: 0,
};

// status 기반 폴백
const STATUS_PROGRESS: Record<string, number> = {
  inbox: 0, planned: 0, in_progress: 40, review: 80, done: 100, failed: 0,
};

function getTaskProgress(task: Task): number {
  if (task.execution_state && EXECUTION_STATE_PROGRESS[task.execution_state] !== undefined) {
    return EXECUTION_STATE_PROGRESS[task.execution_state];
  }
  return STATUS_PROGRESS[task.status] ?? 0;
}
```

**수정 파일:**
- `src/components/orchestration/tabs/TimelineTab.tsx:134` — 45% → `getTaskProgress()`
- `src/components/orchestration/tabs/AgentsTab.tsx:121` — 45% → `getTaskProgress()`
- `src/components/orchestration/tabs/RoomTab.tsx:69` — 45% → `getTaskProgress()`

#### [1-B] Fitness 실데이터 연동

**영향 탭:** Agents

```typescript
// 현재 (가짜):
DEV: ${Math.min(99, 70 + agent.stats_tasks_done * 3)}%

// 개선: 기존 API 재사용
// GET /api/agents/performance (agent-performance.ts:41) — 팀 전체 집계
// GET /api/agents/:id/performance (register-agent-routes-metrics.ts:16) — 개별 에이전트
// → success_rate, avg_duration_ms, pack breakdown 등 이미 제공
```

> **참고:** 새 API를 만들 필요 없음. 기존 `/api/agents/performance` 엔드포인트가
> 에이전트별 `success_rate`, `total`, `done`, `failed_exec`, `avg_duration_ms`를 이미 반환한다.
> 현재 구현은 `agent_task_fitness` 테이블 중심이 아니라 `tasks` 테이블 직접 집계 기반이므로,
> UI에서 해당 API를 호출하여 연동하면 된다.

**수정 파일:**
- `src/components/orchestration/tabs/AgentsTab.tsx:128` — 가짜 계산 → 기존 API 데이터

#### [1-C] TOKENS/BUDGET API 연동

**영향 탭:** Header

```typescript
// GET /api/projects/:id/cost-summary
// → { totalTokens, totalUsd, thisMonthTokens, thisMonthUsd }
```

**수정 파일:**
- `src/components/orchestration/MetricsHeader.tsx:34-35` — `"—"` → API 데이터

#### [1-D] 코드 정리

- `TimelineTab.tsx:8-9,12` — 미사용 props (`subtasks`, `departments`) 제거
- `AgentsTab.tsx:57` — 미사용 `dept` 변수 제거
- `RoomTab.tsx:153` — 유니코드 `\u2713/\u25CF/\u25CB` → 인라인 SVG
- `TimelineTab.tsx:149` — `"↳"` → 인라인 SVG
- `TimelineTab.tsx:47` — `"CLUSTER_STABLE"` 하드코딩 → 동적 상태 계산

---

### 4-2. Phase 2: 시스템 원샷 경로 정합화 (백엔드, 소~중규모)

> **2026-03-26 재정의:** PM 본선 경로는 이미 `runAgentOneShot(pm, ...)`으로 PM 고유 프로바이더를 정확히 사용.
> 이 Phase는 "PM provider bug fix"가 아니라, **시스템 원샷(`callLlmOneShotAuto`) 경로의 아키텍처 정합화**다.
> 킥오프/자동 배정 등에서 아무 에이전트의 프로바이더를 비결정적으로 선택하는 문제를 정리한다.

**잔여 문제:** `callLlmOneShotAuto()`가 `resolveCliProviderFromAgents()`로 아무 에이전트의
프로바이더를 가져옴. 킥오프 태스크 생성, 자동 배정 등 시스템 호출에서 프로바이더 선택이 비결정적.

#### 수정 방향: 시스템 원샷용 프로바이더 해석 개선

```typescript
// llm-client.ts — 새 함수 추가
function resolveProviderForAgent(
  db: Database,
  agent: { cli_provider: string; api_provider_id?: string | null; api_model?: string | null },
): { mode: "api"; apiProviderId: string; model: string }
   | { mode: "cli"; cliProvider: string } {

  // 1. API 모드: agent.cli_provider === "api" && api_provider_id 존재
  if (agent.cli_provider === "api" && agent.api_provider_id) {
    const provider = db.prepare(
      `SELECT id FROM api_providers WHERE id = ? AND enabled = 1`
    ).get(agent.api_provider_id);
    if (provider) {
      return {
        mode: "api",
        apiProviderId: agent.api_provider_id,
        model: agent.api_model || getDefaultModel(/* providerType */),
      };
    }
    // provider가 비활성화/삭제된 경우 → CLI 폴백
  }

  // 2. CLI 모드: agent.cli_provider가 유효한 CLI provider
  const validCli = ["claude", "codex", "gemini", "cursor", "opencode"];
  if (validCli.includes(agent.cli_provider)) {
    return { mode: "cli", cliProvider: agent.cli_provider };
  }

  // 3. 최종 폴백
  return { mode: "cli", cliProvider: "claude" };
}
```

#### PM 경로 — 변경 불필요

```typescript
// pm-orchestrator.ts — 현재 코드가 이미 정확함
const response = await runAgentOneShot(pm, prompt, {
  projectPath,
  timeoutMs: 30_000,
  noTools: true,
});
// → one-shot-runner.ts:113에서 pm.cli_provider, pm.api_provider_id 등을 직접 사용
// → callLlmOneShotAuto()를 거치지 않음
```

#### 시스템 원샷 경로 — 개선 대상

`callLlmOneShotAuto()`의 프로바이더 선택을 더 결정적으로 만드는 방법:

```typescript
// 방법 1: settings.defaultProvider를 우선순위로 올림
// 현재: api_provider_id 있는 아무 에이전트 → CLI 있는 아무 에이전트 → defaultProvider → claude
// 개선: defaultProvider → api_provider_id 에이전트 → CLI 에이전트 → claude

// 방법 2: callLlmOneShotAuto에 preferredProvider 옵션 추가
export async function callLlmOneShotAuto(opts: {
  db: Database;
  systemPrompt: string;
  userPrompt: string;
  preferredProvider?: string;  // ← 호출자가 힌트 제공
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string>
```

#### 수정 범위

| 파일 | 변경 |
|------|------|
| `server/modules/agent-runtime/llm-client.ts` | `callLlmOneShotAuto()` 프로바이더 선택 로직 개선 (preferredProvider 옵션 또는 우선순위 변경) |
| `server/modules/routes/core/projects/kickoff.ts` | 킥오프/추가 태스크 호출 시 프로바이더 힌트 전달 |

#### PM 경로 — 변경 불필요

PM 오케스트레이터의 모든 호출은 이미 `runAgentOneShot(pm, ...)`으로 PM 에이전트 고유 설정을 정확히 사용:

| 호출 (pm-orchestrator.ts) | 용도 | 현재 상태 |
|------|------|------|
| `pmReviewTask()` (L210) | 개별 태스크 리뷰 | `runAgentOneShot(pm, ...)` — 정확 |
| `pmHandleFailure()` (L437) | 실패 처리 | `runAgentOneShot(pm, ...)` — 정확 |
| `writeProgressMd()` (L548) | progress.md 작성 | `runAgentOneShot(pm, ...)` — 정확 |
| `pmProjectLevelReview()` (L664) | 프로젝트 전체 평가 | `runAgentOneShot(pm, ...)` — 정확 |

#### 시스템 원샷 호출 목록 (정합화 대상)

| 호출 위치 | 용도 | 현재 |
|-----------|------|------|
| `kickoff.ts:496` | 킥오프 태스크 생성 | `callLlmOneShotAuto()` — 비결정적 |
| `kickoff.ts:827` | 추가 태스크 생성 | `callLlmOneShotAuto()` — 비결정적 |
| `kickoff.ts:1131` | 내부 파이프라인 태스크 생성 | `callLlmOneShotAuto()` — 비결정적 |
| `projects.ts:104` | 자동 배정 | `callLlmOneShotAuto()` — 비결정적 |

---

### 4-3. Phase 3: PM 리뷰 로그 구조화 + 파싱 강건화 (백엔드, 중규모)

PM 리뷰 결과를 구조화된 JSON으로 기록. 오케스트레이션 Logs/Room 탭에서 소비.
PM은 유저가 선택한 어떤 LLM이든 될 수 있으므로, 파싱은 방어적으로 설계.

#### 승인 판정 파싱 강건화

```typescript
// 현재: 단순 정규식 (특정 LLM 출력 포맷에 의존)
const isApprove = /^APPROVE[:\s]/im.test(text)
  || /승인|합격|통과|lgtm|approve/i.test(text);

// 개선: 다중 패턴 + 파싱 실패 시 투명한 처리
function parseReviewDecision(text: string): "APPROVE" | "REVISE" | "UNKNOWN" {
  // 1. 명시적 승인 패턴 (다양한 LLM 출력 커버)
  const approvePatterns = [
    /^APPROVE[:\s]/im,
    /\bAPPROVE[D]?\b/i,
    /승인|합격|통과|lgtm/i,
    /decision[:\s]*approve/i,
    /verdict[:\s]*approve/i,
  ];
  // 2. 명시적 수정 요청 패턴
  const revisePatterns = [
    /^REVISE[:\s]/im,
    /\bREVISE[D]?\b/i,
    /\bREJECT/i,
    /수정\s*요청|반려|재작업/i,
    /decision[:\s]*revise/i,
    /needs?\s*(more\s+)?work/i,
  ];

  if (approvePatterns.some(p => p.test(text))) return "APPROVE";
  if (revisePatterns.some(p => p.test(text))) return "REVISE";

  // 3. 파싱 실패 → 시스템이 임의 결정하지 않고 UNKNOWN 반환
  return "UNKNOWN";
}

// UNKNOWN 처리: 유저에게 알림 (오케스트레이션 화면에 표시)
if (decision === "UNKNOWN") {
  appendTaskLog(db, taskId, "pm_oversight", JSON.stringify({
    action: "PARSE_FAILED",
    rawResponse: response.slice(0, 500),
    provider: pmProvider,
  }));
  // → 태스크를 review 상태로 유지, 유저가 직접 판단
  // → 오케스트레이션 Room/Logs 탭에 파싱 실패 이벤트 표시
}
```

#### task_logs 구조화

```typescript
// 현재:
appendTaskLog(db, taskId, "pm_oversight",
  `PM approved: ${response.slice(0, 200)}`);

// 개선:
appendTaskLog(db, taskId, "pm_oversight", JSON.stringify({
  action: "APPROVE" | "REVISE" | "REASSIGN" | "ESCALATE" | "PARSE_FAILED",
  checklist: {
    scopeMatch: boolean,
    errorsDetected: boolean,
    minimalScope: boolean,
    completeness: boolean,
  },
  flags: {
    scopeDrift: boolean,
    excessiveScope: boolean,
    evidenceCited: boolean,
    fileTouchCount: number,
  },
  reasoning: response.slice(0, 500),   // DB 요약용. 전문은 Phase 7의 {task-id}-report.md에 저장
  reportPath: `docs/tasks/${taskId}-report.md`,  // ← Phase 7: 전문 파일 경로 참조
  provider: pmProvider,
  model: pmModel,         // ← 어떤 모델이 판정했는지 기록
  durationMs: number,
  resultTailLength: number,
}));
```

#### task_execution_events.metadata_json 활용

```typescript
// 현재: metadata_json = null
// 개선:
db.prepare(`INSERT INTO task_execution_events
  (task_id, event_type, from_state, to_state, summary, metadata_json, ...)
`).run(taskId, "pm_approved", "review", "done", summary,
  JSON.stringify({
    checklist,
    flags: reviewFlags,
    agentName: agent.name,
    pmName: pm.name,
    provider: pmProvider,
    reviewRound: attempt,
  }),
  0, 0, 0, now
);
```

**수정 파일:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 리뷰 로그 포맷

---

### 4-4. Phase 4: PM 리뷰 컨텍스트 보강 (백엔드, 중규모)

PM 리뷰 프롬프트에 추가 컨텍스트 포함.

> **Phase 7과의 관계:**
> Phase 4는 Phase 7(공유 .md) 이전에 적용 가능한 **즉시 개선**이다.
> Phase 7 이후에는 파일 기반 전문이 주 컨텍스트가 되므로, Phase 4의 DB 쿼리는
> **폴백/요약용**으로 유지된다 (파일 없을 때, 빠른 요약 필요 시).

#### 추가할 항목

```typescript
// 1. 태스크 로그 요약 (주요 이벤트) — DB에서 빠른 조회
const recentLogs = db.prepare(`
  SELECT kind, message, created_at FROM task_logs
  WHERE task_id = ? AND kind IN ('system', 'error', 'pm_oversight')
  ORDER BY created_at DESC LIMIT 15
`).all(taskId);

// 2. 이전 리뷰 피드백 (연속성) — Phase 7 이전: DB 쿼리 / 이후: 파일 전문
const previousRevisions = db.prepare(`
  SELECT message FROM task_logs
  WHERE task_id = ? AND kind = 'pm_oversight'
    AND message LIKE '%REVISE%'
  ORDER BY created_at DESC LIMIT 3
`).all(taskId);

// 3. result tail 확대 (Phase 7 이전의 즉시 개선)
const RESULT_TAIL_LENGTH = 4000; // 2000 → 4000
// Phase 7 이후: task report 파일에서 전문 참조, DB tail은 폴백
```

#### prompts/pm/review-task.md 수정

```markdown
## Agent Output (tail)
{{taskResult}}

## Execution Log Summary
{{executionLogSummary}}

## Previous Review Feedback (if any)
{{previousRevisions}}

## Team Communication (if available)
{{teamBoardContext}}

## Review Checklist
1. Scope Match ...
```

**수정 파일:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 프롬프트 빌드 로직
- `prompts/pm/review-task.md` — 템플릿 확장

---

### 4-5. Phase 5: 태스크 완료 데이터 UI 연결 (프론트엔드 중심, 소~중규모)

> **2026-03-26 보정:** `auto-completions.ts:97-162`에서 `task_report_archives`에 자동 저장 +
> worktree diff summary 수용 경로가 이미 구현되어 있다. 새 저장소를 만들 필요 없이,
> 기존 `task_report_archives` + `task_execution_events.metadata_json` 데이터를
> Timeline Inspector / Logs / Room 탭에 연결하면 된다.

Timeline Task Inspector 데이터 소스.

```typescript
// 이미 존재하는 코드 (auto-completions.ts:97-162):
// autoSaveTaskReport() — task_report_archives에 summary_markdown 저장
//   포함 항목: title, description, result, changes (worktree diff), duration
//
// 추가 필요한 작업: 프론트엔드에서 이 데이터를 조회·표시
// GET /api/tasks/:id/report → task_report_archives.summary_markdown 반환
// → Timeline Inspector에서 변경 파일 목록 + 실행 요약 표시
```

**수정 파일:**
- `server/modules/routes/core/tasks/` — task report 조회 API 추가 (기존 데이터 노출)
- `src/components/orchestration/tabs/TimelineTab.tsx` — Task Inspector에 report 표시

---

### 4-6. Phase 6: 언어/max-turns 일관성 (백엔드, 소규모)

```typescript
// 언어 일관성
const lang = getPreferredLanguage() || resolveLang(task.description ?? task.title);

// max-turns / max_tokens 조정 — PM의 프로바이더 모드에 따라 분기
const resolved = resolveProviderForAgent(db, pmAgent);

if (resolved.mode === "cli") {
  // CLI 모드: --max-turns 조정 (1 → 3, 리뷰 재시도 여유)
  ["claude", "--dangerously-skip-permissions", "--print", "--max-turns", "3"]
} else {
  // API 모드: maxTokens 파라미터로 제어 (원샷이므로 turns 개념 없음)
  callLlmOneShotForAgent(db, pmAgent, {
    systemPrompt, userPrompt,
    maxTokens: 4096,  // 리뷰 결과 + 체크리스트 출력에 충분한 토큰
  });
}
```

**핵심:** CLI 모드에서는 `--max-turns`로 멀티턴 횟수를 제어하지만, API 모드에서는 싱글턴이므로 `maxTokens`만 조정하면 된다. `callLlmOneShotForAgent()`(§4-2)가 이를 자동 처리.

**수정 파일:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 언어 감지 + 모드별 분기
- `server/modules/agent-runtime/llm-client.ts` — `callLlmOneShotForAgent()` maxTokens 파라미터

---

### 4-7. Phase 7: 공유 .md 기반 팀 소통 (백엔드+프론트, 대규모)

현재 PM↔에이전트 소통은 DB 경유로 200~2000자로 잘린다(§2-8).
파일 시스템 기반 공유 .md로 전환하면 잘림 없이 팀 소통이 가능하다.

#### 설계 원칙

- **잘림 없음** — 파일이므로 크기 제한 없음
- **양방향** — PM도, 에이전트도 자유롭게 읽기/쓰기
- **잔존 가치** — 프로젝트 폴더에 남아 나중에도 참조 가능 (DB와 달리 묻히지 않음)
- **CLI 에이전트 네이티브** — CLI 에이전트는 이미 파일 시스템 접근 가능, 추가 도구 불필요

#### 디렉터리 구조

```
{project_path}/
├── docs/
│   ├── progress.md              ← (이미 있음) PM이 태스크 완료 시 작성
│   ├── team-board.md            ← (신규) 팀 소통 보드
│   └── tasks/
│       ├── {task-id}-report.md  ← (신규) 태스크별 상세 보고서
│       └── ...
```

#### team-board.md 구조

PM과 모든 에이전트가 공유하는 팀 소통 보드. append-only로 운영.

```markdown
# Team Board — {project_name}

---

## [2026-03-25 14:30] PM → ALL | 킥오프 지시
프로젝트 목표: ...
우선순위: ...
각 에이전트 배정:
- Agent-A: task-001 (API 구현)
- Agent-B: task-002 (UI 구현)

---

## [2026-03-25 15:10] Agent-A → PM | 블로커 보고
task-001 진행 중 DB 스키마 이슈 발견.
`users` 테이블에 `email` 컬럼이 없음.
제안: migration 추가 후 진행?

---

## [2026-03-25 15:15] PM → Agent-A | 지시
migration 추가 승인. task-001 스코프에 포함.

---

## [2026-03-25 16:00] Agent-B → PM | 의존성 알림
task-002(UI)가 task-001(API)의 엔드포인트에 의존.
Agent-A의 API 완료 후 진행하겠음.

---

## [2026-03-25 17:00] PM → ALL | 리뷰 결과
task-001 리뷰 완료: APPROVE
- scope match: ✔
- errors: 없음
- completeness: ✔
전체 리뷰 내용은 docs/tasks/task-001-report.md 참조.
```

#### {task-id}-report.md 구조

태스크별 전체 보고서. DB의 200자 잘림 없이 전문 저장.

```markdown
# Task Report: {task-title}

## 기본 정보
- Task ID: {task-id}
- 담당: {agent-name}
- 상태: done
- task_type: {task_type}

## 실행 결과
{task.result 전문 — 잘림 없음}

## PM 리뷰
### 라운드 1
- 판정: REVISE
- 체크리스트: scope ✔ / errors ✘ (null check 누락) / minimal ✔ / completeness ✔
- PM 피드백 전문:
  {PM 리뷰 응답 전문 — 잘림 없음}

### 라운드 2
- 판정: APPROVE
- 체크리스트: scope ✔ / errors ✔ / minimal ✔ / completeness ✔
- PM 피드백 전문:
  {PM 리뷰 응답 전문}

## 변경 파일
{git diff --stat 결과}
```

#### 구현: PM 측 (쓰기)

```typescript
// pm-orchestrator.ts — PM 리뷰 후 보고서 작성
async function writeTaskReport(
  projectPath: string, taskId: string, task: Task,
  decision: string, reviewResponse: string, checklist: object, round: number,
) {
  const reportsDir = join(projectPath, "docs", "tasks");
  mkdirSync(reportsDir, { recursive: true });

  const reportPath = join(reportsDir, `${taskId}-report.md`);
  const roundEntry = `
### 라운드 ${round}
- 판정: ${decision}
- 체크리스트: ${formatChecklist(checklist)}
- PM 피드백 전문:
${reviewResponse}
`;

  if (existsSync(reportPath)) {
    // append — 이전 라운드 기록 유지
    appendFileSync(reportPath, roundEntry, "utf-8");
  } else {
    // 첫 생성
    const header = `# Task Report: ${task.title}\n\n## 기본 정보\n- Task ID: ${taskId}\n- 담당: ${task.assigned_agent_name}\n- task_type: ${task.task_type}\n\n## PM 리뷰\n`;
    writeFileSync(reportPath, header + roundEntry, "utf-8");
  }
}

// team-board.md에 요약 append
async function appendTeamBoard(
  projectPath: string, sender: string, target: string, content: string,
) {
  const boardPath = join(projectPath, "docs", "team-board.md");
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const entry = `\n---\n\n## [${timestamp}] ${sender} → ${target}\n${content}\n`;

  if (existsSync(boardPath)) {
    appendFileSync(boardPath, entry, "utf-8");
  } else {
    mkdirSync(join(projectPath, "docs"), { recursive: true });
    writeFileSync(boardPath, `# Team Board\n${entry}`, "utf-8");
  }
}
```

#### 구현: 에이전트 측 (읽기 + 쓰기)

CLI 에이전트는 이미 `read_file`, `write_file` 도구로 파일 시스템에 접근 가능.
에이전트 시스템 프롬프트에 팀 보드 사용 규칙만 추가하면 된다.

```markdown
<!-- prompts/system/agent-runtime.md 에 추가 -->

## Team Communication
- 블로커, 질문, 의존성 이슈는 `docs/team-board.md`에 기록하세요.
- 포맷: `## [YYYY-MM-DD HH:MM] {your-name} → PM | {제목}`
- PM 지시사항은 같은 파일에서 확인하세요.
- 태스크 상세 보고서는 `docs/tasks/{task-id}-report.md`에서 확인하세요.
```

#### 구현: PM 리뷰 시 팀 보드 참조

```typescript
// pm-orchestrator.ts — PM 리뷰 프롬프트에 팀 보드 컨텍스트 추가
function buildReviewContext(projectPath: string, taskId: string): string {
  const parts: string[] = [];

  // 1. team-board.md에서 해당 태스크 관련 소통 추출
  const boardPath = join(projectPath, "docs", "team-board.md");
  if (existsSync(boardPath)) {
    const board = readFileSync(boardPath, "utf-8");
    // 최근 항목 or 태스크 관련 항목 필터 (전체를 넣으면 토큰 낭비)
    const recentEntries = extractRecentEntries(board, 5);
    if (recentEntries) parts.push("## Recent Team Communication\n" + recentEntries);
  }

  // 2. 이전 리뷰 라운드 (잘림 없는 전문)
  const reportPath = join(projectPath, "docs", "tasks", `${taskId}-report.md`);
  if (existsSync(reportPath)) {
    const report = readFileSync(reportPath, "utf-8");
    parts.push("## Previous Review Rounds\n" + report);
  }

  return parts.join("\n\n");
}
```

#### DB vs 파일 역할 분리

| 역할 | 저장소 | 이유 |
|------|--------|------|
| 상태 전이 (status, execution_state) | DB | 트랜잭션, 인덱싱, WebSocket 트리거 |
| 구조화된 이벤트 (task_execution_events) | DB | 쿼리, 집계, 오케스트레이션 UI |
| PM 판정 요약 (task_logs) | DB | 빠른 조회, 오케스트레이션 Logs 탭 |
| **PM 리뷰 전문** | **파일** (.md) | 잘림 없음, 전체 맥락 보존 |
| **에이전트 의견/블로커** | **파일** (.md) | 양방향, CLI 네이티브 |
| **팀 소통 이력** | **파일** (.md) | 프로젝트 잔존 가치, git 추적 |
| **태스크 실행 결과 전문** | **파일** (.md) | result 전체 보존 |

**핵심:** DB는 "빠른 조회 + 상태 관리", 파일은 "전체 컨텍스트 + 팀 소통". 둘 다 유지하되 역할이 다름.
DB의 task_logs 200자 기록은 오케스트레이션 UI 빠른 렌더링용으로 유지. 전문은 파일에 저장.

#### 오케스트레이션 화면 연동

| 탭 | 파일 데이터 활용 |
|----|-----------------|
| **Room** | `team-board.md` 파싱 → Communication Feed에 전체 소통 표시 |
| **Logs** | `{task-id}-report.md` 파싱 → PM 리뷰 전문 + 체크리스트 |
| **Timeline Inspector** | `{task-id}-report.md` → 변경 파일, 실행 결과 전문 |

```typescript
// 프론트엔드: API로 파일 내용 조회
// GET /api/projects/:id/team-board → team-board.md 내용 반환
// GET /api/projects/:id/tasks/:taskId/report → task report 내용 반환
```

#### 수정 파일

| 파일 | 변경 |
|------|------|
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | `writeTaskReport()`, `appendTeamBoard()` 호출 추가 |
| `server/modules/routes/core/projects/` | 팀 보드/태스크 리포트 읽기 API 추가 |
| `prompts/system/agent-runtime.md` | 팀 보드 사용 규칙 추가 |
| `prompts/pm/review-task.md` | 팀 보드 + 이전 리뷰 전문 컨텍스트 |
| `src/components/orchestration/tabs/RoomTab.tsx` | team-board.md 파싱 + Communication Feed |
| `src/components/orchestration/tabs/LogsTab.tsx` | task report 전문 표시 |

---

## 5. 수정 우선순위

| 순서 | Phase | 작업량 | 백엔드 | 영향 탭 | 의존성 | 비고 |
|------|-------|--------|--------|---------|--------|------|
| 1 | 1-D. 코드 정리 (규칙 위반 수정) | 소 | 없음 | All | 없음 | |
| 2 | 1-A. 프로그레스 바 매핑 | 소 | 없음 | Timeline, Agents, Room | 없음 | |
| 3 | 1-B. Fitness 실데이터 | 소 | 없음 | Agents | 없음 | 기존 API 재사용 |
| 4 | 1-C. TOKENS/BUDGET 연동 | 소 | 없음 | Header | 없음 | |
| 5 | 3. PM 리뷰 로그 구조화 | 중 | O | Logs, Room | 없음 | 체감 효과 큼 |
| 6 | 4. PM 리뷰 컨텍스트 보강 | 중 | O | (간접) | Phase 3 | |
| 7 | 5. 태스크 완료 데이터 UI 연결 | 소 | 소 | Timeline Inspector | 없음 | 기존 데이터 노출 |
| 8 | 6. 언어/max-turns(CLI)/maxTokens(API) 일관성 | 소 | O | (간접) | 없음 | |
| 9 | 2. 시스템 원샷 경로 정합화 | 소~중 | O | (간접) | 없음 | PM 본선은 이미 정확 |
| 10 | 7. 공유 .md 기반 팀 소통 | 대 | O | Room, Logs, Timeline Inspector | Phase 3 | |

---

## 6. 구현 방향성

### 6-1. 현재 → 목표: Before / After

#### Before (현재)

```
[에이전트 태스크 실행]                    [PM 리뷰]
 풍부한 컨텍스트 (1000줄 프롬프트)         빈약한 컨텍스트 (50줄)
 에이전트 고유 프로바이더                   PM 에이전트 고유 프로바이더 (정확)
 도구 30+개, 멀티턴                       도구 0개, 싱글턴
 result 전문 보유                         result 마지막 2000자만

        │                                      │
        ▼                                      ▼
 [DB: task_logs]                         [DB: task_logs]
  실행 로그 전문                           PM 판정 200자 요약
        │                                      │
        ▼                                      ▼
 [오케스트레이션 화면]
  Timeline: 45% 하드코딩
  Logs: 100% 플레이스홀더
  Room: 태스크 제목만 나열
  Agents: 가짜 Fitness

에이전트 간 소통: 없음 (일방향 DB 200자)
```

#### After (목표)

```
[에이전트 태스크 실행]                    [PM 리뷰]
 풍부한 컨텍스트                           보강된 컨텍스트 (로그 요약 + 팀 보드)
 에이전트 고유 프로바이더                   PM 에이전트 고유 프로바이더 (정확한 라우팅)
 도구 30+개, 멀티턴                       도구 없음, 싱글턴 (but 파일 기반 전문 참조)
 result 전문 보유                         result 전문 (파일 경유)

        │                                      │
        ▼                                      ▼
 [파일: {task-id}-report.md]             [파일: {task-id}-report.md]
  실행 결과 전문                           PM 리뷰 전문 (라운드별)
  변경 파일 목록                           체크리스트 + 판정 근거
        │                                      │
        ├──────── [파일: team-board.md] ────────┤
        │          양방향 팀 소통 보드           │
        │          블로커/의견/지시 전문          │
        ▼                                      ▼
 [DB: task_logs — 요약]                  [DB: task_logs — 구조화 JSON]
  빠른 조회용 요약                         action, checklist, flags, reportPath
        │                                      │
        ▼                                      ▼
 [오케스트레이션 화면]
  Timeline: execution_state 기반 실시간 진행률
  Logs: 구조화된 PM 이벤트 + task report 전문 링크
  Room: team-board.md 소통 피드 + PM 판정 전문
  Agents: 실제 Fitness 데이터 + 프로바이더/모델 표시
```

### 6-2. 구현 로드맵

3단계로 나눠서 점진적으로 전환한다. 각 단계는 독립적으로 배포 가능.

#### Stage A: 즉시 개선 (Phase 1 + 6) — 기존 데이터 활용, UI 체감 최대화

**목표:** 백엔드 로직 변경 없이 (Phase 1) 또는 최소 변경으로 (Phase 6) 오케스트레이션 화면을 동작시킴.

```
Phase 1-D: 코드 정리 (유니코드→SVG, 미사용 props 제거)
Phase 1-A: 프로그레스 바 → execution_state 매핑
Phase 1-B: Fitness → 기존 /api/agents/performance API 연동
Phase 1-C: TOKENS/BUDGET → cost-summary API 연동
Phase 6:   언어/max-turns 일관성
```

> **Phase 2(시스템 원샷 정합화)는 Stage A에서 제외.**
> PM 본선 경로는 이미 정확하므로 긴급성이 낮다. Stage B 이후에 진행.

**완료 기준:**
- 오케스트레이션 화면 4탭이 모두 실데이터 표시 (하드코딩/플레이스홀더 0개)
- `tsc -b --noEmit` 에러 0

**검증:**
- 오케스트레이션 화면에서 진행률, Fitness, 토큰이 실시간 갱신 확인

---

#### Stage B: PM 데이터 보강 (Phase 3 + 4 + 5 + 2) — 구조화 + 컨텍스트 + 경로 정합

**목표:** PM 리뷰 데이터를 구조화하고, PM이 더 풍부한 컨텍스트로 판단하게 함. 기존 데이터를 UI에 연결.

```
Phase 3:   task_logs JSON 구조화 + parseReviewDecision() 강건화
Phase 4:   PM 리뷰 프롬프트에 로그 요약/이전 피드백 추가
Phase 5:   기존 task_report_archives 데이터를 Timeline Inspector에 연결
Phase 2:   시스템 원샷(kickoff/auto-assign) 경로 정합화
```

**완료 기준:**
- task_logs의 PM 이벤트가 JSON 파싱 가능 (action, checklist, flags, provider, model)
- PM 리뷰 프롬프트에 실행 로그 요약 + 이전 리뷰 피드백 포함
- PARSE_FAILED 시 유저에게 알림 (오케스트레이션 화면 표시)
- Logs 탭에서 PM 이벤트 구조화 표시
- Timeline Inspector에서 기존 task_report_archives의 변경 파일 목록 표시

**검증:**
- 다양한 LLM(Claude, GPT, Llama)으로 PM 리뷰 → APPROVE/REVISE/UNKNOWN 정확 파싱
- REVISE → 재실행 → 2차 리뷰에서 이전 피드백이 프롬프트에 포함 확인
- Logs 탭에서 체크리스트 항목별 pass/fail 시각화 확인

---

#### Stage C: 팀 소통 전환 (Phase 7) — 파일 기반 소통

**목표:** DB 트렁케이션에서 파일 기반 전문 소통으로 전환.

```
Phase 7:   team-board.md + {task-id}-report.md + 에이전트 프롬프트 규칙
           + 오케스트레이션 Room/Logs 연동 API
```

**완료 기준:**
- PM 리뷰 전문이 `docs/tasks/{task-id}-report.md`에 저장 (잘림 없음)
- PM 지시/에이전트 블로커가 `docs/team-board.md`에 기록
- 에이전트 재실행 시 task report 파일에서 이전 피드백 전문 참조
- Room 탭에서 team-board.md 소통 피드 표시
- Logs 탭에서 task report 전문 표시 (DB 200자 → 파일 전문)

**검증:**
- 프로젝트 킥오프 → 태스크 실행 → PM 리뷰 → REVISE → 재실행 전체 플로우에서:
  - team-board.md에 PM 지시 + 에이전트 보고 기록 확인
  - task report에 리뷰 라운드별 전문 기록 확인
  - 에이전트가 team-board.md를 읽고 반응하는지 확인

### 6-3. 데이터 흐름 전환 전략

Phase 4에서 Phase 7로 넘어갈 때, DB→파일 전환은 **점진적 이중 기록**으로 진행:

```
Stage B (Phase 3-5):
  PM 리뷰 → DB에 구조화 JSON 기록 (기존 대비 개선)
  PM 리뷰 → result tail 4000자 (2000→4000 확대)

Stage C (Phase 7) 초기:
  PM 리뷰 → DB에 구조화 JSON 기록 (유지)
  PM 리뷰 → 파일에 전문 기록 (추가)  ← 이중 기록
  PM 프롬프트 ← 파일 전문 우선, DB 폴백

Stage C 안정화 후:
  PM 리뷰 → DB에 요약 JSON + reportPath (경량화)
  PM 리뷰 → 파일에 전문 기록 (주 저장소)
  PM 프롬프트 ← 파일 전문
```

**이중 기록 기간**에는 DB와 파일 모두에 쓰므로, 파일 시스템 문제 시 DB 폴백이 보장됨.

### 6-4. 리스크 및 제약 사항

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| **team-board.md 비대화** | 장기 프로젝트 시 수백 KB → PM 프롬프트 토큰 초과 | `extractRecentEntries(board, N)` — 최근 N개만 프롬프트에 포함. 전체는 파일에 보존 |
| **파일 동시 쓰기 충돌** | 여러 에이전트가 동시에 team-board.md에 append | append-only 구조 + `appendFileSync()` (Node.js 동기 쓰기) → OS 레벨 원자성. 최악의 경우 행 순서만 뒤바뀜, 데이터 손실 없음 |
| **CLI 에이전트 외 API 모드 에이전트** | API 모드(cli_provider="api") 에이전트는 파일 시스템 접근 불가 | PM이 대신 team-board.md에 기록. API 에이전트는 프롬프트를 통해 팀 보드 내용을 수신 |
| **프로젝트 경로 없는 경우** | project_path가 NULL인 프로젝트 | 파일 기반 소통 비활성화, DB 경유만 사용 (Stage B의 개선 유지) |
| **parseReviewDecision UNKNOWN 빈발** | 특정 LLM이 기대 포맷을 따르지 않아 UNKNOWN 반복 | 유저에게 알림 + 프롬프트 힌트 강화 ("반드시 APPROVE 또는 REVISE로 시작하세요"). 시스템이 임의 결정하지 않는 원칙 유지 |

### 6-5. Phase 완료 후 최종 아키텍처 요약

```
┌─────────────────────────────────────────────────────────┐
│                    오케스트레이션 화면                      │
│  Timeline │ Logs │ Agents │ Room                        │
│  (실시간)  │(구조화)│(Fitness)│(team-board)               │
└────┬──────┴──┬───┴───┬────┴────┬───────────────────────┘
     │         │       │         │
     ▼         ▼       ▼         ▼
┌─────────┐ ┌──────┐ ┌───────┐ ┌──────────────────┐
│ DB 요약  │ │DB JSON│ │DB API │ │파일: team-board.md│
│task_logs │ │events │ │fitness│ │파일: task reports │
│(200자)   │ │(구조화)│ │(실측) │ │(전문, 잘림 없음)  │
└────┬─────┘ └──┬───┘ └──┬────┘ └────┬─────────────┘
     │          │        │           │
     ▼          ▼        ▼           ▼
┌──────────────────────────────────────────────────────┐
│              PM 에이전트 (유저가 선택한 LLM)            │
│  프롬프트: 팀 보드 컨텍스트 + 이전 리뷰 전문 + 로그 요약  │
│  프로바이더: resolveProviderForAgent(db, pm)           │
│  파싱: parseReviewDecision() → APPROVE/REVISE/UNKNOWN │
│  기록: DB 요약 + 파일 전문 (이중 기록)                   │
└──────────────┬────────────────────────┬──────────────┘
               │                        │
               ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────┐
│ 태스크 에이전트 A      │  │ 태스크 에이전트 B          │
│ 프롬프트에 PM 피드백 전문│  │ team-board.md 읽기/쓰기   │
│ task report 참조      │  │ 블로커/의존성 보고          │
│ 고유 프로바이더 사용    │  │ 고유 프로바이더 사용        │
└──────────────────────┘  └──────────────────────────┘
```

**핵심 변화:**
1. **PM 라우팅 정확** — PM 에이전트 고유 프로바이더를 정확히 사용
2. **잘림 없음** — 파일 기반으로 모든 컨텍스트 전문 보존
3. **양방향 소통** — 에이전트가 PM에게 블로커/의견 보고 가능
4. **투명한 실패** — UNKNOWN 시 유저에게 알림, 시스템 임의 결정 없음
5. **오케스트레이션 실데이터** — 모든 탭이 실제 데이터로 동작

---

## 7. 관련 파일 전체 목록

### 백엔드 (수정 대상)

| 파일 | 역할 | 수정 Phase |
|------|------|-----------|
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | PM 리뷰/오케스트레이션 — PM 경로는 변경 불필요 (이미 정확), `writeTaskReport()`, `appendTeamBoard()` | 3, 4, 6, 7 |
| `server/modules/agent-runtime/llm-client.ts` | `callLlmOneShotAuto()` 프로바이더 선택 개선, CLI args 수정 | 2, 6 |
| `server/modules/routes/core/projects/kickoff.ts` | 시스템 원샷 호출 시 프로바이더 힌트 전달 | 2 |
| `server/modules/workflow/orchestration/run-complete-handler/auto-completions.ts` | 태스크 완료 처리 — 이미 task_report_archives 저장 구현됨 | 5 (UI 연결만) |
| `server/modules/routes/core/tasks/` | task report 조회 API 추가 (기존 데이터 노출) | 5 |
| `prompts/pm/review-task.md` | PM 리뷰 프롬프트 | 4, 7 |
| `prompts/system/agent-runtime.md` | 에이전트 런타임 프롬프트 (팀 보드 규칙 추가) | 7 |
| `server/modules/routes/core/projects/` | 팀 보드/태스크 리포트 읽기 API | 7 |

### 프론트엔드 (수정 대상)

| 파일 | 역할 | 수정 Phase |
|------|------|-----------|
| `src/components/orchestration/MetricsHeader.tsx` | TOKENS/BUDGET | 1-C |
| `src/components/orchestration/tabs/TimelineTab.tsx` | 프로그레스 바, Task Inspector, 코드 정리 | 1-A, 1-D |
| `src/components/orchestration/tabs/AgentsTab.tsx` | Fitness, 프로그레스 바, 코드 정리 | 1-A, 1-B, 1-D |
| `src/components/orchestration/tabs/RoomTab.tsx` | 프로그레스 바, 유니코드→SVG, 이벤트 통합, team-board 표시 | 1-A, 1-D, 7 |
| `src/components/orchestration/tabs/LogsTab.tsx` | 로그 스트림 연동, task report 전문 표시 | (Phase 6 이후), 7 |

### 백엔드 (참조만)

| 파일 | 역할 |
|------|------|
| `server/modules/workflow/orchestration/execution-start-task.ts` | 태스크 실행 진입점 |
| `server/modules/agent-runtime/execution-loop.ts` | 에이전트 실행 루프 |
| `server/modules/workflow/agents/providers.ts` | 멀티 프로바이더 실행 |
| `server/ws/hub.ts` | WebSocket 브로드캐스트 |

### 프로바이더 설정 (참조)

| 파일 | 역할 |
|------|------|
| `src/components/settings/ApiSettingsTab.tsx` | API 프로바이더 CRUD UI |
| `src/components/settings/CliSettingsTab.tsx` | CLI 도구 상태 + 모델 선택 UI |
| `src/components/settings/ApiAssignModal.tsx` | 에이전트에 API 모델 할당 모달 |
| `src/components/settings/useApiProvidersState.ts` | API 프로바이더 상태 훅 |
| `src/api/providers-reports-github.ts` | API 프로바이더 fetch/CRUD |
| `server/modules/routes/ops/api-providers.ts` | API 프로바이더 CRUD 라우트 |
| `server/modules/routes/ops/settings-stats.ts` | 설정 GET/PUT (defaultProvider 포함) |

### DB 테이블 (관련)

| 테이블 | 용도 | Phase |
|--------|------|-------|
| `task_logs` | 실행 로그 (kind: system/agent/pm_oversight/error) | 3, 4 |
| `task_execution_events` | 구조화된 이벤트 (pm_approved/pm_revision_requested) | 3 |
| `agent_task_fitness` | 에이전트별 task_type 성공률 | 1-B |
| `agent_usage_logs` | 에이전트 실행 기록 (provider, duration, exit_code) | 1-C |
| `task_report_archives` | 태스크 완료 보고서 (deliverables, execution_summary) | 5 |
| `pm_oversight_state` | PM 프로젝트 리뷰 라운드 카운터 | 참조 |
| `api_providers` | API 프로바이더 설정 (type, base_url, api_key_enc, models_cache) | Phase 2 (참조) |
| `settings` | 글로벌 설정 (defaultProvider, providerModelConfig) | Phase 2 (참조) |

### WebSocket 이벤트 (관련)

| 이벤트 | 용도 | 소비 탭 |
|--------|------|---------|
| `task_update` | 태스크 상태 변경 (execution_state 포함) | Timeline, Agents |
| `cli_output` | CLI 실시간 출력 (구독 기반) | Timeline Inspector, Logs |
| `kickoff_stage` | 파이프라인 단계 전환 | StageRail |
| `agent_status` | 에이전트 상태 변경 | Timeline, Agents |
| `notification` | PM 승인/수정/에러 알림 | Room |
| `task_report` | 태스크 보고서 (phase: started/progress/completed) | Timeline Inspector |

---

## 8. 관련 문서

- [ORCHESTRATION-TIMELINE.md](../design/ORCHESTRATION-TIMELINE.md) — 오케스트레이션 화면 UI 스펙
- [PM-WORKFLOW-SPEC.md](../strategy/PM-WORKFLOW-SPEC.md) — PM 오케스트레이션 워크플로우
- [AGENT-CONFIGURATION-AND-EXECUTION.md](AGENT-CONFIGURATION-AND-EXECUTION.md) — 에이전트 실행 분기
- [llm-call-patterns.md](llm-call-patterns.md) — LLM 호출 패턴
- [websocket-protocol.md](../specs/websocket-protocol.md) — WebSocket 프로토콜
