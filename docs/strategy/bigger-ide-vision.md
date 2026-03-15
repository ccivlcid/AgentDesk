# "Bigger IDE" Vision Roadmap

> **"The basic unit of interest is the agent, not the file. It's still programming, but."**
> — Andrej Karpathy

A strategy document for how AgentDesk will fulfill the **"Bigger IDE"** vision Karpathy describes.

---

## 1. Current State Assessment

### Strengths (Already Built)

| Area | Progress | Description |
|------|----------|-------------|
| Agent spawn/management | 95% | 9 CLI providers, real process management |
| Multi-agent orchestration | 90% | Meetings, consensus, task delegation, cross-department coordination |
| Database/infrastructure | 90% | 48 tables, encryption, audit logging |
| Skill learning/memory | 85% | Markdown-based skill learning, memory, and deletion |
| Heartbeat/monitoring | 85% | Anomaly detection, real-time alerts |
| Scheduling | 85% | Full cron engine |

### Completed Improvements (as of 2026-03-14)

| Area | Progress | Completion Notes |
|------|----------|-----------------|
| Visual orchestration | **95%** ✅ | Agent Flow Graph (Custom SVG, P2-1) + Workflow Builder (@xyflow/react, P3-2) implemented |
| "Higher-level Programming" UX | **85%** ✅ | Visual Workflow Builder (TriggerNode/AgentNode/GateNode/ConditionNode, 4 types) implemented |
| IDE integration feel | **90%** ✅ | Split-Pane Layout (P3-1), Keyboard-First UX (P3-3), enhanced CommandPalette complete |
| Slack integration | **100%** ✅ | conversations.history polling receiver implemented (P3-6) |

---

## 2. Core Strategy: 3 Pillars

```
┌─────────────────────────────────────────────────┐
│              "Bigger IDE" = AgentDesk            │
│                                                  │
│   ① Visualization  ② Agent          ③ Unified   │
│      Layer            Programming      IDE        │
│                                        Experience │
│   See agents      Design & compose   Do everything│
│   visually        agents             in one screen│
└─────────────────────────────────────────────────┘
```

---

## 3. Pillar ①: Visualization Layer — "See Agents Visually"

### 3-1. Agent Flow Graph ✅ Complete (P2-1)

**Goal**: Visualize real-time relationships and work flows between agents as a graph

**Implemented**:
- **Approach**: Custom SVG + React (no external libraries, zero dependencies)
- **Files**: `src/components/flow-graph/` (AgentFlowGraph, useFlowLayout, useViewTransform, AgentNode, MeetingCluster, FlowEdge)
- **Edge types**: Sub-agent (dashed), delegation (solid), cross-department (amber dashed), meeting (connector)
- **Layout**: Relationship-based auto-placement, meeting cluster circular arrangement
- **Interaction**: Zoom/pan, node hover highlight, click → agent detail, double-click fitToView
- **Filters**: All / Working / In Meeting
- **Location**: Desktop widget (`FlowGraphWidget`) and Workflow window (`g w` shortcut)

**Details**: `docs/strategy/agent-flow-graph-design.md`

### 3-2. Live Activity Timeline

**Goal**: Track all agent activity on a time axis

```
Time ──────────────────────────────────────────────►

Dev-1  ████ coding ████ │ ██ review ██ │
Dev-2           ███ coding ███ │ waiting... │ ██ fix ██
QA-1                          │ ████ testing ████ │
PM     ██ meeting ██ │                    │ █ report █
```

**Implementation approach**:
- Gantt chart-style timeline view
- One row per agent, columns by time
- Color coding by task status
- Current time indicator + auto-scroll

### 3-3. Resource & Cost Dashboard

**Goal**: Real-time monitoring of token usage, costs, and performance

```
┌─────────────────────────────────────────┐
│ Total Cost: $12.34 today │ Tokens: 1.2M │
├──────────┬──────────┬───────────────────┤
│ Dev-1    │ $4.50    │ ████████░░ 45%    │
│ Dev-2    │ $3.20    │ ██████░░░░ 32%    │
│ QA-1     │ $2.80    │ █████░░░░░ 28%    │
│ PM       │ $1.84    │ ███░░░░░░░ 18%    │
└──────────┴──────────┴───────────────────┘
```

