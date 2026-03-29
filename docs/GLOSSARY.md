# AgentDesk Glossary

> Domain terminology reference for AI agents and developers.
> Last updated: 2026-03-28 (Phase 26 Developer OS 전환 — 제거 기능 반영)

---

## Organizational Structure


| Term             | DB Name               | UI Display                    | Definition                                                                                                                   |
| ---------------- | --------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Department**   | `departments`         | Specialty Area                | Agent group organized by expertise domain (dev, planning, design), NOT org hierarchy                                         |
| **Agent**        | `agents`              | —                             | AI runtime process with role, department, persona, and execution capability                                                  |
| **Agent Role**   | `agents.role`         | PM / Senior / Junior          | Seniority level: `team_leader`→PM, `senior`→Senior, `junior`→Junior, `intern`→(removed) |
| **Agent Status** | `agents.status`       | —                             | `idle` | `working` | `break` | `offline`                                                                                     |
| **CLI Provider** | `agents.cli_provider` | —                             | Execution backend: `claude` | `codex` | `gemini` | `opencode` | `copilot` | `antigravity` | `cursor` | `api` | `ollama`      |
| **Persona**      | `agents.persona_id`   | —                             | Thinking style profile (structured, creative, analytical, empathetic, strategic, pragmatic)                                  |


---

## Project Structure


| Term                | DB Name                    | Definition                                                                                                      |
| ------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Project**         | `projects`                 | Workspace with goal, directive, assigned agents, and tasks                                                      |
| **Core Goal**       | `projects.core_goal`       | One-line project objective                                                                                      |
| **Project Path**    | `projects.project_path`    | File system location for agent operations                                                                       |
| **Directive**       | `projects.directive`       | Markdown document with work principles injected into all agent prompts                                          |
| **Category**        | `categories`               | Project type template: MVP, Full-Stack, Mobile, API, Frontend, AI/ML, Open-Source, DevOps, Enterprise, Research |
| **Assignment Mode** | `projects.assignment_mode` | `auto` (system assigns) | `manual` (PM assigns)                                                                 |
| **Project Agents**  | `project_agents`           | N:M agent-to-project mapping with roles: PM, PL (Project Lead), Dev                                             |


### Category Slugs


| Slug          | Name                   | Departments                                      |
| ------------- | ---------------------- | ------------------------------------------------ |
| `mvp`         | MVP / Rapid Validation | dev, planning                                    |
| `fullstack`   | Full-Stack Product     | dev, qa, design, operations, devsecops, planning |
| `mobile`      | Mobile App             | dev, design, qa                                  |
| `api-backend` | API / Backend          | dev, qa, devsecops                               |
| `frontend`    | Frontend               | dev, design, qa                                  |
| `ai-ml`       | AI / ML Pipeline       | dev, planning, qa                                |
| `open-source` | Open-Source Library    | dev, qa, planning                                |
| `devops`      | Automation / DevOps    | dev, operations, devsecops                       |
| `enterprise`  | Enterprise / Legacy    | dev, qa, planning, operations, devsecops         |
| `research`    | Research / PoC         | planning, dev                                    |


---

## Task Execution


| Term                | DB Name                                                 | Definition                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task**            | `tasks`                                                 | Unit of work assigned to an agent with status, execution state, and result                                                                                                                                                               |
| **Task Status**     | `tasks.status`                                          | User-visible task lifecycle. Current type includes `inbox` | `planned` | `collaborating` | `in_progress` | `review` | `done` | `pending` | `failed` | `cancelled`                                                                        |
| **Execution State** | `tasks.execution_state`                                 | Engine-internal lifecycle. Current type includes `queued` | `claiming` | `workspace_preparing` | `ready` | `running` | `awaiting_review` | `retry_backoff` | `blocked` | `stalled` | `recovering` | `succeeded` | `failed` | `cancelled` |
| **Subtask**         | `subtasks`                                              | Decomposed unit delegated during execution. Status: `pending` | `in_progress` | `done` | `blocked`                                                                                                                                       |
| **Task Type**       | `tasks.task_type`                                       | `general` | `development` | `design` | `analysis` | `presentation` | `documentation`                                                                                                                                                     |
| **Workflow Pack**   | `tasks.workflow_pack_key`                               | Execution template: `development`                                                                                                                                                                                                        |
| **Task Handoff**    | `tasks.handoff_to_agent_id` + `tasks.handoff_condition` | Optional post-task transfer. `handoff_to_agent_id` stores the target agent, `handoff_condition` stores `always` | `on_success` | `on_fail`                                                                                               |
| **Task Report**     | `task_report_archives`                                  | Archived deliverables and execution summary                                                                                                                                                                                              |


