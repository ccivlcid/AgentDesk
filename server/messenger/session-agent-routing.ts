/**
 * Stub — messenger/session-agent-routing has been removed (Chat/Messenger system deleted).
 * Type definitions preserved; all resolution functions return null.
 */
import type { DatabaseSync } from "node:sqlite";
import type { WorkflowPackKey } from "../modules/workflow/packs/definitions.ts";

type MessengerChannel = string;

export type SessionAgentRoute = {
  channel: MessengerChannel;
  sessionId: string;
  sessionName: string;
  targetId: string;
  agentId: string;
};

export type SessionTargetRoute = {
  channel: MessengerChannel;
  sessionId: string;
  sessionName: string;
  targetId: string;
  agentId?: string;
  workflowPackKey?: WorkflowPackKey;
};

export type AgentSessionRoute = {
  channel: MessengerChannel;
  sessionId: string;
  sessionName: string;
  targetId: string;
};

export type SourceChatRoute = {
  channel: MessengerChannel;
  targetId: string;
};

type DbLike = Pick<DatabaseSync, "prepare">;

/** No-op: source chat routing removed. */
export function resolveSourceChatRoute(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { source: unknown; chat: unknown },
): SourceChatRoute | null {
  return null;
}

/** No-op: session target routing removed. */
export function resolveSessionTargetRouteFromSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; source: unknown; chat: unknown },
): SessionTargetRoute | null {
  return null;
}

/** No-op: session agent routing removed. */
export function resolveSessionAgentRouteFromSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; source: unknown; chat: unknown },
): SessionAgentRoute | null {
  return null;
}

/** No-op: agent session routing removed. */
export function resolveAgentSessionRoutesFromSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; agentId: unknown },
): AgentSessionRoute[] {
  return [];
}

/** No-op: session workflow pack removed. */
export function resolveSessionWorkflowPackFromSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; source: unknown; chat: unknown },
): WorkflowPackKey | null {
  return null;
}

/** No-op: session agent routing removed. */
export function resolveSessionAgentRouteFromDb(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; source: unknown; chat: unknown; sessionKey?: unknown },
): SessionAgentRoute | null {
  return null;
}

/** No-op: session target routing removed. */
export function resolveSessionTargetRouteFromDb(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; source: unknown; chat: unknown; sessionKey?: unknown },
): SessionTargetRoute | null {
  return null;
}

/** No-op: agent session routing removed. */
export function resolveAgentSessionRoutesFromDb(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: DbLike; agentId: unknown },
): AgentSessionRoute[] {
  return [];
}

/** No-op: session workflow pack removed. */
export function resolveSessionWorkflowPackFromDb(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: { db: unknown; sessionKey: string },
): WorkflowPackKey | null {
  return null;
}
