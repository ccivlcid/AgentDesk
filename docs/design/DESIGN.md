# AgentDesk UI/UX Design Guide

> **기준:** 현재 프로젝트 구현 (src/styles, src/components/ui, Desktop, MenuBar, Dock 등)
> **갱신일:** 2026-03-14

---

## 1. Design Philosophy

- **테마:** 다크 기본, 라이트 선택. macOS 앱 느낌의 외부 chrome + 터미널 느낌의 내부 콘텐츠.
- **폰트:** 전역 `body`는 `var(--th-font-mono)` (JetBrains Mono). 제목/헤더도 동일 모노 사용.
- **모서리 (Dual-layer):**
  - Chrome(컨테이너): `borderRadius: 10` — 패널, 모달, 카드, 위젯, 앱 창.
  - Content(내부 요소): `borderRadius: 0` — 버튼, 인풋, 토스트, 리스트 항목.
  - 아바타·상태 dot: `borderRadius: 50%`.
- **글래스모피즘:** 메뉴바·Dock·앱 창 헤더에 `backdropFilter: blur(12px)` 적용.
- **macOS 트래픽 라이트:** 헤더·모달 장식 (#ff5f57, #ffbd2e, #27c93f).
- **색상:** CSS 변수(`--th-*`)만 사용. 인라인 hex는 위험/성공/트래픽 라이트 등 상태 색상만 허용.

---

## 2. Design System — CSS 변수 전체 목록

> **정의 위치:** `src/styles/index.part01.css`
> **테마:** `:root` / `[data-theme="dark"]` (기본), `[data-theme="light"]` (라이트)

### 2-1. 폰트

| 변수 | 값 |
|------|-----|
| `--th-font-display` | "Sora", "IBM Plex Sans KR", "Segoe UI", sans-serif |
| `--th-font-body` | "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", sans-serif |
| `--th-font-mono` | "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace |

### 2-2. 배경

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-bg-primary` | #0c0c0c | #f5f0e8 |
| `--th-bg-secondary` | #111111 | #ede8de |
| `--th-bg-surface` | #181818 | #faf7f2 |
| `--th-bg-surface-hover` | #1f1f1f | – |
| `--th-bg-header` | #0c0c0c | – |
| `--th-bg-sidebar` | #101010 | #f0ebe2 |
| `--th-bg-elevated` | #1c1c1c | – |

### 2-3. 테두리

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-border` | #2a2a2a | #d4cfc6 |
| `--th-border-strong` | #3a3a3a | #b8b2a8 |
| `--th-border-accent` | rgba(245,158,11,0.35) | – |

### 2-4. 텍스트

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-text-primary` | #e8e8e8 | #1a1a1a |
| `--th-text-secondary` | #888888 | #555555 |
| `--th-text-muted` | #737373 | #706b62 |
| `--th-text-heading` | #f0f0f0 | – |
| `--th-text-accent` | #f59e0b | – |
| `--th-text-code` | #22c55e | – |

### 2-5. 액센트 (Amber)

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-accent` | #f59e0b | #b45309 |
| `--th-accent-dim` | #d97706 | #92400e |
| `--th-accent-glow` | rgba(245,158,11,0.12) | – |
| `--th-accent-border` | rgba(245,158,11,0.28) | – |
| `--th-amber-glow` | rgba(245,158,11,0.15) | – |
| `--th-hover-bg` | rgba(255,255,255,0.04) | – |
| `--th-active-bg` | rgba(255,255,255,0.07) | – |

### 2-6. 인풋

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-input-bg` | #0c0c0c | #faf7f2 |
| `--th-input-border` | #2a2a2a | #d4cfc6 |

### 2-7. 카드/패널

| 변수 | 값 |
|------|-----|
| `--th-card-bg` | #181818 |
| `--th-card-border` | #2a2a2a |
| `--th-card-bg-hover` | #1f1f1f |
| `--th-panel-bg` | #111111 |
| `--th-panel-border` | #2a2a2a |
| `--th-label-color` | #737373 |

### 2-8. 위험 상태

| 변수 | 다크 | 라이트 |
|------|------|--------|
| `--th-danger-bg` | rgba(248,81,73,0.1) | – |
| `--th-danger-border` | #f85149 | #cf222e |
| `--th-danger-text` | #f85149 | #cf222e |

### 2-9. 터미널

| 변수 | 값 |
|------|-----|
| `--th-terminal-bg` | #010409 |
| `--th-terminal-text` | #e6edf3 |
| `--th-terminal-prompt` | #f59e0b |
| `--th-terminal-success` | #3fb950 |
| `--th-terminal-error` | #f85149 |
| `--th-terminal-info` | #58a6ff |

### 2-10. 기타

| 변수 | 값 |
|------|-----|
| `--th-modal-overlay` | rgba(0,0,0,0.85) |
| `--th-focus-ring` | #f59e0b |
| `--th-focus-ring-shadow` | rgba(245,158,11,0.3) |
| `--th-scrollbar-thumb` | #2a2a2a |
| `--th-scrollbar-thumb-hover` | #3a3a3a |
| `--th-glass-bg` | rgba(255,255,255,0.02) |
| `--th-glass-border` | #2a2a2a |
| `--th-glass-shadow` | rgba(0,0,0,0.9) |
| `--th-green-glow` | rgba(63,185,80,0.12) |
| `--th-red-glow` | rgba(248,81,73,0.12) |

### 2-11. 성능 속성 배지

| 변수 | 값 |
|------|-----|
| `--th-attr-elite` | #22c55e |
| `--th-attr-good` | #86efac |
| `--th-attr-avg` | #fbbf24 |
| `--th-attr-poor` | #f87171 |
| `--th-attr-vlow` | #6e7681 |

### 2-12. 별칭

| 변수 | 대응 |
|------|------|
| `--th-bg-base` | var(--th-bg-primary) |
| `--th-bg-panel` | var(--th-bg-sidebar) |
| `--th-text` | var(--th-text-primary) |
| `--th-green` | var(--th-terminal-success) |
| `--th-blue` | var(--th-terminal-info) |
| `--th-red` | var(--th-terminal-error) |

### 2-13. Tailwind 매핑 (`index.part05.css`)

slate/gray 유틸리티가 `--th-*`로 재정의됨:
- `bg-slate-950` → `var(--th-bg-primary)`
- `bg-slate-800` → `var(--th-bg-surface)`
- `border-slate-700` → `var(--th-border)`
- `text-slate-100` → `var(--th-text-primary)`
- `bg-blue-600` → `var(--th-accent)` + color #000

---

## 3. Typography

- **폰트 변수:** `--th-font-display` (Sora), `--th-font-body` (IBM Plex Sans KR), `--th-font-mono` (JetBrains Mono).  
  현재 앱 전역은 `body { font-family: var(--th-font-mono) }` 로 모노 사용.
- **크기:**  
  - 섹션/라벨: 10px, 700, uppercase, letter-spacing.  
  - 네비/본문: 12px.  
  - 버튼: 11px, 600, uppercase.  
  - 힌트: 11px, muted.

---

## 4. Components (현재 구현 기준)

### 4-1. Button (`src/components/ui/Button.tsx`)

- **Variant:** `primary` | `secondary` | `ghost` | `danger`
- **Primary:** `--th-accent-glow` 배경, `--th-accent-border` 테두리, `--th-accent` 텍스트. hover 시 `--th-accent` 배경, 검정 텍스트.
- **Secondary:** 투명 배경, `--th-border-strong` 테두리, `--th-text-secondary`. hover: `--th-hover-bg`, `--th-text`.
- **Ghost:** 투명, `--th-text-muted`. hover: `--th-hover-bg`, `--th-text-secondary`.
- **Danger:** 투명, `rgba(248,81,73,0.35)` 테두리, `#f85149` 텍스트. hover: `rgba(248,81,73,0.08)` 배경.
- **공통:** `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 11px`, `textTransform: uppercase`, `letterSpacing: 0.04em`.

### 4-2. Input (`src/components/ui/Input.tsx`)

- `background: var(--th-input-bg)`, `border: 1px solid var(--th-input-border)`, `borderRadius: 0`, `color: var(--th-text-primary)`, `fontFamily: var(--th-font-mono)`, `fontSize: 12px`, `padding: 6px 10px`.
- Focus: `borderColor: var(--th-accent)`. Error: `borderColor: var(--th-danger-border)`.

### 4-3. FormField (`src/components/ui/FormField.tsx`)

- 라벨: `// field-name` 패턴. `fontFamily: mono`, `fontSize: 10px`, `fontWeight: 700`, `letterSpacing: 0.06em`, `textTransform: uppercase`, `color: var(--th-text-muted)`. 필수 시 `*` 액센트 색.

### 4-4. Modal (`src/components/ui/Modal.tsx`)

- 오버레이 + 내부 패널. `width`: sm/md/lg/xl/full. 내부는 `--th-font-mono` 사용. Escape·포커스 트랩 지원.
- **Chrome:** `borderRadius: 10`, 깊은 `boxShadow`. macOS 트래픽 라이트 장식 (HeaderModalChrome).

### 4-5. Toast (`src/components/ui/Toast.tsx`)

- Variant: `success` | `error` | `warning` | `info`. 시질(✓✗⚠ℹ) + 좌측 액센트 바 + `--th-bg-elevated` 배경. `borderRadius: 0`.

### 4-6. ConfirmDialog (`src/components/ui/ConfirmDialog.tsx`)

- Primary 버튼: `--th-accent-glow`, `--th-accent-border`, `--th-accent` (Button primary와 동일 톤).

### 4-7. Dock (`src/components/desktop/Dock.tsx`)

- **구조:** 하단 고정 4개 앱 아이콘 (⚡ Workflow / 📚 Library / ⚙ Settings / 💬 Chat).
- **Chrome:** `backdropFilter: blur(12px)` 글래스모피즘, macOS Dock 느낌.
- **아이콘:** 비활성 `color: var(--th-text-secondary)`, hover `background: var(--th-hover-bg)`.
  실행 중(창이 열린 상태) 아이콘 아래 amber dot `background: var(--th-accent)`.
- **폰트:** `var(--th-font-mono)`, 11px.

### 4-7b. 데스크톱 아이콘 (`src/components/desktop/DesktopIcon.tsx`)

- **구조:** 바탕화면에 자유 배치. 드래그로 위치 변경. 클릭 → 해당 창/모달 열림.
- **스타일:** 아이콘 박스 `borderRadius: 10`, `blur(8px)`, `border: 1px solid var(--th-border)`.
- **레이블:** 아이콘 아래 12px 텍스트, `var(--th-font-mono)`.

### 4-7c. 위젯 (`src/components/desktop/Widget.tsx`)

- **구조:** 바탕화면 자유 배치. 드래그·리사이즈·최소화·닫기 지원.
- **Chrome:** `borderRadius: 10`, `backdropFilter: blur(10px)`, `border: 1px solid var(--th-border)`.
- **헤더:** 위젯 제목 (좌) + 최소화`[─]` + 닫기`[×]` 버튼 (우).
- **위젯 목록:** AgentsWidget / TasksWidget / AlertsWidget / CliCostWidget / FlowGraphWidget.

### 4-8. 리스트 패턴

- `border: 1px solid var(--th-border)` + `divide-y divide-[var(--th-border)]` 로 행 구분. 행 hover: `hover:bg-[var(--th-hover-bg)]`.

### 4-9. Agent Flow Graph (`src/components/flow-graph/AgentFlowGraph.tsx`) — 구현 완료

- **구현:** Custom SVG + React (외부 라이브러리 없음).
- **주인공:** 프로젝트 팀 에이전트 (부서가 아닌 에이전트 중심).
- **노드 (AgentNode):** `foreignObject` 기반. Chrome: `borderRadius: 10`, shadow. Content: 모노폰트, 상태 바. 부서는 작은 태그.
  - 상태별 테두리: idle=`--th-border`, working=`--th-accent` (glow), break=`--th-text-muted`, offline=`--th-danger-border`.
- **엣지:** 베지어 커브. delegation=실선, sub-agent=점선, cross_dept=굵은 점선, meeting=앰버 점선.
- **미팅 클러스터:** 원형 영역, 앰버 점선 테두리, 참석 에이전트 그룹.
- **인터랙션:** 줌/팬 (마우스 휠/드래그), 노드 클릭→에이전트 상세, fit-to-view.
- **태스크 보드와 차별점:** 태스크 보드는 "태스크 상태" 중심, 플로우 그래프는 "에이전트 간 관계" 중심.
- **접근 방법:** 바탕화면 위젯 (FlowGraph 위젯) 또는 Agents 위젯 내 `[Graph]` 토글.
- 상세 설계: `docs/strategy/agent-flow-graph-design.md`.

### 4-10. CommandPalette (`src/components/CommandPalette.tsx`)

- `⌘+Shift+K` 트리거. z-index: 10100.
- 앱 창 열기 (Workflow/Library/Settings), 프로젝트 전환, 에이전트/태스크 검색, 위젯 추가.
- 퍼지 검색 + 키보드 네비게이션 (화살표, Enter, Esc).

### 4-11. 채팅 패널 (`src/components/chat-panel/`)

- 1:1 채팅: 에이전트와 대화. 태스크/공지/지시 모드.
- 그룹 채팅: 다중 에이전트 그룹 대화.
- 메시지 스트리밍, 파일 첨부, 검색, 핀.

### 4-12. 터미널 패널 (`src/components/terminal-panel/`)

- 태스크 실행 로그 실시간 스트리밍.
- 생각 블록(thinking), 진행 힌트, OPS 상세.
- 일시정지/재개/개입/로그 다운로드.
- `--th-terminal-*` 색상 변수 전용.

### 4-13. 의사결정 인박스 (`src/components/DecisionInboxModal.tsx`)

- 승인 대기 항목 관리. 리뷰/타임아웃/승인 라운드.
- 인터랙티브 옵션 선택, 추가 노트, 채팅/미팅 연결.

---

## 5. Layout — macOS 바탕화면 OS

- **메뉴바:** `--th-bg-header`, `backdropFilter: blur(12px)`, 상단 고정. `MenuBar.tsx`
  - 요소: AgentDesk 로고, 프로젝트 셀렉터, CLI 비용 요약, 알림 벨 🔔, 시각.
- **바탕화면:** `--th-bg-primary` 배경. `Desktop.tsx`
  - 데스크톱 아이콘 영역 (상단), 위젯 자유 배치 영역 (중앙).
- **Dock:** `--th-bg-sidebar`, `backdropFilter: blur(12px)`, 하단 고정. `Dock.tsx`
  - 4개 앱 아이콘 (⚡📚⚙💬), 실행 중 amber dot.
- **앱 창:** `--th-bg-elevated`, `borderRadius: 10`, `boxShadow: 0 20px 60px rgba(0,0,0,0.9)`. `windows/*.tsx`
  - 창 헤더: 트래픽 라이트 + 창 제목 + 탭 바.
- **위젯:** `--th-bg-card`, `borderRadius: 10`, `backdropFilter: blur(10px)`. `Widget.tsx`

---

## 6. 터미널 영역

- 실행 뷰어/CLI 출력: `--th-terminal-bg`, `--th-terminal-text`, `--th-terminal-prompt`, `--th-terminal-success`, `--th-terminal-error`, `--th-terminal-info`. `font-family: var(--th-font-mono)`.

---

## 7. 규칙 요약

| 항목 | 규칙 |
|------|------|
| border-radius | Chrome(패널·모달·카드): 10, Content(버튼·인풋·토스트): 0, 아바타·dot: 50% |
| 색상 | `var(--th-*)` 사용. 상태(성공/오류)만 hex 허용 |
| 폰트 | UI 전반 `var(--th-font-mono)` |
| 버튼 | `Button` 컴포넌트 사용, variant·size 일관 |
| 폼 라벨 | `FormField` 또는 `// label` 패턴 |
| 모달/토스트 | `Modal`, `Toast`, `ConfirmDialog` 사용 |

---

## 8. 화면 전체 인벤토리 — macOS 바탕화면 OS

### 데스크톱 아이콘 (7개)

| 아이콘 | 레이블 | 열리는 것 | 구 View ID |
|--------|--------|-----------|-----------|
| 👤 | 에이전트 설정 | AgentManagerWindow | `agents` |
| 📁 | 프로젝트 생성 | ProjectCreateModal | — |
| ▶ | 태스크 실행 | CreateTaskModal | — |
| ⚡ | 워크플로 빌더 | WorkflowWindow (Builder 탭) | `workflow-builder` |
| 📋 | 라이브러리 | LibraryWindow (Skills 탭) | `skills` |
| 💬 | 채팅 | ChatWindow | — |
| >_ | 에이전트 REPL | ReplWindow | (신규) |

### 위젯 (5종, 사용자 선택 추가)

| 위젯 | 컴포넌트 | 구 View ID |
|------|----------|-----------|
| Agents 위젯 | `AgentsWidget.tsx` | `heartbeat` |
| Tasks 위젯 | `TasksWidget.tsx` | `tasks-board` |
| Alerts 위젯 | `AlertsWidget.tsx` | — |
| CLI Cost 위젯 | `CliCostWidget.tsx` | `cli-usage` |
| Flow Graph 위젯 | `FlowGraphWidget.tsx` | `flow-graph` |

### Dock 앱 창 (4개)

| Dock | 창 컴포넌트 | 탭 구성 | 구 View ID |
|------|------------|---------|-----------|
| ⚡ Workflow | `WorkflowWindow.tsx` | Workflow Builder / Scheduled Tasks | `workflow-builder`, `tasks-scheduled` |
| 📚 Library | `LibraryWindow.tsx` | Skills / Agent Rules / Memory / Hooks / Deliverables | `skills`, `agent-rules`, `memory`, `hooks`, `tasks-deliverables` |
| ⚙ Settings | `SettingsWindow.tsx` | General / API / OAuth / CLI / Gateway / Data / Project Types / Agents | `settings`, `project-types` |
| 💬 Chat | `ChatWindow.tsx` | Direct / Group / Announcement | — |

### Settings 창 탭 (8개)

| 탭 | 내용 |
|----|------|
| General | 언어, 테마, 회사 설정 |
| API | API 프로바이더 (Anthropic, OpenAI 등) 설정 |
| OAuth | OAuth 계정 연결/관리 |
| CLI | CLI 인증, 모델, 사용량 상세 |
| Gateway | 메신저 채널 설정 (Telegram/Discord/Slack) |
| Data | 데이터 내보내기/가져오기 |
| Project Types | 프로젝트 유형(템플릿) 관리 |
| Agents | 에이전트·부서 관리 |

### 모달/오버레이 (36개)

**프로젝트:** ProjectCreateModal, ProjectManagerModal, MissingPathPromptDialog, ManualPathPickerDialog, ManualAssignmentWarningDialog
**태스크:** CreateTaskModal, DiffModal, BulkHideModal, TaskReportPopup, ReportHistory
**에이전트:** AgentFormModal, DepartmentFormModal, AgentDetail(슬라이드 패널), AgentStatusPanel
**터미널:** TerminalPanel(하단 드로어)
**채팅:** ChatPanel, GroupChatPanel, DecisionInboxModal, ProjectFlowDialog
**라이브러리:** CustomSkillModal, LearningModal(Skills), ClassroomOverlay, RuleFormModal, RuleLearningModal, RuleHistoryPanel, MemoryFormModal, MemoryLearningModal, HookFormModal, HookLearningModal, HookHistoryPanel
**설정:** ChannelGuideModal, ChatEditorModal, CategoryFormModal, GitHubImportPanel
**기타:** CommandPalette, KeyboardShortcutsGuide, NotificationCenter, TextPreviewModal, ConfirmDialog

---

## 9. 스킬 라이브러리 UI 패턴

> (구 `DESIGN_SKILLS.md` 통합)

### 9-1. 리스트 행 패턴

```tsx
<div style={{ border: "1px solid var(--th-border)" }}
     className="divide-y divide-[var(--th-border)] overflow-hidden">
  {items.map((item) => (
    <div
      key={item.id}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--th-hover-bg)] transition-colors"
      style={{ fontFamily: "var(--th-font-mono)" }}
    >
      <span className="shrink-0">{/* 아이콘/카테고리 */}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--th-text-primary)" }}>{item.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-muted)" }}>{item.meta}</p>
      </div>
      {/* 상태 배지 */}
    </div>
  ))}
</div>
```

### 9-2. 상태 배지 규칙

- `borderRadius: 0`, `fontFamily: var(--th-font-mono)`, `fontSize: 10px`, `textTransform: uppercase`
- 성공(초록 `--th-terminal-success`), 학습중(앰버 `--th-accent`), 오류(빨강 `--th-danger-text`), 비활성(`--th-text-muted`)

### 9-3. CLI 프롬프트 스킬 표시 포맷

```
[Skills: TypeScript-Strict Rust-Safety Git-Flow][+3 more]
```

- 라벨/괄호: `--th-text-muted` / 스킬명: `--th-text-code` (#22c55e) / overflow: muted
- 최근 학습/사용 순, 한 줄 3~4개 → `+N more`로 축약. 스킬 없으면 미표시.

### 9-4. 에이전트별 그룹 헤더

- 그룹 헤더: `--th-text-muted`, 11px, uppercase 섹션 레이블 스타일
- 관련 컴포넌트: `SkillsLibrary.tsx`, `SkillHistoryPanel.tsx`

---

## 10. 관련 문서

- **UI-SCREENS.md** — 전체 화면·모달 상세 명세 (13개 메인 화면 + 36개 오버레이).
- **agent-flow-graph-design.md** — 에이전트 플로우 그래프 설계 (상세 SVG 명세).
