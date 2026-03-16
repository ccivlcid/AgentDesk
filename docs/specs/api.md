# API Contract Baseline

This document defines a contributor-facing API baseline for AgentDesk.
It is intentionally compact and focused on frequently used endpoints.
Current baseline target: `v1.4.0` (local snapshot, 2026-03-16).

## Base

- Base URL (local): `http://127.0.0.1:8790`
- API prefix: `/api`
- Health endpoint: `/healthz`
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/openapi.json`

## Authentication

- Loopback/local usage usually works without extra headers.
- Remote/non-loopback deployments can require:
  - `Authorization: Bearer <API_AUTH_TOKEN>`
- Inbox webhook endpoint requires:
  - `x-inbox-secret: <INBOX_WEBHOOK_SECRET>`
- Browser session bootstrap (`GET /api/auth/session`) returns `csrf_token`.
  - For cookie-authenticated mutation requests (`POST/PUT/PATCH/DELETE`), send:
    - `x-csrf-token: <csrf_token>`
- Interrupt injection endpoint (`POST /api/tasks/:id/inject`) additionally requires:
  - `session_id`
  - `interrupt_token` (or header `x-task-interrupt-token`)
  - Terminal API (`GET /api/tasks/:id/terminal`) exposes `interrupt.session_id` + `interrupt.control_token`
- Swagger note:
  - `/api/docs` opens with an automatic `/api/auth/session` bootstrap attempt (loopback/local case).
  - If you still get `401 unauthorized`, set `Bearer <API_AUTH_TOKEN>` via Swagger `Authorize`.

## Common Error Shape

Error payloads can vary by route, but API clients should handle:

```json
{
  "error": "error_code",
  "message": "human-readable detail"
}
```

The frontend client wraps non-2xx responses with `ApiRequestError` (`status`, `code`, `details`, `url`).

## Messenger Session Contract (v1.2.3)

Messenger channel settings are stored in `settings.key = "messengerChannels"` and can include:

- `token`: channel token (encrypted at rest with AES-256-GCM using `OAUTH_ENCRYPTION_SECRET`, fallback: `SESSION_SECRET`)
- `sessions[]`:
  - `id`
  - `name`
  - `targetId`
  - `enabled` (default true)
  - `agentId` (optional, binds session to a specific agent for direct chat/task routing)

Supported channel ids (AgentDesk parity):

- `telegram`
- `whatsapp`
- `discord`
- `googlechat`
- `slack`
- `signal`
- `imessage`

Runtime behavior highlights:

- Task report relays are route-pinned to the task's originating messenger target (`[messenger-route]` audit marker in task logs).
- Channel spread is prevented for route-pinned task reports.
- Typing indicators are emitted during direct-chat generation for Telegram/Discord; other channels are no-op.
- Native direct send runtime exists for all AgentDesk-parity channels (`telegram`, `whatsapp`, `discord`, `googlechat`, `slack`, `signal`, `imessage`).
- Per-channel setup requirements differ (e.g., WhatsApp Cloud API token + phone number id, Google Chat webhook URL or `key|token`, Signal RPC base URL, macOS iMessage runtime).
- New project creation path in direct-chat escalation is restricted by `PROJECT_PATH_ALLOWED_ROOTS`.

**Direct chat / Messenger prefixes**

- `$` — Company-wide directive (Client Directive). Messages starting with `$` via inbox webhook etc. are processed as company-wide instruction flows: planning team assembly, team lead meetings, task assignment, etc.
- `!` — Explicit "work task" during general chat. Messages to an agent starting with `!` have the prefix stripped and are treated as work tasks (task flow); the agent will request project selection if needed. Example: `!Check Naver Finance` → processed as a task, `Check Naver Finance` → treated as an information request with a general reply.

## Core Endpoint Groups

### Messenger (Built-in Channels)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/messenger/sessions` | List runtime messenger sessions resolved from persisted settings |
| GET | `/api/messenger/receiver/telegram` | Telegram webhook/poll receiver status |
| GET | `/api/messenger/receiver/discord` | Discord polling receiver status |
| GET | `/api/messenger/receiver/slack` | Slack polling receiver status (Bot Token `xoxb-...`) |
| POST | `/api/messenger/discord/channels` | Discover accessible Discord text channels by Bot token |
| POST | `/api/messenger/send` | Send message by `sessionKey` or (`channel` + `targetId`) |

