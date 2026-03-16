import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Message } from "../../types";
import { getMessages, sendMessage } from "../../api";
import { uploadChatFiles } from "../../api/messaging-runtime-oauth";
import { useI18n } from "../../i18n";

const MAX_CONTENT = 2000;
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.pptx,.docx,.xlsx,.png,.jpg,.gif,.md,.txt,.csv,.json,.zip";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "gif", "webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["docx", "doc"].includes(ext)) return "📃";
  if (["xlsx", "xls", "csv"].includes(ext)) return "📊";
  if (ext === "zip") return "📦";
  if (ext === "json") return "🔧";
  if (["md", "txt"].includes(ext)) return "📝";
  return "📎";
}

const AGENT_STATUS_DOT: Record<string, string> = {
  working: "var(--th-success, #22c55e)",
  idle:    "var(--th-text-muted)",
  break:   "var(--th-accent, #f59e0b)",
  offline: "var(--th-danger, #ef4444)",
};

interface GroupChatPanelProps {
  agents: Agent[];
  initialAgentIds?: string[];
  onClose: () => void;
}

export default function GroupChatPanel({ agents, initialAgentIds, onClose }: GroupChatPanelProps) {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [search, setSearch]     = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialAgentIds ?? []),
  );
  const [messagesByAgent, setMessagesByAgent] = useState<Map<string, Message[]>>(new Map());
  const [loadingIds, setLoadingIds]   = useState<Set<string>>(new Set());
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [sendError, setSendError]     = useState<string | null>(null);
  const [sentOk, setSentOk]           = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);

  const getAgentName = (a: Agent) => (isKo ? a.name_ko || a.name : a.name || a.name_ko);

  const fetchForAgent = useCallback(async (agentId: string) => {
    setLoadingIds((prev) => { const s = new Set(prev); s.add(agentId); return s; });
    try {
      const msgs = await getMessages({ receiver_type: "agent", receiver_id: agentId, limit: 40 });
      setMessagesByAgent((prev) => new Map(prev).set(agentId, msgs));
    } catch { /* ignore */ }
    finally {
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
        if (!messagesByAgent.has(agentId)) void fetchForAgent(agentId);
      }
      return next;
    });
  }, [messagesByAgent, fetchForAgent]);

  const mergedMessages = useMemo(() => {
    const all: Array<Message & { _forAgentId: string }> = [];
    for (const id of selectedIds) {
      for (const m of (messagesByAgent.get(id) ?? [])) all.push({ ...m, _forAgentId: id });
    }
    const seen = new Set<string>();
    return all
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => a.created_at - b.created_at);
  }, [selectedIds, messagesByAgent]);

  useEffect(() => {
    if (!initialAgentIds?.length) return;
    for (const id of initialAgentIds) void fetchForAgent(id);
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
      if (!attachments.some((f) => f.name === file.name && f.size === file.size)) newFiles.push(file);
    }
    if (newFiles.length > 0) setAttachments((prev) => [...prev, ...newFiles]);
  }, [attachments]);

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
        } catch { /* continue */ }
        finally { setUploading(false); }
        setAttachments([]);
      }
      const content = prefix + trimmed;
      if (!content.trim()) return;
      for (const agentId of selectedIds) {
        await sendMessage({ receiver_type: "agent", receiver_id: agentId, content, message_type: "chat" });
      }
      setSentOk(true);
      setInput("");
      textareaRef.current?.focus();
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

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const selectedAgents = agents.filter((a) => selectedIds.has(a.id));

  return (
    <div style={{ display: "flex", height: "100%", flexDirection: "column", overflow: "hidden", fontFamily: "var(--th-font-mono)", background: "var(--th-bg-surface)" }}>

      {/* ── To: bar (macOS Messages 스타일) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          padding: "0 14px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-glass-bg)",
          flexShrink: 0,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--th-text-muted)", flexShrink: 0 }}>
          {tr("받는 사람:", "To:")}
        </span>

        {/* 선택된 에이전트 chips */}
        {selectedAgents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => toggleAgent(a.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px 3px 6px",
              borderRadius: 20,
              background: "var(--th-accent)",
              border: "none",
              color: "#fff",
              fontSize: 11,
              fontFamily: "var(--th-font-mono)",
              cursor: "pointer",
              lineHeight: 1.3,
            }}
          >
            <span>{a.avatar_emoji}</span>
            <span>{getAgentName(a)}</span>
            <span style={{ opacity: 0.7, fontSize: 10, marginLeft: 2 }}>✕</span>
          </button>
        ))}

        {/* 인라인 검색 */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedIds.size === 0 ? tr("에이전트 검색...", "Search agents...") : tr("추가...", "Add...")}
          style={{
            flex: 1,
            minWidth: 80,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 11,
            color: "var(--th-text-primary)",
            fontFamily: "var(--th-font-mono)",
            caretColor: "var(--th-accent)",
          }}
        />
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)", cursor: "pointer", flexShrink: 0 }}
          >
            {tr("모두 해제", "Clear")}
          </button>
        )}
      </div>

      {/* ── Main split ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar — agent list */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: "1px solid var(--th-border)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--th-bg-elevated)",
          }}
        >
          <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {tr("에이전트", "Agents")} ({agents.length})
            </span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredAgents.length === 0 && (
              <div style={{ padding: "20px 12px", textAlign: "center", fontSize: 11, color: "var(--th-text-muted)" }}>
                {tr("없음", "None")}
              </div>
            )}
            {filteredAgents.map((agent) => {
              const isSelected = selectedIds.has(agent.id);
              const isLoading  = loadingIds.has(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgent(agent.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: "100%",
                    padding: "9px 12px",
                    borderBottom: "1px solid var(--th-border)",
                    background: isSelected ? "var(--th-accent-glow)" : "transparent",
                    borderLeft: `3px solid ${isSelected ? "var(--th-accent)" : "transparent"}`,
                    border: "none",
                    borderBottomColor: "var(--th-border)",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderLeftColor: isSelected ? "var(--th-accent)" : "transparent",
                    borderLeftWidth: 3,
                    borderLeftStyle: "solid",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Avatar + status dot */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: isSelected ? "var(--th-accent)" : "var(--th-bg-surface)",
                      border: `1px solid ${isSelected ? "var(--th-accent)" : "var(--th-border)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, transition: "background 0.1s",
                    }}>
                      {agent.avatar_emoji}
                    </div>
                    <span style={{
                      position: "absolute", bottom: 0, right: 0,
                      width: 8, height: 8, borderRadius: "50%",
                      background: AGENT_STATUS_DOT[agent.status] ?? "var(--th-text-muted)",
                      border: "1.5px solid var(--th-bg-elevated)",
                    }} />
                  </div>

                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "var(--th-accent)" : "var(--th-text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {getAgentName(agent)}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 1 }}>
                      {isLoading ? "loading…" : agent.role}
                    </div>
                  </div>

                  {/* Check */}
                  {isSelected && (
                    <span style={{ fontSize: 12, color: "var(--th-accent)", flexShrink: 0 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — messages + composer */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--th-bg-surface)" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
            {selectedIds.size === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--th-text-muted)" }}>
                <span style={{ fontSize: 32, opacity: 0.2 }}>💬</span>
                <span style={{ fontSize: 12 }}>{tr("왼쪽에서 에이전트를 선택하세요", "Select agents on the left")}</span>
              </div>
            ) : mergedMessages.length === 0 ? (
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--th-text-muted)" }}>
                {tr("대화 내역이 없습니다", "No messages yet")}
              </div>
            ) : (
              mergedMessages.map((msg) => {
                const isCeo      = msg.sender_type === "client";
                const forAgent   = agentById.get(msg._forAgentId);
                const forName    = forAgent ? getAgentName(forAgent) : msg._forAgentId.slice(0, 8);
                const senderName = isCeo
                  ? "Me"
                  : msg.sender_agent ? getAgentName(msg.sender_agent) : forName;
                const timeStr = new Date(msg.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

                return (
                  <div
                    key={`${msg.id}:${msg._forAgentId}`}
                    style={{
                      display: "flex",
                      flexDirection: isCeo ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: 8,
                      padding: "4px 14px",
                    }}
                  >
                    {/* Avatar */}
                    {!isCeo && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, marginBottom: 2 }}>
                        {forAgent?.avatar_emoji ?? "🤖"}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isCeo ? "flex-end" : "flex-start", gap: 3 }}>
                      {!isCeo && (
                        <span style={{ fontSize: 10, color: "var(--th-text-muted)", paddingLeft: 4 }}>{senderName} → {forName}</span>
                      )}
                      <div style={{
                        padding: "8px 12px",
                        borderRadius: isCeo ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isCeo ? "var(--th-accent)" : "var(--th-bg-elevated)",
                        color: isCeo ? "#fff" : "var(--th-text-primary)",
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        border: isCeo ? "none" : "1px solid var(--th-border)",
                      }}>
                        {msg.content}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--th-text-muted)", paddingLeft: isCeo ? 0 : 4, paddingRight: isCeo ? 4 : 0 }}>
                        {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid var(--th-border)",
              background: "var(--th-bg-elevated)",
              padding: "10px 14px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
            />

            {/* Attachments */}
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {attachments.map((file, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", borderRadius: 12, fontSize: 10, color: "var(--th-text-secondary)" }}>
                    <span>{getFileIcon(file.name)}</span>
                    <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <span style={{ color: "var(--th-text-muted)" }}>({formatFileSize(file.size)})</span>
                    <button type="button" onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))} style={{ color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Input row */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: 22,
              padding: "4px 6px 4px 14px",
            }}>
              {/* Attach button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES || selectedIds.size === 0}
                title={tr("파일 첨부", "Attach file")}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--th-bg-elevated)",
                  border: "1px solid var(--th-border)",
                  color: "var(--th-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0, fontSize: 13,
                  opacity: (attachments.length >= MAX_FILES || selectedIds.size === 0) ? 0.3 : 1,
                  alignSelf: "flex-end",
                  marginBottom: 2,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_CONTENT))}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sending && selectedIds.size > 0) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={1}
                disabled={sending || selectedIds.size === 0}
                placeholder={
                  selectedIds.size === 0
                    ? tr("에이전트를 선택하세요", "Select agents first")
                    : tr(`${selectedIds.size}명에게 메시지... (Ctrl+Enter)`, `Message ${selectedIds.size}... (Ctrl+Enter)`)
                }
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: 12,
                  fontFamily: "var(--th-font-mono)",
                  color: "var(--th-text-primary)",
                  caretColor: "var(--th-accent)",
                  lineHeight: 1.5,
                  padding: "6px 0",
                  maxHeight: 96,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 96) + "px";
                }}
              />

              {/* Send button */}
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!input.trim() && attachments.length === 0) || sending || selectedIds.size === 0}
                title={tr("전송 (Ctrl+Enter)", "Send (Ctrl+Enter)")}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: (input.trim() || attachments.length > 0) && selectedIds.size > 0
                    ? "var(--th-accent)"
                    : "var(--th-bg-elevated)",
                  border: "none",
                  color: (input.trim() || attachments.length > 0) && selectedIds.size > 0
                    ? "#fff"
                    : "var(--th-text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0, transition: "background 0.15s",
                  opacity: (!input.trim() && attachments.length === 0) || sending || selectedIds.size === 0 ? 0.4 : 1,
                  alignSelf: "flex-end",
                  marginBottom: 1,
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>

            {/* Status row */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "var(--th-text-muted)" }}>
              <span>
                {sendError && <span style={{ color: "var(--th-danger, #ef4444)" }}>{sendError}</span>}
                {uploading && <span style={{ color: "var(--th-accent)" }}>{tr("파일 업로드 중...", "Uploading...")}</span>}
                {sentOk && <span style={{ color: "var(--th-success, #22c55e)" }}>✓ {tr(`${selectedIds.size}명 전송 완료`, `Sent to ${selectedIds.size}`)}</span>}
              </span>
              <span>Ctrl+Enter {tr("전송", "send")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
