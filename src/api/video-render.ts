import { request, post } from "./core";

export interface VideoRenderJob {
  id: string;
  taskId: string;
  projectPath: string;
  entryFile: string;
  compositionId: string;
  outputPath: string;
  status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  logLines: string[];
  pid: number | null;
}

export async function getVideoRenderJobs(taskId?: string): Promise<VideoRenderJob[]> {
  const params = new URLSearchParams();
  if (taskId) params.set("task_id", taskId);
  const q = params.toString();
  const j = await request<{ ok: boolean; jobs: VideoRenderJob[] }>(
    `/api/video-render/jobs${q ? `?${q}` : ""}`,
  );
  return j.jobs;
}

export async function getVideoRenderJob(id: string): Promise<VideoRenderJob> {
  const j = await request<{ ok: boolean; job: VideoRenderJob }>(`/api/video-render/jobs/${id}`);
  return j.job;
}

export async function createVideoRenderJob(data: {
  task_id: string;
  project_path: string;
  entry_file: string;
  composition_id: string;
  output_path?: string;
  auto_start?: boolean;
}): Promise<VideoRenderJob> {
  const j = (await post(`/api/video-render/jobs`, data)) as { ok: boolean; job: VideoRenderJob };
  return j.job;
}

export async function startVideoRenderJob(id: string): Promise<VideoRenderJob> {
  const j = (await post(`/api/video-render/jobs/${id}/start`)) as { ok: boolean; job: VideoRenderJob };
  return j.job;
}

export async function cancelVideoRenderJob(id: string): Promise<void> {
  await post(`/api/video-render/jobs/${id}/cancel`);
}
