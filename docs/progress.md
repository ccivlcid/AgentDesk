# AgentDesk — Development Progress

> **Rule**: This document is updated every time work is completed or a phase transitions.
> Last updated: 2026-03-07 (AI 인사이트 위젯 DashboardInsights, Slack/Discord 웹훅 연동 — DB/API/Settings UI/자동 트리거 완료)

---

## Overall Status

| Layer | Status | Phase |
|---|---|---|
| Design System (CSS variables + global styles) | DONE | Phase 0 complete |
| FM2024 UI Components | DONE | Phase 3 complete |
| App Shell (Header, Sidebar) | DONE | Phase 1 complete |
| Agent Persona System | DONE | Phase 4 complete |
| Office View — Tower Redesign | DONE | Phase 5 complete |
| Boot Screen | DONE | — |

---

## Phase 0 — Design System Foundation

### CSS Variables & Global Styles

| Task | File | Status |
|---|---|---|
| FM2024 dark palette (`--th-*` variables) | `index.part01.css` | DONE |
| Light theme (GitHub Light style) | `index.part01.css` | DONE |
| Body background: flat navy (no radial gradient) | `index.part01.css` | DONE |
| Utility classes: `.font-stat`, `.mono-label`, `.status-badge` | `index.part01.css` | DONE |
| FM2024 component CSS: `.fm-panel`, `.fm-attr-bar`, `.fm-tabs`, `.fm-feed-item` | `index.part03.css` | DONE |
| Terminal zone CSS: `.terminal-zone`, `.terminal-zone-*` | `index.part03.css` | DONE |
| Status badge system: `.status-badge-running/idle/error/paused/done` | `index.part03.css` | DONE |
| Boot screen classes | `index.part03.css` | DONE |
| Terminal cursor blink animation | `index.part03.css` | DONE |
| Header button: amber terminal style | `index.part04.css` | DONE |
| Toggle switch: linear timing | `index.part05.css` | DONE |
| Task card hover: border-only (no box-shadow) | `index.part05.css` | DONE |
| Amber/green pulse keyframes | `index.part03.css` | DONE |

### Boot Screen

| Task | File | Status |
|---|---|---|
| Rewrite AppLoadingScreen with Framer Motion | `src/app/AppLoadingScreen.tsx` | DONE |
| Stagger boot lines (0.13s each) | `src/app/AppLoadingScreen.tsx` | DONE |
| FM2024 navy background + JetBrains Mono | `src/app/AppLoadingScreen.tsx` | DONE |

### Documentation

| Doc | Status |
|---|---|
| `docs/design-system.md` | DONE (main reference) |
| `docs/agent-persona-system.md` | DONE |
| `docs/office-view-tower-redesign.md` | DONE |
| `docs/ui-differentiation-strategy.md` | DONE (existing) |
| `docs/progress.md` (this file) | DONE |

### Dependencies

| Package | Status |
|---|---|
| `framer-motion ^12.35.0` | INSTALLED |

---

## Phase 1 — App Shell FM2024 Style

**Goal**: AppHeaderBar + Sidebar match FM2024 management sim aesthetic.

| Task | File | Status |
|---|---|---|
| AppHeaderBar: FM2024 flat tab bar (amber underline active) | `index.part04.css` | DONE |
| AppHeaderBar: `> viewTitle` amber prompt prefix | `index.part04.css` | DONE |
| Sidebar: amber active state (blue → amber full conversion) | `index.part04.css` | DONE |
| Sidebar: amber left-border on brand section | `index.part04.css` | DONE |
| Sidebar: `DEPARTMENTS` section label → amber mono font | `index.part04.css` | DONE |
| Sidebar: nav items mono font, linear timing, no translate hover | `index.part04.css` | DONE |
| Sidebar: brand icon amber color | `src/components/Sidebar.tsx` | DONE |

---

## Phase 2 — Dashboard FM2024 Style

**Goal**: Dashboard home matches FM2024 overview screen.

| Task | File | Status |
|---|---|---|
| CollapsibleSection: FM2024 panel header (amber left border, `▶` chevron) | `dashboard/CollapsibleSection.tsx` | DONE |
| HeroHeader: sharp corners, amber CTA button, amber briefing badge | `dashboard/HeroSections.tsx` | DONE |
| HudStats: FM2024 stat cards (left color border, mono labels, no shadow) | `dashboard/HeroSections.tsx` | DONE |
| DeptPerformance: sharp corners, flat progress bar | `dashboard/OpsSections.tsx` | DONE |
| Squad: sharp avatar borders, green badge flat | `dashboard/OpsSections.tsx` | DONE |
| MissionLog articles: sharp corners | `dashboard/OpsSections.tsx` | DONE |
| Dashboard MISSIONS color: blue → cyan | `Dashboard.tsx` | DONE |
| Section right badges: mono font, sharp | `Dashboard.tsx` | DONE |
| "Active Personas" widget | Dashboard | DONE |

---

## Phase 3 — Agent & Task FM2024 Style

**Goal**: AgentCard, AgentList, TaskBoard match FM2024 squad/attribute screen.

| Task | File | Status |
|---|---|---|
| AgentCard: FM2024 player card style (sharp 4px, left accent bar) | `agent-manager/AgentCard.tsx` | DONE |
| AgentCard: `[RUNNING]`/`[IDLE]` status badge | `agent-manager/AgentCard.tsx` | DONE |
| AgentCard: ACTIVITY attribute bar (FM style) | `agent-manager/AgentCard.tsx` | DONE |
| AgentsTab: summary stats — mono font, sharp corners | `agent-manager/AgentsTab.tsx` | DONE |
| AgentsTab: dept filter tabs — mono font, amber underline | `agent-manager/AgentsTab.tsx` | DONE |
| fm-agent-card hover CSS | `index.part03.css` | DONE |
| AgentCard: PersonaBadge slot `[JOBS]` | `agent-manager/AgentCard.tsx` | DONE |
| TaskCard: FM2024 style — sharp corners, status left border | `taskboard/TaskCard.tsx` | DONE |
| TaskCard: `#id` task number prefix, mono badges | `taskboard/TaskCard.tsx` | DONE |
| TaskCard: blue → amber (subtask bar, resume, restore, gate badge) | `taskboard/TaskCard.tsx` | DONE |
| FilterBar: FM2024 flat inputs/selects (mono font, 2px radius) | `taskboard/FilterBar.tsx` | DONE |
| TaskCard: PersonaBadge display | TaskCard component | DONE |
| Terminal zone in task detail | `taskboard/TaskCard.tsx` | DONE |

---

## Phase 4 — Agent Persona System

**Goal**: Persona catalog + agent creation integration.

### Backend / Data

| Task | File | Status |
|---|---|---|
| Persona catalog metadata (10 MVP) + prompts (all inline) | `src/data/personas/index.ts` | DONE |
| `persona_id` on Agent type | `src/types/index.ts` | DONE |
| `persona_id` on FormData | `src/components/agent-manager/types.ts` | DONE |
| AgentCard: PersonaBadge slot | `src/components/agent-manager/AgentCard.tsx` | DONE |
| DB migration: `persona_id` on agents table | `server/modules/bootstrap/schema/task-schema-migrations.ts` | DONE |
| API: `GET /api/personas` | `server/modules/routes/core/agents/crud.ts` | DONE |
| API: agent create/update with `persona_id` | `server/modules/routes/core/agents/crud.ts` | DONE |
| System prompt injection logic | `server/modules/workflow/core/character-persona.ts` + `persona-catalog.ts` | DONE |

### UI Components

| Task | File | Status |
|---|---|---|
| `PersonaBadge.tsx` — `[JOBS]` inline badge | `src/components/agent-persona/PersonaBadge.tsx` | DONE |
| `PersonaCard.tsx` — catalog card | `src/components/agent-persona/PersonaCard.tsx` | DONE |
| `PersonaCatalog.tsx` — category filter + grid | `src/components/agent-persona/PersonaCatalog.tsx` | DONE |
| `PersonaDetailPanel.tsx` — traits + best-for | `src/components/agent-persona/PersonaDetailPanel.tsx` | SKIPPED (merged into PersonaCard) |
| `AgentFormModal.tsx` — persona selection step + amber fix | `src/components/agent-manager/AgentFormModal.tsx` | DONE |

