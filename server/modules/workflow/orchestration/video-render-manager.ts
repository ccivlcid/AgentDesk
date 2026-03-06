import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface VideoRenderJob {
  id: string;
  taskId: string;
  projectPath: string;
  entryFile: string;
  compositionId: string;
  outputPath: string;
  status: "queued" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number; // 0-100
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  logLines: string[];
  pid: number | null;
}

const renderJobs = new Map<string, VideoRenderJob>();
const activeProcesses = new Map<string, ChildProcess>();

const MAX_LOG_LINES = 200;

function findRemotionBin(projectPath: string): string {
  // Try project-local first
  const localBin = path.join(projectPath, "node_modules", ".bin", "remotion");
  if (fs.existsSync(localBin) || fs.existsSync(localBin + ".cmd")) {
    return process.platform === "win32" ? localBin + ".cmd" : localBin;
  }
  // Fallback to pnpm exec
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function buildRenderCommand(job: VideoRenderJob): { cmd: string; args: string[] } {
  const remotionBin = findRemotionBin(job.projectPath);
  if (remotionBin.includes("pnpm")) {
    return {
      cmd: remotionBin,
      args: ["exec", "remotion", "render", job.entryFile, job.compositionId, job.outputPath, "--log=verbose"],
    };
  }
  return {
    cmd: remotionBin,
    args: ["render", job.entryFile, job.compositionId, job.outputPath, "--log=verbose"],
  };
}

function parseProgress(line: string): number | null {
  // Remotion outputs progress like: "Rendering frames (50/100)"  or " 50% done"
  const frameMatch = /Rendering.*?\((\d+)\/(\d+)\)/.exec(line);
  if (frameMatch) {
    const current = parseInt(frameMatch[1], 10);
    const total = parseInt(frameMatch[2], 10);
    if (total > 0) return Math.round((current / total) * 100);
  }
  const pctMatch = /(\d+)%/.exec(line);
  if (pctMatch) return parseInt(pctMatch[1], 10);
  return null;
}

export function createVideoRenderJob(input: {
  taskId: string;
  projectPath: string;
  entryFile: string;
  compositionId: string;
  outputPath?: string;
}): VideoRenderJob {
  const outputPath =
    input.outputPath || path.join(input.projectPath, "video_output", "final.mp4");

  const job: VideoRenderJob = {
    id: randomUUID(),
    taskId: input.taskId,
    projectPath: input.projectPath,
    entryFile: input.entryFile,
    compositionId: input.compositionId,
    outputPath,
    status: "queued",
    progress: 0,
    startedAt: null,
    completedAt: null,
    error: null,
    logLines: [],
    pid: null,
  };

  renderJobs.set(job.id, job);
  return job;
}

export function startVideoRenderJob(
  jobId: string,
  callbacks?: {
    onProgress?: (job: VideoRenderJob) => void;
    onComplete?: (job: VideoRenderJob) => void;
    onError?: (job: VideoRenderJob) => void;
  },
): VideoRenderJob | null {
  const job = renderJobs.get(jobId);
  if (!job || job.status !== "queued") return null;

  const { cmd, args } = buildRenderCommand(job);

  job.status = "rendering";
  job.startedAt = Date.now();

  // Ensure output directory exists
  try {
    fs.mkdirSync(path.dirname(job.outputPath), { recursive: true });
  } catch {
    // ignore
  }

  try {
    const proc = spawn(cmd, args, {
      cwd: job.projectPath,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    job.pid = proc.pid ?? null;
    activeProcesses.set(jobId, proc);

    const handleLine = (line: string) => {
      const text = line.toString().trim();
      if (!text) return;
      if (job.logLines.length >= MAX_LOG_LINES) {
        job.logLines.shift();
      }
      job.logLines.push(text);

      const progress = parseProgress(text);
      if (progress !== null) {
        job.progress = progress;
        callbacks?.onProgress?.(job);
      }
    };

    proc.stdout?.on("data", (data: Buffer) => {
      data.toString().split("\n").forEach(handleLine);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      data.toString().split("\n").forEach(handleLine);
    });

    proc.on("close", (code) => {
      activeProcesses.delete(jobId);
      job.completedAt = Date.now();
      job.pid = null;

      if (code === 0) {
        job.status = "completed";
        job.progress = 100;

        // Verify output exists
        try {
          const stat = fs.statSync(job.outputPath);
          if (stat.size === 0) {
            job.status = "failed";
            job.error = "Output file is empty (0 bytes)";
          }
        } catch {
          job.status = "failed";
          job.error = `Output file not found: ${job.outputPath}`;
        }

        callbacks?.onComplete?.(job);
      } else {
        job.status = "failed";
        job.error = `Render exited with code ${code}`;
        const lastLines = job.logLines.slice(-5).join("\n");
        if (lastLines) job.error += `\n${lastLines}`;
        callbacks?.onError?.(job);
      }
    });

    proc.on("error", (err) => {
      activeProcesses.delete(jobId);
      job.status = "failed";
      job.completedAt = Date.now();
      job.pid = null;
      job.error = err.message;
      callbacks?.onError?.(job);
    });
  } catch (err: unknown) {
    job.status = "failed";
    job.completedAt = Date.now();
    job.error = err instanceof Error ? err.message : String(err);
    callbacks?.onError?.(job);
  }

  return job;
}

export function cancelVideoRenderJob(jobId: string): boolean {
  const job = renderJobs.get(jobId);
  if (!job || job.status !== "rendering") return false;

  const proc = activeProcesses.get(jobId);
  if (proc) {
    proc.kill("SIGTERM");
    activeProcesses.delete(jobId);
  }

  job.status = "cancelled";
  job.completedAt = Date.now();
  job.pid = null;
  return true;
}

export function getVideoRenderJob(jobId: string): VideoRenderJob | null {
  return renderJobs.get(jobId) ?? null;
}

export function getVideoRenderJobsForTask(taskId: string): VideoRenderJob[] {
  const jobs: VideoRenderJob[] = [];
  for (const job of renderJobs.values()) {
    if (job.taskId === taskId) jobs.push(job);
  }
  return jobs.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export function getAllVideoRenderJobs(): VideoRenderJob[] {
  return Array.from(renderJobs.values()).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export function cleanupOldRenderJobs(maxAgeMs = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAgeMs;
  let cleaned = 0;
  for (const [id, job] of renderJobs) {
    if (job.completedAt && job.completedAt < cutoff) {
      renderJobs.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}
