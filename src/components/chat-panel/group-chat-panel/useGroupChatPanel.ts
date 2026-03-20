import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Agent, Message } from "../../../types";
import { getMessages } from "../../../api";
import { useI18n } from "../../../i18n";
import type { KbSourceRef } from "../../../api/synapse";
import { MAX_CONTENT, MAX_FILE_SIZE, MAX_FILES } from "./constants";
import type { ChatMode, GroupChatPanelProps, GroupChatPanelVm, Priority } from "./types";
import { useGroupChatSend } from "./useGroupChatSend";

export function useGroupChatPanel({
  agents,
  initialAgentIds,
  onClose,
}: GroupChatPanelProps): GroupChatPanelVm {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = useCallback((ko: string, en: string) => t({ ko, en, ja: en, zh: en }), [t]);

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialAgentIds ?? []),
  );
  const [messagesByAgent, setMessagesByAgent] = useState<Map<string, Message[]>>(
    new Map(),
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [kbSources, setKbSources] = useState<KbSourceRef[]>([]);
  const [mentionTarget, setMentionTarget] = useState<"notion" | "obsidian" | null>(
    null,
  );
  const [mentionQuery, setMentionQuery] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getAgentName = useCallback(
    (a: Agent) => (isKo ? a.name_ko || a.name : a.name || a.name_ko),
    [isKo],
  );

  const fetchForAgent = useCallback(async (agentId: string) => {
    setLoadingIds((prev) => {
      const s = new Set(prev);
      s.add(agentId);
      return s;
    });
    try {
      const msgs = await getMessages({
        receiver_type: "agent",
        receiver_id: agentId,
        limit: 40,
      });
      setMessagesByAgent((prev) => new Map(prev).set(agentId, msgs));
    } catch {
      /* ignore */
    } finally {
      setLoadingIds((prev) => {
        const s = new Set(prev);
        s.delete(agentId);
        return s;
      });
    }
  }, []);

  const toggleAgent = useCallback(
    (agentId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(agentId)) {
          next.delete(agentId);
        } else {
          next.add(agentId);
          if (!messagesByAgent.has(agentId)) void fetchForAgent(agentId);
        }
        return next;
      });
    },
    [messagesByAgent, fetchForAgent],
  );

  const mergedMessages = useMemo(() => {
    const all: Array<Message & { _forAgentId: string }> = [];
    for (const id of selectedIds) {
      for (const m of messagesByAgent.get(id) ?? []) {
        all.push({ ...m, _forAgentId: id });
      }
    }
    const seen = new Set<string>();
    return all
      .filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      })
      .sort((a, b) => a.created_at - b.created_at);
  }, [selectedIds, messagesByAgent]);

  useEffect(() => {
    if (!initialAgentIds?.length) return;
    for (const id of initialAgentIds) void fetchForAgent(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages.length]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const newFiles: File[] = [];
      for (const file of Array.from(incoming)) {
        if (file.size > MAX_FILE_SIZE) continue;
        if (attachments.length + newFiles.length >= MAX_FILES) break;
        if (
          !attachments.some((f) => f.name === file.name && f.size === file.size)
        ) {
          newFiles.push(file);
        }
      }
      if (newFiles.length > 0) setAttachments((prev) => [...prev, ...newFiles]);
    },
    [attachments],
  );

  const handleSend = useGroupChatSend(
    input,
    attachments,
    kbSources,
    sending,
    selectedIds,
    chatMode,
    deadline,
    priority,
    fetchForAgent,
    tr,
    setSending,
    setSendError,
    setSentOk,
    setUploading,
    setAttachments,
    setKbSources,
    setInput,
    setDeadline,
    setPriority,
    textareaRef,
  );

  const filteredAgents = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getAgentName(a).toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  });

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const selectedAgents = agents.filter((a) => selectedIds.has(a.id));

  const clearAllRecipients = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((p) => p.filter((_, i) => i !== idx));
  }, []);

  const removeKbSource = useCallback((id: string) => {
    setKbSources((p) => p.filter((s) => s.id !== id));
  }, []);

  const closeMention = useCallback(() => {
    setMentionTarget(null);
    setMentionQuery("");
  }, []);

  const handleKbSelect = useCallback(
    (ref: KbSourceRef) => {
      const cleaned = input.replace(/@(notion|obsidian)\s*[^\n@]*$/i, "").trimEnd();
      setInput(cleaned);
      setMentionTarget(null);
      setMentionQuery("");
      if (!kbSources.some((s) => s.id === ref.id)) {
        setKbSources((prev) => [...prev, ref]);
      }
      textareaRef.current?.focus();
    },
    [input, kbSources],
  );

  const handleInputChange = useCallback((val: string) => {
    const sliced = val.slice(0, MAX_CONTENT);
    setInput(sliced);
    const match = sliced.match(/@(notion|obsidian)\s*([^\n@]*)$/i);
    if (match) {
      setMentionTarget(match[1].toLowerCase() as "notion" | "obsidian");
      setMentionQuery(match[2].trim());
    } else {
      setMentionTarget(null);
      setMentionQuery("");
    }
  }, []);

  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles],
  );

  const onTextareaKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sending && selectedIds.size > 0) {
        e.preventDefault();
        void handleSend();
      }
    },
    [sending, selectedIds.size, handleSend],
  );

  const onTextareaInput = useCallback((e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, []);

  return {
    tr,
    t,
    isKo,
    locale,
    agents,
    filteredAgents,
    agentById,
    getAgentName,
    search,
    setSearch,
    selectedIds,
    selectedAgents,
    toggleAgent,
    clearAllRecipients,
    loadingIds,
    mergedMessages,
    bottomRef,
    fileInputRef,
    textareaRef,
    input,
    sending,
    sendError,
    sentOk,
    uploading,
    attachments,
    addFiles,
    removeAttachment,
    chatMode,
    setChatMode,
    kbSources,
    removeKbSource,
    mentionTarget,
    mentionQuery,
    handleInputChange,
    handleKbSelect,
    closeMention,
    deadline,
    setDeadline,
    priority,
    setPriority,
    handleSend,
    onFileInputChange,
    onTextareaKeyDown,
    onTextareaInput,
  };
}