---

## Phase 5 — Office View Tower Redesign

**Goal**: Replace flat grid layout with cross-section building tower.

### Model & Types

| Task | File | Status |
|---|---|---|
| New constants (FLOOR_W, WALL_W, ELEVATOR_W, PENTHOUSE_H, etc.) | `model.ts` | DONE |
| `ElevatorState` interface | `model.ts` | DONE |
| `RoomRect` — add floorIndex, isElevator, isPenthouse | `model.ts` | DONE |
| Updated totalH / officeW formula | `buildScene.ts` 에서 구현됨 | DONE |

### Rendering

| Task | File | Status |
|---|---|---|
| `drawRoof.ts` — helipad, antenna, sign | new file | DONE |
| `drawPenthouse.ts` — CEO grand desk, lounge | new file | DONE |
| `drawFloor.ts` — per-floor agent slots + hallway | new file | DONE |
| `drawBasement.ts` — break room basement aesthetic | new file | DONE |
| `drawElevator.ts` — shaft, car, button panel | new file | DONE |
| `drawExteriorWalls()` — windows, fire escape | `office-view/drawExteriorWalls.ts` | DONE |
| Rewrite `buildScene.ts` layout loop | `buildScene.ts` | DONE |

### Animations

| Task | File | Status |
|---|---|---|
| `elevatorTick.ts` — elevator state machine | `office-view/elevatorTick.ts` | DONE |
| Elevator car movement tick | `officeTicker.ts` | DONE |
| Elevator door open/close 4-frame | `elevatorTick.ts` + `drawElevator.ts` | DONE |
| Exterior window flicker timer | `officeTicker.ts` | DONE |
| Persona badge pulse (agent with persona_id) | `officeTicker.ts` | DONE |
| Delivery walk: hallway strip path | `model.ts` + `officeTickerRoomAndDelivery.ts` | DONE (infrastructure) |

---

## Implementation Order

```
Phase 0 (PARTIAL → complete remaining CSS tweaks)
  ↓
Phase 1 (App Shell) — visible immediate impact
  ↓
Phase 3 (Agent/Task Cards) — core content areas
  ↓
Phase 2 (Dashboard) — overview screen
  ↓
Phase 4 (Persona System) — new feature, backend first
  ↓
Phase 5 (Office Tower) — largest visual overhaul, last
```

---

---

## Phase 6 — Retro Terminal OS Overhaul

**Ref**: `docs/design-retro-terminal-overhaul.md`

### Phase 1 — CSS 변수 & 토큰 교체

| Task | File | Status |
|---|---|---|
| Dark theme: terminal black (`#0c0c0c`) 배경 팔레트 | `index.part01.css` | DONE |
| Dark theme: `--th-border: #2a2a2a` 선명한 테두리 | `index.part01.css` | DONE |
| Dark theme: `--th-text-*` 터미널 화이트 계열 | `index.part01.css` | DONE |
| Light theme: 크림 페이퍼 (`#f5f0e8`) 팔레트 | `index.part01.css` | DONE |
| Light theme: Tailwind 오버라이드 크림 계열로 업데이트 | `index.part01.css` | DONE |

### Phase 2 — 글로벌 컴포넌트 스타일

| Task | File | Status |
|---|---|---|
| Header: `backdrop-blur-xl` 제거, 높이 56px→44px | `AppHeaderBar.tsx` | DONE |
| `.fm-panel` border-radius 6px→4px | `index.part03.css` | DONE |
| `.terminal-zone` border-radius 4px | `index.part03.css` | DONE |
| Global: `backdrop-blur-xl/2xl` CSS override 제거 | `index.part03.css` | DONE |
| Input focus: amber glow 포커스 링 | `index.part03.css` | DONE |
| Terminal empty state CSS 클래스 | `index.part03.css` | DONE |
| AgentDetail modal: glassmorphism → flat terminal window | `AgentDetail.tsx` | DONE |
| DecisionInboxModal: glassmorphism → flat terminal window | `DecisionInboxModal.tsx` | DONE |
| TaskBoard 빈 상태: `$ ls tasks/ (empty)` 터미널 스타일 | `TaskBoard.tsx` | DONE |

### Phase 3 — 빈 상태 & 인터랙션

| Task | File | Status |
|---|---|---|
| Agent 목록 빈 상태: `$ ls agents/` 터미널 스타일 | `AgentsTab.tsx` | DONE |
| Dashboard DeptPerformance 빈 상태 터미널 스타일 | `dashboard/OpsSections.tsx` | DONE |
| Dashboard Squad 빈 상태 터미널 스타일 | `dashboard/HeroSections.tsx` | DONE |
| CliUsagePanel 빈 상태 + 섹션 glassmorphism 제거 | `office-view/CliUsagePanel.tsx` | DONE |
| 전환 속도 linear 100ms 통일 (button/input/a) | `index.part05.css` | DONE |
| Shadow flat (terminal style) 전역 오버라이드 | `index.part05.css` | DONE |
| border-radius 전역 축소: rounded-2xl/xl→4px, 3xl→6px | `index.part05.css` | DONE |
| SkillsHeader/HooksHeader/MemoryHeader/AgentRulesHeader glassmorphism 제거 | 4 header files | DONE |
| HudStats KPI 숫자: `--th-font-display` → `--th-font-mono` (JetBrains Mono) | `dashboard/HeroSections.tsx` | DONE |
| AgentDetailTabContent: glassmorphism → flat terminal, stat 숫자 mono amber | `agent-detail/AgentDetailTabContent.tsx` | DONE |
| AgentPerformancePanel: glassmorphism → flat, 빈 상태 터미널 스타일 | `agent-detail/AgentPerformancePanel.tsx` | DONE |
| 전역 glassmorphism CSS 오버라이드 (~77 파일 커버): `bg-slate-7/8/9xx` → CSS var | `index.part05.css` | DONE |
| 전역 text-slate 오버라이드: `text-slate-200~600` → CSS var | `index.part05.css` | DONE |

### Office View 추가 (Pixel Art Office Layer)

| Task | File | Status |
|---|---|---|
| Cross-section cut 효과: 캔버스 좌우상단 amber 3px 테두리 | `OfficeView.tsx` | DONE |
| 안테나 LED 3-frame 점멸 (on→dim→off, 50tick 주기) | `drawRoof.ts` + `officeTicker.ts` | DONE |

---

---

## Phase 7 — Office View FM UI Wrapper

**Goal**: 픽셀아트 캔버스를 FM2024 Match View 구조로 감싼다.
**Ref**: `docs/office-view-tower-redesign.md` Section 9

### Layout Shell (OfficeView.tsx 재구성)

| Task | File | Status |
|---|---|---|
| OfficeView 최상위: 3-컬럼 + 툴바 + 액션바 레이아웃 | `src/components/OfficeView.tsx` | DONE |
| 좌 패널 (부서 목록, CLI 사용량): `OfficeDeptPanel.tsx` 신규 | `office-view/OfficeDeptPanel.tsx` | DONE |
| 우 패널 (에이전트/부서 상세): `OfficeAgentPanel.tsx` 신규 | `office-view/OfficeAgentPanel.tsx` | DONE |
| 상단 툴바: OfficeView 내 인라인 | `OfficeView.tsx` | DONE |
| 하단 액션바: OfficeView 내 인라인 | `OfficeView.tsx` | DONE |

### Left Panel — Department List

| Task | File | Status |
|---|---|---|
| 부서 아이템: 이름 + "N agents · N running" + 활동바 | `OfficeDeptPanel.tsx` | DONE |
| 선택 상태: amber left-border, bg surface | `OfficeDeptPanel.tsx` | DONE |
| CLI 사용량 섹션: 최고 provider 사용률 + amber 진행바 + REFRESH 버튼 | `OfficeDeptPanel.tsx` | DONE |
| 부서 선택 시 우측 패널 연동 | `OfficeView.tsx` | DONE |

### Right Panel — Agent / Dept Info

