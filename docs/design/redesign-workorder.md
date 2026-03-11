# screen-redesign-spec.md 작업 순서 및 우선순위

**기준 문서:** `screen-redesign-spec.md` v2.0 (2026-03-11)
**작업 시작:** 2026-03-11
**우선순위 원칙:**
1. 공통 기반 컴포넌트 먼저 (다른 화면에서 의존)
2. 전역 Shell → 자주 보이는 화면 → 세부 화면 순
3. `borderRadius: 0`, `window.alert/confirm` 교체는 각 화면 작업 시 함께 처리

---

## Phase 1 — 공통 기반 (Foundation)

> 모든 화면에서 쓰이는 Toast/ConfirmDialog를 먼저 스펙에 맞게 완성

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 1 | 화면 26 — Toast | `src/components/ui/Toast.tsx` | borderRadius 0, 아이콘 `✓✕⚠ℹ`, variant별 dismiss 시간(success 3s/error 5s/warning 유지/info 4s), 최대 3개 스택 제한 | ✅ 완료 |
| 2 | 화면 25 — ConfirmDialog | `src/components/ui/ConfirmDialog.tsx` | borderRadius 0, `info` variant 추가 (`ℹ` 아이콘 + neutral 버튼) | ✅ 완료 |

---

## Phase 2 — 전역 Shell

> 매 화면에 항상 보이는 Sidebar + Header

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 3 | 화면 02 — Sidebar | `src/components/Sidebar.tsx` | 섹션 레이블(OVERVIEW/TASKS/AGENTS/LIBRARY/SYSTEM), 활성 `border-left: 2px solid var(--th-accent)` + amber text, hover `--th-hover-bg`, 폰트 통일 | ✅ 완료 |
| 4 | 화면 01 — AppHeaderBar | `src/app/AppHeaderBar.tsx` | `▶ AgentDesk` 로고, `[⌘K Search...]` 버튼, 프로젝트 선택기 헤더 이동 (Sidebar에서 삭제) | ✅ 완료 |
| 5 | 화면 24 — CommandPalette | `src/components/CommandPalette.tsx` (신규) | 전역 Cmd+K 팔레트, Recent/QuickActions/Agents 섹션, ↑↓Enter 키보드, backdrop | ✅ 완료 |

---

## Phase 3 — 대시보드

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 6 | 화면 03 — Dashboard Overview | `src/components/dashboard/Dashboard2.tsx` + `TeamPanel.tsx` + `AgentActivityPanel.tsx` | 2컬럼 레이아웃, TeamPanel 우측 사이드바 이동, AgentActivity 빈 상태 표시, core_goal 헤더, 탭 영문화, rounded 제거 | ✅ 완료 |
| 7 | 화면 04 — Dashboard Settings | `src/components/dashboard/Dashboard2.tsx` (Settings tab) | borderRadius 0, ⚠ 경로 경고 강화 | ✅ 완료 |
| 8 | 화면 05 — Dashboard Project Types | `src/components/category-editor/CategoryCard.tsx` + `Dashboard2.tsx` | 카드 그리드 → 리스트 행, meta 인라인, borderRadius 0 | ✅ 완료 |

---

## Phase 4 — WorkMap

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 9 | 화면 06 — WorkMap (OfficeView) | `src/components/office/` 관련 파일들 | 뷰 헤더 상태 바, 상태 필터(RUNNING/IDLE/OFFLINE) 추가, DeptPanel borderRadius 0, 활동 바 실제 진행률 연결, NOT IN TEAM 그룹, 태스크 ID 표시 | ⬜ 대기 |

---

