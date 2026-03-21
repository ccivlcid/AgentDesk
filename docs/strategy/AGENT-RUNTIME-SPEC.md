# Agent Runtime Engine — Implementation Spec

> **목표:** AgentDesk를 "예쁜 대시보드"에서 "실제로 에이전트가 자율 실행되는 OS"로 만드는 핵심 엔진.
> **한 줄 정의:** LLM API를 호출해서 에이전트가 자율적으로 작업하고, 그 과정이 실시간으로 UI에 반영되는 시스템.

---

## 1. 현재 갭 분석

### 있는 것

| 영역 | 현재 상태 |
|------|-----------|
| Agent CRUD | ✅ 생성/수정/삭제/부서 배정 |
| Task Board | ✅ Kanban, 상태 추적 (pending/running/done/failed) |
| CLI Window | ✅ PTY 터미널, 에이전트별 세션, 자동 CLI 실행 |
| WebSocket | ✅ 실시간 브로드캐스트 (cli_output, task_update, agent_status) |
| Workflow Builder | ✅ 시각적 플로우, cron 스케줄링 |
| Library | ✅ Skills/Rules/Memory/Hooks, 프로젝트 스코프 필터 |
| Prompt Builder | ✅ persona + rules + memory + skills → 프롬프트 조합 |

### 없는 것 (= 만들어야 하는 것)

| 영역 | 필요한 이유 |
|------|-------------|
| **LLM Direct Execution** | 현재는 외부 CLI(claude/codex)에 위임. AgentDesk 자체가 LLM API를 호출해서 에이전트를 실행해야 "Agent OS"다 |
| **Streaming Runtime** | LLM 응답이 토큰 단위로 UI에 실시간 스트리밍되어야 "관찰 가능한 실행"이다 |
| **Tool Use Loop** | 에이전트가 도구(파일 읽기, 코드 실행, 웹 검색 등)를 사용하는 자율 루프가 필요 |
| **Execution History** | 각 실행의 전체 과정(프롬프트, 응답, 도구 호출, 결과)을 DB에 기록 |

---

## 2. 데모 시나리오 (MVP)

이 시나리오가 동작하면 오픈소스 공개 준비 완료:

```
1. Library에서 에이전트 선택 (또는 "프로젝트 분석가" 에이전트 자동 생성)
2. Task 생성: "이 프로젝트의 구조를 분석하고 README 개선안을 만들어줘"
3. 에이전트가 자동 실행됨:
   a. 프로젝트 폴더의 파일 구조 읽기 (tool_use: list_files)
   b. 주요 파일 내용 읽기 (tool_use: read_file)
   c. LLM이 분석 결과 생성
   d. 결과를 마크다운으로 출력
4. UI에서 실시간으로 보이는 것:
   - CLI Window: 토큰 스트리밍 + 도구 호출 로그
   - Task Board: pending → running → done 상태 전이
   - Agent Detail: 현재 실행 중인 작업, 사용 토큰, 경과 시간
   - Notification: 완료 알림
5. Task Report에서 결과물 확인
```

---

## 3. 아키텍처

### 3.1 모듈 구조

```
server/modules/agent-runtime/
├── index.ts                  ← 모듈 진입점 (런타임 매니저 export)
├── runtime-manager.ts        ← 에이전트 실행 관리 (시작/중지/상태 조회)
├── execution-loop.ts         ← LLM ↔ Tool 자율 실행 루프
├── llm-client.ts             ← LLM API 추상화 (OpenAI/Anthropic/Local)
├── tool-executor.ts          ← 내장 도구 실행기
├── tools/                    ← 내장 도구 정의
│   ├── list-files.ts         ← 프로젝트 파일 목록
│   ├── read-file.ts          ← 파일 읽기
│   ├── write-file.ts         ← 파일 쓰기
│   ├── run-command.ts        ← 셸 명령 실행 (샌드박스)
│   └── web-search.ts         ← 웹 검색 (선택)
├── prompt-assembler.ts       ← 기존 prompt builder 통합 (persona + rules + memory + tools)
└── execution-store.ts        ← 실행 이력 DB 저장/조회
```

### 3.2 실행 흐름

