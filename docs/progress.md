# AgentDesk — 개발 진행 현황

> 마지막 업데이트: 2026-03-16

---

## 완료된 작업

| Phase | 내용 | 완료일 |
|-------|------|--------|
| Phase 13 | FM2024 Overhaul — 모든 tsx → `--th-*` CSS 변수 전환 | 2026-03-14 |
| Phase 14 | MED Features — lazy loading, 채팅 검색/핀, 태스크 일괄, 성과 히스토리 | 2026-03-14 |
| Phase 19 | Office View v2 — 5-zone 재설계, 12개 신규 컴포넌트 | 2026-03-15 |
| P0~P3 + Security | 전체 로드맵 완료 (상세: `docs/OVERVIEW.md` 섹션 8) | 2026-03-14 |

---

## 2026-03-16 작업 완료 목록

### Custom Widget Platform (Phase 1~5) ✅
- **Phase 1**: `custom_features` DB 테이블 + CRUD API
- **Phase 2**: 템플릿 7종 + `WidgetBuilderModal` 4단계 스텝
- **Phase 3**: `CustomFeatureRenderer` / `CustomFeatureWidget` / `CustomFeatureWindow` + WidgetPicker/Dock 통합
- **Phase 4**: AI 생성 파이프라인 — `defaultProvider` 연동, 안전성 검증, `StepAiGenerate` 폴링 UI
- **Phase 5**: esbuild TSX→IIFE 번들 + sandbox iframe 렌더러(`AiBundleRenderer`)

### `workflow_pack_key → context_hint` 리팩토링 ✅
- DB migration `2026-03-16-002`: `tasks` 테이블에 `context_hint` 컬럼 추가 (dual-write 전략)
- 서버 16개 파일 업데이트: INSERT/UPDATE 시 두 컬럼 동시 기록, 읽기는 `context_hint ?? workflow_pack_key` fallback
- 프론트엔드 타입 및 API 함수 업데이트

### 프로젝트 비용 집계 ✅
- **Server**: `GET /api/projects/:id/cost-summary` — 총비용, 이번달, 에이전트별, 워크플로우별 분류
- **Frontend**: `getProjectCostSummary()` API + `ProjectCostSection` 컴포넌트 (`ProjectInsightsPanel` 내)

### 프로젝트 템플릿 ✅
- **DB migration** `2026-03-16-003`: `project_templates` / `project_template_objectives` / `project_template_gates` 테이블
- **빌트인 템플릿 4종**: Web Application, Research Report, Video Production, Data Analysis
- **Server API**: `GET/POST /api/project-templates`, `DELETE /api/project-templates/:id`, `POST /api/projects/:id/apply-template/:templateId`
- **Frontend**: `getProjectTemplates()` / `applyProjectTemplate()` + 프로젝트 생성 폼 템플릿 피커 UI

### versioned-migrations 테스트 수정 ✅
- 누락된 테이블 5개(`hook_entries` 등) `makeDb()`에 추가 → 186개 테스트 전체 통과

### macOS UI 개선 ✅
- **바탕화면 아이콘 이름 편집**: 더블클릭 → 인라인 편집 (Enter/Esc/blur), localStorage 저장
- **NotificationCenter**: TrafficLights 타이틀바 추가, CSS 변수 정리, 둥근 모서리
- **ManualPathPickerDialog**: macOS 스타일 전면 리팩토링 (TrafficLights, 툴바, rounded corners, z-index 1200)
- **ChatPanelHeader**: TrafficLights 추가, 기존 ✕ 버튼 제거, `embedded` prop
- **CommandPalette**: 하드코딩 색상 → `var(--th-*)` 전환
- **SettingsWindow**: 앱 열릴 때 `cliStatus` 자동 fetch

---

---

## 2026-03-17 작업 완료 목록

### Deliverables 탭 개선 ✅
- **`Deliverables.tsx`**:
  - 검색 바 추가 (제목/에이전트명/프로젝트명/context_hint 통합 검색)
  - 정렬 옵션 추가 (날짜/제목/에이전트/프로젝트)
  - 프로젝트 필터 추가: 현재 프로젝트만 / 전체 프로젝트 토글
  - `showAllProjects` 상태로 프로젝트 선택 시 해당 프로젝트 자동 필터링
  - 필터 결과 카운트 표시 (N / total)
