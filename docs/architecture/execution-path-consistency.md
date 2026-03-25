# Execution Path Consistency — P1 분석 및 수정 계획

> **목적:** 태스크 실행 경로와 PM 리뷰 경로 간 불일치 분석, 오케스트레이션 화면 연동을 위한 수정 계획
> **우선순위:** P1 (Critical)
> **관련 화면:** Orchestration Window (모든 탭)
> **Updated:** 2026-03-25

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

### 0-3. 프로바이더 해석 흐름 (2가지)

**A. 태스크 실행** — 에이전트 고유 설정 직접 사용:
```
agent.cli_provider 읽기
  ├── "api" → resolveProvider(db, agent.api_provider_id)
  │            → api_providers 조회 → api_key 복호화 → HTTP 호출
  ├── "claude"/"codex"/"gemini"/... → CLI spawn (--max-turns 200)
  └── "ollama" → Ollama API 호출
```

**B. PM/시스템 원샷** — `callLlmOneShotAuto()` → `resolveCliProviderFromAgents()`:
```
1. 아무 에이전트에서 api_provider_id 있으면 → API 모드 (해당 provider로 HTTP)
2. 아무 에이전트에서 CLI provider 있으면 → CLI 모드
3. settings.defaultProvider → CLI 모드
4. 폴백 → "claude"
```

**문제:** 경로 A는 **해당 에이전트**의 설정, 경로 B는 **아무 에이전트**의 설정을 사용.

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

AgentDesk에는 두 개의 독립적인 LLM 실행 경로가 존재한다:

| 경로 | 용도 | 진입점 | 프로바이더 선택 |
|------|------|--------|---------------|
| **태스크 실행** | 에이전트가 태스크를 수행 | `execution-start-task.ts` → `execution-loop.ts` | 해당 에이전트의 `cli_provider` + `api_provider_id` |
| **PM 원샷** | PM이 리뷰/배정/실패 처리 | `pm-orchestrator.ts` → `callLlmOneShotAuto()` | **아무 에이전트**에서 자동 감지 |

이 두 경로는 **서로 다른 시기에, 다른 설계 목표로** 만들어졌다:
- 태스크 실행: "자율 에이전트 작업" → 풍부한 컨텍스트, 도구 접근, 멀티턴
- PM 원샷: "경량 오케스트레이션 판단" → 최소 컨텍스트, 도구 없음, 싱글턴

이 불일치로 인해:
1. PM 리뷰 품질이 태스크 실행 대비 현저히 낮음
2. 오케스트레이션 화면에 표시할 PM 데이터가 빈약함
3. 프로바이더/언어/타임아웃 등 기본 설정이 경로마다 다름

---

## 2. 불일치 상세 분석

### 2-1. 프로바이더 선택 (CRITICAL)

```
태스크 실행:  agent.cli_provider + agent.api_provider_id  →  해당 에이전트 고유 설정
PM 원샷:     callLlmOneShotAuto() → resolveCliProviderFromAgents() → 아무 에이전트
```

**태스크 실행** (`execution-start-task.ts:186`):
```typescript
const provider = execAgent.cli_provider || "claude";
// cli_provider="api"이면 → resolveProvider(db, agent.api_provider_id) → HTTP 호출
// cli_provider="claude"이면 → CLI spawn
```

**PM 원샷** (`llm-client.ts:244-272`):
```typescript
// 4단계 폴백: 아무 에이전트의 설정을 가져옴
1. ANY agent with api_provider_id → 해당 provider로 HTTP (PM 에이전트가 아닐 수 있음)
2. ANY agent with CLI provider → 해당 CLI spawn
3. settings.defaultProvider
4. "claude"
```

**시나리오별 불일치 예시:**

| PM 에이전트 설정 | 태스크 에이전트 설정 | PM 실제 사용 (현재) | 문제 |
|----------------|-------------------|-------------------|------|
| cli_provider="claude" | cli_provider="api", api_provider_id="openai-1" | openai-1 (아무 에이전트에서 가져옴) | PM이 의도치 않은 프로바이더 사용 |
| cli_provider="api", api_provider_id="anthropic-1" | cli_provider="codex" | anthropic-1 (맞을 수도, 틀릴 수도) | PM 자신의 설정이 아닌 경로로 해석 |
| cli_provider="claude" | cli_provider="claude" | claude (우연히 맞음) | 우연히 일치할 뿐, 보장 안 됨 |