| Task | File | Status |
|---|---|---|
| 빈 상태: `$ select agent` 터미널 스타일 | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 선택 뷰: 이름 + 역할 + 상태 배지 + AttributeBar × 3 (Activity/Output/XP) | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 선택 뷰: 태스크 미니 리스트 (max 3) + VIEW PROFILE 버튼 | `OfficeAgentPanel.tsx` | DONE |
| 부서 선택 뷰: Dept Stats + 에이전트 미니 리스트 + VIEW DEPT 버튼 | `OfficeAgentPanel.tsx` | DONE |
| 픽셀아트 캔버스 클릭 → 우 패널 연동 (handleCanvasSelectAgent/Dept) | `OfficeView.tsx` | DONE |

### Toolbar & Action Bar

| Task | File | Status |
|---|---|---|
| 툴바: 44px, breadcrumb + Season/Style ghost 버튼 | `OfficeView.tsx` | DONE |
| 액션바: 32px, Run/Stats/Alerts + running count 표시 | `OfficeView.tsx` | DONE |

### CSS

| Task | File | Status |
|---|---|---|
| `.office-screen`, `.office-toolbar`, `.office-body`, `.office-left`, `.office-canvas-wrap`, `.office-right`, `.office-actionbar` | `index.part03.css` | DONE |
| `.office-dept-item`, `.office-attr-row`, `.office-task-row`, `.office-panel-btn`, `.office-empty` 등 | `index.part03.css` | DONE |
| 반응형: ≥1280px full, <1280 우패널 숨김, <1024 좌패널 숨김 | `index.part03.css` | DONE |

### Documentation

| Task | File | Status |
|---|---|---|
| `docs/DESIGN.md` 전면 재작성 (영문, FM2024 스타일) | `docs/DESIGN.md` | DONE |
| `docs/design-system.md` 레이어 테이블 + Office View 섹션 추가 | `docs/design-system.md` | DONE |
| `docs/office-view-tower-redesign.md` Section 9 FM UI Wrapper 추가 | `docs/office-view-tower-redesign.md` | DONE |

---

---

## Phase 8 — Global CSS Polish & Layout Fixes

| Task | File | Status |
|---|---|---|
| AppMainLayout: `<main>` flex-col + office view flex-1 min-h-0 wrapper | `AppMainLayout.tsx` | DONE |
| OfficeView: `onOpenRoomManager` prop 연결 (Season/Style 툴바 버튼) | `model.ts` + `OfficeView.tsx` + `AppMainLayout.tsx` | DONE |
| `.office-screen` CSS: `height: 100%` → `flex: 1` (flex 안전성) | `index.part03.css` | DONE |
| Framer Motion: 좌/우 패널 slide-in 애니메이션 (`x: ±16 → 0`) | `OfficeView.tsx` | DONE |
| Framer Motion: 우측 패널 AgentView/DeptView 전환 AnimatePresence fade | `OfficeAgentPanel.tsx` | DONE |
| CSS: `bg-slate-900/800/700/600` solid 글로벌 오버라이드 추가 | `index.part05.css` | DONE |
| CSS: `border-slate-700/600/500` solid 글로벌 오버라이드 추가 | `index.part05.css` | DONE |
| CSS: `text-white`, `text-slate-100` 글로벌 오버라이드 추가 | `index.part05.css` | DONE |
| CSS: `backdrop-blur-sm/md` 제거 (flat design) | `index.part05.css` | DONE |
| `docs/DESIGN.md` 전면 재작성 (영문, FM2024 스타일) | `docs/DESIGN.md` | DONE |

---

## Phase 9 — Chat Panel Polish + Global Blue→Amber

| Task | File | Status |
|---|---|---|
| ChatComposer: 기본 모드 focus border blue→amber | `chat-panel/ChatComposer.tsx` | DONE |
| ChatComposer: Task 모드 버튼/focus/send 버튼 amber | `chat-panel/ChatComposer.tsx` | DONE |
| ChatMessageList: CEO 발화 버블 blue→amber | `chat-panel/ChatMessageList.tsx` | DONE |
| ChatModeHint: Task 모드 힌트 텍스트 blue→amber | `chat-panel/ChatModeHint.tsx` | DONE |
| 전역 bg-blue-600/500/700 → amber CSS override (49개 파일 일괄) | `index.part05.css` | DONE |
| 전역 hover:bg-blue-*, border-blue-*, focus:ring-blue-500 → amber | `index.part05.css` | DONE |

---

## Phase 10 — View Transitions + Scanline Polish

| Task | File | Status |
|---|---|---|
| 뷰 전환 AnimatePresence fade (office ↔ 일반 뷰, 100ms linear) | `AppMainLayout.tsx` | DONE |
| Scanline overlay (dark theme only, 4px pitch, 4% opacity) | `index.part01.css` | DONE |
| AgentsTab 카드 그리드 stagger (0.04s, dept/search 변경 시 재트리거) | `agent-manager/AgentsTab.tsx` | DONE |
| DashboardHudStats KPI 카드 stagger (0.06s) | `dashboard/HeroSections.tsx` | DONE |
| Dashboard 섹션 mount fade-in (14ms linear) | `Dashboard.tsx` | DONE |
| TaskBoard mount fade-in (12ms linear) | `TaskBoard.tsx` | DONE |
| AgentManager mount fade-in (12ms linear) | `AgentManager.tsx` | DONE |
| OfficeView 캔버스 레이아웃 수정: circular width ref 제거, office-canvas-frame 도입 | `OfficeView.tsx` + `index.part03.css` | DONE |

## Phase 11 — Office View Pixel Art Redesign (Identity Overhaul)

