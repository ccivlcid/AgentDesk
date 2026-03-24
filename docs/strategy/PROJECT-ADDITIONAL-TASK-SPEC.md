# PROJECT-ADDITIONAL-TASK-SPEC.md
# Project Folder Window — Additional Task Directive Feature Design

> Status: Implemented
> Related files: `src/components/desktop/project-folder-window/`

---

## 1. Background and Purpose

Currently in AgentDesk, when a project is first created, a kickoff is executed and agents perform tasks. After all tasks are completed, to **assign additional tasks to the same project**:

- Use the `$` prefix in the chat panel (a hidden flow for users)
- Manually create tasks one by one in the TaskBoard (no AI planning)

Both methods have unclear or cumbersome UX. The most natural entry point is the **project folder window** — users should be able to assign additional tasks right where they are already viewing the project.

---

## 2. Feature Overview

Add a **NewRoundPanel (additional task directive panel)** at the bottom of the project folder window (`project-folder-window/index.tsx`).

### Core Behavior

1. User enters task content in the folder window and clicks the **"Assign Task"** button
2. Calls `/api/projects/:id/kickoff` (reuses existing kickoff endpoint)
3. Server plans tasks via LLM → saves to DB → auto-executes agents
4. The Tasks tab within the window reflects new tasks in real time

### Supported Scenarios

| Scenario | State Condition | Button Display |
|----------|----------------|---------------|
| No tasks (right after project creation) | No tasks exist | "Start First Task" |
| All tasks completed | Only `done` exists | "Assign Additional Task" |
| Tasks in progress | `in_progress` exists | Disabled (shows "in progress") |
| Awaiting clarification | Server response | Show question + answer input |

---

## 3. UI Design

### 3-1. Placement

**Fixed panel at the very bottom** of the project folder window — below the tab content, full window width.

```
┌────────────────────────────────────────────────────┐
│  Traffic Lights  |  Project Name  |  [Activate]    │ ← Title bar (44px)
├────────────────────────────────────────────────────┤
│  ▦ Running 2  ✓ Done 5  👤 Agents 3               │ ← Stats bar (30px)
├────────────────────────────────────────────────────┤
│  Files  Tasks  Agents  Terminal  Details  Git       │ ← Tab navigation
├────────────────────────────────────────────────────┤
│                                                    │
│           (Tab content area, flex-1)               │
│                                                    │
├────────────────────────────────────────────────────┤
│  NewRoundPanel (Additional task directive panel)    │ ← Newly added (expandable)
└────────────────────────────────────────────────────┘
```

### 3-2. NewRoundPanel State-based UI

#### State A — Collapsed (default)

```
┌────────────────────────────────────────────────────┐
│  [+] Assign Additional Task          [↑ Expand]    │  (36px)
└────────────────────────────────────────────────────┘
```

- Click to switch to expanded state

#### State B — Expanded / Awaiting Input

```
┌────────────────────────────────────────────────────┐
│  Assign Additional Task                [↓ Collapse] │  (36px)
├────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ What task would you like to add?              │  │
│  │ (e.g., Implement login feature, write unit    │  │
│  │ tests)                                        │  │  (80px textarea)
│  └──────────────────────────────────────────────┘  │
│                            [Assign Task]           │  (32px)
└────────────────────────────────────────────────────┘
```

#### State C — Loading (kickoff in progress)

```
┌────────────────────────────────────────────────────┐
│  [Spinner] Agent is planning tasks...               │  (36px)
└────────────────────────────────────────────────────┘
```

#### State D — Clarification Needed

```
┌────────────────────────────────────────────────────┐
│  Agent has a question                               │  (36px)
├────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐  │
│  │ (Question text from server)                   │  │  (Question display)
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Enter your answer...                          │  │  (60px textarea)
│  └──────────────────────────────────────────────┘  │
│                            [Send Answer]           │
└────────────────────────────────────────────────────┘
```

#### State E — Disabled (tasks in progress)

```
┌────────────────────────────────────────────────────┐
│  [●] Agent is working — additional tasks available  │  (36px, disabled)
│     after completion                                │
└────────────────────────────────────────────────────┘
```

---

## 4. Component Design

### 4-1. New File

```
src/components/desktop/project-folder-window/
└── NewRoundPanel.tsx          (Additional task directive panel component)
```

### 4-2. NewRoundPanel Props

```typescript
interface NewRoundPanelProps {
  projectId: string;
  hasRunningTask: boolean;   // Whether in_progress | collaborating tasks exist
  onKickoffDone: () => void; // Trigger Tasks tab refresh after kickoff completion
  t: (keys: { ko: string; en: string; ja?: string; zh?: string }) => string;
}
```

### 4-3. NewRoundPanel Internal State

```typescript
type PanelMode =
  | "collapsed"       // Default collapsed
  | "idle"            // Expanded + awaiting input
  | "loading"         // Kickoff in progress
  | "clarification"   // Server requesting additional info
  | "disabled";       // Disabled because tasks are running

const [mode, setMode] = useState<PanelMode>(
  hasRunningTask ? "disabled" : "collapsed"
);
const [input, setInput] = useState("");
const [clarificationId, setClarificationId] = useState<string | null>(null);
const [clarificationQuestion, setClarificationQuestion] = useState("");
const [clarificationAnswer, setClarificationAnswer] = useState("");
```

### 4-4. index.tsx Modification Scope

- Add `NewRoundPanel` import
- Render `<NewRoundPanel>` at the bottom of the window
- `hasRunningTask` prop: `activeTasks.length > 0` (already computed in `useProjectFolderWindowState`)
- `onKickoffDone`: Refresh Tasks tab data (trigger existing `refetchTasks()`)

