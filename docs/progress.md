# AgentDesk — Development Progress

> Last updated: 2026-03-28

---

## ✅ Phase 40: Agent PM Orchestration UI — Specialty, Autonomy, Concurrent Tasks — Complete

> **Date:** 2026-03-28

### What was built

Agent 설정 폼에 PM 오케스트레이터 철학을 반영하는 UI 필드 추가.

| Feature | Description |
|---------|-------------|
| **전문 분야 (Specialty)** | 8개 태그 멀티셀렉트 (frontend, backend, devops, design, qa, data, docs, infra). PM이 태스크 배정 시 참고 |
| **자율도 (Autonomy Level)** | 3단계 — 자율/중간/밀착. PM 보고 빈도 결정 |
| **동시 실행 태스크 수** | 1~10 숫자 입력. 에이전트가 병렬 처리할 수 있는 태스크 수 제한 |
| **PM 역할 구분** | team_leader 역할일 때 CLI/Provider 설정 숨기고, PM 오케스트레이터 안내 배너 표시 |
| **DB 마이그레이션** | agents 테이블에 specialty, autonomy_level, max_concurrent_tasks 컬럼 추가 |

### Modified Files

- `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` — 마이그레이션 추가
- `src/types/index.ts` — Agent 타입에 새 필드 추가
- `src/components/agent-manager/types.ts` — FormData 타입 확장
- `src/components/agent-manager/constants.ts` — SPECIALTY_TAGS, AUTONOMY_LEVELS, AUTONOMY_LABEL 상수
- `src/components/agent-manager/agent-form-modal/AgentFormModalPmSection.tsx` — 새 PM 섹션 컴포넌트
- `src/components/agent-manager/agent-form-modal/AgentFormModalAdvancedSection.tsx` — PM일 때 CLI 숨김, PM 섹션 통합
- `src/components/AgentManager.tsx` — openEdit/handleSave에 새 필드 포함
- `src/api/organization-projects.ts` — updateAgent/createAgent API 타입 확장
- `server/modules/routes/core/agents/patch-body.ts` — allowedFields에 새 필드 추가
- `server/modules/routes/core/agents/register-agent-routes-write.ts` — POST 핸들러에 새 필드 처리

---

## ✅ Phase 39: gstack 철학 적용 — 증거 기반 실행 + 리뷰 체크리스트 + 에러 패턴 — Complete

> **Date:** 2026-03-28

### What was built

gstack(Garry Tan의 오픈소스 소프트웨어 팩토리)에서 AgentDesk에 적용할 만한 기능을 분석하고 핵심 3가지를 적용.

| Feature | Description |
|---------|-------------|
| **PM 리뷰 체크리스트** | 서술형 리뷰 → 4점 체크리스트(스코프 매칭, 에러, 최소 변경, 완성도) + 스코프 드리프트 감지 + 증거 인용 필수 |
| **에러 패턴 라이브러리** | 11개 에러 패턴(네트워크, 의존성, 파일, 메모리, 권한, 코드에러, 타임아웃, git충돌, rate limit, 디스크) → LLM 호출 없이 즉시 진단 |
| **3-strike 에스컬레이션** | 동일 태스크 3회 실패 시 자동 재시도 중단 → 유저에게 알림 |
| **에러 메시지 새니타이즈** | 홈 디렉토리, API 키, 토큰을 자동 마스킹 후 저장 |
| **증거 기반 실행 룰** | 모든 에이전트 프롬프트에 6개 룰 주입 ("추측 금지", "3회 실패 시 중단", "최소 변경만" 등) |

### Modified Files

- `prompts/pm/review-task.md` — 4점 체크리스트 + 스코프 드리프트 + 증거 인용
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 리뷰 플래그 파싱, 3-strike 룰
- `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts` — 패턴 라이브러리, sanitizeErrorMessage()
- `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` — 에러 새니타이즈
- `server/modules/workflow/core/project-context-tools.ts` — 에이전트 실행 프롬프트 룰
- `server/modules/agent-runtime/execution-loop.ts` — API 모드 에이전트 프롬프트 룰
- `prompts/execution/task-policies.md` — 문서화

---

## ✅ Phase 38: 킥오프 파이프라인 재설계 — PM 오케스트레이터 주도 — Complete

> **Date:** 2026-03-28

### What was built

킥오프 흐름을 PM 오케스트레이터 중심으로 전면 재설계.

**이전 흐름:** 킥오프 LLM → 태스크+에이전트 동시 생성 → 회의와 실행 동시 시작 (회의 무의미)
**새 흐름:** 킥오프 → 태스크만 생성 → 킥오프 회의 → PM이 에이전트 배정 → 업무 실행

| Feature | Description |
|---------|-------------|
| **태스크만 생성** | 킥오프 LLM 프롬프트에서 `agent_name` 제거. 태스크는 `assigned_agent_id = NULL`로 생성 |
| **PM 오케스트레이터 배정** | 회의 완료 콜백에서 PM이 라운드 로빈으로 비-PM 에이전트에게 배정 |
| **회의 선행** | 태스크 실행 코드를 회의 완료 콜백 안으로 이동. 회의 실패 시에도 안전장치 실행 |
| **킥오프 회의 톤 변경** | "팀장 의견" → PM이 업무 배정·확인, 에이전트가 수행 계획 보고 |
| **킥오프 스테이지 오버레이** | 4단계 진행 표시 (계획→회의→배정→실행), WebSocket 이벤트, Framer Motion 애니메이션 |
| **PM은 실행 안 함** | PM 에이전트에게 태스크 배정 방지 (fallback도 비-PM 에이전트로) |

