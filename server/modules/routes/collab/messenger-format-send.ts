/**
 * Simplified — messenger relay removed (Chat/Messenger system deleted).
 * sendAgentMessage retained: inserts into messages table + broadcasts via WebSocket.
 * External messenger relay logic has been removed.
 */
import { randomUUID } from "node:crypto";
import type { SQLInputValue } from "node:sqlite";
import logger from "../../../lib/logger.ts";
import type { AgentRow } from "./direct-chat.ts";

type FormatSendCtx = {
  db: {
    prepare: (sql: string) => {
      run: (...args: SQLInputValue[]) => unknown;
      get: (...args: SQLInputValue[]) => unknown;
    };
  };
  broadcast: (event: string, payload: unknown) => void;
  nowMs: () => number;
  resolveTaskMessengerRoute: (taskId: string) => null;
};

export function createMessengerFormatAndSend(ctx: FormatSendCtx) {
  const { db, broadcast, nowMs } = ctx;

  function sendAgentMessage(
    agent: AgentRow,
    content: string,
    messageType: string = "chat",
    receiverType: string = "agent",
    receiverId: string | null = null,
    taskId: string | null = null,
    roomId: string | null = null,
  ): void {
    const id = randomUUID();
    const t = nowMs();
    const taskExists = (idValue: string): boolean => {
      try {
        const row = db.prepare("SELECT 1 AS ok FROM tasks WHERE id = ?").get(idValue) as { ok?: number } | undefined;
        return row?.ok === 1;
      } catch {
        return false;
      }
    };
    const isForeignKeyError = (err: unknown): boolean => {
      const msg = err instanceof Error ? err.message : String(err);
      return /foreign key constraint failed/i.test(msg);
    };
    let persistedTaskId = taskId && taskExists(taskId) ? taskId : null;

    try {
      db.prepare(
        `
      INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, room_id, created_at)
      VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      ).run(id, agent.id, receiverType, receiverId, content, messageType, persistedTaskId, roomId, t);
    } catch (err) {
      if (persistedTaskId && isForeignKeyError(err)) {
        try {
          persistedTaskId = null;
          db.prepare(
            `
          INSERT INTO messages (id, sender_type, sender_id, receiver_type, receiver_id, content, message_type, task_id, room_id, created_at)
          VALUES (?, 'agent', ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          ).run(id, agent.id, receiverType, receiverId, content, messageType, null, roomId, t);
        } catch (fallbackErr) {
          logger.warn(`[sendAgentMessage] drop message after FK fallback failure: ${String(fallbackErr)}`);
          return;
        }
      } else {
        logger.warn(`[sendAgentMessage] drop message due to insert failure: ${String(err)}`);
        return;
      }
    }

    broadcast("new_message", {
      id,
      sender_type: "agent",
      sender_id: agent.id,
      receiver_type: receiverType,
      receiver_id: receiverId,
      content,
      message_type: messageType,
      task_id: persistedTaskId,
      room_id: roomId,
      created_at: t,
      sender_name: agent.name,
      sender_avatar: agent.avatar_emoji ?? "",
    });
  }

  return { sendAgentMessage };
}
