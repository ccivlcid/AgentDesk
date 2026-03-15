# Agent Flow Graph — Custom SVG Implementation Reference

> **Status:** ✅ Implementation complete (2026-03-14, P2-1)
> **Approach:** Custom SVG + React, no external libraries
> **Updated:** 2026-03-14

---

## 0. Implementation Completion Summary

### File Locations

| File | Role |
|---|---|
| `src/components/flow-graph/AgentFlowGraph.tsx` | Main component (filters, SVG canvas, controls) |
| `src/components/flow-graph/useFlowLayout.ts` | Layout algorithm (coordinate calculation, edge paths) |
| `src/components/flow-graph/useViewTransform.ts` | Zoom/pan interaction (SVG transform) |
| `src/components/flow-graph/nodes/AgentNode.tsx` | Agent node (foreignObject-based) |
| `src/components/flow-graph/nodes/MeetingCluster.tsx` | Meeting cluster circular background |
| `src/components/flow-graph/edges/FlowEdge.tsx` | Bezier curve edges |
| `src/components/flow-graph/constants.ts` | NODE_WIDTH, NODE_HEIGHT, NODE_GAP, etc. |

### Sidebar Integration Complete

> **Note:** The following references (`src/app/types.ts` View type, `src/components/Sidebar.tsx`, `src/app/AppMainLayout.tsx`) reflect the original sidebar-based architecture. The project has since migrated to a macOS desktop metaphor (Desktop + Dock + Widgets). The flow graph is now accessible via `src/components/desktop/widgets/FlowGraphWidget.tsx`.

- `src/app/types.ts` — `"flow-graph"` included in `View` type
- `src/components/Sidebar.tsx` — registered under the agents section
- `src/app/AppMainLayout.tsx` — lazy import, renders with `{view === "flow-graph"}`

---

## 0-A. Type File Locations (Reference)

### Actual Type File Locations

| Type | File | Key Fields |
|---|---|---|
| `Agent` | `src/types/index.ts` | `id, name, status, avatar_emoji, department_id` |
| `Department` | `src/types/index.ts` | `id, name, color` |
| `Task` | `src/types/index.ts` | `id, title, status, assigned_agent_id, project_id` |
| `SubAgent` | `src/types/index.ts` (~line 65) | `id, parentAgentId, task, status` |
| `MeetingPresence` | `src/types/index.ts` (~line 56) | `agent_id, phase, task_id, until` |
| `CrossDeptDelivery` | `src/types/index.ts` (~line 72) | `id, fromAgentId, toAgentId` |

### AppMainLayout Props Notes

The following props are **not present** in `src/app/AppMainLayout.tsx` — they must be added directly during integration (Step 3):

```typescript
// Add to AppMainLayoutProps interface
subAgents: SubAgent[];
crossDeptDeliveries: CrossDeptDelivery[];
meetingPresence: MeetingPresence[];
```

This data is already managed in `App.tsx` via Zustand `agentStore` / `taskStore`:
- `subAgents` → `useAgentStore()` → `agentStore.ts`
- `crossDeptDeliveries`, `meetingPresence` → `useTaskStore()` → `taskStore.ts`

Also add prop passing to the `<AppMainLayout ... />` call in `App.tsx`.

### `projectAgentIds` Location Note

The `projectAgentIds` prop from design Step 3 is already managed as **internal state within AppMainLayout**:
```typescript
// src/app/AppMainLayout.tsx line ~227
const [projectAgentIds, setProjectAgentIds] = useState<Set<string>>(new Set());
```
No need to receive it as an external prop — it can be used internally and passed directly to `AgentFlowGraph`.

---

---

## 1. Overview

A view that visualizes **real-time relationships between agents**.
Centered on agents assigned to a project, it shows at a glance who is delegating work to whom, who is reviewing, and who is in a meeting.

### Key Differentiator — No Overlap with the Task Board

| | **Task Board (TaskBoard)** | **Flow Graph (FlowGraph)** |
|---|---|---|
| **Subject** | Tasks (cards) | Agents (nodes) |
| **Axis** | Status columns (inbox → done) | Relationships between agents |
| **Shows** | "What state is this task in right now?" | "Who is this agent working with and how?" |
| **Edges** | None (dependencies only in DAG view) | Delegation, sub-agent, cross-dept delivery, meeting |
| **Time axis** | None (kanban) / present (Gantt) | None — current snapshot |

