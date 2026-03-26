import { request } from "./core";

export interface TaskTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  department_id: string | null;
  task_type: string;
  priority: number;
  workflow_pack_key: string | null;
  workflow_meta_json: string | null;
  created_at: number;
  updated_at: number;
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const j = await request<{ ok: boolean; templates: TaskTemplate[] }>("/api/task-templates");
  return j.templates;
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  await request(`/api/task-templates/${id}`, { method: "DELETE" });
}
