# AgentsTab Redesign — Constellation View

> **Status:** Design Draft
> **Date:** 2026-03-29
> **Reference:** `docs/design/3.png` (Agent Orchestration Dashboard concept)
> **Target file:** `src/components/orchestration/tabs/AgentsTab.tsx`
> **Design system:** `docs/design/DESIGN.md` (CSS variables, dual-layer principle)

---

## 1. Problem Statement

현재 AgentsTab은 **7컬럼 테이블 그리드**로 에이전트를 나열한다.
정보량은 충분하지만, 에이전트 간 **관계**와 **협업 흐름**이 보이지 않는다.

| 현재 | 문제 |
|------|------|
| 플랫 테이블 | 에이전트 간 의존/협업 관계 파악 불가 |
| PM 카드 분리 | PM과 팀원 간의 오케스트레이션 구조가 시각적으로 단절 |
| 텍스트 위주 상태 | "working" 글자보다 시각적 피드백이 약함 |
| fitness 수치 나열 | 에이전트별 강점/약점을 직관적으로 비교 어려움 |

**목표:** 에이전트 네트워크를 시각적으로 표현하되, 기존 상세 정보와 조작 기능을 보존한다.

---

## 2. Layout — Split Panel

```
┌─────────────────────────────────────────────────────────┐
│ AgentsTab                                               │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   Constellation Graph    │     Agent Detail Panel       │
│        (SVG)             │                              │
│                          │  ┌────────────────────────┐  │
│        ┌───┐             │  │ Header: name + status  │  │
│       [PM ]              │  ├────────────────────────┤  │
│      / | \ \             │  │ Current Task + progress│  │
│    /   |   \ \           │  ├────────────────────────┤  │
│  [WEB][FE][BE][QA]       │  │ Fitness by task_type   │  │
│                          │  ├────────────────────────┤  │
│                          │  │ Actions (pause/stop/   │  │
│                          │  │  reassign/view logs)   │  │
│                          │  └────────────────────────┘  │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│ Summary Bar: 활성 3/5 · 완료 12건 · 성공률 87%          │
└─────────────────────────────────────────────────────────┘
```

| 영역 | 비율 | 역할 |
|------|------|------|
| **Constellation Graph** | 좌측 55% | 에이전트 노드 네트워크 (SVG) |
| **Detail Panel** | 우측 45% | 선택된 에이전트 상세 정보 + 액션 |
| **Summary Bar** | 하단 36px | 전체 팀 요약 메트릭 (기존 MetricBar 대체) |

**반응형:** 탭 영역 너비 < 640px → Detail Panel이 하단으로 이동 (세로 스택)

---

## 3. Constellation Graph (좌측 패널)

### 3-1. 노드 배치 — PM 중심 방사형

PM을 중앙 상단에 배치하고, 팀원 에이전트를 아래쪽 반원에 방사형으로 배치한다.
Force-directed가 아닌 **고정 좌표 계산** (에이전트 수에 따라 각도 분배).

```
에이전트 수별 배치:

2명:   [PM]          3명:    [PM]         4명:     [PM]
      /    \               / | \              / |  | \
    [A1]  [A2]          [A1][A2][A3]       [A1][A2][A3][A4]

5명 이상: 반원(180°) 균등 분배, PM은 중앙 상단 고정
```

**좌표 계산:**
```
PM: (cx, cy - radius * 0.6)
Agent[i]: (
  cx + radius * cos(π + i * π / (n-1)),
  cy + radius * 0.3 + radius * sin(π + i * π / (n-1)) * 0.5
)
```
- `cx, cy` = SVG viewBox 중앙
- `radius` = viewBox 크기의 35%
- `n` = 팀원 수 (PM 제외)

### 3-2. 노드 디자인

각 노드는 **이중 원 + 아이콘 + 라벨**로 구성.

