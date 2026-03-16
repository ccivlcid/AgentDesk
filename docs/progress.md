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

## 현재 미완성 / 다음 후보

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Project Dashboard UI | objectives/gates 시각 편집 (서버 API 완료, UI 없음) | 낮음 — 수동 관리 필요, 에이전트 워크플로우와 불일치 |
| Template 관리 UI | 사용자 정의 템플릿 생성/삭제 | 중간 |
| 기타 신규 기능 | 미정 | - |

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
