# CLI 실행 흐름 — 오케스트레이션 → 프로세스 스폰 → 출력 스트리밍

> Last updated: 2026-03-29
> Purpose: 오케스트레이션 창에서 에이전트가 태스크를 실행할 때 CLI 도구가 어떻게 호출되는지 전체 흐름 문서화.

---

## 1. 전체 흐름

```
[킥오프 또는 태스크 시작]
        │
        ▼
startTaskExecutionForAgent(taskId, agentId)          ← execution-start-task.ts
        │
        ├── resolveProviderForAgent(agent)            ← 에이전트 provider 결정
        │       ├── mode: "cli"     → spawnCliAgent()
        │       ├── mode: "api"     → launchApiProviderAgent()
        │       └── mode: "oauth"   → launchHttpAgent()
        │
        ▼  (mode === "cli")
buildAgentArgs(provider, model, reasoningLevel)      ← cli-tools.ts
        │   → 프로바이더별 실행 인수 배열 생성
        │
        ▼
spawnCliAgent(taskId, provider, prompt, projectPath) ← cli-runtime.ts
        │
        ├── spawn(args[0], args.slice(1), { cwd: projectPath, stdio: "pipe" })
        ├── child.stdin.write(prompt) → child.stdin.end()
        ├── stdout listener → broadcast("cli_output", { task_id, data })
        └── stderr listener → broadcast("cli_output", { task_id, stream: "stderr", data })
                │
                ▼
        WebSocket → 프론트엔드 cli_output 이벤트 → CliWindow 실시간 표시
```

---

## 2. 핵심 파일

| 역할 | 파일 |
|------|------|
| 실행 진입점 (오케스트레이션) | `server/modules/workflow/orchestration/execution-start-task.ts` |
| CLI 인수 빌더 | `server/modules/workflow/core/cli-tools.ts` · `buildAgentArgs()` |
| 프로세스 스폰 & 스트리밍 | `server/modules/workflow/agents/cli-runtime.ts` · `spawnCliAgent()` |
| 수동 스폰 엔드포인트 | `server/modules/routes/core/agents/spawn.ts` · `POST /api/agents/:id/spawn` |
| Provider 결정 | `server/modules/agent-runtime/llm-client.ts` · `resolveProviderForAgent()` |

---

## 3. 프로바이더별 실행 명령

`buildAgentArgs(provider, model?, reasoningLevel?)` 가 반환하는 실제 인수:

### Claude Code (`claude`)
```bash
claude \
  --dangerously-skip-permissions \
  --print \
  --verbose \
  --output-format=stream-json \
  --include-partial-messages \
  --max-turns 200 \
  [--model <model>]
```

### Codex (`codex`)
```bash
codex \
  --enable multi_agent \
  [-m <model>] \
  [-c model_reasoning_effort="<level>"] \
  --yolo \
  exec --json
```

### Gemini CLI (`gemini`)
```bash
gemini \
  [-m <model>] \
  --yolo \
  --output-format=stream-json
```

### OpenCode (`opencode`)
```bash
opencode run \
  [-m <model>] \
  --format json
```

### Cursor (`agent`)
```bash
agent \
  --print \
  --output-format=stream-json \
  --force \
  [--model <model>]
```

> **copilot / antigravity** 는 CLI 스폰 방식이 아닌 HTTP agent (`launchHttpAgent`) 방식 사용. `buildAgentArgs()`에서 예외 발생.

---

## 4. 프로세스 스폰 상세 (`spawnCliAgent`)

### 4-1. spawn 옵션

```typescript
const child = spawn(args[0], args.slice(1), {
  cwd: projectPath,          // 태스크의 프로젝트 경로 (또는 worktree 경로)
  env: cleanEnv,             // 수정된 환경변수 (CI=1, NO_COLOR=1, PATH 보강 등)
  shell: process.platform === "win32",  // Windows에서만 shell: true
  stdio: ["pipe", "pipe", "pipe"],      // stdin/stdout/stderr 모두 파이프
  detached: process.platform !== "win32",
  windowsHide: true,
});
```

### 4-2. 프롬프트 전달 방식