### Modified Files

- `prompts/system/project-kickoff.md` — PM 오케스트레이터 관점 프롬프트, agent_name 제거
- `server/modules/routes/core/projects/kickoff.ts` — 태스크 미배정 생성, 회의 선행, PM 배정 로직, kickoff_stage 브로드캐스트
- `src/store/uiStore.ts` — `kickoffStage` 상태
- `src/app/useRealtimeSync.ts` — `kickoff_stage` WebSocket 수신
- `src/components/desktop/Desktop.tsx` — `KickoffStageOverlay` 컴포넌트
- `src/components/desktop/MenuBar.tsx` — 오버레이 표시 중 KickoffIndicator 숨김
- `src/types/index.ts` — `kickoff_stage` WSEventType

---

## ✅ Phase 37: 다수 버그 수정 + 기능 개선 — Complete

> **Date:** 2026-03-28

### Bug Fixes

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| **Jiggle 모드 빈 화면에서 발동** | 빈 바탕화면 롱프레스 → 아이콘 위에서만 작동해야 함 | `useDesktopJiggle.ts` — 아이콘(`data-no-ctx`) 위 롱프레스만 허용 |
| **채팅 배지 안 사라짐** | `activeChatRef`가 구형 `showChat`만 확인, 윈도우 시스템 미반영 | 채팅 창 열리면 전체 unread 클리어, 열린 상태에서 새 메시지 unread 미추가 |
| **CLI timeout 30s** | 킥오프 CLI provider 타임아웃 30초 (너무 짧음) | 30s → 120s (execution-loop과 통일) |
| **CLI 창이 TaskBoard 뒤에** | `openCliWindow`이 `windowFocusOrder` 미업데이트 | z-index 최상위로 올림 |
| **PM Activity 기록 사라짐** | 태스크 삭제 시 task_logs/messages DELETE | `SET task_id = NULL`로 보존, LEFT JOIN 쿼리 |
| **회의록 CASCADE 삭제** | meeting_minutes FK `ON DELETE CASCADE` | 마이그레이션으로 `ON DELETE SET NULL` + project_id 컬럼 추가 |
| **YOLO 모드 의사결정 요청** | autopilot이 API 폴링 시에만 실행 | PM Orchestrator에서 즉시 자동승인 |
| **전사공지 프로젝트 외 에이전트 응답** | project_id 미전달 | 프론트+서버에서 project_id 전달, 프로젝트 에이전트만 필터 |
| **산출물 경로 불일치** | `resolveTaskProjectPath`가 projects.project_path 미참조 | tasks.project_id → projects.project_path 2단계 확인 |
| **SkillsLibrary 테스트 실패** | FloatingWindow title이 `<div>` (heading role 없음) | `<div>` → `<h3>` |

### Features

| Feature | Description |
|---------|-------------|
| **메뉴바 진행률** | 중앙에 `● 2 running · 3/8 done ━━░░ 37%` + 전부 완료 시 체크마크 페이드아웃 |
| **킥오프 인디케이터 중앙 이동** | 메뉴바 우측 → 중앙, 언어별 번역 적용 |
| **PM Activity 로그 확장** | Task created, Task assigned, Status → review, Task failed 로그 추가 + 필터 확장 |
| **프로젝트 경로 하위 탐색** | 외부 프로젝트 depth 5, CWD_ONLY_SKIP_DIRS 분리 |
| **파일트리 깊이 확장** | MAX_DEPTH 3→6, MAX_NODES 200→800 |
| **"프로젝트팀" 표기** | TaskReportPopup "팀 리포트" → "프로젝트팀 리포트" (4개 언어) |

### Removed

| Item | Reason |
|------|--------|
| **에이전트 그래프 앱** | 사용하지 않음. WindowType, 바탕화면 아이콘, Dock, MissionControl, DesktopWindowStack, 컴포넌트 전체 삭제 |

### Modified Files (주요)

- `src/components/desktop/useDesktopJiggle.ts`, `src/App.tsx`, `src/app/useRealtimeSync.ts`
- `src/store/uiStore.ts`, `src/components/desktop/Dock.tsx`, `src/components/desktop/MenuBar.tsx`
- `server/modules/routes/core/projects/kickoff.ts`, `server/modules/routes/core/tasks/crud.ts`
- `server/modules/routes/core/projects/pm-activity.ts`, `server/modules/workflow/orchestration/pm-orchestrator.ts`
- `server/modules/agent-runtime/execution-loop.ts`, `server/modules/routes/ops/task-reports/artifact-constants.ts`
- `server/modules/routes/ops/task-reports/artifact-http-routes.ts`, `server/modules/routes/core/projects/register-path-routes.ts`
- `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` (2개 마이그레이션)
- `src/components/TaskReportPopup.tsx`, `src/components/skills-library/FloatingWindow.tsx`
- 삭제: `src/components/flow-graph/` 전체, `FlowGraphWindow.tsx`, `FlowGraphWidget.tsx`

---

## ✅ Phase 35: Jiggle 모드 버그 수정 — Complete

> **Date:** 2026-03-28

### Bug Fix

**문제**: 바탕화면 빈 영역 롱프레스로만 작동해야 하는 Jiggle 모드가, 윈도우/Dock/메뉴바 등에서 마우스를 600ms 누르고 있으면 갑자기 발동.

**원인**: `onDesktopMouseDown` 핸들러가 최상위 컨테이너 div에 바인딩 → 모든 자식 요소의 mousedown 이벤트가 버블링 → 타이머 시작. `data-no-ctx`는 아이콘에만 있고 AppWindow/Dock에는 없었음.

