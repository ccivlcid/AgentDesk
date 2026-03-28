# AgentDesk TUI — Developer Interface

> Conversational terminal UI for developers.
> TUI만으로 GUI의 모든 기능 사용 가능.
> Non-developers use GUI (localhost:8800).

---

## 1. Screen Layout

```
┌─────────────────────────────────────┬──────────────────────────┐
│                                     │  Project                 │
│  Chat Area (scrollable)             │    결제 리팩토링           │
│                                     │    /home/dev/payments    │
│  PM: 킥오프 회의를 시작합니다...       │    main branch           │
│                                     │                          │
│  ▸ Meeting                          │  Agents                  │
│    backend-sr: "Stripe 분석 완료"    │    ● PM (idle)           │
│    frontend-sr: "UI 3개 수정 필요"   │    ● Backend Sr (running)│
│                                     │    ● Frontend Sr (idle)  │
│  ▸ Tasks Created                    │    ○ QA (idle)           │
│    T-1 토스 SDK → backend-sr (0.94) │                          │
│    T-2 웹훅 전환 → backend-sr (0.88)│  Tasks                   │
│    T-3 UI 수정 → frontend-sr (0.91) │    [✓] T-1 토스 SDK      │
│                                     │    [→] T-2 웹훅 전환      │
│  [backend-sr] T-1: 토스 SDK 연동     │    [ ] T-3 UI 수정       │
│    ▸ Edit src/payments/toss.ts (new)│    [ ] T-4 에러 핸들링    │
│    ▸ Edit src/payments/webhook.ts   │                          │
│    ▸ Run pnpm test → 12 passed      │  Pipeline                │
│                                     │    Meeting ✓             │
│  PM: T-1 Review → APPROVE ✓        │    Planning ✓            │
│  PM: Starting T-2 → backend-sr     │    Assigning ✓           │
│                                     │   ►Executing             │
│  ┌──────────────────────────────┐   │    Review                │
│  │  > 에러 핸들링도 추가해줘_     │   │                          │
│  └──────────────────────────────┘   │  Cost                    │
│                                     │    82k tokens  $1.24     │
├─────────────────────────────────────┴──────────────────────────┤
│  [AgentDesk] | 결제 | 14m | 82k tok | $1.24 | T:2/4 A:3 | Build│
│  Tab: mode  esc: interrupt  Ctrl+X: leader  Ctrl+P: commands   │
└────────────────────────────────────────────────────────────────┘
```

### 1-1. Layout Areas

| Area | Position | Content |
|------|----------|---------|
| **Chat Area** | Left, scrollable | PM 대화, 에이전트 실행 로그, 도구 호출/diff |
| **Sidebar** | Right, fixed | Project info, Agents, Tasks, Pipeline, Cost |
| **Input Bar** | Bottom-left | 텍스트 입력, @/파일, /커맨드 |
| **StatusBar** | Bottom, full-width fixed | 메트릭 + 키바인드 힌트 (2줄) |

### 1-2. Sidebar Sections

```
Project                          ← 현재 프로젝트 정보
  결제 리팩토링                    이름
  /home/dev/payments              경로
  main branch                    git 브랜치

Agents                           ← 실시간 에이전트 상태
  ● PM (idle)                     ● = active, ○ = idle
  ● Backend Sr (running)          상태: idle/running/break
  ● Frontend Sr (idle)
  ○ QA (idle)

Tasks                            ← 태스크 진행 상황
  [✓] T-1 토스 SDK                ✓ = done
  [→] T-2 웹훅 전환               → = in_progress
  [ ] T-3 UI 수정                  = planned
  [!] T-4 에러 핸들링              ! = failed

Pipeline                         ← 킥오프 파이프라인 단계
  Meeting ✓
  Planning ✓
  Assigning ✓
 ►Executing                      ► = current stage
  Review

Cost                             ← 실시간 비용
  82k tokens  $1.24
```

### 1-3. StatusBar (하단 고정, 2줄)

```
[AgentDesk] | 결제 | 14m | 82k tok | $1.24 | T:2/4 A:3 | Build
Tab: mode  esc: interrupt  Ctrl+X: leader  Ctrl+P: commands
```