프롬프트는 **stdin** 으로 전달 (파일 경로 인자 아님):
```typescript
child.stdin?.write(prompt);
child.stdin?.end();
```

프롬프트 내용 구성:
- 에이전트 페르소나 / 역할 정보
- 사용 가능한 Skills 블록
- 태스크 제목 + 설명
- Workflow pack 가이드
- 최근 변경 사항 / 대화 컨텍스트
- 부서 프롬프트
- Rules & Memory 블록

### 4-3. PATH 보강

CLI binary가 PATH에 없을 경우를 대비해 환경변수에 폴백 경로를 추가함:

```
Windows:  %ProgramFiles%\nodejs, %LOCALAPPDATA%\Programs\nodejs, %APPDATA%\npm
Mac/Linux: /opt/homebrew/bin, /usr/local/bin, ~/.local/bin 등
```

---

## 5. 출력 스트리밍 → WebSocket → 프론트엔드

### 5-1. stdout 리스너

```typescript
child.stdout.on("data", (chunk: Buffer) => {
  const text = normalizeStreamChunk(chunk, { dropCliNoise: true });
  // ANSI 이스케이프 제거, 스피너 라인 필터링, 중복 제거
  broadcast("cli_output", { task_id: taskId, stream: "stdout", data: text });
});
```

- Codex는 JSON 라인 단위 버퍼링 후 파싱해서 broadcast
- 중복 제거: `cliOutputDedupWindowMs` 윈도우 내 동일 텍스트 skip

### 5-2. stderr 리스너

```typescript
child.stderr.on("data", (chunk) => {
  broadcast("cli_output", { task_id: taskId, stream: "stderr", data: text });
});
```

### 5-3. 프론트엔드 수신

```
WebSocket "cli_output" 이벤트
    │
    ▼
useRealtimeSync.ts  →  cli_output 핸들러
    │  (구독된 taskId 필터링)
    ▼
CliWindow / LogsTab  →  실시간 스트림 표시
```

> `cli_output` 은 **구독 기반 전송** — 클라이언트가 `subscribe_task` 메시지를 보낸 taskId에만 전달됨. 다른 이벤트(`task_update`, `kickoff_stage` 등)는 전체 브로드캐스트.

---

## 6. 프로세스 수명 관리

### 타임아웃

| 타임아웃 | 동작 |
|----------|------|
| **Idle timeout** | 일정 시간 출력 없으면 → `killPidTree()` 강제 종료 |
| **Hard timeout** | 최대 실행 시간 초과 → `killPidTree()` |

둘 다 `TASK_RUN_IDLE_TIMEOUT_MS`, `TASK_RUN_HARD_TIMEOUT_MS` 환경변수로 조정 가능.

### 프로세스 종료 시 (`close` 이벤트)

```typescript
child.on("close", (code) => {
  activeProcesses.delete(taskId);
  // Codex 잔여 버퍼 flush + broadcast
  // 임시 프롬프트 파일 삭제 (promptPath)
  // 태스크 상태 업데이트 (done / failed)
});
```

---

## 7. 오케스트레이션 창 연동

| 이벤트 | 발생 시점 | 프론트엔드 처리 |
|--------|-----------|----------------|
| `kickoff_stage` | meeting → planning → assigning → executing | `StageRail` 단계 표시 |
| `task_update` | 태스크 생성/상태변경 | `TimelineTab` 에 태스크 추가 |
| `cli_output` | stdout/stderr 스트림 | `LogsTab` 실시간 로그 |
| `agent_status` | 에이전트 상태 변경 (working 등) | `AgentsTab` 상태 업데이트 |
| `meeting_minutes_update` | 킥오프 회의 발언 | `RoomTab` 회의록 재조회 |
| `runtime_status` | 실행 시작/완료/오류 | CLI 창 자동 열기 |

---

## 8. 수동 스폰 엔드포인트

오케스트레이션 자동 실행 외에 직접 HTTP로 에이전트를 실행할 수 있음:

```
POST /api/agents/:id/spawn
Body: { task_id, prompt, model?, reasoningLevel? }

→ buildAgentArgs() → spawnCliAgent()
→ close 핸들러에서 태스크 완료 처리
```
