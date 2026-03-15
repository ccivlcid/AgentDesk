# System Structure Map

Generated from parallel architecture analysis lanes:
1. Frontend module map (`src/`)
2. Backend module map (`server/`)
3. Tooling/docs map (`scripts/`, `docs/`)
4. Build/config map (`package.json`, `tsconfig*`, `vite.config.ts`, `.env*`)
5. End-to-end runtime sequence (UI -> API -> DB/CLI -> WS -> UI)
6. Repository inventory (tree and key files)

## High-Level System Map

```mermaid
flowchart LR
  subgraph FE[Frontend]
    FE0["src/main.tsx"]
    FE1["src/App.tsx"]
    FE2["src/components/*"]
    FE3["src/api.ts"]
    FE4["src/hooks/useWebSocket.ts"]
    FE0 --> FE1
    FE1 --> FE2
    FE1 --> FE3
    FE1 --> FE4
  end

  subgraph BE[Backend]
    BE0["server/index.ts"]
    BE1["Express REST (/api/*)"]
    BE2["WebSocket broadcast"]
    BE3["SQLite (agentdesk.sqlite)"]
    BE4["CLI/HTTP agents + logs + worktrees"]
    BE0 --> BE1
    BE0 --> BE2
    BE0 --> BE3
    BE0 --> BE4
  end

  FE3 <-->|HTTP| BE1
  FE4 <-->|ws://| BE2
  BE1 --> BE3
  BE1 --> BE4
```

## Frontend Composition

```mermaid
flowchart TD
  App["src/App.tsx"] --> Sidebar["components/Sidebar.tsx"]
  App --> Dashboard["components/Dashboard.tsx"]
  App --> TaskBoard["components/TaskBoard.tsx"]
  App --> Settings["components/SettingsPanel.tsx"]
  App --> Chat["components/ChatPanel.tsx"]
  App --> AgentDetail["components/AgentDetail.tsx"]
  App --> Terminal["components/TerminalPanel.tsx"]
  App --> API["src/api.ts"]
  App --> Types["src/types/index.ts"]
  App --> WS["hooks/useWebSocket.ts"]
```

## Backend Runtime Surface

```mermaid
flowchart LR
  UI["Browser UI"] --> REST["Express routes"]
  UI --> WS["WebSocket server"]
  REST --> DB["SQLite tables"]
  REST --> Run["Task runner"]
  Run --> Proc["CLI process / HTTP provider"]
  Proc --> Log["logs/*.log + task_logs"]
  Log --> WS
  REST --> Git[".agentdesk-worktrees + git ops"]
  REST --> OAuth["oauth_credentials"]
```

## Core Runtime Sequence

```mermaid
sequenceDiagram
  participant UI
  participant API as src/api.ts
  participant S as server/index.ts
  participant DB as SQLite
  participant AG as CLI/HTTP Agent
  participant WS as WebSocket

  UI->>API: initial load (departments/agents/tasks/stats/settings)
  API->>S: GET /api/*
  S->>DB: SELECT/aggregate
  DB-->>S: rows
  S-->>API: json
  API-->>UI: hydrate state

  UI->>API: POST /api/tasks/:id/run
  API->>S: run request
  S->>DB: update task/agent + append logs
  S->>AG: spawn CLI or call HTTP model
  AG-->>S: output stream
  S->>WS: broadcast task_update/cli_output/agent_status
  WS-->>UI: live updates
  UI->>API: GET /api/tasks/:id/terminal
  API->>S: read log + task_logs
  S-->>API: terminal payload
  API-->>UI: terminal refresh
```

## Key Files

- Runtime entry: `server/index.ts`, `src/main.tsx`, `src/App.tsx`
- API contract layer: `src/api.ts`
- Shared model types: `src/types/index.ts`
- Visualization generator: `scripts/generate-architecture-report.mjs`
- Generated artifacts: `docs/architecture/README.md`, `docs/architecture/*.mmd`, `docs/architecture/architecture.json`

## Refresh Commands

```bash
npm run arch:map
```

---

## Agent Selection & Task Assignment Flow

```mermaid
flowchart TD
  A[POST /api/tasks/:id/run] --> B{assigned_agent_id\nset?}

  B -- "yes" --> C[resolveConstrainedAgentScopeForTask]
  C --> D{scope validation}
  D -- "pass" --> G[use assigned agent]
  D -- "violation" --> E[clear agentId]
  E --> F[selectAutoAssignableAgentForTask]

  B -- "no" --> F

  F --> F1[Step 1: Resolve agent pool constraints\npack preferred dept ∩ project manual scope]
  F1 --> F2[Step 2: Filter\ncli_provider set + idle/break + no current task]
  F2 --> F3[Step 3: Sort\ndept preference→status→role→completed count→created time]
  F3 --> G

  G --> H[buildTaskExecutionPrompt\nassemble 15 blocks]
  H --> I[run pre-task Hooks]
  I --> J[child_process.spawn]
  J --> K[stdout → WebSocket → Terminal]
```

