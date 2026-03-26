/**
 * Stub — messenger-task-routing has been removed (Chat/Messenger system deleted).
 * Provides no-op routing functions so collab.ts and sendAgentMessage keep compiling.
 */
import type { SQLInputValue } from "node:sqlite";

type RouteCtx = {
  db: {
    prepare: (sql: string) => {
      run: (...args: SQLInputValue[]) => unknown;
      get: (...args: SQLInputValue[]) => unknown;
    };
  };
  nowMs: () => number;
  appendTaskLog: (taskId: string, kind: string, message: string) => void;
};

export const TASK_MESSENGER_RELAY_MESSAGE_TYPES = new Set<string>();

 
export function createTaskMessengerRouting(_ctx: RouteCtx) {
  return {
     
    registerTaskMessengerRoute: (..._args: unknown[]): void => {
      /* removed */
    },
     
    resolveTaskMessengerRoute: (_taskId: string): null => null,
  };
}
