# AgentDesk — UI 화면 & 인터랙션 명세

> **최종 업데이트:** 2026-03-15 (Composition 탭 추가, ReplWindow openWindows 반영)
> 메뉴바 + 데스크톱 아이콘 + 위젯 + Dock + 앱 창 구조
> **디자인 참조:** `DESIGN.md` (CSS 변수), `AI-GUIDE.md` (개발 원칙)

---

## 디자인 철학 — macOS Hybrid

모든 화면은 **이중 레이어 원칙**을 따른다:

| 레이어 | 역할 | 스타일 |
|--------|------|--------|
| **Chrome** (컨테이너) | 창·위젯·카드·메뉴바 | `borderRadius: 10`, `blur(12px)`, 트래픽 라이트 |
| **Content** (내부) | 버튼·인풋·토스트·배지 | `borderRadius: 0`, `font-mono`, CLI sigil 언어 |

- **메뉴바:** `backdropFilter: blur(12px)` — macOS Menu Bar 스타일
- **앱 창:** `borderRadius: 10`, 트래픽 라이트 장식 — macOS 창 느낌
- **위젯:** `borderRadius: 10`, blur — 유리 패널 느낌
- **Brand color:** Amber `--th-accent` — live indicator, active state, primary CTA
- **전체 폰트:** `var(--th-font-mono)` (JetBrains Mono) — sans-serif 금지

---

## 전체 구조 — macOS 바탕화면 OS

AgentDesk는 macOS 바탕화면 은유로 설계된다. 사이드바가 없다.

