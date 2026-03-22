import { del, post, put, request } from "./core";

export interface ProjectTypeTemplate {
  id: string;
  name: string;
  name_ko: string | null;
  name_ja: string | null;
  name_zh: string | null;
  description: string | null;
  icon_svg: string | null;
  default_directive: string | null;
  placeholder_goal: string | null;
  recommended_agent_count: number;
  tags: string | null;
  is_default: number;
  created_at: number;
  updated_at: number;
}

export async function fetchProjectTypeTemplates(): Promise<ProjectTypeTemplate[]> {
  const res = await request<{ ok: boolean; templates: ProjectTypeTemplate[] }>(
    "/api/project-type-templates",
  );
  return res.templates;
}

export async function createProjectTypeTemplate(
  data: Partial<Omit<ProjectTypeTemplate, "id" | "is_default" | "created_at" | "updated_at">>,
): Promise<ProjectTypeTemplate> {
  const res = await post<{ ok: boolean; template: ProjectTypeTemplate }>(
    "/api/project-type-templates",
    data,
  );
  return res.template;
}

export async function updateProjectTypeTemplate(
  id: string,
  data: Partial<Omit<ProjectTypeTemplate, "id" | "is_default" | "created_at" | "updated_at">>,
): Promise<ProjectTypeTemplate> {
  const res = await put<{ ok: boolean; template: ProjectTypeTemplate }>(
    `/api/project-type-templates/${id}`,
    data,
  );
  return res.template;
}

export async function deleteProjectTypeTemplate(id: string): Promise<void> {
  await del(`/api/project-type-templates/${id}`);
}