| 항목 | 소스 | 업데이트 |
|------|------|---------|
| 프로젝트명 | 세션 상태 | 전환 시 |
| 세션 시간 | 로컬 타이머 | 1분마다 |
| 토큰 | `GET /api/agent-usage` | 태스크 완료 시 |
| 비용 | `GET /api/agent-usage` | 태스크 완료 시 |
| T:활성/전체 | WebSocket task_update | 실시간 |
| A:에이전트 수 | WebSocket agent_status | 실시간 |
| 모드 | 로컬 상태 | Tab/커맨드 시 |

---

## 2. User Journey

### 2-1. First Time (설치 직후)

```
$ pnpm cli

  AgentDesk
  Multi-LLM Orchestrator for Software Development

  Language / 언어 선택:
  > English
    한국어

  [Enter]

  Quick Reference:
  ───────────────────────────────────────────────────
  자연어로 입력    "결제 시스템을 토스로 전환해줘"
  슬래시 커맨드    /connect  /agent  /status  /help
  모드 전환        Tab (Plan ↔ Build)
  파일 참조        @src/payments/toss.ts
  리더 키          Ctrl+X → 2초 내 두 번째 키
  종료             Ctrl+C
  ───────────────────────────────────────────────────

  프로바이더가 없습니다. /connect 로 LLM을 연결하세요.

  > /connect
```

### 2-2. Provider Setup (/connect)

```
> /connect

  LLM 프로바이더 선택:                    (우선순위 순)
  > Anthropic (Claude)                   ← 추천
    OpenAI (GPT)
    Google (Gemini)
    Ollama (Local — auto-detect)
    OpenRouter
    Together
    Groq
    Cerebras
    Custom

  [Enter]

  ? API Key: sk-ant-api03-xxxxx
  Testing connection...
  ✓ Anthropic connected. 42 models available.

  추가 프로바이더를 연결하려면 /connect 를 다시 실행하세요.
```

### 2-3. Agent Creation (/agent create)

```
> /agent create

  ? Name: Backend Senior
  ? Role:
  > Senior
    Junior
    PM (team_leader)
  ? Specialty:
  > Development
    Design
    QA/QC
    Planning
    DevSecOps
    Operations
  ? Provider:
  > Anthropic (42 models)
  ? Model:
  > claude-sonnet-4-20250514

  ✓ Agent "Backend Senior" created. (senior, dev, claude-sonnet-4-20250514)
```

### 2-4. Quick Team Setup (/setup quick)

```
> /setup quick

  ? Provider to use:
  > Anthropic (claude-sonnet-4-20250514)

  Creating dev team...
    ✓ PM           (team_leader, planning)
    ✓ Backend Sr   (senior, dev)
    ✓ Frontend Sr  (senior, dev)
    ✓ QA           (junior, qa)

  4 agents ready. Type a goal to start your first project.
```

### 2-5. Project Kickoff (자연어)

```
> 결제 시스템을 토스페이먼츠로 전환해줘

  PM: 프로젝트를 생성합니다.
      Name: 결제 리팩토링
      Path: /home/dev/payments
      Goal: Stripe → 토스페이먼츠 전환

      [Enter: 확인] [e: 수정] [Esc: 취소]
```

### 2-6. Execution Monitoring

```
  PM: 킥오프 회의를 시작합니다...

  ▸ Meeting
    backend-sr: "Stripe 웹훅 구조 파악 완료"
    frontend-sr: "결제 UI 3개 수정 필요"

  ▸ Tasks Created
    T-1  토스 SDK 연동     → backend-sr  (0.94)
    T-2  웹훅 전환         → backend-sr  (0.88)
    T-3  결제 UI 수정      → frontend-sr (0.91)

  ▸ Execution Started

  [backend-sr] T-1: 토스 SDK 연동
    ▸ Edit  src/payments/toss.ts (new, 142 lines)
    ▸ Edit  src/payments/webhook.ts (L42-78)
    ▸ Run   pnpm test -- payments → 12 passed
    ▸ Done  2m 34s

  PM: T-1 Review → APPROVE ✓
  PM: Starting T-2 → backend-sr
```

### 2-7. PM Decision

```
  PM: T-2 Review 대기 중. /approve 또는 /revise <피드백>

> /approve

  PM: T-2 Review → APPROVE ✓
  PM: Starting T-3 → frontend-sr
```

### 2-8. Session Fork

