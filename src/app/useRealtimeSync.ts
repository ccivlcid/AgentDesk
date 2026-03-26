import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useUiStore } from "../store/uiStore";
import * as api from "../api";
import type {
  Agent,
  CrossDeptDelivery,
  MeetingPresence,
  MeetingReviewDecision,
  SubAgent,
  SubTask,
  Task,
  ClientOfficeCall,
  WSEventType,
} from "../types";
import {
  CODEX_THREAD_BINDING_TTL_MS,
  MAX_CLIENT_OFFICE_CALLS,
  MAX_CODEX_THREAD_BINDINGS,
  MAX_CROSS_DEPT_DELIVERIES,
  MAX_LIVE_SUBAGENTS,
  MAX_LIVE_SUBTASKS,
  MAX_SUBAGENT_STREAM_TAIL_CHARS,
  MAX_SUBAGENT_STREAM_TRACKED_TASKS,
} from "./constants";
import { parseCliSubAgentEvents, shouldParseCliChunkForSubAgents } from "./sub-agent-events";
import type { View } from "./types";
import { appendCapped, areAgentsEquivalent } from "./utils";

type SocketOn = (event: WSEventType, handler: (payload: unknown) => void) => () => void;

/** When WebSocket is connected, reconciliation polls are infrequent (30s). */
const WS_CONNECTED_POLL_INTERVAL_MS = 30_000;
/** When WebSocket is disconnected, fall back to aggressive polling (5s). */
const WS_DISCONNECTED_POLL_INTERVAL_MS = 5_000;

interface UseRealtimeSyncParams {
  on: SocketOn;
  connected: boolean;
  scheduleLiveSync: (delayMs?: number) => void;
  agentsRef: MutableRefObject<Agent[]>;
  tasksRef: MutableRefObject<Task[]>;
  subAgentsRef: MutableRefObject<SubAgent[]>;
  viewRef: MutableRefObject<View>;
  codexThreadToSubAgentIdRef: MutableRefObject<Map<string, string>>;
  codexThreadBindingTsRef: MutableRefObject<Map<string, number>>;
  subAgentStreamTailRef: MutableRefObject<Map<string, string>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  setCrossDeptDeliveries: Dispatch<SetStateAction<CrossDeptDelivery[]>>;
  setClientOfficeCalls: Dispatch<SetStateAction<ClientOfficeCall[]>>;
  setMeetingPresence: Dispatch<SetStateAction<MeetingPresence[]>>;
  setSubtasks: Dispatch<SetStateAction<SubTask[]>>;
  setSubAgents: Dispatch<SetStateAction<SubAgent[]>>;
  /** MX-02: called when a task transitions to done (for Toast) */
  onTaskDone?: (task: Task) => void;
  /** MX-02: called when a task transitions to failed_exec (for Toast) */
  onTaskFailed?: (task: Task) => void;
}

