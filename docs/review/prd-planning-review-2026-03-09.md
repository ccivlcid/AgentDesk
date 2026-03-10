# PRD·기획 문서 검토 결과

검토일: 2026-03-09
업데이트: 2026-03-10 (ux-renewal-2.0.md 생성 반영)
대상: `claw-empire-differentiation-plan.md`, `agentdesk-2.0-menu-spec.md`, `ux-renewal-2.0.md`
기준: 전략 일관성, 구현 가능성, 문서 완결성, 코드와의 정합성

---

## 1. 종합 평가

| 항목 | 평가 | 비고 |
|------|------|------|
| 전략·메뉴 스펙 일관성 | ✅ 양호 | Project OS, CEO 제거, 카테고리 중심으로 서로 정렬됨 |
| As-Is 기술 정확도 | ✅ 정확 | Sidebar.tsx `NAV_STRUCTURE`와 메뉴 스펙 일치 |
| 로드맵·티켓 연계 | ✅ 양호 | Phase 1~3와 개발 티켓이 대응됨 |
| PRD로서 완결성 | ⚠️ 보완 권장 | 사용자 스토리·성공 지표·범위 제외 조건이 있으면 좋음 |

**결론:** 리뉴얼 방향과 메뉴/데이터 모델 설계는 잘 잡혀 있으며, 그대로 개발 착수 가능한 수준입니다. 아래 보완 사항 반영 시 PRD·기획서로서 더 안정적입니다.

---

## 2. claw-empire-differentiation-plan.md 검토

### 잘된 점

- **포지셔닝 전환**이 한 줄로 명확함: CEO/CTO 시뮬레이터 → Project OS.
- **제품 구조**가 공통 코어 vs 카테고리 시스템으로 나뉘어 있어 확장 경로가 분명함.
- **데이터 모델**에서 카테고리/프로젝트 엔티티 필드가 구체적임 (`category_version`, `success_metric`, `risk_profile`, `owner_scope` 등).
- **60일 로드맵**이 Phase 1(전환)·2(카테고리 MVP)·3(자동화)로 나뉘고, **바로 생성할 개발 티켓**과 1:1로 연결됨.
- **UX 변경 제안**에서 온보딩·프로젝트 생성·대시보드·카테고리 에디터가 Phase와 맞게 기술됨.

### 보완 제안

1. **섹션 3 제목 중복**  
   - "## 3. 제품 구조: 공통 코어 + 카테고리 시스템" 아래에 "## 3-1.", "## 3-2."가 있음.  
   - 제안: "3-1", "3-2"를 "### 3-1.", "### 3-2."로 내려서 계층을 명확히 하거나, "3. 제품 구조"를 단일 섹션으로 두고 3-1, 3-2를 서브헤딩으로 통일.

2. **성공 지표(Success Metrics) 추가 권장**  
   - PRD 관점에서 "어떤 수치/행동으로 성공을 볼 것인가"가 있으면 좋음.  
   - 예: Phase 2 완료 시 "프로젝트 생성 시 카테고리 선택률", "사용자 정의 카테고리 1개 이상 생성 비율" 등 (선택).

3. **범위 제외(Out of Scope) 명시 권장**  
   - "60일 안에 하지 않는 것"을 한 줄씩 적어두면 범위 creep 방지에 도움.  
   - 예: 멀티테넌시·SSO·모바일 전용 앱·카테고리 마켓플레이스 등.

4. **Phase 2 "자동 주입" 문구**  
   - "프로젝트 생성 시 카테고리 **자동 주입**: 선택한 카테고리의 `category_version` 고정 + …"  
   - 이미 5. UX 변경 제안의 "2. 프로젝트 생성"과 일치하므로, 7. 로드맵 Phase 2에 "자동 주입 동작은 5절 프로젝트 생성과 동일"처럼 한 줄 크로스레퍼런스 추가하면 읽는 사람이 혼동하지 않음.

---

## 3. agentdesk-2.0-menu-spec.md 검토

### 잘된 점

