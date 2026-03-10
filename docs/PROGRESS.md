# AgentDesk 2.0 진행 현황

**최종 업데이트:** 2026-03-10
**기준 브랜치:** `dev`
**전제 문서:** [tech-implementation-2.0.md](plans/tech-implementation-2.0.md) · [ux-renewal-2.0.md](design/ux-renewal-2.0.md)

> 상태 표기: `TODO` · `IN_PROGRESS` · `DONE` · `SKIP`

---

## 전체 진행 요약


| Phase   | 범위                                | 상태   | 완료율  |
| ------- | --------------------------------- | ---- | ---- |
| 문서화     | 설계·스펙·기술 계획                       | DONE | 100% |
| Phase 1 | DB 스키마 · 메뉴 · 브랜드                 | DONE | 100% |
| Phase 2 | 카테고리 CRUD · 대시보드 · 온보딩 · 팀 · 페르소나 | DONE | 100% |
| Phase 3 | 카테고리 에디터 · 자동화 · 자산화              | DONE | 100% |
| Phase 4 | 기존 화면 2.0 통합 (태스크 보드·에이전트·오피스)    | DONE | 100% |


---

## 문서화 (완료)


| 문서                                          | 상태   | 비고               |
| ------------------------------------------- | ---- | ---------------- |
| `docs/product-design.md`                    | DONE | 제품 설계서 v1.1      |
| `docs/design/ux-renewal-2.0.md`             | DONE | UX 스펙 전문         |
| `docs/design/agentdesk-2.0-menu-spec.md`    | DONE | 메뉴 As-Is / To-Be |
| `docs/specs/api.md`                         | DONE | 2.0 엔드포인트 추가 완료  |
| `docs/plans/tech-implementation-2.0.md`     | DONE | 기술 구현 계획서        |
| `docs/strategy/agent-persona-system.md`     | DONE | §4 방식 우선 UX 반영   |
| `docs/architecture/SYSTEM-STRUCTURE-MAP.md` | DONE | 2.0 테이블 목록 추가    |


---

## Phase 1 — DB 스키마 · 메뉴 · 브랜드 (0–20일)

### 1-A. DB & 백엔드 기반


| #   | 작업                                                    | 파일                                                          | 상태   |
| --- | ----------------------------------------------------- | ----------------------------------------------------------- | ---- |
| 1   | categories 테이블 추가                                     | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 2   | category_versions 테이블 추가                              | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 3   | project_agents 테이블 추가                                 | `server/modules/bootstrap/schema/task-schema-migrations.ts` | DONE |
| 4   | project_objectives 테이블 추가                             | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 5   | project_risks 테이블 추가                                  | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 6   | project_gates 테이블 추가                                  | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 7   | project_outputs 테이블 추가                                | `server/modules/bootstrap/schema/base-schema.ts`            | DONE |
| 8   | projects 테이블 컬럼 마이그레이션 (category_id, assignment_mode) | `server/modules/bootstrap/schema/task-schema-migrations.ts` | DONE |
| 9   | 카테고리 시드 6개 작성                                         | `server/modules/bootstrap/seeds/category-seeds.ts` (신규)     | DONE |
| 10  | seedCategories() 부트스트랩 연결                             | `server/modules/bootstrap/schema/seeds.ts`                  | DONE |
| 11  | GET /api/categories 라우트                               | `server/modules/routes/core/categories.ts` (신규)             | DONE |


### 1-B. 프론트엔드 타입 & API 레이어


