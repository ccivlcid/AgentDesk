# Agent Flow Graph — Custom SVG 구현 레퍼런스

> **상태:** ✅ 구현 완료 (2026-03-14, P2-1)
> **방식:** 외부 라이브러리 없이 Custom SVG + React로 구현
> **갱신일:** 2026-03-14

---

## 0. 구현 완료 현황

### 파일 위치

| 파일 | 역할 |
|---|---|
| `src/components/flow-graph/AgentFlowGraph.tsx` | 메인 컴포넌트 (필터, SVG 캔버스, 컨트롤) |
| `src/components/flow-graph/useFlowLayout.ts` | 레이아웃 알고리즘 (좌표 계산, 엣지 경로) |
| `src/components/flow-graph/useViewTransform.ts` | 줌·팬 인터랙션 (SVG transform) |
| `src/components/flow-graph/nodes/AgentNode.tsx` | 에이전트 노드 (foreignObject 기반) |
| `src/components/flow-graph/nodes/MeetingCluster.tsx` | 미팅 클러스터 원형 배경 |
| `src/components/flow-graph/edges/FlowEdge.tsx` | 베지어 곡선 엣지 |
| `src/components/flow-graph/constants.ts` | NODE_WIDTH, NODE_HEIGHT, NODE_GAP 등 |

### 사이드바 통합 완료

- `src/app/types.ts` — `View` 타입에 `"flow-graph"` 포함
- `src/components/Sidebar.tsx` — 에이전트 섹션 하위에 등록
- `src/app/AppMainLayout.tsx` — lazy import, `{view === "flow-graph"}` 렌더링

---

## 0-구. 타입 파일 위치 (참조용)

### 실제 타입 파일 위치

| 타입 | 파일 | 주요 필드 |
|---|---|---|
| `Agent` | `src/types/index.ts` | `id, name, status, avatar_emoji, department_id` |
| `Department` | `src/types/index.ts` | `id, name, color` |
| `Task` | `src/types/index.ts` | `id, title, status, assigned_agent_id, project_id` |
| `SubAgent` | `src/types/index.ts` (~line 65) | `id, parentAgentId, task, status` |
| `MeetingPresence` | `src/types/index.ts` (~line 56) | `agent_id, phase, task_id, until` |
| `CrossDeptDelivery` | `src/types/index.ts` (~line 72) | `id, fromAgentId, toAgentId` |

### AppMainLayout props 주의사항

현재 `src/app/AppMainLayout.tsx`에 **없는** props — 통합(Step 3) 시 직접 추가해야 함:

```typescript
// AppMainLayoutProps 인터페이스에 추가 필요
subAgents: SubAgent[];
crossDeptDeliveries: CrossDeptDelivery[];
meetingPresence: MeetingPresence[];
```

이 데이터는 `App.tsx`에서 Zustand `agentStore` / `taskStore`로 이미 관리됨:
- `subAgents` → `useAgentStore()` → `agentStore.ts`
- `crossDeptDeliveries`, `meetingPresence` → `useTaskStore()` → `taskStore.ts`

`App.tsx`의 `<AppMainLayout ... />` 호출부에도 props 전달 추가 필요.

### `projectAgentIds` 위치 주의

설계서 Step 3의 `projectAgentIds` prop은 **AppMainLayout 내부 상태**로 이미 관리 중:
```typescript
// src/app/AppMainLayout.tsx line ~227
const [projectAgentIds, setProjectAgentIds] = useState<Set<string>>(new Set());
```
외부에서 prop으로 받지 않고 내부에서 직접 사용 가능. `AgentFlowGraph`에 그대로 전달하면 됨.

---

---

## 1. 개요

**에이전트 간 실시간 관계**를 시각화하는 뷰.
프로젝트에 배정된 에이전트를 중심으로, 누가 누구에게 일을 위임하고, 누가 리뷰하고, 누가 미팅 중인지를 한눈에 보여준다.

### 핵심 차별점 — 태스크 보드와 겹치지 않는다