- **As-Is**가 `Sidebar.tsx`의 `NAV_STRUCTURE` 순서·그룹·자식 뷰와 일치함 (office → agents → library → dashboard → cli-usage → tasks → game-room → settings).
- **To-Be** 메뉴 순서가 전략(대시보드 = 홈, 그 다음 Office → Tasks → Team → Library)과 맞음.
- **CEO 제거**, **상단 = 로고 + 프로젝트 셀렉터**로 differentiation plan과 정렬됨.
- **구현 체크리스트**가 있어 개발 시 누락 방지에 유리함.

### 수정 권장(사소함)

1. **문서 내 문자 깨짐**  
   - "? "가 화살표(→) 또는 "and"로 쓰인 곳이多处 있음 (예: "Source: … ? `NAV_STRUCTURE`", "Click ? project list").  
   - 제안: UTF-8로 저장 후 "?"를 "→" 또는 "and"로 치환해 가독성 확보.

2. **섹션 2 제목**  
   - "## 2. 2.0 Renewal Direction" → "## 2. 2.0 리뉴얼 방향" 등으로 번호와 제목만 정리해도 됨 (현재 "2. 2.0"이 겹쳐 보일 수 있음).

3. **Phase 2와의 연결**  
   - "Project/category entry (supplement)"에서 "No project" 시 "New project" or "Pick category then create"라고 했고, differentiation plan Phase 2의 "카테고리 선택형 프로젝트 생성 플로우"와 동일한 범위임.  
   - 메뉴 스펙 4. Implementation checklist에 "First-entry when no project"가 별도 스펙으로 명시되어 있으므로, differentiation plan의 해당 Phase 2 티켓과 한 줄 링크만 걸어두면 좋음.

### 코드와의 정합성

- Library 자식: 스펙 "Skills / Agent Rules / Memory / Hooks" ↔ 코드 `skills`, `agent-rules`, `memory`, `hooks` 일치.
- Tasks 자식: 스펙 "Task board / Deliverables / Scheduler" ↔ 코드 `tasks-board`, `tasks-deliverables`, `tasks-scheduled` 일치.
- 구현 시 `NAV_STRUCTURE` 순서만 체크리스트대로 바꾸면 됨.

---

## 3-A. ux-renewal-2.0.md 검토 (2026-03-10 추가)

### 문서 개요

`docs/design/ux-renewal-2.0.md` — 2.0 리뉴얼 UX 스펙. "누구나 쉽게" 원칙 기반.

### 잘된 점

- **§1 "누구나 쉽게" 7원칙**이 명확함: 평이한 언어, 화면당 한 가지 행동, 이유 설명, 빈 상태 안내, 점진적 공개, 오류 예방, 용어 통일.
- **§2 용어 친화성 가이드**: 기술 용어(Gate, Deliverable, KPI Schema)를 평이한 한국어로 매핑 + ⓘ 툴팁 적용 기준 정의.
- **§4 사이드바 프로젝트 셀렉터**: 와이어프레임과 드롭다운 동작이 메뉴 스펙(agentdesk-2.0-menu-spec.md)과 정합.
- **§6 대시보드 4분면**: 목표/리스크/검토 단계/결과물 각 위젯의 빈 상태 문구·CTA까지 정의.
- **§11-A 프로젝트 팀 구성**: 에이전트 글로벌 풀 → 프로젝트 팀 배정 UX 3개 진입점(팀 섹션, 태스크 배정, 오피스 뷰) 정의.
- **§11-B 페르소나 에이전트**: "방식 우선" 원칙으로 유명인 이름을 모르는 사용자도 쉽게 선택 가능. `agent-persona-system.md §4`와 정합.

### 확인 사항

- §5 온보딩 플로우(3단계)와 §7 프로젝트 생성 모달(2단계)이 Phase 2 구현 전 확정 필요.
- §8 카테고리 에디터 UI는 Phase 2 착수 전 노코드 폼 vs JSON 직접 편집 범위를 개발팀이 확인 권장.

---

## 4. 문서 간 정합성