| Task | File | Status |
|---|---|---|
| Penthouse: 둥근 emoji 통계 카드 → 터미널 데이터 스트립 (CEO + STAFF/ACTIVE/TASKS/DONE) | `drawPenthouse.ts` | DONE |
| Penthouse: bunting 장식 깃발 제거 (open-source 감성) | `drawPenthouse.ts` | DONE |
| Penthouse: roundRect border → sharp rect + amber left accent bar | `drawPenthouse.ts` | DONE |
| Penthouse: 회의 테이블 roundRect → sharp rect + amber inlay line | `drawPenthouse.ts` | DONE |
| Penthouse: 회의 테이블 label "6인 협업 테이블" → "CONF" / "[ MEETING ]" | `drawPenthouse.ts` | DONE |
| Floor: roundRect border → sharp rect + amber left bar + amber top line | `drawFloor.ts` | DONE |
| Floor: 부서 표지판 둥근 pill → 터미널 다크 bg + amber monospace text | `drawFloor.ts` | DONE |
| Floor: 층수 표시 "FL.01" → "NODE-01" | `drawFloor.ts` | DONE |
| 색상 팔레트 전면 개편: 부서별 독자적 터미널 팔레트, CEO/Break amber/green | `themes-locale.ts` | DONE |
| drawTiledFloor: 체커보드 → PCB 터미널 그리드 (solid base + scan lines + grid + solder dots + circuit traces) | `drawing-core.ts` | DONE |
| drawWindow: 코지 나무 창문 → 터미널 데이터 모니터 (bezel + scan lines + data bars + status LED) | `drawing-core.ts` | DONE |
| Roof sign: "AGENTDESK HQ" → "[ AGENTDESK // MISSION CTRL ]" terminal bar | `drawRoof.ts` | DONE |
| Roof: 헬리패드 H → 위성/신호 타워 (arc rings + mast + base + amber tip) | `drawRoof.ts` | DONE |
| Basement: bunting → 터미널 status bar strip | `drawBasement.ts` | DONE |
| Basement: 체커보드 하단 바닥 → PCB 그리드 | `drawBasement.ts` | DONE |
| Basement: "B1 · BREAK ROOM" 둥근 amber pill → 터미널 다크 rect label | `drawBasement.ts` | DONE |
| Basement: chat bubble 흰 둥근 → 다크 rect + amber border + 초록 텍스트 | `drawBasement.ts` | DONE |
| Basement: name tag 흰 둥근 → 다크 rect + accent text | `drawBasement.ts` | DONE |
| Exterior windows: roundRect → sharp rect + CRT scan line | `drawExteriorWalls.ts` | DONE |
| Agent name tag: 흰 roundRect + system-ui → 다크 rect + amber accent bar + monospace | `drawFloor.ts` | DONE |
| Agent role tag: 둥근 amber pill → sharp rect + muted monospace | `drawFloor.ts` | DONE |
| Break-away tag: roundRect → sharp rect + accent left bar | `drawFloor.ts` | DONE |
| Wall poster decor: roundRect → 터미널 데이터 포스터 (dark + data bars) | `drawFloor.ts` | DONE |
| drawPictureFrame: 나무 액자 → 회로 schematic (circuit traces + node dots) | `drawing-core.ts` | DONE |
| drawRug: 둥근 카펫 → 데이터 존 마커 (zone indicator + corner pads) | `drawing-core.ts` | DONE |
| drawWallClock: 흰 아날로그 → 다크 터미널 시계 (amber hour, green minute, dark face) | `drawing-core.ts` | DONE |
| drawTrashCan: 둥근 → 서버 discard bin (dark metal + red status lines) | `drawing-core.ts` | DONE |
| drawWaterCooler: 둥근 → 서버 쿨런트 유닛 (dark + LED + coolant level) | `drawing-core.ts` | DONE |
| drawDesk: 나무 워크스테이션 → 다크 메탈 터미널 데스크 (dark metal + amber LED + terminal monitor) | `drawing-furniture-a.ts` | DONE |
| CEO name badge: 황금 roundRect → 다크 rect + amber accent bar | `buildScene-final-layers.ts` | DONE |
| drawBookshelf: 무지개색 도서 + 나무 선반 → 다크 서버 랙 + 데이터 카트리지 + LED | `drawing-furniture-b.ts` | DONE |
| drawHighTable: 나무 라운드 → 다크 메탈 패널 + amber accent + LED | `drawing-furniture-b.ts` | DONE |
| drawVendingMachine: 파스텔 자판기 → 다크 터미널 디스펜서 + LED 그리드 | `drawing-furniture-b.ts` | DONE |
| drawCoffeeMachine: 따뜻한 스틸 바디 → 다크 메탈 + amber/green LED 버튼 | `drawing-furniture-b.ts` | DONE |
| CEO 픽셀 로봇 캐릭터: PNG 스프라이트 완전 교체 → PixiJS custom 터미널 로봇 | `buildScene-final-layers.ts` | DONE |
| CEO 키: 우관/안테나 bob 위치 조정 (-30) | `officeTicker.ts` | DONE |
| drawWhiteboard: 흰 보드 + 컬러 마커 → 다크 터미널 디스플레이 (amber/green data lines) | `drawing-furniture-a.ts` | DONE |
| drawPlant: 테라코타 화분 → 다크 콘크리트 화분 + amber accent band | `drawing-furniture-a.ts` | DONE |
| 에이전트 스프라이트: 쿨 블루 틴트 적용 (0xd8e8ff) — 터미널 팔레트 조화 | `buildScene-department-agent.ts` | DONE |
| 에이전트 서브클론 스프라이트: 쿨 블루 틴트 적용 (0xd0e0ff) | `buildScene-department-agent.ts` | DONE |
| 태스크 말풍선: 흰 roundRect → 다크 rect + amber 테두리 + green monospace 텍스트 | `buildScene-department-agent.ts` | DONE |
| 침대(Rest pod): 나무/크림 → 다크 터미널 rest pod + scan lines | `buildScene-department-agent.ts` | DONE |
| 복도(Hallway): 따뜻한 베이지 → 다크 네이비 + amber 하단 구분선 | `drawFloor.ts` | DONE |
| 휴게실 소파: 핑크/민트 → 다크 네이비/다크 그린 (0x1e2a3a / 0x1a2e28) | `buildScene-break-room.ts`, `drawBasement.ts` | DONE |

---

---

## Phase 12 — Office View FM Interface & Live System (Autonomous Enhancement)

**Goal**: 인터페이스 FM2024 매치뷰 수준으로 고도화, 건물 생동감 향상.

| Task | File | Status |
|---|---|---|
| 엘리베이터 → 부서 선택 시 자동 이동 (`handleCanvasSelectDept`) | `OfficeView.tsx` | DONE |
| 부서 패널 LIFT 버튼 → 엘리베이터 독립 호출 | `OfficeDeptPanel.tsx` + `OfficeView.tsx` | DONE |
| 엘리베이터 패널 층 LED: 현재층 amber pulse, 활성층 green, 비활성 dim | `drawElevator.ts` + `officeTicker.ts` | DONE |
| 엘리베이터 이동 중 방향+목표층 표시 (`^F2`, `vB1` 등) | `elevatorTick.ts` | DONE |
| FM 이벤트 티커 — 스크롤 텍스트 + 블링킹 LIVE dot | `OfficeView.tsx` + `index.part03.css` | DONE |
| FM 툴바 센터 스탯 칩 (RUNNING / TASKS / VISITING / SEASON) | `OfficeView.tsx` | DONE |
| FM 액션바 세분화 (AGT/TSK/DEPT/BREAK/VISIT 스탯) | `OfficeView.tsx` | DONE |
| 부서 패널 FM 속성바: ACT + 에이전트 현황 (W/I/B) | `OfficeDeptPanel.tsx` | DONE |
| 에이전트 패널 OVR 배지 (FM2024 선수카드 스타일) | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 5개 속성바 (Activity/Output/XP Lvl/Reliab./Teamwk) | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 Form 히스토리 (최근 5 태스크 색상 박스) | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 XP 레벨 배지 + 다음 레벨 프로그레스바 | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 CLI 프로바이더 배지 | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 부서 이름/아이콘 표시 | `OfficeAgentPanel.tsx` | DONE |
| 에이전트 패널 VISITING 배지 (외출 중인 에이전트 표시) | `OfficeAgentPanel.tsx` | DONE |
| 부서 패널 Roster: AWAY 배지 (외출 중 에이전트 dim + AWAY) | `OfficeAgentPanel.tsx` | DONE |
| 우패널 빈 상태 → HQ Overview (순위표 + 부서 랭킹 + 글로벌 스탯) | `OfficeAgentPanel.tsx` | DONE |
| 우패널 CEO GUEST INCOMING 알림 배너 | `OfficeAgentPanel.tsx` + `OfficeView.tsx` | DONE |
| 방문자 시스템: 에이전트 부서 간 이동 스테이트머신 (12단계) | `visitorTick.ts` | DONE |
| 방문자 스프라이트: 이름태그 + 목적지 배지 + 채팅 버블 + 방향 전환 | `visitorTick.ts` | DONE |
| 방문자 폴링 1s (이전 3s) — 빠른 UI 업데이트 | `OfficeView.tsx` | DONE |
| 부서 패널 방문자 입장 배지 (`↓N`) | `OfficeDeptPanel.tsx` + `OfficeView.tsx` | DONE |
| 층 LED: 근무 중 에이전트 있는 층 green glow | `officeTicker.ts` | DONE |
| 방문자 최대 3명으로 확대 (이전 2), 스폰 간격 300tick | `visitorTick.ts` | DONE |
| 층 배경 activity glow (근무 에이전트 있는 층 green pulse) | `buildScene.ts` + `buildScene-types.ts` + `officeTicker.ts` | DONE |
| CEO 펜트하우스 "▲ VISITOR INBOUND" PixiJS 블링크 텍스트 | `buildScene.ts` + `buildScene-types.ts` + `officeTicker.ts` | DONE |
| 툴바 실시간 시계 HH:MM (1s 업데이트) | `OfficeView.tsx` | DONE |
| 부서 패널 태스크 요약 (▶N ACTIVE · ✓N DONE) | `OfficeDeptPanel.tsx` + `OfficeView.tsx` | DONE |
| HQ Overview: 총 XP + AGT/DEPT 수 요약 | `OfficeAgentPanel.tsx` | DONE |
| DeptView: 활성 태스크 수 (TSK) 추가 | `OfficeAgentPanel.tsx` | DONE |
| OVR 산정식 개선: 5개 속성 평균 (이전 3개) | `OfficeAgentPanel.tsx` | DONE |
| FM 티커 고도화: 용량%, 부서 리더, XP 챔피언, 태스크 처리율 | `OfficeView.tsx` | DONE |
| 외벽 창문 flicker: roundRect→rect 버그 픽스 + 층 활성도 반영 (활성층 75% 점등) | `drawExteriorWalls.ts` + `officeTicker.ts` | DONE |
| ExteriorWindowVisual: floorIdx 추가 (활성층 창문 밝게 유지) | `drawExteriorWalls.ts` | DONE |
| HQ Overview: 태스크 완료율 바 (TASK progress bar) | `OfficeAgentPanel.tsx` | DONE |

