# Tasks

## 2026-03-14 — macOS 바탕화면 OS 구조 전환 (Phase 4)

> 사이드바 제거 → MenuBar + 데스크톱 아이콘 + 위젯 + Dock + 앱 창 구조로 전면 전환

### 핵심 아키텍처

- [x] `src/app/types.ts` — `WindowType` 유니온 추가 (`"workflow"|"library"|"settings"|"chat"|"agent-manager"`)
- [x] `src/store/uiStore.ts` — `openWindows(Set<WindowType>)`, `widgetLayout`, `desktopIconLayout`, `selectedAgentId`, `openTaskId` 추가

### 데스크톱 셸

- [x] `src/components/desktop/MenuBar.tsx` — 상단 메뉴바 (로고·프로젝트·비용·알림·시각)
- [x] `src/components/desktop/DesktopIcon.tsx` — 드래그 가능한 바탕화면 아이콘
- [x] `src/components/desktop/Widget.tsx` — 위젯 공통 컨테이너 (드래그·리사이즈·닫기)
- [x] `src/components/desktop/WidgetPicker.tsx` — 위젯 추가 선택기
- [x] `src/components/desktop/Dock.tsx` — 하단 Dock (⚡📚⚙💬)
- [x] `src/components/desktop/Desktop.tsx` — 바탕화면 루트 컴포넌트

### 위젯

- [x] `src/components/desktop/widgets/AgentsWidget.tsx` — 에이전트 상태 실시간 목록
- [x] `src/components/desktop/widgets/TasksWidget.tsx` — 실행 중 태스크 목록
- [x] `src/components/desktop/widgets/AlertsWidget.tsx` — 이상 감지 알림
- [x] `src/components/desktop/widgets/CliCostWidget.tsx` — CLI 비용 요약
- [x] `src/components/desktop/widgets/FlowGraphWidget.tsx` — 에이전트 플로우 그래프

### 앱 창 (Dock + 데스크톱 아이콘 클릭 시)

- [x] `src/components/windows/WorkflowWindow.tsx` — ⚡ Workflow (Builder + Scheduled 탭)
- [x] `src/components/windows/LibraryWindow.tsx` — 📚 Library (Skills + Rules + Memory + Hooks + Deliverables 탭)
- [x] `src/components/windows/SettingsWindow.tsx` — ⚙ Settings (탭 전체)
- [x] `src/components/windows/ChatWindow.tsx` — 💬 Chat (Direct + Group + Announcement 탭)
- [x] `src/components/windows/AgentManagerWindow.tsx` — 👤 에이전트 설정 창

### 루트 통합

- [x] `src/App.tsx` — `AppMainLayout` → `Desktop` 전환 (데이터 로딩·WebSocket 훅 유지)

---

## 다음 작업 후보

### Phase 5 — 정리 & 완성도

- [ ] **구버전 파일 삭제** — `AppMainLayout.tsx`, `Sidebar.tsx`, `SplitPaneSecondary.tsx`, `AppHeaderBar.tsx` 제거
- [ ] **ReplWindow 신규** — `>_` 에이전트 REPL 데스크톱 아이콘 → `src/components/windows/ReplWindow.tsx`
- [ ] **키보드 단축키** — `g w` Workflow / `g l` Library / `g s` Settings / `g c` Chat
- [ ] **CommandPalette 통합** — `Ctrl+Shift+K` → Desktop에서 CommandPalette 렌더
- [ ] **KeyboardShortcutsGuide 업데이트** — 새 단축키 반영