```svg
<!-- 단일 에이전트 노드 구조 -->
<g transform="translate(x, y)">
  <!-- 외곽 링: 상태 표시 -->
  <circle r="38" fill="none" stroke="{statusColor}" stroke-width="2"
          stroke-dasharray="{활성시 none, 대기시 4 4}"
          opacity="{활성 1.0, 대기 0.4}" />

  <!-- 진행률 링 (현재 태스크 있을 때만) -->
  <circle r="38" fill="none" stroke="{statusColor}" stroke-width="3"
          stroke-dasharray="{progress * circumference} {circumference}"
          transform="rotate(-90)" opacity="0.8" />

  <!-- 배경 원 -->
  <circle r="32" fill="var(--th-bg-surface)" stroke="var(--th-border)" stroke-width="1" />

  <!-- 전문 분야 아이콘 (SVG, 16x16) -->
  <svg x="-8" y="-12" width="16" height="16">...</svg>

  <!-- 이름 라벨 -->
  <text y="28" text-anchor="middle" fill="var(--th-text-primary)"
        font-size="10" font-weight="700">{agent.name}</text>

  <!-- 역할 서브라벨 -->
  <text y="40" text-anchor="middle" fill="var(--th-text-muted)"
        font-size="8">{department.name}</text>
</g>
```

### 3-3. 노드 상태 색상

| 상태 | 외곽 링 색상 | 링 스타일 | 라벨 표시 |
|------|-------------|-----------|-----------|
| **working** (실행 중) | `#22c55e` (green) | solid + pulse animation | `Coding` / `Reviewing` 등 |
| **idle** (대기) | `var(--th-text-muted)` | dashed `4 4` | `Waiting` |
| **error** | `#ef4444` (red) | solid | `Error` |
| **PM monitoring** | `var(--th-accent)` (amber) | solid + slow pulse | `Monitoring` |

**Pulse 애니메이션** (working 상태):
```css
@keyframes node-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
/* 주기: 2s, ease-in-out */
```

### 3-4. 연결선 (Edges)

모든 팀원 노드는 PM 노드에 연결된다 (PM 오케스트레이션 구조 표현).

```svg
<line x1="{pm.x}" y1="{pm.y}" x2="{agent.x}" y2="{agent.y}"
      stroke="var(--th-border)" stroke-width="1" opacity="0.3" />
```

**활성 연결 강조:** 에이전트가 working 상태이면 해당 연결선을:
- `stroke` → `var(--th-text-muted)`
- `opacity` → `0.6`
- `stroke-width` → `1.5`

**선택 시:** 클릭된 에이전트 ↔ PM 연결선:
- `stroke` → `var(--th-accent)`
- `opacity` → `1`
- `stroke-width` → `2`

### 3-5. 인터랙션

| 동작 | 효과 |
|------|------|
| **호버** | 노드 외곽 링 밝아짐 (`opacity: 1`), 커서 pointer |
| **클릭** | 우측 Detail Panel에 해당 에이전트 정보 표시, 노드에 accent 링 추가 |
| **더블클릭** | `onSwitchToLogs(agentId)` — 로그 탭으로 전환 |
| **기본 선택** | 탭 진입 시 PM 노드 자동 선택 (PM이 없으면 첫 번째 에이전트) |

---

## 4. Detail Panel (우측 패널)

기존 테이블 행의 7컬럼 정보를 **세로 카드 레이아웃**으로 재배치.
선택된 에이전트가 없으면 팀 전체 요약을 표시한다.

### 4-1. 에이전트 선택 시 — Agent Detail

```
┌──────────────────────────────┐
│  ● Frontend                  │  ← 상태 dot + 이름
│  Senior · Design 전문 분야     │  ← 역할 + 부서
│  Status: Coding              │  ← 현재 상태 텍스트
├──────────────────────────────┤
│  CURRENT TASK                │
│  "Build Dashboard UI"        │
│  ████████░░░░ 62%            │  ← 진행률 바
│  elapsed: 4m 32s             │
├──────────────────────────────┤
│  PERFORMANCE                 │
│                              │
│  Overall   ████████░░  87%   │
│  frontend  █████████░  92%   │  ← fitness_by_type
│  refactor  ██████░░░░  65%   │
│  test      ███████░░░  78%   │
│                              │
│  완료: 8건  실패: 1건         │
│  평균 소요: 6m 12s            │
├──────────────────────────────┤
│  TOKENS                      │
│  12.3K (input: 8.1K + output: 4.2K) │
├──────────────────────────────┤
│  ACTIONS                     │
│  [View Logs] [Pause] [Stop]  │
│  [Reassign ▾]                │
└──────────────────────────────┘
```

### 4-2. PM 선택 시 — PM Detail

