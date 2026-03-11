# Paperclip → AgentDesk 디자인 & 기능 적용 계획

**작성일:** 2026-03-11
**참조:** `localhost:3101` (Paperclip UI), `design-system.md`, `ux-audit-2026-q1.md`
**목적:** Paperclip(Linear 스타일)의 디자인 언어와 기능 인터페이스를 AgentDesk에 단계적으로 적용

---

## 0. 방향 설정 — 무엇을 바꾸고 무엇을 유지하는가

### 현재 AgentDesk 스타일의 문제점

| 문제 | 현상 | 영향 |
|------|------|------|
| 레트로 터미널 전용 미학 | 모노스페이스 폰트 100%, 앰버 색상 과다 | 비개발자 진입장벽 높음 |
| FM2024 게임 UI 메타포 | "에이전트 어트리뷰트 바", 게임적 언어 | 제품 성숙도 낮게 보임 |
| 색상 계층 부재 | 모든 UI 요소에 `--th-accent` 남발 | 시각적 피로감 |
| 인터랙션 불명확 | 호버에만 나타나는 버튼들 | 기능 발견성 저하 |
| 폰트 일관성 없음 | Sora + IBM Plex + JetBrains Mono 혼재 | 시각적 노이즈 |

### 새 방향: "Professional Tool" 스타일

> FM2024 게임 메타포 → **Linear/Paperclip 스타일 프로 툴**
> 레트로 터미널 전용 → **터미널은 실행 영역에만 집중**
> 앰버 과다 → **모노크롬 베이스 + 포인트 컬러 절제**

### Keep vs Change

| 유지 | 변경 |
|------|------|
| 앰버 accent 색상 (브랜드 아이덴티티) | 모노스페이스 폰트를 UI 전체에 사용하는 관행 |
| 터미널 스타일 (실행 뷰어 영역) | FM 게임 메타포 (어트리뷰트 바, 레이팅 등) |
| 다크 테마 기본값 | 색상 있는 왼쪽 테두리를 모든 카드에 적용 |
| 상태 색상 시스템 | `rounded` 등 불일치한 border-radius |
| i18n 시스템 | window.alert / confirm 호출 (이미 제거 중) |
| 프로젝트 중심 아키텍처 | 정보 과밀한 레이아웃 |

---

## 1. 디자인 시스템 변경

### 1-1. Border Radius — 완전 직각화

Paperclip 핵심: **`--radius: 0`**

```css
/* 현재 AgentDesk */
borderRadius: "4px"   /* modal */
borderRadius: "2px"   /* button/badge */
borderRadius: "6px"   /* panel */

/* 새 규칙 */
--radius-none: 0px;      /* 버튼, 배지, 리스트 아이템, 카드 */
--radius-sm:   2px;      /* 인풋, 작은 컨트롤 */
--radius-md:   4px;      /* 모달 외부 컨테이너만 */
--radius-full: 9999px;   /* 아바타, 상태 dot만 */
```

**적용 원칙:**
- 기본 모든 컴포넌트: `borderRadius: 0`
- 입력 필드: `borderRadius: "2px"`
- 모달 다이얼로그 전체 컨테이너만: `borderRadius: "4px"`
- 아바타/상태 표시 dot: `borderRadius: "50%"` 유지

---

### 1-2. 색상 체계 — 계층 단순화

Paperclip은 oklch 기반이지만 AgentDesk는 기존 `--th-*` 체계 유지하되 **계층을 3단계로 정리**:

```
Layer 1: Background (bg-base → bg-elevated)  — 회색 농도 차이로만 구분
Layer 2: Border (border)                     — 단일 변수, 얇게
Layer 3: Text (heading / body / muted)        — 3단계만
```

**추가/변경 변수:**