```
> /fork

  Session forked at current point.
  Original: session-abc (14 messages)
  Fork:     session-def (14 messages, diverges here)

  Now in forked session. Original preserved.
```

---

## 3. Commands — Complete Reference

### 3-1. Setup & Connection

| Command | Description |
|---------|-------------|
| `/connect` | LLM 프로바이더 추가 (인터랙티브, 우선순위 정렬) |
| `/connect test <id>` | 프로바이더 연결 테스트 |
| `/providers` | 프로바이더 목록 |
| `/models` | 사용 가능 모델 목록 |
| `/setup quick` | 기본 dev 팀 자동 생성 |
| `/setup` | 설정 안내 |

### 3-2. Agent Management

| Command | Description |
|---------|-------------|
| `/agent create` | 에이전트 생성 (인터랙티브) |
| `/agent list` or `/agents` | 에이전트 목록 |
| `/agent edit <name/id>` | 에이전트 수정 |
| `/agent delete <name/id>` | 에이전트 삭제 |
| `/agent assign <name> <model>` | 모델 할당 |

### 3-3. Project & Execution

| Command | Description |
|---------|-------------|
| 자연어 입력 | 킥오프 또는 태스크 추가 (Intent API) |
| `/status` | 프로젝트/태스크/에이전트 요약 |
| `/tasks` | 태스크 목록 |
| `/projects` | 프로젝트 목록 |
| `/projects <id>` | 프로젝트 전환 |
| `/logs [task-id]` | 실시간 로그 스트리밍 |

### 3-4. Session Management

| Command | Description |
|---------|-------------|
| `/new` | 새 세션 생성 |
| `/sessions` | 세션 목록 |
| `/fork` | 현재 지점에서 세션 분기 |
| `/resume <id>` | 이전 세션 이어하기 |

### 3-5. PM Decisions

| Command | Description |
|---------|-------------|
| `/inbox` | 대기 중인 결정 목록 |
| `/approve [task-id]` | 현재/지정 태스크 승인 |
| `/revise [task-id] <피드백>` | 수정 요청 |

### 3-6. Library

| Command | Description |
|---------|-------------|
| `/skills` | 스킬 목록 |
| `/skills add <name> <content>` | 스킬 추가 |
| `/skills delete <name>` | 스킬 삭제 |
| `/rules` | 규칙 목록 |
| `/rules add <content>` | 규칙 추가 |
| `/rules delete <id>` | 규칙 삭제 |
| `/memory` | 메모리 목록 |
| `/memory add <content>` | 메모리 추가 |
| `/memory delete <id>` | 메모리 삭제 |
| `/hooks` | 훅 목록 |
| `/hooks add <event> <action>` | 훅 추가 |
| `/hooks delete <id>` | 훅 삭제 |

### 3-7. Monitoring

| Command | Description |
|---------|-------------|
| `/cost` | 프로젝트별/에이전트별 비용 상세 |
| `/usage` | 토큰 사용량 상세 |
| `/usage daily` | 일별 추이 |

### 3-8. System

| Command | Description |
|---------|-------------|
| `/help` | 전체 커맨드 도움말 |
| `/lang` | 언어 재선택 |
| `/open` | GUI 브라우저 열기 |
| `/details` | 도구 호출 상세 토글 |
| `/plan` | Plan 모드 |
| `/build` | Build 모드 |
| `/yolo` | YOLO 모드 |
| `/quit` | 종료 |

---

## 4. Keyboard Shortcuts

