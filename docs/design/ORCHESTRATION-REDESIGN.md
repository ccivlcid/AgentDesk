# Orchestration Window Redesign — Unified Mission Control

> **Status:** Design Draft v2
> **Date:** 2026-03-29
> **Reference:** `docs/design/3.png`
> **Scope:** OrchestrationWindow 전체 (AgentsTab만이 아님)
> **Design system:** `docs/design/DESIGN.md`
> **Philosophy:** 잡스 — "탭을 왔다갔다하는 것 자체가 디자인의 실패"

---

## 0. Design Philosophy

사용자가 이 화면을 여는 이유는 하나:
**에이전트들이 일하는 걸 지켜보고, 문제가 생기면 개입한다.**

4개 탭(Timeline, Logs, Agents, Room)은 엔지니어의 데이터 분류다.
사용자는 데이터 종류를 신경쓰지 않는다. 사용자는 **상황**을 본다.

**원칙:**
1. **한 화면에 모든 것** — 탭 전환 없이 에이전트 + 태스크 + 로그
2. **클릭은 드릴다운** — 더 알고 싶으면 클릭, 기본 뷰에서 벗어나지 않음
3. **알림이 찾아옴** — PM 질문은 사용자가 찾아가는 게 아니라 자동 팝업
4. **사이버펑크 비주얼** — 매트릭스 코드 레인, 네온 글로우, 에이전트 네트워크

---

## 1. What We Remove

| 제거 | 이유 | 대체 |
|------|------|------|
| **TabBar** (4탭) | 탭 전환 = UX 실패 | 단일 통합 뷰 |
| **StageRail** (72px 좌측) | PM 노드가 파이프라인 단계를 표시 | Constellation PM 노드 |
| **Timeline 탭** | 사이드바 TASKS 체크리스트로 요약 | 사이드바 섹션 |
| **Logs 탭** | 하단 LIVE ACTIVITY로 통합 | 하단 패널 |
| **Agents 탭** | Constellation + 사이드바 드릴다운 | 메인 영역 + 클릭 상세 |
| **MetricsHeader** (기존) | Top Bar로 대체 | 프로그레스 바 + 시간 |

**유지:**
- Room 기능 → 하단 LIVE ACTIVITY에서 토글로 접근
- 모든 상세 데이터 → 사이드바 드릴다운으로 접근

---

## 2. Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR                                                     │
│ AGENT TEAM › project-name › Sprint Goal   ████░░ 33%  04:38│
├──────────────────────────────────┬──────────────────────────┤
│                                  │ AGENTS             [5]  │
│                                  │ ┌──────────────────────┐│
│   C O N S T E L L A T I O N    │ │● Manager   Monitoring ││
│                                  │ │● WebDev    Typing    ││
│   사이버펑크 에이전트 네트워크     │ │● Frontend  Coding    ││
│   매트릭스 코드 레인 배경         │ │● Backend   Coding    ││
│   네온 글로우 링                  │ │○ Tester    Waiting   ││
│                                  │ └──────────────────────┘│
│   메인 영역 ~65%                  │                          │
│                                  │ TASKS            [2/6]  │
│   노드 클릭 → 사이드바 전환       │ ✅ Project scaffolding  │
│                                  │ ✅ Define API schema    │
│                                  │ ⬜ Build Dashboard UI   │
│                                  │ ⬜ User API endpoints   │
│                                  │ ⬜ Integration tests    │
│                                  │ ⬜ E2E test suite       │
│                                  │                          │
│                                  │ 사이드바 ~35%             │
├──────────────────────────────────┴──────────────────────────┤
│ LIVE ACTIVITY                                        [Room]│
│ 00:14 WEB Reviewing project structure...                    │
│ 00:22 BE  Creating GET /api/users/stats...                  │
│ 00:26 FE  Built StatsCard component...                      │
└─────────────────────────────────────────────────────────────┘
```

| 영역 | 높이/비율 | 역할 |
|------|----------|------|
| **Top Bar** | 36px 고정 | 프로젝트 컨텍스트 + 프로그레스 + 경과시간 |
| **Constellation** | 나머지 ~65% 너비 | 에이전트 네트워크 시각화 (Canvas) |
| **Sidebar** | 나머지 ~35% 너비 | AGENTS + TASKS + 드릴다운 |
| **LIVE ACTIVITY** | 160px 고정 | 실시간 로그 + Room 토글 |

---

## 3. Top Bar

기존 MetricsHeader를 대체하는 심플 바.

```
┌─────────────────────────────────────────────────────────────┐
│ ◆ AGENT TEAM › e-commerce-platform › User Dashboard ████░░ 33% 04:38 │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | 위치 | 내용 |
|------|------|------|
| **◆ 아이콘** | 좌측 | amber accent dot |
| **브레드크럼** | 좌측 | `AGENT TEAM › {project.name} › {project.core_goal}` |
| **프로그레스 바** | 우측 | `done/total` 비율, amber 색상, 120px 너비 |
| **경과시간** | 우측 끝 | `MM:SS` 형식, 킥오프 시작 후 경과 |