| 주제 | differentiation plan | menu spec | ux-renewal-2.0.md | 일치 |
|------|------------------------|-----------|-------------------|------|
| CEO 노출 제거 | 직책(CEO/CTO) 제거, Phase 1 용어 전환 | Top에서 CEO/ceoName 제거, 로고+프로젝트 셀렉터만 | §4 사이드바 셀렉터 와이어프레임 | ✅ |
| 첫 화면/엔트리 | 프로젝트·카테고리 선택/생성 | 앱 런치 후 (선택) 프로젝트/카테고리 컨텍스트 → 대시보드 | §5 온보딩 3단계 | ✅ |
| 카테고리 에디터 | Phase 2 카테고리 CRUD·에디터 | 설정 탭 또는 별도 서브메뉴 | §8 카테고리 에디터 UI | ✅ |
| 대시보드 | 4분면(목표/리스크/게이트/산출물) | 2.0 "홈", 4 quadrants | §6 대시보드 4분면 위젯 | ✅ |
| 프로젝트 팀 구성 | project_agents 모델, Phase 2 | — | §11-A 팀 구성 3 진입점 | ✅ |
| 페르소나 에이전트 UX | agent-persona-system.md §4 | — | §11-B "방식 우선" 카드 | ✅ |

추가로, differentiation plan의 "직책 선택 UI: Phase 1에서 신규 플로우는 숨기고 레거시만 유지"는 메뉴 스펙의 "CEO concept removed"와 충돌하지 않으며, 메뉴 스펙은 UI 구조만 다루므로 "직책 선택" 노출 여부는 별도 UX 플로우 문서에서 다루면 됨.

---

## 5. PRD·기획서 보강 체크리스트 (선택)

리뉴얼을 PRD 수준까지 끌어올리고 싶다면 아래를 추가하는 것을 권장합니다.

- [ ] **목표 사용자/페르소나**: 1~2문단 (예: 팀장, PM, 소규모 조직)
- [ ] **성공 지표**: Phase별 1~2개 (예: 카테고리 선택률, NPS)
- [ ] **Out of Scope**: 60일·Phase 1~2에서 하지 않을 것 3~5줄
- [ ] **의존성/리스크**: 서버·DB 마이그레이션, 기존 프로젝트 데이터 호환 정책 한 줄
- [ ] **용어집**: Project OS, Category, Gate, Deliverable 등 5~10개 한 줄 정의

---

## 6. 프로젝트 진행 순서 (권장)

리뉴얼을 착수할 때 **문서·설계 → 아키텍처 → 구현** 순으로 진행하면 의존성 충돌을 줄일 수 있습니다.

### 6-1. 문서·기획 단계 (착수 전)

| 순서 | 작업 | 참조 문서 | 비고 |
|------|------|------------|------|
| 1 | 전략·포지셔닝 확정 | `claw-empire-differentiation-plan.md` | Project OS, 카테고리 시스템 방향 확정 |
| 2 | 아키텍처 문서 정렬 | `docs/architecture/` | CEO → Project 등 용어/구조를 전략에 맞게 수정 (완료됨) |
| 3 | 메뉴·UI 스펙 확정 | `agentdesk-2.0-menu-spec.md` | To-Be 순서, 상단 영역(로고+프로젝트 셀렉터) |
| 4 | (선택) PRD 보강 | 본 문서 §5 체크리스트 | 페르소나, 성공 지표, Out of Scope |

### 6-2. Phase 1 구현 순서 (0–20일)

| 순서 | 작업 | 의존 | 산출 |
|------|------|------|------|
| 1 | `category` / `category_version` 스키마 추가 | 없음 | DB 마이그레이션, 타입 정의 |
| 2 | 기본 카테고리 템플릿 시드 | 1 | IT / Software Development / Investment / Research / Marketing / Custom |
| 3 | 메뉴 순서·브랜드 영역 변경 (Sidebar) | 메뉴 스펙 확정 | Dashboard 1번, CEO 제거, 로고+프로젝트 셀렉터(간단 버전) |
| 4 | 용어·카피 전환 (UI 문자열) | 없음 | Project OS / Category OS 문구 적용 |

