# Agent Runtime Engine — Implementation Spec

> **Goal:** Transform AgentDesk from a "pretty dashboard" into an OS where agents actually execute autonomously — this is the core engine.
> **One-line definition:** A system where agents autonomously work by calling LLM APIs, with the entire process reflected in the UI in real time.

---

## 1. Current Gap Analysis

### What Exists

| Area | Current State |
|------|---------------|
| Agent CRUD | ✅ Create/edit/delete/department assignment |
| Task Board | ✅ Kanban, status tracking (pending/running/done/failed) |
| CLI Window | ✅ PTY terminal, per-agent sessions, auto CLI execution |
| WebSocket | ✅ Real-time broadcast (cli_output, task_update, agent_status) |
| Workflow Builder | ✅ Visual flows, cron scheduling |
| Library | ✅ Skills/Rules/Memory/Hooks, project scope filtering |
| Prompt Builder | ✅ persona + rules + memory + skills → prompt composition |

### What's Missing (= What Needs to Be Built)

| Area | Why It's Needed |
|------|-----------------|
| **LLM Direct Execution** | Currently delegates to external CLIs (claude/codex). AgentDesk itself must call LLM APIs to execute agents to be a true "Agent OS" |
| **Streaming Runtime** | LLM responses must stream to the UI token by token for "observable execution" |
| **Tool Use Loop** | Agents need an autonomous loop for using tools (file reading, code execution, web search, etc.) |
| **Execution History** | The entire process of each execution (prompts, responses, tool calls, results) must be recorded in the DB |

---

## 2. Demo Scenario (MVP)

When this scenario works, open source release preparation is complete:

```
1. Select an agent from Library (or auto-create a "Project Analyst" agent)
2. Create a Task: "Analyze this project's structure and create a README improvement proposal"
3. Agent executes automatically:
   a. Read the project folder's file structure (tool_use: list_files)
   b. Read key file contents (tool_use: read_file)
   c. LLM generates analysis results
   d. Output results as markdown
4. What's visible in the UI in real time:
   - CLI Window: token streaming + tool call logs
   - Task Board: pending → running → done state transition
   - Agent Detail: currently running task, tokens used, elapsed time
   - Notification: completion alert
5. View deliverables in Task Report
```

---

## 3. Architecture

### 3.1 Module Structure

```
server/modules/agent-runtime/
├── index.ts                  ← Module entry point (export runtime manager)
├── runtime-manager.ts        ← Agent execution management (start/stop/status query)
├── execution-loop.ts         ← LLM ↔ Tool autonomous execution loop
├── llm-client.ts             ← LLM API abstraction (OpenAI/Anthropic/Local)
├── tool-executor.ts          ← Built-in tool executor
├── tools/                    ← Built-in tool definitions
│   ├── list-files.ts         ← Project file listing
│   ├── read-file.ts          ← File reading
│   ├── write-file.ts         ← File writing
│   ├── run-command.ts        ← Shell command execution (sandboxed)
│   └── web-search.ts         ← Web search (optional)
├── prompt-assembler.ts       ← Existing prompt builder integration (persona + rules + memory + tools)
└── execution-store.ts        ← Execution history DB storage/retrieval
```

### 3.2 Execution Flow

```
POST /api/agent-runtime/run
  { agentId, taskId, projectId }
        │
        ▼
  ① prompt-assembler
     persona + rules + memory + skills + tool definitions
     → system prompt + user message composition
        │
        ▼
  ② llm-client.stream()
     OpenAI/Anthropic API call (streaming)
     → token-level WebSocket broadcast
        │
        ▼
  ③ execution-loop (repeating)
     ┌─ Parse LLM response
     │  ├─ text → WebSocket streaming → CLI Window
     │  ├─ tool_use → tool-executor execution → feed result back to LLM
     │  └─ stop → end loop
     │
     └─ Record each turn in execution-store
        │
        ▼
  ④ Completion handling
     task.status = "done" | "failed"
     → WebSocket broadcast
     → auto post-processing (report, deliverable check)
```

### 3.3 WebSocket Events

| Event | Payload | Consumer |
|-------|---------|----------|
| `runtime_stream` | `{ taskId, agentId, type: "text"/"tool_call"/"tool_result", content }` | CLI Window, Agent Detail |
| `runtime_status` | `{ taskId, agentId, status: "thinking"/"tool_use"/"complete"/"error" }` | Task Board, Flow Graph |
| `runtime_token_usage` | `{ taskId, agentId, input_tokens, output_tokens }` | Agent Detail (cost) |

---

## 4. LLM Client Abstraction

### 4.1 Interface

```typescript
interface LlmClient {
  stream(params: {
    model: string;
    systemPrompt: string;
    messages: Message[];
    tools?: ToolDefinition[];
    maxTokens?: number;
  }): AsyncIterable<StreamEvent>;
}

type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "message_complete"; usage: { input_tokens: number; output_tokens: number } }
  | { type: "error"; error: string };
```

### 4.2 Supported Providers

| Provider | API | Priority |
|----------|-----|----------|
| **Anthropic** | Messages API (streaming) | 1st — Primary support |
| **OpenAI** | Chat Completions (streaming) | 2nd |
| **Local LLM** | Uses existing `local-llm` module (Ollama/LM Studio) | 3rd |

Provider settings use the existing `api_providers` table + Settings screen.

---

## 5. Built-in Tools

Minimum tool set to provide in MVP:

| Tool | Description | Restrictions |
|------|-------------|-------------|
| `list_files` | List files/folders in project directory | Within project_path only |
| `read_file` | Read file contents | 10MB limit, excludes binaries |
| `write_file` | Create/modify files | Within project_path only, confirmation option |
| `run_command` | Execute shell commands | 30s timeout, allowlist-based |
| `search_files` | Search file contents (grep) | Within project_path only |