- Leverages existing CLI Usage data; adds real-time aggregation view

---

## 4. Pillar ②: Agent Programming — "Design & Compose Agents"

### 4-1. Visual Workflow Builder ✅ Complete (P3-2)

**Goal**: Visually design agent workflows without code

**Implemented**:
- **Library**: `@xyflow/react` v12.10.1
- **Files**: `src/components/workflow-builder/` (WorkflowBuilder, nodes/ 4 types)
- **Node types**:
  - `WbTriggerNode` — Start trigger (schedule/webhook/messenger/manual)
  - `WbAgentNode` — Agent execution step (displays emoji, skill, agent name)
  - `WbGateNode` — Conditional branch (separate handles for success/failure/timeout)
  - `WbConditionNode` — True/false condition check
- **Save format**: JSON → localStorage (extensible to workflow pack system)
- **Initial example**: "PR Review Pipeline" preview ready to use immediately
- **Location**: Workflow window (`g w` shortcut)

**This is the essence of what Karpathy calls "higher-level programming"**:
Compose agents instead of files, flows instead of code, workflows instead of functions.

### 4-2. Agent Composition

**Goal**: Compose agents like building blocks to create new agents

```yaml
# Created visually in the UI → stored internally in this structure
name: "Full-Stack Review Team"
composition:
  - agent: code-reviewer
    skills: [typescript, react, security]
    rules: "Apply strict code quality standards"
  - agent: test-writer
    skills: [vitest, playwright]
    trigger: after(code-reviewer.pass)
  - agent: doc-updater
    skills: [markdown, api-docs]
    trigger: after(test-writer.complete)
```

**Implementation approach**:
- Extend the existing workflow pack system
- Drag-and-drop combination of agents + skills + rules in the UI
- Save/share/version the composition as pack JSON

### 4-3. Agent REPL (Interactive Agent Execution)

**Goal**: An interactive interface for issuing immediate commands to agents and seeing results

```
AgentDesk > @dev-1 "Refactor this function"
  dev-1 ► Analyzing... src/utils/parser.ts
  dev-1 ► 3 files modified (view diff)
  dev-1 ► Tests passing ✓

AgentDesk > @qa-1 "Validate the recent changes"
  qa-1 ► Checking 3 files changed by dev-1...
  qa-1 ► 1 issue found: missing null check (view details)
```

- Extend the existing chat panel with `@mention`-based direct agent commands
- Automatic context passing between agents

---

## 5. Pillar ③: Unified IDE Experience — "Do Everything in One Screen"

### 5-1. ⌘K Command Palette Enhancement

**Current**: Basic command palette
**Goal**: IDE-grade command system for performing all operations via keyboard

```
⌘K input examples:

> agent spawn claude "Backend API development"
> workflow run "PR Review Pipeline"
> task assign @dev-1 "Fix login bug"
> meeting start review-team
> show flow-graph
> cost today
```

**Implementation approach**:
- Add agent/workflow/task commands to existing ⌘K palette
- Fuzzy search + autocomplete
- Recent command history
- Inline result preview

### 5-2. Split-Pane Layout ✅ Complete (P3-1)

**Goal**: Split the screen like an IDE to view multiple panels simultaneously

