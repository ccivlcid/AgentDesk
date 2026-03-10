# AgentDesk UX 종합 감사 보고서 — 2026 Q1

**버전:** 1.0
**작성일:** 2026-03-10
**전제 문서:** [product-design.md](../product-design.md), [ux-renewal-2.0.md](ux-renewal-2.0.md), [design-system.md](design-system.md)

---

## 0. 감사 기준

### 제품 정의

> **AgentDesk는 "누구나 쉽게 에이전트를 이용해서 소프트웨어 개발 및 프로젝트를 생성·운영하는 Project OS"이다.**

이 감사는 위 정의를 기준으로, 사용자가 **프로젝트를 만들고 → 에이전트와 협업하고 → 결과물을 만들어내기까지의 여정** 전체에서 마찰이 어디에 있는지 진단한다.

### UX 7대 원칙 (`ux-renewal-2.0.md`)

| # | 원칙 | 핵심 |
|---|------|------|
| 1 | **평어 우선** | 전문 용어보다 일상 언어. 불가피하면 옆에 설명 |
| 2 | **한 번에 하나** | 화면당 사용자 행동 1개 |
| 3 | **왜 하는지 설명** | 모든 입력 요청에 한 줄 이유 |
| 4 | **빈 화면은 안내판** | 데이터 없는 상태가 가장 친절해야 한다 |
| 5 | **점진적 공개** | 처음 단순, 준비되면 고급 기능 |
| 6 | **실수 방지** | 파괴적 행동 전 확인. 되돌릴 수 없으면 명시 |
| 7 | **상태 항상 표시** | 지금 어디, 뭘 하고 있는지 항상 보여준다 |

### 감사 범위

- 프론트엔드 코드 전체 (TSX 컴포넌트, CSS 스타일, i18n)
- 5개 핵심 사용자 여정
- 접근성, 모바일 대응, 디자인 시스템 일관성

---

## 1. 현재 UX 문제점 — 사용자 여정별 진단

### 여정 A: 프로젝트 생성 (온보딩)

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 카테고리 선택 → 기본 정보 2단계 | 원칙 준수 ✅ | — | — |
| 프로젝트 경로 입력 (`~/projects/...`) | 비개발자에게 기술적 장벽 | #1 평어 우선 | High |
| 카테고리 없이 시작 시 대시보드 빈 화면 | 안내 메시지 있으나 CTA 부족 | #4 빈 화면은 안내판 | Medium |
| 프로젝트 경로 자동 생성 로직 | 한국어 포함 시 깨질 수 있음 | #6 실수 방지 | Low |

**코드 위치:**
- `src/components/project-create-modal/ProjectCreateModal.tsx` — 프로젝트 생성 모달
- `src/components/dashboard/Dashboard2.tsx` — 빈 상태 WelcomeScreen

---

### 여정 B: 에이전트 팀 구성

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 에이전트 생성 폼 13+ 필드 | 한 화면에 전부 노출 | #5 점진적 공개 | High |
| CLI provider 선택 (Anthropic, OpenAI 등) | 기술 용어 그대로 노출 | #1 평어 우선 | Medium |
| 아바타 파일 크기 검증 | `alert()` 사용 | #6 실수 방지 (UX 미달) | High |
| 에이전트 삭제 확인 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | High |
| 부서 관리 에러 | `alert()` 5곳 사용 | #6 실수 방지 (UX 미달) | High |

**코드 위치:**
- `src/components/agent-manager/AgentFormModal.tsx:100` — alert (이미지 크기)
- `src/components/AgentDetail.tsx:288` — window.confirm (삭제)
- `src/components/agent-manager/DepartmentFormModal.tsx:151,153,178,180,182` — alert 5곳

---

### 여정 C: 업무 실행 (태스크 관리)

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 태스크 생성 | 2클릭, 양호 ✅ | — | — |
| 드래그앤드롭 상태 변경 | 양호 ✅ (@dnd-kit) | — | — |
| 일괄 삭제 확인 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | High |
| API 실패 시 무응답 | `.catch(() => {})` | #7 상태 항상 표시 | Critical |
| 프로젝트 목록 로딩 실패 | 에러 무시 | #7 상태 항상 표시 | High |
| 로딩 상태 | 일부 누락 (스피너 없음) | #7 상태 항상 표시 | Medium |