```
┌─────────────────────────────────────────────────────────────────┐
│  AgentDesk  [▾ 프로젝트]                  $2.14  🔔  14:32     │  ← 메뉴바
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │  👤  │  │  📁  │  │  ▶   │  │  ⚡  │  │  📋  │  │  💬  │  │  >_  │  │  ← 데스크톱 아이콘
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  │
│  에이전트  프로젝트  태스크    워크플로   라이브러리  채팅       에이전트  │
│   설정      생성      실행      빌더                               REPL   │
│                                                                  │
│  ┌─ Agents ──── [─][×]┐   ┌─ Tasks ───── [─][×]┐              │
│  │  (위젯)             │   │  (위젯)             │  ← 위젯      │
│  └────────────────────┘   └────────────────────┘              │
│                                                                  │
│                    [+ 위젯 추가]                                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│      ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐              │  ← Dock
│      │  ⚡  │    │  📚  │    │  ⚙   │    │  💬  │              │
│      └──────┘    └──────┘    └──────┘    └──────┘              │
│     Workflow    Library    Settings     Chat                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 메뉴바

**파일:** `src/components/MenuBar.tsx`

항상 상단에 고정. macOS Menu Bar 역할.

| 영역 | 구성 요소 | 역할 |
|------|-----------|------|
| 좌측 | AgentDesk 로고 | 홈(바탕화면) 복귀 |
| 중앙 | 프로젝트 선택 드롭다운 | 현재 프로젝트 전환 |
| 우측 | CLI 비용 요약 | 오늘 / 이번 달 비용 |
| 우측 | 알림 벨 🔔 | NotificationCenter 열기 |
| 우측 | 시각 | 현재 시간 |

---

## 2. 데스크톱 아이콘

**파일:** `src/components/desktop/DesktopIcon.tsx`

바탕화면에 기본 배치. 드래그로 위치 변경 가능.
더블클릭 또는 클릭으로 해당 창/모달을 연다.

| 아이콘 | 레이블 | 클릭 시 열리는 것 | 대응하는 기존 기능 |
|--------|--------|-------------------|-------------------|
| 👤 | 에이전트 설정 | AgentManager 창 | Agents & Departments |
| 📁 | 프로젝트 생성 | ProjectCreateModal | 프로젝트 생성 마법사 |
| ▶ | 태스크 실행 | CreateTaskModal | 태스크 생성 |
| ⚡ | 워크플로 빌더 | Workflow 창 (Builder 탭) | Workflow Builder |
| 📋 | 라이브러리 | Library 창 (Skills 탭) | Library |
| 💬 | 채팅 | Chat 창 | ChatPanel |
| >_ | 에이전트 REPL | REPL 창 | (신규 — 직접 명령 실행) |

> 우클릭 메뉴: 이름 변경 / 제거 / 바탕화면 재배열

---

## 3. 위젯 시스템

**파일:** `src/components/desktop/Widget.tsx`, `src/components/desktop/WidgetPicker.tsx`

사용자가 `[+ 위젯 추가]` 버튼으로 선택 추가. 드래그·리사이즈·닫기 자유.
바탕화면에 여러 개 동시 배치 가능. 위치/크기는 localStorage에 저장.

### 위젯 목록

#### 3-1. Agents 위젯
**파일:** `src/components/desktop/widgets/AgentsWidget.tsx`
**대응:** 기존 Heartbeat Monitor

- 에이전트 상태 실시간 목록 (working/idle/error/review)
- 에이전트 행 클릭 → AgentDetail 슬라이드 패널 (우측)
- WebSocket `agent_status` 이벤트로 실시간 갱신

#### 3-2. Tasks 위젯
**파일:** `src/components/desktop/widgets/TasksWidget.tsx`
**대응:** 기존 Task Board

- 실행 중인 태스크 목록 (칸반 미니 뷰 또는 리스트)
- 태스크 행 클릭 → TerminalPanel 드로어 (하단)
- `[+ 새 태스크]` 버튼 → CreateTaskModal

#### 3-3. Alerts 위젯
**파일:** `src/components/desktop/widgets/AlertsWidget.tsx`
**대응:** 기존 알림 배너

- 요주의 항목: 오류 · 승인 대기 · 타임아웃
- 항목 클릭 → DecisionInboxModal

#### 3-4. CLI Cost 위젯
**파일:** `src/components/desktop/widgets/CliCostWidget.tsx`
**대응:** 기존 CLI Usage (요약)

- 오늘 / 이번 달 비용
- 실행 중인 CLI 프로세스 수
- 클릭 → Settings 창 > CLI 탭 (상세)

#### 3-5. Flow Graph 위젯
**파일:** `src/components/desktop/widgets/FlowGraphWidget.tsx`
**대응:** 기존 Flow Graph

- 에이전트 관계 SVG 미니 시각화 (`AgentFlowGraph` 재사용)
- 줌·팬, 노드 클릭 → AgentDetail 패널

---

## 4. Dock

**파일:** `src/components/desktop/Dock.tsx`

항상 하단에 고정. 4개 앱 아이콘.

| 아이콘 | 앱 | 창 탭 구성 |
|--------|-----|-----------|
| ⚡ | Workflow | Workflow Builder / Scheduled Tasks |
| 📚 | Library | Skills / Agent Rules / Memory / Hooks / Deliverables |
| ⚙ | Settings | General / API / OAuth / CLI / Gateway / Data / Project Types / Agents |
| 💬 | Chat | Direct / Group / Announcement |

- 클릭 시 해당 앱 창이 열림 (이미 열려 있으면 최상위로 포커스)
- 실행 중인 앱은 아이콘 아래 amber dot 표시

---

## 5. 앱 창 (Dock 클릭 시 열림)

모든 창은 **트래픽 라이트 + 닫기 버튼** 스타일. 드래그 이동 가능.
동시에 여러 창 열기 가능. `uiStore.openWindows: Set<WindowType>`으로 관리.

### 5-1. Workflow 창 (⚡)

**파일:** `src/components/windows/WorkflowWindow.tsx`

```
[  Workflow Builder  |  Scheduled Tasks  |  Composition  ]
```

**Workflow Builder 탭**
- **파일:** `src/components/workflow-builder/WorkflowBuilder.tsx`
- **의존성:** `@xyflow/react` v12
- 노드 기반 에이전트 파이프라인 시각적 설계
- 노드 타입: `trigger` / `agent` / `gate` / `condition`
- localStorage 자동 저장

**Scheduled Tasks 탭**
- **파일:** `src/components/scheduled-tasks/ScheduledTasksPanel.tsx`
- 반복·예약 실행 태스크 목록
- 다음 실행 시간, 주기, 담당 에이전트 표시

**Composition 탭** _(2026-03-15 추가)_
- **파일:** `src/components/agent-composition/AgentCompositionBuilder.tsx`
- **의존성:** `@xyflow/react` v12
- 에이전트 역할(role) 기반 드래그-드롭 조합 빌더
- 노드: `CompAgentNode` — role별 상단 테두리 색상 구분
- 실행: `AgentCompositionRunModal` — 의존관계 포함 다중 태스크 생성
- 템플릿 저장/불러오기: `/api/composition-templates` CRUD

---

### 5-2. Library 창 (📚)

**파일:** `src/components/windows/LibraryWindow.tsx`
**프로젝트 컨텍스트:** 선택된 `project_id` 기반 필터링

```
[  Skills  |  Agent Rules  |  Memory  |  Hooks  |  Deliverables  ]
```

**Skills 탭** — `src/components/SkillsLibrary.tsx`
- 에이전트 학습 명령·도구 목록 (provider/repo/agent 스코프)
- 내장 모달: `CustomSkillModal`, `LearningModal`, `ClassroomOverlay`

**Agent Rules 탭** — `src/components/AgentRulesLibrary.tsx`
- 에이전트 행동 규칙 (global/dept/agent/project 스코프)
- 내장 모달: `RuleFormModal`, `RuleLearningModal`, `RuleHistoryPanel`

**Memory 탭** — `src/components/MemoryLibrary.tsx`
- 에이전트 기억 항목, 5분 TTL 캐시
- 내장 모달: `MemoryFormModal`, `MemoryLearningModal`

**Hooks 탭** — `src/components/HooksLibrary.tsx`
- 태스크 이벤트 트리거 스크립트 (pre/post/on-error)
- 내장 모달: `HookFormModal`, `HookLearningModal`, `HookHistoryPanel`

**Deliverables 탭** — `src/components/deliverables/Deliverables.tsx`
- 태스크 생성 결과물 목록, 파일 형식별 필터·다운로드
- 내장 모달: `TextPreviewModal`

---

### 5-3. Settings 창 (⚙)

**파일:** `src/components/windows/SettingsWindow.tsx`

```
[  General  |  API  |  OAuth  |  CLI  |  Gateway  |  Data  |  Project Types  |  Agents  ]
```

| 탭 | 파일 | 내용 |
|----|------|------|
| General | `settings/GeneralTab.tsx` | 언어, 테마, 기본 설정 |
| API | `settings/ApiTab.tsx` | Provider·모델 설정 |
| OAuth | `settings/OAuthTab.tsx` | OAuth 디바이스 플로우 계정 연결 |
| CLI | `settings/CliTab.tsx` | CLI 상태·경로·사용량 상세 |
| Gateway | `settings/gateway-settings/` | Telegram·Discord·Slack 연동 |
| Data | `settings/DataTab.tsx` | DB 백업·초기화 |
| Project Types | `settings/CategoriesTab.tsx` | 프로젝트 카테고리 관리 |
| Agents | `TeamPageView.tsx` → `AgentManager` | 에이전트·부서 관리 |

---

### 5-4. Chat 창 (💬)

**파일:** `src/components/windows/ChatWindow.tsx`

```
[  Direct  |  Group  |  Announcement  ]
```

- **Direct:** 특정 에이전트 1:1 채팅
- **Group:** 복수 에이전트 그룹 대화 (에이전트 태그·멘션)
- **Announcement:** 팀 전체 공지

---

### 5-5. AgentManager 창 (👤 아이콘)

**파일:** `src/components/windows/AgentManagerWindow.tsx`
**트리거:** 데스크톱 아이콘 👤 클릭

- 에이전트 카드 그리드 (부서별 그룹)
- 에이전트 상태 뱃지 (idle / working / error)
- `[+ 에이전트]` `[+ 부서]` 버튼
- 내장 모달: `AgentFormModal`, `DepartmentFormModal`

---

### 5-6. REPL 창 (>_ 아이콘)

**파일:** `src/components/windows/ReplWindow.tsx`
**트리거:** 데스크톱 아이콘 `>_` 클릭

Task를 생성하지 않고 에이전트에게 직접 명령을 보내고 즉시 응답을 받는 인터랙티브 셸.
macOS Terminal.app 역할.

```
┌─────────────────────────────────────────────────────┐
│ ◉ ◎ ◎  Agent REPL            [▾ dev-01]   [─][×] │
│ ──────────────────────────────────────────────────  │
│ $ read src/auth/middleware.ts                        │
│ > Reading file... (342 lines)                       │
│ > Found: token expiry check missing on line 87      │
│                                                      │
│ $ fix the token expiry issue                        │
│ > Applying fix to src/auth/middleware.ts            │
│ > Done. Modified lines 87-93.                       │
│                                                      │
│ > _                                                  │
│ ──────────────────────────────────────────────────  │
│ [에이전트 선택: dev-01 ▾]  [입력창_______________] [↵] │
└─────────────────────────────────────────────────────┘
```

기능:
- 에이전트 선택 드롭다운 (실행 중인 에이전트 목록)
- 명령 입력 → 즉시 실행 → 결과 스트리밍
- 명령 히스토리 (↑↓ 키)
- Task 생성 없이 one-shot 명령 실행
- WebSocket `cli_output` 실시간 스트리밍

---

## 6. 슬라이드 패널 & 드로어

위젯이나 아이콘 창에서 항목 클릭 시 바탕화면 위에 레이어로 열린다.

### 6-1. AgentDetail 슬라이드 패널
**파일:** `src/components/AgentDetail.tsx`
**트리거:** Agents 위젯 에이전트 행 클릭 / Flow Graph 위젯 노드 클릭

우측 슬라이드. 탭: Info / Tasks / Alba / Performance / Chat

### 6-2. TerminalPanel 드로어
**파일:** `src/components/TerminalPanel.tsx`
**트리거:** Tasks 위젯 태스크 행 클릭

하단 드로어. 탭: Terminal(실시간 stdout) / Minutes(회의록)
기능: Thinking Block, 로그 검색·필터, Intervention 입력, Progress Hints

---

## 7. 모달 & 오버레이 (36개)

`src/app/AppOverlays.tsx`에서 중앙 렌더링. 어느 창/위젯에서든 트리거 가능.

### 커뮤니케이션

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-1 | `ChatPanel` | AgentDetail > Chat 탭 |
| 7-2 | `GroupChatPanel` | Chat 창 > Group 탭 |
| 7-3 | `DecisionInboxModal` | Alerts 위젯 클릭 / 알림 벨 |

### 에이전트 관리

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-4 | `AgentFormModal` | AgentManager 창 `[+ 에이전트]` |
| 7-5 | `DepartmentFormModal` | AgentManager 창 `[+ 부서]` |
| 7-6 | `AgentStatusPanel` | Tasks 위젯 → `onOpenAgentStatus` |

### 태스크 관리

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-7 | `CreateTaskModal` | 데스크톱 아이콘 ▶ / Tasks 위젯 `[+ 새 태스크]` |
| 7-8 | `BulkHideModal` | Tasks 위젯 일괄 숨기기 |
| 7-9 | `DiffModal` | 태스크 변경 충돌 감지 시 |

### 리포트

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-10 | `TaskReportPopup` | Tasks 위젯 완료 태스크 클릭 |
| 7-11 | `ReportHistory` | `onOpenReportHistory` |

### 프로젝트 관리

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-12 | `ProjectCreateModal` | 데스크톱 아이콘 📁 |
| 7-13 | `ProjectManagerModal` | 메뉴바 프로젝트 드롭다운 → 관리 |

### Library 생성·학습 모달

| # | 모달 | 파일 | 접근 |
|---|------|------|------|
| 7-14 | CustomSkillModal | `skills-library/CustomSkillModal.tsx` | Library > Skills |
| 7-15 | LearningModal (Skills) | `skills-library/LearningModal.tsx` | Library > Skills |
| 7-16 | ClassroomOverlay | `skills-library/ClassroomOverlay.tsx` | Library > Skills |
| 7-17 | RuleFormModal | `agent-rules/RuleFormModal.tsx` | Library > Agent Rules |
| 7-18 | RuleLearningModal | `agent-rules/RuleLearningModal.tsx` | Library > Agent Rules |
| 7-19 | RuleHistoryPanel | `agent-rules/RuleHistoryPanel.tsx` | Library > Agent Rules |
| 7-20 | MemoryFormModal | `memory/MemoryFormModal.tsx` | Library > Memory |
| 7-21 | MemoryLearningModal | `memory/MemoryLearningModal.tsx` | Library > Memory |
| 7-22 | HookFormModal | `hooks/HookFormModal.tsx` | Library > Hooks |
| 7-23 | HookLearningModal | `hooks/HookLearningModal.tsx` | Library > Hooks |
| 7-24 | HookHistoryPanel | `hooks/HookHistoryPanel.tsx` | Library > Hooks |

### 설정·연동

| # | 모달 | 파일 | 접근 |
|---|------|------|------|
| 7-25 | CategoryFormModal | `category-editor/CategoryFormModal.tsx` | Settings > Project Types |
| 7-26 | ChatEditorModal | `settings/gateway-settings/ChatEditorModal.tsx` | Settings > Gateway |
| 7-27 | ChannelGuideModal | `settings/gateway-settings/ChannelGuideModal.tsx` | Settings > Gateway |
| 7-28 | GitHubImportPanel | `GitHubImportPanel.tsx` | ProjectManagerModal |
| 7-29 | TextPreviewModal | `deliverables/TextPreviewModal.tsx` | Library > Deliverables |

### 글로벌 유틸리티

| # | 컴포넌트 | 트리거 |
|---|----------|--------|
| 7-30 | `CommandPalette` | `Ctrl+Shift+K` |
| 7-31 | `KeyboardShortcutsGuide` | `?` 키 |
| 7-32 | `NotificationCenter` | 메뉴바 🔔 |
| 7-33 | `ConfirmDialog` | 삭제·경고 시 |

---

## 8. 기존 14개 메뉴 → 새 위치 매핑 (전부 보존)

| 기존 메뉴 | 새 위치 | 접근 방법 |
|-----------|---------|-----------|
| Dashboard | 바탕화면 자체 | 항상 보임 |
| Agents & Departments | 데스크톱 아이콘 👤 | 클릭 → AgentManager 창 |
| Heartbeat Monitor | Agents 위젯 | `[+ 위젯 추가]` → Agents 선택 |
| Flow Graph | Flow Graph 위젯 | `[+ 위젯 추가]` → Flow Graph 선택 |
| Task Board | Tasks 위젯 | `[+ 위젯 추가]` → Tasks 선택 |
| Scheduled Tasks | Dock ⚡ Workflow 창 탭 | Workflow 창 → Scheduled 탭 |
| Deliverables | Dock 📚 Library 창 탭 | Library 창 → Deliverables 탭 |
| Workflow Builder | 데스크톱 아이콘 ⚡ + Dock ⚡ | 둘 다 같은 창 열림 |
| Skills | Dock 📚 Library 창 탭 | Library 창 → Skills 탭 |
| Agent Rules | Dock 📚 Library 창 탭 | Library 창 → Rules 탭 |
| Memory | Dock 📚 Library 창 탭 | Library 창 → Memory 탭 |
| Hooks | Dock 📚 Library 창 탭 | Library 창 → Hooks 탭 |
| CLI Usage | CLI Cost 위젯 + Settings > CLI | 위젯(요약) / Settings(상세) |
| Project Types | Dock ⚙ Settings 창 탭 | Settings 창 → Project Types 탭 |
| Settings | Dock ⚙ | 클릭 → Settings 창 |

---

## 9. 핵심 UI 아키텍처 패턴

### 앱 구조

```
App.tsx
  └── Desktop.tsx              ← 바탕화면 (메뉴바 + 아이콘 + 위젯 + Dock)
        ├── MenuBar.tsx
        ├── DesktopIcons.tsx
        ├── WidgetLayer.tsx    ← 위젯 드래그/리사이즈 레이어
        ├── Dock.tsx
        └── WindowLayer.tsx   ← 앱 창 오버레이 레이어
              ├── WorkflowWindow.tsx
              ├── LibraryWindow.tsx
              ├── SettingsWindow.tsx
              ├── ChatWindow.tsx
              └── AgentManagerWindow.tsx
  └── AppOverlays.tsx          ← 모달 레이어 (z-index 최상위)
  └── SlidePanels.tsx          ← AgentDetail, TerminalPanel 레이어