**Implemented**:
- **Files**: `src/hooks/useSplitPane.ts`
- CSS flex + drag-resize (no external libraries)
- Drag-adjustable split ratio between 25–75%
- Automatically saved to localStorage
- Header `⊟` toggle button (desktop only) + `\` shortcut
- Secondary panel views: Flow Graph / Heartbeat / Dashboard / CLI Usage

### 5-3. Keyboard-First UX ✅ Complete (P3-3)

**Goal**: Full operation without a mouse (vim-style)

**Implemented**:

| Key | Action |
|----|--------|
| `Ctrl+Shift+K` | Command palette |
| `Ctrl+1~8` | Direct view switching |
| `?` | Keyboard shortcut guide |
| `\` | Toggle split view |
| `n` | Command palette (new task) |
| `g d/t/a/f/w/s/m/r/h` | Vim-style view navigation (1-second timeout) |
| `Esc` | Close modal |

---

## 6. Implementation Roadmap — Full Completion Status (2026-03-14)

### ✅ Phase 1: Visualization Foundation — Complete

> Make agents "visible"

| Task | Completed | Notes |
|------|-----------|-------|
| ~~Agent Flow Graph implementation~~ | 2026-03-14 | Custom SVG, P2-1 |
| ~~Agent Timeline (Heartbeat Monitor)~~ | (existing) | Integrated into HeartbeatPanel |
| ~~Resource & Cost Dashboard~~ | 2026-03-14 | CLI Usage + P2-2 cost tracking |

**Phase 1 result**: Agent status, relationships, and costs are visualized in real time

### ✅ Phase 2: Agent Programming — Complete

> Make agents "programmable"

| Task | Completed | Notes |
|------|-----------|-------|
| ~~Visual Workflow Builder implementation~~ | 2026-03-14 | @xyflow/react v12, P3-2 |
| ~~Persona UI completion~~ | 2026-03-14 | P2-7 |
| ~~Task handoff~~ | 2026-03-14 | P2-6 |

**Phase 2 result**: Agent pipelines can be visually designed via drag-and-drop

### ✅ Phase 3: Unified IDE Experience — Complete

> Tie everything together

| Task | Completed | Notes |
|------|-----------|-------|
| ~~Split-Pane Layout implementation~~ | 2026-03-14 | CSS flex + drag, P3-1 |
| ~~Keyboard-First UX fully applied~~ | 2026-03-14 | g+key vim-style, P3-3 |
| ~~Slack integration complete~~ | 2026-03-14 | conversations.history polling, P3-6 |

**Phase 3 result**: Complete "Bigger IDE" experience achieved

---

## 7. Technology Selection Guide

| Feature | Recommended Library | Reason |
|---------|---------------------|--------|
| Flow Graph / Workflow Builder | `@xyflow/react` v12 | Industry standard for node graphs, supports view/edit mode switching |
| Split Pane | `allotment` | Lightweight, same split UX as VS Code |
| Timeline | `vis-timeline` or custom Canvas | Gantt chart style, real-time updates |
| Keyboard Manager | `tinykeys` | 1KB, supports key combinations |
| Command Palette | `cmdk` | Easy to integrate with existing ⌘K |

---

## 8. Success Criteria

### The Karpathy Test: Can we answer "Yes" to these questions?

- [x] **"Are you looking at agents instead of files?"** → Agent Flow Graph ✅
- [x] **"Can you compose agents to create something new?"** → Visual Workflow Builder ✅
- [x] **"Does this feel like programming?"** → Agent REPL (implemented) + ⌘K (basic implementation) ✅
- [x] **"Are you working at a higher level of abstraction than a traditional IDE?"** → Workflow design > code editing ✅
- [x] **"Does this feel like an IDE?"** → Split Pane + Keyboard-First ✅

### KPIs

| Metric | Target |
|--------|--------|
| Flow Graph → workflow creation conversion rate | 30%+ |
| Percentage of key tasks completable by keyboard alone | 90%+ |
| Average workflow design time | < 5 minutes |
| Time to perceive agent status | < 3 seconds (via graph) |

---

## 9. Conclusion

AgentDesk's backend engine is already capable of sustaining a "Bigger IDE."
What's missing is the **frontend experience that delivers that power to the user**.

Completing just **3 killer features** reaches the Karpathy vision:

1. **Agent Flow Graph** — See agents
2. **Visual Workflow Builder** — Program agents
3. **Split-Pane + ⌘K** — Use it like an IDE

> A "Bigger IDE" is not about more features — it's about **working at a higher level of abstraction**.