**What the Flow Graph shows:**
1. **Delegation relationships**: Edge showing agent A delegating a subtask to agent B
2. **Sub-agents**: Child agents spawned by a parent agent (Codex threads, etc.)
3. **Cross-department delivery**: `CrossDeptDelivery` — arrows showing work deliverables transferred between departments
4. **Meetings**: `MeetingPresence` — group of agents currently in a meeting
5. **Real-time status**: idle/working/break/offline status + current task for each agent

### Design Principles

- **Agents are the subject**: Agents selected for a project are nodes; departments are only auxiliary labels
- **macOS hybrid**: Node containers use `borderRadius: 10` + shadow; inner content uses monospace font
- **Real-time**: Leverages existing WebSocket infrastructure (`agent_status`, `task_update`, `subtask_update`, `cross_dept_delivery`)
- **Zero dependencies**: SVG + React only, no external graph libraries

---

## 2. File Structure

```
src/components/flow-graph/
├── AgentFlowGraph.tsx          ← Main component (SVG container + zoom/pan)
├── useFlowLayout.ts            ← agents/relationships → node/edge coordinate calculation
├── useViewTransform.ts         ← zoom/pan/drag state management hook
├── nodes/
│   ├── AgentNode.tsx           ← Agent node rendering (foreignObject)
│   └── MeetingCluster.tsx      ← Display group of agents in a meeting
├── edges/
│   └── FlowEdge.tsx            ← Bezier curve edge rendering
└── constants.ts                ← Layout constants (node sizes, spacing, etc.)
```

---

## 3. Layout Algorithm

### 3-1. Agent-Centric Placement (Force-Directed Inspired)

Placement is based on **agent relationships**, not department columns.

**Placement rules:**
1. Only **project team agents** are shown as nodes (not all agents)
2. **Agents with more connections** are placed at the center (relationship weight-based)
3. **Meeting attendees** are temporarily clustered (circular placement)
4. **Sub-agents** appear small below the parent node
5. **Department labels** are shown only as small tags next to nodes

```
                 ┌──────────┐
                 │ PM-1     │ ◀── Planning
                 │ (meeting)│
                 └────┬─────┘
          delegate    │     review
        ┌─────────────┼──────────────┐
        ▼             │              ▼
  ┌──────────┐        │        ┌──────────┐
  │ Dev-1    │ ◀─ Dev │        │ QA-1     │ ◀── QA
  │ (working)│        │        │ (idle)   │
  └────┬─────┘        │        └──────────┘
       │ subtask      │
       ▼              │
  ┌──────────┐        │
  │ Dev-2    │        │
  │ (working)│        │
  └──────────┘        │
```

### 3-2. Coordinate Calculation (useFlowLayout)

```typescript
// constants.ts
const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const NODE_GAP = 40;            // Minimum spacing between nodes
const MEETING_RADIUS = 120;     // Meeting cluster radius
const SUB_AGENT_OFFSET_Y = 20;  // Sub-agent Y offset
const SUB_AGENT_SCALE = 0.7;    // Sub-agent scale factor

// useFlowLayout.ts
interface FlowNode {
  id: string;
  type: "agent" | "sub-agent";
  x: number;
  y: number;
  width: number;
  height: number;
  agent: Agent;
  deptLabel: string;    // Department name (for tag)
  deptColor: string;    // Department color
  inMeeting: boolean;   // Whether currently in a meeting
}

interface FlowEdge {
  id: string;
  from: { nodeId: string; x: number; y: number };
  to: { nodeId: string; x: number; y: number };
  type: "delegation" | "sub-agent" | "cross_dept" | "meeting";
  label?: string;
  animated?: boolean;   // Active animation when in working state
}

interface MeetingCluster {
  id: string;
  cx: number;           // Cluster center X
  cy: number;           // Cluster center Y
  radius: number;
  agentIds: string[];
  phase: "kickoff" | "review";
  taskId: string | null;
}
```

### 3-3. Placement Algorithm (Simple Hierarchical)

A simple hierarchical layout implementable without external libraries:

```typescript
function layoutAgents(agents: Agent[], relationships: Relationship[]): FlowNode[] {
  // 1. Calculate degree — number of delegation/subtask/cross-dept relationships
  // 2. Place the agent with the highest degree in the center row (row 0)
  // 3. Place directly connected agents in the next row
  // 4. Place unconnected agents at the bottom
  // 5. Distribute X coordinates evenly within the same row
  // 6. Move agents currently in a meeting to a separate cluster
}
```