## Phase 13 — FM2024 Component Deep Overhaul (File-by-File)

**Goal**: 모든 컴포넌트에서 Tailwind 하드코딩 색상(`slate-*`, `blue-*`, `gray-*`) 및 `rounded-lg/xl/md` 완전 제거 → `--th-*` CSS 변수 + 2px border-radius 통일.

**변환 규칙 (공식)**:
- Active/선택 → `border: 1px solid rgba(251,191,36,0.5)`, `background: rgba(251,191,36,0.1)`, `color: var(--th-accent)`
- Emerald/성공 → `border: rgba(52,211,153,0.5)`, `background: rgba(52,211,153,0.15)`, `color: rgb(167,243,208)`
- Rose/위험 → `border: rgba(244,63,94,0.35)`, `background: rgba(244,63,94,0.08)`, `color: rgb(253,164,175)`
- Purple/보조 → `border: rgba(167,139,250,0.4)`, `background: rgba(167,139,250,0.1)`, `color: rgb(196,181,253)`
- 버튼: `borderRadius: "2px"`, 모달 패널: `borderRadius: "4px"`, 원형 요소: `borderRadius: "50%"`
- 모든 텍스트 레이블: `font-mono` 추가
- TSC 검증: 매 배치 후 `npx tsc --noEmit` 통과 필수

### 완료 파일

| File | 매치 수 | Status |
|---|---|---|
| `deliverables/DeliverableCard.tsx` | ~20 | ✅ DONE |
| `deliverables/GitSection.tsx` | ~15 | ✅ DONE |
| `deliverables/CollaboratorSection.tsx` | ~12 | ✅ DONE |
| `deliverables/ArtifactList.tsx` | ~18 | ✅ DONE |
| `deliverables/TextPreviewModal.tsx` | ~10 | ✅ DONE |
| `deliverables/Deliverables.tsx` | ~8 | ✅ DONE |
| `taskboard/GanttChart.tsx` | ~25 | ✅ DONE |
| `chat-panel/ChatMessageList.tsx` | ~30 | ✅ DONE |
| `chat-panel/ChatPanelHeader.tsx` | 8 | ✅ DONE |
| `ChatPanel.tsx` | 1 | ✅ DONE |
| `agent-manager/AgentFormModal.tsx` | 1 | ✅ DONE |
| `chat-panel/ChatComposer.tsx` | ~20 | ✅ DONE |
| `chat-panel/ProjectFlowDialog.tsx` | 28 | ✅ DONE |
| `AgentSelect.tsx` | ~15 | ✅ DONE |
| `TerminalPanel.tsx` | ~40 | ✅ DONE |
| `skills-library/CustomSkillModal.tsx` | ~25 | ✅ DONE |
| `OfficeRoomManager.tsx` | 120 | ✅ DONE |
| `github-import/GitHubImportWizard.tsx` | 50 | ✅ DONE |
| `github-import/GitHubDeviceConnect.tsx` | 12 | ✅ DONE |

### 대기 파일 (우선순위 순)

**Settings 그룹** (자주 노출, 고우선순위):

| File | 매치 수 | Priority |
|---|---|---|
| `settings/OAuthConnectCards.tsx` | 13 | ✅ DONE |
| `settings/gateway-settings/ChannelGuideModal.tsx` | 16 | ✅ DONE |
| `settings/GitHubOAuthAppConfig.tsx` | 8 | ✅ DONE |
| `settings/gateway-settings/ChatEditorModal.tsx` | 6 | ✅ DONE |
| `settings/OAuthSettingsTab.tsx` | 3 | ✅ DONE |
| `settings/ApiAssignModal.tsx` | 4 | ✅ DONE |
| `settings/GatewaySettingsTab.tsx` | 2 | ✅ DONE |

**Library/Modal 그룹**:

| File | 매치 수 | Priority |
|---|---|---|
| `agent-rules/AgentRulesGrid.tsx` | 4 | MED |
| `agent-rules/AgentRulesCategoryBar.tsx` | 5 | MED |
| `agent-rules/AgentRulesScopeBar.tsx` | 3 | MED |
| `agent-rules/RuleFormModal.tsx` | 1 | LOW |
| `agent-rules/RuleLearningModal.tsx` | 3 | LOW |
| `agent-rules/RuleMemorySection.tsx` | 3 | LOW |
| `agent-rules/model.tsx` | 7 | LOW |
| `memory/MemoryGrid.tsx` | 4 | MED |
| `memory/MemoryScopeBar.tsx` | 3 | MED |
| `memory/MemoryCategoryBar.tsx` | 5 | MED |
| `memory/MemoryFormModal.tsx` | 1 | LOW |
| `memory/MemoryLearningModal.tsx` | 3 | LOW |
| `memory/MemoryMemorySection.tsx` | 3 | LOW |
| `memory/MemoryHistoryPanel.tsx` | 3 | LOW |
| `memory/model.tsx` | 6 | LOW |
| `hooks/HooksGrid.tsx` | 4 | ✅ DONE |
| `hooks/HooksEventTypeBar.tsx` | 5 | MED |
| `hooks/HookFormModal.tsx` | 2 | LOW |
| `hooks/HookLearningModal.tsx` | 3 | LOW |
| `hooks/HookMemorySection.tsx` | 3 | LOW |
| `hooks/model.tsx` | 6 | LOW |
| `skills-library/SkillsGrid.tsx` | 2 | MED |
| `skills-library/SkillsCategoryBar.tsx` | 5 | MED |
| `skills-library/LearningModal.tsx` | 3 | LOW |
| `skills-library/SkillsMemorySection.tsx` | 3 | LOW |
| `skills-library/ClassroomOverlay.tsx` | 2 | LOW |
| `skills-library/CustomSkillSection.tsx` | 3 | LOW |
| `skills-library/model.tsx` | 9 | LOW |
| `AgentRulesLibrary.tsx` | 5 | MED |
| `MemoryLibrary.tsx` | 5 | MED |
| `HooksLibrary.tsx` | 5 | MED |
| `SkillsLibrary.tsx` | 5 | MED |

**Game Room 그룹** (낮은 노출 빈도):

| File | 매치 수 | Priority |
|---|---|---|
| `game-room/TicTacToe.tsx` | 15 | ✅ DONE |
| `game-room/GameResult.tsx` | 14 | ✅ DONE |
| `game-room/Tetris.tsx` | 20 | ✅ DONE |
| `game-room/RockPaperScissors.tsx` | 15 | ✅ DONE |
| `game-room/MemoryMatch.tsx` | 12 | ✅ DONE |

> **Phase 13 COMPLETE**: `src/**/*.tsx` 전체 0개 위반 달성 (2026-03-07)

**기타 소파일**:

| File | 매치 수 | Priority |
|---|---|---|
| `agent-manager/EmojiPicker.tsx` | 3 | LOW |
| `agent-manager/DepartmentFormModal.tsx` | 7 | MED |
| `agent-manager/DepartmentsTab.tsx` | 4 | MED |
| `agent-detail/AgentPerformancePanel.tsx` | 3 | MED |
| `agent-detail/AgentDetailTabContent.tsx` | 2 | LOW |
| `MessageContent.tsx` | 4 | MED |
| `TaskReportPopup.tsx` | 5 | MED |
| `ReportHistory.tsx` | 1 | LOW |
| `AgentAvatar.tsx` | 1 | LOW |
| `AgentDetail.tsx` | 3 | LOW |
| `DecisionInboxModal.tsx` | 1 | LOW |
| `TaskBoard.tsx` | 1 | LOW |
| `GitHubImportPanel.tsx` | 1 | LOW |
| `office-view/VirtualPadOverlay.tsx` | 2 | LOW |
| `office-view/UsageTrendChart.tsx` | 7 | MED |
| `office-view/HeartbeatGuideModal.tsx` | 8 | MED |
| `office-view/RoomLayoutEditor.tsx` | 8 | MED |
| `office-view/CliUsagePanel.tsx` | 4 | MED |
| `taskboard/DiffModal.tsx` | 2 | LOW |
| `project-manager/ProjectInsightsPanel.tsx` | 5 | ✅ DONE |
| `project-manager/BurndownChart.tsx` | 4 | MED |
| `project-manager/ManualAssignmentSelector.tsx` | 1 | LOW |
| `scheduled-tasks/ScheduledTasksPanel.tsx` | 4 | MED |

