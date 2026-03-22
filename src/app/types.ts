import type { RoomTheme } from "../types";

export type WindowType =
  | "workflow"
  | "library"
  | "settings"
  | "chat"
  | "agent-manager"
  | "cli"
  | "reports"
  | "tasks"
  | "create-task"
  | "llm-guide"
  | "synapse"
  | "image-studio"
  | "folder"
  | "create-agent"
  | "create-department"
  | "library-guide"
  | "user-guide"
  | "file-tree"
  | "alerts"
  | "cli-usage"
  | "local-llm"
  | "feature-builder"
  | "flow-graph"
  | "git-import"
  | "dashboard"
  | "widget-board"
  | "project-create"
  | "decision-inbox"
  | "folder-browser"
  | "pm-activity";


export type View =
  | "agents"
  | "heartbeat"
  | "flow-graph"
  | "workflow-builder"
  | "agent-repl"
  | "dashboard"
  | "project-types"
  | "cli-usage"
  | "tasks"
  | "tasks-board"
  | "tasks-scheduled"
  | "tasks-deliverables"
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
