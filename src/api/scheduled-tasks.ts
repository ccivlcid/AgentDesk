const BASE = "";

export interface ScheduledTask {
  id: string;
  template_id: string | null;
  name: string;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  auto_run: boolean;
  assigned_agent_id: string | null;
  project_id: string | null;
  last_run_at: number | null;
  next_run_at: number | null;
  run_count: number;
  created_at: number;
  updated_at: number;
  cron_description_en?: string;
  cron_description_ko?: string;
  // joined fields
  template_name?: string | null;
  agent_name?: string | null;
  agent_avatar?: string | null;
  project_name?: string | null;
}

export interface ScheduledTaskPayload {
  name: string;
  cron_expression: string;
  template_id?: string | null;
  timezone?: string;
  enabled?: boolean;
  auto_run?: boolean;
  assigned_agent_id?: string | null;
  project_id?: string | null;
}

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  const res = await fetch(`${BASE}/api/scheduled-tasks`);
  const data = await res.json();
  return data.schedules ?? [];
}

export async function getScheduledTask(id: string): Promise<ScheduledTask | null> {
  const res = await fetch(`${BASE}/api/scheduled-tasks/${id}`);
  const data = await res.json();
  return data.schedule ?? null;
}

export async function createScheduledTask(payload: ScheduledTaskPayload): Promise<ScheduledTask> {
  const res = await fetch(`${BASE}/api/scheduled-tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "create failed");
  return data.schedule;
}

export async function updateScheduledTask(
  id: string,
  payload: Partial<ScheduledTaskPayload>,
): Promise<ScheduledTask> {
  const res = await fetch(`${BASE}/api/scheduled-tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "update failed");
  return data.schedule;
}

export async function deleteScheduledTask(id: string): Promise<void> {
  await fetch(`${BASE}/api/scheduled-tasks/${id}`, { method: "DELETE" });
}

export async function toggleScheduledTask(id: string): Promise<boolean> {
  const res = await fetch(`${BASE}/api/scheduled-tasks/${id}/toggle`, { method: "POST" });
  const data = await res.json();
  return data.enabled ?? false;
}

export async function validateCron(
  expr: string,
): Promise<{
  valid: boolean;
  description_en?: string;
  description_ko?: string;
  next_run_at?: number | null;
}> {
  const res = await fetch(
    `${BASE}/api/scheduled-tasks/cron/validate?expr=${encodeURIComponent(expr)}`,
  );
  return await res.json();
}
