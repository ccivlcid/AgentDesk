/**
 * Room Lane Queue
 *
 * Serializes agent replies in a shared room so each agent sees the previous
 * agent's response before generating its own (OpenClaw-style lane model).
 *
 * Usage:
 *   const first = initRoomQueue(roomId, agentIds, message, type, opts);
 *   if (first) scheduleAgentReply(first, message, type, { ...opts, roomId });
 *
 *   // After each agent completes (onRoomReplyComplete):
 *   advanceRoomQueue(roomId, scheduleAgentReply);
 */

export type RoomScheduleFn = (
  agentId: string,
  message: string,
  messageType: string,
  opts: {
    projectId?: string | null;
    projectPath?: string | null;
    projectContext?: string | null;
    roomId: string;
  },
) => void;

interface RoomQueueEntry {
  pendingAgentIds: string[];
  userMessage: string;
  messageType: string;
  projectId: string | null;
  projectPath: string | null;
  projectContext: string | null;
}

// In-process memory: lives only as long as a conversation turn is in flight.
const queues = new Map<string, RoomQueueEntry>();

/**
 * Registers all agents for a room and returns the first agent ID to fire.
 * If only one agent, no queue entry is created.
 */
export function initRoomQueue(
  roomId: string,
  allAgentIds: string[],
  userMessage: string,
  messageType: string,
  opts: {
    projectId?: string | null;
    projectPath?: string | null;
    projectContext?: string | null;
  },
): string | null {
  if (allAgentIds.length === 0) return null;
  if (allAgentIds.length > 1) {
    queues.set(roomId, {
      pendingAgentIds: allAgentIds.slice(1),
      userMessage,
      messageType,
      projectId: opts.projectId ?? null,
      projectPath: opts.projectPath ?? null,
      projectContext: opts.projectContext ?? null,
    });
  }
  return allAgentIds[0];
}

/**
 * Fires the next pending agent for the room.
 * Called after each agent completes its reply.
 * Returns true if another agent was scheduled, false if the queue is exhausted.
 */
export function advanceRoomQueue(roomId: string, schedule: RoomScheduleFn): boolean {
  const entry = queues.get(roomId);
  if (!entry || entry.pendingAgentIds.length === 0) {
    queues.delete(roomId);
    return false;
  }
  const nextAgentId = entry.pendingAgentIds.shift()!;
  if (entry.pendingAgentIds.length === 0) {
    queues.delete(roomId);
  }
  schedule(nextAgentId, entry.userMessage, entry.messageType, {
    projectId: entry.projectId,
    projectPath: entry.projectPath,
    projectContext: entry.projectContext,
    roomId,
  });
  return true;
}

/** Clears any pending queue for a room (e.g., on error or cancel). */
export function clearRoomQueue(roomId: string): void {
  queues.delete(roomId);
}
