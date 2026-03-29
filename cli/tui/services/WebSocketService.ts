/**
 * WebSocket event streaming — replaces useWebSocket hook.
 * Connects to server, subscribes to session, emits typed events.
 */
import { EventEmitter } from "events";
import { connectWs, type WsEvent } from "../../lib/ws.js";
import type WebSocket from "ws";
import type { ChatMessage } from "../types.js";

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private eventQueue: WsEvent[] = [];

  connect(sessionId: string): void {
    this.disconnect();

    this.ws = connectWs({
      onOpen: () => {
        this.ws?.send(JSON.stringify({ type: "subscribe_session", sessionId }));
      },
      onEvent: (event: WsEvent) => {
        this.eventQueue.push(event);
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => {
            const batch = this.eventQueue.splice(0);
            this.flushTimer = null;
            for (const evt of batch) {
              this.processEvent(evt);
            }
          }, 16);
        }
      },
    });
  }

  disconnect(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private processEvent(event: WsEvent): void {
    // Forward raw event for sidebar updates
    this.emit("event", event.type, event.payload);

    if (event.type === "session_message") {
      const p = event.payload as {
        role?: string;
        content?: string;
        agent_name?: string;
      };
      const msg: ChatMessage = {
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: (p.role as ChatMessage["role"]) ?? "system",
        content: p.content ?? "",
        agentName: p.agent_name,
        timestamp: event.ts ?? Date.now(),
      };
      this.emit("message", msg);
    }

    if (event.type === "task_update") {
      const p = event.payload as {
        title?: string;
        status?: string;
        agent_name?: string;
      };
      const msg: ChatMessage = {
        id: `task-${Date.now()}`,
        role: "system",
        content: `[TASK] ${p.title ?? "?"} -> ${p.status ?? "?"}${p.agent_name ? ` (${p.agent_name})` : ""}`,
        timestamp: event.ts ?? Date.now(),
      };
      this.emit("message", msg);
    }

    if (event.type === "kickoff_stage") {
      const p = event.payload as { stage?: string };
      const msg: ChatMessage = {
        id: `stage-${Date.now()}`,
        role: "system",
        content: `[STAGE] ${p.stage}`,
        timestamp: event.ts ?? Date.now(),
      };
      this.emit("message", msg);
    }
  }
}
