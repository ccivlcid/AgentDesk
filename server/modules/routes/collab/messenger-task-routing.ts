import type { SQLInputValue } from "node:sqlite";
import type { MessengerChannel } from "../../../messenger/channels.ts";
import { isMessengerChannel } from "../../../messenger/channels.ts";
import type { DelegationOptions } from "./project-resolution.ts";

const TASK_MESSENGER_ROUTE_PREFIX = "[messenger-route]";
const TASK_MESSENGER_SESSION_ROUTE_PREFIX = "[messenger-session-route]";
const TASK_MESSENGER_ROUTE_CACHE_MAX = 1024;
const TASK_MESSENGER_ROUTE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const TASK_MESSENGER_RELAY_MESSAGE_TYPES = new Set(["report", "chat", "status_update"]);

type RouteCtx = {
  db: {
    prepare: (sql: string) => {
      get: (...args: SQLInputValue[]) => unknown;
    };
  };
  nowMs: () => number;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
};

export function createTaskMessengerRouting(ctx: RouteCtx) {
  const { db, nowMs, appendTaskLog } = ctx;
  const taskMessengerRouteByTaskId = new Map<
    string,
    { channel: MessengerChannel; targetId: string; sessionKey?: string; updatedAt: number }
  >();

  function parseTaskMessengerRouteLine(line: string): { channel: MessengerChannel; targetId: string } | null {
    if (!line.startsWith(`${TASK_MESSENGER_ROUTE_PREFIX} `)) return null;
    const payload = line.slice(TASK_MESSENGER_ROUTE_PREFIX.length).trim();
    const separator = payload.indexOf(":");
    if (separator <= 0) return null;
    const channelRaw = payload.slice(0, separator).trim().toLowerCase();
    const targetId = payload.slice(separator + 1).trim();
    if (!isMessengerChannel(channelRaw) || !targetId) return null;
    return { channel: channelRaw, targetId };
  }

  function parseTaskMessengerSessionRouteLine(line: string): string | null {
    if (!line.startsWith(`${TASK_MESSENGER_SESSION_ROUTE_PREFIX} `)) return null;
    const payload = line.slice(TASK_MESSENGER_SESSION_ROUTE_PREFIX.length).trim();
    if (!payload) return null;
    const [channelRaw, ...rest] = payload.split(":");
    const channel = channelRaw.trim().toLowerCase();
    const sessionId = rest.join(":").trim();
    if (!isMessengerChannel(channel) || !sessionId) return null;
    return `${channel}:${sessionId}`;
  }

  function pruneTaskMessengerRouteCache(now: number): void {
    for (const [taskId, route] of taskMessengerRouteByTaskId.entries()) {
      if (now - route.updatedAt > TASK_MESSENGER_ROUTE_CACHE_TTL_MS) {
        taskMessengerRouteByTaskId.delete(taskId);
      }
    }
    while (taskMessengerRouteByTaskId.size > TASK_MESSENGER_ROUTE_CACHE_MAX) {
      const oldest = taskMessengerRouteByTaskId.keys().next().value;
      if (!oldest) break;
      taskMessengerRouteByTaskId.delete(oldest);
    }
  }

  function registerTaskMessengerRoute(taskId: string, options: DelegationOptions = {}): void {
    const now = nowMs();
    pruneTaskMessengerRouteCache(now);

    const normalizedTaskId = taskId.trim();
    if (!normalizedTaskId) return;
    const targetId = (options.messengerTargetId || "").trim();
    const sessionKey = (options.messengerSessionKey || "").trim() || undefined;
    if (!isMessengerChannel(options.messengerChannel) || !targetId) return;

    const nextRoute = { channel: options.messengerChannel, targetId, sessionKey };
    const current = taskMessengerRouteByTaskId.get(normalizedTaskId);
    if (
      current &&
      current.channel === nextRoute.channel &&
      current.targetId === nextRoute.targetId &&
      current.sessionKey === nextRoute.sessionKey
    ) {
      current.updatedAt = now;
      taskMessengerRouteByTaskId.set(normalizedTaskId, current);
      return;
    }

    taskMessengerRouteByTaskId.set(normalizedTaskId, { ...nextRoute, updatedAt: now });
    appendTaskLog(
      normalizedTaskId,
      "system",
      `${TASK_MESSENGER_ROUTE_PREFIX} ${nextRoute.channel}:${nextRoute.targetId}`,
    );
    if (nextRoute.sessionKey) {
      appendTaskLog(normalizedTaskId, "system", `${TASK_MESSENGER_SESSION_ROUTE_PREFIX} ${nextRoute.sessionKey}`);
    }
  }

  function resolveTaskMessengerRoute(
    taskId: string,
  ): { channel: MessengerChannel; targetId: string; sessionKey?: string } | null {
    const now = nowMs();
    pruneTaskMessengerRouteCache(now);

    const normalizedTaskId = taskId.trim();
    if (!normalizedTaskId) return null;

    const cached = taskMessengerRouteByTaskId.get(normalizedTaskId);
    if (cached) return { channel: cached.channel, targetId: cached.targetId, sessionKey: cached.sessionKey };

    const row = db
      .prepare(
        `
        SELECT message
        FROM task_logs
        WHERE task_id = ?
          AND kind = 'system'
          AND message LIKE ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
      )
      .get(normalizedTaskId, `${TASK_MESSENGER_ROUTE_PREFIX} %`) as { message?: string } | undefined;
    const parsed = typeof row?.message === "string" ? parseTaskMessengerRouteLine(row.message) : null;
    if (parsed) {
      const sessionRow = db
        .prepare(
          `
        SELECT message
        FROM task_logs
        WHERE task_id = ?
          AND kind = 'system'
          AND message LIKE ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
        )
        .get(normalizedTaskId, `${TASK_MESSENGER_SESSION_ROUTE_PREFIX} %`) as { message?: string } | undefined;
      const sessionKey =
        typeof sessionRow?.message === "string" ? parseTaskMessengerSessionRouteLine(sessionRow.message) : null;
      taskMessengerRouteByTaskId.set(normalizedTaskId, {
        ...parsed,
        sessionKey: sessionKey || undefined,
        updatedAt: now,
      });
      pruneTaskMessengerRouteCache(now);
      return { ...parsed, ...(sessionKey ? { sessionKey } : {}) };
    }
    return null;
  }

  return { registerTaskMessengerRoute, resolveTaskMessengerRoute };
}
