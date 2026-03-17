import { del, patch, post, request } from "./core";
import type { ProjectFolder, ProjectFolderMoveResult } from "../types";

export async function getProjectFolders(): Promise<ProjectFolder[]> {
  const j = await request<{ folders: ProjectFolder[] }>("/api/project-folders");
  return j.folders;
}

export async function createProjectFolder(input: {
  name: string;
  base_path: string;
  color?: string;
  icon?: string;
}): Promise<ProjectFolder> {
  const j = await post("/api/project-folders", input) as { ok: boolean; folder: ProjectFolder };
  return j.folder;
}

export async function updateProjectFolder(
  id: string,
  input: { name?: string; color?: string; icon?: string | null; sort_order?: number },
): Promise<ProjectFolder> {
  const j = await patch(`/api/project-folders/${id}`, input) as { ok: boolean; folder: ProjectFolder };
  return j.folder;
}

export async function deleteProjectFolder(
  id: string,
): Promise<{ ok: boolean; orphaned_project_count: number }> {
  return del(`/api/project-folders/${id}`) as Promise<{ ok: boolean; orphaned_project_count: number }>;
}

export async function addProjectToFolder(
  folderId: string,
  projectId: string,
): Promise<ProjectFolderMoveResult> {
  return post(`/api/project-folders/${folderId}/projects`, { project_id: projectId }) as Promise<ProjectFolderMoveResult>;
}

export async function removeProjectFromFolder(
  folderId: string,
  projectId: string,
): Promise<{ ok: boolean }> {
  return del(`/api/project-folders/${folderId}/projects/${projectId}`) as Promise<{ ok: boolean }>;
}