### 3-4. Relationship Data Extraction

Extract inter-agent relationships from existing data:

| Source Data | Edge Type | Meaning |
|---|---|---|
| `SubTask` where `assigned_agent_id ≠ task's assigned_agent_id` | `delegation` | Agent A delegates a subtask to agent B |
| `SubAgent.parentAgentId → SubAgent.id` | `sub-agent` | Parent spawns a child agent |
| `CrossDeptDelivery.fromAgentId → toAgentId` | `cross_dept` | Work deliverable transferred between departments |
| `MeetingPresence` with same `task_id` + `phase` | `meeting` | Attendees of the same meeting connected |

---

## 4. SVG Container (AgentFlowGraph.tsx)

### 4-1. Zoom/Pan (useViewTransform)

```typescript
interface ViewTransform {
  x: number;      // Pan offset X
  y: number;      // Pan offset Y
  scale: number;  // Zoom level (0.3 ~ 2.0)
}

// Mouse wheel → zoom (relative to cursor position)
// Mouse drag → pan
// Double-click → fit-to-view
```

Apply `transform={`translate(${x}, ${y}) scale(${scale})`}` to the top-level SVG `<g>`.

### 4-2. Render Structure

```tsx
<div style={{ position: "relative", width: "100%", height: "100%" }}>
  {/* Control overlay */}
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
    <defs>{/* Arrow markers */}</defs>

    <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
      {/* Layer 1: Meeting cluster backgrounds (circular areas) */}
      {meetings.map(m => <MeetingCluster key={m.id} {...m} />)}

      {/* Layer 2: Edges */}
      {edges.map(e => <FlowEdge key={e.id} {...e} />)}

      {/* Layer 3: Agent nodes */}
      {nodes.map(n => <AgentNode key={n.id} {...n} onClick={onSelectAgent} />)}
    </g>
  </svg>
</div>
```

---

## 5. Node Design

### 5-1. AgentNode (foreignObject-based)

Uses `<foreignObject>` to render HTML/CSS inside SVG.
Applies macOS hybrid style (borderRadius, boxShadow) directly.

```
┌─────────────────────────┐  borderRadius: 10
│ 😎 Dev-1          Dev   │  Avatar + name + department tag
│─────────────────────────│
│ ● working  ██████░░░░░  │  Status dot + load bar
│ Fix login bug            │  Current task (truncated)
└─────────────────────────┘
```

**Department shown only as a small tag** (top-right of node, department color background):
```html
<span style="fontSize: 9px, background: dept.color, borderRadius: 3px, padding: 1px 4px">
  Dev
</span>
```

**Border by status:**

| Status | Border Color | Effect |
|---|---|---|
| `idle` | `var(--th-border)` | None |
| `working` | `var(--th-accent)` | Amber glow (`boxShadow: 0 0 8px var(--th-accent-glow)`) |
| `break` | `var(--th-text-muted)` | None |
| `offline` | `var(--th-danger-border)` | opacity: 0.5 |

### 5-2. SubAgent Node

Displayed small below the parent node (0.7x scale):

```
  ┌──────────────────┐  Parent node
  │ Dev-1  (working) │
  └────────┬─────────┘
           │ sub-agent
     ┌─────┴──────┐
     │ thread-1   │  Small node (0.7x)
     │ (working)  │
     └────────────┘
```

### 5-3. MeetingCluster

Groups agents in a meeting within a circular area:

```
      ╭─ ─ ─ ─ ─ ─ ─ ─╮
      ╎   🤝 review     ╎  Dashed circle, amber border
      ╎                  ╎
      ╎ [PM-1] [Dev-1]  ╎  Attending agent nodes
      ╎    [QA-1]       ╎
      ╎                  ╎
      ╰─ ─ ─ ─ ─ ─ ─ ─╯
```

- Dashed circle (`strokeDasharray: 6 4`)
- Amber border (meeting active)
- Attending agent nodes placed in a circular arrangement inside
- When meeting ends, nodes animate back to their original positions

---

## 6. Edge Design

### 6-1. Bezier Curve

```typescript
function bezierPath(from: Point, to: Point): string {
  const dy = to.y - from.y;
  const cp = Math.abs(dy) * 0.4;
  return `M ${from.x} ${from.y} C ${from.x} ${from.y + cp}, ${to.x} ${to.y - cp}, ${to.x} ${to.y}`;
}
```

