import { post } from "./core";

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

export interface ResumeResult {
  status: "ok" | "nothing_to_resume";
  runId?: string;
  taskId?: string;
  title?: string;
  message?: string;
}

export async function resumeProject(projectId: string): Promise<ResumeResult> {
  return post(`/api/projects/${projectId}/resume`) as Promise<ResumeResult>;
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

export async function replyClarification(
  projectId: string,
  clarificationId: string,
  answer: string,
): Promise<void> {
  await post(`/api/projects/${projectId}/clarification-reply`, {
    clarification_id: clarificationId,
    answer,
  });
}