**수정**: 클릭 타겟이 컨테이너 자체이거나 `data-desktop-bg` 속성이 있는 요소일 때만 타이머 시작. 버튼/인풋/윈도우 내부 클릭은 무시.

### Modified Files

- `src/components/desktop/useDesktopJiggle.ts` — 타겟 검증 강화
- `src/components/desktop/DesktopIconArea.tsx` — `data-desktop-bg` 속성 추가

---

## ✅ Phase 34: UX 개선 — 메뉴바 인디케이터 + 회의록 수정 + Reports 정리 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **메뉴바 킥오프 인디케이터** | 킥오프/clarification 진행 중 메뉴바에 스피너 + "Planning..." 표시. 태스크 생성 완료 시 자동 소멸. uiStore에 `kickoffBusy` 상태 추가 |
| **회의록 프로젝트 기반 조회** | `GET /api/tasks/:id/meeting-minutes?project_id=xxx` — project_id가 있으면 프로젝트의 모든 태스크 회의록 조회. 다른 태스크 선택해도 킥오프 회의록이 사라지지 않음 |
| **Reports 윈도우 정리** | Dashboard/Agent Performance 탭 제거 → 리포트 히스토리만 표시 |

### Bug Fix: 회의록 사라지는 문제

**원인**: 킥오프 회의록은 첫 번째 태스크 ID(`firstTaskId`)로 저장됨. 다른 태스크를 선택하면 해당 태스크 ID로만 회의록을 조회하여 킥오프 회의록이 보이지 않았음.

**수정**: `project_id` 쿼리 파라미터 지원 → 프로젝트의 모든 태스크에 연결된 회의록을 한 번에 조회.

### Modified Files

- `src/store/uiStore.ts` — `kickoffBusy` + `setKickoffBusy` 추가
- `src/components/desktop/MenuBar.tsx` — `KickoffIndicator` 컴포넌트 추가
- `src/App.tsx` — 로컬 kickoffBusy → uiStore 이동, 화면 중앙 인디케이터 제거, clarification 답변 시 kickoffBusy 연동
- `server/modules/routes/core/tasks/crud.ts` — meeting-minutes API에 `project_id` 쿼리 파라미터 지원
- `src/api/messaging-runtime-oauth.ts` — `getTaskMeetingMinutes`에 `projectId` 파라미터 추가
- `src/components/terminal-panel/useTerminalPanelData.ts` — 회의록 조회 시 `project_id` 전달
- `src/components/windows/ReportWindow.tsx` — 탭 구조 제거, 리포트 히스토리만 표시

---

## ✅ Phase 33: Clarification 모달 → 일반 창 + 비동기 처리 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **모달 → AppWindow** | 에이전트 clarification 요청을 중앙 고정 모달에서 드래그/리사이즈 가능한 일반 AppWindow로 변경 |
| **비동기 답변 처리** | "답변하기" 클릭 시 창을 즉시 닫고 토스트("답변 전송 중...") 표시 → kickoff API 백그라운드 실행 → 완료/실패 시 토스트 알림 |
| **UX 개선** | 이전: 답변 후 LLM 응답 대기 동안 "처리 중..." 표시되며 UI 블록. 이후: 즉시 창 닫히고 다른 작업 계속 가능 |

### Modified Files

- `src/App.tsx` — clarification 모달 → AppWindow 교체, onClick → 즉시 닫기 + 백그라운드 kickoff

---

## ✅ Phase 32: README 리브랜딩 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **Agent Runtime 멀티 프로바이더 반영** | README Feature 섹션에 9개 프로바이더 지원 명시 |
| **PM Orchestrator 섹션** | Custom Widgets → PM Orchestrator & Analytics로 교체 (자동 리뷰, 학습, 적합도, 회고) |
| **Architecture 다이어그램** | ASCII 아키텍처 블록 다이어그램 추가 (Frontend/Backend/Runtime/PM/Workflow/DB) |
| **Getting Started 개선** | 프로바이더 안내 확장, Local LLM 경로 안내 추가 |
| **Use Cases 리스트화** | 단일 문단 → 5개 bullet point로 재구성 |
| **도구 목록** | 5개 내장 도구 명시 (list_files, read_file, write_file, search_files, run_command) |

### Modified Files

- `README.md` — 전면 리브랜딩

---

## ✅ Phase 31: 온보딩 + Reports 대시보드 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **첫 실행 온보딩** | API 프로바이더가 하나도 없으면 토스트로 Settings → API 탭 안내 (12초 표시, 클릭 시 Settings 열기) |
| **미사용 WindowType 검토** | 모든 후보 확인 결과 AppSwitcher/MissionControl 라벨 매핑 + 모달에서 활용 중 → 제거 불필요 |

### Modified Files

- `src/App.tsx` — 로딩 완료 후 API 프로바이더 유무 체크 + 온보딩 토스트

---

## ✅ Phase 30: Reports 대시보드 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **Reports 윈도우 탭 구조** | 기존 단일 ReportHistory → 3탭 구조로 확장 (Dashboard / Agent Performance / Report History) |
| **Runtime Dashboard** | 총 실행 수, 성공률, 토큰 사용량, 도구 호출 수 통계 카드 + 성공/실패 비율 바 + 30일 일별 실행 추이 차트 + 프로바이더별/모델별 분류 |
| **Runtime Stats API** | `GET /api/agent-runtime/stats` — agent_runtime_runs 집계 (총계, 프로바이더별, 모델별, 일별 30일) |
| **SVG 아이콘** | Reports 윈도우 emoji → SVG 차트 아이콘으로 교체 |

### Reports 윈도우 탭 구성