---

## Phase 14 — 기능 고도화 로드맵

**현재 완성도**: UI/UX 고도화 80% 완료. 기능 면에서 추가할 것들.

### 14-1. 에이전트 실시간 상태 강화

| 기능 | 설명 | Priority |
|---|---|---|
| 에이전트 "사고 흐름" 스트리밍 | TerminalPanel에 thinking... 단계 실시간 표시 | ✅ DONE |
| 에이전트 간 DM 채팅 | agent-to-agent 메시지 뷰어 | ✅ DONE |
| 에이전트 성과 히스토리 그래프 | 주간/월간 task 완료율 차트 (AgentPerformancePanel) | ✅ DONE |
| 에이전트 "오늘의 작업 요약" | 일일 자동 리포트 in Dashboard | ✅ DONE |

### 14-2. 태스크 보드 고도화

| 기능 | 설명 | Priority |
|---|---|---|
| 태스크 의존성 그래프 | DAG 뷰어 — 어떤 태스크가 어떤 것에 의존하는지 | ✅ DONE |
| 서브태스크 진행률 바 | 태스크카드에 인라인 서브태스크 트리 | ✅ DONE |
| 태스크 타임라인 뷰 개선 | GanttChart: 현재시각 표시선 + 드래그 날짜 조정 | ✅ DONE |
| 태스크 템플릿 | 자주 쓰는 태스크 패턴 저장/재사용 | ✅ DONE |
| 태스크 일괄 액션 | 체크박스 선택 후 batch assign/stop/delete | ✅ DONE |

### 14-3. 오피스 뷰 인터랙티브 강화

| 기능 | 설명 | Priority |
|---|---|---|
| 에이전트 클릭 → 즉석 채팅 팝업 | 캔버스에서 에이전트 클릭 시 미니 채팅창 | ✅ DONE |
| 층별 부서 드래그&드롭 재배치 | OfficeRoomManager 연동 | MED |
| 실시간 태스크 완료 이펙트 | 태스크 완료 시 캔버스에 파티클 이펙트 | ✅ DONE |
| 엘리베이터 승하차 애니메이션 정교화 | 에이전트 캐릭터가 실제로 탑승/하차하는 스프라이트 | LOW |
| 방문자 에이전트 랜덤 이벤트 | 방문자가 선물 전달, 회의 요청 등 랜덤 이벤트 트리거 | LOW |

### 14-4. 채팅 패널 고도화

| 기능 | 설명 | Priority |
|---|---|---|
| 멀티 에이전트 그룹 채팅 | 여러 에이전트를 한 채널에서 동시 소통 | ✅ DONE |
| 채팅 메시지 핀고정 | 중요 메시지 핀 → 패널 상단 고정 | ✅ DONE |
| 채팅 검색 | 메시지 내 키워드 검색 + 하이라이트 | ✅ DONE |
| 채팅 내보내기 | 대화 내용 markdown/txt로 export | LOW |
| 음성 입력 지원 | Web Speech API로 STT 채팅 입력 | LOW |

### 14-5. 대시보드 위젯 시스템

| 기능 | 설명 | Priority |
|---|---|---|
| 위젯 드래그&드롭 레이아웃 | 사용자가 대시보드 위젯 배치 커스터마이즈 | MED |
| "AI 인사이트" 위젯 | 에이전트 성과 분석 요약 (자동 생성) | ✅ DONE |
| 알림 센터 | 태스크 완료/오류/임박 마감 실시간 알림 | ✅ DONE |
| 일정 달력 위젯 | 태스크 마감일 달력 뷰 | ✅ DONE |

### 14-P1 구현 상세 — 에이전트 사고 흐름 스트리밍 (DONE)

| 파일 | 변경 내용 |
|---|---|
| `server/modules/routes/ops/terminal/extract-thinking-blocks.ts` | **신규** — `extractThinkingBlocks(raw)` 함수: stream_event thinking_delta/content_block_start/stop, assistant message thinking blocks, direct thinking/reasoning types, text+part.type 5가지 포맷 파싱 |
| `server/modules/routes/ops/terminal/routes.ts` | `extractThinkingBlocks` 호출 → `thinking_blocks` 응답 포함; `prettyStreamJson` `includeReasoning: false`로 변경 (reasoning이 terminal text에 섞이지 않도록) |
| `src/api/messaging-runtime-oauth.ts` | `TerminalThinkingBlock` 타입 추가; `getTerminal` 반환 타입에 `thinking_blocks?: TerminalThinkingBlock[] \| null` 추가 |
| `src/components/TerminalPanel.tsx` | `thinkingBlocks` + `showThinking` 상태 추가; `fetchTerminal`에서 `thinking_blocks` 수신; 헤더에 "THINK" 토글 버튼 (thinking blocks 있을 때만 표시); 터미널 바디 위 REASONING 패널 — 최신 블록 표시 + amber 0.65 opacity 텍스트 |

### 14-P2 구현 상세 — 태스크 의존성 DAG 그래프 (DONE)

| 파일 | 변경 내용 |
|---|---|
| `server/modules/routes/core/task-dependencies.ts` | `GET /api/task-dependencies/all` 엔드포인트 추가 — 전체 엣지 일괄 반환 |
| `src/api/task-dependencies.ts` | `getAllTaskDependencies()` + `AllTaskDependenciesResponse` 타입 추가 |
| `src/components/taskboard/DependencyGraph.tsx` | **신규** — SVG DAG 뷰어: 위상 정렬 기반 rank 레이아웃, 베지어 곡선 화살표, 노드 hover 엣지 하이라이트, 마우스 휠 줌/드래그 팬, 상태별 색상 시스템 |
| `src/components/TaskBoard.tsx` | viewMode `"board" \| "gantt"` → `"board" \| "gantt" \| "dag"` 확장; DAG 버튼 추가; DependencyGraph 렌더링 |

### 14-P4 구현 상세 — Office View 즉석 채팅 팝업 (DONE)

| 파일 | 변경 내용 |
|---|---|
| `src/components/office-view/OfficeQuickChat.tsx` | **신규** — 에이전트 avatar + 이름 헤더, textarea 입력, `sendMessage({ receiver_type: "agent", receiver_id })` 전송, Ctrl+Enter 단축키, 성공 시 "✓ 전송 완료" 표시 후 자동 닫힘, Escape 닫힘 |
| `src/components/OfficeView.tsx` | `quickChatAgent` 상태 추가; `handleCanvasSelectAgent`에서 `setQuickChatAgent(agent)` 호출; canvas wrap 우하단에 절대 위치 팝업 렌더링 |

### 14-P6 구현 상세 — API 키 헬스체크 대시보드 (DONE)

| 파일 | 변경 내용 |
|---|---|
| `src/components/dashboard/ProviderHealthPanel.tsx` | **신규** — CLI 프로바이더(claude/codex/gemini 등 8종) 설치/인증 상태 좌측 바, API 프로바이더 개별 테스트 버튼 + "Test All APIs" 일괄 테스트, 인라인 결과 배지(✓ N models / ✗ 에러) |
| `src/components/Dashboard.tsx` | `SectionKey`에 `"providers"` 추가, `defaultSectionsOpen` 추가, `sectionTitles.providers` 추가, "Provider health" CollapsibleSection 렌더링 |

### 14-P7 구현 상세 — 멀티 에이전트 그룹 채팅 (DONE)

| 파일 | 변경 내용 |
|---|---|
| `src/components/chat-panel/GroupChatPanel.tsx` | **신규** — 좌측 에이전트 체크박스 선택(검색 포함), 우측 통합 메시지 피드(전 에이전트 메시지 병합·시간순 정렬), Ctrl+Enter 전송, 일괄 `sendMessage` 루프, 자동 스크롤 |
| `src/app/useAppLabels.ts` | `groupChatLabel` 4개국어 추가 |
| `src/app/AppHeaderBar.tsx` | `groupChatLabel` + `onOpenGroupChat` prop 추가, 헤더 우측 버튼 + 모바일 메뉴 항목 추가 |
| `src/app/AppMainLayout.tsx` | `AppMainLayoutLabels` + 핸들러 인터페이스에 groupChat 추가, AppHeaderBar 연결 |
| `src/app/AppOverlays.tsx` | `showGroupChat` + `onCloseGroupChat` prop 추가, `GroupChatPanel` 렌더링 |
| `src/App.tsx` | `showGroupChat` 상태 추가, `onOpenGroupChat`/`onCloseGroupChat` 핸들러 연결 |

