import { request } from "./core";

export interface MeetingEntry {
  speaker: string;
  content: string;
}

export interface PmActivityItem {
  id: string;
  type: "meeting" | "task_status" | "pm_message" | "decision" | "oversight";
  timestamp: number;
  taskId: string | null;
  taskTitle: string | null;
  agentId: string | null;
  agentName: string | null;
  summary: string;
  detail?: string;
  meetingEntries?: MeetingEntry[];
}

export interface PmActivityResponse {
  ok: boolean;
  items: PmActivityItem[];
  counts: { planned: number; in_progress: number; review: number; done: number; total: number };
  pmAgent: { id: string; name: string; nameKo: string } | null;
}

export function fetchPmActivity(
  projectId: string,
  opts?: { limit?: number; since?: number },
): Promise<PmActivityResponse> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.since) params.set("since", String(opts.since));
  const qs = params.toString();
  return request<PmActivityResponse>(`/api/projects/${encodeURIComponent(projectId)}/pm-activity${qs ? `?${qs}` : ""}`);
}