- **2 → 3** 순서 권장: 카테고리 테이블이 있어야 “프로젝트 셀렉터”에서 카테고리 배지를 보여줄 수 있음.  
- 프로젝트 셀렉터를 “현재 프로젝트 이름만 표시”하는 최소 버전으로 먼저 넣고, Phase 2에서 “카테고리 선택·생성” 플로우를 붙여도 됨.

### 6-3. Phase 2 구현 순서 (21–40일)

| 순서 | 작업 | 의존 | 산출 |
|------|------|------|------|
| 1 | 카테고리 CRUD + 버저닝 API | Phase 1 스키마·시드 | `/api/categories` 등 |
| 2 | 프로젝트 엔티티에 `category_id`·`category_version`·정책 필드 | Phase 1 스키마 | 프로젝트 생성/수정 시 카테고리 연결 |
| 3 | 카테고리 선택형 프로젝트 생성 플로우 (UI) | 1, 2 | [ux-renewal-2.0.md §7](../design/ux-renewal-2.0.md) 기준 |
| 4 | 카테고리 에디터 (정책/KPI/게이트/산출물) | 1 | [ux-renewal-2.0.md §8](../design/ux-renewal-2.0.md) 기준 |
| 5 | First-entry 플로우 (프로젝트 없을 때) | 3 | [ux-renewal-2.0.md §5](../design/ux-renewal-2.0.md) 온보딩 기준 |
| 6 | 대시보드 4분면 위젯 (목표/리스크/검토 단계/결과물) | 2 | [ux-renewal-2.0.md §6](../design/ux-renewal-2.0.md) 기준 |
| 7 | 프로젝트 팀 구성 UX (팀 섹션, 태스크 배정, 오피스 뷰) | Phase 1 에이전트 | [ux-renewal-2.0.md §11-A](../design/ux-renewal-2.0.md) 기준 |
| 8 | 페르소나 에이전트 “방식 우선” 카드 UI | — | [ux-renewal-2.0.md §11-B](../design/ux-renewal-2.0.md) 기준 |

- **1 → 2 → 3** 순서 유지: API와 프로젝트 모델이 있어야 생성 플로우에서 카테고리를 선택·주입할 수 있음.
- **6, 7, 8**은 3번 이후 병렬 진행 가능.

### 6-4. Phase 3 (41–60일)

- Phase 2 MVP 안정화 후, 엔진 연동(자동 라우팅/홀드, KPI 재정렬, 산출물 재사용 추천) 순서는 differentiation plan §7 Phase 3 및 개발 티켓 순서를 따르면 됨.

### 요약

- **문서/기획**: 전략 → 아키텍처 → 메뉴 스펙 → (선택) PRD 보강  
- **Phase 1**: 스키마·시드 → 메뉴/브랜드 영역 → 용어 전환  
- **Phase 2**: 카테고리 API → 프로젝트 모델 확장 → 생성 플로우 → 에디터 → First-entry  

---

## 7. 요약

- **differentiation plan**: 전략·데이터 모델·로드맵·개발 티켓이 잘 연결되어 있음. 섹션 번호 정리와 성공 지표·Out of Scope 추가를 하면 PRD로 활용하기 좋음.
- **menu spec**: 2026-03-10 한국어로 완전 재작성됨. As-Is가 코드와 일치하고, To-Be가 전략과 맞으며 구현 체크리스트 완비.
- **ux-renewal-2.0.md**: 2026-03-10 신규 작성. "누구나 쉽게" 원칙부터 각 화면 와이어프레임까지 UX 구현 기준 문서.
- **진행 순서**: 문서·기획 정리 완료. Phase 1(스키마·시드 → 메뉴/브랜드 → 용어), Phase 2(카테고리 API → 프로젝트 모델 → 생성 플로우 → 에디터 → 대시보드/팀/페르소나 UX) 순으로 진행.
- 세 문서는 서로 모순 없이 정렬되어 있어, 현재 상태로 리뉴얼 개발 착수 가능합니다.