- **`DeliverableCard.tsx`**:
  - ↑ Upload 버튼 추가 — ARTIFACT FILES 섹션 헤더에 표시
  - `uploadTaskArtifacts()` API 연동 + 업로드 중 상태 표시
  - 업로드 성공 시 `onArtifactsUploaded` 콜백으로 부모 상태 업데이트
  - 파일 없을 때 업로드 안내 메시지 표시

### Hooks 탭 UX 개선 ✅
- **`HooksLibrary.tsx`**: "프로젝트 선택" 게이트 제거 → 프로젝트 없이도 Global Hooks 관리 가능
  - Global / Project / Other 섹션으로 명확히 구분 표시
  - `filters: undefined` → 모든 hook 로드 후 클라이언트 분류
- **`HooksGrid.tsx`**: scope 배지 추가 (project/agent/department/workflow_pack), `emptyMessage` prop 추가
- **`HookFormModal.tsx`**: `scopeOverride` 강제 제거 → Scope 선택 UI 추가
  - Global / Project / Agent / Department / Workflow 5가지 scope 선택 버튼
  - scope_id 입력 필드 (Global 제외)
  - 프로젝트 선택 시 Project scope + 해당 ID 기본값 설정

### Workflow Builder — 노드 편집 패널 + Run 기능 ✅
- **`WbNodeEditPanel.tsx`** (신규): 노드 선택 시 우측에 나타나는 편집 패널
  - Trigger: triggerType 라디오, schedule→크론 입력, webhook→경로 입력
  - Agent: agentId 드롭다운, skill 입력, instruction 텍스트에어리어
  - Gate: branches 토글 (success/failure/timeout)
  - Condition: expression 텍스트에어리어
  - 노드 삭제 버튼 (연결 엣지 자동 제거)
- **`WbRunModal.tsx`** (신규): ▶ Run 버튼 → 실행 모달
  - Agent 노드만 태스크로 생성 (trigger/gate/condition 제외)
  - Gate/Condition 노드를 통한 간접 에이전트 의존성 자동 해석 (BFS)
  - 실시간 태스크 실행 현황 모니터링
- **`WorkflowBuilder.tsx`** 업데이트:
  - 노드 클릭 → `selectedNodeId` → 우측 편집 패널 표시
  - 캔버스 빈 곳 클릭 → 선택 해제
  - ▶ Run 버튼 추가 (툴바)
  - 힌트 텍스트에 "클릭하여 편집" 추가

---

### Custom Widget 파라미터 UI 세분화 ✅
- **`templates/index.ts`**: `TemplateParam`에 신규 필드 추가 — `placeholder`, `hint`, `min`, `max`, `step`, `multiline`, `"agent"` 타입
- **`WidgetBuilderModal.tsx`**: 파라미터 렌더링 전면 개선
  - `toggle` → 비주얼 슬라이더 스위치 (animate, knob 포함)
  - `text` → `multiline: true` 시 `<textarea>`, 기본은 `<input type="text">`
  - `number` → `min`/`max`/`step` 속성 + 전폭 입력
  - `agent` (신규) → 에이전트 드롭다운 (agentStore 연동)
  - 모든 필드 아래 `hint` 서브텍스트 표시
  - `placeholder` 속성 지원
- **`agent-single-monitor` 템플릿**: `agentId` 파라미터 → `type: "agent"` + hint 추가
- **`task-daily-counter` 템플릿**: `target` 숫자에 `min`/`max`/`step`/`hint` 추가
- **`memo-board` 템플릿**: `content` → `multiline: true` + `placeholder`/`hint` 추가

---

### Template 관리 UI ✅
- **`src/components/templates-library/TemplatesLibrary.tsx`** (신규): Library 창 "Templates" 탭
  - **Project Templates** 탭: 빌트인(🔒) + 커스텀(삭제 가능) 카드 목록
    - 카드 클릭 → 확장(목표/게이트/목표 템플릿 표시)
    - **+ New Template** 인라인 폼: 이름·카테고리·설명·목표 리스트·게이트 리스트 편집
    - 커스텀 템플릿 삭제 (`deleteProjectTemplate` API 연동)
  - **Task Templates** 탭: 저장된 태스크 템플릿 목록 + 삭제
    - 태스크 생성 폼에서 SAVE 시 여기 반영