### 6-2. Arrow Markers

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

### 6-3. Edge Styles

| Type | stroke | strokeWidth | strokeDasharray | marker | Meaning |
|---|---|---|---|---|---|
| `delegation` | `var(--th-text-secondary)` | 1.5 | — | `arrow` | Subtask delegation |
| `sub-agent` | `var(--th-text-muted)` | 1 | `3 3` | `arrow` | Child agent |
| `cross_dept` | dept color | 2 | `8 4` | `arrow` | Cross-department delivery |
| `meeting` | `var(--th-accent)` | 1 | `4 4` | — | Meeting attendance (bidirectional) |

### 6-4. Active Edge Animation

Flowing dot animation on edges of agents in working state:

```tsx
{edge.animated && (
  <circle r={3} fill="var(--th-accent)">
    <animateMotion dur="2s" repeatCount="indefinite" path={edge.path} />
  </circle>
)}
```

---

## 7. Interactions

| Action | Behavior |
|---|---|
| **Node click** | `onSelectAgent(agent)` — opens existing agent detail panel |
| **Node hover** | Highlights connected edges + dims unconnected nodes |
| **Edge hover** | Shows task title tooltip |
| **Drag empty area** | Pan |
| **Mouse wheel** | Zoom (relative to cursor position) |
| **Double-click** | Fit-to-view |
| **Esc** | Deselect |

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

## 8. Real-Time Data Flow

```
WebSocket ──→ useRealtimeSync (existing, App.tsx)
                    │
              agents[], tasks[], subAgents[],
              crossDeptDeliveries[], meetingPresences[]
                    │
              AgentFlowGraph (props)
                    │
              useFlowLayout(projectAgents, relationships)
                    │
              { nodes, edges, meetings } ── cached with useMemo
                    │
              SVG rendering
```

**No new API required.** Uses existing props as-is.

**Key: Only project team agents are displayed**
```typescript
const projectAgents = useMemo(
  () => agents.filter(a => projectAgentIds?.has(a.id)),
  [agents, projectAgentIds]
);
```

---

## 9. Control UI (HTML Overlay on SVG)

```
┌─────────────────────────────────────────────────────────┐
│ [−] [+] [⟳ fit]  │  ◉ all  ○ working  ○ in meeting    │
└─────────────────────────────────────────────────────────┘
```

- Zoom in/out buttons
- Fit-to-view reset
- Status filter (all / working only / in meeting only)
- **"Project team only" ON by default** — shows all agents when no project is selected

---

## 10. Integration Steps

### Step 1: Add View Type
```typescript
// src/app/types.ts
export type View = ... | "flow-graph";
```

### Step 2: Add to Sidebar
```typescript
// src/components/Sidebar.tsx — NAV_STRUCTURE
// Add to the children of the "Agents" section (after agents, heartbeat)
{ view: "flow-graph" }

// Also add to AGENTS_CHILDREN array
const AGENTS_CHILDREN: View[] = ["agents", "heartbeat", "flow-graph"];

// Add to navLabels
"flow-graph": t({ ko: "플로우 그래프", en: "flow graph", ja: "フローグラフ", zh: "流程图" }),

// Add collapsed icon
view === "flow-graph" ? "◎" : ...
```

**Menu location: Agents section**
```
Agents
  ├── Agents & Departments  (agents)     ⊙
  ├── Status Monitor        (heartbeat)  ♡
  └── Flow Graph            (flow-graph) ◎
```

### Step 3: Layout Rendering
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

## 11. Performance Considerations

| Item | Strategy |
|---|---|
| Project team filter | Renders only project team agents, not all agents (typically 3–15 members) |
| Layout caching | `useMemo` — deps: `[projectAgents, relationships]` |
| foreignObject | One per node. No performance issues with 15 or fewer members |
| Real-time updates | Only the affected node re-renders on agent status change (React key-based) |
| Zoom/pan | Handled via SVG transform, minimizing DOM recalculation |

---

## 12. Future Extensions

- **Workflow builder**: Add edit mode with node drag and edge creation functionality
- **Timeline view**: Render a time-axis Gantt chart using the same data
- **Live meeting**: Show real-time meeting phase progress inside the cluster
- **Active edge animation**: Flowing dots to visually represent data transfer
