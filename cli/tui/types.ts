/**
 * Shared TUI types — used by commands, services, and widgets.
 */

export interface ChatMessage {
  id: string;
  role: "user" | "pm" | "agent" | "system";
  content: string;
  agentName?: string;
  timestamp: number;
  toolCalls?: ToolCallData[];
  fileDiffs?: FileDiffData[];
}

export interface ToolCallData {
  name: string;
  status: "running" | "success" | "error";
  summary?: string;
  detail?: string;
}

export interface FileDiffData {
  path: string;
  action: "create" | "edit" | "delete";
  summary?: string;
  lines?: string[];
}

export interface PendingAction {
  type: "kickoff" | "add_tasks";
  params: Record<string, unknown>;
  description: string;
}

export type AddMessage = (msg: ChatMessage) => void;

export interface CommandExtras {
  clearMessages: () => void;
  setSessionId: (id: string) => void;
  setProjectId: (id: string | null) => void;
  projectId: string | null;
  showDetails?: boolean;
  toggleDetails?: () => void;
  resetLanguage?: () => void;
  forkSession?: () => Promise<void>;
}

export function sysMsg(content: string): ChatMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: "system",
    content,
    timestamp: Date.now(),
  };
}