```
POST /api/agent-runtime/run
  { agentId, taskId, projectId }
        │
        ▼
  ① prompt-assembler
     persona + rules + memory + skills + tool definitions
     → system prompt + user message 조합
        │
        ▼
  ② llm-client.stream()
     OpenAI/Anthropic API 호출 (streaming)
     → 토큰 단위 WebSocket 브로드캐스트
        │
        ▼
  ③ execution-loop (반복)
     ┌─ LLM 응답 파싱
     │  ├─ text → WebSocket 스트리밍 → CLI Window
     │  ├─ tool_use → tool-executor 실행 → 결과를 LLM에 피드백
     │  └─ stop → 루프 종료
     │
     └─ 각 턴마다 execution-store에 기록
        │
        ▼
  ④ 완료 처리
     task.status = "done" | "failed"
     → WebSocket broadcast
     → auto post-processing (report, deliverable check)
```

### 3.3 WebSocket 이벤트

| 이벤트 | 페이로드 | 소비자 |
|--------|----------|--------|
| `runtime_stream` | `{ taskId, agentId, type: "text"/"tool_call"/"tool_result", content }` | CLI Window, Agent Detail |
| `runtime_status` | `{ taskId, agentId, status: "thinking"/"tool_use"/"complete"/"error" }` | Task Board, Flow Graph |
| `runtime_token_usage` | `{ taskId, agentId, input_tokens, output_tokens }` | Agent Detail (cost) |

---

## 4. LLM Client 추상화

### 4.1 인터페이스

```typescript
interface LlmClient {
  stream(params: {
    model: string;
    systemPrompt: string;
    messages: Message[];
    tools?: ToolDefinition[];
    maxTokens?: number;
  }): AsyncIterable<StreamEvent>;
}

type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "message_complete"; usage: { input_tokens: number; output_tokens: number } }
  | { type: "error"; error: string };
```

### 4.2 지원 프로바이더

| 프로바이더 | API | 우선순위 |
|-----------|-----|----------|
| **Anthropic** | Messages API (streaming) | 1순위 — 메인 지원 |
| **OpenAI** | Chat Completions (streaming) | 2순위 |
| **Local LLM** | 기존 `local-llm` 모듈 활용 (Ollama/LM Studio) | 3순위 |

프로바이더 설정은 기존 `api_providers` 테이블 + Settings 화면 활용.

---

## 5. 내장 도구 (Built-in Tools)

MVP에서 제공할 최소 도구 세트:

| 도구 | 설명 | 제한 |
|------|------|------|
| `list_files` | 프로젝트 디렉토리 파일/폴더 목록 | project_path 내부만 |
| `read_file` | 파일 내용 읽기 | 10MB 제한, 바이너리 제외 |
| `write_file` | 파일 생성/수정 | project_path 내부만, 확인 옵션 |
| `run_command` | 셸 명령 실행 | 타임아웃 30s, 허용 목록 기반 |
| `search_files` | 파일 내용 검색 (grep) | project_path 내부만 |

**보안 원칙:**
- 모든 파일 접근은 `project_path` 내부로 제한 (path traversal 방지)
- `run_command`는 허용 목록 또는 사용자 확인 필요
- `write_file`은 설정에 따라 자동/확인 모드 선택

---

## 6. DB 변경

### 6.1 새 테이블: `agent_runtime_runs`

```sql
CREATE TABLE agent_runtime_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed | cancelled
  model TEXT,
  provider TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

### 6.2 새 테이블: `agent_runtime_events`

```sql
CREATE TABLE agent_runtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES agent_runtime_runs(id),
  seq INTEGER NOT NULL,          -- 이벤트 순번
  event_type TEXT NOT NULL,      -- text | tool_call | tool_result | error
  content TEXT,                  -- 텍스트 또는 JSON
  token_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_runtime_events_run ON agent_runtime_events(run_id, seq);
```

---

## 7. API 엔드포인트

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agent-runtime/run` | 에이전트 런타임 실행 시작 |
| `POST` | `/api/agent-runtime/:runId/stop` | 실행 중지 |
| `GET` | `/api/agent-runtime/:runId` | 실행 상태 조회 |
| `GET` | `/api/agent-runtime/:runId/events` | 실행 이벤트 목록 |
| `GET` | `/api/agent-runtime/task/:taskId` | 태스크의 실행 이력 |

### POST /api/agent-runtime/run

```json
// Request
{
  "agentId": "agent-001",
  "taskId": "task-001",
  "projectId": "proj-001",
  "options": {
    "model": "claude-sonnet-4-6",      // 선택, 기본값은 에이전트 설정
    "maxTokens": 4096,                  // 선택
    "maxTurns": 20,                     // 도구 사용 최대 턴 수
    "autoApproveTools": ["list_files", "read_file", "search_files"]
  }
}

// Response
{
  "runId": "run-abc123",
  "status": "running"
}
```

---

## 8. UI 변경

### 8.1 기존 컴포넌트 연결 (수정만, 신규 없음)

