import type { KeyboardEvent, RefObject } from "react";
import type { Agent, Message } from "../../../types";

export type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

export interface AnnouncementCliPanelProps {
  messages: Message[];
  agents: Agent[];
  locale: string;
  input: string;
  attachments: File[];
  streamingMessage?: { agent_id: string; agent_name: string; content: string } | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  tr: Tr;
  getAgentName: (a: Agent | null | undefined) => string;
  searchOpen: boolean;
  searchQuery: string;
  searchResultCount: number;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAttachmentsChange: (files: File[]) => void;
  onClose: () => void;
  onClearMessages?: () => void;
  onSearchToggle: () => void;
  onSearchChange: (q: string) => void;
  /** AppWindow 탭 등 컨테이너 안에 임베드될 때 true — fixed overlay 제거 */
  embedded?: boolean;
}
