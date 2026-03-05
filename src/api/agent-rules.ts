import { request, post, patch, del } from "./core";
import type { AgentRule, AgentRuleCategory, AgentRuleScopeType } from "../types";

export type { AgentRule };

// ── Rule Learning types ─────────────────────────────────────────────
export type RuleLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type RuleLearnStatus = "queued" | "running" | "succeeded" | "failed";
export type RuleHistoryProvider = RuleLearnProvider | "copilot" | "antigravity" | "api";

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

export interface RuleLearningHistoryEntry {
  id: string;
  job_id: string;
  provider: RuleHistoryProvider;
  rule_id: string;
  rule_label: string;
  status: RuleLearnStatus;
  command: string;
  error: string | null;
  run_started_at: number | null;
  run_completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface LearnedRuleEntry {
  provider: RuleHistoryProvider;
  rule_id: string;
  rule_label: string;
  learned_at: number;
}

export interface AgentRuleFilters {
  category?: AgentRuleCategory;
  scope_type?: AgentRuleScopeType;
  scope_id?: string;
  enabled?: "0" | "1";
}

export interface CreateAgentRuleInput {
  title: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  rule_content: string;
  category?: AgentRuleCategory;
  scope_type?: AgentRuleScopeType;
  scope_id?: string;
  priority?: number;
}

export interface UpdateAgentRuleInput {
  title?: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  rule_content?: string;
  category?: AgentRuleCategory;
  scope_type?: AgentRuleScopeType;
  scope_id?: string;
  priority?: number;
  enabled?: boolean;
}

function buildQueryString(filters?: AgentRuleFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.scope_type) params.set("scope_type", filters.scope_type);
  if (filters.scope_id) params.set("scope_id", filters.scope_id);
  if (filters.enabled) params.set("enabled", filters.enabled);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getAgentRules(filters?: AgentRuleFilters): Promise<AgentRule[]> {
  return request<AgentRule[]>(`/api/agent-rules${buildQueryString(filters)}`);
}

export function getAgentRule(id: string): Promise<AgentRule> {
  return request<AgentRule>(`/api/agent-rules/${id}`);
}

export function createAgentRule(input: CreateAgentRuleInput): Promise<AgentRule> {
  return post<AgentRule>("/api/agent-rules", input);
}

export function updateAgentRule(id: string, input: UpdateAgentRuleInput): Promise<AgentRule> {
  return patch<AgentRule>(`/api/agent-rules/${id}`, input);
}

export function toggleAgentRule(id: string): Promise<{ id: string; enabled: boolean }> {
  return patch<{ id: string; enabled: boolean }>(`/api/agent-rules/${id}/toggle`, {});
}

export function reorderAgentRules(items: Array<{ id: string; priority: number }>): Promise<{ ok: true }> {
  return patch<{ ok: true }>("/api/agent-rules/reorder", { items });
}

export function deleteAgentRule(id: string): Promise<{ ok: true }> {
  return del<{ ok: true }>(`/api/agent-rules/${id}`);
}

// ── Rule Learning API ───────────────────────────────────────────────

export async function startRuleLearning(input: {
  ruleId: string;
  providers: RuleLearnProvider[];
}): Promise<RuleLearnJob> {
  const res = await post<{ ok: true; job: RuleLearnJob }>("/api/agent-rules/learn", input);
  return res.job;
}

export async function getRuleLearningJob(jobId: string): Promise<RuleLearnJob> {
  const res = await request<{ ok: true; job: RuleLearnJob }>(`/api/agent-rules/learn/${jobId}`);
  return res.job;
}

export async function getRuleLearningHistory(input?: {
  provider?: RuleHistoryProvider;
  status?: RuleLearnStatus;
  limit?: number;
}): Promise<{ history: RuleLearningHistoryEntry[]; retentionDays: number }> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.status) params.set("status", input.status);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; retention_days: number; history: RuleLearningHistoryEntry[] }>(
    `/api/agent-rules/history${qs ? `?${qs}` : ""}`,
  );
  return { history: res.history, retentionDays: res.retention_days };
}

export async function getAvailableLearnedRules(input?: {
  provider?: RuleHistoryProvider;
  limit?: number;
}): Promise<LearnedRuleEntry[]> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; rules: LearnedRuleEntry[] }>(
    `/api/agent-rules/available${qs ? `?${qs}` : ""}`,
  );
  return res.rules;
}

export async function unlearnRule(input: {
  provider: RuleHistoryProvider;
  ruleId: string;
}): Promise<{ ok: boolean; provider: RuleHistoryProvider; rule_id: string; removed: number }> {
  return post<{ ok: boolean; provider: RuleHistoryProvider; rule_id: string; removed: number }>(
    "/api/agent-rules/unlearn",
    input,
  );
}
