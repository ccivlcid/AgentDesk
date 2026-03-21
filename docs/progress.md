# AgentDesk — Development Progress

> Last updated: 2026-03-26

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
- **Phase 13** — FM2024 CSS Overhaul: 전체 tsx → --th-* 변수 시스템
- **Earlier** — Security hardening, performance optimization, Workflow Builder, Synapse, Local LLM, Custom Features, macOS UX (MX-01~12), Widget Board, Flow Graph 등
