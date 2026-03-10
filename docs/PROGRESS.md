# AgentDesk 2.0 진행 현황

**최종 업데이트:** 2026-03-10
**기준 브랜치:** `dev`
**전제 문서:** [tech-implementation-2.0.md](plans/tech-implementation-2.0.md) · [ux-renewal-2.0.md](design/ux-renewal-2.0.md)

> 상태 표기: `TODO` · `IN_PROGRESS` · `DONE` · `SKIP`

---

## 전체 진행 요약

| Phase | 범위 | 상태 | 완료율 |
|-------|------|------|--------|
| 문서화 | 설계·스펙·기술 계획 | DONE | 100% |
| Phase 1 | DB 스키마 · 메뉴 · 브랜드 | TODO | 0% |
| Phase 2 | 카테고리 CRUD · 대시보드 · 온보딩 · 팀 · 페르소나 | TODO | 0% |
| Phase 3 | 카테고리 에디터 · 자동화 · 자산화 | TODO | 0% |

---

## 문서화 (완료)

| 문서 | 상태 | 비고 |
|------|------|------|
| `docs/product-design.md` | DONE | 제품 설계서 v1.1 |
| `docs/design/ux-renewal-2.0.md` | DONE | UX 스펙 전문 |
| `docs/design/agentdesk-2.0-menu-spec.md` | DONE | 메뉴 As-Is / To-Be |
| `docs/specs/api.md` | DONE | 2.0 엔드포인트 추가 완료 |
| `docs/plans/tech-implementation-2.0.md` | DONE | 기술 구현 계획서 |
| `docs/strategy/agent-persona-system.md` | DONE | §4 방식 우선 UX 반영 |
| `docs/architecture/SYSTEM-STRUCTURE-MAP.md` | DONE | 2.0 테이블 목록 추가 |

---

## Phase 1 — DB 스키마 · 메뉴 · 브랜드 (0–20일)

### 1-A. DB & 백엔드 기반

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | categories 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 2 | category_versions 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 3 | project_agents 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 4 | project_objectives 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 5 | project_risks 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 6 | project_gates 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 7 | project_outputs 테이블 추가 | `server/modules/bootstrap/schema/base-schema.ts` | TODO |
| 8 | projects 테이블 컬럼 마이그레이션 | `server/modules/bootstrap/schema/task-schema-migrations.ts` | TODO |
| 9 | 카테고리 시드 6개 작성 | `server/modules/bootstrap/seeds/category-seeds.ts` (신규) | TODO |
| 10 | seedCategories() 부트스트랩 연결 | `server/modules/bootstrap/index.ts` | TODO |
| 11 | GET /api/categories 라우트 | `server/modules/routes/core.ts` | TODO |

### 1-B. 프론트엔드 타입 & API 레이어

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 12 | Category 인터페이스 추가 | `src/types/index.ts` | TODO |
| 13 | Project 인터페이스 2.0 필드 추가 | `src/types/index.ts` | TODO |
| 14 | ProjectObjective/Risk/Gate/Output 타입 추가 | `src/types/index.ts` | TODO |
| 15 | Persona 타입 추가 | `src/types/index.ts` | TODO |
| 16 | categories-dashboard.ts API 파일 신규 생성 | `src/api/categories-dashboard.ts` (신규) | TODO |
| 17 | categories 상태 추가 | `src/App.tsx` | TODO |
| 18 | currentProjectId 상태 추가 | `src/App.tsx` | TODO |

### 1-C. 사이드바 & 메뉴

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 19 | NAV_STRUCTURE 순서 변경 (dashboard 1번) | `src/components/Sidebar.tsx` | TODO |
| 20 | 브랜드 영역 CEO 제거 → 로고 + 프로젝트명 최소 표시 | `src/components/Sidebar.tsx` | TODO |
| 21 | CategoryBadge 컴포넌트 신규 | `src/components/project-selector/CategoryBadge.tsx` (신규) | TODO |
| 22 | 에이전트 그룹 레이블 "팀" 으로 변경 | `src/i18n.ts` | TODO |

---

## Phase 2 — 카테고리 CRUD · 대시보드 · 온보딩 · 팀 · 페르소나 (21–40일)

### 2-A. 카테고리 API 완성

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | POST/PATCH/DELETE/clone categories 라우트 | `server/modules/routes/core.ts` | TODO |
| 2 | project_agents CRUD 라우트 | `server/modules/routes/core.ts` | TODO |
| 3 | 대시보드 4분면 CRUD 라우트 (objectives/risks/gates/outputs) | `server/modules/routes/core.ts` | TODO |
| 4 | GET /api/personas 라우트 | `server/modules/routes/core.ts` | TODO |

### 2-B. 프로젝트 생성 플로우

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 5 | ProjectCreateModal (2-스텝) | `src/components/project-create-modal/ProjectCreateModal.tsx` (신규) | TODO |
| 6 | CategoryPicker 카드 그리드 | `src/components/project-create-modal/CategorySelectStep.tsx` (신규) | TODO |
| 7 | POST /api/projects category_id 처리 | `server/modules/routes/core.ts` | TODO |

