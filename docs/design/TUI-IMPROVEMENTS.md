# TUI Improvements — UX & Conversational Flow

> 작성일: 2026-03-29
> 대상: 개발자 인터페이스 (TUI / `pnpm cli`)
> 목적: 현황 분석 + 개선 설계. 구현 전 기준 문서.

---

## 1. 현황 — 코드 vs 설계 괴리

`TUI-DESIGN.md §11`은 "All Complete"라고 표시되어 있지만 실제 코드 기준으로 미구현·버그 항목이 있다.

| 설계 항목 | 실제 코드 상태 |
|-----------|--------------|
| `Up/Down` 스크롤 | `Ctrl+X u/d` 리더키로만 작동 — 방향키 미연결 |
| Plan 모드 확인 게이트 | `confirmation` 필드 prompt에 있지만 App.tsx에서 처리 안 함 (dead code) |
| 킥오프 전 PM 확인 UI (`[Enter: 확인] [e: 수정]`) | 미구현 — 즉시 실행 |
| 스피너 / 진행 표시 | 없음 |
| 입력 히스토리 (`↑`) | 없음 |
| `unknown` intent → PM 처리 | response 텍스트만 출력, 실제 PM 연동 없음 |
| 대화 컨텍스트 | interpret() 매 호출 stateless |

---

## 2. UX/UI 문제 분석 — 개발자 관점

### 2-1. 사이드바 정보 절사 (P0)

현재 `width=28`. 개발자가 가장 자주 보는 정보가 전부 `~`으로 끝남.

```
현재 (width=28):         목표 (width=36):
backend-senio~           backend-senior
  claude-sonnet-4~         claude-sonnet-4-6
[ ] Stripe SDK 연동~     [ ] Stripe SDK 연동 (Toss)
```

**근본 원인:** `name.length > 14 ? slice(0,13)+"~"` 하드코딩.
터미널 80컬럼 기준 28은 너무 좁음. 최소 34-36이어야 함.

### 2-2. 실행 중 피드백 없음 (P0)

PM이 LLM을 호출하거나 에이전트가 작업 중일 때 화면에 아무 변화 없음.
서버가 죽은 건지, 처리 중인지 구분 불가.

```
현재: 입력 후 → (침묵) → 결과 도착
목표: 입력 후 → ⠋ PM 처리 중... → 결과 도착
```

Claude Code는 항상 `⠋ Thinking...` 스피너를 보여줌.

### 2-3. 메시지 시각 구분 없음 (P1)

모든 메시지가 동일한 구조: `이름(bold) + 내용(plain)`.
대화(PM 지시)와 실행 로그(에이전트 툴 호출)가 섞이면 맥락 파악이 어려움.

```
현재 — 모두 동일한 패턴:
  You          ← cyan bold
  메시지 내용

  PM           ← magenta bold
  PM 응답

  Agent: backend-sr  ← yellow bold
  에이전트 실행 로그 (툴콜, 파일 수정 등)

목표 — 시각 분리:
  You  >  메시지 내용          ← 인라인, cyan

  PM   메시지 내용             ← magenta, 좌측 여백

  ┌ backend-sr ──────────────┐  ← 실행 블록 (dimColor 박스)
  │ ▸ Edit src/payments.ts   │
  │ ▸ Run pnpm test → passed │
  └──────────────────────────┘
```

### 2-4. 스크롤 키 비직관적 (P1)

`Ctrl+X u/d` — 리더키 두 번 조합. 스크롤은 가장 자주 쓰는 동작인데 가장 불편한 키.
설계 문서(`TUI-DESIGN.md §4-1`)에는 `Up/Down: Scroll conversation`이라고 명시되어 있으나 미구현.

**목표:** `↑/↓` 직접 바인딩. 단, 입력 중이 아닐 때만.

### 2-5. 입력 히스토리 없음 (P2)

`↑` 키로 이전 명령 불러오기 없음. `/kickoff --name "X" --goal "Y"` 를 다시 치려면 전부 재입력.
Shell의 가장 기본적인 UX.

**목표:** 최근 50개 입력 기억. `↑/↓`로 탐색. 세션 간에는 유지 불필요.

### 2-6. StatusBar 힌트 줄 상시 노출 (P2)

```
Tab: mode  esc: interrupt  Ctrl+X: leader  Ctrl+P: commands
```

처음엔 유용하지만 익숙해지면 화면 낭비. 1줄을 항상 차지.

