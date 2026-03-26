/**
 * Stub — direct-chat has been removed (Chat system deleted).
 * Re-exports AgentRow and provides no-op handler factories.
 */
export type { AgentRow } from "../shared/types.ts";

/** Always returns false — direct chat removed. */
 
export function shouldTreatDirectChatAsTask(..._args: unknown[]): boolean {
  return false;
}

/** No-op stubs for removed direct-chat handlers. */
 
export function createDirectChatHandlers(_deps: Record<string, unknown>) {
  return {
    shouldTreatDirectChatAsTask,
     
    createDirectAgentTaskAndRun: (..._args: unknown[]): void => {
      /* removed */
    },
     
    scheduleAgentReply: (..._args: unknown[]): void => {
      /* removed */
    },
    resetDirectChatState: (
       
      _agentId: string,
    ): { clearedPendingProjectBinding: boolean } => ({
      clearedPendingProjectBinding: false,
    }),
  };
}