```css
/* 새로 추가 */
--th-bg-base:      #0f1117;   /* 기존 --th-bg-primary */
--th-surface:      #1c2128;   /* 카드/패널 */
--th-surface-hover: rgba(255,255,255,0.04);  /* hover 상태 — 절제 */

/* 앰버는 유지하되 사용 빈도 줄임 */
--th-accent: #f59e0b;  /* 선택된 nav, primary CTA, 라이브 인디케이터만 */

/* 새 중립 accent (Paperclip의 bg-accent/50 역할) */
--th-hover-bg: rgba(255,255,255,0.04);  /* 모든 hover 상태 */
--th-active-bg: rgba(255,255,255,0.07); /* 선택/active 상태 */
```

**앰버 accent 사용 제한:**
- ✅ 선택된 사이드바 항목의 왼쪽 테두리
- ✅ Primary CTA 버튼 배경
- ✅ 라이브 실행 인디케이터 (pulse dot)
- ✅ 진행 중인 태스크 강조
- ❌ 패널 헤더의 왼쪽 색상 테두리 (→ 제거)
- ❌ 섹션 제목 텍스트 색상 (→ muted로)
- ❌ QuadrantPanel의 색상별 테두리 (→ 단일 border로)

---

### 1-3. 타이포그래피 — 산세리프 우선

```
현재: 모노스페이스 UI 전체 (레트로 터미널 미학)
변경: 산세리프 기본, 모노는 코드/터미널/배지/식별자만
```

```css
/* 새 폰트 스택 */
--th-font-ui:      -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--th-font-mono:    "JetBrains Mono", ui-monospace, monospace;  /* 유지 */

/* 적용 규칙 */
본문/레이블/버튼:     font-family: var(--th-font-ui)
식별자/배지/타임스탬프: font-family: var(--th-font-mono)
터미널 출력:          font-family: var(--th-font-mono)
코드 스니펫:          font-family: var(--th-font-mono)
```

**타입 스케일 (Paperclip 기준):**

| 역할 | 크기 | 굵기 | 기타 |
|------|------|------|------|
| 섹션 헤더 | 11px | 600 | uppercase + tracking-wider + muted |
| 네비 항목 | 13px | 500 | — |
| 본문/레이블 | 13px | 400 | — |
| 보조 텍스트 | 12px | 400 | text-muted |
| 배지/식별자 | 11px | 500 | mono, uppercase |
| 수치 (MetricCard) | 24–32px | 600 | tracking-tight |

---

### 1-4. 컴포넌트 패턴 — 리스트 & 카드

Paperclip의 핵심 패턴: **`border + divide-y`**

```tsx
/* Paperclip 리스트 패턴 — AgentDesk에 적용 */
<div className="border border-border divide-y divide-border overflow-hidden">
  {items.map(item => (
    <div className="px-4 py-2.5 hover:bg-[var(--th-hover-bg)] transition-colors">
      {/* item content */}
    </div>
  ))}
</div>

/* 현재 AgentDesk 패턴 (개별 카드) */
<div className="space-y-2">
  {items.map(item => (
    <div style={{ border: "1px solid var(--th-border)", borderRadius: "4px" }}>
      {/* item content */}
    </div>
  ))}
</div>
```

**적용 대상:**
- TaskBoard 리스트 뷰 → `border + divide-y`
- Recent Activity 피드 → `border + divide-y`
- Agent 목록 → `border + divide-y`
- Settings 섹션 내 항목들 → `border + divide-y`

**섹션 헤더 패턴 (Paperclip):**
```tsx
<h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3"
    style={{ color: "var(--th-text-muted)" }}>
  섹션 제목
</h3>
```

---

### 1-5. 호버 상태 — 절제

```
현재: 컴포넌트마다 다른 호버 색상
변경: 단일 규칙 — hover:bg-[var(--th-hover-bg)] (rgba 4% white)
```

```tsx
/* 모든 클릭 가능한 행/항목 */
className="... hover:bg-[var(--th-hover-bg)] transition-colors cursor-pointer"

/* 활성/선택 상태 */
className="... bg-[var(--th-active-bg)]"
```

