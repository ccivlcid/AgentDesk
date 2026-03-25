import type { RuntimeContext } from "../types/runtime-context.ts";
import type { IncomingMessage } from "node:http";
import type { WebSocket as WsSocket } from "ws";
import path from "path";
import { execSync } from "node:child_process";
import { HOST, PKG_VERSION, PORT } from "../config/runtime.ts";
import logger from "../lib/logger.ts";
// messenger receivers removed (Chat/Messenger system deleted)
import { registerGracefulShutdownHandlers } from "./lifecycle/register-graceful-shutdown.ts";
// workflow scheduler removed (workflow builder UI removed)
// local-llm management removed (backend-manager, metrics-collector)
// synapse watchers removed
import { rotateBreaks } from "./lifecycle/break-rotation.ts";
import { recoverOrphanInProgressTasks } from "./lifecycle/recover-orphan-in-progress-tasks.ts";
import type { InProgressRecoveryReason } from "./lifecycle/recover-orphan-in-progress-tasks.ts";
import { recoverInterruptedWorkflowOnStartup as runRecoverInterruptedWorkflowOnStartup } from "./lifecycle/recover-interrupted-workflow-on-startup.ts";
import { updateRunningTaskHeartbeats } from "./lifecycle/running-task-heartbeats.ts";
import { markStalledInProgressTasks } from "./lifecycle/mark-stalled-in-progress-tasks.ts";
import { recoverStalledTasks } from "./lifecycle/recover-stalled-tasks.ts";
import { enforceTaskTimeouts } from "./lifecycle/enforce-task-timeouts.ts";
import { sweepPendingSubtaskDelegations } from "./lifecycle/sweep-pending-subtask-delegations.ts";

