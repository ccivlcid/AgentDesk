/**
 * shared/types.ts — Core domain types shared between GUI (src/) and TUI (cli/)
 */

// Agent roles
export type AgentRole = "team_leader" | "senior" | "junior" | "intern";
export type AgentStatus = "idle" | "working" | "break" | "offline";
export type CliProvider = "claude" | "codex" | "gemini" | "opencode" | "copilot" | "antigravity" | "cursor" | "api" | "ollama";
export type MeetingReviewDecision = "reviewing" | "approved" | "hold";

// Minimal department shape used on Agent (full Department type lives in src/types)
export interface AgentDepartment {
  id: string;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
}

export interface Agent {
  id: string;
  name: string;
  name_ko: string;
  name_ja?: string | null;
  name_zh?: string | null;
  department_id: string | null;
  department?: AgentDepartment | null;
  role: AgentRole;
  acts_as_planning_leader?: number | null;
  cli_provider: CliProvider;
  oauth_account_id?: string | null;
  api_provider_id?: string | null;
  api_model?: string | null;
  cli_model?: string | null;
  cli_reasoning_level?: string | null;
  enable_planning_phase?: number | null;
  specialty?: string | null;
  autonomy_level?: string | null;
  max_concurrent_tasks?: number | null;
  avatar_emoji: string;
  avatar_url?: string | null;
  sprite_number?: number | null;
  personality?: string | null;
  persona_id?: string | null;
  status: AgentStatus;
  current_task_id: string | null;
  workflow_pack_key?: string | null;
  stats_tasks_done: number;
  stats_xp: number;
  created_at: number;
}

export interface MeetingPresence {
  agent_id: string;
  seat_index: number;
  phase: "kickoff" | "review";
  task_id: string | null;
  decision?: MeetingReviewDecision | null;
  until: number;
}

export interface SubAgent {
  id: string;
  parentAgentId: string;
  task: string;
  status: "working" | "done";
}

// Task
export type TaskStatus =
  | "inbox"
  | "planned"
  | "collaborating"
  | "in_progress"
  | "review"
  | "done"
  | "pending"
  | "failed"
  | "cancelled";

export type TaskExecutionState =
  | "queued"
  | "claiming"
  | "workspace_preparing"
  | "ready"
  | "running"
  | "awaiting_review"
  | "retry_backoff"
  | "blocked"
  | "stalled"
  | "recovering"
  | "succeeded"
  | "failed"
  | "cancelled";

export type TaskType = "general" | "development" | "design" | "analysis" | "presentation" | "documentation";

export const WORKFLOW_PACK_KEYS = [
  "development",
] as const;
export type WorkflowPackKey = (typeof WORKFLOW_PACK_KEYS)[number];

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  assigned_agent_id: string | null;
  assigned_agent?: Agent;
  agent_name?: string | null;
  agent_name_ko?: string | null;
  agent_avatar?: string | null;
  project_id?: string | null;
  status: TaskStatus;
  execution_state?: TaskExecutionState;
  execution_attempt?: number;
  claimed_by?: string | null;
  claim_expires_at?: number | null;
  last_heartbeat_at?: number | null;
  last_output_at?: number | null;
  retry_after?: number | null;
  execution_error_code?: string | null;
  execution_error_summary?: string | null;
  resolved_workflow_contract_hash?: string | null;
  timeout_minutes?: number;
  priority: number;
  task_type: TaskType;
  workflow_pack_key?: WorkflowPackKey;
  context_hint?: string | null;
  workflow_meta_json?: string | null;
  output_format?: string | null;
  project_path: string | null;
  result: string | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
  source_task_id?: string | null;
  subtask_total?: number;
  subtask_done?: number;
  hidden?: number;
  category_id?: string | null;
  handoff_to_agent_id?: string | null;
  handoff_condition?: "always" | "on_success" | "on_fail" | null;
  retry_count?: number;
  max_retries?: number;
  last_error_summary?: string | null;
  error_analysis?: string | null;
}

export type SubTaskStatus = "pending" | "in_progress" | "done" | "blocked";

export interface SubTask {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  status: SubTaskStatus;
  assigned_agent_id: string | null;
  blocked_reason: string | null;
  cli_tool_use_id: string | null;
  target_department_id?: string | null;
  delegated_task_id?: string | null;
  created_at: number;
  completed_at: number | null;
}

// WebSocket Events
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

// CLI Status
export interface CliToolStatus {
  installed: boolean;
  version: string | null;
  authenticated: boolean;
  authHint: string;
}

export type CliStatusMap = Record<CliProvider, CliToolStatus>;
