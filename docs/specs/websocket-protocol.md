# WebSocket Event Protocol

> Reference for all WebSocket events in AgentDesk.
> Last updated: 2026-03-24

---

## Connection

- **URL:** `ws://<host>/ws` (or `wss://` over HTTPS)
- **Default port:** `8790` (same as the API server)
- **Auth:** Cookie-based session (`agentdesk_session` cookie) or Bearer token. The server validates via `isIncomingMessageAuthenticated` — connections without a valid token are closed with code `1008`.
- **Max clients:** 20 concurrent WebSocket connections.
- **Reconnect:** The client auto-reconnects after 2 seconds on close. If closed with code `1008` (unauthorized), a forced session bootstrap is attempted before reconnecting.

### Wire Format

All messages (both directions) are JSON. Server-to-client messages follow this envelope:

```json
{
  "type": "<event_name>",
  "payload": { ... },
  "ts": 1711234567890
}
```

Client-to-server messages use a flat JSON object with a `type` field.

---

## Client-to-Server Messages

### subscribe_task

Subscribe to `cli_output` events for a specific task. Clients receive no `cli_output` events until they subscribe.

```json
{ "type": "subscribe_task", "taskId": "<task_id>" }
```

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Task ID to subscribe to |

### unsubscribe_task

Stop receiving `cli_output` events for a specific task.

```json
{ "type": "unsubscribe_task", "taskId": "<task_id>" }
```

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Task ID to unsubscribe from |

### pty_create

Spawn a new PTY (pseudo-terminal) shell session for the client.

```json
{
  "type": "pty_create",
  "id": "<session_id>",
  "cwd": "/path/to/dir",
  "cols": 120,
  "rows": 30,
  "shell": "/bin/bash",
  "taskId": "<task_id>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes | Unique session identifier |
| `cwd` | `string` | no | Working directory (defaults to `$HOME`) |
| `cols` | `number` | no | Terminal columns (default: 120) |
| `rows` | `number` | no | Terminal rows (default: 30) |
| `shell` | `string` | no | Shell executable (default: `$SHELL` or `/bin/bash`) |
| `taskId` | `string` | no | Link PTY output to a task's log |

**Response:** Server sends `pty_ready` back to the requesting client.

### pty_input

Send keyboard input to a PTY session.

```json
{ "type": "pty_input", "id": "<session_id>", "data": "ls -la\r" }
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |
| `data` | `string` | Raw input data |

### pty_resize

Resize a PTY session.

```json
{ "type": "pty_resize", "id": "<session_id>", "cols": 120, "rows": 40 }
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |
| `cols` | `number` | New column count |
| `rows` | `number` | New row count |

### pty_destroy

Kill a PTY session.

```json
{ "type": "pty_destroy", "id": "<session_id>" }
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |

---

## Server-to-Client Events

### Delivery Model

| Delivery | Event types | Description |
|----------|-------------|-------------|
| **Broadcast** | All events except `cli_output` and PTY events | Sent to every connected client |
| **Subscription-filtered** | `cli_output` | Sent only to clients that called `subscribe_task` for the matching `taskId` |
| **Single-client** | `pty_ready`, `pty_output`, `pty_exit` | Sent only to the client that owns the PTY session |

### Batching

High-frequency events are batched to reduce message volume:

| Event | Batch interval | Max queue |
|-------|---------------|-----------|
| `cli_output` | 250ms | 60 |
| `subtask_update` | 150ms | 60 |

The first event is sent immediately; subsequent events within the batch window are queued and flushed at the end of the interval. If the queue exceeds 60 items, the oldest are shed.

---

### task_update

A task row was created, updated, or deleted.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task ID |
| `status` | `string?` | New status (`planned`, `in_progress`, `review`, `done`, `failed`, etc.) |
| `deleted` | `boolean?` | `true` when the task has been deleted |
| *(all columns)* | | Full `SELECT * FROM tasks` row when available |

**Emitted by:** Task CRUD, kickoff pipeline, execution loop, PM orchestration, task delegation, recovery sweeps, subtask completion, Synapse rule engine, execution control (stop/pause/resume).

---

### agent_status

An agent's state changed (status, current task, break rotation, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Agent ID |
| `status` | `string?` | Agent status (`idle`, `working`, `break`, etc.) |
| `current_task_id` | `string?` | Currently assigned task |
| `subAgents` | `SubAgent[]?` | Optional inline sub-agent list |
| *(all columns)* | | Full `SELECT * FROM agents` row |

**Emitted by:** Task execution start/stop, agent PATCH, break rotation, task delegation, recovery sweeps, process inspector (force-stop), timeout enforcement.

---

### agent_created

A new agent was registered.

| Field | Type | Description |
|-------|------|-------------|
| *(all columns)* | | Full agent row |

