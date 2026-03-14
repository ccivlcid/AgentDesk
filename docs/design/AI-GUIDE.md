# AgentDesk — AI 개발자 디자인 가이드

> **목적:** AI 에이전트가 AgentDesk UI를 개발·개선할 때 반드시 따라야 할 디자인 원칙
> **참조:** `DESIGN.md` (CSS 변수 전체), `UI-SCREENS.md` (화면·모달 목록)
> **갱신일:** 2026-03-14 (문서 통합 업데이트)

---

## 0. 작업 시작 전 — 코드베이스 진입점 맵

### UI 구조 개요 — macOS 바탕화면 OS

AgentDesk는 **macOS 바탕화면 은유**로 설계된다. 사이드바가 없다.

```
메뉴바:  [AgentDesk] [▾ 프로젝트]          $2.14  🔔  14:32
바탕화면:
  [👤 에이전트설정] [📁 프로젝트생성] [▶ 태스크실행] [⚡ 워크플로] [📋 라이브러리] [💬 채팅]
  ← 데스크톱 아이콘 (클릭 → 해당 창 열림)

  ┌─ Agents 위젯 ─┐  ┌─ Tasks 위젯 ─┐  ← 사용자가 추가/배치/리사이즈
  └───────────────┘  └──────────────┘
  [+ 위젯 추가]

Dock:   [⚡ Workflow] [📚 Library] [⚙ Settings] [💬 Chat]
  ← 항상 고정, 클릭 → 앱 창 열림
```

### 새 위젯 추가

| 순서 | 파일 | 수정 내용 |
|---|---|---|
| 1 | `src/components/desktop/widgets/` | 위젯 컴포넌트 생성 |
| 2 | `src/components/desktop/WidgetPicker.tsx` | 위젯 목록에 추가 |
| 3 | `src/store/uiStore.ts` | `widgetLayout` 타입 업데이트 |

### 새 Dock 앱 창 추가

| 순서 | 파일 | 수정 내용 |
|---|---|---|
| 1 | `src/app/types.ts` | `WindowType` 유니온에 새 값 추가 |
| 2 | `src/store/uiStore.ts` | `openWindows` 토글 액션 업데이트 |
| 3 | `src/components/desktop/Dock.tsx` | 아이콘 추가 |
| 4 | `src/components/windows/` | 앱 창 컴포넌트 생성 |
| 5 | `src/components/desktop/Desktop.tsx` | 창 렌더링 블록 추가 |

### 주요 파일 역할 요약

```
src/
├── App.tsx                      ← 루트: 스토어 구독 + WebSocket + 이벤트 핸들러
├── app/
│   ├── types.ts                 ← WindowType: "workflow"|"library"|"settings"|"chat"|"agent-manager"
│   ├── AppOverlays.tsx          ← 36개 모달/패널 오버레이
│   └── useRealtimeSync.ts       ← WebSocket 이벤트 → 스토어 업데이트
├── components/
│   ├── desktop/
│   │   ├── Desktop.tsx          ← 바탕화면 루트
│   │   ├── MenuBar.tsx          ← 상단 메뉴바
│   │   ├── DesktopIcon.tsx      ← 데스크톱 아이콘
│   │   ├── Dock.tsx             ← 하단 Dock
│   │   ├── Widget.tsx           ← 위젯 컨테이너 (드래그/리사이즈)
│   │   └── widgets/             ← AgentsWidget, TasksWidget, AlertsWidget, CliCostWidget, FlowGraphWidget
│   └── windows/                 ← WorkflowWindow, LibraryWindow, SettingsWindow, ChatWindow, AgentManagerWindow
├── store/
│   ├── agentStore.ts            ← agents, departments, subAgents, selectedAgent
│   ├── taskStore.ts             ← tasks, subtasks, crossDeptDeliveries, meetingPresence
│   ├── projectStore.ts          ← projects, categories, currentProjectId, projectAgentIds
│   └── uiStore.ts               ← openWindows(Set), widgetLayout, desktopIconLayout, selectedAgentId, openTaskId
└── types/
    └── index.ts                 ← Agent, Task, SubAgent, MeetingPresence, CrossDeptDelivery 등
```

### 앱 내비게이션 구조 현황