### 4-1. Direct Keys

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Tab` | Cycle mode (Plan → Build → Plan) |
| `Esc` | Interrupt / Cancel |
| `@` | File fuzzy search |
| `/` | Command autocomplete |
| `Ctrl+C` | Exit |
| `Ctrl+L` | Clear screen |
| `Ctrl+U` | Clear input |
| `Up/Down` | Scroll conversation |
| `Ctrl+P` | Command palette |

### 4-2. Leader Key (Ctrl+X → 2s timeout)

| Sequence | Action |
|----------|--------|
| `Ctrl+X` `s` | /status |
| `Ctrl+X` `t` | /tasks |
| `Ctrl+X` `a` | /agents |
| `Ctrl+X` `n` | /new session |
| `Ctrl+X` `f` | /fork session |
| `Ctrl+X` `d` | /details toggle |
| `Ctrl+X` `p` | /providers |
| `Ctrl+X` `m` | /models |
| `Ctrl+X` `c` | /cost |
| `Ctrl+X` `q` | /quit |
| `Ctrl+X` `h` | /help |
| `Ctrl+X` `Right` | Next agent session |
| `Ctrl+X` `Left` | Prev agent session |

Leader key 입력 후 2초 이내에 두 번째 키를 누르지 않으면 취소.

---

## 5. Modes

### Plan Mode
- PM이 계획만 (태스크 생성 + 배정 미리보기)
- 실행 없음
- "실행할까요?" 확인 후 Build로 전환

### Build Mode
- PM이 계획 → 배정 → 실행까지 자동
- 에이전트 출력 실시간 스트리밍

### YOLO Mode
- Build + PM 리뷰 자동 결정
- 사용자 확인 없음 (완전 자율)

### Switching
- `Tab` — Plan ↔ Build 순환
- `/plan`, `/build`, `/yolo` — 직접 지정

---

## 6. Message Display

### Sender Colors
```
You              cyan
PM               magenta
Agent: <name>    yellow
System           dim/gray
```

### Tool Calls (collapse/expand via /details)
```
▸ Edit  src/foo.ts (L10-25, +8 -3)     ← collapsed (default)
▾ Edit  src/foo.ts                       ← expanded
  @@ -10,3 +10,8 @@
  - old line
  + new line
```

### Command Execution
```
▸ Run  pnpm test → 12 passed            ← success (green)
▸ Run  pnpm test → 2 failed             ← failure (red)
```

### Background Task Notification
```
┌─────────────────────────────────────────────┐
│  Background Task Completed                  │
│  Task "Find type safety issues" in 27s.     │
└─────────────────────────────────────────────┘
```

---

## 7. Patterns from OpenCode

### 7-1. 16ms Event Batching

WebSocket 이벤트를 16ms(~60fps) 단위로 배치하여 렌더링 성능 최적화.

```typescript
// 이벤트 큐에 쌓고, 16ms마다 flush
let eventQueue: WsEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function queueEvent(event: WsEvent) {
  eventQueue.push(event);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      const batch = eventQueue;
      eventQueue = [];
      flushTimer = null;
      // batch 단위로 state 업데이트 → 1번만 re-render
      processBatch(batch);
    }, 16);
  }
}
```

### 7-2. Provider Dialog (Auto-show on Zero)

프로바이더가 0개면 자동으로 `/connect` 다이얼로그 표시.
우선순위 정렬: Anthropic > OpenAI > Google > Ollama > 나머지.

### 7-3. Leader Key System

```
Ctrl+X 입력 → leaderMode = true → 2초 타이머 시작
  → 2초 내 두 번째 키 → 액션 실행 → leaderMode = false
  → 2초 경과 → leaderMode = false (취소)

StatusBar에 leader mode 표시:
  [Ctrl+X ...] waiting for key
```

### 7-4. Session Fork

대화의 특정 지점에서 분기. 원본 세션은 보존.

```
POST /api/tui/sessions/:id/fork
Body: { message_id?: string }  // 분기 지점 (없으면 현재)
Response: { ok: true, id: "new-session-id" }
```

서버에서 메시지를 deep-copy하고 새 세션 ID 발급.

---

## 8. Error Handling

### Server not running
```
$ pnpm cli
  ERROR: AgentDesk server is not running.
  Start it with: pnpm dev
```

### No providers
```
  프로바이더가 없습니다. /connect 로 LLM을 연결하세요.
  (자동으로 /connect 다이얼로그 표시)
```

### No agents
```
  에이전트가 없습니다. /setup quick 또는 /agent create
```

### API key invalid
```
> /connect
  ? API Key: sk-wrong-key
  Testing... ✗ 401 Unauthorized. 키를 확인하세요.
```

### Task execution failure
```
  [backend-sr] T-1 Failed (3 retries exhausted)
    ▸ Error: TypeError: Cannot read property 'amount'
  PM: T-1 FAILED. /revise 또는 PM이 자동 재배정.
```

---

## 9. Getting Started

### Prerequisites
- Server running: `pnpm dev`

### Launch
```bash
pnpm cli                    # TUI (interactive)
pnpm cli status             # CLI (quick command)
```

### First-time Flow
```
pnpm cli
  → 언어 선택
  → /connect (프로바이더 추가)
  → /setup quick (팀 생성) 또는 /agent create (수동)
  → 자연어로 프로젝트 시작