| | **태스크 보드 (TaskBoard)** | **플로우 그래프 (FlowGraph)** |
|---|---|---|
| **주인공** | 태스크 (카드) | 에이전트 (노드) |
| **축** | 상태별 컬럼 (inbox→done) | 에이전트 간 관계 |
| **보여주는 것** | "이 태스크가 지금 어떤 상태인가" | "이 에이전트가 지금 누구와 어떻게 일하는가" |
| **엣지** | 없음 (DAG 뷰에서만 의존성) | 위임, 서브에이전트, 크로스부서 전달, 미팅 |
| **시간축** | 없음 (칸반) / 있음 (간트) | 없음 — 현재 스냅샷 |

**Flow Graph가 보여주는 것:**
1. **위임 관계**: 에이전트 A가 에이전트 B에게 서브태스크를 위임한 연결선
2. **서브에이전트**: 부모 에이전트가 생성한 자식 에이전트 (Codex 스레드 등)
3. **크로스 부서 전달**: `CrossDeptDelivery` — 부서 간 작업물 전달 화살표
4. **미팅**: `MeetingPresence` — 현재 회의 참석 중인 에이전트 그룹
5. **실시간 상태**: 각 에이전트의 idle/working/break/offline + 현재 태스크

### 디자인 원칙

- **에이전트가 주인공**: 프로젝트에 선택된 에이전트가 노드, 부서는 보조 라벨일 뿐
- **macOS 하이브리드**: 노드 컨테이너는 `borderRadius: 10` + shadow, 내부 콘텐츠는 모노폰트
- **실시간**: 기존 WebSocket 인프라(`agent_status`, `task_update`, `subtask_update`, `cross_dept_delivery`) 활용
- **의존성 0**: SVG + React만 사용, 외부 그래프 라이브러리 없음

---

## 2. 파일 구조

```
src/components/flow-graph/
├── AgentFlowGraph.tsx          ← 메인 컴포넌트 (SVG 컨테이너 + 줌/팬)
├── useFlowLayout.ts            ← agents/relationships → 노드/엣지 좌표 계산
├── useViewTransform.ts         ← 줌/팬/드래그 상태 관리 훅
├── nodes/
│   ├── AgentNode.tsx           ← 에이전트 노드 렌더링 (foreignObject)
│   └── MeetingCluster.tsx      ← 미팅 중인 에이전트 그룹 표시
├── edges/
│   └── FlowEdge.tsx            ← 베지어 커브 엣지 렌더링
└── constants.ts                ← 레이아웃 상수 (노드 크기, 간격 등)
```

---

## 3. 레이아웃 알고리즘

### 3-1. 에이전트 중심 배치 (Force-Directed 유사)

부서별 컬럼이 **아니라**, 에이전트 간 관계를 기반으로 배치한다.

**배치 규칙:**
1. **프로젝트 팀 에이전트만** 노드로 표시 (전체 에이전트 X)
2. **연결이 많은 에이전트**가 중심에 위치 (관계 가중치 기반)
3. **미팅 참석자**는 임시로 클러스터링 (원형 배치)
4. **서브에이전트**는 부모 노드 아래에 작게 붙음
5. **부서 라벨**은 노드 옆에 작은 태그로만 표시

```
                 ┌──────────┐
                 │ PM-1     │ ◀── 기획
                 │ (meeting)│
                 └────┬─────┘
          delegate    │     review
        ┌─────────────┼──────────────┐
        ▼             │              ▼
  ┌──────────┐        │        ┌──────────┐
  │ Dev-1    │ ◀─ 개발 │        │ QA-1     │ ◀── QA
  │ (working)│        │        │ (idle)   │
  └────┬─────┘        │        └──────────┘
       │ subtask      │
       ▼              │
  ┌──────────┐        │
  │ Dev-2    │        │
  │ (working)│        │
  └──────────┘        │
```

### 3-2. 좌표 계산 (useFlowLayout)

```typescript
// constants.ts
const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const NODE_GAP = 40;            // 노드 간 최소 간격
const MEETING_RADIUS = 120;     // 미팅 클러스터 반경
const SUB_AGENT_OFFSET_Y = 20;  // 서브에이전트 Y 오프셋
const SUB_AGENT_SCALE = 0.7;    // 서브에이전트 축소 비율

// useFlowLayout.ts
interface FlowNode {
  id: string;
  type: "agent" | "sub-agent";
  x: number;
  y: number;
  width: number;
  height: number;
  agent: Agent;
  deptLabel: string;    // 부서 이름 (태그용)
  deptColor: string;    // 부서 색상
  inMeeting: boolean;   // 현재 미팅 중 여부
}

interface FlowEdge {
  id: string;
  from: { nodeId: string; x: number; y: number };
  to: { nodeId: string; x: number; y: number };
  type: "delegation" | "sub-agent" | "cross_dept" | "meeting";
  label?: string;
  animated?: boolean;   // working 상태일 때 활성 애니메이션
}

interface MeetingCluster {
  id: string;
  cx: number;           // 클러스터 중심 X
  cy: number;           // 클러스터 중심 Y
  radius: number;
  agentIds: string[];
  phase: "kickoff" | "review";
  taskId: string | null;
}
```