`POST /api/messenger/send` request body:

```json
{
  "sessionKey": "telegram:my-session",
  "text": "hello"
}
```

or

```json
{
  "channel": "discord",
  "targetId": "123456789012345678",
  "text": "hello"
}
```

### Workflow Pack Routing

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/workflow-packs` | List workflow packs and effective enable state |
| PUT | `/api/workflow-packs/:key` | Update workflow pack metadata/flags/json fields |
| POST | `/api/workflow/route` | Resolve workflow pack by explicit/session/project/text context |

### Runtime / Org

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department |
| PATCH | `/api/departments/:id` | Update department |
| PATCH | `/api/departments/reorder` | Reorder departments |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| PATCH | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| GET | `/api/stats` | Dashboard/company stats |
| GET | `/api/settings` | Read settings |
| PUT | `/api/settings` | Save settings |

### Tasks / Execution

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tasks` | List tasks (supports filters) |
| GET | `/api/tasks/:id` | Task detail |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/assign` | Assign agent |
| POST | `/api/tasks/:id/run` | Start task |
| POST | `/api/tasks/:id/stop` | Cancel or pause task |
| POST | `/api/tasks/:id/resume` | Resume paused task |
| POST | `/api/tasks/:id/inject` | Queue sanitized interrupt prompt (paused session) |
| GET | `/api/tasks/:id/terminal` | Task terminal logs |
| GET | `/api/tasks/:id/meeting-minutes` | Meeting minutes |
| GET | `/api/subtasks?active=1` | Active subtasks |
| POST | `/api/tasks/:id/subtasks` | Create subtask |
| PATCH | `/api/subtasks/:id` | Update subtask |

`GET /api/tasks` supports query filters: `status`, `department_id`, `agent_id`, `project_id`, `workflow_pack_key`.

### Messaging / Inbox / Decision

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/messages` | Message history |
| POST | `/api/messages` | Send message |
| POST | `/api/announcements` | Broadcast announcement |
| POST | `/api/directives` | Send directive |
| DELETE | `/api/messages` | Clear messages |
| POST | `/api/inbox` | External webhook ingestion |
| GET | `/api/decision-inbox` | Decision inbox items |
| POST | `/api/decision-inbox/:id/reply` | Decision reply |

### Skills / Providers / OAuth

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/skills` | Skill catalog |
| GET | `/api/skills/detail` | Skill detail |
| POST | `/api/skills/learn` | Start learn job |
| GET | `/api/skills/learn/:jobId` | Learn job status |
| GET | `/api/skills/history` | Learn history |
| POST | `/api/skills/unlearn` | Unlearn skill |
| POST | `/api/skills/custom` | Upload custom skill |
| GET | `/api/skills/custom` | List custom skills |
| DELETE | `/api/skills/custom/:skillName` | Delete custom skill |
| GET | `/api/api-providers` | List API providers |
| POST | `/api/api-providers` | Create API provider |
| PUT | `/api/api-providers/:id` | Update API provider |
| DELETE | `/api/api-providers/:id` | Delete API provider |
| GET | `/api/oauth/status` | OAuth status |
| POST | `/api/oauth/disconnect` | OAuth disconnect |
| POST | `/api/oauth/refresh` | OAuth token refresh |

### Project / GitHub / Update

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/path-check` | Validate project path |
| GET | `/api/projects/path-suggestions` | Suggested paths |
| POST | `/api/projects/path-native-picker` | Native path picker |
| GET | `/api/projects/:id/cost-summary` | Per-project cost aggregation |
| GET | `/api/agents/:id/cost-summary` | Per-agent cost aggregation |
| GET | `/api/cost-summary` | Company-wide cost aggregation |
| GET | `/api/project-templates` | List project templates |
| POST | `/api/project-templates` | Create project template |
| DELETE | `/api/project-templates/:templateId` | Delete project template |
| POST | `/api/projects/:id/apply-template/:templateId` | Apply a template to a project |
| GET | `/api/github/status` | GitHub integration status |
| GET | `/api/github/repos` | Repositories |
| POST | `/api/github/clone` | Clone repository |
| GET | `/api/update-status` | Update status |
| POST | `/api/update-auto-config` | Toggle auto update |