| 탭 | 컴포넌트 | 내용 |
|----|---------|------|
| Dashboard | `RuntimeDashboard.tsx` | 실행 통계, 토큰, 프로바이더/모델 분류, 30일 트렌드 |
| Agent Performance | `AgentPerformanceDashboard.tsx` | 에이전트별 성과 (기존) |
| Report History | `ReportHistory.tsx` | 태스크 리포트 목록 (기존) |

### Modified/Created Files

- `server/modules/agent-runtime/routes.ts` — `GET /api/agent-runtime/stats` 엔드포인트 추가
- `src/api/agent-runtime.ts` — `RuntimeStats` 타입 + `getRuntimeStats()` API 래퍼
- `src/components/reports/RuntimeDashboard.tsx` — 신규: 통계 대시보드 컴포넌트
- `src/components/windows/ReportWindow.tsx` — 3탭 구조 + SVG 아이콘

---

## ✅ Phase 29: run_command 도구 + PM 적합도 배정 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **run_command 도구** | Agent Runtime에 셸 명령 실행 도구 추가. 타임아웃 30s, 출력 10KB 제한, project_path cwd 제한. 에이전트가 빌드/테스트/린트/git 등 실행 가능 |
| **PM 적합도 배정** | 킥오프 프롬프트에 `agent_task_fitness` 데이터 주입 → LLM이 에이전트 배정 시 성공률/소요시간 참고 |

### Agent Runtime 도구 목록 (5개)

| 도구 | 설명 |
|------|------|
| `list_files` | 프로젝트 디렉토리 파일/폴더 목록 (depth 1-3) |
| `read_file` | 파일 내용 읽기 (200KB 제한) |
| `write_file` | 파일 생성/수정 |
| `search_files` | 파일 내용 검색 (grep) |
| `run_command` | 셸 명령 실행 (30s 타임아웃, 10KB 출력) |

### Modified Files

- `server/modules/agent-runtime/tools.ts` — run_command 도구 정의 + 실행 함수
- `server/modules/routes/core/projects/kickoff.ts` — 에이전트 적합도 프롬프트 주입

---

## ✅ Phase 28: PM 적합도 기반 에이전트 배정 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **킥오프 적합도 주입** | `agent_task_fitness` 테이블에서 에이전트별 태스크 유형 성공률/평균 소요시간 조회 → 킥오프 프롬프트에 `track record` 정보 주입 |

### 프롬프트 예시

```
Available agents (assign tasks to the best fit):
- Alice [PROJECT LEAD], dept: Frontend, seniority: senior | track record: general: 92% success (12 tasks, avg 8m)
- Bob [DEVELOPER], dept: Backend, seniority: junior | track record: general: 75% success (4 tasks, avg 15m)
```

### Modified Files

- `server/modules/routes/core/projects/kickoff.ts` — 에이전트 목록 프롬프트에 fitness 데이터 조회 + 주입

---

## ✅ Phase 27: 멀티 프로바이더 Agent Runtime — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **OpenAI 호환 스트리밍** | `callOpenAICompatibleStream()` — Chat Completions API streaming + tool use. OpenAI/Ollama/LM Studio/Groq/Together/OpenRouter/Cerebras/Gemini(호환모드) 전부 지원 |
| **프로바이더 자동 분기** | `resolveProvider()` — api_providers 테이블에서 프로바이더 타입 해석 → Anthropic이면 Messages API, 나머지는 OpenAI 호환 자동 선택 |
| **메시지 포맷 변환** | Anthropic 내부 포맷(content blocks) ↔ OpenAI 포맷(messages + tool_calls) 자동 변환 |
| **기본 모델 매핑** | 프로바이더 타입별 기본 모델 자동 선택 (anthropic→claude-sonnet-4-6, openai→gpt-4o, ollama→llama3.2 등) |
| **환경 변수 폴백** | `ANTHROPIC_API_KEY` 또는 `OPENAI_API_KEY` 환경 변수 자동 감지 |
| **우선순위 백로그** | `docs/strategy/roadmap/BACKLOG.md` — P1~P4 우선순위 문서화 |

### Provider Support Matrix

| 프로바이더 | API 형식 | 지원 |
|-----------|---------|------|
| Anthropic | Messages API | ✅ 기존 |
| OpenAI | Chat Completions | ✅ 신규 |
| Ollama | OpenAI 호환 | ✅ 신규 |
| LM Studio | OpenAI 호환 | ✅ 신규 |
| Groq | OpenAI 호환 | ✅ 신규 |
| Together | OpenAI 호환 | ✅ 신규 |
| OpenRouter | OpenAI 호환 | ✅ 신규 |
| Cerebras | OpenAI 호환 | ✅ 신규 |
| Google Gemini | OpenAI 호환 모드 | ✅ 신규 |

### Modified/Created Files

- `server/modules/agent-runtime/llm-client.ts` — `callOpenAICompatibleStream()`, `resolveProvider()`, `getDefaultModel()`, OpenAI 메시지 변환 함수 추가
- `server/modules/agent-runtime/execution-loop.ts` — 프로바이더 타입별 자동 분기 (Anthropic vs OpenAI 호환)
- `docs/strategy/roadmap/BACKLOG.md` — 우선순위 백로그 문서 신규

---

## ✅ Phase 26: Agent Runtime 통합 + Legacy 정리 — Complete

> **Date:** 2026-03-28

### What was built