**영향:**
- PM이 자신의 프로바이더가 아닌 다른 에이전트의 프로바이더를 사용
- LLM마다 판단 기준이 달라 승인/수정 결정의 일관성이 깨짐
- API 모드 PM의 경우 모델 선택도 불일치 (pm.api_model 무시)

**수정:** §4-2 참조 — PM 에이전트의 전체 프로바이더 설정(cli_provider + api_provider_id + api_model)을 명시적으로 전달

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

---

### 2-7. 승인 판정 로직 (MEDIUM)

PM 승인 판정은 정규식 패턴 매칭:
```typescript
const isApprove = /^APPROVE[:\s]/im.test(text)
  || /승인|합격|통과|lgtm|approve/i.test(text);
```

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

### 3-2. 근본 원인 체인

```
PM 원샷 경로가 경량 설계
  → PM 리뷰 데이터가 빈약 (200자 로그, 구조 없음)
    → task_execution_events.metadata_json 미활용
      → 오케스트레이션 화면에 표시할 PM 데이터 부족
        → Logs/Room/Timeline Inspector 구현 불가
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

// 개선: GET /api/agents/performance API 호출
// → agent_task_fitness 테이블의 success_count / (success_count + failure_count)
```

**수정 파일:**
- `src/components/orchestration/tabs/AgentsTab.tsx:128` — 가짜 계산 → API 데이터

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

### 4-2. Phase 2: PM 프로바이더 일관성 (백엔드, 중규모)

**현재 문제:** `callLlmOneShotAuto()`가 `resolveCliProviderFromAgents()`로 아무 에이전트의
프로바이더를 가져옴. PM 에이전트 자신의 `cli_provider`, `api_provider_id`, `api_model` 설정이 무시됨.

#### 수정 방향: PM 에이전트 전용 프로바이더 해석 함수

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

#### pm-orchestrator.ts 수정

```typescript
// 현재:
const response = await runAgentOneShot(pm, prompt, {
  projectPath,
  timeoutMs: 30_000,
  noTools: true,
});
// → 내부에서 callLlmOneShotAuto() → resolveCliProviderFromAgents() → 아무 에이전트

// 개선: PM 에이전트의 프로바이더를 명시적으로 전달
const pmProviderConfig = resolveProviderForAgent(db, pm);

if (pmProviderConfig.mode === "api") {
  // API 모드: HTTP 호출 (PM의 api_provider_id + api_model 사용)
  const provider = resolveProvider(db, pmProviderConfig.apiProviderId);
  const response = await callLlmOneShot(
    provider,
    pmProviderConfig.model,
    systemPrompt,
    userPrompt,
    maxTokens,
  );
} else {
  // CLI 모드: PM의 cli_provider로 spawn
  const response = await callViaCliProvider(
    pmProviderConfig.cliProvider,
    systemPrompt,
    userPrompt,
    { projectPath, timeoutMs: 30_000, maxTurns: 3 },
  );
}
```

#### 호환성 유지: callLlmOneShotAuto 개선 (대안)

기존 `callLlmOneShotAuto()`를 수정하지 않고, 새로운 오버로드를 추가하는 방식도 가능:

```typescript
// llm-client.ts — 오버로드 추가
export async function callLlmOneShotForAgent(
  db: Database,
  agent: Agent,        // ← PM 에이전트 객체 직접 전달
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number,
  timeoutMs?: number,
): Promise<string> {
  const config = resolveProviderForAgent(db, agent);

  if (config.mode === "api") {
    const provider = resolveProvider(db, config.apiProviderId);
    return callLlmOneShot(provider, config.model, systemPrompt, userPrompt, maxTokens);
  }

  return callViaCliProviderInternal(
    config.cliProvider, systemPrompt, userPrompt, timeoutMs,
  );
}
```

이렇게 하면 기존 `callLlmOneShotAuto()`는 시스템 호출용으로 유지하고,
PM 리뷰처럼 **특정 에이전트의 프로바이더를 사용해야 하는 경우**에는
`callLlmOneShotForAgent(db, pmAgent, ...)` 를 사용한다.