`GET /api/projects/:id/cost-summary` response shape:
```json
{
  "project_id": "uuid",
  "total_input_tokens": 12000,
  "total_output_tokens": 4800,
  "total_cost_usd": 0.042,
  "by_agent": [
    { "agent_id": "uuid", "agent_name": "string", "cost_usd": 0.012 }
  ]
}
```

### 2.0 Categories & Project Team (Phase 1–2 New Endpoints)

> **2.0 Renewal** endpoints. Implementation: `server/modules/routes/core/categories.ts`, `project-dashboard.ts`.

#### Categories (Project Types)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/categories` | List categories (system templates + user-defined) |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/:id` | Update category (auto-increments version) |
| DELETE | `/api/categories/:id` | Delete category (system templates cannot be deleted) |
| GET | `/api/categories/:id/versions` | Version history |
| POST | `/api/categories/:id/clone` | Clone category |

`GET /api/categories` response fields: `id`, `name`, `slug`, `description`, `icon`, `color`, `kpi_schema`, `risk_schema`, `gate_schema`, `deliverable_schema`, `is_template`, `version`, `owner_scope`

`PATCH /api/categories/:id` behavior:
- `version` is automatically incremented on update
- Existing projects' `category_version` is not changed (ensures reproducibility)

#### Project Team (Project Members)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:id/agents` | List project team members |
| POST | `/api/projects/:id/agents` | Add team member (`{ agent_id }`) |
| DELETE | `/api/projects/:id/agents/:agentId` | Remove team member |

#### Project Dashboard Quadrants

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/projects/:id/objectives` | List objectives |
| POST | `/api/projects/:id/objectives` | Add objective |
| PATCH | `/api/projects/:id/objectives/:objId` | Update objective |
| DELETE | `/api/projects/:id/objectives/:objId` | Delete objective |
| GET | `/api/projects/:id/risks` | List risks |
| POST | `/api/projects/:id/risks` | Add risk |
| PATCH | `/api/projects/:id/risks/:riskId` | Update risk |
| DELETE | `/api/projects/:id/risks/:riskId` | Delete risk |
| GET | `/api/projects/:id/gates` | List review gates |
| POST | `/api/projects/:id/gates` | Add review gate |
| PATCH | `/api/projects/:id/gates/:gateId` | Update review gate (including status) |
| DELETE | `/api/projects/:id/gates/:gateId` | Delete review gate |
| GET | `/api/projects/:id/outputs` | List outputs |
| POST | `/api/projects/:id/outputs` | Add output item |
| PATCH | `/api/projects/:id/outputs/:outputId` | Update output |
| DELETE | `/api/projects/:id/outputs/:outputId` | Delete output |

> **Note**: `/api/projects/:id/outputs` represents project-level planned deliverables (PRD, API specs, etc.).
> Task execution artifacts (files, Git diffs) use the existing `/api/deliverables` and `/api/task-reports/:id/artifacts`.

#### Projects — Extended Existing Endpoints

`POST /api/projects` request body with 2.0 fields:
```json
{
  "name": "string",
  "category_id": "string",       // optional; defaults to Custom Blank if omitted
  "description": "string"
}
```

Additional response fields: `category_id`, `category_version`, `success_metric`, `risk_profile`, `required_gates`, `deliverable_schema`

---

### Rules / Memory / Hooks

Endpoints for managing rules, memory, and hooks that are automatically injected into agent prompts.

#### Agent Rules

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/agent-rules` | List rules |
| POST | `/api/agent-rules` | Create rule |
| PATCH | `/api/agent-rules/:id` | Update rule / toggle active |
| DELETE | `/api/agent-rules/:id` | Delete rule |

`GET /api/agent-rules` query parameters:

| Parameter | Description |
| --- | --- |
| `project_id` | Returns only rules for agents assigned to the given project (project-scope + their agent-scope + global). Takes precedence over `scope_type`/`scope_id` |
| `scope_type` | `global` \| `agent` \| `department` \| `workflow_pack` \| `project` |
| `scope_id` | ID of the scope target |
| `enabled` | `1` \| `0` |

#### Memory

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/memory` | List memory entries |
| POST | `/api/memory` | Create memory entry |
| PATCH | `/api/memory/:id` | Update memory entry |
| DELETE | `/api/memory/:id` | Delete memory entry |

`GET /api/memory` query parameters: `project_id`, `scope_type`, `scope_id`, `enabled` (same behavior as Rules)

#### Hooks

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/hooks` | List hooks |
| POST | `/api/hooks` | Create hook |
| PATCH | `/api/hooks/:id` | Update hook |
| DELETE | `/api/hooks/:id` | Delete hook |

`GET /api/hooks` query parameters: `project_id`, `event_type`, `scope_type`, `scope_id`, `enabled` (`project_id` behaves the same as in Rules)

#### Skills (History / Available)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/skills/history` | Skill learning history |
| GET | `/api/skills/available` | List learned skills |

Both endpoints support the `project_id` parameter: returns only skills for agents assigned to the given project (project-scope + their agent-scope + global).

> **`project_id` filter logic**: Joins the `project_agents` table to include only `scope_type='agent'` entries for agents assigned to the project. Also includes `scope_type='global'` and `scope_type='project' AND scope_id=<project_id>`.

---

## Agent Composition Templates

Used for saving and loading agent composition canvases (Workflow → Composition tab).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/composition-templates` | List all templates (ordered by updated_at DESC) |
| POST | `/api/composition-templates` | Create template |
| PUT | `/api/composition-templates/:id` | Update template |
| DELETE | `/api/composition-templates/:id` | Delete template |

### POST/PUT Request Body

```json
{
  "name": "string (required, max 120 chars)",
  "description": "string (optional, max 400 chars)",
  "nodes": [...],
  "edges": [...]
}
```

`nodes` and `edges` are serialized directly as `@xyflow/react` Node/Edge arrays. Stored in DB as `nodes_json` and `edges_json` columns.

### GET Response

```json
{
  "ok": true,
  "templates": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "nodes_json": "[...]",
      "edges_json": "[...]",
      "created_at": 1741234567890,
      "updated_at": 1741234567890
    }
  ]
}
```

> **DB table:** `agent_composition_templates` (migration `2026-03-14-011`)
> **Route file:** `server/modules/routes/ops/composition-templates.ts`

---

## Workflow Schedules (v1.3.0)

Cron-based scheduling for workflow templates. Each schedule fires agent-node tasks when `next_run_at <= now`.

> **Route file:** `server/modules/routes/ops/workflow-schedules.ts`
> **DB table:** `workflow_schedules` (migration `2026-03-17-001`)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/workflow-schedules` | List schedules (optional `?template_id=`) |
| POST | `/api/workflow-schedules` | Create schedule |
| PUT | `/api/workflow-schedules/:id` | Update schedule (toggle enabled or change cron) |
| DELETE | `/api/workflow-schedules/:id` | Delete schedule |

`POST /api/workflow-schedules` request body:
```json
{
  "template_id": "uuid",
  "cron_expr": "0 9 * * 1-5",
  "enabled": true
}
```

`GET /api/workflow-schedules` response:
```json
{
  "ok": true,
  "schedules": [
    {
      "id": "uuid",
      "template_id": "uuid",
      "template_name": "string",
      "cron_expr": "*/5 * * * *",
      "enabled": 1,
      "last_run_at": 1741234567890,
      "next_run_at": 1741234567890,
      "created_at": 1741234567890
    }
  ]
}
```

Supported cron fields: minute (0–59), hour (0–23), day-of-month (1–31), month (1–12), day-of-week (0–7, 0=7=Sunday). Supports `*`, `*/step`, `a-b`, and literals.

---

## Agent Performance (v1.3.0)

