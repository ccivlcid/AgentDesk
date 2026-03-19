import { createRequire } from "module";
const require = createRequire(import.meta.url);
// node-pty uses native bindings — load via CJS require
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodePty = require("node-pty") as typeof import("node-pty");

import { WebSocket } from "ws";
import logger from "../../lib/logger.ts";
import os from "node:os";
import fs from "node:fs";

export interface PtySession {
  id: string;
  pty: import("node-pty").IPty;
  ownerWs: WebSocket;
  cwd: string;
  shell: string;
  taskId?: string; // linked task — PTY output is forwarded to task logs
}

function getDefaultShell(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/bash";
}

export function createPtyManager(
  sendRawToClient: (ws: WebSocket, type: string, payload: unknown) => void,
  onTaskData?: (taskId: string, data: string) => void,
) {
  const sessions = new Map<string, PtySession>();

  function createSession(
    ws: WebSocket,
    opts: { id: string; cwd?: string; cols?: number; rows?: number; shell?: string; taskId?: string },
  ): PtySession {
    const shell = opts.shell || getDefaultShell();
    const rawCwd = opts.cwd || os.homedir();
    const cwd = (rawCwd && fs.existsSync(rawCwd)) ? rawCwd : os.homedir();
    const cols = opts.cols ?? 120;
    const rows = opts.rows ?? 30;

    // Destroy existing session for this id if any
    if (sessions.has(opts.id)) {
      destroySession(opts.id);
    }

    const spawnOpts: Record<string, unknown> = {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      } as Record<string, string>,
    };
    // Windows: ConPTY uses AttachConsole which fails when the server has no console
    // (e.g. run via npm/pnpm or from IDE). Use legacy WinPTY to avoid crash on PTY exit.
    if (process.platform === "win32") {
      spawnOpts.useConpty = false;
    }
    const ptyProcess = nodePty.spawn(shell, [], spawnOpts);

    const session: PtySession = { id: opts.id, pty: ptyProcess, ownerWs: ws, cwd, shell, taskId: opts.taskId };
    sessions.set(opts.id, session);

    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        sendRawToClient(ws, "pty_output", { id: opts.id, data });
      }
      if (opts.taskId && onTaskData) {
        onTaskData(opts.taskId, data);
      }
    });

    ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
      sessions.delete(opts.id);
      if (ws.readyState === WebSocket.OPEN) {
        sendRawToClient(ws, "pty_exit", { id: opts.id, exitCode });
      }
      logger.info({ id: opts.id, exitCode }, "[pty] session exited");
    });

    logger.info({ id: opts.id, shell, cwd, cols, rows }, "[pty] session created");
    return session;
  }

  function writeToSession(id: string, data: string): void {
    sessions.get(id)?.pty.write(data);
  }

  function resizeSession(id: string, cols: number, rows: number): void {
    const s = sessions.get(id);
    if (s) {
      s.pty.resize(cols, rows);
    }
  }

  function destroySession(id: string): void {
    const s = sessions.get(id);
    if (!s) return;
    try {
      s.pty.kill();
    } catch {
      // already dead
    }
    sessions.delete(id);
    logger.info({ id }, "[pty] session destroyed");
  }

  function destroySessionsForClient(ws: WebSocket): void {
    for (const [id, session] of sessions) {
      if (session.ownerWs === ws) {
        destroySession(id);
      }
    }
  }

  return {
    createSession,
    writeToSession,
    resizeSession,
    destroySession,
    destroySessionsForClient,
  };
}

export type PtyManager = ReturnType<typeof createPtyManager>;