**Emitted by:** `POST /api/agents` (agent creation route).

---

### agent_deleted

An agent was removed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Deleted agent ID |

**Emitted by:** `DELETE /api/agents/:id`.

---

### departments_changed

A department (specialty area) was created, updated, or deleted.

| Field | Type | Description |
|-------|------|-------------|
| `workflow_pack_key` | `string?` | Workflow pack key of the affected department |

**Emitted by:** Department CRUD routes.

---

### new_message

A new chat/report message was inserted.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Message ID |
| `sender_type` | `string` | `"agent"` or `"user"` |
| `sender_id` | `string?` | Sender agent/user ID |
| `receiver_type` | `string` | Target type |
| `receiver_id` | `string?` | Target ID |
| `content` | `string` | Message body |
| `message_type` | `string` | `"chat"`, `"report"`, etc. |
| `task_id` | `string?` | Related task |
| `created_at` | `number` | Timestamp (epoch ms) |

**Emitted by:** Messenger format-send, directive inbox message insertion, subtask completion notifications, PM progress notifications.

---

### announcement

A broadcast announcement message (sent to all agents).

| Field | Type | Description |
|-------|------|-------------|
| *(same as `new_message`)* | | Full message row |

**Emitted by:** Directive inbox announcement delegation, API directive route.

---

### cli_output

Streaming process stdout/stderr from a running task. **Subscription-filtered** -- only delivered to clients that have subscribed to the task via `subscribe_task`.

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | `string` | Task ID |
| `taskId` | `string` | Task ID (alias) |
| `data` | `string` | Output text chunk |
| `line` | `string` | Output text chunk (alias) |
| `stream` | `string?` | `"stdout"` or `"stderr"` |

Lines exceeding 4KB are split into multiple chunks automatically.

**Emitted by:** Agent runtime execution loop, one-shot runner.

---

### cli_usage_update

CLI usage/cost metrics updated.

| Field | Type | Description |
|-------|------|-------------|
| *(usage object)* | | Usage stats object from the worktree/usage tracker |

**Emitted by:** `POST /api/worktrees/:id/usage` (worktree usage update route).

---

### subtask_update

A subtask was created, updated, or completed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Subtask ID |
| `task_id` | `string` | Parent task ID |
| `status` | `string` | Subtask status |
| *(all columns)* | | Full `SELECT * FROM subtasks` row |

**Emitted by:** Subtask CRUD, subtask delegation, subtask seeding, subtask routing, cross-department subtasks, execution control, video render delegation.

---

### cross_dept_delivery

A cross-department artifact delivery occurred between agents.

| Field | Type | Description |
|-------|------|-------------|
| `from_agent_id` | `string` | Sending agent ID |
| `to_agent_id` | `string` | Receiving agent ID |

**Emitted by:** Cross-department cooperation routes, subtask delegation batch.

---

### client_office_call

An agent arrived at, spoke in, or left the client office (meeting room UI).

| Field | Type | Description |
|-------|------|-------------|
| `from_agent_id` | `string` | Agent ID |
| `seat_index` | `number?` | Seat position in the meeting room |
| `phase` | `string?` | `"kickoff"` or `"review"` |
| `action` | `string?` | `"arrive"`, `"speak"`, or `"dismiss"` |
| `line` | `string?` | Spoken text |
| `decision` | `string?` | Review decision (`"approve"`, `"revise"`, `"reviewing"`) |
| `task_id` | `string?` | Related task ID |
| `hold_until` | `number?` | Epoch ms until which the agent stays |

**Emitted by:** Kickoff pipeline (project kickoff and add-tasks meetings).

---

### chat_stream

Streaming chat response from an agent (token-by-token).

| Field | Type | Description |
|-------|------|-------------|
| `phase` | `string` | `"start"`, `"delta"`, or `"end"` |
| `message_id` | `string` | Message ID |
| `agent_id` | `string` | Responding agent ID |
| `agent_name` | `string?` | Agent display name (on `start`) |
| `agent_avatar` | `string?` | Agent avatar (on `start`) |
| `text` | `string?` | Delta text chunk (on `delta`) |
| `content` | `string?` | Full message content (on `end`) |
| `created_at` | `number?` | Timestamp (on `end`) |

**Emitted by:** Direct chat runtime reply handler.

---

### task_report

A task report was generated (PM review completed).

| Field | Type | Description |
|-------|------|-------------|
| `task` | `{ id: string }` | Reference to the task |

The client fetches the full report detail via `GET /api/tasks/:id/report` upon receiving this event.

**Emitted by:** Planning archive tools (after PM review finalization).

---

### notification

