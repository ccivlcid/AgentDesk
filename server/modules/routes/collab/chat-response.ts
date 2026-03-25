/**
 * Stub — chat-response has been removed (Chat system deleted).
 * Provides no-op exports so collab.ts keeps compiling.
 */
import type { AgentRow } from "./direct-chat.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createChatReplyGenerator(_deps: Record<string, unknown>): {
  generateChatReply: (agent: AgentRow, ceoMessage: string) => string;
} {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generateChatReply: (_agent: AgentRow, _ceoMessage: string) => "",
  };
}