- 높이: 36px
- 배경: `var(--th-bg-header)` + `backdropFilter: blur(12px)`
- 폰트: `var(--th-font-mono)`, 11px
- 브레드크럼: `color: var(--th-text-muted)`, `›` 구분자
- 프로그레스 바: `height: 3px`, `background: var(--th-accent)`, `borderRadius: 2px`

---

## 4. Constellation Graph (Canvas) — 사이버펑크

3.png의 핵심 비주얼을 충실히 재현. **Canvas 2D** 사용 (SVG 대신 — 매트릭스 애니메이션 성능).

### 4-1. 매트릭스 코드 레인 배경

```
배경 레이어: Canvas 전체에 세로로 떨어지는 코드 문자열
- 문자: 알파벳, 숫자, SQL 키워드 조각 (SELECT, INSERT, const, function...)
- 색상: rgba(34, 197, 94, 0.06) ~ rgba(34, 197, 94, 0.15)
- 폰트: var(--th-font-mono), 10~12px
- 속도: 각 컬럼 랜덤 (30~80px/s)
- 컬럼 수: canvas 너비 / 16 (약 16px 간격)
- 각 컬럼의 글자 수: 8~20개 (랜덤)
- 새 글자 생성: 상단에서 랜덤 간격으로
- 페이드: 아래로 갈수록 opacity 감소
- 성능: requestAnimationFrame, 30fps 제한
```

### 4-2. 노드 배치 — 비대칭 펜타곤

3.png을 보면 5개 에이전트가 **비대칭 오각형**으로 배치됨.
정확한 반원이 아닌, 자연스러운 분산 배치.

```
에이전트 수별 레이아웃:

1명:   중앙

2명:   좌측 · 우측

3명:   상단
      좌하 · 우하

4명:     상단
       좌 · 우
         하단

5명 (3.png 기준):
          [Manager]
         /    |    \
      [WebDev]·[Tester]
         \   |   /
      [Frontend]·[Backend]

6명+: 2행 배치 (상단 행, 하단 행), PM은 항상 상단 중앙
```

**PM 노드**: 항상 상단 중앙, **20% 더 큰 반지름**.

좌표 계산 — 사전 정의 배치 맵:
```typescript
// 5명 기준 (PM 제외 4명)
const LAYOUT_PRESETS: Record<number, Array<{x: number; y: number}>> = {
  1: [{ x: 0.5, y: 0.55 }],
  2: [{ x: 0.3, y: 0.55 }, { x: 0.7, y: 0.55 }],
  3: [{ x: 0.25, y: 0.45 }, { x: 0.75, y: 0.45 }, { x: 0.5, y: 0.75 }],
  4: [{ x: 0.2, y: 0.45 }, { x: 0.8, y: 0.45 }, { x: 0.3, y: 0.75 }, { x: 0.65, y: 0.75 }],
  5: [{ x: 0.18, y: 0.45 }, { x: 0.82, y: 0.45 }, { x: 0.5, y: 0.5 }, { x: 0.25, y: 0.78 }, { x: 0.7, y: 0.78 }],
};
// PM: 항상 { x: 0.5, y: 0.2 }
// 6명+: 2행 균등 분배
```

