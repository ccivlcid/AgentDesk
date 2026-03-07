import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, Message } from "../../types";
import { getMessages, sendMessage } from "../../api";
import { useI18n } from "../../i18n";

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
      <div className="flex items-center justify-center py-8" style={{ color: "var(--th-text-muted)" }}>
        <span className="text-xs font-mono animate-pulse">{tr("로딩 중...", "Loading...")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 0 }}>
      {/* Message list */}
      <div className="space-y-2 pb-2" style={{ maxHeight: 320, overflowY: "auto" }}>
        {messages.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr(`${agentName}와 주고받은 메시지가 없습니다`, `No messages with ${agentName} yet`)}
          </div>
        ) : (
          messages.map((msg) => {
            const isCeo = msg.sender_type === "ceo";
            const typeLabel = MESSAGE_TYPE_LABEL[msg.message_type] ?? msg.message_type;
            const senderLabel = isCeo
              ? tr("CEO", "CEO")
              : msg.sender_agent
                ? (isKo ? msg.sender_agent.name_ko || msg.sender_agent.name : msg.sender_agent.name || msg.sender_agent.name_ko)
                : msg.sender_name || tr("시스템", "system");

            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${isCeo ? "items-end" : "items-start"}`}>
                {/* Sender + type + time */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono px-0.5" style={{ color: "var(--th-text-muted)" }}>
                  <span style={{ color: isCeo ? "var(--th-accent)" : "var(--th-text-secondary)" }}>
                    {senderLabel}
                  </span>
                  <span
                    className="px-1 py-px"
                    style={{ borderRadius: "2px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
                  >
                    {typeLabel}
                  </span>
                  <span>{dateTimeFormatter.format(new Date(msg.created_at))}</span>
                </div>
                {/* Bubble */}
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
      <div style={{ borderTop: "1px solid var(--th-border)", marginTop: 4, marginBottom: 8 }} />

      {/* Send input */}
      <div className="flex flex-col gap-1.5">
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
          className="w-full resize-none border px-2 py-1.5 text-xs font-mono outline-none disabled:opacity-50"
          style={{
            borderRadius: "2px",
            borderColor: "var(--th-input-border)",
            background: "var(--th-bg-primary)",
            color: "var(--th-text-primary)",
          }}
          placeholder={tr(`${agentName}에게 메시지 전송... (Ctrl+Enter)`, `Message ${agentName}... (Ctrl+Enter)`)}
        />
        {sendError && (
          <div className="text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>{sendError}</div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {content.length}/{MAX_CONTENT}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchMessages()}
              className="px-2 py-1 text-[10px] font-mono border transition hover:opacity-80"
              style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-surface)" }}
              title={tr("새로고침", "Refresh")}
            >
              ↺
            </button>
            <button
              onClick={() => void handleSend()}
              disabled={!content.trim() || sending}
              className="px-3 py-1 text-[10px] font-mono font-bold transition disabled:opacity-40"
              style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
            >
              {sending ? tr("전송 중...", "Sending...") : tr("전송", "Send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