### Task Status Flow

```
inbox → planned → collaborating / in_progress → review → done
                                                   ↓
                                              (PM revises)
                                                   ↓
                                               planned (retry)
```

### Execution State Flow

```
queued → claiming → workspace_preparing → ready → running → awaiting_review / succeeded / failed
                                                     ↓
                        retry_backoff / blocked / stalled / recovering / cancelled
```

---

## Workflow & Orchestration


| Term                         | Definition                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Kickoff**                  | Automated project initialization: meeting → planning → assigning → executing → done                                            |
| **Kickoff Stage**            | `idle` | `meeting` | `planning` | `assigning` | `executing` | `done`                                                           |
| **Add Tasks**                | Append new tasks to existing project without full re-kickoff (POST /api/projects/:id/add-tasks)                                |
| **PM Orchestrator**          | PM agent's autonomous decision system for review, approval, revision, reassignment                                             |
| **PM Review**                | LLM-powered 4-point evaluation: scope match, errors, minimal scope, completeness                                               |
| **finishReview**             | Action after PM approval: status→done, progress.md write, ship automation, start next task                                     |
| **Ship Automation**          | Auto version bump (patch), CHANGELOG generation, file sync on task completion                                                  |
| **YOLO Mode**                | `bypassProjectDecisionGate=true` — PM decides autonomously, user decision gateway disabled                                     |
| **Evidence-Based Execution** | Agents must cite file/line references, no speculation. 3-strike escalation rule                                                |
| **Meeting Minutes**          | `meeting_minutes` + `meeting_minute_entries` — records of kickoff/review meetings                                              |
| **Progress.md**              | PM-written post-task doc: validation result, agent name, changes, PM opinion                                                   |
| **Clarification**            | Kickoff Q&A when LLM needs user input before task planning                                                                     |
| **Planned Approval**         | Checkpoint before execution begins — PM or user approves plan before agents start (`orchestration/planned-approval.ts`)        |
| **Auto-Learning**            | Post-task extraction of reusable rules and memory snippets from execution results (`orchestration/auto-learning.ts`)           |
| **Autonomous Memory**        | Self-updating persistent context PM writes after reviewing completed tasks (`orchestration/autonomous-memory.ts`)              |
| **Leader Selection**         | Algorithm to elect a meeting facilitator among available agents (`meetings/leader-selection.ts`)                               |
| **Review Consensus**         | Multi-agent agreement mechanism for PM review decisions (`meetings/review-consensus.ts`)                                       |
| **Task Scheduler**           | Orchestration-level cron for scheduled task triggering within a project (`orchestration/task-scheduler.ts`)                    |


### PM Decision Matrix


| Decision     | Action                                                       |
| ------------ | ------------------------------------------------------------ |
| **APPROVE**  | finishReview() → status "done" → ship automation → next task |
| **REVISE**   | Status → "planned" → re-execute with PM feedback             |
| **RETRY**    | Exponential backoff, up to 3 strikes                         |
| **REASSIGN** | Assign to different agent                                    |
| **ESCALATE** | Notify user (3 consecutive failures)                         |


---

## Agent Runtime


| Term                | Definition                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Execution Loop**  | Core cycle: prompt assembly → LLM API streaming → tool use → result → repeat                               |
| **Tool Use**        | Agent's autonomous tool invocation: `list_files`, `read_file`, `write_file`, `run_command`, `search_files` |
| **Tool Executor**   | Safely executes LLM tool calls within project_path sandbox                                                 |
| **Runtime Engine**  | LLM streaming + tool use loop (alternative: CLI Mode with external CLI tools)                              |
| **CLI Mode**        | Execution via external CLI (claude, codex, gemini) spawned as PTY processes                                |
| **Prompt Assembly** | Dynamic composition: persona + directive + rules + memory + hooks + task description                       |
| **Runtime Runs**    | `agent_runtime_runs` — execution records with tokens, timing, status                                       |
| **Runtime Events**  | `agent_runtime_events` — sequential event log (text, tool_call, tool_result, error)                        |
| **Worktree**        | Isolated git worktree per task for safe simultaneous execution                                             |
| **PTY**             | Pseudo-terminal for CLI mode output streaming                                                              |


