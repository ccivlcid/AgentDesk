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

---

## 2026-03-14 — Phase 5 정리 & 완성도

### Phase 5 — 정리 & 완성도

- [x] **구버전 파일 삭제** — `AppMainLayout.tsx`, `Sidebar.tsx`, `SplitPaneSecondary.tsx`, `AppHeaderBar.tsx` 이미 제거됨
- [x] **ReplWindow 신규** — `>_` 에이전트 REPL → `src/components/windows/ReplWindow.tsx` + `src/components/AgentRepl.tsx` (488줄)
- [x] **키보드 단축키** — `g w` Workflow / `g l` Library / `g s` Settings / `g c` Chat / `g a` Agent Manager / `g e` REPL (`Desktop.tsx`)
- [x] **CommandPalette 통합** — `Ctrl+Shift+K` → Desktop에서 CommandPalette 렌더 완료
- [x] **KeyboardShortcutsGuide 업데이트** — `g e` REPL 포함 전체 단축키 최신 반영

---

## 2026-03-14 — 보안 패치 (Security Hardening)

### 1차 패치

- [x] **경로 탐색(Path Traversal) 차단** — `server/modules/routes/ops/task-reports/routes.ts` — `path.resolve` + `startsWith` 검증 추가
- [x] **GitHub PAT 검증 강화** — `server/modules/routes/core/github-routes.ts` — `ghp_` / `github_pat_` 프리픽스 화이트리스트 검증
- [x] **git clone 경로 정규화** — `github-routes.ts` — `path.resolve` + 프로젝트 루트 밖 탈출 차단
- [x] **OAuth 리다이렉트 호스트 검증** — `server/oauth/helpers.ts` — `.ts.net` 도메인 bypass 방지, 명시적 허용 호스트 목록으로 교체
- [x] **Content-Disposition 파일명 인젝션 차단** — `server/modules/routes/ops/chat-upload.ts` — 파일명 sanitize (`"` `/` `\` 제거)
- [x] **Prompt Injection (projectPath)** — `server/modules/workflow/core/api-provider-tools.ts` — 줄바꿈·제어문자 제거
- [x] **ReDoS 취약 정규식 제거** — `reply-core-tools.ts`, `messenger-notice-format.ts` — lookbehind → indexOf/slice 로 교체
- [x] **TOCTOU 파일 읽기 경쟁 조건** — `chat-upload.ts` — `fs.open` + `fd` 기반 원자적 읽기로 교체
- [x] **파일 쓰기 원자성** — `server/modules/routes/ops/custom-skills.ts` — 임시 파일(`*.tmp`) write 후 `rename` 으로 교체

### 2차 패치

- [x] **에러 메시지 정보노출 — update API** — `register.ts:539,555` — `err.message` → 고정 에러 코드 반환
- [x] **에러 메시지 정보노출 — GitHub API** — `github-routes.ts:147,206,323` — `message` 필드 제거
- [x] **git clone stderr WS 브로드캐스트 제거** — `github-routes.ts:275,291` — `stderrBuf` / `err.message` 클라이언트 노출 차단
- [x] **에러 메시지 정보노출 — API Providers** — `api-providers.ts:254,269,311,335,364` — upstream 에러 본문 제거, 고정 코드로 통일