```
┌──────────────────────────────┐
│  ◆ Manager                   │  ← accent dot + 이름
│  PM · Planning 전문 분야       │
│  Status: Monitoring          │
├──────────────────────────────┤
│  OVERSIGHT                   │
│                              │
│  검토 완료     5건            │
│  승인률        92%           │
│  현재 검토 중   1건            │
│  실패 처리     0건            │
├──────────────────────────────┤
│  TEAM STATUS                 │
│                              │
│  Working   ●●●○○    3/5     │  ← 시각적 dot 표시
│  Idle      ○○●●●    2/5     │
│  Error     ○○○○○    0/5     │
├──────────────────────────────┤
│  [View Logs]                 │
└──────────────────────────────┘
```

### 4-3. 미선택 시 — Team Overview

```
┌──────────────────────────────┐
│  TEAM OVERVIEW               │
│                              │
│  에이전트를 클릭하여           │
│  상세 정보를 확인하세요         │
│                              │
│  ─────────────────────────── │
│                              │
│  활성 에이전트    3 / 5       │
│  태스크 완료     12건         │
│  전체 성공률     87%          │
│  총 토큰 사용    45.2K        │
└──────────────────────────────┘
```

---

## 5. Summary Bar (하단)

기존 `MetricBar` 2개를 **가로 1줄 요약**으로 압축.

```
┌─────────────────────────────────────────────────────────┐
│  ● 활성 3/5    ◆ 완료 12건    ◇ 성공률 87%    ◈ 45.2K tokens │
└─────────────────────────────────────────────────────────┘
```

- 높이: 36px
- 배경: `var(--th-bg-surface)`
- 테두리: `1px solid var(--th-border)`, `borderRadius: 0 0 12px 12px`
- 글자: `fontSize: 10`, `fontWeight: 700`, `color: var(--th-text-secondary)`
- 각 메트릭 사이: `gap: 24px`, flex center

---

## 6. 전문 분야별 노드 아이콘

각 department에 대응하는 SVG 아이콘 (16x16, stroke="currentColor").

| Department | 아이콘 | 설명 |
|-----------|--------|------|
| **planning** | clipboard-list | 기획/전략 |
| **dev** | code-2 | 개발 (코드 브라켓) |
| **design** | pen-tool | 디자인 (펜) |
| **qa** | check-square | 테스트 (체크) |
| **devsecops** | shield | 보안 (방패) |
| **operations** | settings (gear) | 운영 (톱니) |

PM 노드는 department 아이콘 대신 **crown** 또는 **star** 아이콘 사용.

---

## 7. 색상 팔레트 — 노드 accent

에이전트 노드 배경에 미세한 tint를 주어 department를 구분한다.
3.png 레퍼런스의 각 에이전트별 색상 참고.

| Department | Tint (배경 원 안쪽) | 외곽 링 (idle 시) |
|-----------|-------------------|------------------|
| planning | `rgba(245,158,11,0.08)` | `rgba(245,158,11,0.3)` |
| dev | `rgba(59,130,246,0.08)` | `rgba(59,130,246,0.3)` |
| design | `rgba(168,85,247,0.08)` | `rgba(168,85,247,0.3)` |
| qa | `rgba(34,197,94,0.08)` | `rgba(34,197,94,0.3)` |
| devsecops | `rgba(239,68,68,0.08)` | `rgba(239,68,68,0.3)` |
| operations | `rgba(107,114,128,0.08)` | `rgba(107,114,128,0.3)` |

> **Working 상태**에서는 tint 대신 `statusColor`(green)가 우선한다.

---

## 8. 애니메이션

| 요소 | 애니메이션 | 조건 |
|------|-----------|------|
| **Working 노드 링** | pulse (opacity 1→0.5→1, 2s) | `status === "working"` |
| **PM 노드 링** | slow-pulse (opacity 1→0.7→1, 3s) | PM이 review 중일 때 |
| **Progress 링** | stroke-dasharray transition (0.5s ease) | 태스크 진행률 변경 시 |
| **Detail Panel 전환** | opacity 0→1, translateY(8→0), 200ms ease-out | 에이전트 선택 변경 시 |
| **노드 선택** | scale 1→1.08→1, 300ms | 클릭 시 bounce |
| **연결선 활성** | opacity transition 0.3s | 에이전트 상태 변경 시 |

> **성능 규칙:** `transform`과 `opacity`만 애니메이션. `width/height/top/left` 절대 금지.

---

## 9. 데이터 흐름

