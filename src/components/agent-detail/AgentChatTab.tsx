import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, Message } from "../../types";
import { getMessages, sendMessage } from "../../api";
import { useI18n } from "../../i18n";
import { useWebSocket } from "../../hooks/useWebSocket";

const MSG_LIMIT = 60;
const MAX_CONTENT = 2000;

const MESSAGE_TYPE_LABEL: Record<string, string> = {
  chat: "chat",
  task_assign: "task",
  directive: "directive",
  announcement: "announce",
  report: "report",
  status_update: "status",
};

interface AgentChatTabProps {
  agent: Agent;
}

export default function AgentChatTab({ agent }: AgentChatTabProps) {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isKo = locale.startsWith("ko");

  const agentName = isKo ? agent.name_ko || agent.name : agent.name || agent.name_ko;

  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await getMessages({ receiver_type: "agent", receiver_id: agent.id, limit: MSG_LIMIT });
      setMessages(msgs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    void fetchMessages();
  }, [fetchMessages]);

  // Auto-refresh when a new message arrives for this agent
  const { on } = useWebSocket();
  useEffect(() => {
    return on("new_message", (payload) => {
      const msg = payload as { sender_id?: string; receiver_id?: string; sender_type?: string; receiver_type?: string };
      const isForThisAgent =
        (msg.receiver_type === "agent" && msg.receiver_id === agent.id) ||
        (msg.sender_type === "agent" && msg.sender_id === agent.id);
      if (isForThisAgent) void fetchMessages();
    });
  }, [on, agent.id, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage({
        receiver_type: "agent",
        receiver_id: agent.id,
        content: trimmed,
        message_type: "chat",
      });
      setContent("");
      await fetchMessages();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : tr("전송 실패", "Send failed"));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8" style={{ color: "#9CA3AF" }}>
        <span className="text-xs font-mono animate-pulse">{tr("로딩 중...", "Loading...")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 0 }}>
      {/* Message list */}
      <div className="space-y-2 pb-2" style={{ maxHeight: 320, overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono" style={{ color: "#9CA3AF" }}>
            {tr(`${agentName}와 주고받은 메시지가 없습니다`, `No messages with ${agentName} yet`)}
          </div>
        ) : (
          messages.map((msg) => {
            const isCeo = msg.sender_type === "client";
            const typeLabel = MESSAGE_TYPE_LABEL[msg.message_type] ?? msg.message_type;
            const senderLabel = isCeo
              ? tr("클라이언트", "Client")
              : msg.sender_agent
                ? (isKo ? msg.sender_agent.name_ko || msg.sender_agent.name : msg.sender_agent.name || msg.sender_agent.name_ko)
                : msg.sender_name || tr("시스템", "system");

            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isCeo ? "items-end" : "items-start"}`}>
                {/* Sender + type + time */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono px-0.5" style={{ color: "#9CA3AF" }}>
                  <span style={{ color: isCeo ? "#3B82F6" : "#6B7280" }}>
                    {senderLabel}
                  </span>
                  <span
                    className="px-1 py-px"
                    style={{ borderRadius: 8, background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                  >
                    {typeLabel}
                  </span>
                  <span>{dateTimeFormatter.format(new Date(msg.created_at))}</span>
                </div>
                {/* Bubble */}
                <div
                  className="max-w-[85%] px-2.5 py-1.5 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    borderRadius: 12,
                    background: isCeo ? "rgba(59,130,246,0.06)" : "#FFFFFF",
                    border: `1px solid ${isCeo ? "rgba(59,130,246,0.2)" : "#E5E7EB"}`,
                    color: "#111827",
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
      <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 4, marginBottom: 8 }} />

      {/* Send input — terminal prompt style */}
      <div className="flex flex-col gap-1.5">
        <div
          style={{
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            borderRadius: 8,
          }}
        >
          <div
            className="flex items-center gap-1.5 px-2 pt-1.5"
            style={{ borderBottom: "1px solid #E5E7EB", paddingBottom: "4px" }}
          >
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "11px", color: "#3B82F6", fontWeight: 700 }}>$</span>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#9CA3AF" }}>
              {tr(`msg → ${agentName}`, `msg → ${agentName}`)}
            </span>
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#9CA3AF", marginLeft: "auto" }}>
              {content.length}/{MAX_CONTENT} · Ctrl+Enter
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sending) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            disabled={sending}
            className="w-full resize-none px-2 py-1.5 text-xs font-mono outline-none disabled:opacity-50"
            style={{
              background: "transparent",
              border: "none",
              color: "#111827",
              caretColor: "#3B82F6",
            }}
            placeholder={tr("메시지 입력...", "type a message...")}
          />
        </div>
        {sendError && (
          <div className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>✗ {sendError}</div>
        )}
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => void fetchMessages()}
            className="px-2 py-1 text-[10px] font-mono border transition hover:opacity-80"
            style={{ borderRadius: 8, borderColor: "#E5E7EB", color: "#9CA3AF", background: "#F9FAFB" }}
            title={tr("새로고침", "Refresh")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!content.trim() || sending}
            className="px-3 py-1 text-[10px] font-mono font-bold transition disabled:opacity-40"
            style={{ borderRadius: 8, background: "#3B82F6", color: "#FFFFFF" }}
          >
            {sending ? tr("전송 중...", "sending...") : tr("전송 ↵", "SEND ↵")}
          </button>
        </div>
      </div>
    </div>
  );
}
