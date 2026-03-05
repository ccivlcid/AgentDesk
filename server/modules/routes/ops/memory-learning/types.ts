export type MemoryLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type MemoryHistoryProvider = MemoryLearnProvider | "copilot" | "antigravity" | "api";
export type MemoryLearnStatus = "queued" | "running" | "succeeded" | "failed";

export interface MemoryLearnJob {
  id: string;
  memoryId: string;
  memoryTitle: string;
  providers: MemoryLearnProvider[];
  agents: string[];
  status: MemoryLearnStatus;
  command: string;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  logTail: string[];
  error: string | null;
}
