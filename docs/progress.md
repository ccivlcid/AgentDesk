# AgentDesk — 개발 진행 현황

> 마지막 업데이트: 2026-03-17

---

## 완료된 작업

| Phase | 내용 | 완료일 |
|-------|------|--------|
| Phase 13 | FM2024 Overhaul — 모든 tsx → `--th-*` CSS 변수 전환 | 2026-03-14 |
| Phase 14 | MED Features — lazy loading, 채팅 검색/핀, 태스크 일괄, 성과 히스토리 | 2026-03-14 |
| Phase 19 | Office View v2 — 5-zone 재설계, 12개 신규 컴포넌트 | 2026-03-15 |
| P0~P3 + Security | 전체 로드맵 완료 (상세: `docs/OVERVIEW.md` 섹션 8) | 2026-03-14 |

---

## 2026-03-16 실행 파이프라인 감사 ✅

소스코드 직접 분석 (에이전트 설정·태스크 실행·회의·통신 전 범위)

**결과:** 핵심 기능 모두 실제 구현 확인. 버그 6건 발견 → `docs/bugs/PIPELINE-AUDIT-2026-03-16.md`

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| BUG-01 | 🔴 P0 | 프롬프트 빌드 예외처리 없음 (서버 크래시 가능) | `execution-run.ts` | ✅ 수정완료 |
| BUG-02 | 🟡 P1 | 서브태스크 완료 정규식 따옴표 파싱 실패 | `stream-tools.ts` | ✅ 수정완료 |
| BUG-03 | 🔵 P2 | 에이전트 저장 실패 시 UI 피드백 없음 | `AgentManager.tsx` | ✅ 수정완료 |
| BUG-04 | 🔵 P2 | 아바타 업로드 실패 시 UI 피드백 없음 | `AgentManager.tsx` | ✅ 수정완료 |
| BUG-05 | 🔵 P2 | 메신저 수신자 시작 실패 silent | `lifecycle.ts` | ✅ 수정완료 |
| BUG-06 | 🟡 P1 | 스트림 버퍼 2KB 제한 (서브태스크 손실) | `stream-tools.ts` | ✅ 수정완료 |

> 수정 상세 지침 → **`docs/bugs/PIPELINE-AUDIT-2026-03-16.md`**

---

## 2026-03-16 UI 기능 감사 (Workflow Builder · REPL · Flow Graph) ✅

소스코드 직접 분석 결과. 상세 → `docs/bugs/UI-AUDIT-2026-03-16.md`

### Agent REPL
**✅ 완전 정상 동작 — 버그 없음**
- 명령어 파싱, Task 생성/실행, WebSocket 스트리밍, `:inject` 프롬프트 주입 모두 실제 API 연동 완비

### Workflow Builder
**⚠️ 핵심 동작 + 3건 미완성**

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| WB-01 | ❌ 미구현 | Condition 노드 런타임 조건 평가 없음 (경로 추적만 사용) | `WbRunModal.tsx` | ✅ 수정완료 |
| WB-02 | 🟡 P1 | 의존성 설정 실패 시 Task 롤백 없음 (고아 Task 생성) | `WbRunModal.tsx` | ✅ 수정 완료 |
| WB-03 | 🔵 P2 | Trigger 노드 타입 정보가 Task에 저장되지 않음 | `WbRunModal.tsx` | ✅ 수정 완료 |

### Agent Flow Graph
**⚠️ 실시간 연동 정상 + 3건 이슈**

| 코드 | 심각도 | 내용 | 파일 | 상태 |
|------|--------|------|------|------|
| FG-01 | ❌ TODO | Delegation 엣지 명시적 TODO (SubTask 데이터 미전달) | `useFlowLayout.ts` | ✅ 수정 완료 |
| FG-02 | 🟡 P1 | 노드 클릭 시 에이전트 상세 패널 미연결 | `FlowGraphWidget.tsx` | ✅ 수정 완료 |
| FG-03 | 🔵 P2 | 50+ 에이전트 시 3열 고정으로 레이아웃 극단 축소 | `useFlowLayout.ts` | ✅ 수정 완료 |

> 수정 상세 지침 → **`docs/bugs/UI-AUDIT-2026-03-16.md`**

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

## 2026-03-17 (3) Local LLM — PC 호환성 표시 ✅

### 갤러리 모델 하드웨어 호환성 배지
- **`server/modules/routes/ops/local-llm.ts`**: 갤러리 모델 20개에 `min_ram_gb`, `min_vram_gb` 요구사항 추가
  - CPU 추론 기준: 모델 크기 × 1.5 + OS 여유 (2~3 GB)
  - GPU 추론 기준: 모델 크기 + 20% VRAM 오버헤드