export function useRealtimeSync({
  on,
  connected,
  scheduleLiveSync,
  agentsRef,
  tasksRef,
  subAgentsRef,
  viewRef,
  codexThreadToSubAgentIdRef,
  codexThreadBindingTsRef,
  subAgentStreamTailRef,
  setTasks,
  setAgents,
  setCrossDeptDeliveries,
  setClientOfficeCalls,
  setMeetingPresence,
  setSubtasks,
  setSubAgents,
  onTaskDone,
  onTaskFailed,
}: UseRealtimeSyncParams): void {
  const openCliWindow = useUiStore((s) => s.openCliWindow);
  const closeCliWindow = useUiStore((s) => s.closeCliWindow);
  const setCliPlanReady = useUiStore((s) => s.setCliPlanReady);

  useEffect(() => {
    const unsubs = [
      on("task_update", (payload: unknown) => {
        const taskPatch = payload as Task | null;
        if (taskPatch && typeof taskPatch.id === "string") {
          // lifecycle broadcast는 SELECT * FROM tasks (JOIN 없음) → agent_name 누락될 수 있음.
          // assigned_agent_id가 있으면 agentsRef에서 이름을 보완한다.
          if (taskPatch.assigned_agent_id && !taskPatch.agent_name) {
            const a = agentsRef.current.find((ag) => ag.id === taskPatch.assigned_agent_id);
            if (a) {
              taskPatch.agent_name = a.name;
              taskPatch.agent_avatar = a.avatar_emoji ?? undefined;
            }
          }
          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === taskPatch.id);
            if (idx < 0) {
              // New task — append and trigger reconciliation for stats/decisions
              scheduleLiveSync(200);
              return [...prev, taskPatch];
            }
            // 기존 태스크에서 agent_name이 있었으면 유지 (JOIN 없는 patch가 덮어쓰지 않도록)
            const merged = {
              ...prev[idx],
              ...taskPatch,
              agent_name: taskPatch.agent_name ?? prev[idx].agent_name,
              agent_avatar: taskPatch.agent_avatar ?? prev[idx].agent_avatar,
            };
            if (JSON.stringify(prev[idx]) === JSON.stringify(merged)) return prev;
            const prevStatus = prev[idx].status;
            const prevExecState = prev[idx].execution_state;
            if (merged.status === "done" && prevStatus !== "done" && onTaskDone) onTaskDone(merged);
            if (merged.execution_state === "failed" && prevExecState !== "failed" && onTaskFailed) onTaskFailed(merged);
            const next = [...prev];
            next[idx] = merged;
            return next;
          });
        } else {
          scheduleLiveSync(80);
        }
      }),
      on("agent_status", (payload: unknown) => {
        const p = payload as Agent & { subAgents?: SubAgent[] };
        const { subAgents: incomingSubAgents, ...agentPatch } = p;
        const hasKnownAgent = agentsRef.current.some((a) => a.id === agentPatch.id);
        if (!hasKnownAgent) {
          scheduleLiveSync(80);
          return;
        }
        setAgents((prev) => {
          const idx = prev.findIndex((a) => a.id === agentPatch.id);
          if (idx < 0) return prev;
          const current = prev[idx];
          const merged = { ...current, ...agentPatch };
          if (areAgentsEquivalent(current, merged)) return prev;
          const next = [...prev];
          next[idx] = merged;
          return next;
        });
        if (incomingSubAgents) {
          setSubAgents((prev) => {
            const others = prev.filter((s) => s.parentAgentId !== p.id);
            const next = [...others, ...incomingSubAgents];
            return next.length > MAX_LIVE_SUBAGENTS ? next.slice(next.length - MAX_LIVE_SUBAGENTS) : next;
          });
        }
      }),
      on("agent_created", () => {
        scheduleLiveSync(60);
      }),
      on("agent_deleted", () => {
        scheduleLiveSync(60);
      }),
      on("departments_changed", () => {
        scheduleLiveSync(60);
      }),
      on("cross_dept_delivery", (payload: unknown) => {
        const p = payload as { from_agent_id: string; to_agent_id: string };
        setCrossDeptDeliveries((prev) =>
          appendCapped(
            prev,
            {
              id: `cd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              fromAgentId: p.from_agent_id,
              toAgentId: p.to_agent_id,
            },
            MAX_CROSS_DEPT_DELIVERIES,
          ),
        );
      }),
      on("client_office_call", (payload: unknown) => {
        const p = payload as {
          from_agent_id: string;
          seat_index?: number;
          phase?: "kickoff" | "review";
          action?: "arrive" | "speak" | "dismiss";
          line?: string;
          decision?: MeetingReviewDecision;
          task_id?: string;
          hold_until?: number;
        };
        if (!p.from_agent_id) return;
        const action = p.action ?? "arrive";
        if (action === "arrive" || action === "speak") {
          setMeetingPresence((prev) => {
            const existing = prev.find((row) => row.agent_id === p.from_agent_id);
            const rest = prev.filter((row) => row.agent_id !== p.from_agent_id);
            const holdUntil =
              action === "arrive"
                ? (p.hold_until ?? existing?.until ?? Date.now() + 600_000)
                : (existing?.until ?? Date.now() + 600_000);
            return [
              ...rest,
              {
                decision:
                  (p.phase ?? existing?.phase ?? "kickoff") === "review"
                    ? (p.decision ?? existing?.decision ?? "reviewing")
                    : null,
                agent_id: p.from_agent_id,
                seat_index: p.seat_index ?? existing?.seat_index ?? 0,
                phase: p.phase ?? existing?.phase ?? "kickoff",
                task_id: p.task_id ?? existing?.task_id ?? null,
                until: holdUntil,
              },
            ];
          });
        } else if (action === "dismiss") {
          setMeetingPresence((prev) => prev.filter((row) => row.agent_id !== p.from_agent_id));
        }
        setClientOfficeCalls((prev) =>
          appendCapped(
            prev,
            {
              id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              fromAgentId: p.from_agent_id,
              seatIndex: p.seat_index ?? 0,
              phase: p.phase ?? "kickoff",
              action,
              line: p.line,
              decision: p.decision,
              taskId: p.task_id,
              holdUntil: p.hold_until,
              instant: action === "arrive",
            },
            MAX_CLIENT_OFFICE_CALLS,
          ),
        );
      }),
      on("subtask_update", (payload: unknown) => {
        const st = payload as SubTask;
        setSubtasks((prev) => {
          const idx = prev.findIndex((s) => s.id === st.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = st;
            return next;
          }
          return appendCapped(prev, st, MAX_LIVE_SUBTASKS);
        });
        scheduleLiveSync(160);
      }),
      on("cli_output", (payload: unknown) => {
        const p = payload as { task_id?: string; taskId?: string; stream?: string; data?: string; line?: string; text?: string };
        const rxTaskId = p.task_id ?? p.taskId;
        const rxData = p.data ?? p.line ?? p.text;
        if (typeof rxTaskId !== "string" || typeof rxData !== "string") return;
        // alias for downstream code
        p.task_id = rxTaskId;
         
        (p as any).data = rxData;
        const threadMap = codexThreadToSubAgentIdRef.current;
        const threadTsMap = codexThreadBindingTsRef.current;
        const pruneCodexThreadBindings = (now: number) => {
          for (const [threadId, ts] of threadTsMap.entries()) {
            if (now - ts <= CODEX_THREAD_BINDING_TTL_MS) continue;
            threadTsMap.delete(threadId);
            threadMap.delete(threadId);
          }
          if (threadMap.size <= MAX_CODEX_THREAD_BINDINGS) return;
          const entries = Array.from(threadTsMap.entries()).sort((a, b) => a[1] - b[1]);
          const overflow = threadMap.size - MAX_CODEX_THREAD_BINDINGS;
          for (let i = 0; i < overflow && i < entries.length; i += 1) {
            const threadId = entries[i][0];
            threadTsMap.delete(threadId);
            threadMap.delete(threadId);
          }
        };
        const now = Date.now();
        pruneCodexThreadBindings(now);
        const tailMap = subAgentStreamTailRef.current;
        const setTaskTail = (taskId: string, rawTail: string) => {
          const trimmedTail =
            rawTail.length > MAX_SUBAGENT_STREAM_TAIL_CHARS
              ? rawTail.slice(rawTail.length - MAX_SUBAGENT_STREAM_TAIL_CHARS)
              : rawTail;
          if (!trimmedTail) {
            tailMap.delete(taskId);
            return;
          }
          if (!tailMap.has(taskId) && tailMap.size >= MAX_SUBAGENT_STREAM_TRACKED_TASKS) {
            const oldestTaskId = tailMap.keys().next().value as string | undefined;
            if (oldestTaskId) tailMap.delete(oldestTaskId);
          }
          tailMap.set(taskId, trimmedTail);
        };

        const previousTail = tailMap.get(p.task_id) ?? "";
        const combined = previousTail + p.data;
        let lines: string[] = [];
        const lastNewline = combined.lastIndexOf("\n");

        if (lastNewline < 0) {
          setTaskTail(p.task_id, combined);
          const singleLineCandidate = combined.trim();
          if (
            singleLineCandidate &&
            singleLineCandidate[0] === "{" &&
            singleLineCandidate[singleLineCandidate.length - 1] === "}" &&
            shouldParseCliChunkForSubAgents(singleLineCandidate)
          ) {
            lines = [singleLineCandidate];
            setTaskTail(p.task_id, "");
          } else {
            return;
          }
        } else {
          const completeChunk = combined.slice(0, lastNewline);
          const nextTail = combined.slice(lastNewline + 1);
          setTaskTail(p.task_id, nextTail);
          if (!shouldParseCliChunkForSubAgents(completeChunk)) return;
          lines = completeChunk.split("\n");
        }
        const knownSubAgentIds = new Set(subAgentsRef.current.map((s) => s.id));
        const doneSubAgentIds = new Set(subAgentsRef.current.filter((s) => s.status === "done").map((s) => s.id));
        let cachedParentAgentId: string | null | undefined;
        const resolveParentAgentId = () => {
          if (cachedParentAgentId !== undefined) return cachedParentAgentId;
          const byAgent = agentsRef.current.find((a) => a.current_task_id === p.task_id)?.id ?? null;
          if (byAgent) {
            cachedParentAgentId = byAgent;
            return byAgent;
          }
          const byTask = tasksRef.current.find((t) => t.id === p.task_id)?.assigned_agent_id ?? null;
          cachedParentAgentId = byTask;
          return byTask;
        };
        const upsertSubAgent = (subAgentId: string, taskLabel: string | null) => {
          knownSubAgentIds.add(subAgentId);
          doneSubAgentIds.delete(subAgentId);
          const parentAgentId = resolveParentAgentId();
          setSubAgents((prev) => {
            const idx = prev.findIndex((s) => s.id === subAgentId);
            if (idx >= 0) {
              const current = prev[idx];
              const nextTask = taskLabel ?? current.task;
              const nextParentAgentId = current.parentAgentId || parentAgentId || current.parentAgentId;
              if (current.task === nextTask && current.parentAgentId === nextParentAgentId) return prev;
              const next = [...prev];
              next[idx] = { ...current, task: nextTask, parentAgentId: nextParentAgentId };
              return next;
            }
            if (!parentAgentId) return prev;
            return appendCapped(
              prev,
              {
                id: subAgentId,
                parentAgentId,
                task: taskLabel ?? "Sub-task",
                status: "working" as const,
              },
              MAX_LIVE_SUBAGENTS,
            );
          });
        };
        const markSubAgentDone = (subAgentId: string) => {
          if (!knownSubAgentIds.has(subAgentId) || doneSubAgentIds.has(subAgentId)) return;
          doneSubAgentIds.add(subAgentId);
          for (const [threadId, mappedSubAgentId] of threadMap.entries()) {
            if (mappedSubAgentId !== subAgentId) continue;
            threadMap.delete(threadId);
            threadTsMap.delete(threadId);
          }
          setSubAgents((prev) => {
            const idx = prev.findIndex((s) => s.id === subAgentId);
            if (idx < 0 || prev[idx].status === "done") return prev;
            const next = [...prev];
            next[idx] = { ...prev[idx], status: "done" as const };
            return next;
          });
        };
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line[0] !== "{") continue;
          if (!shouldParseCliChunkForSubAgents(line)) continue;
          let json: Record<string, unknown> | null = null;
          try {
            json = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (!json) continue;
          const events = parseCliSubAgentEvents(json);
          for (const event of events) {
            if (event.kind === "spawn") {
              upsertSubAgent(event.id, event.task);
              continue;
            }
            if (event.kind === "done") {
              markSubAgentDone(event.id);
              continue;
            }
            if (event.kind === "bind_thread") {
              threadMap.set(event.threadId, event.subAgentId);
              threadTsMap.set(event.threadId, now);
              if (threadMap.size > MAX_CODEX_THREAD_BINDINGS) {
                pruneCodexThreadBindings(now);
              }
              continue;
            }
            const mappedSubAgentId = threadMap.get(event.threadId);
            if (!mappedSubAgentId) continue;
            threadMap.delete(event.threadId);
            threadTsMap.delete(event.threadId);
            markSubAgentDone(mappedSubAgentId);
          }
        }
      }),
      on("meeting_minutes_update", (_payload: unknown) => {
        // Trigger a live sync so any open meeting minutes panel refreshes immediately
        scheduleLiveSync(100);
      }),
      on("runtime_status", (payload: unknown) => {
        const p = payload as { taskId?: string; agentId?: string; status?: string; runId?: string; inputTokens?: number; outputTokens?: number; toolCalls?: number };
        if (p.status === "running" && p.agentId) {
          openCliWindow(p.agentId);
        }
        if (p.taskId && p.status) {
          const tokenUsage = (p.inputTokens != null || p.outputTokens != null)
            ? { inputTokens: p.inputTokens, outputTokens: p.outputTokens, toolCalls: p.toolCalls }
            : undefined;
          useUiStore.getState().setRuntimeStatus(p.taskId, p.status, p.runId, p.agentId, tokenUsage);
          if (p.status === "complete" || p.status === "error") {
            setTimeout(() => useUiStore.getState().clearRuntimeStatus(p.taskId!), 10_000);
          }
        }
        scheduleLiveSync(200);
      }),
      on("auto_open_cli", (payload: unknown) => {
        const p = payload as { agent_id?: string; from_planning?: boolean };
        if (p.agent_id) {
          openCliWindow(p.agent_id);
          if (p.from_planning) setCliPlanReady(p.agent_id);
        }
      }),
      on("close_cli", (payload: unknown) => {
        const p = payload as { agent_id?: string };
        if (p.agent_id) closeCliWindow(p.agent_id);
      }),
      on("kickoff_stage", (payload: unknown) => {
        const p = payload as { stage?: string };
        const validStages = ["idle", "planning", "meeting", "assigning", "executing", "done"] as const;
        type KickoffStage = typeof validStages[number];
        const stage = p.stage as KickoffStage | undefined;
        if (stage && validStages.includes(stage)) {
          useUiStore.getState().setKickoffStage(stage);
          if (stage === "done") {
            setTimeout(() => useUiStore.getState().setKickoffStage("idle"), 2000);
          }
        }
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, scheduleLiveSync]);

  // Adaptive polling: fast when WS disconnected, slow reconciliation when connected
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const intervalMs = connected
      ? WS_CONNECTED_POLL_INTERVAL_MS
      : WS_DISCONNECTED_POLL_INTERVAL_MS;
    function start() {
      timer = setInterval(() => scheduleLiveSync(0), intervalMs);
    }
    function handleVisibility() {
      clearInterval(timer);
      if (!document.hidden) {
        scheduleLiveSync(0);
        start();
      }
    }
    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [scheduleLiveSync, connected]);
}
