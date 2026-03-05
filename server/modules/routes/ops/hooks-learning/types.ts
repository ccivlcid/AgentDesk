export type HookLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type HookHistoryProvider = HookLearnProvider | "copilot" | "antigravity" | "api";
export type HookLearnStatus = "queued" | "running" | "succeeded" | "failed";

export interface HookLearnJob {
  id: string;
  hookId: string;
  hookTitle: string;
  providers: HookLearnProvider[];
  agents: string[];
  status: HookLearnStatus;
  command: string;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  logTail: string[];
  error: string | null;
}
