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
  const isCeo = msg.sender_type === "ceo";

  type LineVariant = "directive" | "ceo-announce" | "ceo" | "agent" | "system";
  let variant: LineVariant = "system";
  if (isDirective) variant = "directive";
  else if (isCeo && isAnnouncement) variant = "ceo-announce";
  else if (isCeo) variant = "ceo";
  else if (isAgentReply) variant = "agent";

  const agentName = isAgentReply ? getAgentDisplayName(msg, agents, getAgentName) : "";

  const VARIANTS: Record<LineVariant, {
    rowBg: string; border: string;
    sigil: string; sigilColor: string;
    label: string; labelColor: string;
    contentColor: string;
  }> = {
    directive:    { rowBg: "rgba(244,63,94,0.04)",   border: "rgba(244,63,94,0.08)",   sigil: "$",  sigilColor: "#f85149", label: "DIRECTIVE", labelColor: "#f85149", contentColor: "#ffa198" },
    "ceo-announce":{ rowBg: "rgba(251,191,36,0.04)", border: "rgba(251,191,36,0.08)",  sigil: "❯",  sigilColor: "#f0883e", label: "CEO",       labelColor: "#f0883e", contentColor: "#e6c07b" },
    ceo:          { rowBg: "rgba(251,191,36,0.02)",  border: "rgba(48,54,61,0.6)",     sigil: "❯",  sigilColor: "#f0883e", label: "CEO",       labelColor: "#e6c07b", contentColor: "#cdd9e5" },
    agent:        { rowBg: "rgba(63,185,80,0.03)",   border: "rgba(48,54,61,0.6)",     sigil: "▸",  sigilColor: "#3fb950", label: agentName,   labelColor: "#56d364", contentColor: "#adbac7" },
    system:       { rowBg: "transparent",            border: "rgba(48,54,61,0.4)",     sigil: "//", sigilColor: "#4d555f", label: "SYSTEM",    labelColor: "#636e7b", contentColor: "#4d555f" },
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
        <span className="select-none shrink-0" style={{ color: "#3d4451" }}>{time}</span>
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
    <div
      className="fixed inset-0 z-50 flex h-full w-full flex-col shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-96 lg:border-l"
      style={{ background: "#0d1117", borderColor: "#21262d", fontFamily: "var(--th-font-mono)" }}
    >
      {/* ── macOS title bar ──────────────────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 items-center gap-3 px-4 py-3 select-none"
        style={{ background: "#161b22", borderBottom: "1px solid #21262d" }}
      >
        {/* dots */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="h-3 w-3 rounded-full transition-opacity hover:opacity-80"
            style={{ background: "#ff5f56" }}
            title={tr("닫기", "Close")}
          />
          <div className="h-3 w-3 rounded-full" style={{ background: "#ffbd2e" }} />
          <div className="h-3 w-3 rounded-full" style={{ background: "#27c93f" }} />
        </div>

        {/* title */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold tracking-widest" style={{ color: "#f0883e" }}>
            ❯{" "}
          </span>
          <span className="text-[11px] font-bold" style={{ color: "#cdd9e5" }}>
            broadcast
          </span>
          <span className="text-[11px]" style={{ color: "#6e7681" }}>
            {" --all-agents --count="}
          </span>
          <span className="text-[11px]" style={{ color: "#58a6ff" }}>{agentCount}</span>
        </div>

        {/* action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onSearchToggle}
            className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-[#21262d]"
            style={{ borderRadius: 0, color: searchOpen ? "#f0883e" : "#6e7681" }}
            title={tr("검색", "Search")}
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6.5" cy="6.5" r="4" />
              <path d="M10 10l3.5 3.5" strokeLinecap="round" />
            </svg>
          </button>
          {onClearMessages && messages.length > 0 && (
            <button
              onClick={onClearMessages}
              className="flex h-7 w-7 items-center justify-center transition-colors hover:bg-[#21262d]"
              style={{ borderRadius: 0, color: "#6e7681" }}
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

      {/* ── search bar ───────────────────────────────────────────────────── */}
      {searchOpen && (
        <div
          className="flex flex-shrink-0 items-center gap-2 px-4 py-2"
          style={{ background: "#161b22", borderBottom: "1px solid #21262d" }}
        >
          <span className="text-[11px] shrink-0" style={{ color: "#f0883e" }}>❯</span>
          <span className="text-[11px] shrink-0" style={{ color: "#6e7681" }}>grep </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tr("필터...", "filter...", "フィルター...", "过滤...")}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-[11px] outline-none"
            style={{ color: "#cdd9e5", caretColor: "#f0883e" }}
          />
          {searchQuery.trim() && (
            <span className="shrink-0 text-[10px]" style={{ color: "#58a6ff" }}>
              {searchResultCount} {tr("건", "hits")}
            </span>
          )}
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="shrink-0 text-[10px] hover:opacity-70" style={{ color: "#6e7681" }}>✕</button>
          )}
        </div>
      )}

      {/* ── session header line ──────────────────────────────────────────── */}
      <div
        className="flex flex-shrink-0 items-center gap-2 px-4 py-1.5"
        style={{ background: "#0d1117", borderBottom: "1px solid #161b22" }}
      >
        <span className="text-[10px]" style={{ color: "#3d4451" }}>{sessionLabel}</span>
        <span className="text-[10px]" style={{ color: "#3d4451" }}>──</span>
        <span className="text-[10px]" style={{ color: "#3d4451" }}>
          {tr("전사 공지 채널", "Company-wide broadcast channel", "全社告知チャンネル", "全员广播频道")}
        </span>
        <span className="flex-1" />
        <span className="text-[10px]" style={{ color: "#3d4451" }}>{displayMessages.length} lines</span>
      </div>

      {/* ── message log ─────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto py-1"
        style={{ background: "#0d1117" }}
      >
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div
              className="px-4 py-3 text-[11px]"
              style={{ border: "1px solid #21262d", background: "#161b22", color: "#6e7681" }}
            >
              <div className="mb-1" style={{ color: "#3d4451" }}>
                {searchQuery.trim() ? "$ grep" : "$ ls messages/"}
              </div>
              <div style={{ color: "#6e7681" }}>
                {searchQuery.trim()
                  ? tr("검색 결과 없음", "No matches found", "一致なし", "无匹配结果")
                  : tr("공지 내역이 없습니다", "No broadcasts yet", "告知履歴なし", "暂无广播")}
              </div>
              {!searchQuery.trim() && (
                <div className="mt-2" style={{ color: "#3d4451" }}>
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
                  borderBottom: "1px solid rgba(48,54,61,0.5)",
                  background: "rgba(63,185,80,0.03)",
                }}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="select-none shrink-0" style={{ color: "#3d4451" }}>
                    {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date())}
                  </span>
                  <span className="font-bold shrink-0" style={{ color: "#3fb950" }}>▸</span>
                  <span className="truncate font-bold shrink-0 max-w-[180px]" style={{ color: "#56d364" }} title={streamingMessage.agent_name}>
                    {streamingMessage.agent_name}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words text-left" style={{ color: "#adbac7", wordBreak: "break-word", overflowWrap: "anywhere" }}>
                  <MessageContent content={streamingMessage.content} />
                  <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse align-text-bottom" style={{ background: "#3fb950" }} />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── attachment chips ─────────────────────────────────────────────── */}
      {attachments.length > 0 && (
        <div
          className="flex flex-shrink-0 flex-wrap gap-1.5 px-4 pb-1 pt-2"
          style={{ background: "#0d1117", borderTop: "1px solid #161b22" }}
        >
          {attachments.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono"
              style={{ border: "1px solid #21262d", background: "#161b22", color: "#8b949e", borderRadius: 0 }}
            >
              <span>{getFileIcon(f.name)}</span>
              <span className="max-w-[100px] truncate">{f.name}</span>
              <span style={{ color: "#3d4451" }}>({formatSize(f.size)})</span>
              <button
                onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                className="ml-0.5 hover:opacity-70"
                style={{ color: "#6e7681" }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── composer ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 pb-4 pt-2"
        style={{ background: "#0d1117", borderTop: "1px solid #161b22" }}
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

        {/* prompt line */}
        <div
          className="flex items-end gap-0"
          style={{ border: "1px solid rgba(251,191,36,0.35)", background: "#161b22", borderRadius: 0 }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current += 1; }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current -= 1; }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
        >
          {/* prompt gutter */}
          <div className="flex shrink-0 flex-col items-center gap-1 px-3 pb-2.5 pt-3">
            <span className="text-sm font-bold leading-none" style={{ color: "#f0883e" }}>❯</span>
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
            style={{ color: "#cdd9e5", caretColor: "#f0883e", scrollbarWidth: "none" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />

          {/* attach + send */}
          <div className="flex shrink-0 flex-col items-center gap-1 pb-2 pr-2 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_FILES}
              className="flex h-7 w-7 items-center justify-center transition hover:opacity-70 disabled:opacity-30"
              style={{ color: "#6e7681", borderRadius: 0 }}
              title={tr("파일 첨부", "Attach file")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <button
              onClick={onSend}
              disabled={!input.trim() && attachments.length === 0}
              className="flex h-7 w-7 items-center justify-center transition disabled:opacity-30"
              style={
                input.trim() || attachments.length > 0
                  ? { borderRadius: 0, background: "rgba(251,191,36,0.8)", color: "#0d1117" }
                  : { borderRadius: 0, background: "#161b22", color: "#3d4451", cursor: "not-allowed" }
              }
              title={tr("전송 (Enter)", "Send (Enter)")}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-[10px] font-mono" style={{ color: "#3d4451" }}>
          {tr("Enter 전송 · Shift+Enter 줄바꿈 · 📎 파일 드래그 가능", "Enter to send · Shift+Enter newline · drag to attach", "Enter送信 · Shift+Enter改行 · ファイルドラッグ可", "Enter发送 · Shift+Enter换行 · 可拖拽文件")}
        </p>
      </div>
    </div>
  );
}
