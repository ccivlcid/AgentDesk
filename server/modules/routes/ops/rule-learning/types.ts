export type RuleLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type RuleHistoryProvider = RuleLearnProvider | "copilot" | "antigravity" | "api";
export type RuleLearnStatus = "queued" | "running" | "succeeded" | "failed";

export interface RuleLearnJob {
  id: string;
  ruleId: string;
  ruleTitle: string;
  providers: RuleLearnProvider[];
  agents: string[];
  status: RuleLearnStatus;
  command: string;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  logTail: string[];
  error: string | null;
}