**코드 위치:**
- `src/components/TaskBoard.tsx:323` — window.confirm (일괄 삭제)
- `src/components/TaskBoard.tsx` — .catch(() => {})
- `src/components/taskboard/CreateTaskModal.tsx` — .catch(() => {})

---

### 여정 D: 의사결정 (Decision Inbox)

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 옵션 선택 UI | 번호 버튼 + 멀티셀렉트, 양호 ✅ | — | — |
| 빈 선택 검증 | `window.alert()` 사용 | #6 실수 방지 (UX 미달) | High |
| 전송 로딩 상태 | "Sending..." 텍스트, 양호 ✅ | — | — |

**코드 위치:**
- `src/components/DecisionInboxModal.tsx:164` — window.alert (검증)

---

### 여정 E: 설정 & 연동

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 8개 탭 | 인지 과부하 | #5 점진적 공개 | Medium |
| OAuth 계정 삭제 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | High |
| 데이터 초기화 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | High |
| 저장 성공 피드백 | 2초 토스트, 양호 ✅ | — | — |

**코드 위치:**
- `src/components/SettingsPanel.tsx:382` — window.confirm (OAuth 삭제)
- `src/components/settings/DataSettingsTab.tsx:70` — window.confirm (데이터 초기화)

---

### 여정 F: 라이브러리 관리 (메모리, 룰, 훅, 스킬)

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 파일 크기 검증 | `alert()` 사용 (메모리, 룰, 훅) | #6 실수 방지 (UX 미달) | Medium |
| 커스텀 스킬 임포트 에러 | 하드코딩 영어 alert | #1 평어 우선, #6 실수 방지 | High |
| 채팅 기록 삭제 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | Medium |

**코드 위치:**
- `src/components/memory/MemoryFormModal.tsx:195` — alert (파일 크기)
- `src/components/agent-rules/RuleFormModal.tsx:192` — alert (파일 크기)
- `src/components/hooks/HookFormModal.tsx:244` — alert (파일 크기)
- `src/components/skills-library/CustomSkillSection.tsx:42,49` — alert (영어 하드코딩)
- `src/components/chat-panel/ChatPanelHeader.tsx:112` — window.confirm (기록 삭제)

---

### 여정 G: 하트비트 (직원 모니터링)

| 항목 | 현황 | 위반 원칙 | 심각도 |
|------|------|-----------|--------|
| 워치리스트 제거 확인 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | Medium |
| 로그 삭제 확인 | `window.confirm()` 사용 | #6 실수 방지 (UX 미달) | Medium |
| 실패 시 에러 표시 | `window.alert()` 사용 | #7 상태 항상 표시 (UX 미달) | Medium |

**코드 위치:**
- `src/components/office-view/HeartbeatPanel.tsx:492,499,611,618,691,698` — confirm/alert 6곳

---

### 기술적 문제 (전체)

| 문제 | 수치 | 영향 |
|------|------|------|
| `window.alert()` | **16곳** | 브라우저 기본 다이얼로그가 제품 경험 파괴 |
| `window.confirm()` | **9곳** | 비표준 확인 다이얼로그, 커스터마이징 불가 |
| `.catch(() => {})` (에러 무시) | **12곳** 8파일 | 사용자에게 피드백 없이 실패 |
| `!important` | **380회** | CSS 유지보수성·예측성 저하 |
| 하드코딩 rgba() | **313건** | 테마 변수 시스템 우회, 일관성 위험 |
| 모바일 미디어 쿼리 | **8개** | 반응형 대응 미흡 |
| ARIA 속성 | **거의 없음** | 스크린리더·키보드 접근성 부재 |
| `console.error` (프로덕션) | **105+곳** | 개발자 도구 없으면 사용자 인지 불가 |

---

## 2. 근본 원인 분석

