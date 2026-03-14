# System Structure Map

Generated from parallel architecture analysis lanes:
1. Frontend module map (`src/`)
2. Backend module map (`server/`)
3. Tooling/docs map (`scripts/`, `docs/`)
4. Build/config map (`package.json`, `tsconfig*`, `vite.config.ts`, `.env*`)
5. End-to-end runtime sequence (UI -> API -> DB/CLI -> WS -> UI)
6. Repository inventory (tree and key files)

## High-Level System Map

```mermaid
flowchart LR
  subgraph FE[Frontend]
    FE0["src/main.tsx"]
    FE1["src/App.tsx"]
    FE2["src/components/*"]
    FE3["src/api.ts"]
    FE4["src/hooks/useWebSocket.ts"]
    FE0 --> FE1
    FE1 --> FE2
    FE1 --> FE3
    FE1 --> FE4
  end

  subgraph BE[Backend]
    BE0["server/index.ts"]
    BE1["Express REST (/api/*)"]
    BE2["WebSocket broadcast"]
    BE3["SQLite (agentdesk.sqlite)"]
    BE4["CLI/HTTP agents + logs + worktrees"]
    BE0 --> BE1
    BE0 --> BE2
    BE0 --> BE3
    BE0 --> BE4
  end

  FE3 <-->|HTTP| BE1
  FE4 <-->|ws://| BE2
  BE1 --> BE3
  BE1 --> BE4
```

## Frontend Composition

```mermaid
flowchart TD
  App["src/App.tsx"] --> Sidebar["components/Sidebar.tsx"]
  App --> Dashboard["components/Dashboard.tsx"]
  App --> TaskBoard["components/TaskBoard.tsx"]
  App --> Settings["components/SettingsPanel.tsx"]
  App --> Chat["components/ChatPanel.tsx"]
  App --> AgentDetail["components/AgentDetail.tsx"]
  App --> Terminal["components/TerminalPanel.tsx"]
  App --> API["src/api.ts"]
  App --> Types["src/types/index.ts"]
  App --> WS["hooks/useWebSocket.ts"]
```

## Backend Runtime Surface

```mermaid
flowchart LR
  UI["Browser UI"] --> REST["Express routes"]
  UI --> WS["WebSocket server"]
  REST --> DB["SQLite tables"]
  REST --> Run["Task runner"]
  Run --> Proc["CLI process / HTTP provider"]
  Proc --> Log["logs/*.log + task_logs"]
  Log --> WS
  REST --> Git[".agentdesk-worktrees + git ops"]
  REST --> OAuth["oauth_credentials"]
```

## Core Runtime Sequence

```mermaid
sequenceDiagram
  participant UI
  participant API as src/api.ts
  participant S as server/index.ts
  participant DB as SQLite
  participant AG as CLI/HTTP Agent
  participant WS as WebSocket

  UI->>API: initial load (departments/agents/tasks/stats/settings)
  API->>S: GET /api/*
  S->>DB: SELECT/aggregate
  DB-->>S: rows
  S-->>API: json
  API-->>UI: hydrate state

  UI->>API: POST /api/tasks/:id/run
  API->>S: run request
  S->>DB: update task/agent + append logs
  S->>AG: spawn CLI or call HTTP model
  AG-->>S: output stream
  S->>WS: broadcast task_update/cli_output/agent_status
  WS-->>UI: live updates
  UI->>API: GET /api/tasks/:id/terminal
  API->>S: read log + task_logs
  S-->>API: terminal payload
  API-->>UI: terminal refresh
```

## Key Files

- Runtime entry: `server/index.ts`, `src/main.tsx`, `src/App.tsx`
- API contract layer: `src/api.ts`
- Shared model types: `src/types/index.ts`
- Visualization generator: `scripts/generate-architecture-report.mjs`
- Generated artifacts: `docs/architecture/README.md`, `docs/architecture/*.mmd`, `docs/architecture/architecture.json`

## Refresh Commands

```bash
npm run arch:map
```

---

## 에이전트 선별 & 업무 지시 흐름

```mermaid
flowchart TD
  A[POST /api/tasks/:id/run] --> B{assigned_agent_id\n설정 여부}

  B -- "있음" --> C[resolveConstrainedAgentScopeForTask]
  C --> D{스코프 검증}
  D -- "통과" --> G[해당 에이전트 사용]
  D -- "위반" --> E[agentId 초기화]
  E --> F[selectAutoAssignableAgentForTask]

  B -- "없음" --> F

  F --> F1[Step 1: 에이전트 풀 제약 해소\n팩 선호 부서 ∩ 프로젝트 manual 스코프]
  F1 --> F2[Step 2: 필터링\ncli_provider 설정 + idle/break + 현재 태스크 없음]
  F2 --> F3[Step 3: 정렬\n부서 선호→상태→역할→완료수→생성시간]
  F3 --> G

  G --> H[buildTaskExecutionPrompt\n15개 블록 조립]
  H --> I[pre-task Hooks 실행]
  I --> J[child_process.spawn]
  J --> K[stdout → WebSocket → Terminal]
```