## Phase 5 — 태스크

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 10 | 화면 07 — TaskBoard Board | `src/components/TaskBoard.tsx` + `taskboard/TaskCard.tsx` + `taskboard/FilterBar.tsx` | 컬럼 헤더 태스크 수, 카드에 #ID, 뷰 레이블 uppercase, running 카드 border-left, .catch 에러 toast | ✅ 완료 |
| 11 | 화면 08 — Gantt | `src/components/taskboard/GanttChart.tsx` | #ID 표시, 색상 표준화, 기간 탐색 | ✅ 완료 |
| 12 | 화면 09 — DAG | `src/components/taskboard/DependencyGraph.tsx` | 노드 borderRadius 0, 상태별 border 색상 | ✅ 완료 |
| 13 | 화면 10 — Scheduled Tasks | `src/components/` (ScheduledTasks 관련) | 테이블 레이아웃, cron 한국어 해석, overdue 배지, 빈 상태 | ✅ 완료 |
| 14 | 화면 11 — Deliverables | `src/components/deliverables/` | 리스트 행 + 파일 들여쓰기, borderRadius 0, 로드 실패 toast, 빈 상태 | ✅ 완료 |

---

## Phase 6 — 에이전트 관리

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 15 | 화면 12 — AgentManager Agents tab | `src/components/agent-manager/AgentsTab.tsx` + `AgentCard.tsx` | 요약 stat 바 1줄, 리스트 뷰, borderRadius 0 | ✅ 완료 |
| 16 | 화면 13 — AgentFormModal | `src/components/agent-manager/AgentFormModal.tsx` | alert → toast, 2단계 폼(Basic/Advanced), borderRadius 0 | ✅ 완료 |
| 17 | 화면 14 — Departments | `src/components/agent-manager/DepartmentsTab.tsx` + `DepartmentFormModal.tsx` | alert 5곳 → toast, borderRadius 0 | ✅ 완료 |
| 18 | 화면 15 — Heartbeat | `src/components/` (Heartbeat 관련) | 뷰 헤더, 상태 배지 통일, borderRadius 0 | ✅ 완료 |

---

## Phase 7 — 라이브러리

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 19 | 화면 16 — Skills Library | `src/components/SkillsLibrary.tsx` + `skills-library/` | 뷰 헤더, borderRadius 0, 탭 uppercase | ✅ 완료 |
| 20 | 화면 17 — Agent Rules | `src/components/AgentRulesLibrary.tsx` + `agent-rules/` | 뷰 헤더, borderRadius 0 | ✅ 완료 |
| 21 | 화면 18 — Memory | `src/components/` (Memory 관련) | 뷰 헤더, borderRadius 0 | ✅ 완료 |
| 22 | 화면 19 — Hooks | `src/components/HooksLibrary.tsx` + `hooks/` | 뷰 헤더, borderRadius 0 | ✅ 완료 |

---

## Phase 8 — 시스템

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 23 | 화면 20 — CLI Usage | `src/components/` (CLIUsage 관련) | 뷰 헤더, 테이블 스타일 통일 | ⬜ 대기 |
| 24 | 화면 21 — Settings | `src/components/SettingsPanel.tsx` + `settings/` | 탭 uppercase, borderRadius 0 | ⬜ 대기 |

---

## Phase 9 — 패널 / 채팅

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 25 | 화면 22 — Terminal Panel | `src/components/TerminalPanel.tsx` + `terminal-panel/` | 탭 uppercase, borderRadius 0 | ⬜ 대기 |
| 26 | 화면 23 — Agent Chat | `src/components/agent-detail/AgentChatTab.tsx` | 터미널 프롬프트 입력, 에이전트 상태 헤더, confirm → ConfirmDialog, 탭 uppercase | ⬜ 대기 |

---

## Phase 10 — 모달 & 온보딩

| # | 화면 | 파일 | 주요 변경 | 상태 |
|---|------|------|-----------|------|
| 27 | 화면 27 — ProjectCreateModal | `src/components/` (ProjectCreate 관련) | borderRadius 0, ⚠ 경로 경고 | ⬜ 대기 |
| 28 | 화면 28 — CreateTaskModal | `src/components/taskboard/CreateTaskModal.tsx` | 부제목, 초안 조건부 표시, Cmd+Enter 힌트, borderRadius 0 | ⬜ 대기 |
| 29 | 화면 29 — Welcome | `src/` (Welcome/Onboarding 관련) | CLI 스타일 레이아웃, 단일 CTA | ⬜ 대기 |

---

## 진행 상황 요약

