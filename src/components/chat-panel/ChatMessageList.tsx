import { useRef, useEffect, useCallback } from "react";
import type { RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Agent, Message, MessageAttachment } from "../../types";
import type { DecisionOption } from "../chat/decision-request";
import AgentAvatar from "../AgentAvatar";
import MessageContent from "../MessageContent";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getAttachmentIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "gif"].includes(ext)) return "\uD83D\uDDBC\uFE0F";
  if (["pdf"].includes(ext)) return "\uD83D\uDCC4";
  if (["docx", "doc"].includes(ext)) return "\uD83D\uDCC3";
  if (["xlsx", "xls", "csv"].includes(ext)) return "\uD83D\uDCCA";
  if (["pptx", "ppt"].includes(ext)) return "\uD83D\uDCCA";
  if (["mp4"].includes(ext)) return "\uD83C\uDFA5";
  if (["zip"].includes(ext)) return "\uD83D\uDCE6";
  if (["json"].includes(ext)) return "\uD83D\uDD27";
  if (["md", "txt"].includes(ext)) return "\uD83D\uDCDD";
  return "\uD83D\uDCCE";
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "gif"].includes(ext);
}

function AttachmentChips({ attachments }: { attachments: MessageAttachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => {
        const downloadUrl = `/api/chat/uploads/${att.id}/${encodeURIComponent(att.fileName)}`;
        return (
          <div key={att.id}>
            {isImageFile(att.fileName) && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                <img
                  src={downloadUrl}
                  alt={att.fileName}
                  className="max-h-32 max-w-[200px] object-cover"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}
                  loading="lazy"
                />
              </a>
            )}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono transition"
              style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
            >
              <span>{getAttachmentIcon(att.fileName)}</span>
              <span className="max-w-[140px] truncate">{att.fileName}</span>
              <span style={{ color: "var(--th-text-muted)" }}>({formatFileSize(att.size)})</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" style={{ color: "var(--th-text-muted)" }}>
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
            </a>
          </div>
        );
      })}
    </div>
  );
}

type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

interface StreamingMessageLike {
  message_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  content: string;
}

interface ChatMessageListProps {
  selectedAgent: Agent | null;
  visibleMessages: Message[];
  agents: Agent[];
  spriteMap: ReturnType<typeof import("../AgentAvatar").buildSpriteMap>;
  locale: string;
  tr: Tr;
  getAgentName: (agent: Agent | null | undefined) => string;
  decisionRequestByMessage: Map<string, { options: DecisionOption[] }>;
  decisionReplyKey: string | null;
  onDecisionOptionReply: (message: Message, option: DecisionOption) => void;
  onDecisionManualDraft: (option: DecisionOption) => void;
  streamingMessage?: StreamingMessageLike | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  searchQuery?: string;
  pinnedIds?: Set<string>;
  onPinToggle?: (msgId: string) => void;
}

function formatTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex items-center gap-1 px-4 py-2" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)" }}>
        <span className="h-2 w-2 animate-bounce" style={{ borderRadius: "50%", background: "var(--th-text-muted)", animationDelay: "0ms" }} />
        <span className="h-2 w-2 animate-bounce" style={{ borderRadius: "50%", background: "var(--th-text-muted)", animationDelay: "150ms" }} />
        <span className="h-2 w-2 animate-bounce" style={{ borderRadius: "50%", background: "var(--th-text-muted)", animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

function normalizeMessageSenderName(msg: Message): string {
  return typeof msg.sender_name === "string" ? msg.sender_name.trim() : "";
}

function normalizeMessageSenderAvatar(msg: Message): string {
  const avatar = typeof msg.sender_avatar === "string" ? msg.sender_avatar.trim() : "";
  return avatar || "🤖";
}

function buildFallbackSenderAgent(msg: Message): Agent | undefined {
  const displayName = normalizeMessageSenderName(msg) || msg.sender_id || "";
  if (!displayName) return undefined;
  return {
    id: msg.sender_id || `msg-sender-${msg.id}`,
    name: displayName,
    name_ko: displayName,
    name_ja: displayName,
    name_zh: displayName,
    department_id: null,
    role: "junior",
    cli_provider: "api",
    avatar_emoji: normalizeMessageSenderAvatar(msg),
    personality: null,
    status: "idle",
    current_task_id: null,
    stats_tasks_done: 0,
    stats_xp: 0,
    created_at: msg.created_at,
  };
}

export default function ChatMessageList({
  selectedAgent,
  visibleMessages,
  agents,
  spriteMap,
  locale,
  tr,
  getAgentName,
  decisionRequestByMessage,
  decisionReplyKey,
  onDecisionOptionReply,
  onDecisionManualDraft,
  streamingMessage,
  messagesEndRef,
  searchQuery,
  pinnedIds,
  onPinToggle,
}: ChatMessageListProps) {
  const isStreamingForAgent = Boolean(
    streamingMessage && selectedAgent && streamingMessage.agent_id === selectedAgent.id,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(visibleMessages.length);

  const virtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive or streaming starts
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 120;
    const hasNewMessages = visibleMessages.length > prevCountRef.current;
    prevCountRef.current = visibleMessages.length;
    if (isAtBottom || hasNewMessages) {
      if (visibleMessages.length > 0) {
        virtualizer.scrollToIndex(visibleMessages.length - 1, { align: "end" });
      }
    }
    // Dispatch office banner event for new announcement messages from user/CEO
    if (hasNewMessages) {
      const lastMsg = visibleMessages[visibleMessages.length - 1];
      if (lastMsg && lastMsg.message_type === "announcement" && (lastMsg.sender_type === "user" || lastMsg.sender_type === "ceo")) {
        window.dispatchEvent(new CustomEvent("agentdesk_office_announcement", {
          detail: { text: lastMsg.content?.slice(0, 120) ?? "", sender: "CEO" },
        }));
      }
    }
  }, [visibleMessages.length, virtualizer]);

  // Scroll to bottom during streaming
  useEffect(() => {
    if (isStreamingForAgent && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isStreamingForAgent, streamingMessage?.content]);

  const renderMessage = useCallback((msg: Message) => {
    const isCeo = msg.sender_type === "ceo";
    const isDirective = msg.message_type === "directive";
    const isSystem = msg.sender_type === "system" || msg.message_type === "announcement" || isDirective;

    const senderAgent =
      msg.sender_agent ?? agents.find((agent) => agent.id === msg.sender_id) ?? buildFallbackSenderAgent(msg);
    const senderNameFromPayload = normalizeMessageSenderName(msg);
    const senderName = isCeo
      ? tr("CEO", "CEO")
      : isSystem
        ? tr("시스템", "System", "システム", "系统")
        : getAgentName(senderAgent) || senderNameFromPayload || tr("알 수 없음", "Unknown", "不明", "未知");
    const decisionRequest = decisionRequestByMessage.get(msg.id);
    const isPinned = pinnedIds?.has(msg.id);

    if (msg.sender_type === "agent" && msg.receiver_type === "all") {
      return (
        <div className="group flex items-end gap-2">
          <AgentAvatar agent={senderAgent} spriteMap={spriteMap} size={28} />
          <div className="flex max-w-[75%] flex-col gap-1">
            <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{senderName}</span>
            <div className="announcement-reply-bubble border border-yellow-500/20 px-4 py-2.5 text-sm" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}>
              <MessageContent content={msg.content} />
              {msg.attachments && <AttachmentChips attachments={msg.attachments} />}
            </div>
            {decisionRequest && renderDecisionRequest(msg, decisionRequest)}
            <div className="flex items-center gap-1">
              <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{formatTime(msg.created_at, locale)}</span>
              {onPinToggle && renderPinButton(msg.id, isPinned)}
            </div>
          </div>
        </div>
      );
    }

    if (isSystem || msg.receiver_type === "all") {
      return (
        <div className="flex flex-col items-center gap-1">
          {isDirective && (
            <span className="border px-2 py-0.5 text-xs font-bold font-mono" style={{ borderRadius: "2px", borderColor: "rgba(244,63,94,0.35)", background: "rgba(244,63,94,0.1)", color: "rgb(253,164,175)" }}>
              {tr("업무지시", "Directive", "業務指示", "业务指示")}
            </span>
          )}
          <div
            className={`max-w-[85%] px-4 py-2.5 text-center text-sm shadow-sm ${
              isDirective
                ? "border border-red-500/30 bg-red-500/15 text-red-300"
                : "announcement-message-bubble border border-yellow-500/30 bg-yellow-500/15 text-yellow-300"
            }`}
            style={{ borderRadius: "2px" }}
          >
            <MessageContent content={msg.content} />
            {msg.attachments && <AttachmentChips attachments={msg.attachments} />}
          </div>
          <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{formatTime(msg.created_at, locale)}</span>
        </div>
      );
    }

    if (isCeo) {
      return (
        <div className="group flex flex-col items-end gap-1">
          <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{tr("CEO", "CEO")}</span>
          <div className="max-w-[80%] px-4 py-2.5 text-sm text-black" style={{ borderRadius: "2px", background: "var(--th-accent)" }}>
            <MessageContent content={msg.content} />
            {msg.attachments && <AttachmentChips attachments={msg.attachments} />}
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{formatTime(msg.created_at, locale)}</span>
            {onPinToggle && renderPinButton(msg.id, isPinned)}
          </div>
        </div>
      );
    }

    return (
      <div className="group flex items-end gap-2">
        <AgentAvatar agent={senderAgent} spriteMap={spriteMap} size={28} />
        <div className="flex max-w-[75%] flex-col gap-1">
          <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{senderName}</span>
          <div className="px-4 py-2.5 text-sm" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}>
            <MessageContent content={msg.content} />
            {msg.attachments && <AttachmentChips attachments={msg.attachments} />}
          </div>
          {decisionRequest && renderDecisionRequest(msg, decisionRequest)}
          <div className="flex items-center gap-1">
            <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{formatTime(msg.created_at, locale)}</span>
            {onPinToggle && renderPinButton(msg.id, isPinned)}
          </div>
        </div>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, spriteMap, locale, tr, getAgentName, decisionRequestByMessage, decisionReplyKey, onDecisionOptionReply, onDecisionManualDraft, onPinToggle, pinnedIds]);

  function renderDecisionRequest(msg: Message, decisionRequest: { options: DecisionOption[] }) {
    return (
      <div className="px-2 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.05)" }}>
        <p className="text-[11px] font-medium font-mono" style={{ color: "var(--th-accent)" }}>
          {tr("의사결정 요청", "Decision request", "意思決定リクエスト", "决策请求")}
        </p>
        <div className="mt-1.5 space-y-1">
          {decisionRequest.options.map((option) => {
            const key = `${msg.id}:${option.number}`;
            const isBusy = decisionReplyKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onDecisionOptionReply(msg, option)}
                disabled={isBusy}
                className="decision-inline-option w-full px-2 py-1.5 text-left text-[11px] font-mono transition disabled:opacity-60"
                style={{ borderRadius: "2px" }}
              >
                {isBusy ? tr("전송 중...", "Sending...", "送信中...", "发送中...") : `${option.number}. ${option.label}`}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onDecisionManualDraft(decisionRequest.options[0])}
          className="mt-2 text-[11px] font-mono underline underline-offset-2"
          style={{ color: "var(--th-accent)" }}
        >
          {tr("직접 답변 작성", "Write custom reply", "カスタム返信を作成", "编写自定义回复")}
        </button>
      </div>
    );
  }

  function renderPinButton(msgId: string, isPinned: boolean | undefined) {
    return (
      <button
        type="button"
        onClick={() => onPinToggle!(msgId)}
        className={`h-5 w-5 flex items-center justify-center transition-opacity ${isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"}`}
        title={isPinned ? tr("고정 해제", "Unpin", "ピン解除", "取消固定") : tr("고정", "Pin", "ピン留め", "固定")}
        style={{ color: isPinned ? "var(--th-accent)" : "var(--th-text-muted)" }}
      >
        📌
      </button>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      {visibleMessages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          {searchQuery?.trim() ? (
            <>
              <div className="text-4xl">🔍</div>
              <div>
                <p className="font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("검색 결과 없음", "No results found", "検索結果なし", "无搜索结果")}
                </p>
                <p className="mt-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl">💬</div>
              <div>
                <p className="font-medium font-mono" style={{ color: "var(--th-text-secondary)" }}>
                  {tr("대화를 시작해보세요! 👋", "Start a conversation! 👋", "会話を始めましょう! 👋", "开始对话吧! 👋")}
                </p>
                <p className="mt-1 text-sm font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {selectedAgent
                    ? tr(
                        `${getAgentName(selectedAgent)}에게 메시지를 보내보세요`,
                        `Send a message to ${getAgentName(selectedAgent)}`,
                        `${getAgentName(selectedAgent)}にメッセージを送ってみましょう`,
                        `给 ${getAgentName(selectedAgent)} 发送一条消息吧`,
                      )
                    : tr(
                        "전체 에이전트에게 공지를 보내보세요",
                        "Send an announcement to all agents",
                        "すべてのエージェントに告知を送ってみましょう",
                        "给所有代理发送一条公告吧",
                      )}
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Virtual list */}
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualizer.getVirtualItems().map((vItem) => {
              const msg = visibleMessages[vItem.index];
              return (
                <div
                  key={vItem.key}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vItem.start}px)`, paddingBottom: "12px" }}
                >
                  {renderMessage(msg)}
                </div>
              );
            })}
          </div>


          {isStreamingForAgent && streamingMessage?.content && (
            <div className="flex items-end gap-2">
              <AgentAvatar agent={selectedAgent ?? undefined} spriteMap={spriteMap} size={28} />
              <div className="flex max-w-[75%] flex-col gap-1">
                <span className="px-1 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>{getAgentName(selectedAgent)}</span>
                <div className="border border-emerald-500/20 px-4 py-2.5 text-sm" style={{ borderRadius: "2px", background: "var(--th-bg-elevated)", color: "var(--th-text-primary)" }}>
                  <MessageContent content={streamingMessage.content} />
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-400 align-text-bottom" />
                </div>
              </div>
            </div>
          )}

          {selectedAgent && selectedAgent.status === "working" && !isStreamingForAgent && (
            <div className="flex items-end gap-2">
              <AgentAvatar agent={selectedAgent} spriteMap={spriteMap} size={28} />
              <TypingIndicator />
            </div>
          )}
        </>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
