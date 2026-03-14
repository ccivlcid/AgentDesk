import { WebSocket } from "ws";
import logger from "../lib/logger.ts";

const MAX_CLI_CHUNK = 4096; // 4KB per chunk for large stdout lines

export function createWsHub(nowMs: () => number): {
  wsClients: Set<WebSocket>;
  broadcast: (type: string, payload: unknown) => void;
  handleClientMessage: (ws: WebSocket, raw: string) => void;
  removeClient: (ws: WebSocket) => void;
} {
  const wsClients = new Set<WebSocket>();

  // Per-client task subscriptions: only cli_output events are filtered by subscription.
  // Clients with no subscriptions receive no cli_output events.
  // All other event types are broadcast to every connected client regardless.
  const taskSubscriptions = new Map<WebSocket, Set<string>>();

  function sendRaw(type: string, payload: unknown): void {
    const message = JSON.stringify({ type, payload, ts: nowMs() });
    for (const ws of wsClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  function sendRawToClient(ws: WebSocket, type: string, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload, ts: nowMs() }));
    }
  }

  // Batched broadcast for high-frequency streaming event types.
  // Collects payloads during a cooldown window, then flushes them all.
  // Only truly high-frequency types are batched; agent_status is excluded
  // because it is paired with task_update (unbatched) and delaying it
  // causes visible ordering mismatches on the frontend.
  const BATCH_INTERVAL: Record<string, number> = {
    cli_output: 250, // highest frequency (process stdout/stderr streams)
    subtask_update: 150, // moderate frequency
  };
  const MAX_BATCH_QUEUE = 60;
  const batches = new Map<string, { queue: unknown[]; timer: ReturnType<typeof setTimeout> }>();

  function enqueueOrSendCliOutput(payload: unknown): void {
    // cli_output is subscription-filtered: only send to clients that subscribed to the taskId.
    // Clients with an empty or missing subscription set receive nothing.
    const p = payload as { taskId?: string; line?: string };
    const taskId = p.taskId;

    const sendToSubscribed = (chunkPayload: unknown) => {
      const msg = JSON.stringify({ type: "cli_output", payload: chunkPayload, ts: nowMs() });
      for (const ws of wsClients) {
        if (ws.readyState !== WebSocket.OPEN) continue;
        const subs = taskSubscriptions.get(ws);
        if (!subs || !taskId || !subs.has(taskId)) continue;
        ws.send(msg);
      }
    };

    const existing = batches.get("cli_output");
    if (existing) {
      if (existing.queue.length < MAX_BATCH_QUEUE) {
        existing.queue.push(payload);
      } else {
        // Over cap: shed oldest to prevent unbounded growth
        existing.queue.shift();
        existing.queue.push(payload);
      }
      return;
    }

    // First event: send immediately, then open a batch window
    sendToSubscribed(payload);
    const entry: { queue: unknown[]; timer: ReturnType<typeof setTimeout> } = {
      queue: [],
      timer: setTimeout(() => {
        const items = entry.queue;
        batches.delete("cli_output");
        for (const item of items) {
          try {
            sendToSubscribed(item);
          } catch {
            /* skip failed item, continue flushing */
          }
        }
      }, BATCH_INTERVAL.cli_output),
    };
    batches.set("cli_output", entry);
  }

  function broadcast(type: string, payload: unknown): void {
    // Step 1: stdout chunk splitting for cli_output
    if (type === "cli_output") {
      const p = payload as { taskId?: string; line?: string };
      const line = p.line ?? "";
      if (line.length > MAX_CLI_CHUNK) {
        // Split oversized line into MAX_CLI_CHUNK-sized chunks and enqueue each
        for (let i = 0; i < line.length; i += MAX_CLI_CHUNK) {
          const chunk = line.slice(i, i + MAX_CLI_CHUNK);
          enqueueOrSendCliOutput({ ...p, line: chunk });
        }
        return;
      }
      // Step 2: subscription-filtered delivery for cli_output
      enqueueOrSendCliOutput(payload);
      return;
    }

    const interval = BATCH_INTERVAL[type];
    if (!interval) {
      sendRaw(type, payload);
      return;
    }

    const existing = batches.get(type);
    if (existing) {
      if (existing.queue.length < MAX_BATCH_QUEUE) {
        existing.queue.push(payload);
      }
      // Over cap: shed oldest to prevent unbounded growth
      else {
        existing.queue.shift();
        existing.queue.push(payload);
      }
      return;
    }

    // First event: send immediately, then open a batch window
    sendRaw(type, payload);
    const entry: { queue: unknown[]; timer: ReturnType<typeof setTimeout> } = {
      queue: [],
      timer: setTimeout(() => {
        const items = entry.queue;
        batches.delete(type);
        for (const p of items) {
          try {
            sendRaw(type, p);
          } catch {
            /* skip failed item, continue flushing */
          }
        }
      }, interval),
    };
    batches.set(type, entry);
  }

  // Handle incoming client control messages for task channel subscriptions.
  // Supported message types:
  //   { type: "subscribe_task",   taskId: "<id>" }  — start receiving cli_output for taskId
  //   { type: "unsubscribe_task", taskId: "<id>" }  — stop  receiving cli_output for taskId
  function handleClientMessage(ws: WebSocket, raw: string): void {
    let msg: { type?: string; taskId?: string };
    try {
      msg = JSON.parse(raw) as { type?: string; taskId?: string };
    } catch {
      return; // ignore malformed messages
    }

    const { type, taskId } = msg;
    if (!type || !taskId || typeof taskId !== "string") return;

    if (type === "subscribe_task") {
      if (!taskSubscriptions.has(ws)) {
        taskSubscriptions.set(ws, new Set());
      }
      taskSubscriptions.get(ws)!.add(taskId);
      logger.debug({ taskId }, "[ws] client subscribed to task cli_output");
    } else if (type === "unsubscribe_task") {
      taskSubscriptions.get(ws)?.delete(taskId);
      logger.debug({ taskId }, "[ws] client unsubscribed from task cli_output");
    }
  }

  // Clean up subscription state when a client disconnects.
  function removeClient(ws: WebSocket): void {
    wsClients.delete(ws);
    taskSubscriptions.delete(ws);
  }

  return { wsClients, broadcast, handleClientMessage, removeClient };
}
