/**
 * AgentDesk Event Bus — central event hub for PM orchestration.
 *
 * Replaces timer-based polling with event-driven architecture.
 * PM Orchestrator listens to events and makes LLM-powered decisions.
 */

import { EventEmitter } from "node:events";

export interface TaskStatusEvent {
  type: "task_status_changed";
  taskId: string;
  projectId: string | null;
  fromStatus: string;
  toStatus: string;
  agentId: string | null;
  exitCode?: number;
  /** Tail of task result/output (for PM review) */
  resultTail?: string | null;
}

export type AgentDeskEvent = TaskStatusEvent;

class AgentDeskEventBus extends EventEmitter {
  emitTaskStatus(event: TaskStatusEvent): void {
    this.emit("task_status_changed", event);
  }
}

export const eventBus = new AgentDeskEventBus();
eventBus.setMaxListeners(50);