> **Route file:** `server/modules/routes/ops/agent-performance.ts`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/agents/performance` | Aggregated performance stats per agent |

`GET /api/agents/performance` query parameters:

| Parameter | Description |
| --- | --- |
| `project_id` | Filter to project-assigned agents |
| `days` | Lookback window in days (default 30) |

Response shape per agent:
```json
{
  "agents": [
    {
      "id": "uuid",
      "name": "string",
      "avatar_emoji": "🤖",
      "total": 42,
      "done": 35,
      "cancelled": 2,
      "failed_exec": 1,
      "in_progress": 2,
      "review": 1,
      "planned": 1,
      "success_rate": 0.875,
      "avg_duration_ms": 120000,
      "trend": [3, 5, 4, 6, 5, 4, 8],
      "day_labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    }
  ]
}
```

---

## Data Export (v1.3.0)

> **Route file:** `server/modules/routes/ops/data-export.ts`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/export` | Download data as CSV or JSON |

`GET /api/export` query parameters:

| Parameter | Values | Description |
| --- | --- | --- |
| `type` | `tasks` \| `deliverables` \| `agents` \| `costs` | Data type to export |
| `format` | `csv` \| `json` | Output format (default `csv`) |
| `project_id` | uuid | Filter by project |
| `status` | task status | Filter tasks by status |
| `since` | ms timestamp | Start of date range |
| `until` | ms timestamp | End of date range |

- CSV output includes UTF-8 BOM prefix (`\uFEFF`) for Excel compatibility
- Response header: `Content-Disposition: attachment; filename="<type>-<date>.<ext>"`
- Tasks export includes `duration_ms` column (completed_at − started_at)
- Costs export reads from `cli_usage_cache` table

---

## Server-Only / Other Endpoints (Not Covered Here)

The following endpoints are registered on the server but omitted from this baseline. See `server/modules/routes/**/*.ts` for the full list.

- **Agents:** `GET /api/agents/active`, `GET /api/agents/cli-processes`, `POST /api/agents/:id/spawn`, `POST/DELETE /api/agents/:id/avatar`
- **Tasks:** `GET /api/tasks/:id/execution`, `GET /api/tasks/:id/execution-events`, `GET /api/tasks/:id/dependencies`, `POST /api/tasks/:id/dependencies` (see below), `DELETE /api/tasks/:id/dependencies/:depId`, `GET /api/tasks/:id/diff`, `POST /api/tasks/:id/merge`, `POST /api/tasks/:id/discard`, `POST /api/tasks/bulk-hide`

`POST /api/tasks/:id/dependencies` request body:
```json
{
  "depends_on_task_id": "uuid",
  "gate_condition": "success",
  "gate_branch": "true"
}
```
- `gate_condition` (optional): Expression evaluated when the upstream task completes. Supported values: `success` / `exit_code == 0`, `failure` / `exit_code != 0`, `result contains "keyword"`. Defaults to pass-through (always true) if omitted.
- `gate_branch` (optional): `"true"` | `"false"` — which condition-node branch this dependency follows. Used by the Workflow Builder when routing through a Condition node.
- If gate condition evaluates to false at runtime, the downstream task is set to `cancelled`.
- **Projects:** `GET /api/projects/:id`, `GET /api/projects/:id/burndown`, `GET /api/projects/path-browse`, `GET /api/projects/path-tree`, `GET /api/projects/:id/branches`, `GET /api/github/repos/:owner/:repo/branches`, `GET /api/github/clone/:cloneId`
- **Skills:** `GET /api/skills/available`, `GET /api/skills/custom/:skillName/export`, `POST /api/skills/custom/import`
- **Other:** `GET /api/agent-usage`, `GET /api/agent-usage/trends/daily`, `GET /api/agent-usage/:agentId`, `GET /api/decision-inbox`, etc. task-reports, deliverables, pipeline-gates, webhooks, backup, notifications, task-templates, custom-packs, worktrees, cli-usage, cost-alerts, oauth callback/device flow, update-auto-status, update-apply, etc. — see server route registration files.

## OpenAPI

- **Spec file:** `docs/specs/openapi.json`
- **Serving:** The server reads this file and serves it at `GET /api/openapi.json`; Swagger UI is available at `/api/docs`.
- **Load path:** Server code `server/modules/routes/ops/api-docs.ts` uses `docs/specs/openapi.json`.

## Local LLM Manager API

Base prefix: `/api/local-llm`

### Backends

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/local-llm/backends` | List all backends with status (Ollama, LM Studio, llama.cpp, Jan) |
| `POST` | `/api/local-llm/backends/:name/start` | Start backend (Ollama only; LM Studio returns `manual:true`) |
| `POST` | `/api/local-llm/backends/:name/stop` | Stop backend (Ollama only) |
| `POST` | `/api/local-llm/backends/:name/restart` | Restart backend (Ollama only) |

**BackendInfo response shape:**
```json
{
  "name": "ollama",
  "label": "Ollama",
  "installed": true,
  "version": "0.3.4",
  "running": true,
  "port": 11434,
  "base_url": "http://localhost:11434/v1",
  "model_count": 3
}
```

### Models

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/local-llm/models` | List installed models (from Ollama) |
| `GET` | `/api/local-llm/models/gallery` | Gallery of 20 recommended models |
| `POST` | `/api/local-llm/models/pull` | Pull (download) a model; progress broadcast via WS `local_llm_pull_progress` |
| `DELETE` | `/api/local-llm/models/:name` | Delete an installed model |
| `POST` | `/api/local-llm/sync` | Sync Ollama model list → `local_llm_models` DB table |

**Pull request body:** `{ "model_name": "llama3.2:3b", "backend": "ollama" }`

**WS broadcast `local_llm_pull_progress`:**
```json
{ "model": "llama3.2:3b", "status": "downloading|done|error", "percent": 42 }
```

### Providers (Agent Integration)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/local-llm/providers` | List all local LLM models as provider options (Ollama + LM Studio) |
| `POST` | `/api/local-llm/providers/test` | Ping a backend to check if it's running |
| `POST` | `/api/local-llm/setup-provider` | Auto-register Ollama or LM Studio as an `api_providers` entry |

`POST /api/local-llm/setup-provider` request body:
```json
{ "backend": "ollama" }
```
or
```json
{ "backend": "lmstudio" }
```

- Looks up an existing `api_providers` row by `base_url` (Ollama: `http://localhost:11434/v1`, LM Studio: `http://localhost:1234/v1`).
- If none found, pings the backend; on success creates a new entry in `api_providers` with `type: "ollama"` or `type: "custom"` respectively.
- Response: `{ "ok": true, "provider_id": "<uuid>" }`
- On failure (backend not reachable): `{ "ok": false, "error": "backend_not_reachable" }`

### Metrics & Monitoring

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/local-llm/metrics` | Current GPU/RAM/inference snapshot |
| `GET` | `/api/local-llm/metrics/history?limit=50` | Recent inference log rows (joined with agent names) |
| `GET` | `/api/local-llm/metrics/stats` | Per-model aggregates (total tokens, avg t/s, avg latency) |
| `POST` | `/api/local-llm/log` | Record inference event (internal use) |

**Metrics snapshot shape:**
```json
{
  "gpu": { "name": "RTX 4090", "vram_total_bytes": ..., "vram_used_bytes": ..., "utilization_percent": 42 },
  "ram": { "total_bytes": ..., "used_bytes": ..., "utilization_percent": 68 },
  "inference": { "active_model": "llama3.2:3b", "tokens_per_second": 28.4 },
  "collected_at": 1710000000000
}
```

Metrics are also pushed via WebSocket every 5 seconds as `local_llm_metrics`.

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/local-llm/settings` | Get backend settings (host, port, auto_start) |
| `PATCH` | `/api/local-llm/settings/:name` | Update settings for a backend (e.g. `ollama`) |

### Inference Logging (Phase 20)

When an agent executes a task via a local LLM provider (`api_provider_id` set, type = `ollama`/`lmstudio`/`openai`), completion stats are automatically recorded:
- Token counts extracted from OpenAI-compatible SSE `usage` field
- `latency_ms` measured from request start to stream end
- `tokens_per_second` derived from completion tokens ÷ latency
- Stored in `local_llm_inference_log` table, visible in Monitor tab

---

## Known Follow-up

- Incrementally expand the OpenAPI spec: auth/session, tasks/subtasks, inbox/directives, project/github, categories, project team, dashboard quadrants, etc.
