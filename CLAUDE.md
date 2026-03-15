# CLAUDE.md — AgentDesk AI 개발 가이드

> AI 에이전트(Claude Code, Cursor, Copilot 등)가 이 레포를 처음 열었을 때 읽는 파일.
> 상세 스펙은 각 링크 문서를 참조.

---

## 1. 프로젝트 한 줄 요약

**AgentDesk** = 여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS.
macOS 바탕화면 은유 — 메뉴바 + 데스크톱 아이콘 + 위젯 + Dock + 앱 창.
Electron + React(Vite) 프론트엔드 + Express/tsx 백엔드 + SQLite(better-sqlite3).

---

## 2. 주요 명령어

```bash
# 개발 서버 (프론트 8800, API 8790)
pnpm dev

# 테스트
pnpm test              # 프론트 + 서버 전체
pnpm run test:web      # 프론트만 (vitest)
pnpm run test:api      # 서버만 (vitest)

# 타입 검사
tsc -b

# 린트
pnpm lint
pnpm lint:fix

# 빌드
pnpm build
```

---

## 3. 핵심 파일 지도

**UI 구조:** 사이드바 없음. macOS 바탕화면 OS — 메뉴바 + 데스크톱 아이콘 + 위젯 + Dock + 앱 창.

```
src/
├── App.tsx                      ← 루트: 스토어 구독 + WebSocket 연결
├── components/
│   ├── desktop/
│   │   ├── Desktop.tsx          ← 바탕화면 루트 (단축키·jiggle·QuickLook·MissionControl)
│   │   ├── MenuBar.tsx          ← 상단 메뉴바 (로고·앱메뉴·프로젝트·비용·알림·시각)
│   │   ├── DesktopIcon.tsx      ← 데스크톱 아이콘 (드래그·jiggle·✕ 삭제 배지)
│   │   ├── Dock.tsx             ← 하단 Dock (⚡📚⚙💬)
│   │   ├── Widget.tsx           ← 위젯 공통 컨테이너 (드래그·리사이즈)
│   │   ├── QuickLook.tsx        ← 프로젝트 빠른 미리보기 패널 (Space 키)
│   │   ├── MissionControl.tsx   ← 모든 창·위젯 오버뷰 (Ctrl+↑)
│   │   ├── WallpaperPicker.tsx  ← 배경화면 선택 (10가지 그라데이션)
│   │   └── widgets/             ← AgentsWidget, TasksWidget, AlertsWidget, CliCostWidget, FlowGraphWidget
│   ├── windows/                 ← 앱 창 (WorkflowWindow, LibraryWindow, SettingsWindow, ChatWindow, AgentManagerWindow)
│   ├── flow-graph/              ← AgentFlowGraph (FlowGraphWidget에서 재사용)
│   ├── workflow-builder/        ← WorkflowBuilder (@xyflow/react)
│   ├── agent-composition/       ← AgentCompositionBuilder + AgentCompositionRunModal + nodes/CompAgentNode
│   └── settings/                ← Settings 창 탭들
├── app/
│   ├── types.ts                 ← WindowType: "workflow"|"library"|"settings"|"chat"|"agent-manager"|"repl"
│   └── AppOverlays.tsx          ← 모달/오버레이 집합 (36개)
├── store/
│   ├── agentStore.ts            ← agents, departments
│   ├── taskStore.ts             ← tasks, subtasks
│   ├── projectStore.ts          ← projects, categories
│   └── uiStore.ts               ← openWindows(Set), widgetLayout, desktopIconLayout, wallpaper, jiggleMode, missionControlOpen
└── types/index.ts               ← Agent, Task, SubAgent 등 도메인 타입

server/
├── index.ts                     ← 서버 진입점
├── lib/logger.ts                ← pino 로거 (import 경로 주의: 깊이별 ../ 수)
├── db/runtime.ts                ← DB 연결 + 환경변수 상수
├── modules/
│   ├── lifecycle.ts             ← 서비스 시작/종료 훅
│   ├── routes/core.ts           ← REST API 라우트 등록
│   ├── routes/ops/composition-templates.ts ← CRUD /api/composition-templates
│   └── workflow/                ← 태스크 실행 엔진
├── ws/hub.ts                    ← WebSocket 브로드캐스트 허브
└── messenger/                   ← Discord/Slack 수신기
```

---

## 4. UI 요소 추가 순서

### 4-1. 새 위젯 추가

| # | 파일 | 할 일 |
|---|------|--------|
| 1 | `src/components/desktop/widgets/` | 새 위젯 컴포넌트 생성 |
| 2 | `src/components/desktop/WidgetPicker.tsx` | 위젯 목록에 항목 추가 |
| 3 | `src/store/uiStore.ts` | `widgetLayout` 타입에 새 위젯 ID 추가 |

### 4-2. 새 데스크톱 아이콘 추가

| # | 파일 | 할 일 |
|---|------|--------|
| 1 | 창/모달 컴포넌트 | `src/components/windows/` 하위에 생성 |
| 2 | `src/components/desktop/Desktop.tsx` | 아이콘 항목 추가 (레이블, 아이콘, onClick) |
| 3 | `src/store/uiStore.ts` | 창 열기 액션 추가 |

### 4-3. Dock 앱 창에 탭 추가

| # | 파일 | 할 일 |
|---|------|--------|
| 1 | 탭 컴포넌트 | `src/components/` 하위에 생성 |
| 2 | 해당 창 파일 | `src/components/windows/` → 탭 배열에 추가 |