### 3-3. 배치 알고리즘 (단순 계층형)

외부 라이브러리 없이 구현 가능한 단순 계층형 배치:

```typescript
function layoutAgents(agents: Agent[], relationships: Relationship[]): FlowNode[] {
  // 1. 연결도(degree) 계산 — 위임/서브태스크/크로스부서 관계 수
  // 2. degree가 가장 높은 에이전트를 중심 행(row 0)에 배치
  // 3. 직접 연결된 에이전트를 다음 행에 배치
  // 4. 미연결 에이전트는 최하단에 배치
  // 5. 같은 행 내에서 X 좌표를 균등 분배
  // 6. 미팅 중인 에이전트는 별도 클러스터로 이동
}
```

### 3-4. 관계 데이터 추출

기존 데이터에서 에이전트 간 관계를 추출:

| 소스 데이터 | 엣지 타입 | 의미 |
|---|---|---|
| `SubTask` where `assigned_agent_id ≠ task's assigned_agent_id` | `delegation` | 에이전트 A → B로 서브태스크 위임 |
| `SubAgent.parentAgentId → SubAgent.id` | `sub-agent` | 부모가 자식 에이전트 생성 |
| `CrossDeptDelivery.fromAgentId → toAgentId` | `cross_dept` | 부서 간 작업물 전달 |
| `MeetingPresence` 같은 `task_id` + `phase` | `meeting` | 같은 회의 참석자 연결 |

---

## 4. SVG 컨테이너 (AgentFlowGraph.tsx)

### 4-1. 줌/팬 (useViewTransform)

```typescript
interface ViewTransform {
  x: number;      // 팬 오프셋 X
  y: number;      // 팬 오프셋 Y
  scale: number;  // 줌 레벨 (0.3 ~ 2.0)
}

// 마우스 휠 → 줌 (커서 위치 기준)
// 마우스 드래그 → 팬
// 더블클릭 → fit-to-view
```

SVG `<g>` 최상위에 `transform={`translate(${x}, ${y}) scale(${scale})`}` 적용.

### 4-2. 렌더 구조

```tsx
<div style={{ position: "relative", width: "100%", height: "100%" }}>
  {/* 컨트롤 오버레이 */}
  <FlowControls
    onZoomIn={...} onZoomOut={...} onFit={...}
    filter={filter} onFilterChange={...}
  />

  <svg
    ref={svgRef}
    width="100%"
    height="100%"
    style={{ background: "var(--th-bg-primary)" }}
    onWheel={handleWheel}
    onMouseDown={handlePanStart}
    onMouseMove={handlePanMove}
    onMouseUp={handlePanEnd}
  >
    <defs>{/* 화살표 마커 */}</defs>

    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      {/* 레이어 1: 미팅 클러스터 배경 (원형 영역) */}
      {meetings.map(m => <MeetingCluster key={m.id} {...m} />)}

      {/* 레이어 2: 엣지 */}
      {edges.map(e => <FlowEdge key={e.id} {...e} />)}

      {/* 레이어 3: 에이전트 노드 */}
      {nodes.map(n => <AgentNode key={n.id} {...n} onClick={onSelectAgent} />)}
    </g>
  </svg>
</div>
```

---

## 5. 노드 디자인

### 5-1. AgentNode (foreignObject 기반)

`<foreignObject>`를 사용해 SVG 내부에 HTML/CSS를 렌더링.
macOS 하이브리드 스타일(borderRadius, boxShadow)을 그대로 적용.

```
┌─────────────────────────┐  borderRadius: 10
│ 😎 Dev-1          개발   │  아바타 + 이름 + 부서 태그
│─────────────────────────│
│ ● working  ██████░░░░░  │  상태 dot + 로드바
│ 로그인 버그 수정         │  현재 태스크 (truncate)
└─────────────────────────┘
```