---

## 2. 레이아웃 구조 변경

### 2-1. 사이드바 — CompanyRail 분리 검토

Paperclip은 **CompanyRail(slim) + Sidebar(240px)** 두 레이어.
AgentDesk는 현재 단일 Sidebar(220px).

**단기 (지금 당장):** 현재 구조 유지, 스타일만 정리
**중기:** 왼쪽에 프로젝트 전환 아이콘 레일(48px) 추가 검토

**즉시 적용할 사이드바 변경:**

```tsx
/* 현재 */
active: text-amber + bg + border-left 3px amber
inactive: text-muted

/* 변경 */
active: bg-[var(--th-active-bg)] text-foreground
         border-left: 2px solid var(--th-accent)  ← 앰버 테두리는 유지
inactive: text-[var(--th-text-secondary)] hover:bg-[var(--th-hover-bg)]

/* 섹션 그룹 레이블 */
font: 11px uppercase tracking-wider
color: var(--th-text-muted)
padding: 8px 12px 4px  (위쪽만)
```

### 2-2. 메인 콘텐츠 — 여백 정리

```
현재: 콘텐츠 꽉 채움, 최소 여백
변경: p-4 md:p-6 (Paperclip 기준), 섹션 간 gap 줄이기
```

### 2-3. BreadcrumbBar 개선

Paperclip의 `BreadcrumbBar`는 **페이지 제목이 곧 breadcrumb**:
- 단일 페이지: 큰 제목
- 계층 있는 경우: 상위 / 현재 형태

AgentDesk에도 동일한 패턴 적용:
```
대시보드 / My Project    ← 이미 구현됨
업무 보드               ← 현재 헤더 재사용
에이전트 관리           ← 페이지 제목으로
```

---

## 3. 기능 인터페이스 — Paperclip에서 차용할 것들

### 3-1. [High Priority] 커맨드 팔레트 (Cmd+K)

**Paperclip 구현:** `CommandPalette.tsx` — Cmd+K 트리거, 섹션별 검색

**AgentDesk 적용안:**
```
Cmd+K → 팔레트 열기

섹션 구성:
├── 액션
│   ├── 새 업무 만들기 (C)
│   ├── 새 프로젝트 만들기
│   └── 에이전트 관리 →
├── 이동
│   ├── 대시보드
│   ├── 업무 보드
│   ├── 에이전트 관리
│   └── 설정
├── 업무 검색 (입력 시 실시간)
└── 프로젝트 (최근 10개)
```

**구현 위치:** `src/components/CommandPalette.tsx` (신규)
**연결:** `App.tsx`에서 전역 Cmd+K 이벤트 리스너

---

### 3-2. [High Priority] TaskBoard — 리스트 뷰 + 보드 뷰 전환

**Paperclip 구현:** 리스트 뷰 + Kanban 보드 뷰 토글, URL에 상태 저장

**AgentDesk 현황:** 칸반 보드만 있음

**적용안:**
```
TaskBoard 상단 툴바:
[새 업무]  [검색]  |  [≡ 리스트] [⊞ 보드]  [필터▼] [정렬▼] [그룹▼]

리스트 뷰 (신규):
┌──────────────────────────────────────────────────┐
│  ● #042  feat: 로그인 리디자인  Claude-Dev  [실행중]  ▲▲▲  │
│  ○ #043  fix: 인증 토큰 버그   Gemini-QA   [대기]   ▲▲░  │
│  ✓ #044  docs: API 문서       GPT-Writer  [완료]   ▲░░  │
└──────────────────────────────────────────────────┘

각 행:
- 상태 아이콘 (클릭 → 팝오버로 변경)
- 식별자 (#042) — mono
- 제목
- 담당 에이전트 (클릭 → 인라인 변경)
- 상태 배지
- 우선순위 아이콘
- 라이브 표시 (실행 중일 때 파란 pulse dot)
```