### 4-3. 노드 디자인 — 이중 원 + 네온 글로우

3.png의 각 노드를 정밀 재현:

```
┌─ 단일 노드 구조 ─────────────────────┐
│                                       │
│   ╭─ 외곽 링 (r=42) ──────────────╮  │
│   │  stroke: statusColor           │  │
│   │  strokeWidth: 2                │  │
│   │  glow: shadow 0 0 8px color   │  │
│   │                                │  │
│   │   ╭─ 내부 원 (r=34) ────────╮ │  │
│   │   │  fill: deptTint (반투명) │ │  │
│   │   │  stroke: var(--th-border)│ │  │
│   │   │                         │ │  │
│   │   │    ╭─ 아이콘 (20x20) ─╮│ │  │
│   │   │    │ filled, 컬러풀    ││ │  │
│   │   │    │ dept별 고유 색상  ││ │  │
│   │   │    ╰──────────────────╯│ │  │
│   │   ╰─────────────────────────╯ │  │
│   ╰────────────────────────────────╯  │
│                                       │
│   Name (bold, white)                  │
│   Role (muted, small)                 │
└───────────────────────────────────────┘
```

**PM 노드** (20% 확대):
- 외곽 링: r=50, 내부 원: r=42
- 아이콘: 24x24, amber 별 아이콘
- 글로우: `0 0 12px rgba(245,158,11,0.3)`

### 4-4. 에이전트별 고유 색상

3.png의 각 에이전트 노드 색상 재현:

| Agent Role / Dept | 아이콘 배경색 | 외곽 링 (idle) | 글로우 (working) |
|-------------------|-------------|---------------|-----------------|
| **Manager (PM)** | `#6366f1` (indigo) | `rgba(99,102,241,0.5)` | `0 0 12px rgba(99,102,241,0.4)` |
| **Dev** | `#eab308` (yellow) | `rgba(234,179,8,0.5)` | `0 0 12px rgba(234,179,8,0.4)` |
| **Design** | `#ec4899` (pink) | `rgba(236,72,153,0.5)` | `0 0 12px rgba(236,72,153,0.4)` |
| **QA** | `#22c55e` (green) | `rgba(34,197,94,0.5)` | `0 0 12px rgba(34,197,94,0.4)` |
| **DevSecOps** | `#ef4444` (red) | `rgba(239,68,68,0.5)` | `0 0 12px rgba(239,68,68,0.4)` |
| **Operations** | `#f97316` (orange) | `rgba(249,115,22,0.5)` | `0 0 12px rgba(249,115,22,0.4)` |
| **Planning** | `#06b6d4` (cyan) | `rgba(6,182,212,0.5)` | `0 0 12px rgba(6,182,212,0.4)` |

아이콘은 **filled 스타일** (stroke가 아닌 fill) — 3.png처럼 각 에이전트가 고유한 컬러 아이콘을 가짐.

### 4-5. 연결선 — 메쉬 토폴로지

3.png에서 에이전트 간 **모든 노드가 서로 연결**됨 (완전 그래프).
PM→팀원만이 아니라 팀원↔팀원도 연결.

```
연결선 규칙:
1. PM ↔ 모든 팀원: 항상 연결
2. 팀원 ↔ 팀원: 같은 프로젝트 내이면 연결
3. 연결선은 직선 (베지어 아님)
```

**연결선 스타일:**

