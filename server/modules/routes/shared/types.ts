import type { MessengerChannel } from "../../../messenger/channels.ts";

export interface AgentRow {
  id: string;
  name: string;
  name_ko: string;
  role: string;
  personality: string | null;
  status: string;
  department_id: string | null;
  current_task_id: string | null;
  avatar_emoji: string;
  cli_provider: string | null;
  oauth_account_id: string | null;
  api_provider_id: string | null;
  api_model: string | null;
  cli_model: string | null;
  cli_reasoning_level: string | null;
}

export type DelegationOptions = {
  skipPlannedMeeting?: boolean;
  skipPlanSubtasks?: boolean;
  projectId?: string | null;
  projectPath?: string | null;
  projectContext?: string | null;
  messengerChannel?: MessengerChannel;
  messengerTargetId?: string | null;
  messengerSessionKey?: string | null;
};

export type MeetingReviewDecision = "reviewing" | "approved" | "hold";

export interface MeetingMinutesRow {
  id: string;
  task_id: string;
  meeting_type: string;
  round: number;
  status: string;
  started_at: number | null;
  completed_at: number | null;
  summary?: string | null;
  [key: string]: unknown;
}

export interface MeetingMinuteEntryRow {
  id: string;
  meeting_id: string;
  seq: number;
  speaker_agent_id: string | null;
  speaker_name: string | null;
  speaker_department: string | null;
  speaker_role: string | null;
  lang: string | null;
  message_type: string | null;
  content: string;
  created_at: number | null;
  [key: string]: unknown;
}

export interface StoredMessage {
  id: string;
  sender_type: string;
  sender_id: string | null;
  receiver_type: string;
  receiver_id: string | null;
  content: string;
  message_type: string;
  task_id: string | null;
  idempotency_key: string | null;
  created_at: number;
}

export interface DecryptedOAuthToken {
  id: string | null;
  provider: string;
  source: string | null;
  label: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  email: string | null;
  status?: string;
  priority?: number;
  modelOverride?: string | null;
  failureCount?: number;
  lastError?: string | null;
  lastErrorAt?: number | null;
  lastSuccessAt?: number | null;
}

export interface CliUsageEntry {
  windows: Array<Record<string, unknown>>;
  error?: string | null;
  [key: string]: unknown;
}

// ── Common DB row lookup types ──────────────────────────────────────

/** Minimal ID lookup result */
export type IdRow = { id: string };

/** Count aggregate result */
export type CountRow = { cnt: number };

/** Settings table value lookup */
export type SettingValueRow = { value: string };

/** Project path lookup (commonly used for task→project resolution) */
export type ProjectPathRow = {
  project_id: string | null;
  project_path: string | null;
};

/** Task row with fields commonly needed in delegation/orchestration */
export interface TaskBaseRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  task_type: string | null;
  priority: number;
  assigned_agent_id: string | null;
  department_id: string | null;
  project_id: string | null;
  project_path: string | null;
  workflow_pack_key: string | null;
  source_task_id: string | null;
}

/** Minimal task fields for parent task lookups (subtask delegation) */
export interface ParentTaskRow {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  project_path: string | null;
  department_id?: string | null;
  workflow_pack_key?: string | null;
}

/** Department row lookup */
export interface DepartmentRow {
  id: string;
  name: string;
  name_ko: string;
  icon: string;
  color: string;
  description: string | null;
  prompt: string | null;
}