**구현 파일:**
- `src/components/taskboard/TaskListView.tsx` (신규)
- `src/components/TaskBoard.tsx` — 뷰 토글 추가

---

### 3-3. [High Priority] 필터 & 그룹핑 고도화

**Paperclip 구현:** 상태/우선순위/담당자/레이블 복합 필터, 그룹핑, URL 동기화

**AgentDesk 현황:** 상태 탭 필터만 있음

**적용안:**
```
필터 팝오버:
┌─────────────────────┐
│ 상태                │
│ ☑ 실행 중          │
│ ☑ 대기             │
│ ☐ 완료             │
│ ☐ 오류             │
├─────────────────────┤
│ 우선순위            │
│ ☑ 높음             │
│ ☑ 보통             │
│ ☐ 낮음             │
├─────────────────────┤
│ 담당 에이전트       │
│ ☑ Claude-Dev        │
│ ☐ Gemini-QA         │
└─────────────────────┘

그룹 팝오버:
• 상태별 (기본)
• 우선순위별
• 에이전트별
• 그룹 없음
```

---

### 3-4. [Medium Priority] 실시간 에이전트 피드 개선

**Paperclip 구현:** `ActiveAgentsPanel` — WebSocket 스트리밍, 색상 분류, 자동 스크롤

**AgentDesk 현황:** `AgentActivityPanel` — 태스크 목록 형태, 클릭 시 터미널

**적용안 (대시보드):**
```
현재 실행 중인 에이전트 카드 (수평 스크롤 또는 그리드):

┌─────────────────────────┐
│ 🤖 Claude-Dev  ● LIVE   │
│ feat: 로그인 리디자인   │
├─────────────────────────┤
│ > Reading auth.ts...    │  ← 스트리밍 출력 (최근 5줄)
│ > Analyzing patterns    │  색상: 에러=빨강, 도구=시안
│ > Writing solution...   │     AI=초록, 일반=흰색
└─────────────────────────┘
```

---

### 3-5. [Medium Priority] 인라인 편집 (Inline Editing)

**Paperclip 구현:** 제목/설명 더블클릭 → 인라인 편집, Escape 취소

**AgentDesk 적용 대상:**
- 태스크 제목 (TaskCard)
- 프로젝트 이름 (Dashboard 헤더)
- 에이전트 이름 (AgentCard)

**구현 패턴:**
```tsx
// InlineEditable 컴포넌트 (신규)
<InlineEditable
  value={task.title}
  onSave={(newTitle) => updateTask(task.id, { title: newTitle })}
>
  <span className="...">{task.title}</span>
</InlineEditable>
```

---

### 3-6. [Medium Priority] 태스크 행 인라인 담당자 변경

**Paperclip 구현:** 리스트 행에서 담당자 아이콘 클릭 → 팝오버로 에이전트 선택

**적용 대상:** TaskListView의 각 행 (데스크탑만)

---

### 3-7. [Low Priority] 라이브 실행 인디케이터

**Paperclip 구현:** 실행 중 에이전트에 파란 pulsing dot + "Live (N)"

**AgentDesk 적용:**
- 사이드바 "업무 보드" 항목 옆에 실행 중 태스크 수 표시
- 태스크 행에서 실행 중일 때 파란 pulse dot

```tsx
/* pulsing dot 컴포넌트 */
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
</span>
```

---

### 3-8. [Low Priority] MetricCard 패턴 — 대시보드

**Paperclip 구현:** 큰 숫자 + 레이블 + 보조 설명 + 아이콘, 클릭 시 해당 페이지 이동

**AgentDesk 대시보드에 추가:**
```
┌─────────────────────┐  ┌─────────────────────┐
│  8                  │  │  23                 │
│  활성 에이전트      │  │  진행 중 업무       │
│  3 실행 중, 2 대기  │  │  5 오류, 12 대기    │
│                  🤖 │  │               ●    │
└─────────────────────┘  └─────────────────────┘
```

---

## 4. 컴포넌트별 변경 명세