---

## Library & Behavior


| Term              | DB Name          | Definition                                                                                                                       |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Skills**        | `agent_skills`   | Reusable task templates and tool commands learned from execution                                                                 |
| **Rules**         | `agent_rules`    | Behavioral constraints injected into prompts. Categories: coding, communication, quality, execution, security, workflow, general |
| **Memory**        | `memory_entries` | Persistent context snippets. Categories: context, preference, convention, knowledge, instruction, reference                      |
| **Hooks**         | `hook_entries`   | Scripts triggered on task events: pre-task, post-task, on-error, on-complete, on-status-change, on-start                         |
| **Auto-Learning** | —                | PM-driven extraction of rules/memory from completed tasks                                                                        |
| **Retrospective** | —                | PM-generated project completion summary with lessons learned                                                                     |


### Scope Priority (highest → lowest)

```
project > agent > department > workflow_pack > global
```

---

## Messaging & Collaboration


| Term                    | DB Name                   | Definition                                                                                                                    |
| ----------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Decision Inbox**      | `decision_inbox_messages` | Queue of mid-task decisions agents request from users                                                                         |
| **Cross-Dept Delivery** | —                         | Task handoff between agents of different departments (removed)                                                                |
| **Client Office Call**  | —                         | Meeting room interaction during kickoff/review phases                                                                         |

### Messenger Channels

> (UI removed, type retained) The Messenger UI was removed in Phase 26. The `MessengerChannelType` type definition remains in `src/types/index.ts`.

Supported external messenger channel types (`MessengerChannelType` in `src/types/index.ts`):

| Channel       | Key            | Notes                              |
| ------------- | -------------- | ---------------------------------- |
| Slack         | `slack`        | Bot / webhook                      |

---

## Desktop Icon Types


| Term           | `project_type`    | 생성 경로                              | 설명                                                                         |
| -------------- | ----------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| **System App** | — (내장)            | 앱 시작 시 자동 생성                       | 바탕화면 고정 아이콘 (Agents, CLI, Decisions 등). `useDesktopIcons.tsx`에 하드코딩 |
| **Project**    | `"project"` (기본값) | 프로젝트 생성 → 바탕화면 폴더 아이콘              | 킥오프 가능, 태스크 보드 있음                                                          |
| **App**        | `"app"`           | Repo Store 클론 또는 Git Import 창에서 등록 | 킥오프 불가 (`app_cannot_kickoff`), 클릭 시 프로젝트 폴더 창 열림                         |


> 클릭 동작: `project_type === "app"` 이면 프로젝트 폴더 창 열림, `"project"`이면 동일하게 프로젝트 폴더 창 열림.

---

## macOS UX Features


| Feature                 | Trigger                      | Component              | Description                                       |
| ----------------------- | ---------------------------- | ---------------------- | ------------------------------------------------- |
| **Spotlight**           | `Ctrl+Shift+K` / `Cmd+K`     | CommandPalette.tsx     | Quick search/launch (640px centered)              |
| **Jiggle Mode**         | 600ms long-press on desktop  | Desktop.tsx            | Icon rearrangement/deletion mode                  |
| **Quick Look**          | `Space` (with icon selected) | QuickLook.tsx          | Side panel project preview                        |
| **Mission Control**     | `Ctrl+↑`                     | MissionControl.tsx     | All-windows overview grid                         |
| **Notification Center** | Bell icon                    | NotificationCenter.tsx | 320px right-slide notification panel              |
| **Dock**                | Always visible (bottom)      | Dock.tsx               | App launcher with popup menu                      |
| **App Menu**            | Click "AgentDesk"            | MenuBar.tsx            | Shortcuts / Mission Control / Export              |
| **Window Snap**         | Drag to edge                 | —                      | Snap positions: left, right, full, tl, tr, bl, br |


---

## Window Types


| WindowType       | Description                                    |
| ---------------- | ---------------------------------------------- |
| `library`        | Library (agents, skills, rules, memory, hooks) |
| `settings`       | Settings (API, general, OAuth, CLI, data)       |
| `agent-manager`  | Agent Manager (CRUD agents/departments)        |
| `cli`            | Agent CLI terminal                             |
| `tasks`          | Orchestration Timeline                         |
| `repo-store`     | Repo Store (GitHub trending + clone)           |
| `decision-inbox` | Decision Inbox                                 |
| `folder`         | Project Folder window                          |