| 상태 | stroke | width | opacity | dash |
|------|--------|-------|---------|------|
| **기본 (idle)** | `var(--th-border)` | 1 | 0.15 | `none` |
| **한쪽 working** | `var(--th-text-muted)` | 1 | 0.3 | `none` |
| **양쪽 working** | `var(--th-text-secondary)` | 1.5 | 0.5 | `none` |
| **선택된 노드 연결** | `var(--th-accent)` | 2 | 0.8 | `none` |

**교차점 허브 노드:**
3.png에서 연결선이 만나는 중앙에 작은 파란 점이 있음.
- 위치: 모든 연결선의 기하학적 중심 (centroid)
- 크기: r=3
- 색상: `rgba(59,130,246,0.6)` (blue)
- 글로우: `0 0 4px rgba(59,130,246,0.3)`

### 4-6. 애니메이션

모든 애니메이션은 Canvas `requestAnimationFrame` 루프에서 처리.

| 요소 | 애니메이션 | 주기 | 조건 |
|------|-----------|------|------|
| **매트릭스 코드 레인** | 글자 낙하 + 페이드 | 연속 (30fps) | 항상 |
| **Working 노드 글로우** | opacity 1→0.4→1 pulse | 2s ease-in-out | `status === "working"` |
| **PM 노드 글로우** | opacity 1→0.6→1 slow pulse | 3s ease-in-out | PM reviewing |
| **진행률 링** | arc length 증가 | 실시간 | 태스크 진행 중 |
| **연결선 데이터 흐름** | 작은 점이 연결선 위를 이동 | 3s linear | working 에이전트 연결선 |
| **노드 선택** | scale 1→1.06→1 | 300ms ease-out | 클릭 시 |
| **허브 점** | opacity 0.4→0.8→0.4 | 4s ease-in-out | 항상 |

**데이터 흐름 애니메이션** (3.png의 연결선 위 작은 점들):
```
working 에이전트의 연결선 위를 작은 빛 점(r=2)이 이동
- PM→agent 방향: PM이 모니터링 중임을 표현
- 속도: 3초에 한 번 왕복
- 색상: 해당 에이전트의 accent color, opacity 0.6
- 한 연결선에 1~2개 점
```

### 4-7. 인터랙션

| 동작 | 효과 |
|------|------|
| **노드 호버** | 글로우 강화 (opacity +0.3), 연결선 밝아짐, 커서 pointer |
| **노드 클릭** | 사이드바가 해당 에이전트 상세로 전환, 노드에 accent 링 추가 |
| **노드 더블클릭** | LIVE ACTIVITY를 해당 에이전트 로그로 필터 |
| **빈 영역 클릭** | 사이드바 기본 뷰(AGENTS+TASKS)로 복귀 |
| **Esc** | 선택 해제, 사이드바 기본 뷰 복귀 |
| **기본 선택** | 진입 시 선택 없음 (전체 뷰) |

### 4-8. Canvas 성능 규칙

```
1. requestAnimationFrame 사용, 30fps 제한
2. 매트릭스 배경은 별도 offscreen canvas에 렌더 → 메인에 drawImage
3. 노드/연결선은 위치 변경 시에만 다시 계산 (agents 배열 변경)
4. 글로우 효과: CSS filter 대신 canvas shadowBlur 사용
5. 마우스 이벤트: hit-test는 노드 좌표 배열로 계산 (canvas event)
6. React state 변경 시 canvas 리드로우 트리거 (useEffect)
7. ResizeObserver로 canvas 크기 자동 조정
```

---

## 5. Sidebar (우측 ~35%)

### 5-1. 기본 뷰 — AGENTS + TASKS

에이전트 미선택 시 표시.