**부서는 작은 태그로만 표시** (노드 우상단, 부서 color 배경):
```html
<span style="fontSize: 9px, background: dept.color, borderRadius: 3px, padding: 1px 4px">
  개발
</span>
```

**상태별 테두리:**

| 상태 | 테두리 색 | 효과 |
|---|---|---|
| `idle` | `var(--th-border)` | 없음 |
| `working` | `var(--th-accent)` | 앰버 glow (`boxShadow: 0 0 8px var(--th-accent-glow)`) |
| `break` | `var(--th-text-muted)` | 없음 |
| `offline` | `var(--th-danger-border)` | opacity: 0.5 |

### 5-2. SubAgent 노드

부모 노드 아래에 작게 표시 (0.7x 스케일):

```
  ┌──────────────────┐  부모 노드
  │ Dev-1  (working) │
  └────────┬─────────┘
           │ sub-agent
     ┌─────┴──────┐
     │ thread-1   │  작은 노드 (0.7x)
     │ (working)  │
     └────────────┘
```

### 5-3. MeetingCluster

미팅 중인 에이전트들을 원형 영역으로 그룹:

```
      ╭─ ─ ─ ─ ─ ─ ─ ─╮
      ╎   🤝 review     ╎  점선 원, 앰버 테두리
      ╎                  ╎
      ╎ [PM-1] [Dev-1]  ╎  참석 에이전트 노드
      ╎    [QA-1]       ╎
      ╎                  ╎
      ╰─ ─ ─ ─ ─ ─ ─ ─╯
```

- 점선 원 (`strokeDasharray: 6 4`)
- 앰버 테두리 (미팅 활성)
- 내부에 참석 에이전트 노드를 원형으로 배치
- 미팅 종료 시 노드가 원래 위치로 돌아감 (애니메이션)

---

## 6. 엣지 디자인

### 6-1. 베지어 커브

```typescript
function bezierPath(from: Point, to: Point): string {
  const dy = to.y - from.y;
  const cp = Math.abs(dy) * 0.4;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + cp}, ${to.x} ${to.y - cp}, ${to.x} ${to.y}`;
}
```

### 6-2. 화살표 마커

```tsx
<defs>
  <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3"
    markerWidth="8" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-text-muted)" />
  </marker>
  <marker id="arrow-accent" viewBox="0 0 10 6" refX="10" refY="3"
    markerWidth="8" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-accent)" />
  </marker>
</defs>
```

### 6-3. 엣지 스타일

| 타입 | stroke | strokeWidth | strokeDasharray | marker | 의미 |
|---|---|---|---|---|---|
| `delegation` | `var(--th-text-secondary)` | 1.5 | — | `arrow` | 서브태스크 위임 |
| `sub-agent` | `var(--th-text-muted)` | 1 | `3 3` | `arrow` | 자식 에이전트 |
| `cross_dept` | 부서 color | 2 | `8 4` | `arrow` | 부서 간 전달 |
| `meeting` | `var(--th-accent)` | 1 | `4 4` | — | 미팅 참석 (양방향) |

### 6-4. 활성 엣지 애니메이션

working 상태인 에이전트의 엣지에 흐르는 점 애니메이션:

```tsx
{edge.animated && (
  <circle r={3} fill="var(--th-accent)">
    <animateMotion dur="2s" repeatCount="indefinite" path={edge.path} />
  </circle>
)}
```

---

## 7. 인터랙션

| 동작 | 처리 |
|---|---|
| **노드 클릭** | `onSelectAgent(agent)` — 기존 에이전트 상세 패널 열기 |
| **노드 호버** | 연결된 엣지 강조 + 미연결 노드 dim |
| **엣지 호버** | 태스크 제목 툴팁 표시 |
| **빈 영역 드래그** | 팬 |
| **마우스 휠** | 줌 (커서 위치 기준) |
| **더블클릭** | fit-to-view |
| **Esc** | 선택 해제 |

### 7-1. Fit-to-View

```typescript
function fitToView(nodes: FlowNode[], svgRect: DOMRect): ViewTransform {
  const bounds = getBoundingBox(nodes);
  const scaleX = svgRect.width / (bounds.width + PADDING * 2);
  const scaleY = svgRect.height / (bounds.height + PADDING * 2);
  const scale = Math.min(scaleX, scaleY, 1.0);
  return {
    scale,
    x: (svgRect.width - bounds.width * scale) / 2 - bounds.x * scale,
    y: (svgRect.height - bounds.height * scale) / 2 - bounds.y * scale,
  };
}
```

---

## 8. 실시간 데이터 흐름

```
WebSocket ──→ useRealtimeSync (기존, App.tsx)
                    │
              agents[], tasks[], subAgents[],
              crossDeptDeliveries[], meetingPresences[]
                    │
              AgentFlowGraph (props)
                    │
              useFlowLayout(projectAgents, relationships)
                    │
              { nodes, edges, meetings } ── useMemo로 캐싱
                    │
              SVG 렌더링