- **`src/components/windows/LibraryWindow.tsx`**: "Templates" 탭 추가 (lazy load)

---

### Workflow Builder 저장/불러오기 개선 ✅
- **`currentId` localStorage 영속화** — 페이지 새로고침 후에도 현재 워크플로 ID 유지, 중복 생성 버그 수정
- **자동 저장(auto-save)** — nodes/edges/name 변경 시 즉시 localStorage 기록 (useEffect)
- **미저장 변경 표시(● dirty 인디케이터)** — 저장 전 변경사항 있을 때 이름 옆 amber ● 표시
- **"+ New" 확인 다이얼로그** — dirty 상태에서 New 누르면 "Discard & New" 확인 요청
- **템플릿 목록 개선** — 각 워크플로에 노드 수 + 상대 시간(e.g. "5 nodes · 2h ago") 표시
- **handleSave dirty 초기화** — 저장 성공 시 dirty flag 해제

---

### Project Dashboard UI ✅
- **`ProjectInsightsPanel.tsx`**: `ProjectDashboardSection` 컴포넌트 추가 (프로젝트 선택 시 항상 표시)
  - **Objectives** 섹션: 원형 progress 표시(SVG) + 상태 배지(Active/Completed/Cancelled)
    - 인라인 편집: title, status 드롭다운, progress 슬라이더 (0~100, step 5)
    - 추가(+ Add) 인라인 폼 / 삭제(✕) 버튼 (hover 시 표시)
  - **Gates** 섹션: 상태 배지(Pending/In Progress/Passed/Failed)
    - 인라인 편집: title, status 드롭다운, criteria 텍스트
    - 추가/삭제 동일 패턴, due_date 표시
  - `objectivesApi` / `gatesApi` 연동 (GET/POST/PATCH/DELETE)
- **`ProjectManagerModal.tsx`**: `language` prop 추가 전달

### 알림 센터 개선 ✅
- **날짜별 그룹화**: Today / Yesterday / Older 섹션 헤더 (sticky), 섹션별 unread 카운트 표시
- **호버 퀵액션**: 항목에 마우스오버 → "읽음 처리(✓)" + "삭제(🗑)" 버튼 나타남 (우측 절대 배치)
- **삭제 슬라이드아웃**: 삭제 시 `translateX(320px)` + fade 트랜지션 (220ms)
- **읽은 알림 전체 삭제**: 타이틀바 우측 🗑 버튼 + 하단 푸터 "Clear N read" 버튼
- **타입 필터 배지**: 각 필터 칩에 해당 타입 unread 카운트 표시
- **신규 알림 추적**: `newIds` Set으로 2초간 새 알림 식별 (애니메이션 확장 가능)
- **하단 요약 푸터**: "N total · N unread" + "Clear N read" 링크
- **기본값 변경**: `hideRead` 기본값 `false` → All 표시 (이전: 기본 unread만)
- **에이전트 정보 표시**: 항목 하단에 에이전트 이모지 + 이름 표시

### 데이터 내보내기 ✅
- **`server/modules/routes/ops/data-export.ts`** (신규): `GET /api/export`
  - `type`: `tasks` | `deliverables` | `agents` | `costs`
  - `format`: `csv` | `json` (CSV는 UTF-8 BOM 포함 — Excel 호환)
  - 필터: `project_id`, `status`(tasks only), `since`/`until` (timestamp)
  - `Content-Disposition: attachment` 헤더로 브라우저 자동 다운로드
- **`ExportModal.tsx`** (신규): 내보내기 설정 모달
  - 4가지 데이터 타입 카드 선택 (태스크 / 결과물 / 에이전트 / 비용)
  - CSV / JSON 형식 토글
  - 프로젝트 필터, 상태 필터(tasks), 날짜 범위 (date input → ms 변환)
  - "↓ 내보내기" 버튼 → `<a>` 태그로 브라우저 다운로드 트리거
- **`MenuBar.tsx`**: "AgentDesk" 앱 메뉴에 "↓ 데이터 내보내기..." 항목 추가
- **`Desktop.tsx`**: `showExportModal` 상태 + `onOpenExportModal` prop 연결