| 컴포넌트 | 변경 내용 |
|----------|-----------|
| **CLI Window** | `runtime_stream` WS 이벤트 수신 → 텍스트/도구호출 실시간 렌더링 |
| **Task Board** | `runtime_status` 수신 → 상태 배지 자동 갱신 |
| **Agent Detail** | 실행 중 탭에 토큰 사용량, 경과 시간, 현재 단계 표시 |
| **CreateTaskModal** | "Run with AgentDesk Runtime" 옵션 추가 (vs 기존 CLI 모드) |
| **Flow Graph** | `runtime_status` → 노드 flash 애니메이션 연동 |

### 8.2 신규 UI 없음

기존 UI 인프라가 충분함. 새 화면을 만들지 않고 기존 컴포넌트에 런타임 데이터를 연결하는 것이 핵심.

---

## 9. 기존 CLI 모드와의 관계

```
실행 모드 2가지:

1. CLI 모드 (기존) — PTY 터미널에서 claude/codex/gemini 실행
   → 외부 에이전트 CLI에 위임
   → 사용자가 터미널에서 직접 관찰

2. Runtime 모드 (신규) — AgentDesk가 직접 LLM API 호출
   → 내장 도구 사용, 자율 실행 루프
   → 구조화된 실시간 스트리밍
   → 실행 이력 완전 기록
```

두 모드는 공존. 사용자가 Task 생성 시 선택 가능. Runtime 모드가 기본값이 되되, CLI 모드도 유지.

---

## 10. 구현 순서

### Step 1 — LLM Client + Streaming (1일차)

- [ ] `llm-client.ts` — Anthropic Messages API streaming 구현
- [ ] `POST /api/agent-runtime/run` — 기본 엔드포인트
- [ ] WebSocket `runtime_stream` 브로드캐스트
- [ ] CLI Window에서 스트리밍 텍스트 표시

**검증:** Task 생성 → 에이전트 실행 → CLI Window에 LLM 응답이 토큰 단위로 표시

### Step 2 — Tool Use Loop (2일차)

- [ ] `tools/` — list_files, read_file, write_file, search_files 구현
- [ ] `tool-executor.ts` — 도구 실행 + 보안 검증
- [ ] `execution-loop.ts` — LLM ↔ Tool 자율 반복
- [ ] CLI Window에 도구 호출/결과 시각적 구분 표시

**검증:** "이 프로젝트의 파일 구조를 분석해줘" → 에이전트가 list_files + read_file 사용 → 분석 결과 출력

### Step 3 — 실행 기록 + 완료 처리 (3일차)

- [ ] DB 마이그레이션 (agent_runtime_runs, agent_runtime_events)
- [ ] `execution-store.ts` — 턴별 이벤트 기록
- [ ] 완료 시 기존 post-processing 연동 (report, deliverable check)
- [ ] Agent Detail에 토큰/비용/시간 표시

**검증:** 실행 완료 후 → Task Report 자동 생성 → Agent Detail에서 이력 확인

### Step 4 — 통합 + 데모 (4일차)

- [ ] CreateTaskModal에 Runtime/CLI 모드 선택 UI
- [ ] Flow Graph runtime_status 연동
- [ ] 기본 에이전트 프리셋 ("프로젝트 분석가") 시드
- [ ] 데모 시나리오 end-to-end 검증

---

## 11. 하지 않는 것 (스코프 밖)

| 항목 | 이유 |
|------|------|
| 멀티 턴 대화 | MVP는 단일 태스크 실행. 대화는 기존 Chat Window 활용 |
| 코드 실행 샌드박스 | `run_command` 기본 구현만. Docker/VM은 Phase 2 |
| 에이전트 간 협업 | 기존 Workflow Builder로 대체. Runtime 내 멀티 에이전트는 Phase 2 |
| 브라우저 도구 | 웹 스크래핑/브라우저 자동화는 Phase 2 |
| 자동 Git 커밋 | write_file만 제공. Git 작업은 사용자 판단 |

---

## 12. 성공 기준

이 스펙의 구현이 완료되면:

1. **데모 가능** — "에이전트가 프로젝트를 분석하고 결과를 보여주는" 30초 영상 제작 가능
2. **차별화 증명** — Cursor/Dify/n8n에 없는 "Visual + Runtime 통합 Agent Control" 실체화
3. **오픈소스 준비** — `git clone → pnpm install → pnpm dev → 에이전트 실행` 1분 경험 완성
4. **확장 기반** — Tool 추가만으로 에이전트 능력 확장 가능한 플러그인 구조 확보