## Task Instruction Assembly (Prompt Blocks)

```mermaid
flowchart LR
  subgraph Prompt["buildTaskExecutionPrompt()"]
    direction TB
    B1["[Task Session] sessionId·agentId·provider"]
    B2["[Project Structure] codebase summary"]
    B3["[Task] title + description ★"]
    B4["[Workflow Pack Rules] per-pack execution guidance"]
    B5["[Character Persona] agent persona"]
    B6["[Project Rules] project>agent>dept>global"]
    B7["[Agent Memory] past memories (5min TTL cache)"]
    B8["[Run Instruction] final execution instruction"]
    B1 --> B2 --> B3 --> B4 --> B5 --> B6 --> B7 --> B8
  end
  Prompt --> Spawn["child_process.spawn(claude|codex|gemini...)"]
```

## Agent Meeting & Consensus Flow

```mermaid
sequenceDiagram
  participant Task as Task (in_progress)
  participant RC as ReviewConsensus
  participant L1 as LeaderA
  participant L2 as LeaderB
  participant DB as DB / meeting_minutes

  Task->>RC: handleTaskRunComplete (exit 0)
  RC->>RC: callLeadersToClientOffice()
  RC->>L1: runAgentOneShot(meetingPrompt, round=1)
  L1-->>DB: appendMeetingMinuteEntry(approve|revise)
  RC->>L2: runAgentOneShot(meetingPrompt, round=1)
  L2-->>DB: appendMeetingMinuteEntry(approve|revise)

  RC->>RC: processReviewConsensusOutcome()
  alt all/majority approve
    RC->>Task: status = 'done'
  else revise requested
    RC->>Task: seedReviewRevisionSubtasks() → Round 2
  else Round 3 exceeded
    RC->>Task: force approve → status = 'done'
  end
  RC->>RC: dismissLeadersFromClientOffice()
```

## Outcome Pipeline

```mermaid
flowchart TD
  Exit[process exit code] --> R1[task.result = last 2000 chars of log]
  R1 --> R2[runAfterExitGates\noutput gate validation]
  R2 --> R3[runExtractLearnings\ninsights → memory_entries]
  R3 --> R4[runExtractSkills\nskills → skill_learning_history]
  R4 --> R5[recordAgentUsage\ntoken/cost recording]
  R5 --> R6{exit code}
  R6 -- "0" --> R7[executeHooks post-task\ntask.status = review\nstartReviewConsensusMeeting]
  R6 -- "≠ 0" --> R8[executeHooks on-error\ntask.status = failed\nincrement retry counter]
  R7 --> R9[notify: UI toast + messenger]
  R8 --> R9
  R9 --> R10[cleanupWorktree]
```

---

## 2.0 Data Model Additions (New Tables)

New DB tables added in the Project OS renewal (2.0). Existing `projects`, `agents`, and `departments` tables are retained; the tables below are added.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `categories` | Project type definitions (categories) | `id`, `name`, `slug`, `description`, `icon`, `color`, `kpi_schema`, `risk_schema`, `gate_schema`, `deliverable_schema`, `is_template`, `version`, `owner_scope` |
| `category_versions` | Category version history | `id`, `category_id`, `version`, `snapshot_json`, `created_at` |
| `project_agents` | Project-agent team join table (junction) | `project_id`, `agent_id`, `added_at` |
| `project_objectives` | Project objectives | `id`, `project_id`, `title`, `description`, `status`, `order` |
| `project_risks` | Project risks | `id`, `project_id`, `title`, `severity`, `status`, `mitigation` |
| `project_gates` | Project review stages | `id`, `project_id`, `title`, `status`, `due_date`, `criteria` |
| `project_outputs` | Project planned deliverables (deliverable types) | `id`, `project_id`, `title`, `type`, `status`, `url` |

> **Note**: `project_outputs` are project-level planned deliverables (PRDs, API specs, etc.).
> Task execution result files use the existing `deliverables` / `task_reports` tables.

Columns added to the `projects` table:
- `category_id` — references `categories.id`
- `category_version` — category version pinned at creation time (for reproducibility)
- `success_metric` — JSON (overrides category `kpi_schema`)
- `risk_profile` — JSON
- `required_gates` — JSON array
- `deliverable_schema` — JSON

Detailed API: [specs/api.md §2.0 Categories & Project Teams](../specs/api.md)
Detailed UX: [design/UI-SCREENS.md](../design/UI-SCREENS.md)
