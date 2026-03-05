import { request, post, patch, del } from "./core";
import type { HookEntry, HookEventType, HookScopeType } from "../types";

export type { HookEntry };

export interface HookFilters {
  event_type?: HookEventType;
  scope_type?: HookScopeType;
  scope_id?: string;
  enabled?: "0" | "1";
}

export interface CreateHookInput {
  title: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  command: string;
  event_type?: HookEventType;
  working_directory?: string;
  timeout_ms?: number;
  scope_type?: HookScopeType;
  scope_id?: string;
  priority?: number;
}

export interface UpdateHookInput {
  title?: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  command?: string;
  event_type?: HookEventType;
  working_directory?: string;
  timeout_ms?: number;
  scope_type?: HookScopeType;
  scope_id?: string;
  priority?: number;
  enabled?: boolean;
}

function buildQueryString(filters?: HookFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.scope_type) params.set("scope_type", filters.scope_type);
  if (filters.scope_id) params.set("scope_id", filters.scope_id);
  if (filters.enabled) params.set("enabled", filters.enabled);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getHooks(filters?: HookFilters): Promise<HookEntry[]> {
  return request<HookEntry[]>(`/api/hooks${buildQueryString(filters)}`);
}

export function getHook(id: string): Promise<HookEntry> {
  return request<HookEntry>(`/api/hooks/${id}`);
}

export function createHook(input: CreateHookInput): Promise<HookEntry> {
  return post<HookEntry>("/api/hooks", input);
}

export function updateHook(id: string, input: UpdateHookInput): Promise<HookEntry> {
  return patch<HookEntry>(`/api/hooks/${id}`, input);
}

export function toggleHook(id: string): Promise<{ id: string; enabled: boolean }> {
  return patch<{ id: string; enabled: boolean }>(`/api/hooks/${id}/toggle`, {});
}

export function deleteHook(id: string): Promise<{ ok: true }> {
  return del<{ ok: true }>(`/api/hooks/${id}`);
}

// ── Hook Learning types ─────────────────────────────────────────────
export type HookLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type HookLearnStatus = "queued" | "running" | "succeeded" | "failed";
export type HookHistoryProvider = HookLearnProvider | "copilot" | "antigravity" | "api";

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

export interface HookLearningHistoryEntry {
  id: string;
  job_id: string;
  provider: HookHistoryProvider;
  hook_id: string;
  hook_label: string;
  status: HookLearnStatus;
  command: string;
  error: string | null;
  run_started_at: number | null;
  run_completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface LearnedHookEntry {
  provider: HookHistoryProvider;
  hook_id: string;
  hook_label: string;
  learned_at: number;
}

// ── Hook Learning API ───────────────────────────────────────────────

export async function startHookLearning(input: {
  hookId: string;
  providers: HookLearnProvider[];
}): Promise<HookLearnJob> {
  const res = await post<{ ok: true; job: HookLearnJob }>("/api/hooks/learn", input);
  return res.job;
}

export async function getHookLearningJob(jobId: string): Promise<HookLearnJob> {
  const res = await request<{ ok: true; job: HookLearnJob }>(`/api/hooks/learn/${jobId}`);
  return res.job;
}

export async function getHookLearningHistory(input?: {
  provider?: HookHistoryProvider;
  status?: HookLearnStatus;
  limit?: number;
}): Promise<{ history: HookLearningHistoryEntry[]; retentionDays: number }> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.status) params.set("status", input.status);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; retention_days: number; history: HookLearningHistoryEntry[] }>(
    `/api/hooks/history${qs ? `?${qs}` : ""}`,
  );
  return { history: res.history, retentionDays: res.retention_days };
}

export async function getAvailableLearnedHooks(input?: {
  provider?: HookHistoryProvider;
  limit?: number;
}): Promise<LearnedHookEntry[]> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; entries: LearnedHookEntry[] }>(
    `/api/hooks/available${qs ? `?${qs}` : ""}`,
  );
  return res.entries;
}

export async function unlearnHook(input: {
  provider: HookHistoryProvider;
  hookId: string;
}): Promise<{ ok: boolean; provider: HookHistoryProvider; hook_id: string; removed: number }> {
  return post<{ ok: boolean; provider: HookHistoryProvider; hook_id: string; removed: number }>(
    "/api/hooks/unlearn",
    input,
  );
}