### 4-4. 새 Dock 앱 추가

| # | 파일 | 할 일 |
|---|------|--------|
| 1 | `src/app/types.ts` | `WindowType` 유니온에 새 값 추가 |
| 2 | `src/store/uiStore.ts` | `openWindows` 토글 액션 업데이트 |
| 3 | `src/components/desktop/Dock.tsx` | Dock 아이콘 추가 |
| 4 | `src/components/windows/` | 앱 창 컴포넌트 생성 |
| 5 | `src/components/desktop/Desktop.tsx` | 창 렌더링 블록 추가 |

데이터가 필요하면: `Zustand 스토어 → uiStore.openWindows` 체인으로 전달

---

## 4-5. macOS UX 기능 목록

| 기능 | 진입 방법 | 구현 위치 |
|------|-----------|-----------|
| **Spotlight 검색** | `Ctrl+Shift+K` 또는 `Cmd+K` | `CommandPalette.tsx` (640px 중앙, 🔍 아이콘) |
| **Jiggle Mode** | 빈 바탕화면 600ms 롱프레스 | `Desktop.tsx` + `DesktopIcon.tsx` |
| **Quick Look** | 프로젝트 선택 후 `Space` 또는 우클릭 → 빠른 미리보기 | `QuickLook.tsx` |
| **Mission Control** | `Ctrl+↑` 또는 AgentDesk 메뉴 | `MissionControl.tsx` |
| **알림 슬라이드 패널** | 벨 아이콘 클릭 | `NotificationCenter.tsx` (320px 우측 슬라이드) |
| **앱 메뉴** | "AgentDesk" 텍스트 클릭 | `MenuBar.tsx` (배경화면/위젯/단축키/Mission Control) |

---

## 5. 새 API 엔드포인트 추가 순서

1. `server/modules/routes/core.ts` 또는 해당 서브라우터에 라우트 추가
2. `docs/specs/api.md` 에 엔드포인트 문서 추가 (버전 올리기)
3. 프론트 `src/` 에서 호출하는 fetch 함수 추가

---

## 6. 자주 하는 실수 & 주의사항

### logger import 경로 깊이
`server/lib/logger.ts`를 import할 때 파일 위치에 따라 `../` 수가 다름:

```
server/ws/hub.ts                            → "../lib/logger"          (1단계)
server/modules/lifecycle.ts                  → "../lib/logger"          (1단계)
server/modules/workflow/core/hook-executor.ts → "../../../lib/logger"   (3단계)
server/modules/workflow/core/worktree/*.ts   → "../../../../lib/logger" (4단계)
```

### WebSocket cli_output 구독
`hub.broadcast("cli_output", { taskId, ... })` 는 해당 `taskId`를 구독한 클라이언트에만 전송됨.
테스트에서는 broadcast 전에 `hub.handleClientMessage(ws, JSON.stringify({ type: "subscribe_task", taskId }))` 호출 필요.

### 테스트 내 git commit
테스트 임시 저장소에서 commit 시 GPG 서명 오류 방지:
```typescript
runGit(dir, ["config", "commit.gpgsign", "false"]);
```

### 앱 창 단축키
`Desktop.tsx`의 단축키 맵 업데이트 후 `KeyboardShortcutsGuide.tsx`에도 항목 추가.
현재 단축키:

| 단축키 | 동작 |
|--------|------|
| `Ctrl+Shift+K` / `Cmd+K` | Command Palette (Spotlight) |
| `Ctrl+↑` | Mission Control |
| `g w` | Workflow 창 토글 |
| `g l` | Library 창 토글 |
| `g s` | Settings 창 토글 |
| `g c` | Chat 창 토글 |
| `g a` | Agent Manager 토글 |
| `g e` | REPL 토글 |
| `Space` (아이콘 선택 후) | Quick Look 열기 |
| `Esc` | Jiggle 해제 / Quick Look 닫기 / Mission Control 닫기 |
| 빈 화면 600ms 롱프레스 | Jiggle Mode ON |
| `?` | 단축키 가이드 |

---

## 7. 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 18 + TypeScript + Vite + Tailwind CSS |
| 상태관리 | Zustand |
| 플로우 다이어그램 | `@xyflow/react` v12 |
| 백엔드 | Node.js + Express + tsx (TypeScript 직접 실행) |
| DB | SQLite (`better-sqlite3`) + 버전별 마이그레이션 |
| 로깅 | pino |
| 테스트 | Vitest (프론트 + 서버), Playwright (E2E) |
| 패키지매니저 | pnpm |
| 데스크톱 앱 | Electron (선택적 빌드) |

---

## 8. 상세 문서 링크

| 문서 | 내용 |
|------|------|
| [`docs/OVERVIEW.md`](docs/OVERVIEW.md) | 전체 아키텍처 개요 + 우선순위 로드맵 |
| [`docs/design/AI-GUIDE.md`](docs/design/AI-GUIDE.md) | **AI 개발자 디자인 원칙** (컴포넌트 패턴, 체크리스트) |
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | 전체 화면·모달 명세 (macOS 바탕화면 OS 구조) |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS 변수 전체 + 컴포넌트 스타일 규칙 |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API 전체 명세 (v1.2.6) |
| [`docs/strategy/bigger-ide-vision.md`](docs/strategy/bigger-ide-vision.md) | "더 큰 IDE" 전략 (Phase 1~3 완료) |
| [`tasks.md`](tasks.md) | 날짜별 완료 작업 기록 |
