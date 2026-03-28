import type { RoomTheme } from "../types";

export type WindowType =
  | "library"
  | "settings"
  | "agent-manager"
  | "cli"
  | "tasks"
  | "llm-guide"
  | "folder"
  | "create-agent"
  | "create-department"
  | "library-guide"
  | "user-guide"
  | "cli-usage"
  | "repo-store"
  | "project-create"
  | "decision-inbox"
  | "folder-browser"
  | "learn-skill"
  | "learn-rule"
  | "learn-memory"
  | "learn-hook"
;


export type View =
  | "agents"
  | "heartbeat"
  | "project-types"
  | "cli-usage"
  | "tasks"
  | "skills"
  | "agent-rules"
  | "memory"
  | "hooks"
  | "settings"
  | "library";
export type TaskPanelTab = "terminal";
export type RuntimeOs = "windows" | "mac" | "linux" | "unknown";

export interface OAuthCallbackResult {
  provider: string | null;
  error: string | null;
}

export type RoomThemeMap = Record<string, RoomTheme>;

export type ProjectMetaPayload = {
  project_id?: string;
  project_path?: string;
  project_context?: string;
};

export type CliSubAgentEvent =
  | { kind: "spawn"; id: string; task: string | null }
  | { kind: "done"; id: string }
  | { kind: "bind_thread"; threadId: string; subAgentId: string }
  | { kind: "close_thread"; threadId: string };