| Feature | Description |
|---------|-------------|
| **Legacy sweep 제거** | kickoff.ts의 PM oversight sweep 타이머 (startPmOversightSweep, triggerImmediatePmSweep, pmOversightProjects Map, enqueuedTaskIds Set) 완전 제거 — PM 오케스트레이터 이벤트 기반으로 대체 완료 |
| **미사용 이벤트 정리** | event-bus.ts에서 emitDecisionItem, emitProcessExit, DecisionItemEvent, ProcessExitEvent 제거 |
| **Agent Runtime → PM 오케스트레이터 연결** | execution-loop.ts 완료 시 eventBus.emitTaskStatus() 호출 — 성공→review (PM 검토), 실패→failed (PM 재시도/에스컬) |
| **Chain execution 제거** | chainNextTask 함수 + chainExecution 옵션 제거 — PM 오케스트레이터가 done 이벤트로 다음 태스크 시작 |
| **Runtime 상태 배지** | Task Card 헤더에 THINKING/TOOL USE/DONE/ERROR 실시간 배지 표시 |
| **토큰 사용량 표시** | Agent Detail 현재 태스크 영역에 input/output 토큰 + tool calls 수 표시 |
| **uiStore runtime 상태** | runtimeStatuses Map으로 taskId별 runtime 상태 추적 (10초 후 자동 정리) |

### Architecture Change

```
Before (분리됨):
  kickoff → startExecutionLoop (직접 done) ─✕─ PM 오케스트레이터
  PM 오케스트레이터 ← eventBus ← state-updates.ts (CLI runtime)

After (통합됨):
  kickoff → startExecutionLoop → review ─→ eventBus → PM 오케스트레이터
                                 failed ─→ eventBus → PM 오케스트레이터
  PM 오케스트레이터 → 리뷰/학습/다음 태스크 시작
```

### Modified/Created Files

- `server/lib/event-bus.ts` — 미사용 이벤트 제거
- `server/modules/routes/core/projects/kickoff.ts` — Legacy sweep 코드 ~200줄 제거, pmOversightProjects 제거, chainExecution 제거
- `server/modules/agent-runtime/execution-loop.ts` — eventBus 연결, review/failed 이벤트 발행, chainNextTask 제거
- `server/modules/agent-runtime/routes.ts` — chainExecution 필드 제거
- `server/modules/agent-runtime/types.ts` — chainExecution 옵션 제거
- `src/store/uiStore.ts` — runtimeStatuses Map + setRuntimeStatus/clearRuntimeStatus 추가
- `src/app/useRealtimeSync.ts` — runtime_status 이벤트에서 토큰 정보 포함하여 store 저장
- `src/components/taskboard/task-card/TaskCardHeader.tsx` — Runtime 상태 배지 추가
- `src/components/taskboard/task-card/useTaskCardState.ts` — runtimeStatus 상태 추가
- `src/components/agent-detail/AgentDetailCurrentTask.tsx` — 토큰 사용량 표시

---

## ✅ Phase 25: 기능 확장 — Complete

> **Date:** 2026-03-27

### What was built

| Feature | Description |
|---------|-------------|
| **프롬프트 히스토리 UI** | 터미널 패널에 "프롬프트" 탭 추가 — 에이전트에게 전달된 전체 프롬프트 확인 + 복사 버튼 |
| **에이전트 적합도 추적** | `agent_task_fitness` 테이블 — 에이전트별 태스크 유형 성공/실패/평균 소요시간 기록 |
| **적합도 자동 업데이트** | done 이벤트 → 성공 기록, failed 이벤트 → 실패 기록 (PM 오케스트레이터에서 호출) |

### Modified/Created Files

- `src/components/terminal-panel/TerminalPanelTabs.tsx` — 단일 탭 → 2탭 (터미널 + 프롬프트)
- `src/components/TerminalPanel.tsx` — PromptTabContent 컴포넌트 추가
- `src/components/terminal-panel/useTerminalPanelData.ts` — 탭 타입 확장
- `server/modules/workflow/orchestration/auto-learning.ts` — updateAgentFitness 추가
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — done/failed에서 fitness 업데이트
- `migrations-e-recent.ts` — agent_task_fitness 테이블

---

## ✅ Phase 24: 안정성 수정 — Complete

> **Date:** 2026-03-27

### What was built

| Feature | Description |
|---------|-------------|
| **Graceful Shutdown 개선** | in_progress → planned 복원 (cancelled 대신) → PM 오케스트레이터가 서버 재시작 후 복원 |
| **DB 인덱스 7개** | tasks(project_id, status), tasks(status, assigned_agent_id), subtasks(task_id, status), subtasks(delegated_task_id), subtasks(target_department_id), messages(sender_id, sender_type), task_logs(task_id, kind) |
| **알림 flood 방지** | 같은 task_id+type 조합 5초 내 중복 차단 |
| **DB 트랜잭션** | 태스크 상태 업데이트 (in_progress→review) 원자성 보장 (BEGIN/COMMIT/ROLLBACK) |

### Modified Files

- `server/modules/lifecycle/register-graceful-shutdown.ts` — cancelled → planned
- `server/modules/routes/ops/notifications.ts` — flood dedupe 로직
- `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` — 트랜잭션 래핑
- `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` — 인덱스 7개

---

## ✅ Phase 23: Optimize 학습 루프 — Complete

> **Date:** 2026-03-27

### What was built

| Feature | Description |
|---------|-------------|
| **자동 학습** | 태스크 done 시 PM LLM이 Rules/Memory 자동 추출 → rule_entries/skill_learning_history 저장 |
| **프로젝트 회고** | 모든 태스크 완료 시 PM이 회고 보고서 자동 생성 → 프로젝트 directive에 append |
| **PM 프롬프트** | `prompts/pm/auto-learn.md` (학습 추출), `prompts/pm/project-retrospective.md` (회고) |
| **이벤트 기반** | done 이벤트 → 학습, 프로젝트 완료 → 회고. 타이머 0건 |

