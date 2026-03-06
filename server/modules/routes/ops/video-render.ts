import type { Request, Response } from "express";
import {
  createVideoRenderJob,
  startVideoRenderJob,
  cancelVideoRenderJob,
  getVideoRenderJob,
  getVideoRenderJobsForTask,
  getAllVideoRenderJobs,
  cleanupOldRenderJobs,
} from "../../workflow/orchestration/video-render-manager.ts";

interface VideoRenderRouteDeps {
  app: any;
  broadcast: (event: string, data: unknown) => void;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
}

export function registerVideoRenderRoutes({ app, broadcast, appendTaskLog }: VideoRenderRouteDeps): void {
  // List all render jobs (optionally filtered by task)
  app.get("/api/video-render/jobs", (req: Request, res: Response) => {
    const taskId = req.query.task_id as string | undefined;
    const jobs = taskId ? getVideoRenderJobsForTask(taskId) : getAllVideoRenderJobs();
    res.json({
      ok: true,
      jobs: jobs.map((j) => ({
        ...j,
        logLines: j.logLines.slice(-20), // Only return last 20 lines
      })),
    });
  });

  const idParam = (p: string | string[] | undefined): string =>
    typeof p === "string" ? p : Array.isArray(p) ? p[0] ?? "" : "";

  // Get a specific render job
  app.get("/api/video-render/jobs/:id", (req: Request, res: Response) => {
    const job = getVideoRenderJob(idParam(req.params.id));
    if (!job) return res.status(404).json({ ok: false, error: "job_not_found" });
    return res.json({ ok: true, job });
  });

  // Create and optionally start a render job
  app.post("/api/video-render/jobs", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      task_id?: string;
      project_path?: string;
      entry_file?: string;
      composition_id?: string;
      output_path?: string;
      auto_start?: boolean;
    };

    if (!body.task_id || !body.project_path || !body.entry_file || !body.composition_id) {
      return res.status(400).json({
        ok: false,
        error: "task_id, project_path, entry_file, composition_id required",
      });
    }

    const job = createVideoRenderJob({
      taskId: body.task_id,
      projectPath: body.project_path,
      entryFile: body.entry_file,
      compositionId: body.composition_id,
      outputPath: body.output_path,
    });

    appendTaskLog(body.task_id, "system", `Video render job created: ${job.id} (composition: ${body.composition_id})`);

    if (body.auto_start !== false) {
      startVideoRenderJob(job.id, {
        onProgress: (j) => {
          broadcast("video_render_progress", {
            jobId: j.id,
            taskId: j.taskId,
            progress: j.progress,
            status: j.status,
          });
        },
        onComplete: (j) => {
          appendTaskLog(j.taskId, "system", `Video render completed: ${j.outputPath} (${j.progress}%)`);
          broadcast("video_render_complete", {
            jobId: j.id,
            taskId: j.taskId,
            outputPath: j.outputPath,
            status: "completed",
          });
        },
        onError: (j) => {
          appendTaskLog(j.taskId, "error", `Video render failed: ${j.error}`);
          broadcast("video_render_complete", {
            jobId: j.id,
            taskId: j.taskId,
            status: "failed",
            error: j.error,
          });
        },
      });
    }

    return res.json({ ok: true, job: { ...job, logLines: [] } });
  });

  // Start a queued render job
  app.post("/api/video-render/jobs/:id/start", (req: Request, res: Response) => {
    const job = startVideoRenderJob(idParam(req.params.id), {
      onProgress: (j) => {
        broadcast("video_render_progress", {
          jobId: j.id,
          taskId: j.taskId,
          progress: j.progress,
          status: j.status,
        });
      },
      onComplete: (j) => {
        appendTaskLog(j.taskId, "system", `Video render completed: ${j.outputPath}`);
        broadcast("video_render_complete", {
          jobId: j.id,
          taskId: j.taskId,
          outputPath: j.outputPath,
          status: "completed",
        });
      },
      onError: (j) => {
        appendTaskLog(j.taskId, "error", `Video render failed: ${j.error}`);
        broadcast("video_render_complete", {
          jobId: j.id,
          taskId: j.taskId,
          status: "failed",
          error: j.error,
        });
      },
    });

    if (!job) return res.status(400).json({ ok: false, error: "job_not_found_or_not_queued" });
    return res.json({ ok: true, job: { ...job, logLines: [] } });
  });

  // Cancel a running render job
  app.post("/api/video-render/jobs/:id/cancel", (req: Request, res: Response) => {
    const id = idParam(req.params.id);
    const success = cancelVideoRenderJob(id);
    if (!success) return res.status(400).json({ ok: false, error: "job_not_running" });
    const job = getVideoRenderJob(id);
    if (job) {
      appendTaskLog(job.taskId, "system", `Video render cancelled: ${job.id}`);
    }
    return res.json({ ok: true });
  });

  // Cleanup old completed jobs
  app.post("/api/video-render/cleanup", (_req: Request, res: Response) => {
    const cleaned = cleanupOldRenderJobs();
    res.json({ ok: true, cleaned });
  });
}
