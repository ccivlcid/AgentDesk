# CLAUDE.md — AgentDesk AI 개발 가이드

> AI 에이전트(Claude Code, Cursor, Copilot 등)가 이 레포를 처음 열었을 때 읽는 파일.
> 상세 스펙은 각 링크 문서를 참조.

---

## 1. 프로젝트 한 줄 요약

**AgentDesk** = 여러 AI 에이전트를 동시에 실행·모니터링·제어하는 개발자 OS 대시보드.
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

```
src/
├── App.tsx                      ← 루트: 스토어 구독 + WebSocket 연결
├── app/
│   ├── types.ts                 ← View 타입 enum (화면 추가 시 여기 먼저)
│   ├── AppMainLayout.tsx        ← 뷰 라우터: view prop → 화면 렌더
│   └── AppOverlays.tsx          ← 모달/오버레이 집합
├── components/
│   └── Sidebar.tsx              ← 좌측 네비 (NAV_STRUCTURE 배열)
├── store/
│   ├── agentStore.ts            ← agents, departments
│   ├── taskStore.ts             ← tasks, subtasks
│   ├── projectStore.ts          ← projects, categories
│   └── uiStore.ts               ← view, settings, 모달 상태
└── types/index.ts               ← Agent, Task, SubAgent 등 도메인 타입

server/
├── index.ts                     ← 서버 진입점
├── lib/logger.ts                ← pino 로거 (import 경로 주의: 깊이별 ../ 수)
├── db/runtime.ts                ← DB 연결 + 환경변수 상수
├── modules/
│   ├── lifecycle.ts             ← 서비스 시작/종료 훅
│   ├── routes/core.ts           ← REST API 라우트 등록
│   └── workflow/                ← 태스크 실행 엔진
├── ws/hub.ts                    ← WebSocket 브로드캐스트 허브
└── messenger/                   ← Discord/Slack 수신기
```

---

## 4. 새 화면(View) 추가 순서

반드시 이 순서대로:

| # | 파일 | 할 일 |
|---|------|--------|
| 1 | `src/app/types.ts` | `View` 타입에 새 값 추가 |
| 2 | `src/components/Sidebar.tsx` | `NAV_STRUCTURE`에 항목 추가, `navLabels` 추가, collapsed 아이콘 추가 |
| 3 | `src/app/AppMainLayout.tsx` | `{view === "새뷰" && <컴포넌트 />}` 렌더 블록 추가 |
| 4 | 컴포넌트 파일 | `src/components/` 하위에 생성 |

데이터가 필요하면: `Zustand 스토어 → App.tsx → AppMainLayout props → 컴포넌트`

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

### 화면 추가 시 키보드 단축키
`AppMainLayout.tsx`의 `g + key` 맵에 단축키 추가 후 `KeyboardShortcutsGuide.tsx`에도 항목 추가.

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
| [`docs/design/UI-SCREENS.md`](docs/design/UI-SCREENS.md) | 전체 화면·모달 명세 (15개 메인 화면) |
| [`docs/design/DESIGN.md`](docs/design/DESIGN.md) | CSS 변수 전체 + 컴포넌트 스타일 규칙 |
| [`docs/specs/api.md`](docs/specs/api.md) | REST API 전체 명세 (v1.2.5) |
| [`docs/strategy/bigger-ide-vision.md`](docs/strategy/bigger-ide-vision.md) | "더 큰 IDE" 전략 (Phase 1~3 완료) |
| [`tasks.md`](tasks.md) | 날짜별 완료 작업 기록 |
