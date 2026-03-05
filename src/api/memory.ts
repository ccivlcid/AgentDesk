import { request, post, patch, del } from "./core";
import type { MemoryEntry, MemoryCategory, MemoryScopeType } from "../types";

export type { MemoryEntry };

export interface MemoryFilters {
  category?: MemoryCategory;
  scope_type?: MemoryScopeType;
  scope_id?: string;
  enabled?: "0" | "1";
}

export interface CreateMemoryInput {
  title: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  content: string;
  category?: MemoryCategory;
  scope_type?: MemoryScopeType;
  scope_id?: string;
  priority?: number;
}

export interface UpdateMemoryInput {
  title?: string;
  title_ko?: string;
  title_ja?: string;
  title_zh?: string;
  description?: string;
  content?: string;
  category?: MemoryCategory;
  scope_type?: MemoryScopeType;
  scope_id?: string;
  priority?: number;
  enabled?: boolean;
}

function buildQueryString(filters?: MemoryFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.scope_type) params.set("scope_type", filters.scope_type);
  if (filters.scope_id) params.set("scope_id", filters.scope_id);
  if (filters.enabled) params.set("enabled", filters.enabled);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function getMemoryEntries(filters?: MemoryFilters): Promise<MemoryEntry[]> {
  return request<MemoryEntry[]>(`/api/memory${buildQueryString(filters)}`);
}

export function getMemoryEntry(id: string): Promise<MemoryEntry> {
  return request<MemoryEntry>(`/api/memory/${id}`);
}

export function createMemoryEntry(input: CreateMemoryInput): Promise<MemoryEntry> {
  return post<MemoryEntry>("/api/memory", input);
}

export function updateMemoryEntry(id: string, input: UpdateMemoryInput): Promise<MemoryEntry> {
  return patch<MemoryEntry>(`/api/memory/${id}`, input);
}

export function toggleMemoryEntry(id: string): Promise<{ id: string; enabled: boolean }> {
  return patch<{ id: string; enabled: boolean }>(`/api/memory/${id}/toggle`, {});
}

export function deleteMemoryEntry(id: string): Promise<{ ok: true }> {
  return del<{ ok: true }>(`/api/memory/${id}`);
}

// ── Memory Learning types ─────────────────────────────────────────────
export type MemoryLearnProvider = "claude" | "codex" | "gemini" | "opencode" | "cursor";
export type MemoryLearnStatus = "queued" | "running" | "succeeded" | "failed";
export type MemoryHistoryProvider = MemoryLearnProvider | "copilot" | "antigravity" | "api";

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

export interface MemoryLearningHistoryEntry {
  id: string;
  job_id: string;
  provider: MemoryHistoryProvider;
  memory_id: string;
  memory_label: string;
  status: MemoryLearnStatus;
  command: string;
  error: string | null;
  run_started_at: number | null;
  run_completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface LearnedMemoryEntry {
  provider: MemoryHistoryProvider;
  memory_id: string;
  memory_label: string;
  learned_at: number;
}

// ── Memory Learning API ───────────────────────────────────────────────

export async function startMemoryLearning(input: {
  memoryId: string;
  providers: MemoryLearnProvider[];
}): Promise<MemoryLearnJob> {
  const res = await post<{ ok: true; job: MemoryLearnJob }>("/api/memory/learn", input);
  return res.job;
}

export async function getMemoryLearningJob(jobId: string): Promise<MemoryLearnJob> {
  const res = await request<{ ok: true; job: MemoryLearnJob }>(`/api/memory/learn/${jobId}`);
  return res.job;
}

export async function getMemoryLearningHistory(input?: {
  provider?: MemoryHistoryProvider;
  status?: MemoryLearnStatus;
  limit?: number;
}): Promise<{ history: MemoryLearningHistoryEntry[]; retentionDays: number }> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.status) params.set("status", input.status);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; retention_days: number; history: MemoryLearningHistoryEntry[] }>(
    `/api/memory/history${qs ? `?${qs}` : ""}`,
  );
  return { history: res.history, retentionDays: res.retention_days };
}

export async function getAvailableLearnedMemories(input?: {
  provider?: MemoryHistoryProvider;
  limit?: number;
}): Promise<LearnedMemoryEntry[]> {
  const params = new URLSearchParams();
  if (input?.provider) params.set("provider", input.provider);
  if (input?.limit) params.set("limit", String(input.limit));
  const qs = params.toString();
  const res = await request<{ ok: true; entries: LearnedMemoryEntry[] }>(
    `/api/memory/available${qs ? `?${qs}` : ""}`,
  );
  return res.entries;
}

export async function unlearnMemory(input: {
  provider: MemoryHistoryProvider;
  memoryId: string;
}): Promise<{ ok: boolean; provider: MemoryHistoryProvider; memory_id: string; removed: number }> {
  return post<{ ok: boolean; provider: MemoryHistoryProvider; memory_id: string; removed: number }>(
    "/api/memory/unlearn",
    input,
  );
}