```
┌──────────────────────────┐
│ AGENTS              [5]  │
├──────────────────────────┤
│ ┌──┐ Manager    ●Monitor │  ← 컬러 아이콘 + 이름 + 상태 dot + 상태
│ ├──┤                      │
│ │◆ │ WebDev     ●Typing  │  ← ◆ = 에이전트 고유 색상 아이콘 배경
│ ├──┤                      │
│ │◆ │ Frontend   ●Coding  │
│ ├──┤                      │
│ │◆ │ Backend    ●Coding  │
│ ├──┤                      │
│ │◆ │ Tester     ○Waiting │  ← ○ = idle (회색)
│ └──┘                      │
├──────────────────────────┤
│ TASKS             [2/6]  │
├──────────────────────────┤
│ ✅ Project scaffolding WEB│  ← 완료: 취소선 + 담당 태그
│ ✅ Define API schema  WEB│
│ ⬜ Build Dashboard UI  FE│  ← 진행중: 굵은 텍스트
│ ⬜ User API endpoints  BE│
│ ⬜ Integration tests   QA│  ← 미시작: 흐린 텍스트
│ ⬜ E2E test suite      QA│
└──────────────────────────┘
```

**AGENTS 섹션:**
- 각 행 높이: 40px
- 좌측: 에이전트 고유 색상 아이콘 (24x24, borderRadius: 6)
- 중앙: 이름 (12px, bold)
- 우측: 상태 dot (8px) + 상태 텍스트 (10px)
- 상태 dot 색상: working=green, idle=gray, error=red
- 호버: 배경 `var(--th-bg-surface-hover)`
- 클릭: Constellation에서 해당 노드 선택 + 사이드바 상세 전환

**TASKS 섹션:**
- 각 행 높이: 32px
- 좌측: 체크박스 아이콘 (done=green filled, in_progress=blue, planned=empty)
- 중앙: 태스크 제목 (11px), done이면 `text-decoration: line-through` + muted
- 우측: 담당 태그 (9px, uppercase, 색상 코딩)
- 담당 태그 색상: 해당 에이전트의 고유 accent 색상 배경
- 클릭: 사이드바가 태스크 상세로 전환

**섹션 헤더:**
- `fontSize: 10`, `fontWeight: 800`, `letterSpacing: 0.15em`, `textTransform: uppercase`
- `color: var(--th-text-muted)`
- 우측 뱃지: `[N]` 또는 `[N/M]`, `borderRadius: 10`, 작은 pill

### 5-2. 에이전트 드릴다운

에이전트 노드 클릭 시 사이드바 전환.

```
┌──────────────────────────┐
│ ← Back                   │  ← 클릭 시 기본 뷰 복귀
├──────────────────────────┤
│ ● Frontend               │
│ Senior · Design           │
│ Status: Coding            │
├──────────────────────────┤
│ CURRENT TASK              │
│ "Build Dashboard UI"      │
│ ████████░░░░ 62%          │
├──────────────────────────┤
│ PERFORMANCE               │
│ Overall  ████████░░  87%  │
│ frontend █████████░  92%  │
│ refactor ██████░░░░  65%  │
│                           │
│ 완료: 8건  실패: 1건       │
├──────────────────────────┤
│ TOKENS                    │
│ 12.3K                     │
├──────────────────────────┤
│ ACTIONS                   │
│ [로그] [일시정지] [중지]    │
│ [재배정 ▾]                 │
└──────────────────────────┘
```

- `← Back` 버튼: 상단, `fontSize: 10`, `color: var(--th-text-muted)`, 클릭 시 기본 뷰
- 전환 애니메이션: `translateX(100% → 0)`, 200ms ease-out

### 5-3. PM 드릴다운