### 14-6. 설정 & 연동 강화

| 기능 | 설명 | Priority |
|---|---|---|
| API 키 헬스체크 대시보드 | 각 LLM provider 연결 상태 + 토큰 사용량 | ✅ DONE |
| Slack/Discord 웹훅 연동 | 태스크 완료 시 외부 채널 알림 | ✅ DONE |
| 에이전트 스킬 마켓플레이스 | 커뮤니티 스킬 검색/설치 UI | LOW |
| 자동 백업 설정 | DB/설정 파일 자동 백업 스케줄러 UI | LOW |

### 14-7. 성능 & 안정성

| 기능 | 설명 | Priority |
|---|---|---|
| 컴포넌트 lazy loading | 라이브러리 탭 (Rules/Memory/Hooks/Skills) lazy import | ✅ DONE |
| OfficeView WebWorker | PixiJS 틱 루프를 WebWorker로 분리 (메인 스레드 보호) | MED |
| 가상 스크롤 | 태스크 리스트, 메시지 리스트 virtualizer 도입 | MED |
| SSE → WebSocket 마이그레이션 | 실시간 이벤트를 WebSocket으로 전환 (더 낮은 오버헤드) | LOW |

---

## Phase 15 — Office View 레이아웃 수정 + FM2024 잔여 컴포넌트

### 15-0. Phase 15 추가 수정 (완료)

| 항목 | 파일 | Status |
|---|---|---|
| FM2024 잔여 shadow-xl/backdrop-blur 제거 (NotificationCenter, LearningModal×4, CreateTaskModalView, Sections) | 7개 파일 | ✅ DONE |
| AgentSelect, OfficeRoomManager, AppHeaderBar, AppMainLayout rounded-md/shadow-xl 제거 | 4개 파일 | ✅ DONE |
| OfficeDeptPanel: CONF(Meeting Room), B1(Break Room) 항목 추가 + onScrollToFloor prop | `OfficeDeptPanel.tsx` | ✅ DONE |
| OfficeView: handleScrollToFloor 핸들러 추가, 하드코딩 상수 → 실제 상수로 수정 | `OfficeView.tsx` | ✅ DONE |
| visitorTick: walkingLeft 방향 판단 버그 수정 (walk_to_dest/walk_home 항상 left였던 문제) | `visitorTick.ts` | ✅ DONE |

### 15-1. Office View 레이아웃 문제 (스크린샷 v8 기준 분석)

**문제 진단 (2026-03-07 스크린샷 분석):**

| 항목 | 현황 | 원인 | 목표 |
|---|---|---|---|
| 캐릭터 크기 | TARGET_CHAR_H=52, 층 높이 대비 43% 차지 | 캔버스 380px가 CSS ~2× 스케일 → 실 표시 ~100px | TARGET_CHAR_H=36으로 축소 |
| 층 높이 | FLOOR_ROOM_H=120 — 매우 좁고 숨막힘 | SLOT_H=120이 FLOOR_ROOM_H로 직결 | SLOT_H=156으로 확장 |
| 회의실 | CEO 펜트하우스 내부에 작은 테이블로만 존재, 별도 층 없음 | Phase 5 리팩 시 별도 층 제거됨 | 펜트하우스 바로 아래 전용 회의실 층 추가 |
| 휴게실 | 최하단 basement에 있어 6개 부서 스크롤 후에야 도달 | 구조적으로 맨 아래 위치 | 존재는 유지, 오피스 패널 사이드 메뉴에 "휴게실 보기" 스크롤 버튼 추가 |
| 배치 엉킴 | 가구/이름 태그/캐릭터가 겹쳐 보임 | 층 높이 120px로는 여유 없음 | 층 높이 확장으로 자연 해결 |
| FM 스타일 | CEO 펜트하우스 가구가 과도하게 픽셀 아트 블럭 스타일 | 기본 스타일 drawer가 너무 chunky | drawPenthouse 가구 재배치 + 축소 |

**수정 계획 — 상수 변경:**
```
SLOT_H: 120 → 156  (FLOOR_ROOM_H도 자동 변경)
TARGET_CHAR_H: 52 → 36
FLOOR_HALLWAY_H: 24 → 28
FLOOR_TOTAL_H: 144 → 184  (자동)
MINI_CHAR_H: 28 → 20
```

**수정 계획 — 구조 변경:**
- `drawConferenceFloor.ts` 신규 — 펜트하우스 아래 전용 회의실 층 (높이 100px)
- `buildScene.ts` — 회의실 층 삽입 (totalH 계산에 포함)
- `drawPenthouse.ts` — 회의 테이블 제거 (별도 층으로 이동), 가구 크기/위치 조정
- `drawFloor.ts` — nameY, charFeetY, deskY 오프셋 재조정

**수정 계획 — OfficeView 패널:**
- 오른쪽 패널에 "B1 휴게실" 클릭 → 캔버스 맨 아래로 스크롤
- 패널 층 목록에 회의실(CONF), 부서들, 휴게실 항목 추가

**예상 결과:**
- 캐릭터/층 비율: 36/156 = 23% (현재 43% → 크게 개선)
- 층당 여유 공간: 156 - (20+24+36+26) = 50px 여유 확보
- 회의실이 별도 층으로 명확히 구분됨

### 15-2. FM2024 잔여 컴포넌트 감사 결과

**완전 미변환 (legacy Tailwind 클래스 다수, th- 변수 부재/부족):**

| 컴포넌트 | 파일 | 주요 문제 | Priority |
|---|---|---|---|
| ScheduledTasksPanel | `src/components/scheduled-tasks/ScheduledTasksPanel.tsx` | rounded-md, bg-gray 혼재 | HIGH |
| CreateTaskModalView | `src/components/taskboard/create-modal/CreateTaskModalView.tsx` | shadow-xl 드롭다운, rounded-md | HIGH |
| CreateTaskModal Sections | `src/components/taskboard/create-modal/Sections.tsx` | rounded-md, legacy border colors | HIGH |
| NotificationCenter | `src/components/NotificationCenter.tsx` | shadow-xl, rounded-md 팝업 | MED |
| AgentSelect | `src/components/AgentSelect.tsx` | rounded-md, shadow-xl 드롭다운 | MED |

**부분 변환 (th- 변수는 있으나 legacy 혼재):**

| 컴포넌트 | 파일 | 남은 문제 | Priority |
|---|---|---|---|
| MemoryLearningModal | `src/components/memory/MemoryLearningModal.tsx` | shadow-xl 드롭다운만 | LOW |
| RuleLearningModal | `src/components/agent-rules/RuleLearningModal.tsx` | shadow-xl 드롭다운만 | LOW |
| HookLearningModal | `src/components/hooks/HookLearningModal.tsx` | shadow-xl 드롭다운만 | LOW |
| LearningModal (Skills) | `src/components/skills-library/LearningModal.tsx` | shadow-xl 드롭다운만 | LOW |
| OfficeRoomManager | `src/components/OfficeRoomManager.tsx` | rounded-md 패널 | MED |
| MemoryHistoryPanel | `src/components/memory/MemoryHistoryPanel.tsx` | rounded-md, shadow | MED |

**이미 완전 변환된 컴포넌트 (참고):**
- HeartbeatPanel, CliUsagePanel, GeneralSettingsTab, ApiSettingsTab, CliSettingsTab, DataSettingsTab, SettingsTabNav, GatewaySettingsTab, HeroSections, OpsSections, TaskCard, MemoryGrid, HooksGrid, AgentRulesGrid, SkillsGrid, ApiAssignModal, ChatEditorModal, OAuthConnectedProvidersSection, MemoryFormModal, HookFormModal, AgentCard, AgentFormModal, AgentsTab, DashboardCollapsibleSection, TaskBoard, ProviderHealthPanel, GroupChatPanel