### PM 오케스트레이션 전체 흐름 (Phase 21-23)

```
킥오프 → 태스크 생성 → PM oversight state DB 저장
  ↓
에이전트 실행 → 완료 (exit=0) → review 이벤트
  → PM LLM 검토: APPROVE → finishReview → 리뷰 회의 → done
                  REVISE → 에이전트에게 피드백 + 재실행
  ↓
done 이벤트 →
  1. PM 자동 학습 (Rules/Memory 추출)
  2. PM 다음 태스크 시작 (idle 에이전트에게 배정)
  3. 프로젝트 완료 시 → PM 회고 보고서 생성
  ↓
에이전트 실행 → 실패 (exit≠0) → failed 이벤트
  → 에러 분석 AI (로그 분석 → error_analysis 저장)
  → PM LLM 판단: RETRY → 재시도
                  REASSIGN → 다른 에이전트
                  ESCALATE → 사용자 알림
```

### Modified/Created Files

- **신규** `server/modules/workflow/orchestration/auto-learning.ts`
- **신규** `prompts/pm/auto-learn.md`
- **신규** `prompts/pm/project-retrospective.md`
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 학습 + 회고 연결

---

## ✅ Phase 22: Debug 경험 — Complete

> **Date:** 2026-03-27

### What was built

| Feature | Description |
|---------|-------------|
| **에러 분석 AI** | 태스크 실패 시 LLM이 로그 분석 → `error_analysis` JSON 저장 (summary, cause, suggestion) |
| **에러 분석 프롬프트** | `prompts/system/error-analysis.md` — 8가지 에러 유형 분류 |
| **프롬프트 히스토리 API** | `GET /api/tasks/:id/prompt` — 에이전트에게 전달된 프롬프트 조회 |
| **원클릭 재실행 API** | `POST /api/tasks/:id/retry` — failed 태스크를 planned로 리셋 |
| **재실행 버튼 UI** | ERR 카드에 재실행 버튼 + 로딩 상태 |
| **에러 요약 UI** | ERR 카드에 AI 분석 결과 인라인 표시 (요약 + 해결 제안) |
| **TaskStatus 타입 확장** | `"failed"` 추가 + 관련 상수/컬러맵 업데이트 |

### Modified/Created Files

- **신규** `server/modules/workflow/orchestration/run-complete-handler/error-analysis.ts`
- **신규** `prompts/system/error-analysis.md`
- `server/modules/routes/core/tasks/crud.ts` — prompt/retry 엔드포인트
- `server/modules/workflow/orchestration/pm-orchestrator.ts` — 실패 시 에러 분석 호출
- `src/api/project-kickoff.ts` — fetchTaskPrompt, retryTask API
- `src/components/taskboard/task-card/TaskCardActions.tsx` — 재실행 버튼
- `src/components/taskboard/task-card/index.tsx` — 에러 분석 요약 표시
- `src/types/index.ts` — TaskStatus에 "failed" + Task에 error_analysis 필드
- `src/components/desktop/project-folder-window/constants.ts` — failed 상태 색상/라벨
- `src/components/task-board/useTaskBoard.ts` — statusCodeMap에 failed 추가
- `migrations-e-recent.ts` — error_analysis 컬럼

---

## ✅ Phase 21: PM 에이전트 오케스트레이션 — Complete

> **Date:** 2026-03-27

### What was built

| Feature | Description |
|---------|-------------|
| **EventBus** | `server/lib/event-bus.ts` — 태스크 상태 변경 이벤트 허브. 타이머 폴링 대체 |
| **PM Orchestrator** | `server/modules/workflow/orchestration/pm-orchestrator.ts` — PM LLM이 태스크 검토, 실패 처리, 다음 태스크 시작 판단 |
| **PM 프롬프트** | `prompts/pm/` — review-task, handle-failure, decide-inbox, start-next 4개 프롬프트 |
| **이벤트 기반 전환** | PM oversight sweep (15s) + YOLO autopilot (2.5s) 폴링 비활성화 → 이벤트 드리븐 |
| **태스크 재시도** | tasks.retry_count, max_retries 컬럼 + PM이 retry/reassign/escalate 판단 |
| **서버 상태 복원** | pm_oversight_state 테이블 + 서버 시작 시 미완료 프로젝트 자동 복원 |
| **메모리 누수 수정** | activeProcesses Map close 이벤트에서 삭제 |
| **에러 요약 기록** | 실패 태스크의 last_error_summary 자동 저장 → PM이 원인 분석에 활용 |

### PM 오케스트레이션 흐름

```
태스크 완료 (exit=0) → review 이벤트 → PM LLM 호출
  → "APPROVE" → finishReview → 리뷰 회의 → done → 다음 태스크 시작
  → "REVISE" → 에이전트에게 피드백 → 재실행

태스크 실패 (exit≠0) → failed 이벤트 → PM LLM 호출
  → "RETRY" → planned 전환 + 재실행
  → "REASSIGN" → 다른 에이전트에게 이관
  → "ESCALATE" → 사용자에게 알림
```

### Modified/Created Files