| 원인 | 영향 범위 | 설명 |
|------|-----------|------|
| **피드백 시스템 부재** | 전체 여정 | 통합된 Toast/ConfirmDialog가 없어 `window.alert/confirm`으로 대체 |
| **디자인 시스템 미성숙** | 전체 | 공유 UI 프리미티브(Modal, Button 등)가 최근에야 생성됨. 이전 코드는 각 컴포넌트가 독자적으로 스타일링 |
| **에러 핸들링 전략 부재** | 여정 B~G | API 호출 실패를 일관되게 처리하는 패턴 없이 `.catch(() => {})` 관행 |
| **Tailwind v4 전환 과도기** | CSS | CSS 변수 기반 토큰과 기존 유틸리티 클래스 충돌 → `!important` 남발 |
| **레트로 터미널 테마 특수성** | CSS | glassmorphism 제거, border-radius 평탄화 등 대량 오버라이드 필요 |
| **모바일 후순위** | 레이아웃 | 데스크톱 중심 설계, 반응형은 사후 패치 수준 |
| **기술 용어 노출** | 여정 A, B | 비개발자 사용자에게 CLI/API/프로바이더 용어가 여과 없이 노출 |

---

## 3. UX 개선 전략 — Impact × Effort 매트릭스

### 우선순위 정의
- **P0 (즉시)**: 제품 핵심 경험을 직접 훼손하는 문제
- **P1 (다음 스프린트)**: "누구나 쉽게" 원칙 위반, 해결 비용 적절
- **P2 (백로그)**: 개선 효과 있으나 공수 큼
- **P3 (장기)**: 유지보수성 개선

| 개선 항목 | 관련 원칙 | Impact | Effort | 우선순위 |
|-----------|-----------|--------|--------|----------|
| ConfirmDialog/Toast 시스템 구축 | #6 실수 방지, #7 상태 표시 | ★★★ | ★☆☆ | **P0** |
| API 에러 피드백 일관화 | #7 상태 항상 표시 | ★★★ | ★★☆ | **P0** |
| 에이전트 폼 점진적 공개 | #5 점진적 공개 | ★★☆ | ★☆☆ | **P1** |
| 기술 용어 친화화 (CLI provider 등) | #1 평어 우선 | ★★☆ | ★☆☆ | **P1** |
| 빈 상태(EmptyState) 안내 통합 | #4 빈 화면은 안내판 | ★★☆ | ★☆☆ | **P1** |
| 접근성 (ARIA, 키보드 내비게이션) | "누구나 쉽게" | ★★★ | ★★☆ | **P1** |
| 폼 유효성 검증 인라인 피드백 | #3 왜 하는지 설명 | ★★☆ | ★☆☆ | **P1** |
| 설정 8탭 → 3그룹 재구성 | #5 점진적 공개 | ★☆☆ | ★☆☆ | **P2** |
| 모바일 반응형 전면 대응 | "누구나 쉽게" | ★★☆ | ★★★ | **P2** |
| CSS !important/rgba 정리 | (유지보수) | ★☆☆ | ★★★ | **P3** |

---

## 4. 레이아웃 개선

### 현재 구조 (유지)