export function startLifecycle(ctx: RuntimeContext): void {
  const {
    IN_PROGRESS_ORPHAN_GRACE_MS,
    IN_PROGRESS_ORPHAN_SWEEP_MS,
    SUBTASK_DELEGATION_SWEEP_MS,
    WebSocketServer,
    activeProcesses,
    app,
    appendTaskLog,
    broadcast,
    handleClientMessage,
    removeClient,
    clearTaskWorkflowState,
    db,
    dbPath,
    distDir,
    endTaskExecutionSession,
    express,
    finishReview,
    getDecryptedOAuthToken,
    handleTaskRunComplete,
    isAgentInMeeting,
    isIncomingMessageAuthenticated,
    isIncomingMessageOriginTrusted,
    isPidAlive,
    isProduction,
    killPidTree,
    notifyClient,
    nowMs,
    processSubtaskDelegations,
    reconcileCrossDeptSubtasks,
    refreshGoogleToken,
    resolveLang,
    rollbackTaskWorktree,
    runInTransaction,
    stopProgressTimer,
    stopRequestedTasks,
    taskExecutionSessions,
    wsClients,
    logsDir,
  } = ctx as RuntimeContext & Record<string, unknown>;

  const TASK_HEARTBEAT_SWEEP_MS = 30_000;

  if (isProduction) {
    app.use(express.static(distDir));
    app.get(
      "/{*splat}",
      (
        req: { path: string },
        res: {
          status(code: number): { json(payload: unknown): unknown };
          sendFile(filePath: string): unknown;
        },
      ) => {
        if (req.path.startsWith("/api/") || req.path === "/health" || req.path === "/healthz") {
          return res.status(404).json({ error: "not_found" });
        }
        res.sendFile(path.join(distDir, "index.html"));
      },
    );
  }

  const rotateBreaksBound = () => rotateBreaks({ db, broadcast, isAgentInMeeting });

  const recoverOrphanBound = (reason: InProgressRecoveryReason) =>
    recoverOrphanInProgressTasks(reason, {
      db,
      nowMs,
      logsDir,
      activeProcesses,
      isPidAlive,
      appendTaskLog,
      handleTaskRunComplete,
      stopProgressTimer,
      clearTaskWorkflowState,
      endTaskExecutionSession,
      broadcast,
      resolveLang,
      notifyClient,
      IN_PROGRESS_ORPHAN_GRACE_MS,
    });

  const recoverInterruptedWorkflowOnStartupBound = () =>
    runRecoverInterruptedWorkflowOnStartup({
      db,
      runInTransaction,
      reconcileCrossDeptSubtasks,
      recoverOrphan: recoverOrphanBound,
      finishReview,
    });

  const updateRunningTaskHeartbeatsBound = () =>
    updateRunningTaskHeartbeats({ db, nowMs, logsDir, activeProcesses, taskExecutionSessions });

  const markStalledInProgressTasksBound = () =>
    markStalledInProgressTasks({ db, nowMs, broadcast, activeProcesses, appendTaskLog });

  const recoverStalledTasksBound = () =>
    recoverStalledTasks({
      db,
      nowMs,
      broadcast,
      appendTaskLog,
      stopProgressTimer,
      clearTaskWorkflowState,
      endTaskExecutionSession,
      resolveLang,
      notifyClient,
    });

  const enforceTaskTimeoutsBound = () =>
    enforceTaskTimeouts({
      db,
      nowMs,
      broadcast,
      activeProcesses,
      killPidTree,
      appendTaskLog,
      stopProgressTimer,
      clearTaskWorkflowState,
      endTaskExecutionSession,
      resolveLang,
      notifyClient,
    });

  const sweepPendingSubtaskDelegationsBound = () =>
    sweepPendingSubtaskDelegations({ db, processSubtaskDelegations });

  setTimeout(rotateBreaksBound, 5_000);
  setInterval(rotateBreaksBound, 60_000);
  setTimeout(recoverInterruptedWorkflowOnStartupBound, 3_000);
  setInterval(updateRunningTaskHeartbeatsBound, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(markStalledInProgressTasksBound, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(recoverStalledTasksBound, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(enforceTaskTimeoutsBound, TASK_HEARTBEAT_SWEEP_MS);
  setInterval(() => recoverOrphanBound("interval"), IN_PROGRESS_ORPHAN_SWEEP_MS);
  setTimeout(sweepPendingSubtaskDelegationsBound, 4_000);
  setInterval(sweepPendingSubtaskDelegationsBound, SUBTASK_DELEGATION_SWEEP_MS);
  // messenger receivers removed (Chat/Messenger system deleted)

  // In dev mode, kill any stale process occupying our port before binding.
  // This prevents cascading "Port already in use" → "database is locked" errors
  // that occur when tsx/HMR restarts without fully tearing down the prior process.
  if (!isProduction) {
    try {
      if (process.platform === "win32") {
        const out = execSync(`netstat -ano | findstr ":${PORT}"`, { encoding: "utf8", timeout: 3_000 }).trim();
        const pids = new Set<number>();
        for (const line of out.split("\n")) {
          if (line.includes("LISTENING")) {
            const parts = line.trim().split(/\s+/);
            const pid = Number(parts[parts.length - 1]);
            if (pid && pid !== process.pid) pids.add(pid);
          }
        }
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { encoding: "utf8", timeout: 3_000 });
            logger.info(`[AgentDesk] Killed stale process PID ${pid} on port ${PORT}`);
          } catch { /* already dead */ }
        }
      } else {
        const out = execSync(`lsof -ti :${PORT}`, { encoding: "utf8", timeout: 3_000 }).trim();
        for (const pidStr of out.split("\n")) {
          const pid = Number(pidStr);
          if (pid && pid !== process.pid) {
            try {
              execSync(`kill -9 ${pid}`, { encoding: "utf8", timeout: 3_000 });
              logger.info(`[AgentDesk] Killed stale process PID ${pid} on port ${PORT}`);
            } catch { /* already dead */ }
          }
        }
      }
    } catch { /* no stale process found — this is the normal case */ }
  }

  const server = app.listen(PORT, HOST, () => {
    logger.info(`[AgentDesk] v${PKG_VERSION} listening on http://${HOST}:${PORT} (db: ${dbPath})`);
    if (isProduction) {
      logger.info(`[AgentDesk] mode: production (serving UI from ${distDir})`);
    } else {
      logger.info(`[AgentDesk] mode: development (UI served by Vite on separate port)`);
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `[AgentDesk] Port ${PORT} is already in use. ` +
          `Kill the existing process (e.g. taskkill /F /IM node.exe) and restart.`,
      );
    } else {
      logger.error({ err }, "[AgentDesk] HTTP server error");
    }
    process.exit(1);
  });

  setInterval(
    async () => {
      try {
        const cred = getDecryptedOAuthToken("google_antigravity");
        if (!cred || !cred.refreshToken) return;
        const expiresAtMs = cred.expiresAt && cred.expiresAt < 1e12 ? cred.expiresAt * 1000 : cred.expiresAt;
        if (!expiresAtMs) return;
        if (expiresAtMs < Date.now() + 5 * 60_000) {
          await refreshGoogleToken(cred);
          logger.info("[oauth] Background refresh: Antigravity token renewed");
        }
      } catch (err) {
        logger.error("[oauth] Background refresh failed: %s", err instanceof Error ? err.message : err);
      }
    },
    5 * 60 * 1000,
  );

  const wss = new WebSocketServer({ server });

  const MAX_WS_CLIENTS = 20;

  wss.on("connection", (ws: WsSocket, req: IncomingMessage) => {
    if (!isIncomingMessageOriginTrusted(req) || !isIncomingMessageAuthenticated(req)) {
      ws.close(1008, "unauthorized");
      return;
    }
    if (wsClients.size >= MAX_WS_CLIENTS) {
      ws.close(4008, "too_many_connections");
      return;
    }
    wsClients.add(ws);
    logger.info({ total: wsClients.size }, "[AgentDesk] WebSocket client connected (total: %d)");

    ws.send(
      JSON.stringify({
        type: "connected",
        payload: {
          version: PKG_VERSION,
          app: "AgentDesk",
        },
        ts: nowMs(),
      }),
    );

    ws.on("message", (data: Buffer | string) => {
      handleClientMessage(ws, data.toString());
    });

    ws.on("close", () => {
      removeClient(ws);
      logger.info({ total: wsClients.size }, "[AgentDesk] WebSocket client disconnected (total: %d)");
    });

    ws.on("error", () => {
      removeClient(ws);
    });
  });

  registerGracefulShutdownHandlers({
    activeProcesses,
    stopRequestedTasks,
    killPidTree,
    rollbackTaskWorktree,
    db,
    nowMs,
    endTaskExecutionSession,
    wsClients,
    wss,
    server,
    onBeforeClose: () => {
      // messenger receivers removed
    },
  });
}