---

## 5. API Flow

### 5-1. Normal Kickoff

```
User input → Click "Assign Task"
    ↓
POST /api/projects/:id/kickoff
Body: { clarification_answer: undefined }
    ↓
Response: { status: "ok", tasks: [...] }
    ↓
Call onKickoffDone() → Refresh Tasks tab
Panel → Reset to "collapsed" state
```

> Where does the server receive the input text?
> → Kickoff operates based on the project's `core_goal` + `directive`.
> In this spec, the entered text is passed as a **temporary directive**.

### 5-2. Server API Change: Add `additional_directive` Parameter

```typescript
// POST /api/projects/:id/kickoff
// Existing:
{ clarification_answer?: string }

// Added:
{
  clarification_answer?: string;
  additional_directive?: string;   // New: task directive applied only to this round
}
```

Server logic:
- If `additional_directive` is present, add it to the LLM prompt as a "This round's specific task:" section
- The project DB's `directive` is not modified (round-scoped only)

### 5-3. Clarification Flow

```
POST /api/projects/:id/kickoff
    ↓
Response: { status: "clarification_needed", clarificationId, question }
    ↓
Panel → "clarification" state, display question
    ↓
User enters answer → Click "Send Answer"
    ↓
POST /api/projects/:id/clarification-reply
Body: { clarification_id, answer }
    ↓
(Server automatically re-executes kickoff)
    ↓
Panel → "loading" → "collapsed"
Call onKickoffDone()
```

---

## 6. Server Changes

### 6-1. kickoff.ts — `additional_directive` Handling

```typescript
// Existing prompt:
const prompt = `
Project Name: ${project.name}
Goal: ${project.core_goal}
${project.directive ? `Directive: ${project.directive}` : ""}
Available agents: ...
`;

// After change:
const additionalDirective = (body.additional_directive ?? "").trim();
const prompt = `
Project Name: ${project.name}
Goal: ${project.core_goal}
${project.directive ? `Project Directive: ${project.directive}` : ""}
${additionalDirective ? `This Round's Task: ${additionalDirective}` : ""}
Available agents: ...
`;
```

### 6-2. Impact Scope

- `server/modules/routes/core/projects/kickoff.ts` — Only the prompt construction part is modified
- No changes to existing endpoint URL or response spec
- Existing kickoff caller (App.tsx's `kickoffProject()`) requires no changes

---

## 7. Data Flow Diagram

```
ProjectFolderWindow (index.tsx)
│
├── useProjectFolderWindowState
│     activeTasks: Task[]   ──────────────┐
│     refetchTasks: () => void ────────────┤
│                                          ↓
└── NewRoundPanel
      ├── mode: PanelMode
      ├── input: string
      ├── clarificationId: string | null
      │
      ├── handleSubmit()
      │     POST /api/projects/:id/kickoff
      │     { additional_directive: input }
      │     → ok        → onKickoffDone() → refetchTasks()
      │     → clarification → mode = "clarification"
      │
      └── handleClarificationReply()
            POST /api/projects/:id/clarification-reply
            { clarification_id, answer }
            → onKickoffDone() → refetchTasks()
```

---

## 8. Edge Case Handling

| Case | Handling Method |
|------|----------------|
| Click "Assign Task" with empty input | Kickoff based on project's existing goal/directive (existing behavior maintained) |
| Attempt kickoff while tasks are running | Server returns `task_already_running` → show error toast |
| Kickoff failure (LLM error) | Display error message within panel, provide retry button |
| Network disconnection | Maintain loading state + timeout (30s) then transition to error |
| Re-failure after clarification answer | Show error + "Try Again" button |

---

## 9. Implementation Checklist

### Frontend

- [ ] Create `NewRoundPanel.tsx`
  - [ ] Implement 5 mode states (collapsed/idle/loading/clarification/disabled)
  - [ ] `kickoffProject()` API call (add `additional_directive` parameter)
  - [ ] Connect `replyClarification()` API call
  - [ ] Use SVG icons only (no emoji)
  - [ ] Use `--th-*` CSS variables
- [ ] Modify `project-folder-window/index.tsx`
  - [ ] Add `NewRoundPanel` rendering
  - [ ] Connect `hasRunningTask` prop (`activeTasks.length > 0`)
  - [ ] Connect `onKickoffDone` → Tasks tab refresh trigger
- [ ] Modify `src/api/project-kickoff.ts`
  - [ ] Extend signature: `kickoffProject(projectId, clarificationAnswer?, additionalDirective?)`

### Server

- [ ] Modify `server/modules/routes/core/projects/kickoff.ts`
  - [ ] Read `body.additional_directive`
  - [ ] Add "This Round's Task" section to LLM prompt

### Documentation

- [ ] `docs/specs/api.md` — Update kickoff endpoint body spec (version bump)

---

## 10. Out of Scope

- Saving `additional_directive` as history in the DB (future consideration)
- "Round history" view (tracking which round number it is)
- Agent role reassignment (this round uses existing assignments as-is)
- Mid-task cancellation feature

---

## 11. Related File Paths

| File | Role |
|------|------|
| `src/components/desktop/project-folder-window/index.tsx` | Project folder window main |
| `src/components/desktop/project-folder-window/NewRoundPanel.tsx` | New panel component |
| `src/components/desktop/project-folder-window/useProjectFolderWindowState.ts` | Window state (activeTasks, etc.) |
| `src/api/project-kickoff.ts` | Kickoff/resume/clarification API functions |
| `server/modules/routes/core/projects/kickoff.ts` | Server kickoff endpoint |
| `docs/specs/api.md` | API specification document |
