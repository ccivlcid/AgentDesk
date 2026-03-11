import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Message } from "../../types";
import { getMessages, sendMessage } from "../../api";
import { uploadChatFiles } from "../../api/messaging-runtime-oauth";
import { useI18n } from "../../i18n";

const MAX_CONTENT = 2000;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ".pdf,.pptx,.docx,.xlsx,.png,.jpg,.gif,.md,.txt,.csv,.json,.zip";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "gif"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["docx", "doc"].includes(ext)) return "📃";
  if (["xlsx", "xls", "csv"].includes(ext)) return "📊";
  if (["pptx", "ppt"].includes(ext)) return "📊";
  if (ext === "zip") return "📦";
  if (ext === "json") return "🔧";
  if (["md", "txt"].includes(ext)) return "📝";
  return "📎";
}

interface GroupChatPanelProps {
  agents: Agent[];
  initialAgentIds?: string[];
  onClose: () => void;
}

export default function GroupChatPanel({ agents, initialAgentIds, onClose }: GroupChatPanelProps) {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialAgentIds ?? []),
  );
  const [messagesByAgent, setMessagesByAgent] = useState<Map<string, Message[]>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getAgentName = (a: Agent) => (isKo ? a.name_ko || a.name : a.name || a.name_ko);

  const fetchForAgent = useCallback(async (agentId: string) => {
    setLoadingIds((prev) => { const s = new Set(prev); s.add(agentId); return s; });
    try {
      const msgs = await getMessages({ receiver_type: "agent", receiver_id: agentId, limit: 40 });
      setMessagesByAgent((prev) => new Map(prev).set(agentId, msgs));
    } catch {
      // ignore
    } finally {
      setLoadingIds((prev) => { const s = new Set(prev); s.delete(agentId); return s; });
    }
  }, []);

  const toggleAgent = useCallback((agentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
        if (!messagesByAgent.has(agentId)) {
          void fetchForAgent(agentId);
        }
      }
      return next;
    });
  }, [messagesByAgent, fetchForAgent]);

  const mergedMessages = useMemo(() => {
    const all: Array<Message & { _forAgentId: string }> = [];
    for (const id of selectedIds) {
      const msgs = messagesByAgent.get(id) ?? [];
      for (const m of msgs) all.push({ ...m, _forAgentId: id });
    }
    const seen = new Set<string>();
    return all
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => a.created_at - b.created_at);
  }, [selectedIds, messagesByAgent]);

  // 초기 에이전트 메시지 패치
  useEffect(() => {
    if (!initialAgentIds?.length) return;
    for (const id of initialAgentIds) {
      void fetchForAgent(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages.length]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: File[] = [];
    for (const file of Array.from(incoming)) {
      if (file.size > MAX_FILE_SIZE) continue;
      if (attachments.length + newFiles.length >= MAX_FILES) break;
      if (!attachments.some((f) => f.name === file.name && f.size === file.size)) {
        newFiles.push(file);
      }
    }
    if (newFiles.length > 0) setAttachments((prev) => [...prev, ...newFiles]);
  }, [attachments]);

  const removeFile = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || sending || selectedIds.size === 0) return;
    setSending(true);
    setSendError(null);
    setSentOk(false);
    try {
      let prefix = "";
      if (attachments.length > 0) {
        setUploading(true);
        try {
          const uploaded = await uploadChatFiles(attachments);
          prefix = uploaded.map((a) => `[📎 ${a.fileName} (${formatFileSize(a.size)})]`).join(" ") + "\n";
        } catch {
          // continue without attachments
        } finally {
          setUploading(false);
        }
        setAttachments([]);
      }
      const content = prefix + trimmed;
      if (!content.trim()) return;
      for (const agentId of selectedIds) {
        await sendMessage({ receiver_type: "agent", receiver_id: agentId, content, message_type: "chat" });
      }
      setSentOk(true);
      setInput("");
      await Promise.all(Array.from(selectedIds).map((id) => fetchForAgent(id)));
    } catch (err) {
      setSendError(err instanceof Error ? err.message.slice(0, 80) : tr("전송 실패", "Send failed"));
    } finally {
      setSending(false);
      setTimeout(() => setSentOk(false), 2000);
    }
  }, [input, attachments, sending, selectedIds, fetchForAgent, tr]);

  const filteredAgents = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getAgentName(a).toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const dtFmt = new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <button
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        aria-label={tr("닫기", "Close")}
      />

      {/* Panel — CLI 스타일 */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden sm:w-[680px]"
        style={{ background: "#0d1117", borderLeft: "1px solid var(--th-border)", fontFamily: "var(--th-font-mono)" }}
      >
        {/* CLI 헤더 (전사 공지와 동일 톤) */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-4 py-3 select-none"
          style={{ borderBottom: "1px solid #21262d", background: "#161b22" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full inline-block" style={{ background: "#ff5f56" }} />
            <span className="h-3 w-3 rounded-full inline-block" style={{ background: "#ffbd2e" }} />
            <span className="h-3 w-3 rounded-full inline-block" style={{ background: "#27c93f" }} />
          </div>
          <span className="text-[11px] font-bold" style={{ color: "#f0883e" }}>❯</span>
          <span className="text-[11px] font-bold" style={{ color: "#cdd9e5" }}>agentdesk</span>
          <span className="text-[11px]" style={{ color: "#6e7681" }}>group-chat</span>
          {selectedIds.size > 0 && (
            <span className="text-[11px]" style={{ color: "#58a6ff" }}>--recipients={selectedIds.size}</span>
          )}
          <span className="flex-1" />
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-[10px] font-mono border transition hover:opacity-80"
              style={{ borderRadius: 0, borderColor: "#21262d", color: "#6e7681", background: "#0d1117" }}
            >
              {tr("선택 해제", "Clear")}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center transition hover:bg-[#21262d]"
            style={{ color: "#6e7681", borderRadius: 0 }}
            aria-label={tr("닫기", "Close")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: agent selector (CLI 스타일) */}
          <div
            className="flex w-[200px] flex-shrink-0 flex-col overflow-hidden"
            style={{ borderRight: "1px solid #21262d", background: "#0d1117" }}
          >
            {/* Search — grep 스타일 */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #21262d", background: "#161b22" }}>
              <span className="text-[11px] shrink-0" style={{ color: "#f0883e" }}>❯</span>
              <span className="text-[11px] shrink-0" style={{ color: "#6e7681" }}>grep</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("검색...", "filter...")}
                className="flex-1 min-w-0 bg-transparent text-[11px] outline-none"
                style={{ color: "#cdd9e5", caretColor: "#f0883e" }}
              />
            </div>
            {/* Agent list */}
            <div className="flex-1 overflow-y-auto py-1" style={{ background: "#0d1117" }}>
              {filteredAgents.length === 0 ? (
                <div className="px-3 py-4 text-center text-[11px]" style={{ color: "#6e7681" }}>
                  {tr("없음", "None")}
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const isSelected = selectedIds.has(agent.id);
                  const isLoading = loadingIds.has(agent.id);
                  const statusColor = agent.status === "working" ? "#3fb950" : "#6e7681";
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition"
                      style={{
                        background: isSelected ? "rgba(251,191,36,0.08)" : "transparent",
                        borderLeft: `2px solid ${isSelected ? "#f0883e" : "transparent"}`,
                        borderBottom: "1px solid rgba(33,38,45,0.6)",
                      }}
                    >
                      <span className="text-[10px] font-bold shrink-0" style={{ color: isSelected ? "#f0883e" : "#4d555f", width: 14, textAlign: "center" }}>
                        {isSelected ? "▸" : "·"}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[11px]" style={{ color: isSelected ? "#cdd9e5" : "#8b949e" }}>
                          {agent.avatar_emoji} {getAgentName(agent)}
                        </span>
                        <span className="text-[10px]" style={{ color: statusColor }}>
                          {agent.status}
                          {isLoading && " …"}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: message feed (CLI 로그 스타일) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ background: "#0d1117" }}>
            <div className="flex-1 overflow-y-auto py-1">
              {selectedIds.size === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
                  <p className="text-[11px]" style={{ color: "#6e7681" }}>
                    $ cat recipients
                  </p>
                  <p className="text-[11px]" style={{ color: "#4d555f" }}>
                    {tr("왼쪽에서 에이전트를 선택하세요", "Select agents on the left")}
                  </p>
                </div>
              ) : mergedMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
                  <p className="text-[11px]" style={{ color: "#6e7681" }}>
                    {tr("선택한 에이전트와 주고받은 메시지가 없습니다", "No messages with selected agents yet")}
                  </p>
                </div>
              ) : (
                mergedMessages.map((msg) => {
                  const isCeo = msg.sender_type === "ceo";
                  const forAgent = agentById.get(msg._forAgentId);
                  const forAgentName = forAgent ? getAgentName(forAgent) : msg._forAgentId.slice(0, 8);
                  const senderLabel = isCeo
                    ? `CEO → ${forAgentName}`
                    : msg.sender_agent
                      ? `${getAgentName(msg.sender_agent)} → CEO`
                      : forAgentName;
                  const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                  const sigil = isCeo ? "❯" : "▸";
                  const sigilColor = isCeo ? "#f0883e" : "#3fb950";
                  const rowBg = isCeo ? "rgba(251,191,36,0.04)" : "rgba(63,185,80,0.03)";
                  const borderColor = isCeo ? "rgba(251,191,36,0.08)" : "rgba(48,54,61,0.6)";
                  const contentColor = isCeo ? "#e6c07b" : "#adbac7";

                  return (
                    <div
                      key={`${msg.id}:${msg._forAgentId}`}
                      className="px-3 py-2 text-xs leading-relaxed"
                      style={{ borderBottom: `1px solid ${borderColor}`, background: rowBg }}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="shrink-0 text-[10px]" style={{ color: "#3d4451" }}>{timeStr}</span>
                        <span className="font-bold shrink-0" style={{ color: sigilColor }}>{sigil}</span>
                        <span className="truncate font-bold shrink-0 max-w-[200px]" style={{ color: sigilColor }}>
                          {senderLabel}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words text-left" style={{ color: contentColor, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ borderTop: "1px solid #21262d" }} />

            {/* Input area — CLI 프롬프트 스타일 */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2" style={{ background: "#0d1117" }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_TYPES}
                className="hidden"
                onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
              />

              {selectedIds.size === 0 && (
                <div className="text-[10px] text-center mb-2" style={{ color: "#6e7681" }}>
                  {tr("에이전트를 먼저 선택하세요", "Select at least one agent first")}
                </div>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-0.5 text-[10px]"
                      style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: 0, color: "#8b949e" }}
                    >
                      <span>{getFileIcon(file.name)}</span>
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <span style={{ color: "#3d4451" }}>({formatFileSize(file.size)})</span>
                      <button type="button" onClick={() => removeFile(idx)} className="ml-0.5 transition hover:opacity-70" style={{ color: "#6e7681", lineHeight: 1 }} title={tr("제거", "Remove")}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className="flex items-end gap-0"
                style={{ border: "1px solid rgba(251,191,36,0.35)", background: "#161b22", borderRadius: 0 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
              >
                <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-2.5 pt-3">
                  <span className="text-sm font-bold leading-none" style={{ color: "#f0883e" }}>❯</span>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_CONTENT))}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sending && selectedIds.size > 0) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={2}
                  disabled={sending || selectedIds.size === 0}
                  className="min-h-[44px] max-h-32 flex-1 resize-none overflow-y-auto py-3 pr-2 text-xs leading-relaxed focus:outline-none bg-transparent"
                  style={{ color: "#cdd9e5", caretColor: "#f0883e" }}
                  placeholder={
                    selectedIds.size === 0
                      ? tr("에이전트를 선택하면 입력 가능합니다", "Select agents to enable input")
                      : tr(`${selectedIds.size}명에게 전송... (Ctrl+Enter)`, `Message ${selectedIds.size}... (Ctrl+Enter)`)
                  }
                />
                <div className="flex shrink-0 flex-col items-center gap-1 pb-2 pr-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= MAX_FILES || selectedIds.size === 0}
                    className="flex h-7 w-7 items-center justify-center transition hover:opacity-70 disabled:opacity-30"
                    style={{ color: "#6e7681", borderRadius: 0 }}
                    title={tr("파일 첨부", "Attach")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={(!input.trim() && attachments.length === 0) || sending || selectedIds.size === 0}
                    className="flex h-7 w-7 items-center justify-center transition disabled:opacity-30"
                    style={
                      input.trim() || attachments.length > 0
                        ? { borderRadius: 0, background: "rgba(251,191,36,0.8)", color: "#0d1117" }
                        : { borderRadius: 0, background: "#161b22", color: "#3d4451", cursor: "not-allowed" }
                    }
                    title={tr("전송 (Ctrl+Enter)", "Send (Ctrl+Enter)")}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
              </div>
              {sendError && <div className="text-[10px] mt-1" style={{ color: "#fda4af" }}>{sendError}</div>}
              {(sentOk || uploading) && (
                <div className="text-[10px] mt-1" style={{ color: "#3fb950" }}>
                  {uploading ? tr("파일 업로드 중...", "Uploading...") : tr(`✓ ${selectedIds.size}명 전송 완료`, `✓ Sent to ${selectedIds.size}`)}
                </div>
              )}
              <p className="mt-1.5 text-[10px]" style={{ color: "#3d4451" }}>
                Ctrl+Enter {tr("전송", "send")} · 📎 {tr("파일 드래그 가능", "drag to attach")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