```

**새 API 불필요.** 기존 props를 그대로 사용.

**핵심: 프로젝트 팀 에이전트만 표시**
```typescript
const projectAgents = useMemo(
  () => agents.filter(a => projectAgentIds?.has(a.id)),
  [agents, projectAgentIds]
);
```

---

## 9. 컨트롤 UI (SVG 위 HTML 오버레이)

```
┌─────────────────────────────────────────────────────────┐
│ [−] [+] [⟳ fit]  │  ◉ all  ○ working  ○ in meeting    │
└─────────────────────────────────────────────────────────┘
```

- 줌 인/아웃 버튼
- Fit-to-view 리셋
- 상태별 필터 (전체 / working만 / 미팅 중만)
- **"프로젝트 팀만" 기본 ON** — 프로젝트 미선택 시 전체 에이전트 표시

---

## 10. 통합 단계

### Step 1: View 타입 추가
```typescript
// src/app/types.ts
export type View = ... | "flow-graph";
```

### Step 2: 사이드바 추가
```typescript
// src/components/Sidebar.tsx — NAV_STRUCTURE
// "에이전트" 섹션의 children에 추가 (agents, heartbeat 다음)
{ view: "flow-graph" }

// AGENTS_CHILDREN 배열에도 추가
const AGENTS_CHILDREN: View[] = ["agents", "heartbeat", "flow-graph"];

// navLabels에 추가
"flow-graph": t({ ko: "플로우 그래프", en: "flow graph", ja: "フローグラフ", zh: "流程图" }),

// collapsed 아이콘 추가
view === "flow-graph" ? "◎" : ...
```

**메뉴 위치: 에이전트 섹션**
```
에이전트
  ├── 에이전트 & 부서    (agents)     ⊙
  ├── 현황 모니터        (heartbeat)  ♡
  └── 플로우 그래프      (flow-graph) ◎
```

### Step 3: 레이아웃 렌더링
```typescript
// src/app/AppMainLayout.tsx
{view === "flow-graph" && (
  <AgentFlowGraph
    agents={agents}
    tasks={tasks}
    subAgents={subAgents}
    crossDeptDeliveries={crossDeptDeliveries}
    meetingPresences={meetingPresences}
    departments={departments}
    projectAgentIds={projectAgentIds}
    onSelectAgent={handleSelectAgent}
  />
)}
```

---

## 11. 성능 고려

| 항목 | 전략 |
|---|---|
| 프로젝트 팀 기준 필터 | 전체 에이전트가 아닌 프로젝트 팀만 렌더 (보통 3~15명) |
| 레이아웃 캐싱 | `useMemo` — deps: `[projectAgents, relationships]` |
| foreignObject | 노드당 1개. 15명 이하면 성능 이슈 없음 |
| 실시간 업데이트 | 에이전트 상태 변경 시 해당 노드만 리렌더 (React key 기반) |
| 줌/팬 | SVG transform으로 처리, DOM 재계산 최소화 |

---

## 12. 향후 확장

- **워크플로 빌더**: 편집 모드 추가 시 노드 드래그, 엣지 생성 기능 확장
- **타임라인 뷰**: 같은 데이터로 시간축 기반 간트 차트 렌더링
- **미팅 실황**: 미팅 phase 진행 상태를 실시간으로 클러스터 내에 표시
- **활성 엣지 애니메이션**: 데이터 전달을 시각적으로 표현하는 흐르는 점
