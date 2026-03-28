/**
 * WebSocket client for real-time event streaming
 */
import WebSocket from "ws";
import { getWsUrl } from "./config.js";

export type WsEvent = {
  type: string;
  payload?: unknown;
  ts?: number;
};

export type WsEventHandler = (event: WsEvent) => void;

export function connectWs(opts?: {
  onOpen?: () => void;
  onEvent?: WsEventHandler;
  onClose?: () => void;
  onError?: (err: Error) => void;
  subscribeTaskIds?: string[];
}): WebSocket {
  const ws = new WebSocket(getWsUrl());

  ws.on("open", () => {
    // Subscribe to specific task outputs if requested
    if (opts?.subscribeTaskIds) {
      for (const taskId of opts.subscribeTaskIds) {
        ws.send(JSON.stringify({ type: "subscribe_task", taskId }));
      }
    }
    opts?.onOpen?.();
  });

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      // Handle batched events (cli_output, subtask_update)
      if (Array.isArray(data)) {
        for (const event of data) {
          opts?.onEvent?.(event);
        }
      } else {
        opts?.onEvent?.(data);
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on("close", () => opts?.onClose?.());
  ws.on("error", (err) => opts?.onError?.(err));

  return ws;
}