- **신규** `server/lib/event-bus.ts`
- **신규** `server/modules/workflow/orchestration/pm-orchestrator.ts`
- **신규** `prompts/pm/review-task.md`, `handle-failure.md`, `decide-inbox.md`, `start-next.md`
- `server/modules/workflow/orchestration.ts` — PM 오케스트레이터 초기화
- `server/modules/workflow/orchestration/run-complete-handler/state-updates.ts` — 이벤트 발행 + 에러 요약
- `server/modules/workflow/orchestration/review-finalize-tools/finalize-approved-review.ts` — done 이벤트 발행, 자동 체이닝 제거
- `server/modules/routes/core/projects/kickoff.ts` — pm_oversight_state persist, sweep 비활성화
- `server/modules/routes/ops/messages/decision-inbox-routes.ts` — YOLO 타이머 비활성화
- `server/modules/workflow/agents/cli-runtime.ts` — activeProcesses 메모리 누수 수정
- `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` — retry_count + pm_oversight_state

---

## ✅ Phase 20-C: 킥오프 회의 개선 + 추가 업무 지시 패널 — Complete

> **Date:** 2026-03-26

### What was built

| Feature | Description |
|---------|-------------|
| **킥오프 회의 전원 참석** | project_agents 전원 회의 참석 (태스크 배정 무관), 태스크 미배정 에이전트도 "지원 대기" 발언 |
| **PM 사회자** | project_role='pm' 에이전트가 사회자(오프닝+클로징), PM 없으면 첫 번째 에이전트 fallback |
| **회의록 역할 표시** | meeting_minute_entries.role_label에 프로젝트 역할(PM/PL/Dev) 우선 저장, 없으면 직급 저장 |
| **에이전트별 태스크 발표** | 복수 태스크 배정 시 "담당 업무 N건" 으로 일괄 발표 |
| **NewRoundPanel** | 프로젝트 폴더 창 하단 고정 패널 — 추가 업무 지시 → 킥오프 재실행 |
| **additional_directive** | kickoff API에 `additional_directive` 파라미터 추가 (라운드 한정 업무 지시) |
| **5가지 모드** | collapsed / idle / loading / clarification / disabled + error |
| **폴더 탐색 → 일반 창** | ManualPathPickerDialog 모달 → AppWindow 일반 창 전환 |
| **마이그레이션 수정** | `2026-03-26-004` PRAGMA → DDL 문자열 방식으로 변경 (node:sqlite SAVEPOINT 충돌 해결) |

### Modified Files

- `kickoff.ts` — meetingAgents 전원 참석, PM 사회자, additional_directive 파라미터
- `project-kickoff.ts` — kickoffProject 시그니처에 additionalDirective 추가
- `project-folder-window/index.tsx` — NewRoundPanel 렌더링 + 킥오프 완료 시 Tasks 탭 전환
- `project-folder-window/NewRoundPanel.tsx` — 신규: 추가 업무 지시 패널
- `ManualPathPickerDialog.tsx` — 모달 → AppWindow 전환
- `App.tsx` — 킥오프 로딩 인디케이터 화면 중앙 배치
- `types.ts` — WindowType에 "folder-browser" 추가
- `AppSwitcher.tsx`, `MissionControl.tsx` — folder-browser 항목 추가
- `migrations-e-recent.ts` — 2026-03-26-004 마이그레이션 수정

---

## ✅ Phase 20-B: PM/PL/Dev 역할 기반 프로젝트 팀 구성 — Complete

> **Date:** 2026-03-26

### What was built

| Feature | Description |
|---------|-------------|
| **Role-slot UI** | 프로젝트 생성 Step 4가 체크박스 → 3개 역할 슬롯(PM·PL·Dev)으로 교체 |
| **필수 3인** | PM, PL, Dev 모두 배정해야 프로젝트 생성 가능 (validation) |
| **project_role DB** | `project_agents.project_role TEXT CHECK(IN 'pm','pl','dev')` 컬럼 추가 (migration `2026-03-25-005`) |
| **Kickoff 프롬프트** | 역할 정보 `[PROJECT MANAGER]`, `[PROJECT LEAD]`, `[DEVELOPER]` 레이블 포함 |
| **SVG-only 아이콘** | 모달 내 이모지 전량 SVG 교체 — 봇·체크·쉐브론·경고·카테고리 10종·디렉티브 10종 |

### Modified Files

- `migrations-e-recent.ts` — `project_agents.project_role` 마이그레이션
- `register-crud-routes.ts` — `role_assignments` 읽어 project_agents 삽입
- `kickoff.ts` — 역할 레이블 프롬프트 주입
- `organization-projects.ts` — `createProject` 타입에 `role_assignments` 추가
- `ProjectCreateModal.tsx` — 역할 슬롯 UI + SVG 아이콘 전환
- `CategorySelectStep.tsx` — 카테고리 이모지 → SVG 매핑
- `DirectiveEditorStep.tsx` — 이모지 → SVG, `▾`/`✓` → SVG
- `App.tsx` — `assignment_mode: "manual"` + `role_assignments` 전달

---

## ✅ Phase 20: Agent-Driven Task Planning (Kickoff) — Complete

> **Goal:** 프로젝트 생성 후 에이전트가 자동으로 태스크를 계획하고, 부족한 정보는 유저에게 질문하는 워크플로우
> **Date:** 2026-03-25

### What was built

| Feature | Description |
|---------|-------------|
| **Project Kickoff** | LLM이 `directive` + `core_goal` + 배정 에이전트 목록을 읽어 3–7개 태스크 자동 생성 |
| **Multi-agent Distribution** | LLM이 각 태스크에 최적 에이전트 추천 (`agent_name` 필드) → 서버에서 ID 매핑 |
| **Auto-execute first task** | kickoff 완료 직후 첫 번째 태스크를 `startExecutionLoop`로 자동 실행 |
| **Clarification Channel** | 정보 부족 시 `clarification_request` WS 이벤트 → 유저 모달 → 재kickoff |
| **Kickoff Button** | TaskBoard 툴바에 `⚡ Kickoff` 버튼 추가 (프로젝트 선택 시 표시) |
| **Removed manual "새업무"** | 수동 태스크 생성 UI 제거 — 에이전트가 판단해서 계획 |