```
┌──────────┬───────────────────────────────────┐
│          │ [Header: 로고 + 뷰 타이틀 + 액션]  │
│ Sidebar  ├───────────────────────────────────┤
│ (네비)   │                                   │
│          │        Main Content Area          │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

### 개선 제안

| 영역 | 현재 | 개선안 |
|------|------|--------|
| 헤더 "Tasks" 버튼 | 사이드바 "업무 관리"와 중복 | 헤더 버튼을 "업무" 또는 아이콘으로 차별화 |
| 대시보드 빈 상태 | WelcomeScreen 있으나 단순 | CTA 강화: "첫 번째 목표를 추가해볼까요?" + 큰 버튼 |
| 설정 탭 | 8개 수평 탭 (General, CLI, OAuth, API, Gateway, Data, Categories, Project) | 3그룹: **기본**(General·Project) / **연동**(OAuth·API·CLI) / **고급**(Gateway·Data·Categories) |
| 모바일 사이드바 | 햄버거 토글 | 오버레이 서랍형 + 스와이프 제스처 |

---

## 5. 컴포넌트 개선

### 5-1. 신규 프리미티브

#### ConfirmDialog

`window.confirm()` / `window.alert()` 25곳을 전량 대체.

```
┌────────────────────────────────────────┐
│ ⚠ 정말 삭제하시겠습니까?                  │
│                                        │
│ 이 업무 3개가 영구 삭제됩니다.             │
│ 이 작업은 되돌릴 수 없습니다.             │
│                                        │
│            [취소]  [삭제하기]             │
└────────────────────────────────────────┘
```

- 기존 `src/components/ui/Modal.tsx` 위에 구축
- Props: `title`, `message`, `confirmLabel`, `cancelLabel`, `variant` (danger/warning/info)
- i18n 지원 (t 함수 사용)

#### Toast / Snackbar

API 성공/실패 피드백용.

```
┌──────────────────────────────────┐
│ ✓ 저장되었습니다                    │  ← 3초 후 자동 닫힘
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ ✕ 저장에 실패했습니다. 다시 시도해주세요 │  ← 5초 후 자동 닫힘
└──────────────────────────────────┘
```

- `createPortal` + `position: fixed` (하단 중앙)
- Context 기반 관리 (`useToast` 훅)
- 기존 `src/components/NotificationCenter.tsx` 패턴 참조

#### EmptyState

빈 화면 안내 통합 패턴.

```
┌────────────────────────────────────────┐
│                                        │
│            📋                          │
│     아직 목표가 없어요.                  │
│   첫 번째 목표를 추가해볼까요?            │
│                                        │
│        [ + 목표 추가하기 ]               │
│                                        │
└────────────────────────────────────────┘
```

- Props: `icon`, `title`, `description`, `actionLabel`, `onAction`

### 5-2. 기존 컴포넌트 개선

#### 에이전트 생성 폼 — 점진적 공개

**현재**: 13+ 필드가 한 화면에 전부 노출 (2-column)

**개선안**: 2단계 분리

| 단계 | 필드 | 설명 |
|------|------|------|
| 1단계 (기본) | 이름(EN), 이름(KO), 이모지, 부서, 역할 | 에이전트 생성에 필수적인 최소 정보 |
| 2단계 (고급, 접힌 상태) | CLI 프로바이더, 페르소나, 아바타 | "고급 설정 열기" 클릭 시 확장 |

**코드 위치**: `src/components/agent-manager/AgentFormModal.tsx`

#### 프로젝트 경로 — 기술 장벽 완화

**현재**: `~/projects/project-name` 직접 입력

**개선안**:
- 기본값 자동 생성 유지 (현재와 동일)
- 입력 필드 위에 안내 문구: "에이전트가 작업할 폴더입니다. 기본값을 사용해도 됩니다."
- 향후: 네이티브 폴더 선택기 연동 (Electron/Tauri 전환 시)

---

## 6. 인터랙션 개선

### 6-1. 파괴적 행동 흐름

**현재**: `window.confirm("삭제하시겠습니까?")` → 즉시 실행

**개선안**:
1. 사용자가 삭제 버튼 클릭
2. ConfirmDialog 모달 표시 (되돌릴 수 없음 명시)
3. 확인 클릭 → 로딩 표시 → API 호출
4. 성공 → Toast ("삭제되었습니다") + UI 갱신
5. 실패 → Toast ("삭제에 실패했습니다")

### 6-2. API 호출 피드백 일관화

**현재**: `.catch(() => {})` — 실패해도 아무 피드백 없음 (12곳, 8파일)

**개선안**: 모든 API 호출에 에러 토스트 추가

교체 대상:
- `src/app/AppMainLayout.tsx` — 1곳
- `src/components/NotificationCenter.tsx` — 3곳
- `src/components/dashboard/AgentActivityPanel.tsx` — 1곳
- `src/components/TaskBoard.tsx` — 1곳
- `src/components/taskboard/CreateTaskModal.tsx` — 1곳
- `src/components/settings/GitHubOAuthAppConfig.tsx` — 1곳
- `src/components/project-create-modal/RecommendedSkillsSection.tsx` — 1곳
- `src/components/office-view/CliUsagePanel.tsx` — 3곳

### 6-3. 로딩 상태 표준화

| 상황 | 현재 | 개선안 |
|------|------|--------|
| 버튼 클릭 후 API 호출 | 일부만 disabled 처리 | disabled + 텍스트 변경 ("저장 중...") 통일 |
| 패널 데이터 로딩 | 일부 skeleton, 일부 빈 화면 | skeleton placeholder 통일 |
| 페이지 전환 | framer-motion 페이드, 양호 ✅ | 유지 |

### 6-4. 키보드 단축키 (향후)

| 단축키 | 기능 |
|--------|------|
| `Cmd/Ctrl + K` | 글로벌 검색 |
| `Cmd/Ctrl + N` | 새로 만들기 (현재 뷰에 맞는 생성) |
| `Escape` | 모달/패널 닫기 (이미 구현 ✅) |

---

## 7. 모바일 UX 개선

### 현황

- 미디어 쿼리 **8개**만 사용 (전체 CSS 4,934줄 대비)
- 사이드바: 모바일 햄버거 토글 있으나 최적화 미흡
- 태스크보드: 다중 컬럼이 모바일에서 가로 스크롤
- 터치 타깃: 일부 버튼이 44px 미만

### 개선안

| 영역 | 현재 | 개선안 |
|------|------|--------|
| 브레이크포인트 | 비체계적 (639, 1023, 1279px) | 표준화: sm(640), md(768), lg(1024), xl(1280) |
| 사이드바 | 단순 토글 | 오버레이 서랍형 + 바깥 클릭/스와이프 닫기 |
| 태스크보드 | 다중 컬럼 가로 스크롤 | 단일 컬럼 + 좌우 스와이프 전환 |
| 에이전트 카드 | 그리드 레이아웃 | 스택형 (세로 리스트) |
| 터치 타깃 | 미표준 | 최소 44×44px |
| 대시보드 | 2×2 그리드 | 세로 스택 (1열) |

---

## 8. 프론트엔드 구현 제안

### P0: ConfirmDialog + Toast 시스템

**신규 파일:**

| 파일 | 설명 |
|------|------|
| `src/components/ui/ConfirmDialog.tsx` | Modal 기반 확인 다이얼로그 |
| `src/components/ui/Toast.tsx` | Portal 기반 토스트 알림 |
| `src/hooks/useToast.ts` | Context + 훅으로 토스트 관리 |

**기존 코드 활용:**
- `src/components/ui/Modal.tsx` — ConfirmDialog의 기반
- `src/components/ui/Button.tsx` — 확인/취소 버튼
- `src/components/NotificationCenter.tsx` — 알림 패턴 참조

**교체 대상:** `window.alert` 16곳 + `window.confirm` 9곳 = **25곳**

### P1: 점진적 공개 + 용어 친화화 + 빈 상태

**에이전트 폼 리팩터링:**
- `src/components/agent-manager/AgentFormModal.tsx` — 2단계(기본/고급) 분리
- 고급 설정은 `<details>` 또는 토글 버튼으로 접기

**빈 상태 통합:**
- `src/components/ui/EmptyState.tsx` 신규 생성
- 대시보드, 태스크보드, 에이전트 목록 등 빈 상태에 적용

**용어 친화화:**
- `ux-renewal-2.0.md` §2 용어 가이드 적용
- CLI provider → "AI 모델 선택" 등으로 변경

### P1: 접근성

**즉시 적용 가능:**
- icon-only 버튼에 `aria-label` 일괄 추가
- 커스텀 `<select>`에 `role="listbox"` + `aria-expanded`
- `prefers-reduced-motion` 미디어 쿼리 이미 CSS에 있음 ✅

**이미 완료된 항목:**
- Skip-to-content 링크 ✅ (`src/app/AppMainLayout.tsx`)
- Modal 포커스 트랩 ✅ (`src/components/ui/Modal.tsx`)
- WCAG AA 대비율 ✅ (`--th-text-muted` 4.5:1 이상)

### P2: 모바일 반응형

**신규:**
- `src/hooks/useMediaQuery.ts` — 반응형 브레이크포인트 훅

**수정 대상:**
- `src/components/Sidebar.tsx` — 오버레이 서랍형
- `src/components/TaskBoard.tsx` — 모바일 단일 컬럼
- `src/components/AgentManager.tsx` — 모바일 스택 레이아웃
- `src/components/dashboard/Dashboard2.tsx` — 모바일 1열 스택

---

## 부록: 수치 요약

| 지표 | 수치 |
|------|------|
| CSS 파일 | 5개, 4,934줄 |
| CSS 변수 (--th-*) | 68개 |
| !important 사용 | 380회 |
| 하드코딩 rgba() | 313건 |
| @keyframes 애니메이션 | 57개 |
| 커스텀 CSS 클래스 | 407개 |
| window.alert() | 16곳 |
| window.confirm() | 9곳 |
| .catch(() => {}) | 12곳 (8파일) |
| console.error (프로덕션) | 105+곳 |
| 미디어 쿼리 | 8개 |
| i18n 지원 언어 | 4개 (ko, en, ja, zh) |
| 공유 UI 프리미티브 | 5개 (Modal, Button, Input, Textarea, FormField) |

---

## 부록: `window.alert` / `window.confirm` 전체 위치

### window.alert (16곳)

| 파일 | 라인 | 내용 |
|------|------|------|
| `agent-manager/AgentFormModal.tsx` | 100 | 이미지 5MB 초과 |
| `agent-manager/DepartmentFormModal.tsx` | 151 | 부서 ID 중복 |
| `agent-manager/DepartmentFormModal.tsx` | 153 | 부서 생성 실패 |
| `agent-manager/DepartmentFormModal.tsx` | 178 | 소속 직원 있어 삭제 불가 |
| `agent-manager/DepartmentFormModal.tsx` | 180 | 연결 태스크 있어 삭제 불가 |
| `agent-manager/DepartmentFormModal.tsx` | 182 | 시스템 부서 삭제 불가 |
| `memory/MemoryFormModal.tsx` | 195 | 파일 1MB 초과 |
| `agent-rules/RuleFormModal.tsx` | 192 | 파일 512KB 초과 |
| `hooks/HookFormModal.tsx` | 244 | 파일 크기 초과 |
| `skills-library/CustomSkillSection.tsx` | 42 | Invalid skill package (영어 하드코딩) |
| `skills-library/CustomSkillSection.tsx` | 49 | Import failed (영어 하드코딩) |
| `DecisionInboxModal.tsx` | 164 | 선택 없이 제출 시도 |
| `office-view/HeartbeatPanel.tsx` | 499 | 워치리스트 제거 실패 |
| `office-view/HeartbeatPanel.tsx` | 618 | 전체 삭제 실패 |
| `office-view/HeartbeatPanel.tsx` | 698 | 로그 삭제 실패 |
| `office-view/HeartbeatPanel.tsx` | (추가 1곳) | — |

### window.confirm (9곳)

| 파일 | 라인 | 내용 |
|------|------|------|
| `AgentDetail.tsx` | 288 | 에이전트 삭제 |
| `ProjectManagerModal.tsx` | 264 | 프로젝트 삭제 |
| `TaskBoard.tsx` | 323 | 일괄 태스크 삭제 |
| `SettingsPanel.tsx` | 382 | OAuth 계정 삭제 |
| `settings/DataSettingsTab.tsx` | 70 | 데이터 초기화 |
| `chat-panel/ChatPanelHeader.tsx` | 112 | 채팅 기록 삭제 |
| `deliverables/GitSection.tsx` | 62 | Git 작업 확인 |
| `office-view/HeartbeatPanel.tsx` | 492 | 워치리스트 제거 |
| `office-view/HeartbeatPanel.tsx` | 611 | 전체 로그 삭제 |
| `office-view/HeartbeatPanel.tsx` | 691 | 개별 로그 삭제 |