```
[데스크톱 아이콘] 클릭
  👤 에이전트 설정  → AgentManagerWindow
  📁 프로젝트 생성  → ProjectCreateModal
  ▶  태스크 실행   → CreateTaskModal
  ⚡ 워크플로 빌더  → WorkflowWindow (Builder 탭)
  📋 라이브러리    → LibraryWindow (Skills 탭)
  💬 채팅         → ChatWindow

[Dock] 클릭
  ⚡ Workflow → WorkflowWindow (탭: Workflow Builder / Scheduled Tasks)
  📚 Library  → LibraryWindow  (탭: Skills / Agent Rules / Memory / Hooks / Deliverables)
  ⚙ Settings  → SettingsWindow (탭: General / API / OAuth / CLI / Gateway / Data / Project Types / Agents)
  💬 Chat     → ChatWindow     (탭: Direct / Group / Announcement)

[위젯] 드릴다운 (화면 이동 없음)
  Agents 위젯 에이전트 클릭 → AgentDetail 슬라이드 패널 (우측)
  Tasks 위젯 태스크 클릭    → TerminalPanel 드로어 (하단)
  Alerts 위젯 항목 클릭     → DecisionInboxModal
```

---

## 1. 핵심 디자인 컨셉 — macOS Hybrid

AgentDesk는 **"macOS 네이티브 앱 외관 + 터미널 CLI 내부"** 의 이중 레이어 구조다.