### 에이전트 성능 대시보드 ✅
- **`server/modules/routes/ops/agent-performance.ts`** (신규): `GET /api/agents/performance` — 에이전트별 집계
  - 총 태스크 수, done/review/in_progress/cancelled/failed_exec 카운트
  - 성공률 (done / (total - cancelled)), 평균 완료시간 (AVG(completed_at - started_at))
  - 일별 태스크 트렌드 (최근 N일, 기본 30일)
  - 쿼리 파라미터: `project_id`, `days`
- **`AgentPerformanceDashboard.tsx`** (신규): Library 창 "Performance" 탭
  - 에이전트 카드 그리드 (auto-fill)
  - 성공률 배지 (green ≥80% / amber ≥50% / red <50%)
  - StatusBar: done/review/in_progress/cancelled 비율 스택 바
  - Sparkline: SVG 폴리라인 + 점 (일별 태스크 추이)
  - 정렬: Total / Done / Success Rate / Speed(평균시간)
  - 프로젝트 필터 + 기간 선택 (7/14/30/60/90일)
  - 상단 요약 바: 총 에이전트 · 총 태스크 · 완료 · 전체 성공률
- **`LibraryWindow.tsx`**: "Performance" 탭 추가 (lazy load)

### 워크플로 스케줄러 ✅
- **DB migration** `2026-03-17-001-workflow-schedules`: `workflow_schedules` 테이블 (id, template_id, cron_expr, enabled, last_run_at, next_run_at)
- **`server/modules/workflow/cron-utils.ts`** (신규): 5-field cron 파서 + `nextCronRunAfter()` / `validateCron()` (외부 의존성 없음)
- **`server/modules/workflow/workflow-scheduler.ts`** (신규): 1분 주기 데몬 — due 스케줄 감지 → agent 노드 태스크 자동 생성 → next_run_at 갱신
- **`server/modules/routes/ops/workflow-schedules.ts`** (신규): CRUD REST API (`GET/POST/PUT/DELETE /api/workflow-schedules`)
- **`lifecycle.ts`**: `startWorkflowScheduler()` 시작 + 종료 시 정리
- **`WbScheduleModal.tsx`** (신규): cron 프리셋 6종 + 직접 입력 + 활성/비활성 토글 + 다음/마지막 실행 시간 표시
- **`WorkflowBuilder.tsx`**: ⏰ 버튼 추가 (저장된 워크플로일 때만 표시)

### 글로벌 검색 (CommandPalette 확장) ✅
- **`CommandPalette.tsx`**: Deliverables / Hooks / Workflows 검색 지원
  - 세션당 1회 lazy fetch: `getDeliverables()`, `getHooks()`, `GET /api/composition-templates`
  - Deliverables 섹션: 제목, 에이전트명, 프로젝트명, 상태 배지 (done/review)
  - Hooks 섹션: 제목, command(모노스페이스), event_type 배지
  - Workflows 섹션: 이름, 노드 수 (nodes_json 파싱), 쿼리 없을 때 최대 3개 표시
  - `executeItem` → 각각 deliverables / hooks / workflow 뷰로 이동

---

## 현재 미완성 / 다음 후보

공식 백로그 완료 — 추가 작업은 사용자 요청에 따라 진행.

---

## 문서 현황

| 문서 | 상태 |
|------|------|
| `docs/OVERVIEW.md` | ✅ 최신 (2026-03-16 업데이트) |
| `docs/features/custom-widget-platform.md` | ✅ 완료 표시 |
| `docs/specs/api.md` | ⚠️ 신규 엔드포인트 미반영 (project-templates, cost-summary) |
| `docs/architecture/` | 참조용 유지 |
| `docs/design/DESIGN.md`, `UI-SCREENS.md` | 참조용 유지 |

### 삭제된 문서 (2026-03-16)
- `docs/strategy/p2-tasks-design.md` — P2 작업 전체 완료, 구현 지침 불필요
- `docs/strategy/agent-persona-system.md` — 2026-03-08 폐기 결정, 기능 구현 완료
- `docs/features/custom-widget-platform-tech-spec.md` — 구현 완료, 기획서에 통합