#### 수정 범위

| 파일 | 변경 |
|------|------|
| `server/modules/agent-runtime/llm-client.ts` | `resolveProviderForAgent()` + `callLlmOneShotForAgent()` 추가 |
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | `callLlmOneShotAuto()` → `callLlmOneShotForAgent(db, pm, ...)` 호출로 교체 |
| `server/modules/workflow/core/one-shot-runner.ts` | `runAgentOneShot()` 내부에서 agent 기반 해석 옵션 추가 |

#### 영향받는 PM 호출 목록

`pm-orchestrator.ts`에서 `callLlmOneShotAuto()` 또는 `runAgentOneShot()`을 호출하는 모든 지점:

| 호출 | 용도 | 수정 |
|------|------|------|
| `pmReviewTask()` | 개별 태스크 리뷰 | `callLlmOneShotForAgent(db, pm, ...)` |
| `pmHandleFailure()` | 실패 처리 | `callLlmOneShotForAgent(db, pm, ...)` |
| `pmProjectLevelReview()` | 프로젝트 전체 평가 | `callLlmOneShotForAgent(db, pm, ...)` |
| `pmStartNextTask()` | 다음 태스크 선택 | `callLlmOneShotForAgent(db, pm, ...)` |
| `runAutoLearning()` | 자동 학습 추출 | `callLlmOneShotForAgent(db, pm, ...)` |
| `writeProgressMd()` | progress.md 작성 | `callLlmOneShotForAgent(db, pm, ...)` |

---

### 4-3. Phase 3: PM 리뷰 로그 구조화 (백엔드, 중규모)

PM 리뷰 결과를 구조화된 JSON으로 기록. 오케스트레이션 Logs/Room 탭에서 소비.

#### task_logs 구조화

```typescript
// 현재:
appendTaskLog(db, taskId, "pm_oversight",
  `PM approved: ${response.slice(0, 200)}`);

// 개선:
appendTaskLog(db, taskId, "pm_oversight", JSON.stringify({
  action: "APPROVE" | "REVISE" | "REASSIGN" | "ESCALATE",
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
  reasoning: response.slice(0, 500),
  provider: pmProvider,
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

#### 추가할 항목

```typescript
// 1. 태스크 로그 요약 (주요 이벤트)
const recentLogs = db.prepare(`
  SELECT kind, message, created_at FROM task_logs
  WHERE task_id = ? AND kind IN ('system', 'error', 'pm_oversight')
  ORDER BY created_at DESC LIMIT 15
`).all(taskId);

// 2. 이전 리뷰 피드백 (연속성)
const previousRevisions = db.prepare(`
  SELECT message FROM task_logs
  WHERE task_id = ? AND kind = 'pm_oversight'
    AND message LIKE '%REVISE%'
  ORDER BY created_at DESC LIMIT 3
`).all(taskId);

// 3. result tail 확대
const RESULT_TAIL_LENGTH = 4000; // 2000 → 4000
```

#### prompts/pm/review-task.md 수정

```markdown
## Agent Output (tail)
{{taskResult}}

## Execution Log Summary
{{executionLogSummary}}

## Previous Review Feedback (if any)
{{previousRevisions}}

## Review Checklist
1. Scope Match ...
```

**수정 파일:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 프롬프트 빌드 로직
- `prompts/pm/review-task.md` — 템플릿 확장

---

### 4-5. Phase 5: 태스크 완료 시 diff 저장 (백엔드, 중규모)

Timeline Task Inspector 데이터 소스.

```typescript
// run-complete-handler에서:
// 1. git diff --stat 저장
const diffStat = execSync('git diff --stat HEAD~1', { cwd: worktreePath }).toString();

// 2. task_report_archives에 저장
db.prepare(`
  INSERT OR REPLACE INTO task_report_archives
  (task_id, deliverables, execution_summary, created_at)
  VALUES (?, ?, ?, ?)
`).run(taskId, diffStat, executionSummary, Date.now());
```

**수정 파일:**
- `server/modules/workflow/orchestration/run-complete-handler/` — diff 수집 로직

---

### 4-6. Phase 6: 언어/max-turns 일관성 (백엔드, 소규모)

```typescript
// 언어 일관성
const lang = getPreferredLanguage() || resolveLang(task.description ?? task.title);