### QuadrantPanel (목표/리스크/검토/결과물)

```
현재: 색상 있는 왼쪽 테두리 (파랑/빨강/보라/초록), 제목 모노
변경: 단일 border, 제목 sans-serif, 섹션 헤더 패턴 적용

변경 전:
  borderLeft: "3px solid #3b82f6"  ← 색상별 구분

변경 후:
  border: "1px solid var(--th-border)"  ← 통일
  헤더: 아이콘(색상 유지) + 텍스트(sans-serif) + ? 버튼
```

### Sidebar NavItem

```
현재:
  active: text-amber + bg rgba + border-left 3px amber
  inactive: text-muted
  font: mono

변경 (Paperclip 스타일):
  active: bg-[var(--th-active-bg)] text-foreground border-left 2px amber
  inactive: text-[13px] text-secondary hover:bg-[var(--th-hover-bg)]
  font: sans-serif
```

### TaskCard

```
현재: 카드 형태 (개별 border + borderRadius)
리스트뷰: border + divide-y 패턴으로 대체
보드뷰: 카드 형태 유지 (칸반은 카드가 적합)
```

### 모달 (CreateTaskModal 등)

```
현재: borderRadius: "4px" 또는 "rounded-lg"
변경: borderRadius: 0 (완전 직각)
헤더:
  제목: sans-serif, font-semibold
  서브타이틀: 유지
```

### 버튼

```
Primary: 앰버 bg 유지, borderRadius: 0
Secondary: 투명 bg + border, borderRadius: 0
Ghost: 투명 bg, hover만
Danger: 빨강 border + 투명 bg
```

---

## 5. 구현 우선순위 & 단계

### Phase A — 디자인 기반 정리 (1주, 코드 변경 최소)

목표: **border-radius 통일 + 타이포그래피 정리 + hover 색상 단순화**

- [ ] `index.css` — `--radius: 0` 기본값, `--th-hover-bg`, `--th-active-bg` 추가
- [ ] 전체 컴포넌트 `borderRadius` 값 0으로 통일 (모달만 2px 예외)
- [ ] 사이드바 폰트 → sans-serif, 스타일 정리
- [ ] QuadrantPanel 색상 왼쪽 테두리 → 단일 border로
- [ ] 섹션 헤더 패턴 통일 (uppercase tracking-wider muted)
- [ ] 버튼 hover 상태 `--th-hover-bg` 통일

### Phase B — 레이아웃 & 리스트 패턴 (1주)

- [ ] TaskBoard 리스트 뷰 구현 (리스트/보드 토글)
- [ ] 태스크 행: 상태 아이콘 + 식별자 + 제목 + 에이전트 + 배지 + 라이브dot
- [ ] 대시보드 — MetricCard 패턴 추가
- [ ] Activity 피드 → border+divide-y 패턴
- [ ] BreadcrumbBar 스타일 정리

### Phase C — 기능 추가 (2주)

- [ ] CommandPalette (Cmd+K) 구현
- [ ] TaskBoard 필터 팝오버 고도화 (상태/우선순위/에이전트 복합)
- [ ] TaskBoard 그룹핑 기능 (상태별/우선순위별/에이전트별)
- [ ] 라이브 실행 인디케이터 (pulse dot)
- [ ] 사이드바 배지 (진행 중 태스크 수)

### Phase D — 인터랙션 개선 (1주)

- [ ] 인라인 편집 (태스크 제목)
- [ ] 태스크 행 인라인 담당자 변경
- [ ] 실시간 에이전트 피드 UI 개선
- [ ] 키보드 단축키 정리 (Escape, Enter 등)

---

## 6. 파일 변경 대상 목록

### 즉시 변경 (Phase A)

