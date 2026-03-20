import { useEffect, useRef, useCallback, useState } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";

export type LiveEventType = "activated" | "done" | "error";

export interface LiveEvent {
  type: LiveEventType;
  ts: number;
}

const TTL_MS = 3000; // event visible for 3 seconds

/**
 * Tracks recent agent status/task changes via WebSocket.
 * Returns a map of agentId → LiveEvent for recently changed agents.
 */
export function useFlowLiveUpdates(): Map<string, LiveEvent> {
  const { on } = useWebSocket();
  const [liveEvents, setLiveEvents] = useState<Map<string, LiveEvent>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setEvent = useCallback((agentId: string, type: LiveEventType) => {
    const ts = Date.now();
    setLiveEvents((prev) => {
      const next = new Map(prev);
      next.set(agentId, { type, ts });
      return next;
    });

    // clear previous timer for same agent
    const existing = timersRef.current.get(agentId);
    if (existing) clearTimeout(existing);

    // auto-expire after TTL
    const timer = setTimeout(() => {
      setLiveEvents((prev) => {
        const next = new Map(prev);
        next.delete(agentId);
        return next;
      });
      timersRef.current.delete(agentId);
    }, TTL_MS);
    timersRef.current.set(agentId, timer);
  }, []);

  // agent_status: { agent_id, status }
  useEffect(() => {
    return on("agent_status", (payload) => {
      const p = payload as { agent_id?: string; status?: string };
      if (!p.agent_id) return;
      if (p.status === "working") {
        setEvent(p.agent_id, "activated");
      } else if (p.status === "idle" || p.status === "break") {
        // no event — let TTL expire naturally
      }
    });
  }, [on, setEvent]);

  // task_update: { agent_id, status } or { assigned_agent_id, status }
  useEffect(() => {
    return on("task_update", (payload) => {
      const p = payload as {
        agent_id?: string;
        assigned_agent_id?: string;
        status?: string;
      };
      const agentId = p.agent_id ?? p.assigned_agent_id;
      if (!agentId) return;
      if (p.status === "done") {
        setEvent(agentId, "done");
      } else if (p.status === "failed" || p.status === "error") {
        setEvent(agentId, "error");
      } else if (p.status === "in_progress") {
        setEvent(agentId, "activated");
      }
    });
  }, [on, setEvent]);

  // cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  return liveEvents;
}
