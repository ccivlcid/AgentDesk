/**
 * Stub — direct-chat has been removed (Chat system deleted).
 * Re-exports AgentRow and provides no-op handler factories.
 */
export type { AgentRow } from "../shared/types.ts";

/** Always returns false — direct chat removed. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function shouldTreatDirectChatAsTask(..._args: unknown[]): boolean {
  return false;
}

/** No-op stubs for removed direct-chat handlers. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createDirectChatHandlers(_deps: Record<string, unknown>) {
  return {
    shouldTreatDirectChatAsTask,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createDirectAgentTaskAndRun: (..._args: unknown[]): void => {
      /* removed */
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scheduleAgentReply: (..._args: unknown[]): void => {
      /* removed */
    },
    resetDirectChatState: (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _agentId: string,
    ): { clearedPendingProjectBinding: boolean } => ({
      clearedPendingProjectBinding: false,
    }),
  };
}