```
┌──────────────────────────┐
│ ← Back                   │
├──────────────────────────┤
│ ◆ Manager                │
│ PM · Planning             │
│ Status: Monitoring        │
├──────────────────────────┤
│ PIPELINE STAGE            │
│ ● Meeting                 │
│ ● Planning                │
│ ◉ Executing  ← 현재       │
│ ○ Review                  │
├──────────────────────────┤
│ OVERSIGHT                 │
│ 검토 완료    5건           │
│ 승인률       92%          │
│ 검토 중      1건           │
│ 실패         0건           │
├──────────────────────────┤
│ TEAM STATUS               │
│ Working  ●●●○○  3/5      │
│ Idle     ○○●●●  2/5      │
├──────────────────────────┤
│ [로그 보기]                │
└──────────────────────────┘
```

**PIPELINE STAGE**: 기존 StageRail의 정보를 PM 드릴다운에 통합.
- `●` = 완료, `◉` = 현재, `○` = 대기
- 현재 단계에 accent 색상

### 5-4. 태스크 드릴다운

태스크 항목 클릭 시:

```
┌──────────────────────────┐
│ ← Back                   │
├──────────────────────────┤
│ Build Dashboard UI        │
│ Status: in_progress       │
│ Agent: Frontend           │
│ ████████░░░░ 62%          │
├──────────────────────────┤
│ EXECUTION EVENTS          │
│ 00:18 workspace_preparing │
│ 00:19 running             │
│ 00:22 file: Dashboard.tsx │
│ 00:25 file: StatsCard.tsx │
├──────────────────────────┤
│ CHANGED FILES          [4]│
│ src/Dashboard.tsx          │
│ src/StatsCard.tsx          │
│ src/types/user.ts          │
│ src/api/stats.ts           │
└──────────────────────────┘
```

---

## 6. LIVE ACTIVITY + Room (하단 패널)

### 6-1. LIVE ACTIVITY (기본)

높이 160px, 실시간 로그 스트림.

```
┌─────────────────────────────────────────────────────────────┐
│ LIVE ACTIVITY                                        [Room]│
├─────────────────────────────────────────────────────────────┤
│ 00:14  WEB  Reviewing project structure. Proposing shared  │
│             types in src/types/user.ts                     │
│ 00:18  FE   Scaffolding Dashboard.tsx with responsive      │
│             grid layout.                                   │
│ 00:22  BE   Creating GET /api/users/stats endpoint with    │
│             aggregation.                                   │
│ 00:26  FE   Built StatsCard component — active users,      │
│             revenue, growth metrics.                       │
│ 00:30  WEB  Defined shared interface DashboardStats        │
│             for FE/BE contract.                            │
│ 00:34  BE   Added user model fields: last_active, role,    │
│             plan_tier.                                     │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| **타임스탬프** | `fontSize: 11`, `color: var(--th-text-muted)`, `fontWeight: 600`, 고정 너비 40px |
| **에이전트 태그** | `fontSize: 9`, `fontWeight: 800`, 에이전트 고유 accent 색상 배경, `borderRadius: 3`, `padding: 1px 6px` |
| **메시지** | `fontSize: 11`, `color: var(--th-text-secondary)`, 코드 참조는 `var(--th-text-code)` 색상 |
| **배경** | `var(--th-bg-primary)` |
| **스크롤** | auto-scroll to bottom, 수동 스크롤 시 auto-scroll 일시 중지 |

**데이터 소스**: 기존 LogsTab의 `classifyLogs` + 실행 이벤트를 시간순 통합.
에이전트별 필터: Constellation 노드 더블클릭 시 해당 에이전트만 필터링.

### 6-2. Room (토글 확장)

`[Room]` 버튼 클릭 시 LIVE ACTIVITY 영역이 Room 채팅으로 전환.

```
┌─────────────────────────────────────────────────────────────┐
│ ROOM                                          [Activity ▼] │
├─────────────────────────────────────────────────────────────┤
│ PM  태스크 3건 생성, 배정을 시작합니다.          00:04       │
│ FE  Dashboard 컴포넌트 작업을 시작합니다.        00:18       │
│ PM  Frontend 에이전트의 코드리뷰 — APPROVE      00:32       │
│ BE  API 엔드포인트 구현 완료. 리뷰 요청합니다.   00:35       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ directive 입력...                              [Send]  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- 같은 160px 높이 영역을 공유 (Activity ↔ Room 토글)
- Room에는 directive 입력 필드 포함
- PM clarification 도착 시 자동으로 Room 전환 + 알림