### New Files

- `server/modules/routes/core/projects/kickoff.ts` — kickoff + clarification-reply 엔드포인트
- `src/api/project-kickoff.ts` — 프론트엔드 API 래퍼
- `server/modules/bootstrap/schema/versioned-migrations/migrations-e-recent.ts` — `project_clarifications` 테이블

### Modified Files

- `App.tsx` — kickoff 자동 호출, clarification WS 핸들러, clarification 모달
- `Dock.tsx`, `Desktop.tsx`, `DesktopOverlays.tsx`, `CommandPalette` — 새업무 흐름 제거
- `TaskBoardToolbar.tsx`, `TaskBoardWindow.tsx` — Kickoff 버튼 연결

---

## ✅ Phase 19-C: First Task Auto-Execution — Complete

> Kickoff 완료 즉시 첫 번째 태스크를 `startExecutionLoop`로 자동 실행.
> `kickoff.ts` 내 구현 (`Phase 20`의 일부로 포함됨).

---

## ✅ Phase 19-B: Project Directive System — Complete

> **Goal:** 프로젝트 유형 선택 시 에이전트 행동 전체를 제어하는 디렉티브 시스템
> **Spec:** [`strategy/PROJECT-DIRECTIVE-SPEC.md`](strategy/PROJECT-DIRECTIVE-SPEC.md)

### Why

프로젝트 유형(MVP, 풀스택, 모바일 등)에 따라 에이전트의 작업 원칙, 태스크 분해 방식, 품질 기준, 리뷰 프로세스가 달라져야 함. 유저가 자유롭게 수정 가능한 마크다운 디렉티브로 이를 구현.

### Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | 스펙 문서 (PROJECT-DIRECTIVE-SPEC.md) | ✅ |
| 2 | DB 마이그레이션 (projects.directive, directive_type_slug) | ✅ |
| 3 | 10개 유형별 디렉티브 템플릿 + 카테고리 씨드 교체 | ✅ |
| 4 | API (GET /api/directive-templates, POST/PATCH projects에 directive 포함) | ✅ |
| 5 | 프로젝트 생성 모달 — 디렉티브 에디터 스텝 추가 (4단계 흐름) | ✅ |
| 6 | 태스크 실행 시 디렉티브 프롬프트 주입 (execution-run.ts) | ✅ |
| 7 | 프로젝트 우클릭 "디렉티브 편집" 모달 | ✅ |

### Project Types (10)

🚀 MVP · 🏗️ 풀스택 · 📱 모바일 · 🔌 API/백엔드 · 🎨 프론트엔드 · 🤖 AI/ML · 📦 오픈소스 · ⚙️ DevOps · 🏢 엔터프라이즈 · 🔬 리서치

---

## ✅ Phase 19: Agent Runtime Engine — Complete

> **Goal:** AgentDesk가 직접 LLM API를 호출하여 에이전트가 자율 실행하고, 과정이 실시간으로 UI에 반영되는 시스템 구축
> **Spec:** [`strategy/AGENT-RUNTIME-SPEC.md`](strategy/AGENT-RUNTIME-SPEC.md)

### Why

UI/모니터링/워크플로우 인프라는 완성되었지만, 에이전트 실행은 외부 CLI에 위임하는 구조. "Agent OS"가 되려면 자체 실행 엔진이 필요.

### Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 1 | LLM Client + Streaming (Anthropic Messages API, WebSocket broadcast) | ✅ |
| 2 | Tool Use Loop (list_files, read_file, write_file, search_files) | ✅ |
| 3 | Execution Store (DB tables + 완료 처리 + Task 상태 갱신) | ✅ |
| 4 | UI Integration (CLI Window / Task Board / Agent Detail / Flow Graph) + Demo | ✅ |

### New Module Structure

```
server/modules/agent-runtime/
├── runtime-manager.ts        ← 실행 시작/중지/상태
├── execution-loop.ts         ← LLM ↔ Tool 자율 반복
├── llm-client.ts             ← LLM API 추상화
├── tool-executor.ts          ← 내장 도구 실행기
├── tools/                    ← 내장 도구 (5종)
├── prompt-assembler.ts       ← 프롬프트 조합
└── execution-store.ts        ← 실행 이력 DB
```

### Target Demo

```
에이전트 선택 → 태스크 생성 → 자동 실행 (파일 읽기 → LLM 분석)
→ CLI Window 실시간 스트리밍 → Task Board 상태 갱신 → Task Report 결과
```

---

## Completed Phases (1–18)

All previous phases are complete. Key milestones:

- **Phase 18** — Agent CLI: PTY 터미널 + 에이전트별 세션 + CLI 자동 실행
- **Phase 17** — Project Folders: 폴더 컨테이너 + 디스크 이동 + FolderWindow
- **Phase 16** — Cross-Project Handoff: deliverable checklist + source context injection
- **Phase 15** — Image Studio: txt2img + inpaint + gallery + task integration
- **Phase 14** — MED Features: lazy loading, 채팅 검색/핀, 태스크 일괄, 성과 히스토리
- **Phase 13** — CSS Overhaul: 전체 tsx → --th-* 변수 시스템
- **Earlier** — Security hardening, performance optimization, Workflow Builder, Synapse, Local LLM, Custom Features, macOS UX (MX-01~12), Widget Board, Flow Graph 등