**목표:**
- 기본: 숨김 (StatusBar 1줄만)
- `?` 키 → 힌트 표시 토글
- `leaderMode` 활성 시 → 자동 표시 (기존 동작 유지)

---

## 3. 대화 흐름 문제 분석

### 3-1. Stateless Interpret (핵심 문제)

```
현재:
  interpret(text, sessionId, projectId)
  → 매 호출 독립적 → LLM이 이전 맥락 모름

문제:
  유저: "Stripe 결제 붙여줘"
  PM:   "프로젝트 경로를 알려주세요."
  유저: "/home/dev/payments"
  PM:   (이전 대화 모름) → "무엇을 도와드릴까요?"  ← 엉뚱한 응답
```

### 3-2. PM 대화 불가 (핵심 문제)

PM이 먼저 질문을 할 수 없음. 항상 유저 입력 → 즉시 API 호출.
Claude Code처럼 "몇 가지 확인하겠습니다" 식의 플로우가 없음.

```
현재: 입력 → intent 분류 → 즉시 kickoff/add-tasks 실행

목표 (Plan 모드):
  유저: "Stripe 붙여줘"
  PM:   "기존 프로젝트에 추가인가요, 새 프로젝트인가요?"
  유저: "기존 프로젝트"
  PM:   "다음 작업을 추가합니다:
         - T-1: Stripe SDK (backend-sr)
         - T-2: 웹훅 핸들러 (backend-sr)
         시작할까요? [y/n]"
  유저: "y" → add-tasks 실행
```

### 3-3. Confirmation Gate 미구현

`tui-intent.md`의 `confirmation` 필드는 있지만 App.tsx에서 완전히 무시됨.
Plan 모드에서도 바로 실행.

### 3-4. 작업 디렉토리 미전달

현재 `process.cwd()`를 서버에 전달하지 않음.
프로젝트 생성 시 경로를 항상 수동 입력해야 함.

---

## 4. 개선 설계

### 4-1. 사이드바 너비 확대

```
변경: width 28 → 36
이름 절사: 13자 → 20자
태스크 절사: 19자 → 28자
모델명 절사: 14자 → 20자
```

파일: `cli/tui/components/Sidebar.tsx`

### 4-2. 실행 스피너

App.tsx에 `isProcessing: boolean` state 추가.
`handleSend` 시작 시 true → 완료/에러 시 false.

```
ChatArea 최하단:
  ⠋ PM 처리 중...       ← isProcessing && !isScrolled

스피너 문자 순환: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏ (80ms 간격)
ink의 setInterval로 구현
```

파일: `cli/tui/App.tsx`, `cli/tui/components/ChatArea.tsx`

### 4-3. 방향키 스크롤

```typescript
// App.tsx useInput
useInput((_input, key) => {
  if (!isInputFocused) {  // 입력 중이 아닐 때만
    if (key.upArrow) setScrollOffset(prev => Math.min(prev + 5, messages.length));
    if (key.downArrow) setScrollOffset(prev => Math.max(0, prev - 5));
  }
  if (key.tab) { ... }
});
```

파일: `cli/tui/App.tsx`

### 4-4. 입력 히스토리

```typescript
// InputBar.tsx
const [history, setHistory] = useState<string[]>([]);
const [historyIdx, setHistoryIdx] = useState(-1);

// onSubmit: history에 추가, historyIdx 리셋
// upArrow: historyIdx++, setValue(history[historyIdx])
// downArrow: historyIdx--, setValue(history[historyIdx] || "")
```

파일: `cli/tui/components/InputBar.tsx`

### 4-5. StatusBar 힌트 토글

```typescript
// App.tsx
const [showHints, setShowHints] = useState(false);

// '?' 키 → setShowHints(prev => !prev)

// StatusBar props에 showHints 추가
// leaderMode || showHints 일 때 힌트 줄 표시
```

파일: `cli/tui/App.tsx`, `cli/tui/components/StatusBar.tsx`

### 4-6. 대화 컨텍스트 (Conversational Context)

```typescript
// useInterpret.ts
export async function interpret(
  text: string,
  sessionId: string,
  projectId?: string | null,
  recentMessages?: Array<{ role: string; content: string }>,  // 추가
  cwd?: string,                                               // 추가
): Promise<InterpretResult>

// API payload
{
  text,
  session_id: sessionId,
  project_id: projectId,
  recent_messages: recentMessages?.slice(-12),  // 최근 12개
  cwd,
}
```

