/**
 * Stub — announcement-response has been removed (Chat system deleted).
 * Provides no-op exports so collab.ts keeps compiling.
 */
import type { Lang } from "../../../types/lang.ts";
import type { AgentRow } from "./direct-chat.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createAnnouncementReplyScheduler(_deps: Record<string, unknown>): {
  generateAnnouncementReply: (agent: AgentRow, announcement: string, lang: Lang) => string;
  scheduleAnnouncementReplies: (announcement: string, projectId?: string | null) => void;
} {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generateAnnouncementReply: (_agent: AgentRow, _announcement: string, _lang: Lang) => "",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scheduleAnnouncementReplies: (_announcement: string, _projectId?: string | null) => {
      /* removed */
    },
  };
}
