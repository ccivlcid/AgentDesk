/**
 * shared/ws-events.ts — WebSocket event payload types shared between GUI and TUI
 */

export interface WsTaskUpdatePayload {
  id: string;
  status: string;
  title?: string;
  agent_name?: string;
  project_id?: string;
}

export interface WsAgentStatusPayload {
  id: string;
  name?: string;
  status?: string;
}

export interface WsKickoffStagePayload {
  projectId: string;
  stage: string;
}

export interface WsCliOutputPayload {
  taskId: string;
  line: string;
  kind?: string;
}

export interface WsSessionMessagePayload {
  session_id: string;
  role: string;
  content: string;
  metadata?: unknown;
}