## 업무 지시서 조립 구조 (프롬프트 블록)

```mermaid
flowchart LR
  subgraph 프롬프트["buildTaskExecutionPrompt()"]
    direction TB
    B1["[Task Session] sessionId·agentId·provider"]
    B2["[Project Structure] 코드베이스 요약"]
    B3["[Task] title + description ★"]
    B4["[Workflow Pack Rules] 팩별 실행 지침"]
    B5["[Character Persona] 에이전트 페르소나"]
    B6["[Project Rules] project>agent>dept>global"]
    B7["[Agent Memory] 과거 기억 (5min TTL 캐시)"]
    B8["[Run Instruction] 최종 실행 지침"]
    B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
  end
  프롬프트 --> Spawn["child_process.spawn(claude|codex|gemini...)"]
```

## 에이전트 회의 & 결과 도출 흐름

```mermaid
sequenceDiagram
  participant Task as Task (in_progress)
  participant RC as ReviewConsensus
  participant L1 as 리더A
  participant L2 as 리더B
  participant DB as DB / meeting_minutes

  Task->>RC: handleTaskRunComplete (exit 0)
  RC->>RC: callLeadersToClientOffice()
  RC->>L1: runAgentOneShot(meetingPrompt, round=1)
  L1-->>DB: appendMeetingMinuteEntry(approve|revise)
  RC->>L2: runAgentOneShot(meetingPrompt, round=1)
  L2-->>DB: appendMeetingMinuteEntry(approve|revise)

  RC->>RC: processReviewConsensusOutcome()
  alt 전원/다수 approve
    RC->>Task: status = 'done'
  else revise 요청
    RC->>Task: seedReviewRevisionSubtasks() → Round 2
  else Round 3 초과
    RC->>Task: 강제 승인 → status = 'done'
  end
  RC->>RC: dismissLeadersFromClientOffice()
```

## 결과 도출 파이프라인

```mermaid
flowchart TD
  Exit[프로세스 종료 exit code] --> R1[task.result = 로그 마지막 2000자]
  R1 --> R2[runAfterExitGates\n출력 게이트 검증]
  R2 --> R3[runExtractLearnings\n인사이트 → memory_entries]
  R3 --> R4[runExtractSkills\n스킬 → skill_learning_history]
  R4 --> R5[recordAgentUsage\n토큰·비용 기록]
  R5 --> R6{exit code}
  R6 -- "0" --> R7[executeHooks post-task\ntask.status = review\nstartReviewConsensusMeeting]
  R6 -- "≠ 0" --> R8[executeHooks on-error\ntask.status = failed\nretry 카운터 증가]
  R7 --> R9[알림: UI 토스트 + 메신저]
  R8 --> R9
  R9 --> R10[cleanupWorktree]
```

---

## 2.0 데이터 모델 추가 (신규 테이블)

Project OS 리뉴얼(2.0)에서 추가되는 DB 테이블 목록. 기존 `projects`, `agents`, `departments` 테이블은 유지하고 아래 테이블이 추가된다.

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| `categories` | 프로젝트 유형 정의 (카테고리) | `id`, `name`, `slug`, `description`, `icon`, `color`, `kpi_schema`, `risk_schema`, `gate_schema`, `deliverable_schema`, `is_template`, `version`, `owner_scope` |
| `category_versions` | 카테고리 버전 이력 | `id`, `category_id`, `version`, `snapshot_json`, `created_at` |
| `project_agents` | 프로젝트-에이전트 팀 연결 (junction) | `project_id`, `agent_id`, `added_at` |
| `project_objectives` | 프로젝트 목표 | `id`, `project_id`, `title`, `description`, `status`, `order` |
| `project_risks` | 프로젝트 리스크 | `id`, `project_id`, `title`, `severity`, `status`, `mitigation` |
| `project_gates` | 프로젝트 검토 단계 | `id`, `project_id`, `title`, `status`, `due_date`, `criteria` |
| `project_outputs` | 프로젝트 계획 결과물 (산출물 타입) | `id`, `project_id`, `title`, `type`, `status`, `url` |

> **주의**: `project_outputs`는 프로젝트 레벨 계획 산출물(PRD, API 명세 등).
> 태스크 실행 결과 파일은 기존 `deliverables` / `task_reports` 테이블을 사용.

`projects` 테이블에 추가되는 컬럼:
- `category_id` — `categories.id` 참조
- `category_version` — 생성 시 카테고리 버전 고정 (재현성)
- `success_metric` — JSON (카테고리 `kpi_schema` 오버라이드)
- `risk_profile` — JSON
- `required_gates` — JSON 배열
- `deliverable_schema` — JSON

상세 API: [specs/api.md §2.0 카테고리 & 프로젝트 팀](../specs/api.md)
상세 UX: [design/UI-SCREENS.md](../design/UI-SCREENS.md)