A system notification was created.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Notification ID |
| `type` | `string` | Notification type (e.g., `"cost_alert"`) |
| `title` | `string` | Notification title |
| `body` | `string` | Notification body |
| `read` | `number` | Read flag (0 = unread) |
| `created_at` | `number` | Epoch ms |

**Emitted by:** Notification routes, cost alert generation.

---

### queue_status

Agent execution queue status changed.

| Field | Type | Description |
|-------|------|-------------|
| `running` | `number` | Number of currently running agents |
| `queued` | `number` | Number of queued agents |
| `maxConcurrent` | `number` | Maximum concurrent agent limit |

**Emitted by:** Orchestration queue manager.

---

### pm_activity

PM agent performed an action (approve, revise, escalate).

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Project ID |
| `taskId` | `string` | Task ID |
| `action` | `string` | `"approved"`, `"revision_requested"`, `"escalated"` |
| `agentName` | `string` | PM agent name |
| `summary` | `string` | Human-readable summary |
| `timestamp` | `number` | Epoch ms |

**Emitted by:** PM orchestrator (review/approve/revise/escalate flows), task status PATCH (manual done with PM).

---

### runtime_status

Agent runtime execution status update (token usage, running state).

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Task ID |
| `agentId` | `string?` | Agent ID |
| `status` | `string` | `"running"`, `"complete"`, `"error"` |
| `runId` | `string?` | Execution run ID |
| `inputTokens` | `number?` | Input token count |
| `outputTokens` | `number?` | Output token count |
| `toolCalls` | `number?` | Tool call count |

**Emitted by:** Agent runtime execution loop.

---

### kickoff_stage

Project kickoff pipeline stage changed.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Project ID |
| `stage` | `string` | `"idle"`, `"meeting"`, `"planning"`, `"assigning"`, `"executing"`, `"done"` |

**Emitted by:** Kickoff pipeline (`POST /api/projects/:id/kickoff` and add-tasks flow).

---

### clarification_request

PM needs clarification from the user during kickoff planning.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Project ID |
| `clarificationId` | `string` | Clarification request ID |
| `question` | `string` | The question text |

**Emitted by:** Kickoff pipeline (when LLM returns a clarification instead of tasks).

---

### meeting_minutes_update

Meeting minutes were updated (triggers UI refresh).

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | `string?` | Related task ID (null for project-level meetings) |
| `meeting_id` | `string` | Meeting record ID |
| `phase` | `string` | `"started"`, `"entry"`, `"completed"` |
| `status` | `string?` | `"completed"` (on completion) |

**Emitted by:** Kickoff meeting pipeline.

---

### auto_open_cli

Instructs the frontend to open a CLI window for an agent.

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | `string` | Agent ID |
| `from_planning` | `boolean?` | If true, show a "plan ready" banner |

**Emitted by:** Runtime status handler (when an agent starts running).

---

### close_cli

Instructs the frontend to close a CLI window for an agent.

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | `string` | Agent ID |
| `task_id` | `string?` | Task ID |

**Emitted by:** Run-complete handler (after CLI-interactive agent finishes).

---

### task_interrupt

A prompt injection was queued for a running task.

| Field | Type | Description |
|-------|------|-------------|
| `task_id` | `string` | Task ID |
| `action` | `string` | `"inject"` |
| `session_id` | `string` | Session identifier |

**Emitted by:** Execution control route (`POST /api/tasks/:id/inject`).

---

### skill_learn_job_update

Skill learning job progress changed.

| Field | Type | Description |
|-------|------|-------------|
| *(full job object)* | | Skill learn job with `id`, `status`, `progress`, etc. |

**Emitted by:** Skill learn-core (during LLM-based skill extraction).

---

### memory_learn_job_update

Memory learning job progress changed.

| Field | Type | Description |
|-------|------|-------------|
| *(full job object)* | | Memory learn job with `id`, `status`, `progress`, etc. |

**Emitted by:** Memory learn-core (during LLM-based memory extraction).

---

### project_app_output

App Runner process output for a project.

| Field | Type | Description |
|-------|------|-------------|
| `projectId` | `string` | Project ID |
| `data` | `string` | Output line |
| `phase` | `string` | `"run"`, `"exit"`, `"install_done"`, `"install_error"` |
| `ts` | `number` | Epoch ms |
| `status` | `string?` | `"running"`, `"stopped"`, `"install_done"`, `"install_error"` |

**Emitted by:** App Runner routes (install, run, process exit).

---

### clone_progress

Git clone progress for a repository.

| Field | Type | Description |
|-------|------|-------------|
| `clone_id` | `string` | Clone operation ID |
| `progress` | `number` | Progress percentage (0-100) |
| `status` | `string` | `"cloning"`, `"done"`, `"error"` |
| `error` | `string?` | Error code (e.g., `"git_spawn_failed"`) |

**Emitted by:** GitHub routes (repo clone operations).

---