```

### 상태 관리

```typescript
// uiStore.ts
openWindows: Set<"workflow"|"library"|"settings"|"chat"|"agent-manager"|"repl">
widgetLayout: WidgetConfig[]    // 위젯 위치·크기·표시 여부
desktopIconLayout: IconConfig[] // 아이콘 위치
selectedAgentId: string | null  // AgentDetail 패널
openTaskId: string | null       // TerminalPanel 드로어
```

### 창 관리 패턴
- 동시에 여러 창 열기 가능
- 창이 열려 있어도 바탕화면(위젯)은 실시간 업데이트 계속
- 창 닫기: `×` 버튼 또는 `Escape`

### 위젯 영속성
위젯 레이아웃(위치·크기·목록)은 `localStorage`에 저장.
프로젝트별로 다른 위젯 설정 지원.

### 프로젝트 컨텍스트 필터링
Library 탭(Skills/Rules/Memory/Hooks)은 선택된 `project_id`로 서버 필터링:
```
GET /api/agent-rules?project_id=<id>
```

### 실시간 WebSocket

| 이벤트 | 갱신 대상 |
|--------|-----------|
| `agent_status` | Agents 위젯, Flow Graph 위젯 |
| `task_update` | Tasks 위젯, Alerts 위젯 |
| `cli_output` | TerminalPanel 드로어 |
| `decision_request` | Alerts 위젯 → DecisionInboxModal |

### 다국어 지원
한국어·영어·일본어·중국어 4개 언어.

---

## 10. 파일 위치 빠른 참조

```
src/
├── App.tsx
├── components/
│   ├── desktop/
│   │   ├── Desktop.tsx              # 바탕화면 루트
│   │   ├── MenuBar.tsx              # 상단 메뉴바
│   │   ├── DesktopIcon.tsx          # 데스크톱 아이콘
│   │   ├── Dock.tsx                 # 하단 Dock
│   │   ├── Widget.tsx               # 위젯 공통 컨테이너
│   │   ├── WidgetPicker.tsx         # 위젯 추가 선택 팝업
│   │   └── widgets/
│   │       ├── AgentsWidget.tsx     # Heartbeat Monitor 대체
│   │       ├── TasksWidget.tsx      # Task Board 대체
│   │       ├── AlertsWidget.tsx     # 요주의 알림
│   │       ├── CliCostWidget.tsx    # CLI Usage 대체
│   │       └── FlowGraphWidget.tsx  # Flow Graph 대체
│   ├── windows/
│   │   ├── WorkflowWindow.tsx       # ⚡ Dock 앱 창
│   │   ├── LibraryWindow.tsx        # 📚 Dock 앱 창
│   │   ├── SettingsWindow.tsx       # ⚙ Dock 앱 창
│   │   ├── ChatWindow.tsx           # 💬 Dock 앱 창
│   │   ├── AgentManagerWindow.tsx   # 👤 아이콘 앱 창
│   │   └── ReplWindow.tsx           # >_ 아이콘 앱 창 (Agent REPL)
│   ├── flow-graph/                  # AgentFlowGraph (위젯에서 재사용)
│   ├── workflow-builder/            # WorkflowBuilder (@xyflow/react)
│   ├── scheduled-tasks/             # ScheduledTasksPanel
│   ├── taskboard/                   # CreateTaskModal, BulkHideModal
│   ├── deliverables/                # Deliverables, TextPreviewModal
│   ├── agent-manager/               # AgentFormModal, DepartmentFormModal
│   ├── skills-library/              # Skills + 학습 모달
│   ├── agent-rules/                 # Rules + 학습 모달
│   ├── memory/                      # Memory + 학습 모달
│   ├── hooks/                       # Hooks + 학습 모달
│   ├── settings/                    # Settings 탭들
│   └── ui/                          # ConfirmDialog 등 공용
└── store/
    ├── uiStore.ts                   # openWindows, widgetLayout, desktopIconLayout
    ├── agentStore.ts
    ├── taskStore.ts
    └── projectStore.ts
```