---

## Phase 16 — CEO 커스터마이즈 확장 + 오피스 뷰 내비게이션

> **현재 상태 (2026-03-07)**
> - 오피스 뷰 좌측 패널에 CEO Penthouse(P), Meeting Room(CONF), Break Room(B1) 클릭-스크롤 항목 추가 ✅
> - CEO 커스터마이즈 기능: OfficeRoomManager 내 `CEO Customize` 섹션에 headwear/outfitTint/title/trailEffect 구현 ✅
> - CEO 룸 테마(floor/wall/accent): OfficeRoomManager Room Themes 섹션 ✅
> - **CEO 실명/회사명 (16-2-A)**: `name`(명패) + `companyName`(옥상 간판) 필드 추가, OfficeRoomManager 입력 폼 연동 ✅
> - **CEO 아바타 이모지 (16-2-B)**: `avatarEmoji` 필드 추가, 로봇 얼굴 위 PixiJS Text 오버레이, OfficeRoomManager 이모지 입력 ✅
> - **방문자 인사말 커스텀 (16-2-D)**: `greetings[]` 필드, visitorTick phrasePool 동적 교체, OfficeRoomManager textarea 입력 ✅
> - **CEO 퍼소나 연결 (16-2-C)**: `personaId` 필드, 펜트하우스 스트립 배지 표시, OfficeRoomManager PERSONA_CATALOG 드롭다운 ✅
> - **회의실 높이 확대**: CONFERENCE_FLOOR_H 100 → 140 ✅
> - **FM2024 클린업**: HeartbeatGuideModal shadow-2xl 제거, RoomLayoutEditor rounded 버튼 변환, DiffModal shadow-2xl 제거 ✅

---

### 16-1. CEO 커스터마이즈 현황 감사

**현재 구현된 항목:**

| 기능 | 저장 키 | 위치 | 상태 |
|---|---|---|---|
| 머리 장식 (crown/tophat/cap/halo/horns/ribbon/none) | `headwear` | OfficeRoomManager | ✅ |
| 복장 색상 (hex 컬러 피커) | `outfitTint` | OfficeRoomManager | ✅ |
| 직함 텍스트 (최대 12자) | `title` | OfficeRoomManager | ✅ |
| 이동 트레일 효과 (sparkle/stars/hearts/fire) | `trailEffect` | OfficeRoomManager | ✅ |
| 펜트하우스 방 테마 (floor1/floor2/wall/accent) | `ceoOffice` in RoomThemes | OfficeRoomManager | ✅ |

**현재 없는 항목 (Phase 16 추가 계획):**

| 기능 | 설명 | 우선순위 |
|---|---|---|
| CEO 실명 + 회사명 | 명패에 "CEO" 외 실제 이름 표시, 옥상 사인 "AGENTDESK HQ" → 사용자 지정 회사명 | HIGH |
| CEO 아바타 이모지 | 로봇 스프라이트 위에 이모지 오버레이 or 이모지 전용 스프라이트 | HIGH |
| CEO 퍼소나 연결 | 페르소나 카탈로그에서 선택 → CEO 캐릭터 성격/접근 방식 결정 | MED |
| 방문자 인사말 커스텀 | 에이전트가 CEO실 방문 시 표시되는 고정 문구 (현재 랜덤 VISITOR_PHRASES) | MED |
| CEO 책상 스타일 | default/executive/minimal 3종 (drawPenthouse의 desk 렌더링 분기) | LOW |
| 펜트하우스 KPI 목표치 | 터미널 스트립의 STAFF/ACTIVE/TASKS/DONE 외 사용자 정의 목표 수치 표시 | LOW |

---

### 16-2. CEO 커스터마이즈 확장 구현 계획

#### 16-2-A. CEO 실명 + 회사명 (HIGH)

**변경 파일:**
- `ceo-customization.ts` — `CeoCustomization` 인터페이스에 `name: string`, `companyName: string` 추가
- `drawPenthouse.ts` — CEO 명패 `"CEO"` → `ceoConfig.name` 또는 `ceoConfig.title` 표시
- `drawRoof.ts` — 옥상 사인 `"[ AGENTDESK // MISSION CTRL ]"` → `"[ ${companyName} // MISSION CTRL ]"`
- `buildScene-final-layers.ts` — CEO 로봇 이름 배지에 `name` 반영
- `OfficeRoomManager.tsx` — 입력 폼 2개 추가 (name 최대 16자, companyName 최대 20자)

**저장 구조:**
```typescript
interface CeoCustomization {
  headwear: CeoHeadwear;
  outfitTint: number;
  title: string;       // 직함 "CEO" / "CTO" 등
  name: string;        // 실명 "김대표" — 명패에 표시 (NEW)
  companyName: string; // 회사명 — 옥상 사인 (NEW)
  trailEffect: CeoTrailEffect;
}
```

#### 16-2-B. CEO 아바타 이모지 (HIGH)

**현재:** CEO는 PixiJS Graphics로 그린 로봇 픽셀아트 (buildScene-final-layers.ts)

**구현 방안 A — 이모지 오버레이** (권장):
- `CeoCustomization`에 `avatarEmoji: string` 필드 추가 (기본값 `""` = 로봇 유지)
- `buildScene-final-layers.ts`의 로봇 헤드 위치에 PixiJS `Text` (fontSize 18)로 이모지 렌더링
- OfficeRoomManager에 이모지 입력 필드 또는 EmojiPicker 연동

**구현 방안 B — 에이전트 연결** (대안):
- CEO 역할을 특정 에이전트(userId)로 지정 → 해당 에이전트의 avatar_emoji 사용
- 에이전트 스프라이트 시스템과 CEO 스프라이트 통합

→ **권장: 방안 A** (독립적, 구현 쉬움)

#### 16-2-C. CEO 퍼소나 연결 (MED)

**현재:** CEO는 퍼소나 없음. 에이전트만 persona_id를 가짐.

**구현 방안:**
- `CeoCustomization`에 `personaId: string | null` 추가
- OfficeRoomManager CEO 섹션에 PersonaCatalog 드롭다운 추가
- CEO 퍼소나는 시스템 전역 context 주입 (태스크 실행 프롬프트에 CEO 성격 반영)
- CEO 명패 옆에 PersonaBadge 표시

#### 16-2-D. 방문자 인사말 커스텀 (MED)

**현재:** `VISITOR_PHRASES` 배열이 visitorTick.ts에 하드코딩 (12개)

**구현 방안:**
- `CeoCustomization`에 `greetings: string[]` (최대 5개) 추가
- visitorTick.ts에서 CEO 방문 시 `ceoCustomization.greetings`가 있으면 우선 사용
- OfficeRoomManager에 인사말 입력 섹션 (textarea, 줄바꿈 구분)

---

### 16-3. OfficeRoomManager UI 개편 계획

현재 OfficeRoomManager는 한 패널에 모든 설정이 있어 스크롤이 많음.

**개선 방향:**
- 탭 구조로 변경: `[ 방 테마 ]  [ CEO 커스텀 ]  [ 시즌/스타일 ]`
- CEO 커스텀 탭에 16-2-A~D 항목 통합

---

### 16-4. 오피스 패널 내비게이션 (완료)

| 항목 | 설명 | 상태 |
|---|---|---|
| `P` (CEO Penthouse) | 클릭 → 캔버스 최상단 스크롤 | ✅ DONE |
| `CONF` (Meeting Room) | 클릭 → 회의실 층 스크롤 | ✅ DONE |
| `F1~FN` (부서 층) | 클릭 → 해당 부서 층 스크롤 + 엘리베이터 이동 + 선택 박스 | ✅ DONE |
| `B1` (Break Room) | 클릭 → 지하 휴게실 스크롤 | ✅ DONE |

---

## Notes

- Commits are handled by the user. Claude focuses only on development.
- When starting a task, update status to `IN PROGRESS`. When done, `DONE`.
- If a task is blocked, note the blocker inline.
- Design reference: `docs/design-system.md`
- Retro Terminal reference: `docs/design-retro-terminal-overhaul.md`
- Persona reference: `docs/agent-persona-system.md`
- Office view reference: `docs/office-view-tower-redesign.md`
