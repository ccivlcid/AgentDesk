# AgentDesk — DB Schema ER Diagram

> SQLite (`better-sqlite3`), timestamps are Unix ms (`unixepoch()*1000`)
> Migrations: `server/modules/bootstrap/schema/versioned-migrations.ts`
> Base schema: `server/modules/bootstrap/schema/base-schema.ts`

---

## Core Entity Relationship Diagram

```mermaid
erDiagram
    departments {
        TEXT id PK
        TEXT name
        TEXT name_ko
        TEXT icon
        TEXT color
        TEXT prompt
        INTEGER sort_order
    }

    agents {
        TEXT id PK
        TEXT name
        TEXT department_id FK
        TEXT role "team_leader|senior|junior|intern"
        TEXT cli_provider "claude|codex|gemini|..."
        TEXT status "idle|working|break|offline"
        TEXT current_task_id FK
        TEXT persona_id FK
        INTEGER acts_as_planning_leader
    }

    projects {
        TEXT id PK
        TEXT name
        TEXT project_path
        TEXT core_goal
        TEXT default_pack_key FK
        TEXT assignment_mode "auto|manual"
    }

    project_agents {
        TEXT project_id FK
        TEXT agent_id FK
    }

    categories {
        TEXT id PK
        TEXT name
        TEXT name_ko
        TEXT workflow_pack_key FK
    }

    tasks {
        TEXT id PK
        TEXT title
        TEXT project_id FK
        TEXT department_id FK
        TEXT assigned_agent_id FK
        TEXT category_id FK
        TEXT status "inbox|planned|in_progress|review|done|..."
        TEXT execution_state "queued|running|succeeded|failed|..."
        TEXT handoff_to_agent_id FK
        TEXT handoff_condition
        INTEGER priority
        INTEGER last_heartbeat_at
    }

    subtasks {
        TEXT id PK
        TEXT task_id FK
        TEXT title
        TEXT status "pending|in_progress|done|blocked"
        TEXT assigned_agent_id FK
    }

    task_execution_events {
        INTEGER id PK
        TEXT task_id FK
        TEXT event_type
        TEXT from_state
        TEXT to_state
        TEXT summary
    }

    task_logs {
        INTEGER id PK
        TEXT task_id FK
        TEXT kind
        TEXT message
    }

    messages {
        TEXT id PK
        TEXT sender_type "client|agent|system"
        TEXT receiver_type "agent|department|all"
        TEXT receiver_id
        TEXT message_type "chat|directive|report|..."
        TEXT task_id FK
    }

    meeting_minutes {
        TEXT id PK
        TEXT task_id FK
        TEXT meeting_type "planned|review"
        INTEGER round
        TEXT status "in_progress|completed|failed"
    }

    meeting_minute_entries {
        INTEGER id PK
        TEXT meeting_id FK
        TEXT speaker_agent_id FK
        TEXT content
    }

    settings {
        TEXT key PK
        TEXT value
    }

    oauth_accounts {
        TEXT id PK
        TEXT provider "github|google_antigravity"
        TEXT email
        TEXT status "active|disabled"
        TEXT access_token_enc
    }

    workflow_packs {
        TEXT key PK
        TEXT name
        INTEGER enabled
    }

    workflow_schedules {
        TEXT id PK
        TEXT template_id FK
        TEXT cron_expr
        INTEGER enabled
        INTEGER last_run_at
        INTEGER next_run_at
        INTEGER created_at
    }

    pipeline_gates {
        INTEGER id PK
        TEXT workflow_pack_key FK
        TEXT gate_key
        TEXT gate_type "auto|manual"
    }

    task_gate_results {
        INTEGER id PK
        TEXT task_id FK
        INTEGER gate_id FK
        TEXT status "pending|passed|failed|skipped"
    }

    task_report_archives {
        TEXT id PK
        TEXT root_task_id FK
        TEXT summary_markdown
    }

    departments ||--o{ agents : "belongs to"
    agents ||--o{ tasks : "assigned"
    projects ||--o{ tasks : "contains"
    projects ||--o{ project_agents : "assigned"
    agents ||--o{ project_agents : "participates"
    tasks ||--o{ subtasks : "child"
    tasks ||--o{ task_execution_events : "execution history"
    tasks ||--o{ task_logs : "logs"
    tasks ||--o{ meeting_minutes : "meeting"
    meeting_minutes ||--o{ meeting_minute_entries : "utterance"
    agents ||--o{ meeting_minute_entries : "speaker"
    workflow_packs ||--o{ pipeline_gates : "gates"
    tasks ||--o{ task_gate_results : "gate results"
    pipeline_gates ||--o{ task_gate_results : "applied"
    tasks ||--|| task_report_archives : "report"
    workflow_packs ||--o{ workflow_schedules : "scheduled"
```

