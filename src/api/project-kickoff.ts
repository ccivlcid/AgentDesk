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
): Promise<KickoffResult> {
  return post(`/api/projects/${projectId}/kickoff`, {
    clarification_answer: clarificationAnswer ?? undefined,
  }) as Promise<KickoffResult>;
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
