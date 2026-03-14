const BASE = "";

export interface TimelineEvent {
  id: string;
  type:
    | "task_start"
    | "task_done"
    | "task_fail"
    | "skill_learn"
    | "memory_save"
    | "hook_run"
    | "api_completion";
  taskId?: string;
  taskTitle?: string;
  message: string;
  created_at: number; // unix ms
}

export async function getAgentTimeline(agentId: string): Promise<TimelineEvent[]> {
  const res = await fetch(`${BASE}/api/agents/${agentId}/timeline`);
  if (!res.ok) {
    throw new Error(`Failed to fetch agent timeline: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
