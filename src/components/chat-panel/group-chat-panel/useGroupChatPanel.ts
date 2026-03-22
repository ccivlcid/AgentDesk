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
import { getMessages, getGroupChatRooms } from "../../../api";
import { useI18n } from "../../../i18n";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useUiStore } from "../../../store/uiStore";
import type { KbSourceRef } from "../../../api/synapse";
import { MAX_CONTENT, MAX_FILE_SIZE, MAX_FILES } from "./constants";
import type { GroupChatPanelProps, GroupChatPanelVm, RoomSummary } from "./types";
import { useGroupChatSend } from "./useGroupChatSend";

export function useGroupChatPanel({
  agents,
  initialAgentIds,
  onClose,
}: GroupChatPanelProps): GroupChatPanelVm {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = useCallback((ko: string, en: string) => t({ ko, en, ja: en, zh: en }), [t]);
  const { on } = useWebSocket();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialAgentIds ?? []),
  );
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [kbSources, setKbSources] = useState<KbSourceRef[]>([]);
  const [mentionTarget, setMentionTarget] = useState<"notion" | "obsidian" | null>(
    null,
  );
  const [mentionQuery, setMentionQuery] = useState("");
  const [roomHistory, setRoomHistory] = useState<RoomSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { lastGroupRoomId, lastGroupAgentIds, setLastGroupRoom } = useUiStore();

  const getAgentName = useCallback(
    (a: Agent) => (isKo ? a.name_ko || a.name : a.name || a.name_ko),
    [isKo],
  );

  const fetchForRoom = useCallback(async (roomId: string) => {
    setLoadingIds((prev) => new Set([...prev, roomId]));
    try {
      const msgs = await getMessages({ room_id: roomId, limit: 60 });
      setRoomMessages(msgs);
    } catch {
      /* ignore */
    } finally {
      setLoadingIds((prev) => {
        const s = new Set(prev);
        s.delete(roomId);
        return s;
      });
    }
  }, []);

  // Reset room when selected agents change (new conversation)
  const toggleAgent = useCallback(
    (agentId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(agentId)) {
          next.delete(agentId);
        } else {
          next.add(agentId);
        }
        return next;
      });
      setCurrentRoomId(null);
      setRoomMessages([]);
    },
    [],
  );

  const mergedMessages = useMemo(
    () =>
      roomMessages
        .slice()
        .sort((a, b) => a.created_at - b.created_at)
        .map((m) => ({
          ...m,
          _forAgentId: m.sender_type === "agent" ? (m.sender_id ?? "") : "",
        })),
    [roomMessages],
  );

  // ── 마운트 시: 방 목록 로드 + 마지막 방 복원 ────────────────────────────────
  const restoredRef = useRef(false);
  useEffect(() => {
    // 방 목록 로드
    getGroupChatRooms().then((rooms) => setRoomHistory(rooms)).catch(() => {});

    // 마지막 방 복원 (initialAgentIds가 없을 때만)
    if (!restoredRef.current && lastGroupRoomId && !initialAgentIds?.length) {
      restoredRef.current = true;
      setCurrentRoomId(lastGroupRoomId);
      if (lastGroupAgentIds.length > 0) {
        setSelectedIds(new Set(lastGroupAgentIds));
      }
      void fetchForRoom(lastGroupRoomId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── room 변경 시 uiStore에 저장 ──────────────────────────────────────────
  useEffect(() => {
    if (currentRoomId) {
      setLastGroupRoom(currentRoomId, [...selectedIds]);
    }
  }, [currentRoomId, selectedIds, setLastGroupRoom]);

  // ── 방 전환 핸들러 ──────────────────────────────────────────────────────
  const loadRoom = useCallback((room: RoomSummary) => {
    setCurrentRoomId(room.room_id);
    // 방에 참여한 에이전트 선택
    const validIds = new Set(agents.map((a) => a.id));
    const agentIds = room.agent_ids.filter((id) => validIds.has(id));
    setSelectedIds(new Set(agentIds));
    setRoomMessages([]);
    void fetchForRoom(room.room_id);
  }, [agents, fetchForRoom]);

  /** 프로젝트·에이전트 목록이 바뀌면, 현재 프로젝트에 없는 수신자 선택은 제거 */
  useEffect(() => {
    const valid = new Set(agents.map((a) => a.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [agents]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Real-time: when a new message or stream end arrives for the current room, refresh
  const currentRoomIdRef = useRef<string | null>(null);
  currentRoomIdRef.current = currentRoomId;

  const refreshRoomHistory = useCallback(() => {
    getGroupChatRooms().then((rooms) => setRoomHistory(rooms)).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub1 = on("new_message", (payload) => {
      const msg = payload as { room_id?: string | null };
      if (msg.room_id) {
        if (msg.room_id === currentRoomIdRef.current) {
          void fetchForRoom(msg.room_id).catch(() => {});
        }
        refreshRoomHistory();
      }
    });
    const unsub2 = on("chat_stream", (payload) => {
      const p = payload as { phase?: string; room_id?: string | null };
      if (p.phase === "end" && p.room_id && p.room_id === currentRoomIdRef.current) {
        void fetchForRoom(p.room_id).catch(() => {});
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [on, fetchForRoom]);

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
    currentRoomId,
    fetchForRoom,
    setCurrentRoomId,
    tr,
    setSending,
    setSendError,
    setSentOk,
    setUploading,
    setAttachments,
    setKbSources,
    setInput,
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
    setCurrentRoomId(null);
    setRoomMessages([]);
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
      if (e.key === "Enter" && !e.shiftKey && !sending && selectedIds.size > 0) {
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
    kbSources,
    removeKbSource,
    mentionTarget,
    mentionQuery,
    handleInputChange,
    handleKbSelect,
    closeMention,
    handleSend,
    onFileInputChange,
    onTextareaKeyDown,
    onTextareaInput,
    roomHistory,
    loadRoom,
    currentRoomId,
  };
}