**Security Principles:**
- All file access is restricted to within `project_path` (path traversal prevention)
- `run_command` requires an allowlist or user confirmation
- `write_file` supports auto/confirmation mode based on settings

---

## 6. DB Changes

### 6.1 New Table: `agent_runtime_runs`

```sql
CREATE TABLE agent_runtime_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | running | completed | failed | cancelled
  model TEXT,
  provider TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

### 6.2 New Table: `agent_runtime_events`

```sql
CREATE TABLE agent_runtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES agent_runtime_runs(id),
  seq INTEGER NOT NULL,          -- Event sequence number
  event_type TEXT NOT NULL,      -- text | tool_call | tool_result | error
  content TEXT,                  -- Text or JSON
  token_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX idx_runtime_events_run ON agent_runtime_events(run_id, seq);
```

---

## 7. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agent-runtime/run` | Start agent runtime execution |
| `POST` | `/api/agent-runtime/:runId/stop` | Stop execution |
| `GET` | `/api/agent-runtime/:runId` | Query execution status |
| `GET` | `/api/agent-runtime/:runId/events` | List execution events |
| `GET` | `/api/agent-runtime/task/:taskId` | Execution history for a task |

### POST /api/agent-runtime/run

```json
// Request
{
  "agentId": "agent-001",
  "taskId": "task-001",
  "projectId": "proj-001",
  "options": {
    "model": "claude-sonnet-4-6",      // Optional, defaults to agent settings
    "maxTokens": 4096,                  // Optional
    "maxTurns": 20,                     // Maximum tool use turns
    "autoApproveTools": ["list_files", "read_file", "search_files"]
  }
}

// Response
{
  "runId": "run-abc123",
  "status": "running"
}
```

---

## 8. UI Changes

### 8.1 Existing Component Integration (Modifications Only, No New Components)

| Component | Changes |
|-----------|---------|
| **CLI Window** | Receive `runtime_stream` WS events → render text/tool calls in real time |
| **Task Board** | Receive `runtime_status` → auto-update status badges |
| **Agent Detail** | Show token usage, elapsed time, current step in the running tab |
| **CreateTaskModal** | Add "Run with AgentDesk Runtime" option (vs existing CLI mode) |
| **Flow Graph** | Connect `runtime_status` → node flash animation |

### 8.2 No New UI

The existing UI infrastructure is sufficient. The key is connecting runtime data to existing components, not creating new screens.

---

## 9. Relationship with Existing CLI Mode

```
Two execution modes:

1. CLI Mode (existing) — Run claude/codex/gemini in a PTY terminal
   → Delegates to external agent CLI
   → User observes directly in the terminal

2. Runtime Mode (new) — AgentDesk directly calls LLM APIs
   → Uses built-in tools, autonomous execution loop
   → Structured real-time streaming
   → Complete execution history recording
```

Both modes coexist. Users can choose when creating a Task. Runtime mode becomes the default, but CLI mode is maintained.

---

## 10. Implementation Order

### Step 1 — LLM Client + Streaming (Day 1)

- [ ] `llm-client.ts` — Implement Anthropic Messages API streaming
- [ ] `POST /api/agent-runtime/run` — Basic endpoint
- [ ] WebSocket `runtime_stream` broadcast
- [ ] Display streaming text in CLI Window

**Verification:** Create Task → Execute agent → LLM response appears token by token in CLI Window

### Step 2 — Tool Use Loop (Day 2)

- [ ] `tools/` — Implement list_files, read_file, write_file, search_files
- [ ] `tool-executor.ts` — Tool execution + security validation
- [ ] `execution-loop.ts` — LLM ↔ Tool autonomous loop
- [ ] Visual differentiation of tool calls/results in CLI Window

**Verification:** "Analyze this project's file structure" → Agent uses list_files + read_file → Outputs analysis results

### Step 3 — Execution Records + Completion Handling (Day 3)

- [ ] DB migration (agent_runtime_runs, agent_runtime_events)
- [ ] `execution-store.ts` — Per-turn event recording
- [ ] Connect existing post-processing on completion (report, deliverable check)
- [ ] Display tokens/cost/time in Agent Detail

**Verification:** After execution completes → Task Report auto-generated → View history in Agent Detail

### Step 4 — Integration + Demo (Day 4)

- [ ] Runtime/CLI mode selection UI in CreateTaskModal
- [ ] Flow Graph runtime_status integration
- [ ] Default agent preset ("Project Analyst") seed
- [ ] End-to-end demo scenario verification

---

## 11. Out of Scope

| Item | Reason |
|------|--------|
| Multi-turn conversation | MVP is single-task execution. Conversations use existing Chat Window |
| Code execution sandbox | Basic `run_command` implementation only. Docker/VM is Phase 2 |
| Inter-agent collaboration | Replaced by existing Workflow Builder. Multi-agent within Runtime is Phase 2 |
| Browser tools | Web scraping/browser automation is Phase 2 |
| Auto Git commit | Only provide write_file. Git operations are at user's discretion |

---

## 12. Success Criteria

When this spec's implementation is complete:

1. **Demo-ready** — A 30-second video showing "an agent analyzing a project and displaying results" can be produced
2. **Differentiation proven** — "Visual + Runtime Integrated Agent Control" not found in Cursor/Dify/n8n is realized
3. **Open source ready** — `git clone → pnpm install → pnpm dev → run agent` 1-minute experience is complete
4. **Extension foundation** — A plugin architecture where agent capabilities can be extended by simply adding tools is secured