---

## Advanced Features


| Term                      | Definition                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Repo Store**            | GitHub trending browser, clone, and project registration                                                               |
| **Performance Dashboard** | Agent success rate, completion time, activity metrics                                                                  |
| **GitLab Import**         | Import existing GitLab repositories as AgentDesk projects (`GitLabImportWindow` — component removed)                   |
| **One-Shot Runner**       | Single-pass agent execution without iterative loop — used for fast, bounded tasks (`workflow/core/one-shot-runner.ts`) |


---

## Infrastructure


| Term                   | Location                                        | Definition                                                                                            |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Event Bus**          | `server/lib/event-bus.ts`                       | Central event publication for task status changes and PM notifications                                |
| **WebSocket Hub**      | `server/ws/hub.ts`                              | Real-time broadcast: cli_output, task_update, agent_status, etc.                                      |
| **Pino Logger**        | `server/lib/logger.ts`                          | Structured logging (no console.log in server code)                                                    |
| **Cron Parser**        | `server/modules/workflow/cron-utils.ts`         | 5-field cron expression parser (no external deps)                                                     |
| **Pipeline Gates**     | `pipeline_gates`                                | Quality checkpoints: auto or manual approval                                                          |
| **Deferred Runtime**   | `server/modules/deferred-runtime.ts`            | Lazy-initialized runtime modules loaded on first use (avoids startup cost)                            |


---

## Localization (i18n)


| Term             | Definition                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `**t()` helper** | Inline translation function — `t({ ko: "저장", en: "Save", ja: "保存", zh: "保存" })`. Hard-coded strings are forbidden in UI. |
| **UI Language**  | User-selectable: `ko` (Korean) | `en` (English) | `ja` (Japanese) | `zh` (Chinese). Stored in `uiStore`.                 |
| **i18n module**  | `src/i18n.ts` — returns correct string for current language; `src/i18n.test.ts` covers all keys                          |


---

## Configuration


| Term                 | Storage                | Definition                                                           |
| -------------------- | ---------------------- | -------------------------------------------------------------------- |
| **API Providers**    | `api_providers` table  | LLM service credentials (OpenAI, Anthropic, Gemini, Local)           |
| **Company Settings** | `settings` KV table    | Global config: company name, language, theme, YOLO mode, auto-assign |
| **OAuth Accounts**   | `oauth_accounts` table | Authenticated integrations (GitHub, Google)                          |
| **UI Language**      | uiStore                | `en` | `ko` | `ja` | `zh`                                            |


---

## API Conventions


| Pattern           | Format                                               |
| ----------------- | ---------------------------------------------------- |
| **Success**       | `res.json({ ok: true, ... })`                        |
| **Error**         | `res.status(4xx).json({ error: "snake_case_code" })` |
| **Auth (local)**  | No header required (loopback)                        |
| **Auth (remote)** | `Authorization: Bearer <API_AUTH_TOKEN>`             |
| **CSRF**          | `x-csrf-token` header (from GET /api/auth/session)   |
| **Inbox webhook** | `x-inbox-secret` header                              |


---

## Versioning & Migrations


| Term             | Definition                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| **Migration ID** | Format: `YYYY-MM-DD-NNN-short-description`. Last: `2026-03-29-011-agent-llm-distribution` → next: `2026-03-29-012-`* |
| **Append-Only**  | Never edit/delete existing migrations. DDL wrapped in try/catch                                                |
| **Version Bump** | Patch increment on task completion (0.1.2 → 0.1.3). Files: VERSION, package.json, CHANGELOG.md                 |


---

## Keyboard Shortcuts


| Shortcut                 | Action                          |
| ------------------------ | ------------------------------- |
| `Ctrl+Shift+K` / `Cmd+K` | Spotlight Search                |
| `Ctrl+↑`                 | Mission Control                 |
| `g l`                    | Toggle Library                  |
| `g s`                    | Toggle Settings                 |
| `g a`                    | Toggle Agent Manager            |
| `g e`                    | Toggle CLI                      |
| `Space`                  | Quick Look (with icon selected) |
| `Esc`                    | Exit overlay / close panel      |
| `?`                      | Keyboard shortcuts guide        |

