import type { Express, Request, Response } from "express";
import type { DatabaseSync } from "node:sqlite";
import { startExecutionLoop, cancelRun } from "./execution-loop.ts";
import { getRun, getRunsByTaskId, getRunEvents } from "./store.ts";
import type { StartRunOptions } from "./types.ts";

interface RegisterAgentRuntimeRoutesDeps {
  app: Express;
  db: DatabaseSync;
  broadcast: (type: string, payload: unknown) => void;
  appendTaskLog: (taskId: string | null, kind: string, message: string) => void;
  resolveProjectPath: (projectId: string) => string;
  nowMs: () => number;
}

// In-memory map of active runs → AbortControllers
const activeRuns = new Map<string, AbortController>();

export function registerAgentRuntimeRoutes(deps: RegisterAgentRuntimeRoutesDeps) {
  const { app, db, broadcast, appendTaskLog, resolveProjectPath, nowMs } = deps;

  /**
   * POST /api/agent-runtime/run
   * Start an agent runtime execution for a task.
   */
  app.post("/api/agent-runtime/run", async (req: Request, res: Response) => {
    const body = req.body as {
      agentId?: string;
      taskId?: string;
      projectId?: string;
      model?: string;
      maxTurns?: number;
      apiProviderId?: string;
    };

    if (!body.agentId || !body.taskId) {
      res.status(400).json({ error: "agentId and taskId are required" });
      return;
    }

    // Validate task exists and is not already running
    const task = db.prepare("SELECT id, title, project_id, status FROM tasks WHERE id = ?").get(body.taskId) as
      | { id: string; title: string; project_id: string | null; status: string }
      | undefined;
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.status === "running") {
      res.status(409).json({ error: "Task is already running" });
      return;
    }

    // Validate agent exists
    const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(body.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    const projectId = body.projectId ?? task.project_id ?? undefined;
    let projectPath = "";
    if (projectId) {
      try {
        projectPath = resolveProjectPath(projectId);
      } catch {
        // project path optional
      }
    }

    const options: StartRunOptions = {
      agentId: body.agentId,
      taskId: body.taskId,
      projectId,
      projectPath,
      model: body.model,
      maxTurns: body.maxTurns,
      apiProviderId: body.apiProviderId,
    };

    const abortController = new AbortController();

    try {
      const runId = await startExecutionLoop(
        { db, broadcast, appendTaskLog, nowMs },
        options,
        task.title,
        abortController,
      );
      activeRuns.set(runId, abortController);
      res.json({ runId, status: "running" });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  /**
   * POST /api/agent-runtime/:runId/stop
   * Cancel a running execution.
   */
  app.post("/api/agent-runtime/:runId/stop", (req: Request, res: Response) => {
    const runId = String(req.params["runId"] ?? "");
    const run = getRun(db, runId);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    cancelRun(runId, activeRuns);
    db.prepare("UPDATE agent_runtime_runs SET status = 'cancelled', completed_at = ? WHERE id = ? AND status = 'running'")
      .run(nowMs(), runId);
    res.json({ ok: true });
  });

  /**
   * GET /api/agent-runtime/:runId
   * Get run status and metadata.
   */
  app.get("/api/agent-runtime/:runId", (req: Request, res: Response) => {
    const runId = String(req.params["runId"] ?? "");
    const run = getRun(db, runId);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json(run);
  });

  /**
   * GET /api/agent-runtime/:runId/events
   * Get all events for a run.
   */
  app.get("/api/agent-runtime/:runId/events", (req: Request, res: Response) => {
    const runId = String(req.params["runId"] ?? "");
    const run = getRun(db, runId);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    const events = getRunEvents(db, runId);
    res.json(events);
  });

  /**
   * GET /api/agent-runtime/task/:taskId
   * Get all runs for a task.
   */
  app.get("/api/agent-runtime/task/:taskId", (req: Request, res: Response) => {
    const taskId = String(req.params["taskId"] ?? "");
    const runs = getRunsByTaskId(db, taskId);
    res.json(runs);
  });
}