### tasks_changed

Bulk task changes occurred (e.g., batch reorder). No specific payload; signals the client to refetch.

```json
{}
```

**Emitted by:** Task CRUD (batch reorder route).

---

### messages_cleared

Messages were cleared for an agent session reset.

| Field | Type | Description |
|-------|------|-------------|
| *(session reset metadata)* | | Details of the cleared session |

**Emitted by:** Directive inbox session-reset branch.

---

### video_render_progress

Video render job progress update.

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Task ID |
| `progress` | `number` | Progress percentage |
| `phase` | `string` | Current render phase |

**Emitted by:** Video render route.

---

### video_render_complete

Video render job finished.

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `string` | Task ID |
| `status` | `string` | `"done"` or `"error"` |
| `outputPath` | `string?` | Path to rendered file |

**Emitted by:** Video render route.

---

### image_studio_done

Image generation completed.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Generation record ID |
| `provider` | `string` | Provider name |
| `model` | `string` | Model used |
| `prompt` | `string` | Original prompt |
| `revisedPrompt` | `string?` | Provider-revised prompt |

**Emitted by:** Image Studio route (`POST /api/image-studio/generate`).

---

### local_llm_status

Local LLM backend status changed.

| Field | Type | Description |
|-------|------|-------------|
| `backend` | `string` | Backend name (e.g., `"ollama"`) |
| `running` | `boolean` | Whether the backend is running |

**Emitted by:** Local LLM routes (start/stop/health check), lifecycle startup.

---

### local_llm_pull_progress

Local LLM model download progress.

| Field | Type | Description |
|-------|------|-------------|
| `model` | `string` | Model name |
| `status` | `string` | Download status |
| `progress` | `number?` | Progress percentage |
| `error` | `string?` | Error message |

**Emitted by:** Local LLM routes (`POST /api/local-llm/models/pull`).

---

### local_llm_metrics

Local LLM inference metrics snapshot.

| Field | Type | Description |
|-------|------|-------------|
| *(metrics snapshot)* | | Object with inference timing, token throughput, etc. |

**Emitted by:** Local LLM metrics collector (periodic broadcast).

---

### connected

Initial connection acknowledgment (defined in `WSEventType` but primarily used as the connection state indicator in the client hook).

---

## PTY Events (Single-Client)

These events are sent only to the client that owns the PTY session.

### pty_ready

Sent after a `pty_create` request succeeds.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |

### pty_output

Terminal output data from the PTY process.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |
| `data` | `string` | Raw terminal output |

### pty_exit

PTY process exited.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | PTY session ID |
| `exitCode` | `number` | Process exit code |

---

## WSEventType Union (TypeScript)

All recognized event types are defined in `src/types/index.ts`:

```typescript
export type WSEventType =
  | "task_update"
  | "agent_status"
  | "agent_created"
  | "agent_deleted"
  | "departments_changed"
  | "new_message"
  | "announcement"
  | "cli_output"
  | "cli_usage_update"
  | "subtask_update"
  | "cross_dept_delivery"
  | "client_office_call"
  | "chat_stream"
  | "task_report"
  | "notification"
  | "queue_status"
  | "pm_activity"
  | "connected"
  | "skill_learn_job_update"
  | "memory_learn_job_update"
  | "meeting_minutes_update"
  | "pty_ready"
  | "pty_output"
  | "pty_exit"
  | "auto_open_cli"
  | "close_cli"
  | "runtime_status"
  | "clarification_request"
  | "kickoff_stage"
  | "project_app_output";
```

> **Note:** Some events (`clone_progress`, `task_interrupt`, `tasks_changed`, `messages_cleared`, `video_render_progress`, `video_render_complete`, `image_studio_done`, `local_llm_status`, `local_llm_pull_progress`, `local_llm_metrics`) are broadcast by the server but are not part of the `WSEventType` union. They are consumed by dedicated component-level WebSocket listeners (e.g., `ModelsPanel`, `MetricsPanel`) rather than the central `useRealtimeSync` hook.

---

## Key Source Files

| File | Role |
|------|------|
| `server/ws/hub.ts` | WebSocket hub: broadcast, subscription filtering, batching, PTY dispatch |
| `server/modules/pty/pty-manager.ts` | PTY session lifecycle (create, write, resize, destroy) |
| `server/modules/lifecycle.ts` | WebSocket server setup, client connection/auth, message routing |
| `server/security/auth.ts` | `isIncomingMessageAuthenticated` / `isIncomingMessageOriginTrusted` |
| `src/hooks/useWebSocket.ts` | Client WebSocket connection, reconnect, event dispatch |
| `src/app/useRealtimeSync.ts` | Central client-side event handler (all main events) |
| `src/types/index.ts` | `WSEventType` union and `WSEvent` interface |
