const BASE = "";

export interface TaskDependencyItem {
  id: string;
  title: string;
  status: string;
  priority: number;
  task_type: string;
  assigned_agent_name: string;
  assigned_agent_name_ko: string;
  dep_created_at: number;
}

export interface TaskDependenciesResponse {
  ok: boolean;
  predecessors: TaskDependencyItem[];
  dependents: TaskDependencyItem[];
}

export async function getTaskDependencies(taskId: string): Promise<TaskDependenciesResponse> {
  const res = await fetch(`${BASE}/api/tasks/${encodeURIComponent(taskId)}/dependencies`);
  return res.json();
}

export async function addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/api/tasks/${encodeURIComponent(taskId)}/dependencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ depends_on_task_id: dependsOnTaskId }),
  });
  return res.json();
}

export async function removeTaskDependency(taskId: string, depId: string): Promise<{ ok: boolean }> {
  const res = await fetch(
    `${BASE}/api/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(depId)}`,
    { method: "DELETE" },
  );
  return res.json();
}