서버 `interpret.ts`:
- `recent_messages` 수신 → tui-intent.md에 `## Recent Conversation` 섹션으로 삽입
- `cwd` 수신 → kickoff intent 시 `project_path` 기본값으로 사용

파일: `cli/tui/hooks/useInterpret.ts`, `server/modules/routes/ops/tui/interpret.ts`

### 4-7. PM 대화 모드 + Confirmation Gate

#### 4-7-1. tui-intent.md 변경

```markdown
## Intent Categories

기존 intents 유지 + 신규:

8. **pm_chat** — PM이 추가 정보를 묻거나 계획을 공유할 때
   Extract: { message: string, needs_confirmation: boolean }
   Use when: 실행 전 정보가 부족하거나 Plan 모드에서 확인 필요
   Examples:
     - 유저 입력 부족 시 → PM이 질문
     - Plan 모드 + kickoff/add_tasks → 계획 공유 후 y/n 확인

## Mode Behavior
- YOLO/Build: intent 즉시 실행. pm_chat은 꼭 필요한 경우만.
- Plan: 실행 전 pm_chat으로 계획 공유. confirmation 반드시 포함.
```

#### 4-7-2. App.tsx pendingAction

```typescript
interface PendingAction {
  type: "kickoff" | "add_tasks";
  params: Record<string, unknown>;
  description: string;  // PM이 설명한 계획 텍스트
}

const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

// pm_chat intent 처리
case "pm_chat": {
  const msg = result.params["message"] as string;
  const needsConfirm = result.params["needs_confirmation"] as boolean;
  addMessage({ role: "pm", content: msg, ... });

  if (needsConfirm && result.params["pending_action"]) {
    setPendingAction(result.params["pending_action"] as PendingAction);
  }
  break;
}
```

#### 4-7-3. InputBar y/n 프롬프트

```typescript
// InputBar.tsx — pendingAction prop 추가
interface Props {
  onSend: (text: string) => void;
  mode: "plan" | "build" | "yolo";
  projectId?: string | null;
  pendingAction?: PendingAction | null;      // 추가
  onConfirm?: (confirmed: boolean) => void; // 추가
}

// pendingAction이 있으면:
<Box borderStyle="single" borderTop paddingX={1}>
  <Text color="yellow">  Proceed? </Text>
  <Text color="green">[y]</Text>
  <Text dimColor> / </Text>
  <Text color="red">[n]</Text>
</Box>

// 'y' 또는 'n' 단일 키 입력 처리 (Enter 불필요)
```

---

## 5. 모드별 동작 정의 (최종)

| 모드 | Interpret 동작 | 확인 게이트 | 스피너 |
|------|---------------|------------|--------|
| **YOLO** | 즉시 실행 | 없음 | 있음 |
| **Build** | 즉시 실행, 정보 부족 시 pm_chat 1회 | 없음 | 있음 |
| **Plan** | pm_chat으로 계획 공유 → y/n 확인 후 실행 | 있음 | 있음 |

---

## 6. 구현 파일 범위

| 파일 | 변경 | 우선순위 |
|------|------|---------|
| `cli/tui/components/Sidebar.tsx` | width 36, 절사 기준 완화 | P0 |
| `cli/tui/App.tsx` | isProcessing, pendingAction, 방향키, showHints | P0-P1 |
| `cli/tui/components/ChatArea.tsx` | 스피너 표시 | P0 |
| `cli/tui/components/InputBar.tsx` | 히스토리, y/n 프롬프트 | P1-P2 |
| `cli/tui/components/StatusBar.tsx` | showHints prop | P2 |
| `cli/tui/hooks/useInterpret.ts` | recentMessages, cwd 전달 | P1 |
| `server/modules/routes/ops/tui/interpret.ts` | recent_messages, cwd 수신 | P1 |
| `prompts/system/tui-intent.md` | pm_chat intent, 대화 컨텍스트 섹션 | P1 |

---

## 7. 구현 순서 권장

```
Phase 1 — 즉각적 체감 개선 (UX)
  1. Sidebar width 36 + 절사 완화
  2. 스피너 (isProcessing)
  3. 방향키 스크롤

Phase 2 — 대화형 흐름 (Conversational)
  4. 대화 컨텍스트 (recentMessages + cwd)
  5. pm_chat intent + tui-intent.md 개선
  6. Confirmation gate (pendingAction + y/n UI)

Phase 3 — Polish
  7. 입력 히스토리
  8. StatusBar 힌트 토글
```