```
┌─ Chrome Layer (macOS 네이티브) ──────────────────────────┐
│  borderRadius: 10, backdropFilter: blur(12px)             │
│  macOS 트래픽 라이트 장식 (#ff5f57, #ffbd2e, #27c93f)    │
│                                                            │
│  ┌─ Content Layer (터미널 CLI) ──────────────────────┐   │
│  │  fontFamily: var(--th-font-mono) — 항상 모노      │   │
│  │  borderRadius: 0 — 버튼·인풋·토스트 전부           │   │
│  │  Sigil 언어: › · // $ [action] [STATUS]           │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 레이어별 규칙

| 요소 | Chrome (컨테이너) | Content (내부) |
|------|-----------------|----------------|
| border-radius | **10px** | **0** |
| font | var(--th-font-mono) | var(--th-font-mono) |
| 대상 | 패널, 모달, 카드, 사이드바 | 버튼, 인풋, 토스트, 배지 |
| 예외 | – | 아바타·상태 dot: **50%** |

---

## 2. 색상 — 절대 규칙

```
✅ 사용: var(--th-*) CSS 변수만
✅ 예외 허용: 트래픽 라이트 (#ff5f57, #ffbd2e, #27c93f)
✅ 예외 허용: 위험/성공 상태 hex (#f85149, #3fb950)
❌ 금지: 임의 hex, rgba 직접 사용 (--th-* 변수로 대체)
```

- **Brand color**: Amber `#f59e0b` (`--th-accent`) — active nav, primary CTA, live indicator에만
- **전체 CSS 변수 목록**: `DESIGN.md` 섹션 2 참조

---

## 3. 타이포그래피

```
전역 body: var(--th-font-mono)  (JetBrains Mono)
sans-serif: 금지

크기 체계:
  섹션/라벨:  10px, weight 700, UPPERCASE, letter-spacing
  네비/본문:  12px
  버튼:       11px, weight 600, UPPERCASE
  힌트/메타:  11px, muted
```

---

## 4. Sigil 네비게이션 언어

| 시질 | 의미 | 사용처 |
|------|------|--------|
| `›` | 활성 항목 | 헤더 아이콘 active, 탭 active |
| `·` | 비활성 항목 | 헤더 아이콘 inactive, 탭 inactive |
| `//` | 섹션 구분자 | FormField 라벨, 섹션 헤더 |
| `$` | 프롬프트 | 터미널 출력, CLI 입력 |
| `[action]` | 버튼 | 모든 버튼 텍스트 (UPPERCASE) |
| `[STATUS]` | 상태 배지 | 태스크 상태, 에이전트 상태 |
| `[×]` | 닫기 | 모달 close 버튼 |

---

## 5. 컴포넌트 패턴 요약

### 5-1. 리스트 (공통 패턴)
```tsx
// 개별 카드 ❌ → border + divide-y ✅
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)]">
  {items.map(item => (
    <div className="px-4 py-3 hover:bg-[var(--th-hover-bg)] transition-colors"
         style={{ fontFamily: "var(--th-font-mono)" }}>
    </div>
  ))}
</div>
```

### 5-2. Active 상태
```tsx
// 활성 항목: 좌측 amber 테두리
style={{ borderLeft: "2px solid var(--th-accent)", color: "var(--th-accent)" }}
className="bg-[var(--th-active-bg)]"
```

### 5-3. 모달 Chrome
```tsx
// 모달 컨테이너: macOS 앱 느낌
style={{ borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.9)" }}
// 트래픽 라이트 (헤더 좌측 장식)
<div className="flex gap-1.5">
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
  <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
</div>
```

### 5-4. 글래스모피즘 (헤더·앱 창)
```tsx
style={{ backdropFilter: "blur(12px)", background: "var(--th-bg-sidebar)" }}
```

---

## 6. i18n — 필수 규칙

```tsx
// ❌ 하드코딩 금지
<span>프로젝트를 선택하세요</span>

// ✅ t() 패턴 필수
const label = t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "请选择项目" });
```

지원 언어: `ko` · `en` · `ja` · `zh`

---

## 7. UX 7원칙 (UI 개선 시 체크리스트)

| # | 원칙 | 적용 예 |
|---|------|---------|
| 1 | **Plain language first** | 버튼명은 동사+목적어: "Create Agent" |
| 2 | **One thing at a time** | 모달 하나에 액션 하나 |
| 3 | **Explain the why** | 에러 메시지에 원인 + 해결 방법 |
| 4 | **Empty screens = signposts** | 빈 상태에 안내 문구 + 액션 버튼 |
| 5 | **Progressive disclosure** | 기본 옵션 노출 → "고급 설정" 토글 |
| 6 | **Prevent mistakes** | 삭제 전 ConfirmDialog 필수 |
| 7 | **Always show status** | 에이전트 실행 중 = amber pulsing dot |

---

## 8. 키보드 중심 인터랙션

| 단축키 | 동작 |
|--------|------|
| `Ctrl+Shift+K` | CommandPalette 열기 (z-index: 10100) |
| `?` | 키보드 단축키 가이드 열기 |
| `\` | Flow Graph 토글 (대시보드 뷰 전환) |
| `n` | 새 태스크 생성 (CreateTaskModal) |
| `g w` | Workflow 창 열기/닫기 |
| `g l` | Library 창 열기/닫기 |
| `g s` | Settings 창 열기/닫기 |
| `Esc` | 열린 창/모달 닫기 |
| `Enter` / `⌘+Enter` | 폼 제출 |

> **`g + 키`**: 첫 `g` 입력 후 1초 이내 두 번째 키 입력. 1초 초과 시 취소.

---

## 9. 실시간 상태 표시 패턴

```tsx
// Live 에이전트: amber pulsing dot
<div style={{
  width: 8, height: 8, borderRadius: "50%",
  background: "var(--th-accent)",
  animation: "pulse 1.5s infinite"
}} />

// 상태별 색상
idle:    "--th-border"          // 회색
working: "--th-accent"          // amber (pulse)
break:   "--th-text-muted"      // 뮤트
offline: "--th-danger-border"   // 빨강
done:    "--th-terminal-success" // 초록
```

---

## 11. 서버 코드 진입점 맵 (AI 에이전트용)

### 서버 디렉토리 구조

```
server/
├── server-main.ts                        ← 서버 시작점, 환경변수 검증
├── gateway/client.ts                     ← notifyClient, notifyTaskStatus 헬퍼
├── ws/hub.ts                             ← WebSocket broadcast 허브
├── lib/logger.ts                         ← pino 로거 (import logger from here)
├── types/runtime-context.ts             ← RuntimeContext 타입 정의
├── modules/
│   ├── routes.ts                         ← 라우터 등록 진입점
│   ├── routes/core/                      ← 에이전트·태스크·프로젝트 API
│   │   ├── agents/                       ← 에이전트 CRUD, spawn
│   │   ├── tasks/
│   │   │   ├── execution-run.ts          ← POST /tasks/:id/run 핸들러
│   │   │   └── execution-control.ts     ← pause/resume/stop
│   │   ├── personas.ts                   ← GET /api/personas (PERSONAS 배열 하드코딩)
│   │   └── projects/                     ← 프로젝트 CRUD
│   ├── routes/ops/
│   │   └── worktrees-and-usage.ts        ← CLI 사용량, 비용 알림 API
│   ├── workflow/orchestration.ts         ← 태스크 실행 오케스트레이터 (784줄)
│   ├── workflow/orchestration/
│   │   ├── execution-start-task.ts       ← startTaskExecutionForAgent() — 핵심 실행 로직
│   │   ├── heartbeat.ts                  ← 에이전트 하트비트 엔진
│   │   └── task-scheduler.ts            ← 스케줄 태스크 처리
│   └── bootstrap/schema/
│       ├── base-schema.ts                ← 전체 DB 테이블 정의 (원본 스키마)
│       ├── task-schema-migrations.ts     ← ALTER TABLE 방식 마이그레이션 (구형)
│       └── versioned-migrations.ts       ← ✅ 신규 마이그레이션 작성 위치
```

### DB 마이그레이션 작성 규칙

신규 컬럼/테이블은 반드시 `versioned-migrations.ts`에 추가:

```typescript
// server/modules/bootstrap/schema/versioned-migrations.ts
// MIGRATIONS 배열 맨 끝에 추가
{
  id: "YYYY-MM-DD-NNN-short-description",  // 날짜+순번+설명 (고유, 불변)
  up: (db) => {
    try {
      db.exec("ALTER TABLE tasks ADD COLUMN tokens_in INTEGER DEFAULT 0");
    } catch { /* already exists */ }
  },
},
```

**규칙:**
- 기존 항목 절대 수정/삭제 금지 (이미 프로덕션 적용됨)
- 끝에만 append
- `up` 함수는 트랜잭션 내에서 실행됨 — throw 시 롤백

### 주요 DB 테이블 목록 (base-schema.ts)

| 테이블 | 용도 |
|---|---|
| `tasks` | 태스크 (status, assigned_agent_id, project_id 등) |
| `task_execution_events` | 태스크 상태 변경 이력 (event_type, from_state, to_state) |
| `task_logs` | 에이전트 실행 로그 (agent stdout/system) |
| `agents` | 에이전트 (status, current_task_id, persona_id, cli_provider 등) |
| `subtasks` | 서브태스크 (target_department_id, delegated_task_id 포함) |
| `skill_learning_history` | 스킬 학습 이력 |
| `agent_rules` | 에이전트 룰 (project/agent/dept scope) |
| `memory_entries` | 에이전트 메모리 (project scope) |
| `hook_entries` | 훅 정의 |
| `notifications` | 알림 (task_complete, cost_alert 등) |
| `settings` | 전역 설정 key-value |
| `api_providers` | API 프로바이더 (ollama, openai 등) |
| `project_agents` | 프로젝트↔에이전트 매핑 |

### WebSocket broadcast 이벤트 타입

```typescript
// server/ws/hub.ts — broadcast(type, payload) 호출 시
broadcast("task_update", taskRow);          // 태스크 상태 변경
broadcast("agent_status", agentRow);        // 에이전트 상태 변경
broadcast("cli_output", { taskId, line });  // 터미널 출력 (250ms 배치)
broadcast("subtask_update", subtaskRow);    // 서브태스크 변경 (150ms 배치)
broadcast("notification", notifRow);        // 알림 발송
broadcast("cross_dept_delivery", payload);  // 부서 간 전달
broadcast("meeting_presence", payload);     // 미팅 참석
```

**`cli_output`, `subtask_update`는 자동 배치됨** — 나머지는 즉시 전송.

### 서버 사이드 새 API 추가 패턴

```typescript
// 1. 라우트 파일 선택 (기능에 맞는 위치)
//    core → 에이전트/태스크/프로젝트 기본 CRUD
//    ops  → 운영/모니터링/사용량
//    collab → 협업/미팅/서브태스크

// 2. 라우트 등록 (Express 스타일)
app.get("/api/your-endpoint", (req, res) => {
  const rows = db.prepare("SELECT ...").all();
  res.json(rows);
});

// 3. 로거 사용 (console.log 금지)
import logger from "../../../lib/logger.ts";
logger.info({ taskId }, "task started");
logger.warn({ err }, "something went wrong");
```

---

## 10. 테크 스택 & 참조

```
React + TypeScript + Tailwind CSS
상태 관리: Zustand (agentStore, taskStore, projectStore, uiStore)
애니메이션: Framer Motion (과도한 모션 지양)
아이콘: SVG inline (외부 아이콘 라이브러리 최소화)
로깅: pino (서버측 구조화 로깅)
```

| 문서 | 역할 |
|------|------|
| `docs/design/AI-GUIDE.md` | **지금 이 문서** — UI 개발 규칙 + 코드베이스 진입점 맵 |
| `docs/design/DESIGN.md` | CSS 변수 전체 + 컴포넌트 구현 레퍼런스 |
| `docs/design/UI-SCREENS.md` | 화면·모달 전체 목록 및 명세 (Dashboard + 3개 앱 창 + 36개 오버레이) |
| `docs/strategy/agent-flow-graph-design.md` | Agent Flow Graph Custom SVG 구현 레퍼런스 (P2-1 완료) |
| `docs/strategy/bigger-ide-vision.md` | "더 큰 IDE" 전략 로드맵 (Phase 1~3 전부 완료) |
| `docs/OVERVIEW.md` | 전체 프로젝트 개요 + 코드베이스 현황 스냅샷 + 작업 목록 |