| 파일 | 변경 내용 |
|------|-----------|
| `src/index.css` | CSS 변수 추가, radius 정리 |
| `src/components/Sidebar.tsx` / `SidebarNavItem` | 스타일 정리 |
| `src/components/dashboard/QuadrantPanel.tsx` | 색상 테두리 → 단일 border |
| `src/components/dashboard/Dashboard2.tsx` | MetricCard 영역 추가 |
| `src/components/taskboard/CreateTaskModalView.tsx` | borderRadius 0 |
| `src/components/settings/ProjectSettingsTab.tsx` | borderRadius 0 |
| `src/app/AppMainLayout.tsx` | 레이아웃 여백 정리 |

### 신규 생성 (Phase B~C)

| 파일 | 내용 |
|------|------|
| `src/components/taskboard/TaskListView.tsx` | 리스트 뷰 컴포넌트 |
| `src/components/CommandPalette.tsx` | Cmd+K 팔레트 |
| `src/components/ui/InlineEditable.tsx` | 인라인 편집 컴포넌트 |
| `src/components/taskboard/TaskFilterPopover.tsx` | 복합 필터 팝오버 |
| `src/components/taskboard/TaskGroupPopover.tsx` | 그룹핑 팝오버 |

---

## 7. 유지할 AgentDesk 고유 요소

Paperclip을 참고하되 AgentDesk만의 아이덴티티는 유지한다.

| 요소 | 이유 |
|------|------|
| 앰버(#f59e0b) 액센트 | 브랜드 색상, 터미널 미학과 연결 |
| 터미널 실행 뷰어 스타일 | AI 실행 영역의 핵심 UX |
| 부팅 시퀀스 애니메이션 | 제품 개성, 사용자 반응 좋음 |
| 다크 기본 테마 | 개발자 타겟 제품에 적합 |
| 프로젝트 중심 네비게이션 | AgentDesk의 핵심 아키텍처 |
| i18n (4개 언어) | 국제화 전략 |

---

## 8. 비교 스냅샷 — Before / After

### 대시보드 헤더

```
Before:
  [대시보드 / My Project  [카테고리배지]]  [앰버 accent 과다]
  탭 바: 개요 | 프로젝트 설정 | 프로젝트 유형

After:
  대시보드 / My Project    [개요] [프로젝트 설정] [프로젝트 유형]
  (간결한 breadcrumb + clean 탭)
```

### 사이드바 항목

```
Before:
  font-mono, text-amber (active), 앰버 왼쪽 테두리 3px

After:
  font-sans text-[13px], text-foreground (active)
  bg-[var(--th-active-bg)], 앰버 왼쪽 테두리 2px (포인트는 유지)
```

### 태스크 리스트 (신규 리스트 뷰)

```
After (Paperclip 패턴):
┌──────────────────────────────────────────────────────────┐
│  ●  #042  feat: 로그인 리디자인   🤖 Claude-Dev  [실행중]  ▲  │  ← hover bg
├──────────────────────────────────────────────────────────┤
│  ○  #043  fix: 인증 토큰 버그     🤖 Gemini-QA   [대기]   ▲  │
├──────────────────────────────────────────────────────────┤
│  ✓  #044  docs: API 문서          🤖 GPT-Writer  [완료]   ░  │  ← muted
└──────────────────────────────────────────────────────────┘
```

---

## 9. 참조 문서

| 문서 | 관계 |
|------|------|
| `design-system.md` | 현재 CSS 변수 시스템 (일부 유지) |
| `ux-audit-2026-q1.md` | UX 개선 원칙 — 동일하게 적용 |
| `DESIGN.md` | FM2024 스타일 레퍼런스 — 터미널 영역만 유지 |
| `ux-renewal-2.0.md` | 7가지 UX 원칙 — 동일하게 적용 |
| Paperclip 소스 | `C:/PythonProjects/paperclip-master/ui/src` |

---

> **핵심 원칙**: Paperclip/Linear 스타일의 **깔끔함과 기능성**을 가져오되,
> AgentDesk 고유의 **앰버 컬러, 터미널 미학, 프로젝트 OS 컨셉**은 유지한다.
