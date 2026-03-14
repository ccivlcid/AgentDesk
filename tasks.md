# Tasks

## 2026-03-14 — "더 큰 IDE" 비전 Phase 1~3 완료

### P3-5: 이상 감지 인덱스 최적화
- [x] `versioned-migrations.ts` — migration `2026-03-14-008-watchdog-index` 추가 (`tasks(status, execution_state, last_heartbeat_at DESC)` 복합 인덱스)
- [x] `server/db/runtime.ts` — `TASK_STALLED_THRESHOLD_MS` / `TASK_STALLED_RECOVERY_THRESHOLD_MS` 환경변수 설정 가능하도록 추출
- [x] `server/modules/lifecycle.ts` — 하드코딩 상수 → `db/runtime.ts` 임포트로 교체

### P3-3: Keyboard-First UX
- [x] `src/app/AppMainLayout.tsx` — `g + 키` vim-style 네비게이션 (1초 타임아웃) 추가: g d/t/a/f/s/m/r/h/w
- [x] `src/app/AppMainLayout.tsx` — `n` 키 → 커맨드 팔레트 오픈, `\` 키 → 분할 뷰 토글 추가
- [x] `src/components/KeyboardShortcutsGuide.tsx` — `g + 키` 섹션 추가 (i18n 4개국어), `\` 단축키 항목 추가

### P3-6: Slack 수신기
- [x] `server/messenger/slack-receiver.ts` 신규 작성 (conversations.history 폴링, Bot Token xoxb-...)
- [x] 채널 커서 localStorage 방식으로 `settings` 테이블에 지속
- [x] `forwardToInboxWithRetry` — 3회 재시도, 지수 백오프
- [x] `server/modules/lifecycle.ts` — `startSlackReceiver()` 등록, onBeforeClose 정리
- [x] `server/modules/routes/core.ts` — `GET /api/messenger/receiver/slack` 상태 엔드포인트 추가

### P3-1: Split-Pane Layout
- [x] `src/hooks/useSplitPane.ts` 신규 작성 (CSS flex + drag, 25~75% 범위, localStorage 저장)
- [x] `src/app/SplitPaneSecondary.tsx` 신규 작성 (뷰 탭 선택: Flow Graph / Heartbeat / Dashboard / CLI Usage)
- [x] `src/app/AppMainLayout.tsx` — split 컨테이너 + 드래그 핸들 + 보조 패널 통합
- [x] `src/app/AppHeaderBar.tsx` — `⊟` 토글 버튼 추가 (데스크톱 전용, `\` 단축키)

### P3-4: 테스트 커버리지 수정
- [x] `server/ws/hub.ts` — logger 임포트 경로 수정 (`../../` → `../`)
- [x] `server/modules/workflow/core/hook-executor.ts` — logger 임포트 경로 수정
- [x] `server/modules/workflow/core/task-execution-meta.ts` — logger 임포트 경로 수정
- [x] `server/modules/workflow/core/worktree/lifecycle.ts` — logger 임포트 경로 수정
- [x] `server/modules/bootstrap/schema/versioned-migrations.test.ts` — makeDb()에 누락 테이블 추가
- [x] `server/modules/routes/core/tasks/crud.workflow-pack-filter.test.ts` — tasks 테이블 누락 컬럼 추가
- [x] `server/ws/hub.test.ts` — cli_output 테스트에 taskId 구독 로직 추가
- [x] `server/modules/workflow/core/worktree/lifecycle.test.ts` — `commit.gpgsign=false` 설정 추가
- [x] **결과: 서버 40개 파일 181개 테스트, 프론트 12개 파일 43개 테스트 전부 통과**

### P3-2: Visual Workflow Builder
- [x] `pnpm add @xyflow/react` (v12.10.1) 설치
- [x] `src/components/workflow-builder/nodes/WbTriggerNode.tsx` — 트리거 노드 (4종 타입)
- [x] `src/components/workflow-builder/nodes/WbAgentNode.tsx` — 에이전트 실행 스텝 노드
- [x] `src/components/workflow-builder/nodes/WbGateNode.tsx` — 분기 게이트 (success/failure/timeout)
- [x] `src/components/workflow-builder/nodes/WbConditionNode.tsx` — 조건 체크 (true/false 핸들)
- [x] `src/components/workflow-builder/WorkflowBuilder.tsx` — ReactFlow 캔버스, 노드 팔레트, 저장/불러오기
- [x] `src/app/types.ts` — `"workflow-builder"` View 추가
- [x] `src/components/Sidebar.tsx` — 에이전트 섹션에 워크플로 빌더 추가, `⬡` 아이콘
- [x] `src/app/AppMainLayout.tsx` — lazy import, 렌더링, `g w` 단축키
- [x] `src/components/KeyboardShortcutsGuide.tsx` — `g w` 항목 추가

### 문서 통합 업데이트
- [x] `docs/OVERVIEW.md` — P3-2, P3-4 완료 표시, 우선순위 표 갱신
- [x] `docs/design/AI-GUIDE.md` — 사이드바 메뉴 구조 갱신, 단축키 표 전면 업데이트
- [x] `docs/design/UI-SCREENS.md` — flow-graph(1-8), workflow-builder(1-9) 화면 추가, 메인 15개로 갱신
- [x] `docs/strategy/bigger-ide-vision.md` — Phase 1~3 전부 완료 처리, 달성도 갱신
- [x] `docs/strategy/agent-flow-graph-design.md` — 구현 완료 표시 및 파일 현황 추가
- [x] `docs/specs/api.md` — `GET /api/messenger/receiver/slack` 엔드포인트 추가
- [x] `tasks.md` — 2026-03-14 완료 기록 작성

---

## 2026-03-03 — Discord 연동 (v2.0.1)

- [x] 현재 Discord 채널 자동 조회 미지원 원인 분석
- [x] 서버: Discord 토큰 기반 채널 목록 조회 함수 추가
- [x] 서버: `/api/messenger/discord/channels` 라우트 추가
- [x] 프론트: Discord 채널 조회 API 함수 추가
- [x] 프론트: 설정 모달에서 토큰 입력 시 자동 조회 및 대상 ID 자동완성 연동
- [x] 서버: Discord 수신기(폴링) 추가 및 라이프사이클 연결
- [x] 서버: `/api/messenger/receiver/discord` 상태 라우트 추가
- [x] 프론트: 수신상태에 Discord 수신기 상태 표시
- [x] 테스트 코드 추가(Discord 채널 조회/수신기)
- [x] 정적 검증(`tsc -b`) 통과
- [x] 문서: `docs/releases/v2.0.1.md` 릴리즈 노트 신규 작성
- [x] 문서: `docs/releases/README.md`에 `v2.0.1` 인덱스 추가
- [x] 문서: `README.md`, `README_ko.md`, `README_jp.md`, `README_zh.md` 최신 릴리즈 섹션 `v2.0.1` 동기화
- [x] 문서: OpenAPI 반영(`docs/specs/openapi.json`, `docs/specs/api.md`) - Discord 수신기/채널조회 엔드포인트 추가