| #   | 작업                                      | 파일                                     | 상태   |
| --- | --------------------------------------- | -------------------------------------- | ---- |
| 12  | Category 인터페이스 추가                       | `src/types/index.ts`                   | DONE |
| 13  | Project 인터페이스 2.0 필드 추가 (category_id)   | `src/types/index.ts`                   | DONE |
| 14  | ProjectObjective/Risk/Gate/Output 타입 추가 | `src/types/index.ts`                   | DONE |
| 15  | Persona 타입 추가                           | `src/types/index.ts`                   | DONE |
| 16  | categories-dashboard.ts API 파일 신규 생성    | `src/api/categories-dashboard.ts` (신규) | DONE |
| 17  | categories 상태 추가                        | `src/App.tsx`                          | DONE |
| 18  | currentProjectId 상태 추가                  | `src/App.tsx`                          | DONE |


### 1-C. 사이드바 & 메뉴


| #   | 작업                                 | 파일                                                       | 상태   |
| --- | ---------------------------------- | -------------------------------------------------------- | ---- |
| 19  | NAV_STRUCTURE 순서 변경 (dashboard 1번) | `src/components/Sidebar.tsx`                             | DONE |
| 20  | 브랜드 영역 CEO 제거 → 로고 + 프로젝트명 최소 표시   | `src/components/Sidebar.tsx`                             | DONE |
| 21  | CategoryBadge 컴포넌트 신규              | `src/components/project-selector/CategoryBadge.tsx` (신규) | DONE |
| 22  | 에이전트 그룹 레이블 "팀" 으로 변경              | `src/components/Sidebar.tsx`                             | DONE |


---

## Phase 2 — 카테고리 CRUD · 대시보드 · 온보딩 · 팀 · 페르소나 (21–40일)

### 2-A. 카테고리 API 완성


| #   | 작업                                                 | 파일                                                     | 상태   |
| --- | -------------------------------------------------- | ------------------------------------------------------ | ---- |
| 1   | POST/PATCH/DELETE/clone categories 라우트             | `server/modules/routes/core/categories.ts`             | DONE |
| 2   | project_agents CRUD 라우트                            | `server/modules/routes/core/project-dashboard.ts` (신규) | DONE |
| 3   | 대시보드 4분면 CRUD 라우트 (objectives/risks/gates/outputs) | `server/modules/routes/core/project-dashboard.ts`      | DONE |
| 4   | GET /api/personas 라우트                              | `server/modules/routes/core/personas.ts` (신규)          | DONE |


### 2-B. 프로젝트 생성 플로우


| #   | 작업                                | 파일                                                                | 상태   |
| --- | --------------------------------- | ----------------------------------------------------------------- | ---- |
| 5   | ProjectCreateModal (2-스텝)         | `src/components/project-create-modal/ProjectCreateModal.tsx` (신규) | DONE |
| 6   | CategoryPicker 카드 그리드             | `src/components/project-create-modal/CategorySelectStep.tsx` (신규) | DONE |
| 7   | POST /api/projects category_id 처리 | `server/modules/routes/core/projects.ts`                          | DONE |


### 2-C. 사이드바 프로젝트 셀렉터 (Full)


| #   | 작업                                  | 파일                                                         | 상태   |
| --- | ----------------------------------- | ---------------------------------------------------------- | ---- |
| 8   | ProjectDropdown 컴포넌트                | `src/components/project-selector/ProjectDropdown.tsx` (신규) | DONE |
| 9   | ProjectSelector 풀 버전 (드롭다운 + 생성 진입) | `src/components/project-selector/ProjectSelector.tsx` (신규) | DONE |
| 10  | Sidebar에 ProjectSelector 통합         | `src/components/Sidebar.tsx`                               | DONE |


### 2-D. 대시보드 2.0