- **`src/components/local-llm/ModelsPanel.tsx`**:
  - `HardwareInfo` 인터페이스 + `Compat` 타입 (`"gpu" | "cpu" | "none" | "unknown"`) 추가
  - 컴포넌트 마운트 시 `/api/local-llm/metrics` 호출 → RAM 총용량 + GPU VRAM 여유 수집
  - `getCompat(model)` 함수: VRAM 여유 ≥ min_vram_gb → `"gpu"`, RAM 총량 ≥ min_ram_gb → `"cpu"`, 둘 다 미달 → `"none"`
  - `CompatBadge` 컴포넌트: 각 갤러리 카드 우상단에 배지 표시
    - 🟢 `GPU 가능` — VRAM 충분, 빠른 GPU 추론 가능
    - 🟡 `CPU 가능` — RAM은 충분, CPU 추론 (느림)
    - 🔴 `메모리 부족` — RAM·VRAM 모두 부족
    - 배지 hover 시 tooltip: 실제 여유 메모리 / 필요 메모리 표시
  - 하드웨어 정보 없을 시 배지 미표시

---

## 2026-03-17 (2) Local LLM 완성 — Phase 20 ✅

### Phase 20-A: Inference Logging 연결 (Monitor 탭 활성화)
- **`stream-tools.ts`**: `parseSSEStream` 반환타입 `Promise<void>` → `Promise<{ inputTokens, outputTokens }>`
  - OpenAI-compatible SSE 스트림의 `data.usage.prompt_tokens / completion_tokens` 파싱 추가
- **`api-provider-tools.ts`**:
  - `CreateApiProviderToolsDeps`에 `logInference?: (entry: InferenceLogEntry) => void` 추가
  - `executeApiProviderAgent` 파라미터에 `agentId?: string | null` 추가
  - openai/ollama/lmstudio 타입 완료 시 `logInference` 호출 (backend, model_name, agent_id, task_id, tokens, t/s, latency)
  - 시작 시각 기록 → 완료 시 `latency_ms` 계산
- **`providers.ts`**: `createInferenceLogger` import → `logInference: inferenceLogger.log` 주입
- **`execution-run.ts`**: `launchApiProviderAgent` 호출에 `agentId` 인수 추가

### Phase 20-B: LM Studio 백엔드 UI 활성화
- **`BackendCard.tsx`**:
  - `isGuiBackend` (lmstudio) 분기 추가 — start/stop 버튼 대신 상태 안내 표시
  - LM Studio running 시 "✓ LM Studio 실행 중 — N모델 로드됨" 표시
  - Register 버튼은 기존대로 running 시 노출 (이미 구현됨)
- **`local-llm.ts`** 서버:
  - `/backends/lmstudio/start|stop|restart` → `{ ok: true, manual: true, message: "..." }` 응답
  - llamacpp/jan 등 미지원 백엔드 오류 메시지 "Phase 1" 문구 제거

### Phase 20-C: 탭 레이블 UX 개선
- **`LocalLlmSettingsTab.tsx`**: 탭에 부제목 추가 (두 줄 레이블)
  - "백엔드" → "실행 앱 / Ollama · LM Studio"
  - "모델" → "AI 모델 / 다운로드 · 관리"
  - "모니터" → "모니터 / 사용량 · 상태"
  - "설정" → "설정 / 고급 옵션"

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

## Local LLM Manager — Phase 1 ✅ (2026-03-16)

> 문서: `docs/features/local-llm-manager.md`

### DB 마이그레이션 (`2026-03-17-000-local-llm`)
- `local_llm_backends`, `local_llm_models`, `local_llm_inference_log` 테이블 생성
- `agents` ALTER: `local_llm_backend`, `local_llm_model` 컬럼 추가

### 서버 (`server/modules/local-llm/`)
- `ollama-client.ts` — ping, listModels, listRunning, pullModel (AsyncGenerator), deleteModel
- `backend-manager.ts` — detectOllama, getAllBackendsStatus, startOllama, stopOllama

### REST API (`/api/local-llm/*`)
- 백엔드 목록/시작/중지/재시작
- 모델 목록/갤러리/pull/삭제
- Provider 목록 (에이전트 연결용)
- 전체 WebSocket `local_llm_pull_progress` 스트리밍

### 프론트엔드 (`src/components/local-llm/`)
- `LocalLlmSettingsTab.tsx` + `BackendsPanel.tsx` + `BackendCard.tsx` + `ModelsPanel.tsx`
- Settings → LOCAL LLM 탭 추가

---

---

## Local LLM Manager — Phase 2 ✅ (2026-03-16)

### 서버
- `server/modules/local-llm/metrics-collector.ts` — nvidia-smi GPU 파싱, OS RAM, Ollama running model, 5초 WS 브로드캐스트
- `GET /api/local-llm/metrics` — GPU/RAM/inference 스냅샷
- `GET /api/local-llm/metrics/history?limit=` — 추론 이력 (local_llm_inference_log JOIN agents)
- `GET /api/local-llm/settings` / `PATCH /api/local-llm/settings/:name` — host/port/auto_start 설정

