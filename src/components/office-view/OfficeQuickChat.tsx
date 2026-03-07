import { useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { useI18n } from "../../i18n";
import AgentAvatar from "../AgentAvatar";
import { sendMessage } from "../../api";

const MAX_LENGTH = 800;

interface OfficeQuickChatProps {
  agent: Agent;
  agents: Agent[];
  onClose: () => void;
}

export default function OfficeQuickChat({ agent, agents, onClose }: OfficeQuickChatProps) {
  const { t, locale } = useI18n();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isKo = locale.startsWith("ko");
  const agentName = isKo ? agent.name_ko || agent.name : agent.name || agent.name_ko;

  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 40);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({
        receiver_type: "agent",
        receiver_id: agent.id,
        content: trimmed,
        message_type: "chat",
      });
      setSent(true);
      setContent("");
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("전송에 실패했습니다.", "Send failed."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="flex flex-col shadow-2xl"
      style={{
        width: 280,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderTop: "2px solid var(--th-accent)",
        borderRadius: "4px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--th-border)" }}
      >
        <AgentAvatar agent={agent} agents={agents} size={22} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono font-semibold truncate" style={{ color: "var(--th-text-heading)" }}>
            {agentName}
          </div>
          <div className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {agent.cli_provider ?? "agent"} · {agent.role}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:opacity-70 transition flex-shrink-0"
          style={{ color: "var(--th-text-muted)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Input area */}
      <div className="px-3 py-2">
        {sent ? (
          <div
            className="py-3 text-center text-[11px] font-mono"
            style={{ color: "rgb(52,211,153)" }}
          >
            ✓ {tr("전송 완료", "Message sent")}
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !sending) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={3}
              disabled={sending}
              className="w-full resize-none border px-2 py-1.5 text-xs font-mono outline-none disabled:opacity-60"
              style={{
                borderRadius: "2px",
                borderColor: "var(--th-input-border)",
                background: "var(--th-bg-primary)",
                color: "var(--th-text-primary)",
              }}
              placeholder={tr(
                `${agentName}에게 메시지 전송...`,
                `Message ${agentName}...`,
              )}
            />
            {error && (
              <div className="mt-1 text-[10px] font-mono" style={{ color: "rgb(253,164,175)" }}>
                {error}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                {content.length}/{MAX_LENGTH} · Ctrl+Enter
              </span>
              <button
                onClick={() => void handleSend()}
                disabled={!content.trim() || sending}
                className="px-3 py-1 text-[11px] font-mono font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderRadius: "2px",
                  background: "var(--th-accent)",
                  color: "#000",
                }}
              >
                {sending ? tr("전송 중...", "Sending...") : tr("전송", "Send")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