**자동 Room 팝업:**
```
PM clarification 도착
  → LIVE ACTIVITY 영역이 자동으로 Room으로 전환
  → 질문이 하이라이트로 표시
  → 답변 입력 필드에 포커스
  → 답변 후 자동으로 Activity로 복귀
```

---

## 7. 데이터 흐름

```
OrchestrationWindow (리디자인)
  ├── stores: projectStore, taskStore, agentStore, uiStore
  │
  ├── <TopBar>
  │     props: project, tasks (done/total 계산)
  │
  ├── <ConstellationCanvas>
  │     props: agents, tasks, departments, pmAgentId
  │     state: selectedAgentId, hoveredAgentId
  │     callbacks: onSelectAgent, onDoubleClickAgent
  │     내부: Canvas 2D rendering loop (requestAnimationFrame)
  │
  ├── <Sidebar>
  │     props: agents, tasks, departments, perfMap, agentTokenMap
  │     state: drilldownType ("none" | "agent" | "task" | "pm")
  │     state: drilldownTargetId
  │     synced with: ConstellationCanvas.selectedAgentId
  │
  └── <LiveActivityPanel>
        props: tasks, agents, projectId
        state: mode ("activity" | "room")
        state: filterAgentId (에이전트 더블클릭 시)
        auto-switch: pendingClarification → room 모드
```

**기존 로직 보존:**
- `perfMap` fetch + debounce → Sidebar 에이전트 드릴다운에서 사용
- `agentTokenMap` from `runtimeStatuses` → Sidebar 토큰 표시
- 모든 action handlers (stop, pause, resume, reassign) → Sidebar ACTIONS
- `kickoffStage` → PM 드릴다운 PIPELINE STAGE에서 사용
- `pendingClarification` → Room 자동 전환 트리거
- `projectCostSummary` → TopBar 또는 Sidebar에서 접근

---

## 8. 컴포넌트 구조

```
src/components/orchestration/
├── OrchestrationWindow.tsx      ← 대폭 수정 (탭 로직 제거, 통합 뷰)
├── TopBar.tsx                   ← 신규 (MetricsHeader 대체, 심플)
├── ConstellationCanvas.tsx      ← 신규 (Canvas 2D 에이전트 그래프)
├── Sidebar.tsx                  ← 신규 (AGENTS + TASKS + 드릴다운)
├── LiveActivityPanel.tsx        ← 신규 (로그 + Room 토글)
├── task-progress.ts             ← 유지
├── MetricsHeader.tsx            ← 삭제 (TopBar로 대체)
├── StageRail.tsx                ← 삭제 (PM 드릴다운으로 대체)
├── TabBar.tsx                   ← 삭제
└── tabs/
    ├── TimelineTab.tsx          ← 삭제 (Sidebar TASKS + LiveActivity로 분산)
    ├── LogsTab.tsx              ← 삭제 (LiveActivityPanel로 대체)
    ├── AgentsTab.tsx            ← 삭제 (Constellation + Sidebar로 대체)
    └── RoomTab.tsx              ← 삭제 (LiveActivityPanel Room 모드로 대체)
```

| 파일 | 상태 | 예상 크기 |
|------|------|----------|
| OrchestrationWindow.tsx | 수정 | ~120L (기존 188L에서 탭 로직 제거) |
| TopBar.tsx | 신규 | ~60L |
| ConstellationCanvas.tsx | 신규 | ~350L (Canvas 렌더링 + 애니메이션) |
| Sidebar.tsx | 신규 | ~400L (기본뷰 + 3가지 드릴다운) |
| LiveActivityPanel.tsx | 신규 | ~300L (Activity + Room 통합) |
| task-progress.ts | 유지 | 39L |
| **총합** | | ~1,270L (기존 3,881L → 67% 감소) |