### 2-C. 사이드바 프로젝트 셀렉터 (Full)

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 8 | ProjectDropdown 컴포넌트 | `src/components/project-selector/ProjectDropdown.tsx` (신규) | TODO |
| 9 | ProjectSelector 풀 버전 (드롭다운 + 생성 진입) | `src/components/project-selector/ProjectSelector.tsx` (신규) | TODO |
| 10 | Sidebar에 ProjectSelector 통합 | `src/components/Sidebar.tsx` | TODO |

### 2-D. 대시보드 2.0

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 11 | useDashboardData 훅 | `src/hooks/useDashboardData.ts` (신규) | TODO |
| 12 | QuadrantPanel 공통 컴포넌트 | `src/components/dashboard/QuadrantPanel.tsx` (신규) | TODO |
| 13 | ObjectivesPanel | `src/components/dashboard/ObjectivesPanel.tsx` (신규) | TODO |
| 14 | RisksPanel | `src/components/dashboard/RisksPanel.tsx` (신규) | TODO |
| 15 | GatesPanel | `src/components/dashboard/GatesPanel.tsx` (신규) | TODO |
| 16 | OutputsPanel | `src/components/dashboard/OutputsPanel.tsx` (신규) | TODO |
| 17 | Dashboard2 조합 | `src/components/dashboard/Dashboard2.tsx` (신규) | TODO |
| 18 | AppMainLayout dashboard 뷰 → Dashboard2 전환 | `src/app/AppMainLayout.tsx` | TODO |

### 2-E. 온보딩

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 19 | WelcomeScreen (Step 1) | `src/components/onboarding/WelcomeScreen.tsx` (신규) | TODO |
| 20 | ProjectNameStep (Step 3) | `src/components/onboarding/ProjectNameStep.tsx` (신규) | TODO |
| 21 | 온보딩 플로우 → Dashboard2에 통합 | `src/components/dashboard/Dashboard2.tsx` | TODO |

### 2-F. 팀 구성 UX

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 22 | 대시보드 내 팀 섹션 | `src/components/dashboard/Dashboard2.tsx` | TODO |
| 23 | 태스크 배정 시 팀원 필터 드롭다운 | `src/components/taskboard/` | TODO |
| 24 | 오피스 뷰 팀원 dim 처리 | `src/components/OfficeView.tsx` | TODO |

### 2-G. 페르소나 에이전트

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 25 | 페르소나 카탈로그 데이터 (10인) | `server/data/personas/index.ts` (신규) | TODO |
| 26 | 페르소나 프롬프트 파일 10개 | `server/data/personas/prompts/*.ts` (신규) | TODO |
| 27 | PersonaBadge 컴포넌트 | `src/components/persona/PersonaBadge.tsx` (신규) | TODO |
| 28 | PersonaCard ("방식 우선") | `src/components/persona/PersonaCard.tsx` (신규) | TODO |
| 29 | PersonaCatalog (방식 탭 필터) | `src/components/persona/PersonaCatalog.tsx` (신규) | TODO |
| 30 | AgentFormModal 사고 방식 선택 스텝 추가 | `src/components/agent-manager/AgentFormModal.tsx` | TODO |
| 31 | AgentCard PersonaBadge 표시 | `src/components/agent-manager/AgentCard.tsx` | TODO |

---

## Phase 3 — 카테고리 에디터 · 자동화 (41–60일)

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | 카테고리 에디터 설정 탭 추가 | `src/components/SettingsPanel.tsx` | TODO |
| 2 | CategoryCard 컴포넌트 | `src/components/category-editor/CategoryCard.tsx` (신규) | TODO |
| 3 | CategoryFormModal (생성/수정) | `src/components/category-editor/CategoryFormModal.tsx` (신규) | TODO |
| 4 | KPI 기반 목표 진행률 자동 업데이트 | `server/modules/routes/core.ts` | TODO |
| 5 | 리스크 심각도 임계치 자동 홀드 | `server/modules/workflow.ts` | TODO |
| 6 | 산출물 재사용 추천 | `server/modules/routes/` | TODO |

---

## 알려진 이슈 & 결정 사항

| 항목 | 결정 | 비고 |
|------|------|------|
| ProjectSelector 단계 | Phase 1 = 이름만 표시 (최소), Phase 2 = 풀 드롭다운 | tech-implementation-2.0.md §6-2 참조 |
| 카테고리 에디터 진입 | `settings` 뷰 내 새 탭으로 구현 (별도 View ID 없음) | tech-implementation-2.0.md §7-1 참조 |
| assignment_mode DB 컬럼 누락 | Phase 1 마이그레이션 시 함께 추가 | 기존 버그, 2.0 마이그레이션에 포함 |
| 기존 Dashboard.tsx | Phase 2 완료 후 제거 (그 전까지 레거시 유지) | view="dashboard-legacy" 로 임시 보존 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-10 | 문서화 완료. Phase 1–3 체크리스트 초안 작성. |