### lifecycle.ts
- 서버 시작 5초 후 Ollama auto-start (auto_start=1일 때)
- `startMetricsPoller` — 5초 주기 `local_llm_metrics` WS 브로드캐스트

### 프론트엔드
- `MetricsPanel.tsx` — GPU 게이지, RAM 게이지, TPS 스파크라인 (WS 실시간), 추론 로그 테이블
- `AdvancedSettingsPanel.tsx` — host/port/auto_start 설정 폼 (// label 패턴)
- `LocalLlmSettingsTab.tsx` — BACKENDS / MODELS / MONITOR / SETTINGS 4개 서브탭

---

---

## Local LLM Manager — Phase 3 ✅ (2026-03-16)

### 이모지 제거 + UX 개선 (전체 컴포넌트)
- `BackendCard`: 이모지 제거, variant 버튼 시스템(primary/secondary/ghost/danger), Stop 확인 플로우, 자연어 레이블, 미설치 시 단계별 가이드, "Phase 2 — coming soon" → "Support coming in a future release"
- `BackendsPanel`: 에러 패널 개선, "// DETECTING..." → 자연어, Refresh 버튼 정렬
- `ModelsPanel`: "📦 MY MODELS" → "My Models", "🌐 GALLERY" → "Model Library", 테이블 뷰, Remove 확인 플로우, "↓ PULL" → "Install", 빈 상태 가이드 메시지
- `LocalLlmWidget`: 이모지 제거, 자연어 상태 표시, "Active model"/"Last used" 구분, 깔끔한 Row 컴포넌트

### LM Studio 감지 (Phase 3)
- `lmstudio-client.ts` — `GET /v1/models` 핑으로 실행 감지, 모델 목록 조회
- `backend-manager.ts` — `getAllBackendsStatus`에 LM Studio 병렬 감지 추가
- `/api/local-llm/providers` — Ollama + LM Studio 모델 통합 목록 (group 필드로 구분)

### Inference Logger (Phase 3)
- `inference-logger.ts` — `createInferenceLogger(db)` factory: `log()`, `getHistory()`, `getStatsByModel()`
- `GET /api/local-llm/metrics/history` — inferenceLogger 사용
- `GET /api/local-llm/metrics/stats` — 모델별 집계 (request_count, total_tokens, avg_tps, avg_latency)
- `POST /api/local-llm/log` — 외부에서 추론 이벤트 기록

---

## 2026-03-16 엔드투엔드 통합 수정 ✅

프로젝트→에이전트→태스크 설정 후 모든 기능이 연동되는지 감사하고 5개 끊긴 연결을 수정함.

| 코드 | 내용 | 파일 | 상태 |
|------|------|------|------|
| E2E-01 | REPL createTask에 `project_path` 누락 (git worktree가 서버 cwd 사용) | `AgentRepl.tsx` | ✅ 수정 |
| E2E-02 | FlowGraphWidget이 `projectAgentIds` prop을 AgentFlowGraph에 전달 안 함 | `FlowGraphWidget.tsx` | ✅ 수정 |
| E2E-03 | 플로 그래프 - 같은 프로젝트 동시 실행 에이전트 간 협업 엣지 없음 | `useFlowLayout.ts`, `FlowEdge.tsx`, `AgentFlowGraph.tsx` | ✅ 수정 |
| E2E-04 | Meeting Minutes 생성 시 WS 이벤트 없음 (패널 닫히면 알림 불가) | `minutes.ts`, `useRealtimeSync.ts`, `types/index.ts` | ✅ 수정 |
| E2E-05 | **WbRunModal이 태스크만 생성하고 실행 안 함** (워크플로 실행이 실제로 동작 안 됨) | `WbRunModal.tsx`, `WorkflowBuilder.tsx` | ✅ 수정 |
| E2E-06 | **태스크 완료 시 의존 태스크 자동 시작 없음** (워크플로 순차 실행 불가) | `run-complete-handler/core.ts`, `orchestration.ts` | ✅ 수정 |
| E2E-07 | WbRunModal에 `project_path` 누락 | `WbRunModal.tsx` | ✅ 수정 |

### 수정 내용 요약
- **REPL**: `createTask`에 `project_path: currentProject?.project_path` 추가 → git worktree가 올바른 프로젝트 경로 사용
- **Flow Graph**: `projectAgentIds` prop 전달 + 신규 `"collab"` 엣지 타입(같은 프로젝트 동시 실행 에이전트 간 점선 표시)
- **Meeting Minutes**: `beginMeetingMinutes`/`finishMeetingMinutes`에서 `meeting_minutes_update` WS 브로드캐스트 → 클라이언트 즉시 리싱크
- **Workflow Builder 실행**: 루트 태스크(의존성 없는 노드)를 생성 후 자동 `POST /api/tasks/:id/run` 호출, 모달이 실행 상태를 보여주는 동안 유지
- **순차 실행 체인**: `run-complete-handler/core.ts`에서 태스크 완료(exit 0) 시 `task_dependencies` 테이블 조회 → 모든 upstream이 `done`이면 downstream 태스크를 `inbox`로 전환 후 자동 시작

### Tasks 위젯 — 회의록 바로가기 버튼 ✅
- **문제**: `TaskBoard.tsx`가 앱에 렌더링되지 않아 `onOpenMeetingMinutes` 버튼 진입 불가. `TasksWidget`은 클릭 시 항상 터미널 탭만 열림
- **수정**: `TasksWidget.tsx` 각 태스크 행 우측에 `회의록` / `min` 버튼 추가
  - 행 클릭 → 터미널 탭 (기존 동작 유지)
  - `회의록` 버튼 클릭 → MINUTES 탭으로 바로 열림 (`stopPropagation`으로 행 클릭과 분리)

## Local LLM Manager — Phase 4 (UX 완성) ✅ (2026-03-17)

### 탭 간 중복 제거
- **`BackendsPanel.tsx`**: `HardwareBar`, `LoadedModelsSection`, `models`/`hw` state 및 `/metrics`·`/models` API 호출 제거
  - 실행 앱 탭은 백엔드 카드만 담당 → GPU·RAM 현황은 모니터 탭에서만 표시
- **`ModelsPanel.tsx` (GalleryCard)**: 갤러리 카드에서 삭제 버튼 제거
  - 모델 삭제는 "내 모델" 테이블 탭에서만 가능 (중복 UX 제거)

### 설치 로그 & 에러 표시 개선
- **버그 수정**: `status === "error"` 시 pulling state 즉시 삭제하던 버그 → 에러 state 유지, 카드에 표시
- **실시간 로그**: Ollama 상태 텍스트(`pulling manifest`, `pulling layer...`, `verifying sha256 digest` 등) 진행 바 하단에 실시간 표시
- **에러 카드 UI**: 빨간 에러 박스 + 에러 메시지 전문 + 재시도 버튼 + 닫기 버튼

### 추천 모델 기능
- **`ModelsPanel.tsx`**: 모델 라이브러리 탭 상단에 "⭐ 내 PC 추천 모델" 섹션 추가
  - GPU 있을 때: VRAM에 맞는 모델 중 가장 큰 것 최대 4개 추천 (내림차순)
  - CPU only: RAM에 맞는 모델 중 가장 큰 것 최대 4개 추천
  - 이미 설치된 모델 제외, 검색 중 자동 숨김
  - 추천 카드: 황금 테두리·배경 강조, 헤더에 VRAM/RAM 기준 명시
  - `recommended` prop으로 GalleryCard 스타일 분기

### 스크롤 구조 수정
- **`LocalLlmSettingsTab.tsx`**: 루트 div `height: "100%"` + 콘텐츠 div `flex: 1, overflowY: auto` 제거 → 부모 스크롤 위임
- **`SettingsWindow.tsx`**: 내부 래퍼 div에 `display: flex, flexDirection: column` 추가
  - 원인: SettingsPanel root의 `flex-1`이 부모가 flex가 아니어서 무효 → content div의 `flex-1 min-h-0 overflow-y-auto`도 고정 높이 확보 불가 → 모든 설정 탭 스크롤 작동
  - 결과: 모든 설정 탭(general, data, local-llm 등) 스크롤 정상화

---

## 현재 미완성 / 다음 후보

- ~~에이전트 편집 모달에 로컬 모델 provider 선택 UI 연결~~ ✅ 완료 (2026-03-16)
- llama.cpp / Jan 백엔드 실행 감지 (향후 Phase 4 예정)

---

## 문서 현황

| 문서 | 상태 |
|------|------|
| `docs/OVERVIEW.md` | ✅ 최신 (2026-03-16 업데이트) |
| `docs/features/custom-widget-platform.md` | ✅ 완료 표시 |
| `docs/specs/api.md` | ✅ 최신 (v1.4.0 — project-templates, cost-summary, local-llm setup-provider, gate deps 반영) |
| `docs/architecture/` | 참조용 유지 |
| `docs/design/DESIGN.md`, `UI-SCREENS.md` | 참조용 유지 |

### 삭제된 문서 (2026-03-16)
- `docs/strategy/p2-tasks-design.md` — P2 작업 전체 완료, 구현 지침 불필요
- `docs/strategy/agent-persona-system.md` — 2026-03-08 폐기 결정, 기능 구현 완료
- `docs/features/custom-widget-platform-tech-spec.md` — 구현 완료, 기획서에 통합
