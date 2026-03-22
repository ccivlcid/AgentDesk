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

export interface DecisionItemEvent {
  type: "decision_item_created";
  decisionId: string;
  kind: string;
  projectId: string | null;
  summary?: string;
}

export interface ProcessExitEvent {
  type: "process_exit";
  taskId: string;
  exitCode: number;
}

export type AgentDeskEvent = TaskStatusEvent | DecisionItemEvent | ProcessExitEvent;

class AgentDeskEventBus extends EventEmitter {
  emitTaskStatus(event: TaskStatusEvent): void {
    this.emit("task_status_changed", event);
  }

  emitDecisionItem(event: DecisionItemEvent): void {
    this.emit("decision_item_created", event);
  }

  emitProcessExit(event: ProcessExitEvent): void {
    this.emit("process_exit", event);
  }
}

export const eventBus = new AgentDeskEventBus();
eventBus.setMaxListeners(50);
