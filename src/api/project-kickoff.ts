import { post, request } from "./core";

export interface KickoffResult {
  status: "ok" | "clarification_needed";
  tasks?: unknown[];
  clarificationId?: string;
  question?: string;
}

export async function kickoffProject(
  projectId: string,
  clarificationAnswer?: string,
  additionalDirective?: string,
  clarificationId?: string,
): Promise<KickoffResult> {
  return post(`/api/projects/${projectId}/kickoff`, {
    clarification_answer: clarificationAnswer ?? undefined,
    additional_directive: additionalDirective ?? undefined,
    clarification_id: clarificationId ?? undefined,
  }) as Promise<KickoffResult>;
}

export interface AutoAssignResult {
  ok: boolean;
  assignments: { role: string; agent_id: string }[];
}

export async function autoAssignAgents(params: {
  project_name?: string;
  core_goal?: string;
  category_name?: string;
  directive?: string;
}): Promise<AutoAssignResult> {
  return post("/api/projects/auto-assign-agents", params) as Promise<AutoAssignResult>;
}

// ── Task Debug APIs ──

export async function fetchTaskPrompt(taskId: string): Promise<string | null> {
  const result = await request<{ ok: boolean; prompt: string | null }>(`/api/tasks/${taskId}/prompt`);
  return result.prompt;
}