```

### CLI Quick Commands
```bash
pnpm cli status
pnpm cli agents
pnpm cli tasks
pnpm cli kickoff -n "Name" -g "Goal" --yolo
pnpm cli logs -f --project <id>
pnpm cli add-tasks --project <id> -d "Add tests"
pnpm cli open
```

---

## 10. Tech Stack

| Component | Choice |
|-----------|--------|
| TUI Framework | ink (React for CLI) |
| Input | ink-text-input |
| WebSocket | ws (16ms event batching) |
| API | fetch (cli/lib/api.ts) |
| Intent | Server LLM (callLlmOneShotAuto) |
| Settings | ~/.agentdesk/cli-settings.json |

### File Structure
```
cli/
├── index.ts                     ← Entry (TUI if no args, CLI if args)
├── lib/
│   ├── api.ts                    ← REST client (session auth)
│   ├── ws.ts                     ← WebSocket client (16ms batching)
│   ├── config.ts                 ← Server URL
│   ├── ui.ts                     ← Terminal formatting
│   ├── validate.ts               ← UUID validation
│   └── settings.ts               ← ~/.agentdesk/cli-settings.json
├── commands/                     ← CLI mode (commander)
│   ├── status.ts, tasks.ts, agents.ts
│   ├── kickoff.ts, logs.ts, add-tasks.ts
└── tui/                          ← TUI mode (ink)
    ├── index.tsx                  ← ink render + waitUntilExit
    ├── App.tsx                    ← Root (messages, mode, session, sidebar)
    ├── commands.ts                ← Slash command router (40+ commands)
    ├── leader-keys.ts             ← Leader key system (Ctrl+X → action)
    ├── welcome-messages.ts        ← Language-specific cheat sheet
    ├── components/
    │   ├── ChatArea.tsx            ← Conversation (left panel, scrollable)
    │   ├── Sidebar.tsx             ← Right panel (Project, Agents, Tasks, Pipeline, Cost)
    │   ├── Message.tsx             ← Role-colored messages
    │   ├── InputBar.tsx            ← Text input + @ + / triggers
    │   ├── StatusBar.tsx           ← Bottom metrics bar (fixed, 2 lines)
    │   ├── CommandPalette.tsx      ← / autocomplete overlay
    │   ├── FileSearch.tsx          ← @ file search overlay
    │   ├── ToolCall.tsx            ← Tool call collapse/expand
    │   ├── FileDiff.tsx            ← File diff display
    │   ├── ProviderDialog.tsx      ← /connect interactive setup
    │   ├── AgentDialog.tsx         ← /agent create interactive setup
    │   └── WelcomeScreen.tsx       ← Language selector
    └── hooks/
        ├── useSession.ts           ← Session + project + agents
        ├── useWebSocket.ts         ← WS events → messages (16ms batch)
        ├── useInterpret.ts         ← Natural language → intent
        ├── useSidebar.ts           ← Sidebar state (agents, tasks, pipeline)
        └── useLeaderKey.ts         ← Ctrl+X leader key system
```

---

## 11. Implementation Status — All Complete

- Core TUI (ChatArea, Message, InputBar, CommandPalette)
- Sidebar (Project, Agents, Tasks, Pipeline, Cost)
- StatusBar metrics bar (2-line, bottom-fixed, real-time)
- 40+ slash commands (setup, agents, project, PM, library, monitoring, session, system)
- Plan/Build/YOLO mode toggle (Tab + /plan /build /yolo)
- @ file search, tool call collapse/expand, file diff
- /connect, /providers, /models (provider setup)
- /agent create/list/delete/assign (agent management)
- /inbox, /approve, /revise (PM decisions)
- /skills, /rules, /memory, /hooks (library CRUD)
- /cost, /usage (monitoring)
- /new, /sessions, /fork, /resume (session management)
- Welcome screen + language selector + cheat sheet
- Leader key system (Ctrl+X → 2s timeout, 11 bindings)
- 16ms WebSocket event batching
- Server: Session API, Intent API, WebSocket session subscription
- CLI build script (esbuild)
- Code review fixes (CRITICAL + HIGH issues resolved)
