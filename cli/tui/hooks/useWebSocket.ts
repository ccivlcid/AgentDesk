import { useEffect, useRef } from "react";
import { connectWs } from "../../lib/ws.js";
import type { ChatMessage } from "../App.js";

interface WsEvent {
  type: string;
  payload: unknown;
  ts?: number;
}

interface UseWebSocketParams {
  sessionId: string | null;
  onMessage: (msg: ChatMessage) => void;
  onEvent?: (type: string, payload: unknown) => void;
}

export function useWebSocket({ sessionId, onMessage, onEvent }: UseWebSocketParams): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!sessionId) return;

    const eventQueueRef: WsEvent[] = [];
    let flushTimer: NodeJS.Timeout | null = null;

    function processEvent(event: WsEvent): void {
      // Forward all events to sidebar hook
      onEventRef.current?.(event.type, event.payload);

      if (event.type === "session_message") {
        const p = event.payload as { role?: string; content?: string; agent_name?: string };
        onMessageRef.current({
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: (p.role as ChatMessage["role"]) ?? "system",
          content: p.content ?? "",
          agentName: p.agent_name,
          timestamp: event.ts ?? Date.now(),
        });
      }
      if (event.type === "task_update") {
        const p = event.payload as { title?: string; status?: string; agent_name?: string };
        onMessageRef.current({
          id: `task-${Date.now()}`,
          role: "system",
          content: `[TASK] ${p.title ?? "?"} -> ${p.status ?? "?"}${p.agent_name ? ` (${p.agent_name})` : ""}`,
          timestamp: event.ts ?? Date.now(),
        });
      }
      if (event.type === "kickoff_stage") {
        const p = event.payload as { stage?: string };
        onMessageRef.current({
          id: `stage-${Date.now()}`,
          role: "system",
          content: `[STAGE] ${p.stage}`,
          timestamp: event.ts ?? Date.now(),
        });
      }
    }

    const ws = connectWs({
      onOpen() {
        ws.send(JSON.stringify({ type: "subscribe_session", sessionId }));
      },
      onEvent(event) {
        eventQueueRef.push(event);
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            const batch = eventQueueRef.splice(0);
            flushTimer = null;
            for (const evt of batch) {
              processEvent(evt);
            }
          }, 16);
        }
      },
    });

    return () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      ws.close();
    };
  }, [sessionId]);
}
