import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Message } from "../../types";
import { getMessages, sendMessage } from "../../api";
import { useI18n } from "../../i18n";

const MAX_CONTENT = 2000;

interface GroupChatPanelProps {
  agents: Agent[];
  onClose: () => void;
}

export default function GroupChatPanel({ agents, onClose }: GroupChatPanelProps) {
  const { t, locale } = useI18n();
  const isKo = locale.startsWith("ko");
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messagesByAgent, setMessagesByAgent] = useState<Map<string, Message[]>>(new Map());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentOk, setSentOk] = useState(false);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mergedMessages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || selectedIds.size === 0) return;
    setSending(true);
    setSendError(null);
    setSentOk(false);
    try {
      for (const agentId of selectedIds) {
        await sendMessage({ receiver_type: "agent", receiver_id: agentId, content: trimmed, message_type: "chat" });
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
  }, [input, sending, selectedIds, fetchForAgent, tr]);

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

      {/* Panel */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden sm:w-[680px]"
        style={{ background: "var(--th-bg-primary)", borderLeft: "1px solid var(--th-border)" }}
      >
        {/* Header */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-lg"
            style={{ borderRadius: "2px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
            ◈
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>
              {tr("그룹 채팅", "Group Chat")}
            </div>
            <div className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-muted)" }}>
              {selectedIds.size > 0
                ? tr(`${selectedIds.size}명 선택됨`, `${selectedIds.size} agent${selectedIds.size > 1 ? "s" : ""} selected`)
                : tr("에이전트를 선택하세요", "Select agents to message")}
            </div>
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-[10px] font-mono border transition hover:opacity-80"
              style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-surface)" }}
            >
              {tr("선택 해제", "Clear")}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center transition hover:opacity-80"
            style={{ color: "var(--th-text-secondary)" }}
          >
            ✕
          </button>
        </div>

        {/* Body: two columns */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left: agent selector */}
          <div
            className="flex w-[200px] flex-shrink-0 flex-col overflow-hidden"
            style={{ borderRight: "1px solid var(--th-border)" }}
          >
            {/* Search */}
            <div className="flex-shrink-0 px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr("검색...", "Search...")}
                className="w-full border px-2 py-1 text-xs font-mono outline-none"
                style={{
                  borderRadius: "2px",
                  borderColor: "var(--th-input-border)",
                  background: "var(--th-bg-primary)",
                  color: "var(--th-text-primary)",
                }}
              />
            </div>
            {/* Agent list */}
            <div className="flex-1 overflow-y-auto py-1">
              {filteredAgents.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {tr("없음", "None")}
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const isSelected = selectedIds.has(agent.id);
                  const isLoading = loadingIds.has(agent.id);
                  const statusColor = agent.status === "working" ? "rgb(52,211,153)" : "var(--th-text-muted)";
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:opacity-80"
                      style={{
                        background: isSelected ? "rgba(251,191,36,0.08)" : "transparent",
                        borderLeft: `2px solid ${isSelected ? "var(--th-accent)" : "transparent"}`,
                      }}
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 border"
                        style={{
                          borderRadius: "2px",
                          borderColor: isSelected ? "var(--th-accent)" : "var(--th-border)",
                          background: isSelected ? "var(--th-accent)" : "transparent",
                        }}
                      >
                        {isSelected && (
                          <span className="flex items-center justify-center text-[8px] font-bold" style={{ color: "#000", lineHeight: 1 }}>
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-mono" style={{ color: "var(--th-text-secondary)" }}>
                          {agent.avatar_emoji} {getAgentName(agent)}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: statusColor }}>
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

          {/* Right: message feed */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {selectedIds.size === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="text-4xl" style={{ opacity: 0.3 }}>◈</div>
                  <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {tr("왼쪽에서 에이전트를 선택하세요", "Select agents on the left")}
                  </p>
                </div>
              ) : mergedMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
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

                  return (
                    <div key={`${msg.id}:${msg._forAgentId}`} className={`flex flex-col gap-0.5 ${isCeo ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono px-0.5" style={{ color: "var(--th-text-muted)" }}>
                        <span style={{ color: isCeo ? "var(--th-accent)" : "var(--th-text-secondary)" }}>
                          {senderLabel}
                        </span>
                        <span>{dtFmt.format(new Date(msg.created_at))}</span>
                      </div>
                      <div
                        className="max-w-[85%] px-2.5 py-1.5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
                        style={{
                          borderRadius: "4px",
                          background: isCeo ? "rgba(251,191,36,0.12)" : "var(--th-bg-elevated)",
                          border: `1px solid ${isCeo ? "rgba(251,191,36,0.3)" : "var(--th-border)"}`,
                          color: "var(--th-text-primary)",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid var(--th-border)" }} />

            {/* Input area */}
            <div className="flex-shrink-0 px-4 py-3 space-y-2">
              {selectedIds.size === 0 && (
                <div className="text-[10px] font-mono text-center" style={{ color: "var(--th-text-muted)" }}>
                  {tr("에이전트를 먼저 선택하세요", "Select at least one agent first")}
                </div>
              )}
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
                className="w-full resize-none border px-2 py-1.5 text-xs font-mono outline-none disabled:opacity-50"
                style={{
                  borderRadius: "2px",
                  borderColor: "var(--th-input-border)",
                  background: "var(--th-bg-primary)",
                  color: "var(--th-text-primary)",
                }}
                placeholder={
                  selectedIds.size === 0
                    ? tr("에이전트를 선택하면 입력 가능합니다", "Select agents to enable input")
                    : tr(`${selectedIds.size}명에게 전송... (Ctrl+Enter)`, `Message ${selectedIds.size} agent${selectedIds.size > 1 ? "s" : ""}... (Ctrl+Enter)`)
                }
              />
              {sendError && (
                <div className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>{sendError}</div>
              )}
              {sentOk && (
                <div className="text-[10px] font-mono" style={{ color: "rgb(52,211,153)" }}>
                  {tr(`✓ ${selectedIds.size}명에게 전송 완료`, `✓ Sent to ${selectedIds.size} agent${selectedIds.size > 1 ? "s" : ""}`)}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {input.length}/{MAX_CONTENT}
                </span>
                <button
                  onClick={() => void handleSend()}
                  disabled={!input.trim() || sending || selectedIds.size === 0}
                  className="px-3 py-1 text-[10px] font-mono font-bold transition disabled:opacity-40"
                  style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
                >
                  {sending
                    ? tr("전송 중...", "Sending...")
                    : selectedIds.size > 0
                      ? tr(`${selectedIds.size}명에게 전송`, `Send to ${selectedIds.size}`)
                      : tr("전송", "Send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
