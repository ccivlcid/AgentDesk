# CLI 하이브리드 실행 아키텍처

> AgentDesk 태스크 실행을 내부 엔진 + 외부 CLI 도구로 하이브리드화하는 전략 문서
> 최초 작성: 2026-03-23

---

## 목차

1. [현재 아키텍처 (AS-IS)](#1-현재-아키텍처-as-is)
2. [목표 아키텍처 (TO-BE)](#2-목표-아키텍처-to-be)
3. [실행 모드 분기 전략](#3-실행-모드-분기-전략)
4. [전체 실행 흐름 상세](#4-전체-실행-흐름-상세)
5. [완료 감지 전략](#5-완료-감지-전략)
6. [WebSocket 이벤트 설계](#6-websocket-이벤트-설계)
7. [컨텍스트 파일 상세 스펙](#7-컨텍스트-파일-상세-스펙)
8. [API 엔드포인트 설계](#8-api-엔드포인트-설계)
9. [PTY ↔ 태스크 로그 연결](#9-pty--태스크-로그-연결)
10. [기능 지원 매트릭스](#10-기능-지원-매트릭스)
11. [구현 계획 (Phase A~E)](#11-구현-계획-phase-ae)
12. [변경 파일 맵](#12-변경-파일-맵)
13. [태스크 상태 다이어그램](#13-태스크-상태-다이어그램)
14. [에러 처리 및 타임아웃](#14-에러-처리-및-타임아웃)

---

## 1. 현재 아키텍처 (AS-IS)

### 1-1. 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentDesk Frontend                            │
│                                                                      │
│  TaskBoard  ──────────────────────────────────────► CliWindow (PTY)  │
│  (태스크 관리)     완전히 단절됨                      (별도 터미널)     │
│                                                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ WebSocket / REST
┌────────────────────────────▼────────────────────────────────────────┐
│                        AgentDesk Server                              │
│                                                                      │
│  execution-start-task.ts                                             │
│  ┌─────────────────────────────────────────────────┐                 │
│  │  provider 분기                                  │                 │
│  │                                                 │                 │
│  │  claude/codex/gemini/cursor/opencode            │                 │
│  │    → spawnCliAgent()  ──── 헤드리스 자식 프로세스 │                 │
│  │      stdin에 프롬프트 pipe, 사용자 보이지 않음    │                 │
│  │                                                 │                 │
│  │  api / ollama                                   │                 │
│  │    → launchApiProviderAgent()  HTTP API 호출     │                 │
│  │                                                 │                 │
│  │  copilot / antigravity                          │                 │
│  │    → launchHttpAgent()  HTTP 에이전트            │                 │
│  └─────────────────────────────────────────────────┘                 │
│                                                                      │
│  PTY Manager (server/modules/pty/pty-manager.ts)                     │
│    → CliWindow 전용 독립 셸 세션                                      │
│    → 태스크 시스템과 완전 단절                                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 1-2. 현재 spawnCliAgent 실행 방식

`server/modules/workflow/agents/cli-runtime.ts` → `server/modules/workflow/core/cli-tools.ts`

```
spawnCliAgent(taskId, provider, prompt, projectPath, logPath, model, reasoningLevel)
     │
     ├── buildAgentArgs(provider) 로 실행 인자 생성
     │
     ├── spawn(args[0], args.slice(1), {
     │     stdio: ["pipe", "pipe", "pipe"],   ← stdin/stdout/stderr 모두 pipe
     │     cwd: projectPath,
     │     env: { NO_COLOR: "1", CI: "1", ... }  ← 컬러/인터랙티브 모드 비활성화
     │   })
     │
     ├── child.stdin.write(prompt)  ← 프롬프트를 stdin에 직접 파이프
     ├── child.stdin.end()
     │
     ├── stdout/stderr → 로그 파일 저장 + broadcast("cli_output", ...)
     │
     └── child.on("close") → handleTaskRunComplete(taskId, exitCode)
```

**각 CLI 도구별 실제 실행 명령어:**

```
provider    실행 명령어
─────────────────────────────────────────────────────────────────
claude      claude --dangerously-skip-permissions --print --verbose
            --output-format=stream-json --include-partial-messages
            --max-turns 200 [--model <model>] [--tools=]

codex       codex --enable multi_agent [-m <model>]
            [-c model_reasoning_effort="<level>"] --yolo exec --json
            [--sandbox read-only]  ← noTools 시

gemini      gemini [-m <model>] --yolo --output-format=stream-json
            [--approval-mode plan]  ← noTools 시

cursor      agent --print --output-format=stream-json --force
            [--model <model>] [--no-force]  ← noTools 시

opencode    opencode run [-m <model>] --format json
─────────────────────────────────────────────────────────────────
```

### 1-3. 현재 PTY (CliWindow) 구조

```
CliWindow (Frontend)
     │  WebSocket messages
     ▼
hub.ts handleClientMessage()
     │
     ├── pty_create  → ptyManager.createSession(ws, { id, cwd, cols, rows })
     │                   └── nodePty.spawn(shell, [], { cwd, env })
     │                       └── ptyProcess.onData → sendRawToClient("pty_output", { id, data })
     │
     ├── pty_input   → ptyManager.writeToSession(id, data)
     │
     ├── pty_resize  → ptyManager.resizeSession(id, cols, rows)
     │
     └── pty_destroy → ptyManager.destroySession(id)

현재 PTY는 태스크 시스템과 완전히 단절됨:
  - taskId 없음
  - 태스크 로그에 저장 안 됨
  - handleTaskRunComplete 호출 없음
```

### 1-4. 현재의 문제점

```
문제 1: 헤드리스 실행
  spawnCliAgent는 프롬프트를 stdin으로 pipe → 사용자가 작업 과정을 볼 수 없음
  CliWindow는 별도 터미널로만 동작 → 태스크와 무관

문제 2: 단절된 생태계
  CLI 터미널에서 작업해도 TaskBoard에 반영 없음
  회의록, 보고서, 의사결정 → 모두 내부 엔진 전용

문제 3: 모델 활용 제한
  내부 엔진은 설정된 모델만 사용
  최신 claude/cursor/codex 기능 활용 불가
```

---

## 2. 목표 아키텍처 (TO-BE)

### 2-1. 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AgentDesk Frontend                            │
│                                                                      │
│  TaskBoard ◄──── 실시간 반영 ────► CliWindow (PTY + taskId 연결)     │
│  (태스크 관리)   cli_output        (태스크 작업 터미널)               │
│       ▲                                    │                         │
│       │ task_update                        │ 완료 버튼 / API 호출    │
│       │                                    ▼                         │
└───────┼────────────────────────────────────┼─────────────────────────┘
        │ WebSocket / REST                   │
┌───────┼────────────────────────────────────┼─────────────────────────┐
│       ▼                                    ▼                         │
│                        AgentDesk Server                              │
│                                                                      │
│  execution-start-task.ts                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │  provider 분기 (변경 후)                              │            │
│  │                                                      │            │
│  │  claude / cursor / codex / gemini                    │            │
│  │    → [NEW] CLI 인터랙티브 모드                        │            │
│  │      1. 컨텍스트 파일 생성 (CLAUDE.md 등)             │            │
│  │      2. broadcast("auto_open_cli", {agentId,taskId}) │            │
│  │      3. PTY 세션에 taskId 연결 대기                   │            │
│  │      4. PTY 출력 → 태스크 로그 실시간 저장            │            │
│  │      5. 완료 신호 수신 → handleTaskRunComplete()      │            │
│  │                                                      │            │
│  │  opencode                                            │            │
│  │    → 기존 spawnCliAgent (헤드리스, 변경 없음)          │            │
│  │                                                      │            │
│  │  api / ollama                                        │            │
│  │    → 기존 launchApiProviderAgent (변경 없음)          │            │
│  │                                                      │            │
│  │  copilot / antigravity                               │            │
│  │    → 기존 launchHttpAgent (변경 없음)                 │            │
│  └──────────────────────────────────────────────────────┘            │
│                                                                      │
│  PTY Manager (확장)                                                  │
│    → PTY 세션에 taskId 연결 지원                                      │
│    → onData 시 태스크 로그 저장 + cli_output broadcast               │
│    → 완료 신호 수신 → handleTaskRunComplete 콜백                     │
│                                                                      │
│  POST /api/tasks/:id/cli-complete  [NEW]                            │
│    → CLI 에이전트가 작업 완료 시 호출                                 │
│    → handleTaskRunComplete(taskId, exitCode) 트리거                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2-2. 핵심 원칙

```
원칙 1: 내부 엔진 기능은 모두 유지
  기획 회의, 리뷰 회의, 보고서, 의사결정, 핸드오프
  → CLI 모드에서도 동일하게 동작

원칙 2: CLI 실행은 인터랙티브
  사용자가 실시간으로 에이전트의 작업 과정을 볼 수 있음
  필요시 직접 개입 가능

원칙 3: 완전한 자동화
  태스크 시작 → CLI 창 자동 오픈 → 작업 → 완료 감지 → 리뷰 회의 → done
  사용자 개입 없이 전체 흐름 자동 진행 가능

원칙 4: Fallback 보장
  완료 API 호출이 안 될 경우 → 완료 버튼으로 수동 처리
  모든 CLI 도구에서 동작
```

---

## 3. 실행 모드 분기 전략

### 3-1. 분기 결정 로직

```
execAgent.cli_provider 값
         │
         ├── "claude"       ──┐
         ├── "cursor"       ──┤──→ CLI 인터랙티브 모드 (신규)
         ├── "codex"        ──┤    PTY 터미널 + 컨텍스트 파일 주입
         └── "gemini"       ──┘
         │
         ├── "opencode"     ──────→ 헤드리스 spawnCliAgent (기존 유지)
         │                         stdin pipe 방식, 변경 없음
         │
         ├── "api"          ──┐
         └── "ollama"       ──┤──→ 내부 엔진 launchApiProviderAgent (기존 유지)
         │                   ┘    HTTP API 직접 호출
         │
         ├── "copilot"      ──┐
         └── "antigravity"  ──┴──→ 내부 엔진 launchHttpAgent (기존 유지)
                                   OAuth HTTP 에이전트
```

### 3-2. 분기 판별 함수 (신규)

```typescript
// server/modules/workflow/orchestration/execution-start-task.ts

const CLI_INTERACTIVE_PROVIDERS = new Set(["claude", "cursor", "codex", "gemini"]);
const CLI_HEADLESS_PROVIDERS    = new Set(["opencode"]);
const HTTP_API_PROVIDERS        = new Set(["api", "ollama"]);
const HTTP_AGENT_PROVIDERS      = new Set(["copilot", "antigravity"]);

function getExecutionMode(provider: string): "cli_interactive" | "cli_headless" | "api" | "http" {
  if (CLI_INTERACTIVE_PROVIDERS.has(provider)) return "cli_interactive";
  if (CLI_HEADLESS_PROVIDERS.has(provider))    return "cli_headless";
  if (HTTP_API_PROVIDERS.has(provider))        return "api";
  if (HTTP_AGENT_PROVIDERS.has(provider))      return "http";
  return "cli_headless"; // 알 수 없는 provider는 헤드리스로 fallback
}
```

---

## 4. 전체 실행 흐름 상세

### 4-1. CLI 인터랙티브 모드 시퀀스

```
User          Frontend          Server (execution-start-task)    Server (PTY/WS)
 │                │                          │                         │
 │  실행 버튼 클릭 │                          │                         │
 ├───────────────►│                          │                         │
 │                │  PATCH /api/tasks/:id    │                         │
 │                ├─────────────────────────►│                         │
 │                │  { status: "planned" }   │                         │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  PHASE 0: 준비                  │    │
 │                │              │  1. 의존성 검증                  │    │
 │                │              │  2. agents.status = "working"  │    │
 │                │              │  3. tasks.status = "in_progress"│   │
 │                │              │  4. Git worktree 브랜치 생성    │    │
 │                │              │     agentdesk/{taskId[0:8]}     │    │
 │                │              │  5. 규칙/메모리/스킬 블록 로드   │    │
 │                │              └───────────┬────────────────────┘    │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  PHASE 1: 기획 회의 (Phase E)   │    │
 │                │              │  (선택적, 에이전트 설정에 따라)  │    │
 │                │              │  내부 회의 엔진 실행             │    │
 │                │              │  → meeting_minutes 저장         │    │
 │                │              └───────────┬────────────────────┘    │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  PHASE 2: 컨텍스트 파일 생성     │    │
 │                │              │  (Phase D)                      │    │
 │                │              │  worktreePath에 파일 저장:       │    │
 │                │              │  claude/cursor → CLAUDE.md      │    │
 │                │              │  gemini        → GEMINI.md      │    │
 │                │              │  codex         → .agentdesk-    │    │
 │                │              │                  context.md     │    │
 │                │              └───────────┬────────────────────┘    │
 │                │                          │                         │
 │                │     auto_open_cli        │                         │
 │                │◄─────────────────────────┤                         │
 │                │  { agentId, taskId,      │                         │
 │                │    provider, cwd }       │                         │
 │                │                          │                         │
 │   CliWindow    │                          │                         │
 │   자동 오픈    │                          │                         │
 │                │                          │                         │
 │                │  pty_create              │                         │
 │                ├────────────────────────────────────────────────────►│
 │                │  { id: sessionId,        │                         │
 │                │    cwd: worktreePath,    │                         │
 │                │    taskId }   ← NEW      │                         │
 │                │                          │                         │
 │                │◄───────────────────────────────────── pty_ready ───┤
 │                │                          │                         │
 │                │  pty_input               │                         │
 │                ├────────────────────────────────────────────────────►│
 │                │  { data: "claude\r" }    │                         │
 │                │   (CLI 자동 실행)         │                         │
 │                │                          │                         │
 │ 실시간 작업 확인│◄── pty_output ───────────────────────────────────┤
 │ (터미널 표시)  │  { id, data }            │                         │
 │                │                          │                         │
 │                │◄── cli_output ──────────────────────────────────── │
 │                │  { taskId, data }  ← NEW│  ← PTY 출력을 태스크    │
 │                │  (태스크 터미널 보기 용)  │    로그에도 저장          │
 │                │                          │                         │
 │                │              ┌───────────┤                         │
 │                │              │  태스크 로그에 실시간 저장           │
 │                │              │  appendTaskLog(taskId, "cli", data) │
 │                │              └───────────┤                         │
 │                │                          │                         │
 │ 에이전트가     │                          │                         │
 │ 작업 완료 후   │                          │                         │
 │ curl 완료 API  │                          │                         │
 │ 호출          │                          │                         │
 │                │  POST /api/tasks/:id/cli-complete                  │
 │                ├─────────────────────────►│                         │
 │                │  { exit_code: 0,         │                         │
 │                │    summary: "..." }      │                         │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  handleTaskRunComplete()        │    │
 │                │              │  (기존 완료 흐름 그대로)         │    │
 │                │              └───────────┬────────────────────┘    │
 │                │                          │                         │
 │                │     close_cli            │                         │
 │                │◄─────────────────────────┤                         │
 │   CliWindow    │  { taskId }              │                         │
 │   자동 닫힘    │                          │                         │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  PHASE 5: 리뷰 회의              │    │
 │                │              │  기존 review-consensus.ts 그대로 │    │
 │                │              └───────────┬────────────────────┘    │
 │                │                          │                         │
 │                │              ┌───────────▼────────────────────┐    │
 │                │              │  tasks.status = "done"          │    │
 │                │              │  핸드오프 / 의존 태스크 시작    │    │
 │                │              └────────────────────────────────┘    │
```

### 4-2. 내부 엔진 모드 (변경 없음)

```
api / ollama / copilot / antigravity / opencode

태스크 실행 버튼
      │
      ▼
준비 (의존성 검증, worktree, 프롬프트 빌드)
      │
      ▼
LLM 헤드리스 실행
  api/ollama   → launchApiProviderAgent() → HTTP API 호출
  copilot/anti → launchHttpAgent()         → OAuth HTTP
  opencode     → spawnCliAgent()           → stdin pipe
      │
      ▼ (프로세스 종료 또는 HTTP 응답)
handleTaskRunComplete()
      │
      ▼
리뷰 회의 → done
```

---

## 5. 완료 감지 전략

### 5-1. 세 가지 방법 비교

```
┌─────────────────────────────────────────────────────────────────────┐
│  방법 1: API 호출 (주요 방법)                                         │
│                                                                      │
│  에이전트 (CLI 내부)                    AgentDesk Server             │
│       │                                      │                       │
│       │  작업 완료 감지                       │                       │
│       │  CLAUDE.md 지시 따름                 │                       │
│       │                                      │                       │
│       │  curl -X POST localhost:8790/...     │                       │
│       ├─────────────────────────────────────►│                       │
│       │  /api/tasks/{taskId}/cli-complete    │                       │
│       │  { exit_code: 0, summary: "..." }    │                       │
│       │                                      │                       │
│       │                          handleTaskRunComplete()             │
│       │                          리뷰 회의 시작                      │
│                                                                      │
│  신뢰도: Claude ⭐⭐⭐⭐⭐  Cursor ⭐⭐⭐⭐⭐  Gemini ⭐⭐⭐⭐  Codex ⭐⭐⭐  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  방법 2: CliWindow 완료 버튼 (Fallback)                               │
│                                                                      │
│  User → CliWindow 하단 [✓ 작업 완료] 버튼 클릭                       │
│       │                                      │                       │
│       │  POST /api/tasks/{taskId}/cli-complete                      │
│       ├─────────────────────────────────────►│                       │
│       │  { exit_code: 0 }                    │                       │
│       │                                      │                       │
│       │                          handleTaskRunComplete()             │
│                                                                      │
│  신뢰도: ⭐⭐⭐⭐⭐ (사용자 수동, 항상 작동)                             │
│  용도: Codex fallback, 사용자가 직접 판단할 때                        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  방법 3: PTY 프로세스 종료 감지 (비대화형 전환 시)                    │
│                                                                      │
│  PTY 세션에서 CLI 프로세스 자체가 종료될 때:                          │
│  ptyProcess.onExit({ exitCode }) → handleTaskRunComplete 연결        │
│                                                                      │
│  단점: 인터랙티브 셸에서는 사용자가 exit 치기 전까지 종료 안 됨       │
│  용도: 비대화형 모드로 전환한 경우에만 사용                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 5-2. 완료 감지 우선순위 로직

```
CLI 인터랙티브 모드에서 완료 처리 순서:

1순위: 에이전트가 POST /api/tasks/:id/cli-complete 호출
    → 즉시 handleTaskRunComplete() 실행
    → CliWindow에 close_cli 이벤트 전송

2순위: 사용자가 [✓ 작업 완료] 버튼 클릭
    → 동일 API 호출

3순위 (예외): 타임아웃
    → CLI 세션이 너무 오래 걸릴 경우 알림 표시
    → 사용자 판단에 맡김 (강제 종료 없음)

※ 인터랙티브 모드에서는 강제 타임아웃 종료 없음
  (사용자가 직접 보고 있으므로)
```

---

## 6. WebSocket 이벤트 설계

### 6-1. 현재 WebSocket 이벤트 목록

```
방향: Server → Client (broadcast)
─────────────────────────────────────────────
이벤트 타입          설명
─────────────────────────────────────────────
task_update         태스크 상태 변경
agent_status        에이전트 상태 변경
cli_output          태스크 stdout 스트림 (taskId 구독 필요)
subtask_update      서브태스크 상태 변경
notification        알림 생성
pty_output          PTY 터미널 출력 (해당 클라이언트만)
pty_exit            PTY 세션 종료 (해당 클라이언트만)

방향: Client → Server
─────────────────────────────────────────────
subscribe_task      cli_output 구독 시작
unsubscribe_task    cli_output 구독 해제
pty_create          PTY 세션 생성
pty_input           PTY 입력 전송
pty_resize          PTY 크기 조정
pty_destroy         PTY 세션 종료
```

### 6-2. 신규 WebSocket 이벤트 (Phase C)

```
방향: Server → Client (broadcast)
─────────────────────────────────────────────────────────────────────
이벤트: auto_open_cli

페이로드:
{
  type: "auto_open_cli",
  payload: {
    agentId:  string,     // 에이전트 ID → CliWindow 오픈 대상
    taskId:   string,     // 연결할 태스크 ID
    provider: string,     // "claude" | "cursor" | "codex" | "gemini"
    cwd:      string,     // worktreePath (작업 디렉토리)
  }
}

처리: Frontend App.tsx에서 수신
  → openCliWindow(agentId) 호출 (기존 uiStore 액션)
  → CliWindow에 taskId 전달
─────────────────────────────────────────────────────────────────────
이벤트: close_cli

페이로드:
{
  type: "close_cli",
  payload: {
    taskId: string,       // 닫을 CliWindow와 연결된 태스크 ID
  }
}

처리: Frontend CliWindow에서 수신
  → 해당 taskId 연결된 CliWindow 닫힘
─────────────────────────────────────────────────────────────────────

방향: Client → Server
─────────────────────────────────────────────────────────────────────
이벤트: pty_create (확장, Phase A)

페이로드 변경:
{
  type: "pty_create",
  id:     string,         // PTY 세션 ID
  cwd?:   string,         // 작업 디렉토리
  cols?:  number,
  rows?:  number,
  shell?: string,
  taskId?: string,        // [NEW] 연결할 태스크 ID (있으면 로그 연결)
}
─────────────────────────────────────────────────────────────────────
```

### 6-3. cli_output 이벤트 현재 vs 변경 후

```
현재:
  broadcast("cli_output", {
    task_id: taskId,       ← 헤드리스 spawnCliAgent에서만 발생
    stream: "stdout",
    data: text
  })

변경 후 (Phase A):
  PTY 세션에 taskId 연결 시 pty_output과 동시에 cli_output도 발생:
  broadcast("cli_output", {
    taskId: taskId,        ← PTY에서도 발생
    line: data
  })

  이로 인해:
  - 태스크의 "터미널 보기"에서 CLI 인터랙티브 작업 내용도 확인 가능
  - subscribe_task로 구독 필요 (기존과 동일)
```

---

## 7. 컨텍스트 파일 상세 스펙

### 7-1. 파일 생성 위치

```
태스크 실행 시 worktreePath 기준으로 생성:

worktreePath = /path/to/project/.agentdesk-worktrees/task-abc12345/

provider    파일 경로
─────────────────────────────────────────────────────────
claude      {worktreePath}/CLAUDE.md
cursor      {worktreePath}/CLAUDE.md  (cursor도 CLAUDE.md 읽음)
gemini      {worktreePath}/GEMINI.md
codex       {worktreePath}/.agentdesk-context.md
            + CLI 플래그: codex --instructions .agentdesk-context.md
─────────────────────────────────────────────────────────

주의: 기존 CLAUDE.md가 있으면 덮어쓰지 않고
      AgentDesk 섹션을 맨 위에 prepend
```

### 7-2. CLAUDE.md 전체 템플릿

```markdown
<!-- AGENTDESK:START — 자동 생성, 수정 금지 -->
# AgentDesk Task Context

## 📋 현재 태스크
| 항목 | 값 |
|------|-----|
| Task ID | `{taskId}` |
| 제목 | {taskTitle} |
| 담당 에이전트 | {agentName} ({agentRole}) |
| 부서 | {departmentName} |
| 프로젝트 | {projectName} |
| 작업 브랜치 | `agentdesk/{taskId[0:8]}` |
| 우선순위 | {priority} |
| 태스크 타입 | {taskType} |

## 📝 태스크 설명
{taskDescription}

## 🗣️ 기획 회의 결과 요약
{planningMeetingMinutesSummary}
(Phase E 비활성화 시 이 섹션은 생략)

## ✅ 결정사항
{decisions}
(기획 회의에서 결정된 사항들)

## 📏 규칙 및 제약
{rulesBlock}

## 🧠 에이전트 메모리
{memoryBlock}

## ⚙️ 실행 환경
- 작업 디렉토리: `{worktreePath}`
- Git 브랜치: `agentdesk/{taskId[0:8]}`
- AgentDesk API: `http://localhost:{port}`
- 세션 ID: `{sessionId}`

## 🏁 완료 신호 (필수)

작업이 **성공적으로 완료**되면 반드시 다음 명령을 실행하세요:

```bash
curl -X POST http://localhost:{port}/api/tasks/{taskId}/cli-complete \
  -H "Content-Type: application/json" \
  -d '{
    "exit_code": 0,
    "summary": "완료된 작업 내용을 간략히 서술"
  }'
```

작업이 **실패하거나 완료 불가**한 경우:

```bash
curl -X POST http://localhost:{port}/api/tasks/{taskId}/cli-complete \
  -H "Content-Type: application/json" \
  -d '{
    "exit_code": 1,
    "summary": "실패 원인 서술"
  }'
```

이 API 호출 후 자동으로 리뷰 회의가 시작되고 최종 완료 처리됩니다.
<!-- AGENTDESK:END -->

{existingClaudeMdContent}
```

### 7-3. GEMINI.md 템플릿

```markdown
<!-- AGENTDESK:START -->
# AgentDesk Task Context
{동일 구조, CLAUDE.md와 동일}
<!-- AGENTDESK:END -->
```

### 7-4. .agentdesk-context.md (Codex)

```markdown
# AgentDesk Task Context
{동일 구조}
```

Codex 실행 시 추가 플래그:
```
codex --instructions ".agentdesk-context.md" --yolo exec --json
```

### 7-5. 기존 CLAUDE.md 보존 전략

```
worktreePath에 CLAUDE.md가 이미 존재하는 경우:

기존 내용:
  ────────────────────────
  # My Project Rules
  Never use var.
  ────────────────────────

생성 후:
  ────────────────────────
  <!-- AGENTDESK:START -->
  # AgentDesk Task Context
  ... (AgentDesk 내용)
  <!-- AGENTDESK:END -->

  # My Project Rules      ← 기존 내용 보존
  Never use var.
  ────────────────────────

완료 후 정리:
  <!-- AGENTDESK:START --> ~ <!-- AGENTDESK:END --> 섹션 제거
  기존 내용만 남김
```

---

## 8. API 엔드포인트 설계

### 8-1. 신규: POST /api/tasks/:id/cli-complete

```
파일: server/modules/routes/core/tasks/execution-control.ts

엔드포인트: POST /api/tasks/:id/cli-complete

요청 body:
{
  exit_code?: number,   // 기본값: 0 (성공)
  summary?:  string,    // 완료 요약 (태스크 로그에 저장)
}

처리 흐름:
  1. 태스크 존재 여부 확인
  2. 태스크 상태가 "in_progress"인지 확인
  3. summary가 있으면 appendTaskLog(taskId, "system", `CLI complete: ${summary}`)
  4. broadcast("close_cli", { taskId })  ← CliWindow 닫기
  5. handleTaskRunComplete(taskId, exit_code ?? 0)  ← 기존 완료 흐름

응답:
  성공: { ok: true }
  실패: { ok: false, error: "task_not_found" | "not_in_progress" }

인증: 로컬 전용 (localhost만 수신, 에이전트가 curl로 호출)

예시 호출:
  curl -X POST http://localhost:8790/api/tasks/task-abc123/cli-complete \
    -H "Content-Type: application/json" \
    -d '{"exit_code": 0, "summary": "로그인 버그 수정 완료. 3개 파일 수정됨."}'
```

### 8-2. 기존 엔드포인트 유지

```
POST /api/tasks/:id/stop     → 중지 (변경 없음)
POST /api/tasks/:id/resume   → 재개 (변경 없음)
POST /api/tasks/:id/inject   → 인터럽트 주입 (변경 없음, CliWindow에서도 사용)
```

---

## 9. PTY ↔ 태스크 로그 연결

### 9-1. 현재 PTY 데이터 흐름

```
PTY 프로세스
    │  onData(data: string)
    ▼
ptyProcess.onData
    │
    └──► sendRawToClient(ws, "pty_output", { id, data })
              │
              ▼
         CliWindow XTerminal
         (터미널 화면에 표시)

※ 태스크 로그 저장 없음
※ cli_output broadcast 없음
```

### 9-2. 변경 후 PTY 데이터 흐름 (Phase A)

```
PTY Manager 확장:
  PtySession에 taskId?: string 추가
  ptyManager.createSession()의 opts에 taskId 추가

PTY 프로세스
    │  onData(data: string)
    ▼
ptyProcess.onData
    │
    ├──► sendRawToClient(ws, "pty_output", { id, data })
    │         │
    │         ▼
    │    CliWindow XTerminal (기존과 동일)
    │
    └──► [taskId 연결된 경우만]
          appendTaskLog(session.taskId, "cli", data)
          broadcast("cli_output", {
            taskId: session.taskId,
            line: data
          })
              │
              ▼
         태스크 터미널 보기 (TerminalPanel)
         (subscribe_task로 구독한 클라이언트에만 전달)
```

### 9-3. PtySession 타입 변경

```typescript
// server/modules/pty/pty-manager.ts

// 현재
export interface PtySession {
  id: string;
  pty: import("node-pty").IPty;
  ownerWs: WebSocket;
  cwd: string;
  shell: string;
}

// 변경 후
export interface PtySession {
  id: string;
  pty: import("node-pty").IPty;
  ownerWs: WebSocket;
  cwd: string;
  shell: string;
  taskId?: string;           // [NEW] 연결된 태스크 ID
  onTaskComplete?: (exitCode: number) => void;  // [NEW] 완료 콜백
}
```

### 9-4. createSession 확장

```typescript
// 변경 전
function createSession(ws, opts: { id, cwd?, cols?, rows?, shell? })

// 변경 후
function createSession(ws, opts: {
  id: string,
  cwd?: string,
  cols?: number,
  rows?: number,
  shell?: string,
  taskId?: string,    // [NEW]
  appendTaskLog?: (taskId: string, kind: string, msg: string) => void,  // [NEW]
  broadcast?: (type: string, payload: unknown) => void,  // [NEW]
})
```

---

## 10. 기능 지원 매트릭스

```
기능                      claude  cursor  codex  gemini  opencode  api/ollama  copilot
────────────────────────────────────────────────────────────────────────────────────
실행 모드                  인터랙  인터랙  인터랙  인터랙  헤드리스   내부엔진   내부엔진
작업 실시간 가시성          ✅      ✅      ✅      ✅       ❌         ❌         ❌
터미널 로그 저장            ✅      ✅      ✅      ✅       ✅         ✅         ✅
기획 회의 (Phase E)        ✅      ✅      ✅      ✅       ✅         ✅         ✅
컨텍스트 파일 자동 주입     ✅      ✅      ✅      ✅       ❌         ❌         ❌
사용자 인터럽트             ✅      ✅      ✅      ✅       ❌         ✅         ✅
리뷰 회의                  ✅      ✅      ✅      ✅       ✅         ✅         ✅
보고서 생성                 ✅      ✅      ✅      ✅       ✅         ✅         ✅
회의록                     ✅      ✅      ✅      ✅       ✅         ✅         ✅
의사결정함                  ✅      ✅      ✅      ✅       ✅         ✅         ✅
핸드오프                   ✅      ✅      ✅      ✅       ✅         ✅         ✅
Git worktree 격리          ✅      ✅      ✅      ✅       ✅         ✅         ✅
완료 API 신뢰도             ⭐⭐⭐⭐⭐  ⭐⭐⭐⭐⭐  ⭐⭐⭐    ⭐⭐⭐⭐     N/A        N/A        N/A
완료 버튼 (fallback)       ✅      ✅      ✅      ✅       ❌         ❌         ❌
모델 최신성                 ✅      ✅      ✅      ✅       ✅         설정의존   설정의존
서브태스크 위임             ✅      ✅      ✅      ✅       ✅         ✅         ✅
────────────────────────────────────────────────────────────────────────────────────
```

---

## 11. 구현 계획 (Phase A~E)

### Phase A — PTY ↔ 태스크 로그 연결
```
목표: CliWindow에서 CLI 실행 시 출력이 태스크 터미널 보기에도 표시

변경 파일:
  server/modules/pty/pty-manager.ts
    - PtySession에 taskId?: string 추가
    - createSession opts에 taskId, appendTaskLog, broadcast 추가
    - onData 시 taskId 있으면 appendTaskLog + broadcast("cli_output") 호출

  server/ws/hub.ts
    - pty_create 메시지에서 taskId 파싱
    - createSession 호출 시 taskId, appendTaskLog, broadcast 전달

  src/components/windows/CliWindow.tsx
    - taskId prop 추가 (optional)
    - pty_create 메시지에 taskId 포함

선행 작업: 없음
예상 난이도: 낮음 (단순 데이터 연결)
```

### Phase B — 완료 감지 API 추가
```
목표: CLI 에이전트가 curl로 완료 신호를 보낼 수 있는 엔드포인트

변경 파일:
  server/modules/routes/core/tasks/execution-control.ts
    - POST /api/tasks/:id/cli-complete 엔드포인트 추가
    - appendTaskLog, broadcast("close_cli"), handleTaskRunComplete 호출

선행 작업: 없음
예상 난이도: 낮음 (엔드포인트 추가)
```

### Phase C — CliWindow 자동 오픈 + 완료 버튼
```
목표: 태스크 시작 시 CliWindow 자동 오픈, 완료 버튼 추가

변경 파일:
  server/modules/workflow/orchestration/execution-start-task.ts
    - getExecutionMode() 함수 추가
    - CLI 인터랙티브 분기:
      broadcast("auto_open_cli", { agentId, taskId, provider, cwd })
      기존 spawnCliAgent 호출하지 않음

  server/ws/hub.ts
    - broadcast("auto_open_cli") 지원 (기존 sendRaw로 처리)
    - broadcast("close_cli") 지원

  src/App.tsx
    - "auto_open_cli" WebSocket 이벤트 수신
    - openCliWindow(agentId) 호출 + taskId 전달

  src/store/uiStore.ts
    - openCliWindow에 taskId 옵션 추가
    - openCliAgentIds → Map<string, { taskId?: string }> 으로 확장 검토

  src/components/windows/CliWindow.tsx
    - taskId prop 추가
    - "close_cli" WebSocket 이벤트 수신 → taskId 일치 시 자동 닫힘
    - 하단 바에 [✓ 작업 완료] 버튼 추가
      (taskId 연결된 경우만 표시)
      (클릭 시 POST /api/tasks/:id/cli-complete 호출)

선행 작업: Phase A, B
예상 난이도: 중간
```

### Phase D — 컨텍스트 파일 자동 생성
```
목표: CLI 실행 전 CLAUDE.md 등 컨텍스트 파일 자동 생성

신규 파일:
  server/modules/workflow/core/context-file-generator.ts
    - generateContextFile(provider, worktreePath, ctx: TaskContext) 함수
    - buildClaudeMdContent(ctx): string
    - buildGeminiMdContent(ctx): string
    - buildCodexContextContent(ctx): string
    - preprendToExistingFile(filePath, content): void
      (기존 파일 내용 보존, AgentDesk 섹션 prepend)
    - cleanupContextFile(filePath): void
      (완료 후 AgentDesk 섹션 제거)

변경 파일:
  server/modules/workflow/orchestration/execution-start-task.ts
    - CLI 인터랙티브 분기에서 generateContextFile 호출
    - codex의 경우 --instructions 플래그 추가

  server/modules/workflow/orchestration/run-complete-handler/core.ts
    - 완료 후 cleanupContextFile 호출 (선택적)

선행 작업: Phase C
예상 난이도: 중간
```

### Phase E — 기획 회의 단계 추가 (선택적)
```
목표: CLI 실행 전 내부 엔진으로 기획 회의 자동 실행

신규 파일:
  server/modules/workflow/orchestration/meetings/planning-consensus.ts
    - startPlanningMeeting(taskId, taskTitle, departmentId, agents): Promise<string>
    - 기존 review-consensus.ts 메커니즘 재활용
    - 반환값: 기획 회의 결과 요약 문자열 (컨텍스트 파일에 포함)

변경 파일:
  server/modules/workflow/orchestration/execution-start-task.ts
    - CLI 인터랙티브 분기에서 조건부 startPlanningMeeting 호출
    - 회의 결과를 TaskContext에 포함

트리거 조건 (에이전트 설정으로 제어):
  - execAgent.enable_planning_meeting === true
  - 또는 task.task_type IN ("feature", "complex", "research")
  - 기본값: false (opt-in)

선행 작업: Phase D
예상 난이도: 높음
```

---

## 12. 변경 파일 맵

```
server/
├── modules/
│   ├── pty/
│   │   └── pty-manager.ts              [Phase A] PtySession + taskId 연결
│   │
│   ├── workflow/
│   │   ├── core/
│   │   │   └── cli-tools.ts            buildAgentArgs 변경 없음 (참조용)
│   │   │   └── context-file-generator.ts  [Phase D] 신규 — 컨텍스트 파일 생성
│   │   │
│   │   ├── agents/
│   │   │   └── cli-runtime.ts          변경 없음 (헤드리스 유지)
│   │   │
│   │   └── orchestration/
│   │       ├── execution-start-task.ts  [Phase B+C+D+E] 핵심 변경
│   │       │                            CLI 인터랙티브 분기 추가
│   │       │                            auto_open_cli broadcast
│   │       │                            컨텍스트 파일 생성 호출
│   │       │
│   │       ├── meetings/
│   │       │   └── planning-consensus.ts  [Phase E] 신규 — 기획 회의
│   │       │
│   │       └── run-complete-handler/
│   │           └── core.ts              close_cli broadcast 추가
│   │
│   └── routes/core/tasks/
│       └── execution-control.ts        [Phase B] /cli-complete 엔드포인트 추가
│
└── ws/
    └── hub.ts                          [Phase A] pty_create에 taskId 처리 추가

src/
├── App.tsx                             [Phase C] auto_open_cli 이벤트 수신
│
├── store/
│   └── uiStore.ts                      [Phase C] openCliWindow taskId 옵션
│
└── components/windows/
    └── CliWindow.tsx                   [Phase A+C] taskId prop, 완료 버튼
                                        close_cli 이벤트 수신
```

---

## 13. 태스크 상태 다이어그램

### 13-1. CLI 인터랙티브 모드

```
                    [inbox]
                       │
                       │ 실행 버튼 클릭
                       ▼
                   [planned]
                       │
          ┌────────────┤
          │            │
   Phase E 활성화      │ Phase E 비활성화
          │            │
          ▼            │
    기획 회의 진행      │
    (내부 엔진)         │
          │            │
          └────────────┤
                       │
                       ▼
                 [in_progress]
                       │
             ┌─────────┴──────────────┐
             │                        │
    CliWindow 자동 오픈            (기존 헤드리스는 없음)
    CLAUDE.md 등 컨텍스트 파일 생성
             │
             ▼
    에이전트가 CLI에서 작업 중
    PTY 출력 → 태스크 로그 실시간 저장
    사용자가 실시간으로 지켜봄
             │
    ┌────────┴────────┐
    │                 │
API 호출           완료 버튼 클릭
(에이전트)         (사용자)
    │                 │
    └────────┬────────┘
             │
             ▼
    CliWindow 자동 닫힘
             │
             ▼
          [review]
             │
    리뷰 회의 자동 시작
    (내부 엔진, 기존과 동일)
             │
    ┌────────┴────────┐
    │                 │
승인됨           보완 요청
    │                 │
    │         다음 라운드 스케줄
    │                 │
    └────────┬────────┘
             │ 최종 승인
             ▼
           [done]
             │
    ┌────────┴────────────────────┐
    │                             │
핸드오프 태스크 생성          의존 태스크 자동 시작
(handoff_to_agent_id 있을 시)
```

### 13-2. 내부 엔진 모드 (변경 없음)

```
[inbox] → [planned] → [in_progress] → [review] → [done]
                      (헤드리스 LLM)    (리뷰회의)
```

---

## 14. 에러 처리 및 타임아웃

### 14-1. CLI 인터랙티브 모드 에러 케이스

```
케이스 1: 에이전트가 완료 API를 호출하지 않는 경우
  → 타임아웃 없음 (사용자가 직접 보고 있으므로)
  → 알림: "태스크 {title}이 장시간 실행 중입니다. [완료 처리] 버튼을 눌러주세요."
  → 사용자가 완료 버튼 클릭으로 수동 처리

케이스 2: CliWindow가 실수로 닫힘
  → 태스크는 여전히 in_progress 상태 유지
  → 알림: "태스크 {title}의 CLI 창이 닫혔습니다. [다시 열기] 버튼"
  → 다시 열기: openCliWindow(agentId, { taskId, reconnect: true })

케이스 3: 완료 API 호출 실패 (curl 오류)
  → 에이전트가 다시 시도
  → 또는 사용자 완료 버튼 사용

케이스 4: worktree 생성 실패
  → 기존과 동일: status = "pending", 에러 알림 표시

케이스 5: 완료 API가 중복 호출됨
  → 태스크 상태가 이미 "review"이면 무시
  → { ok: false, error: "not_in_progress" } 반환
```

### 14-2. 내부 엔진 모드 에러 (변경 없음)

```
IDLE 타임아웃:   출력 없음이 N초 → SIGTERM → handleTaskRunComplete(taskId, exitCode)
HARD 타임아웃:   총 실행 시간 초과 → SIGKILL → handleTaskRunComplete(taskId, exitCode)
SPAWN 오류:      실행 파일 없음 → appendTaskLog("error", ...) → status = "inbox"
```

---

## 부록: 관련 문서

| 문서 | 위치 | 설명 |
|------|------|------|
| 전체 아키텍처 | `docs/OVERVIEW.md` | AgentDesk 전체 시스템 |
| API 스펙 | `docs/specs/api.md` | REST API 전체 (v1.6.0) |
| 아키텍처 감사 | `docs/architecture/ARCHITECTURE-AUDIT-2026-Q1.md` | Q1 감사 보고서 |
| Bigger IDE 비전 | `docs/strategy/bigger-ide-vision.md` | 장기 전략 |
| 진행 현황 | `docs/progress.md` | 개발 진행 로그 |