| #   | 작업                                        | 파일                                                  | 상태   |
| --- | ----------------------------------------- | --------------------------------------------------- | ---- |
| 11  | useDashboardData 훅                        | `src/hooks/useDashboardData.ts` (신규)                | DONE |
| 12  | QuadrantPanel 공통 컴포넌트                     | `src/components/dashboard/QuadrantPanel.tsx` (신규)   | DONE |
| 13  | ObjectivesPanel                           | `src/components/dashboard/ObjectivesPanel.tsx` (신규) | DONE |
| 14  | RisksPanel                                | `src/components/dashboard/RisksPanel.tsx` (신규)      | DONE |
| 15  | GatesPanel                                | `src/components/dashboard/GatesPanel.tsx` (신규)      | DONE |
| 16  | OutputsPanel                              | `src/components/dashboard/OutputsPanel.tsx` (신규)    | DONE |
| 17  | Dashboard2 조합                             | `src/components/dashboard/Dashboard2.tsx` (신규)      | DONE |
| 18  | AppMainLayout dashboard 뷰 → Dashboard2 전환 | `src/app/AppMainLayout.tsx`                         | DONE |


### 2-E. 온보딩


| #   | 작업                       | 파일                                                   | 상태   |
| --- | ------------------------ | ---------------------------------------------------- | ---- |
| 19  | WelcomeScreen (Step 1)   | `src/components/onboarding/WelcomeScreen.tsx` (신규)   | DONE |
| 20  | ProjectNameStep (Step 3) | `src/components/onboarding/ProjectNameStep.tsx` (신규) | DONE |
| 21  | 온보딩 플로우 → Dashboard2에 통합 | `src/components/dashboard/Dashboard2.tsx`            | DONE |


### 2-F. 팀 구성 UX


| #   | 작업                  | 파일                                                                           | 상태   |
| --- | ------------------- | ---------------------------------------------------------------------------- | ---- |
| 22  | 대시보드 내 팀 섹션         | `src/components/dashboard/TeamPanel.tsx` (신규)                                | DONE |
| 23  | 태스크 배정 시 팀원 필터 드롭다운 | `src/components/taskboard/FilterBar.tsx`                                     | DONE |
| 24  | 오피스 뷰 팀원 dim 처리     | `src/components/office-view/drawFloor.ts` + `buildScene-department-agent.ts` | DONE |


### 2-G. 페르소나 에이전트


| #   | 작업                            | 파일                                                | 상태   |
| --- | ----------------------------- | ------------------------------------------------- | ---- |
| 25  | 페르소나 카탈로그 데이터 (10인)           | `server/modules/routes/core/personas.ts` (서버 정적)  | DONE |
| 26  | 페르소나 프롬프트 파일 10개              | `server/modules/workflow/core/persona-catalog.ts` | DONE |
| 27  | PersonaBadge 컴포넌트             | `src/components/persona/PersonaBadge.tsx` (신규)    | DONE |
| 28  | PersonaCard ("방식 우선")         | `src/components/persona/PersonaCard.tsx` (신규)     | DONE |
| 29  | PersonaCatalog (방식 탭 필터)      | `src/components/persona/PersonaCatalog.tsx` (신규)  | DONE |
| 30  | AgentFormModal 사고 방식 선택 스텝 추가 | `src/components/agent-manager/AgentFormModal.tsx` | DONE |
| 31  | AgentCard PersonaBadge 표시     | `src/components/agent-manager/AgentCard.tsx`      | DONE |


---

## Phase 3 — 카테고리 에디터 · 자동화 (41–60일)


| #   | 작업                        | 파일                                                          | 상태   |
| --- | ------------------------- | ----------------------------------------------------------- | ---- |
| 1   | 카테고리 에디터 설정 탭 추가          | `src/components/SettingsPanel.tsx` + `CategoriesTab.tsx`    | DONE |
| 2   | CategoryCard 컴포넌트         | `src/components/category-editor/CategoryCard.tsx` (신규)      | DONE |
| 3   | CategoryFormModal (생성/수정) | `src/components/category-editor/CategoryFormModal.tsx` (신규) | DONE |
| 4   | KPI 기반 목표 진행률 자동 업데이트     | `server/modules/routes/core/project-dashboard.ts`           | DONE |
| 5   | 리스크 심각도 임계치 자동 홀드         | `server/modules/routes/core/project-dashboard.ts`           | DONE |
| 6   | 산출물 재사용 추천                | `server/modules/routes/core/project-dashboard.ts`           | DONE |


