import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  RefObject,
} from "react";
import type { Agent, Message } from "../../../types";
import type { I18nContextValue } from "../../../i18n";
import type { KbSourceRef } from "../../../api/synapse";

export type ChatMode = "chat" | "task" | "urgent";
export type Priority = "high" | "normal" | "low";

export interface GroupChatPanelProps {
  agents: Agent[];
  initialAgentIds?: string[];
  onClose: () => void;
}

export interface GroupChatPanelVm {
  tr: (ko: string, en: string) => string;
  t: I18nContextValue["t"];
  isKo: boolean;
  locale: string;
  agents: Agent[];
  filteredAgents: Agent[];
  agentById: Map<string, Agent>;
  getAgentName: (a: Agent) => string;
  search: string;
  setSearch: (v: string) => void;
  selectedIds: Set<string>;
  selectedAgents: Agent[];
  toggleAgent: (agentId: string) => void;
  clearAllRecipients: () => void;
  loadingIds: Set<string>;
  mergedMessages: Array<Message & { _forAgentId: string }>;
  bottomRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  sending: boolean;
  sendError: string | null;
  sentOk: boolean;
  uploading: boolean;
  attachments: File[];
  addFiles: (incoming: FileList | File[]) => void;
  removeAttachment: (idx: number) => void;
  chatMode: ChatMode;
  setChatMode: (m: ChatMode) => void;
  kbSources: KbSourceRef[];
  removeKbSource: (id: string) => void;
  mentionTarget: "notion" | "obsidian" | null;
  mentionQuery: string;
  handleInputChange: (val: string) => void;
  handleKbSelect: (ref: KbSourceRef) => void;
  closeMention: () => void;
  deadline: string;
  setDeadline: (v: string) => void;
  priority: Priority;
  setPriority: (p: Priority) => void;
  handleSend: () => Promise<void>;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTextareaKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaInput: (e: FormEvent<HTMLTextAreaElement>) => void;
}
