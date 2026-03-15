import type { RoomTheme } from "../types";

export type WindowType =
  | "workflow"
  | "library"
  | "settings"
  | "chat"
  | "agent-manager"
  | "repl";

export type WidgetId =
  | "heartbeat"
  | "task-board"
  | "alerts"
  | "cli-usage"
  | "flow-graph"
  | "file-tree";

export interface WidgetEntry {
  id: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  | "settings";
export type TaskPanelTab = "terminal" | "minutes";
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