---

## Phase 4 — 기존 화면 2.0 통합 (미착수)

> **배경:** Phase 1–3 에서 새로 추가된 화면(대시보드, 온보딩, 프로젝트 셀렉터, 카테고리 에디터)은 2.0 UX 스타일로 제작되었으나,
> 기존 화면(오피스, 태스크 보드, 에이전트 관리, 라이브러리 등)은 1.x 상태 그대로다.
> 두 레이어 사이에 다음과 같은 불일치가 존재한다.

### 4-A. 불일치 목록


| 뷰                              | 문제                                                                                | 우선순위 |
| ------------------------------ | --------------------------------------------------------------------------------- | ---- |
| `tasks-board` (태스크 보드)         | 프로젝트 필터 없음. 전체 에이전트 태스크가 섞임. "결과물"이 `tasks-deliverables` 와 대시보드 결과물 분면에 **중복** 존재 | 높음   |
| `tasks-deliverables` (태스크 결과물) | Dashboard2 결과물 분면과 개념 중복. 향후 통합 또는 역할 명확화 필요                                      | 높음   |
| `agents` (에이전트 관리)             | 프로젝트 컨텍스트 없음. 현재 프로젝트의 팀 소속 여부가 표시되지 않음                                           | 보통   |
| `office` (오피스 뷰)               | 팀원 dim 처리는 됐으나, 어떤 프로젝트를 보고 있는지 UI에 표시 없음                                         | 보통   |
| `tasks-scheduled` (스케줄러)       | 프로젝트 필터 없음                                                                        | 낮음   |
| `heartbeat` (직원 살펴보기)          | 프로젝트 팀 맥락 없음                                                                      | 낮음   |
| `settings` (설정)                | 카테고리 탭 외 나머지 탭은 1.x 스타일 유지                                                        | 낮음   |
| `cli-usage`                    | 프로젝트별 사용량 분리 없음                                                                   | 낮음   |


### 4-B. 핵심 작업 (우선순위 높음)


| #   | 작업                                                     | 파일                                                 | 상태   |
| --- | ------------------------------------------------------ | -------------------------------------------------- | ---- |
| 1   | 태스크 보드 상단에 현재 프로젝트 컨텍스트 표시 + 프로젝트 필터                   | `src/components/TaskBoard.tsx`                     | DONE |
| 2   | `tasks-deliverables` 제거 → 대시보드 결과물로 통합 (결정: A 선택)      | `src/components/deliverables/`                     | DONE |
| 3   | 에이전트 카드에 현재 프로젝트 팀 소속 배지 표시                            | `src/components/agent-manager/AgentCard.tsx`       | DONE |
| 4   | 오피스 뷰 헤더에 현재 프로젝트명 표시                                  | `src/components/OfficeView.tsx`                    | DONE |
| 5   | 레거시 `Dashboard.tsx` 제거 (`dashboard-legacy` view ID 정리) | `src/components/Dashboard.tsx`                     | DONE |


### 4-C. 결정 필요 사항


| 항목                     | 선택지                                                 |
| ---------------------- | --------------------------------------------------- |
| `tasks-deliverables` 뷰 | A) 제거하고 대시보드 결과물로 통합 / B) 유지하되 "태스크 연결 산출물" 로 역할 분리 |
| 프로젝트 컨텍스트 표시 위치        | A) 각 뷰 헤더에 현재 프로젝트 표시 / B) 사이드바에 항상 표시 (현재 방식 유지)   |
| 오피스 뷰 프로젝트 전환          | A) 프로젝트별 오피스 뷰 (현재 팀만 표시) / B) 전체 조직 뷰 유지           |


---

## 알려진 이슈 & 결정 사항


