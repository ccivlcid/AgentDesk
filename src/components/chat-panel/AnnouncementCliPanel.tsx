import { useRef, useEffect, type KeyboardEvent, type RefObject, type DragEvent } from "react";
import type { Agent, Message } from "../../types";
import MessageContent from "../MessageContent";

type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
}

function getAgentDisplayName(msg: Message, agents: Agent[], getAgentName: (a: Agent | null | undefined) => string): string {
  const agent = agents.find((a) => a.id === msg.sender_id);
  if (agent) return getAgentName(agent);
  return typeof msg.sender_name === "string" && msg.sender_name.trim()
    ? msg.sender_name.trim()
    : msg.sender_id || "Unknown";
}

const ACCEPTED_TYPES = ".pdf,.pptx,.docx,.xlsx,.png,.jpg,.gif,.md,.txt,.csv,.json,.zip,.mp4";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["docx", "doc"].includes(ext)) return "📃";
  if (["xlsx", "xls", "csv"].includes(ext)) return "📊";
  if (["pptx", "ppt"].includes(ext)) return "📊";
  if (ext === "mp4") return "🎬";
  if (ext === "zip") return "📦";
  if (["md", "txt"].includes(ext)) return "📝";
  return "📎";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── line renderer ────────────────────────────────────────────────────────────

interface CliLineProps {
  msg: Message;
  agents: Agent[];
  locale: string;
  getAgentName: (a: Agent | null | undefined) => string;
  searchQuery?: string;
}