---

## 9. 마이그레이션 전략

| 단계 | 작업 | 위험도 |
|------|------|--------|
| 1 | TopBar 생성, MetricsHeader 교체 | 낮음 |
| 2 | ConstellationCanvas 생성 (매트릭스 배경 + 노드 + 연결선) | 중간 |
| 3 | Sidebar 생성 (기본뷰: AGENTS + TASKS) | 낮음 |
| 4 | LiveActivityPanel 생성 (Activity + Room 토글) | 중간 |
| 5 | OrchestrationWindow 통합 (TabBar/StageRail 제거, 새 컴포넌트 조립) | 높음 |
| 6 | 기존 tabs/ 파일 삭제, 미사용 import 정리 | 낮음 |
| 7 | 애니메이션 튜닝 (매트릭스, 글로우, 데이터 흐름) | 낮음 |

> 각 단계마다 `tsc -b --noEmit` + `pnpm test` 통과 필수.

---

## 10. 접근성

| 항목 | 구현 |
|------|------|
| **키보드** | Tab: 노드 순회, Enter: 선택, Esc: 해제, `←`: Back |
| **ARIA** | Canvas: `role="img"`, `aria-label="Agent network"`, 사이드바: 표준 HTML |
| **스크린리더** | Canvas 위에 숨겨진 `<ul>` 에이전트 목록 (sr-only) |
| **모션 감소** | `prefers-reduced-motion`: 매트릭스 정지, 글로우 고정, 데이터 흐름 정지 |

---

## 11. 제외 사항 — "No라고 말하기"

| 제외 | 이유 |
|------|------|
| 드래그로 노드 위치 변경 | 고정 배치가 일관성 있고 사용자가 위치를 기억함 |
| 줌/팬 | 에이전트 수가 충분히 적어 불필요 (최대 8~10명) |
| 3D 효과 | 복잡도 대비 가치 없음, 2D Canvas로 충분 |
| 탭 유지 옵션 | "익숙함"은 좋은 UX의 이유가 아님 |
| CHANGED FILES 섹션 | CliWindow에서 이미 제공 |
| TERMINAL 섹션 | CliWindow에서 이미 제공 |

---

## Appendix: 기존 파일 → 새 파일 매핑

기존 탭의 기능이 어디로 이동하는지:

| 기존 기능 | 기존 위치 | 새 위치 |
|-----------|----------|---------|
| 에이전트 상태/성과 | AgentsTab | Constellation + Sidebar 드릴다운 |
| PM 카드 | AgentsTab PmAgentCard | Sidebar PM 드릴다운 |
| 에이전트 액션 (정지/재배정) | AgentsTab ActionMenu | Sidebar ACTIONS |
| 태스크 타임라인 | TimelineTab AgentLane | Sidebar TASKS |
| 태스크 상세/이벤트 | TimelineTab (expand) | Sidebar 태스크 드릴다운 |
| 클러스터 상태 | TimelineTab clusterStatus | TopBar 프로그레스 |
| 로그 필터링/검색 | LogsTab | LiveActivityPanel (간소화) |
| 에이전트별 로그 | LogsTab sidebar | Constellation 더블클릭 필터 |
| 팀 채팅 | RoomTab chat feed | LiveActivityPanel Room 모드 |
| PM 이벤트 | RoomTab pm events | LiveActivityPanel Room 모드 |
| Clarification | RoomTab clarification | Room 자동 팝업 |
| Directive 입력 | RoomTab directive | Room 입력 필드 |
| 파이프라인 단계 | StageRail | Sidebar PM 드릴다운 PIPELINE STAGE |
| 토큰/비용 | MetricsHeader | TopBar 또는 Sidebar 드릴다운 |