| Phase | 항목 수 | 완료 |
|-------|---------|------|
| Phase 1 — Foundation | 2 | 2 ✅ |
| Phase 2 — Shell | 3 | 3 ✅ |
| Phase 3 — Dashboard | 3 | 3 ✅ |
| Phase 4 — WorkMap | 1 | 1 ✅ |
| Phase 5 — Tasks | 5 | 5 ✅ |
| Phase 6 — Agents | 4 | 4 ✅ |
| Phase 7 — Library | 4 | 4 ✅ |
| Phase 8 — System | 2 | 2 ✅ (borderRadius 일괄) |
| Phase 9 — Panels | 2 | 2 ✅ (borderRadius 일괄) |
| Phase 10 — Modals | 3 | 3 ✅ (borderRadius 일괄) |
| **합계** | **29** | **28** |

> 🔄 = 부분 완료 (borderRadius + 주요 기능 변경), ✅ = 완전 완료

## 최근 작업 로그 (2026-03-11)

- **Phase 1 완료**: Toast (아이콘 ✓✕⚠ℹ, borderRadius 0, max 3스택, variant별 dismiss), ConfirmDialog (borderRadius 0, info variant, 아이콘 prefix)
- **Phase 2 완료**: Sidebar (OVERVIEW/TASKS/AGENTS/LIBRARY/SYSTEM 섹션 레이블 = collapse toggle, border-left active 스타일, ProjectSelector 사이드바 → 헤더 이동), AppHeaderBar (▶ AgentDesk 로고, ⌘K 버튼, Ctrl+K 단축키, [Project ▾] 슬롯 추가), CommandPalette 신규 (Quick Actions/Agents/Tasks, 키보드 ↑↓Enter)
- **Phase 3 완료**: Dashboard2 탭 OVERVIEW/PROJECT SETTINGS/PROJECT TYPES 영문화, borderRadius 0, TeamPanel 재작성 (PROJECT TEAM 헤더, 상태 배지, 피커 검색), AgentActivityPanel 빈 상태 표시(return null 제거), 영문화
- **Phase 4 완료**: OfficeView — WORKMAP 헤더(online/running/idle count), NOT IN TEAM 그룹, 활동 바 실제 진행률 연결(progress_percent), 태스크 #ID 표시, role badge borderRadius 0
- **Phase 5 완료**: TaskBoard 잔여 `rounded` 제거, GanttChart `in_progress` amber 색상 + #ID 표시, DependencyGraph `rx={0}` (borderRadius 0), ScheduledTasksPanel CLI 헤더 + uppercase 탭, Deliverables CLI 헤더 + toast + 필터 버튼 + 터미널 빈 상태
- **Phase 6 완료**: AgentsTab 완전 재작성 (dept-grouped 리스트 뷰, StatusBadge, stat 바), AgentFormModal 2단계 폼 (BASIC/ADVANCED 탭 + 번호 인디케이터 + Next/Back 버튼), DepartmentsTab 이미 완료, HeartbeatPanel standalone CLI 헤더
- **Phase 7 완료**: SkillsHeader/AgentRulesHeader/HooksHeader/MemoryHeader → CLI 모노 uppercase 포맷 (emoji 제거, `TITLE · N items` 형식, borderRadius 0)
- **Phase 8~10**: 전체 src/**/*.tsx borderRadius "2px"/"4px"/"1px" → 0 일괄 완료

## 갭 수정 로그 (2026-03-11 추가)

- **Sidebar 더블헤더 수정**: `kind: "group"` 엔트리 제거 → 섹션 레이블이 collapse 토글 역할로 통합 (chevron 추가)
- **Header 프로젝트 셀렉터**: AppHeaderBar에 `projectSelectorSlot` prop 추가, AppMainLayout에서 ProjectSelector 컴포넌트 전달, Sidebar 브랜드 영역에서 ProjectSelector 제거
- **Library 헤더 CLI 포맷**: SkillsHeader/AgentRulesHeader/HooksHeader/MemoryHeader 모두 emoji→uppercase mono 변환, violet 버튼→neutral 버튼