function CliLine({ msg, agents, locale, getAgentName, searchQuery }: CliLineProps) {
  const time = fmtTime(msg.created_at, locale);
  const isDirective = msg.message_type === "directive";
  const isAnnouncement = msg.message_type === "announcement" || msg.receiver_type === "all";
  const isAgentReply = msg.sender_type === "agent";
  const isClient = msg.sender_type === "client";

  type LineVariant = "directive" | "client-announce" | "client" | "agent" | "system";
  let variant: LineVariant = "system";
  if (isDirective) variant = "directive";
  else if (isClient && isAnnouncement) variant = "client-announce";
  else if (isClient) variant = "client";
  else if (isAgentReply) variant = "agent";

  const agentName = isAgentReply ? getAgentDisplayName(msg, agents, getAgentName) : "";

  const VARIANTS: Record<LineVariant, {
    rowBg: string; border: string;
    sigil: string; sigilColor: string;
    label: string; labelColor: string;
    contentColor: string;
  }> = {
    directive:        { rowBg: "var(--th-danger-bg)",   border: "var(--th-danger-border)", sigil: "$",  sigilColor: "var(--th-danger-text)", label: "DIRECTIVE", labelColor: "var(--th-danger-text)", contentColor: "var(--th-text-primary)" },
    "client-announce":{ rowBg: "var(--th-amber-glow)", border: "var(--th-border-accent)", sigil: "❯",  sigilColor: "var(--th-accent)", label: "Client",    labelColor: "var(--th-accent)", contentColor: "var(--th-text-primary)" },
    client:           { rowBg: "var(--th-bg-surface)", border: "var(--th-border)",        sigil: "❯",  sigilColor: "var(--th-accent)", label: "Client",    labelColor: "var(--th-accent)", contentColor: "var(--th-text-primary)" },
    agent:            { rowBg: "var(--th-green-glow)", border: "var(--th-border)",        sigil: "▸",  sigilColor: "var(--th-attr-elite)", label: agentName,   labelColor: "var(--th-attr-elite)", contentColor: "var(--th-text-primary)" },
    system:           { rowBg: "transparent",          border: "var(--th-border)",         sigil: "//", sigilColor: "var(--th-text-muted)", label: "SYSTEM",    labelColor: "var(--th-text-muted)", contentColor: "var(--th-text-secondary)" },
  };

  const v = VARIANTS[variant];

  // 블록 레이아웃: 1줄에 발신자·시간, 다음 줄에 본문 왼쪽 정렬로 가독성 개선
  return (
    <div
      className="px-3 py-2 font-mono text-xs leading-relaxed"
      style={{
        background: v.rowBg,
        borderBottom: `1px solid ${v.border}`,
      }}
    >
      {/* 1줄: 시간 + 시길 + 발신자 (간격 최소화) */}
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="select-none shrink-0" style={{ color: "var(--th-text-muted)" }}>{time}</span>
        <span className="font-bold shrink-0" style={{ color: v.sigilColor }}>{v.sigil}</span>
        <span
          className="truncate font-bold shrink-0 max-w-[180px]"
          style={{ color: v.labelColor }}
          title={isAgentReply ? agentName : undefined}
        >
          {v.label}
        </span>
      </div>
      {/* 본문: 왼쪽 정렬, 발신자 바로 아래에 붙여서 누가 쓴 말인지 바로 연결 */}
      <div
        className="whitespace-pre-wrap break-words text-left pl-0"
        style={{ color: v.contentColor, wordBreak: "break-word", overflowWrap: "anywhere" }}
      >
        <MessageContent content={msg.content} />
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export interface AnnouncementCliPanelProps {
  messages: Message[];
  agents: Agent[];
  locale: string;
  input: string;
  attachments: File[];
  streamingMessage?: { agent_id: string; agent_name: string; content: string } | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  tr: Tr;
  getAgentName: (a: Agent | null | undefined) => string;
  searchOpen: boolean;
  searchQuery: string;
  searchResultCount: number;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onAttachmentsChange: (files: File[]) => void;
  onClose: () => void;
  onClearMessages?: () => void;
  onSearchToggle: () => void;
  onSearchChange: (q: string) => void;
}

export default function AnnouncementCliPanel({
  messages,
  agents,
  locale,
  input,
  attachments,
  streamingMessage,
  messagesEndRef,
  tr,
  getAgentName,
  searchOpen,
  searchQuery,
  searchResultCount,
  onInputChange,
  onSend,
  onKeyDown,
  onAttachmentsChange,
  onClose,
  onClearMessages,
  onSearchToggle,
  onSearchChange,
}: AnnouncementCliPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const prevCountRef = useRef(messages.length);

  // auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 80;
    const hasNew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (isNearBottom || hasNew) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // file handlers
  const addFiles = (incoming: FileList | File[]) => {
    const next: File[] = [];
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_FILE_SIZE) continue;
      if (attachments.length + next.length >= MAX_FILES) break;
      if (!attachments.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    if (next.length > 0) onAttachmentsChange([...attachments, ...next]);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleKeyDownComposer = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown(e);
  };

  const displayMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  const agentCount = agents.length;
  const now = new Date();
  const sessionLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "var(--th-modal-overlay)" }}
        onClick={onClose}
        aria-label={tr("닫기", "Close")}
      />
      <div
        className="relative flex h-full w-full flex-col overflow-hidden sm:w-[640px]"
        style={{
          background: "var(--th-bg-base)",
          borderLeft: "1px solid var(--th-border)",
          fontFamily: "var(--th-font-mono)",
          borderTopLeftRadius: 10,
          borderBottomLeftRadius: 10,
          boxShadow: "var(--th-glass-shadow)",
        }}
      >
        {/* macOS 스타일 헤더 */}
        <div
          className="flex flex-shrink-0 items-center gap-3 px-4 py-3 select-none"
          style={{
            background: "var(--th-bg-panel)",
            borderBottom: "1px solid var(--th-border)",
            borderTopLeftRadius: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center transition-opacity hover:opacity-70 flex-shrink-0"
            style={{ borderRadius: 0, background: "transparent", border: "none", color: "var(--th-text-muted)", fontSize: 14, lineHeight: 1 }}
            title={tr("닫기", "Close")}
          >
            ✕
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--th-accent)" }}>❯</span>
            <span className="text-[11px] font-bold truncate" style={{ color: "var(--th-text-heading)" }}>
              {tr("전사 공지 채널", "Broadcast channel", "全社告知チャンネル", "全员广播频道")}
            </span>
            <span className="text-[10px] shrink-0" style={{ color: "var(--th-text-muted)" }}>— {agentCount}</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onSearchToggle}
              className="flex h-7 w-7 items-center justify-center transition-colors hover:opacity-80"
              style={{ borderRadius: 0, color: searchOpen ? "var(--th-accent)" : "var(--th-text-muted)" }}
              title={tr("검색", "Search")}
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="6.5" cy="6.5" r="4" />
                <path d="M10 10l3.5 3.5" strokeLinecap="round" />
              </svg>
            </button>
            {onClearMessages && messages.length > 0 && (
              <button
                type="button"
                onClick={onClearMessages}
                className="flex h-7 w-7 items-center justify-center transition-colors hover:opacity-80"
                style={{ borderRadius: 0, color: "var(--th-text-muted)" }}
                title={tr("내역 삭제", "Clear history")}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* search bar */}
        {searchOpen && (
          <div
            className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
            style={{ background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)" }}
          >
            <span className="text-[11px] shrink-0" style={{ color: "var(--th-accent)" }}>❯</span>
            <span className="text-[11px] shrink-0" style={{ color: "var(--th-text-muted)" }}>grep </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={tr("필터...", "filter...", "フィルター...", "过滤...")}
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-[11px] outline-none"
              style={{ color: "var(--th-text-primary)", caretColor: "var(--th-accent)" }}
            />
            {searchQuery.trim() && (
              <span className="shrink-0 text-[10px]" style={{ color: "var(--th-accent)" }}>
                {searchResultCount} {tr("건", "hits")}
              </span>
            )}
            {searchQuery && (
              <button type="button" onClick={() => onSearchChange("")} className="shrink-0 text-[10px] hover:opacity-70" style={{ color: "var(--th-text-muted)" }}>✕</button>
            )}
          </div>
        )}

        {/* session header */}
        <div
          className="flex flex-shrink-0 items-center gap-2 px-4 py-1.5"
          style={{ background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{sessionLabel}</span>
          <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>—</span>
          <span className="text-[10px] flex-1 truncate" style={{ color: "var(--th-text-muted)" }}>
            {displayMessages.length} {tr("건", "messages")}
          </span>
        </div>

        {/* message log */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto py-1"
          style={{ background: "var(--th-bg-primary)" }}
        >
          {displayMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div
                className="px-4 py-3 text-[11px]"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
              >
                <div className="mb-1" style={{ color: "var(--th-text-muted)" }}>
                  {searchQuery.trim() ? "$ grep" : "$ ls messages/"}
                </div>
                <div style={{ color: "var(--th-text-secondary)" }}>
                  {searchQuery.trim()
                    ? tr("검색 결과 없음", "No matches found", "一致なし", "无匹配结果")
                    : tr("공지 내역이 없습니다", "No broadcasts yet", "告知履歴なし", "暂无广播")}
                </div>
                {!searchQuery.trim() && (
                  <div className="mt-2" style={{ color: "var(--th-text-muted)" }}>
                    {tr("아래 입력창에서 전사 공지를 보내세요", "Send a broadcast below", "下の入力欄から告知を送信", "在下方输入框发送广播")}
                  </div>
                )}
              </div>
            </div>
        ) : (
          <>
            {displayMessages.map((msg) => (
              <CliLine
                key={msg.id}
                msg={msg}
                agents={agents}
                locale={locale}
                getAgentName={getAgentName}
                searchQuery={searchQuery}
              />
            ))}

            {/* streaming agent reply (블록 레이아웃 통일) */}
            {streamingMessage?.content && (
              <div
                className="px-3 py-2 font-mono text-xs leading-relaxed"
                style={{
                  borderBottom: "1px solid var(--th-border)",
                  background: "var(--th-bg-elevated)",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="select-none shrink-0" style={{ color: "var(--th-text-muted)" }}>
                    {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date())}
                  </span>
                  <span className="font-bold shrink-0" style={{ color: "var(--th-accent)" }}>▸</span>
                  <span className="truncate font-bold shrink-0 max-w-[180px]" style={{ color: "var(--th-text-heading)" }} title={streamingMessage.agent_name}>
                    {streamingMessage.agent_name}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words text-left" style={{ color: "var(--th-text-primary)", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <MessageContent content={streamingMessage.content} />
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse align-text-bottom" style={{ background: "var(--th-accent)" }} />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

        {/* attachment chips */}
        {attachments.length > 0 && (
          <div
            className="flex flex-shrink-0 flex-wrap gap-1.5 px-4 pb-1 pt-2"
            style={{ background: "var(--th-bg-primary)", borderTop: "1px solid var(--th-border)" }}
          >
            {attachments.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono"
                style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", borderRadius: 0 }}
              >
                <span>{getFileIcon(f.name)}</span>
                <span className="max-w-[100px] truncate">{f.name}</span>
                <span style={{ color: "var(--th-text-muted)" }}>({formatSize(f.size)})</span>
                <button
                  type="button"
                  onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                  className="ml-0.5 hover:opacity-70"
                  style={{ color: "var(--th-text-muted)" }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* composer */}
        <div
          className="flex-shrink-0 px-4 pb-4 pt-2"
          style={{ background: "var(--th-bg-primary)", borderTop: "1px solid var(--th-border)" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) { addFiles(e.target.files); e.target.value = ""; }
            }}
          />

          <div
            className="flex items-end gap-0"
            style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderRadius: 0 }}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current += 1; }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current -= 1; }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-2.5 pt-3">
              <span className="text-sm font-bold leading-none" style={{ color: "var(--th-accent)" }}>❯</span>
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDownComposer}
              placeholder={tr(
                "전사 공지 내용을 입력하세요...",
                "Type broadcast message...",
                "全体告知内容を入力してください...",
                "请输入广播内容...",
              )}
              rows={1}
              className="min-h-[44px] max-h-32 flex-1 resize-none overflow-y-auto bg-transparent py-3 pr-2 text-xs leading-relaxed focus:outline-none font-mono"
              style={{ color: "var(--th-text-primary)", caretColor: "var(--th-accent)", scrollbarWidth: "none" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
              }}
            />

            <div className="flex shrink-0 flex-col items-center gap-1 pb-2 pr-2 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
                className="flex h-7 w-7 items-center justify-center transition hover:opacity-70 disabled:opacity-30"
                style={{ color: "var(--th-text-muted)", borderRadius: 0 }}
                title={tr("파일 첨부", "Attach file")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onSend}
                disabled={!input.trim() && attachments.length === 0}
                className="flex h-7 w-7 items-center justify-center transition disabled:opacity-30"
                style={
                  input.trim() || attachments.length > 0
                    ? { borderRadius: 0, background: "var(--th-accent)", color: "#000" }
                    : { borderRadius: 0, background: "var(--th-bg-surface)", color: "var(--th-text-muted)", cursor: "not-allowed" }
                }
                title={tr("전송 (Enter)", "Send (Enter)")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </div>

          <p className="mt-1.5 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {tr("Enter 전송 · Shift+Enter 줄바꿈 · 📎 파일 드래그 가능", "Enter to send · Shift+Enter newline · drag to attach", "Enter送信 · Shift+Enter改行 · ファイルドラッグ可", "Enter发送 · Shift+Enter换行 · 可拖拽文件")}
          </p>
        </div>
      </div>
    </div>
  );
}