// max-turns 조정 (PM 리뷰: 1 → 3)
["claude", "--dangerously-skip-permissions", "--print", "--max-turns", "3"]
```

**수정 파일:**
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 언어 감지
- `server/modules/agent-runtime/llm-client.ts` — CLI args

---

## 5. 수정 우선순위

| 순서 | Phase | 작업량 | 백엔드 | 영향 탭 | 의존성 |
|------|-------|--------|--------|---------|--------|
| 1 | 1-D. 코드 정리 (규칙 위반 수정) | 소 | 없음 | All | 없음 |
| 2 | 1-A. 프로그레스 바 매핑 | 소 | 없음 | Timeline, Agents, Room | 없음 |
| 3 | 1-B. Fitness 실데이터 | 소 | 없음 | Agents | 없음 |
| 4 | 1-C. TOKENS/BUDGET 연동 | 소 | 없음 | Header | 없음 |
| 5 | 2. PM 프로바이더 일관성 (resolveProviderForAgent + 호출 교체) | 중 | O | (간접) | 없음 |
| 6 | 6. 언어/max-turns 일관성 | 소 | O | (간접) | 없음 |
| 7 | 3. PM 리뷰 로그 구조화 | 중 | O | Logs, Room | 없음 |
| 8 | 4. PM 리뷰 컨텍스트 보강 | 중 | O | (간접) | Phase 3 |
| 9 | 5. diff 저장 | 중 | O | Timeline Inspector | 없음 |

---

## 6. 관련 파일 전체 목록

### 백엔드 (수정 대상)

| 파일 | 역할 | 수정 Phase |
|------|------|-----------|
| `server/modules/workflow/orchestration/pm-orchestrator.ts` | PM 리뷰/오케스트레이션 — `callLlmOneShotAuto` → `callLlmOneShotForAgent` 교체 | 2, 3, 4, 6 |
| `server/modules/agent-runtime/llm-client.ts` | `resolveProviderForAgent()` + `callLlmOneShotForAgent()` 추가, CLI args 수정 | 2, 6 |
| `server/modules/workflow/core/one-shot-runner.ts` | `runAgentOneShot()` 에이전트 기반 해석 옵션 | 2 |
| `server/modules/workflow/orchestration/run-complete-handler/` | 태스크 완료 처리 | 5 |
| `prompts/pm/review-task.md` | PM 리뷰 프롬프트 | 4 |

### 프론트엔드 (수정 대상)

| 파일 | 역할 | 수정 Phase |
|------|------|-----------|
| `src/components/orchestration/MetricsHeader.tsx` | TOKENS/BUDGET | 1-C |
| `src/components/orchestration/tabs/TimelineTab.tsx` | 프로그레스 바, Task Inspector, 코드 정리 | 1-A, 1-D |
| `src/components/orchestration/tabs/AgentsTab.tsx` | Fitness, 프로그레스 바, 코드 정리 | 1-A, 1-B, 1-D |
| `src/components/orchestration/tabs/RoomTab.tsx` | 프로그레스 바, 유니코드→SVG, 이벤트 통합 | 1-A, 1-D |
| `src/components/orchestration/tabs/LogsTab.tsx` | 로그 스트림 연동 | (Phase 6 이후) |

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

## 7. 관련 문서

- [ORCHESTRATION-TIMELINE.md](../design/ORCHESTRATION-TIMELINE.md) — 오케스트레이션 화면 UI 스펙
- [PM-WORKFLOW-SPEC.md](../strategy/PM-WORKFLOW-SPEC.md) — PM 오케스트레이션 워크플로우
- [AGENT-CONFIGURATION-AND-EXECUTION.md](AGENT-CONFIGURATION-AND-EXECUTION.md) — 에이전트 실행 분기
- [llm-call-patterns.md](llm-call-patterns.md) — LLM 호출 패턴
- [websocket-protocol.md](../specs/websocket-protocol.md) — WebSocket 프로토콜
