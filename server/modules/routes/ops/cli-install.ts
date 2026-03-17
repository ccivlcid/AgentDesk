/**
 * CLI One-click Install Routes
 * POST /api/cli-install       → spawn npm install -g, return jobId
 * GET  /api/cli-install/:jobId → poll status + accumulated logs
 */
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { Express, Request, Response } from "express";
import logger from "../../../lib/logger.ts";

interface InstallJob {
  provider: string;
  status: "running" | "success" | "failed";
  logs: string[];
  exitCode: number | null;
}

const jobs = new Map<string, InstallJob>();

// npm package to install per provider
const INSTALL_CMDS: Record<string, string> = {
  claude: "@anthropic-ai/claude-code",
  codex: "@openai/codex",
  gemini: "@google/gemini-cli",
  opencode: "opencode-ai",
};

interface Deps {
  app: Express;
}

export function registerCliInstallRoutes({ app }: Deps): void {
  /** POST /api/cli-install */
  app.post("/api/cli-install", (req: Request, res: Response) => {
    const { provider } = req.body as { provider?: string };
    if (!provider || !INSTALL_CMDS[provider]) {
      res.status(400).json({ ok: false, error: "Unknown provider" });
      return;
    }

    const pkg = INSTALL_CMDS[provider];
    const jobId = randomUUID();
    const job: InstallJob = { provider, status: "running", logs: [], exitCode: null };
    jobs.set(jobId, job);

    logger.info({ provider, pkg }, "[cli-install] starting install");

    const isWin = process.platform === "win32";
    const child = spawn("npm", ["install", "-g", pkg], {
      shell: isWin,
      env: { ...process.env },
    });

    const onData = (chunk: Buffer) => {
      const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
      job.logs.push(...lines);
    };

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("close", (code) => {
      job.exitCode = code;
      job.status = code === 0 ? "success" : "failed";
      logger.info({ provider, code }, "[cli-install] finished");
      // auto-cleanup after 5 min
      setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
    });

    res.json({ ok: true, jobId });
  });

  /** GET /api/cli-install/:jobId */
  app.get("/api/cli-install/:jobId", (req: Request, res: Response) => {
    const job = jobs.get(String(req.params.jobId));
    if (!job) {
      res.status(404).json({ ok: false, error: "Job not found" });
      return;
    }
    res.json({
      ok: true,
      status: job.status,
      logs: job.logs,
      exitCode: job.exitCode,
    });
  });
}