```
OrchestrationWindow
  ├── agents: Agent[]
  ├── tasks: Task[]
  ├── departments: Department[]
  ├── pmAgentId: string
  └── onSwitchToLogs: (agentId) => void
        │
        ▼
AgentsTab (리디자인)
  ├── state: selectedAgentId (로컬 useState)
  ├── state: perfMap (API fetch, 기존 로직 유지)
  ├── computed: agentTokenMap (runtimeStatuses, 기존 로직 유지)
  │
  ├── <ConstellationGraph>
  │     props: agents, tasks, departments, pmAgentId,
  │            selectedAgentId, onSelectAgent
  │     역할: SVG 노드 렌더링 + 클릭 이벤트
  │
  ├── <AgentDetailPanel>
  │     props: agent, tasks, department, perfEntry,
  │            tokens, onViewLogs, onPause, onStop,
  │            onReassign, reassignTargets
  │     역할: 선택된 에이전트 상세 + 액션 버튼
  │
  └── <SummaryBar>
        props: agents, perfMap, agentTokenMap
        역할: 하단 요약 메트릭
```

**기존 로직 100% 보존:**
- `perfMap` fetch + debounce (3s)
- `agentTokenMap` from `runtimeStatuses`
- action handlers: stop, pause, resume, reassign, viewLogs
- sorting은 제거 (constellation에서는 불필요)

---

## 10. 컴포넌트 구조

```
AgentsTab.tsx (기존 파일 수정)
├── ConstellationGraph  (인라인 — 별도 파일 불필요, ~120 lines)
├── AgentDetailPanel    (인라인 — 기존 행 렌더링 로직 재활용)
└── SummaryBar          (인라인 — 기존 MetricBar 대체)
```

> **0-4 규칙 준수:** 새 파일 생성하지 않음.
> 기존 `AgentsTab.tsx` 내에서 서브 컴포넌트로 분리.

---

## 11. 접근성

| 항목 | 구현 |
|------|------|
| **키보드 탐색** | Tab키로 노드 간 이동, Enter로 선택, Escape로 선택 해제 |
| **ARIA** | 각 노드: `role="button"`, `aria-label="{name}, {status}"`, `aria-pressed` |
| **색상 대비** | 상태 색상은 보조 표시 — 텍스트 라벨로 상태 중복 표시 |
| **포커스 링** | `outline: 2px solid var(--th-accent)`, `outline-offset: 4px` |

---

## 12. 마이그레이션 전략

기존 AgentsTab.tsx를 **점진적으로 수정**한다.

| 단계 | 변경 | 위험도 |
|------|------|--------|
| 1 | Summary Bar 추가, 기존 MetricBar 교체 | 낮음 |
| 2 | ConstellationGraph 추가 (좌측), 기존 테이블을 Detail Panel로 재배치 (우측) | 중간 |
| 3 | Detail Panel 내용을 카드 레이아웃으로 리팩터 | 낮음 |
| 4 | 애니메이션 + 인터랙션 추가 | 낮음 |

> 각 단계마다 `tsc -b --noEmit` + `pnpm test` 통과 필수.

---

## 13. 제외 사항

이 리디자인에서 **포함하지 않는 것**:

- 매트릭스 코드 레인 배경 (3.png의 장식 요소 — 성능 비용 대비 가치 낮음)
- 에이전트 간 팀원↔팀원 연결선 (현재 데이터에 에이전트 간 의존관계 없음, PM↔팀원만)
- 드래그로 노드 위치 변경 (고정 배치가 일관성 있음)
- Canvas 렌더링 (SVG가 React 친화적이고 접근성 우수)

---

## Appendix: 레퍼런스 이미지 분석 (3.png)

| 요소 | 채택 여부 | 이유 |
|------|-----------|------|
| Agent 네트워크 그래프 | **채택** | 핵심 시각 요소 |
| 에이전트 상태 색상 링 | **채택** | 직관적 상태 표시 |
| 우측 AGENTS 사이드바 | **변형 채택** → Detail Panel | 리스트 대신 선택된 1명 상세 |
| 우측 TASKS 체크리스트 | **미채택** | TimelineTab에서 이미 제공 |
| 하단 LIVE ACTIVITY | **미채택** | LogsTab에서 이미 제공 |
| CHANGED FILES / TERMINAL | **미채택** | 별도 창(CliWindow)에서 제공 |
| 매트릭스 배경 | **미채택** | 장식 요소, 성능 비용 |
| 프로그레스 바 (상단) | **변형 채택** → Summary Bar | MetricsHeader에서 이미 제공, 하단 요약으로 축소 |