| 항목                       | 결정                                      | 비고                                 |
| ------------------------ | --------------------------------------- | ---------------------------------- |
| ProjectSelector 단계       | Phase 1 = 이름만 표시 (최소), Phase 2 = 풀 드롭다운 | tech-implementation-2.0.md §6-2 참조 |
| 카테고리 에디터 진입              | `settings` 뷰 내 새 탭으로 구현 (별도 View ID 없음) | tech-implementation-2.0.md §7-1 참조 |
| assignment_mode DB 컬럼 누락 | Phase 1 마이그레이션 시 함께 추가                  | 기존 버그, 2.0 마이그레이션에 포함              |
| 기존 Dashboard.tsx         | Phase 4-B #5에서 제거 예정                    | view="dashboard-legacy" 로 임시 보존 중  |


---

## Phase 5 — Office Pack 제거 · 프로젝트 생성 통일화 (진행중)

| #   | 작업                                         | 파일                                                    | 상태   |
| --- | ------------------------------------------ | ----------------------------------------------------- | ---- |
| 1   | AppHeaderBar 팩 드롭다운 제거                      | `src/app/AppHeaderBar.tsx`                            | DONE |
| 2   | TaskBoard `usePackVocab` 하드코딩              | `src/components/TaskBoard.tsx`                        | DONE |
| 3   | ProjectCreateModal `project_path` 필수 추가    | `src/components/project-create-modal/`                | DONE |
| 4   | `officePackControl` 테스트 삭제                  | `AppHeaderBar.mobile-office-pack.test.tsx`            | DONE |
| 5   | AppMainLayout `officePackControl` 제거        | `src/app/AppMainLayout.tsx`                           | DONE |
| 6   | Office Pack Phase C (상태·로직 제거)             | `src/app/AppMainLayout.tsx`, `App.tsx`                | DONE |
| 7   | Office Pack Phase D (파일 삭제)                | `src/app/office-workflow-pack/`                       | DONE |
| 8   | ProjectManagerModal 신규 생성 → ProjectCreateModal 위임 | `src/components/ProjectManagerModal.tsx`     | DONE |
| 9   | 기존 project_path 없는 프로젝트 안내 배너             | `src/components/dashboard/Dashboard2.tsx`             | DONE |


---

## 변경 이력


| 날짜         | 내용                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-10 | 문서화 완료. Phase 1–3 체크리스트 초안 작성.                                                                                                           |
| 2026-03-10 | Phase 1 전체 완료. DB 스키마/시드/라우트/타입/API/사이드바 메뉴 작업 완료.                                                                                       |
| 2026-03-10 | Phase 2 진행: 2-A~2-E 완료. 2-F 팀 구성 UX Phase 3 이관. 2-G 페르소나 컴포넌트 완료 (AgentFormModal/AgentCard 연동 남음).                                       |
| 2026-03-10 | Phase 3 진행: 카테고리 에디터 완료 (CategoryCard, CategoryFormModal, CategoriesTab, SettingsTabNav 추가).                                             |
| 2026-03-10 | Phase 3 완료: 자동화 3종 구현 — ①게이트 완료 시 목표 진행률 자동 갱신, ②high 리스크 생성/수정 시 in_progress 게이트 자동 홀드, ③산출물 재사용 추천 API (GET /api/outputs/suggestions). |
| 2026-03-10 | Phase 2 완료 확인: 2-G #26~31 이미 구현 완료 확인. App.tsx onProjectCreate 스텁 → ProjectCreateModal 실제 연동 완료.                                         |
| 2026-03-10 | 2-F 팀 구성 UX 완료: ①Dashboard2 TeamPanel(팀원 추가/제거), ②FilterBar 담당자 필터, ③OfficeView 비팀원 dim (alpha 0.25, grey tint).                         |
| 2026-03-10 | Phase 4 초안 작성: 기존 화면(태스크 보드·에이전트·오피스 등)과 2.0 신규 화면 간 불일치 항목 문서화. 결정 필요 사항 정리.                                                            |