---

## Table Group Summary

### Organizational Structure
| Table | Role |
|-------|------|
| `departments` | Teams/departments (development, planning, etc.) |
| `agents` | AI agents (role, CLI provider, status) |
| `projects` | Projects (working path, goals) |
| `project_agents` | Project-agent N:M join table |
| `categories` | Project categories (workflow_pack mapping) |
| `workflow_packs` | Workflow package definitions |

### Task Execution
| Table | Role |
|-------|------|
| `tasks` | Tasks (state machine: inbox → done) |
| `subtasks` | Subtasks (created by agents at runtime) |
| `task_execution_events` | Execution state transition history |
| `task_logs` | Execution logs |
| `task_interrupt_injections` | Runtime prompt injections (interrupts) |
| `task_report_archives` | Completed report archives |

### Meetings & Collaboration
| Table | Role |
|-------|------|
| `meeting_minutes` | Meeting minutes (planned/review) |
| `meeting_minute_entries` | Utterance records |
| `review_revision_history` | Review revision request history |
| `messages` | Chat messages (agent ↔ client) |

### Pipeline Gates
| Table | Role |
|-------|------|
| `pipeline_gates` | Quality gate definitions per workflow |
| `task_gate_results` | Gate pass/fail results per task |

### Workflow Scheduling (v1.3.0)
| Table | Role |
|-------|------|
| `workflow_schedules` | Cron schedules per workflow template (migration `2026-03-17-001`) |

### Library (Agent Behavior Configuration)
| Table | Role | scope_type values |
|-------|------|-------------------|
| `hook_entries` | Pre/post-task scripts (event hooks) | global \| department \| agent \| workflow_pack \| **project** (migration `2026-03-23-001`) |
| `agent_rules` | Behavioral rules injected into prompts | global \| department \| agent \| project |
| `memory_entries` | Agent memory / context snippets | global \| department \| agent \| project (migration `2026-03-23-002`) |
| `agent_skills` | Learned skills (markdown) per agent/provider | — |
| `hook_learning_history` | Skill learning job records | — |

### Auth & Settings
| Table | Role |
|-------|------|
| `settings` | KV settings store (API keys, language, etc.) |
| `oauth_accounts` | OAuth accounts (GitHub, Google, etc.) |
| `oauth_credentials` | OAuth credentials (encrypted storage) |
| `oauth_states` | OAuth PKCE state temporary storage |

---

## Task State Machine

```
status (user perspective):
  inbox → planned → collaborating → in_progress → review → done
                                                        ↘ cancelled

execution_state (engine perspective):
  queued → claiming → workspace_preparing → ready → running
         ↘ retry_backoff ↗              ↘ awaiting_review → succeeded
                                         ↘ blocked / stalled → recovering → running
                                         ↘ failed / cancelled
```

---

## Key Indexes

| Index | Purpose |
|-------|---------|
| `idx_tasks_status` | Kanban board query by status |
| `idx_tasks_agent` | Query tasks by agent |
| `idx_tasks_execution_state` | Execution engine queue polling |
| `idx_tasks_watchdog` | `(status, execution_state, last_heartbeat_at DESC)` — anomaly detection (P3-5) |
| `idx_subtasks_task` | Query subtasks by task |
| `idx_workflow_schedules_next_run` | `(next_run_at)` — scheduler tick polling |
| `idx_workflow_schedules_template` | `(template_id)` — per-template list |
