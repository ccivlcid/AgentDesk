import { useRef, useEffect, type KeyboardEvent, type RefObject, type DragEvent } from "react";
import type { Agent, Message } from "../../types";
import MessageContent from "../MessageContent";
import TrafficLights from "../desktop/TrafficLights";

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

function CliLine({ msg, agents, locale, getAgentName }: CliLineProps) {
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

  type VariantStyle = {
    accentBar: string;
    bg: string;
    badge: string;
    badgeBg: string;
    badgeColor: string;
    label: string;
    contentColor: string;
  };

  const VARIANTS: Record<LineVariant, VariantStyle> = {
    directive: {
      accentBar: "var(--th-danger, #ef4444)",
      bg: "var(--th-red-glow)",
      badge: "DIRECTIVE",
      badgeBg: "var(--th-red-glow)",
      badgeColor: "var(--th-danger-text)",
      label: "DIRECTIVE",
      contentColor: "var(--th-text-primary)",
    },
    "client-announce": {
      accentBar: "var(--th-accent)",
      bg: "var(--th-accent-glow)",
      badge: "ANNOUNCE",
      badgeBg: "var(--th-amber-glow)",
      badgeColor: "var(--th-accent)",
      label: "공지",
      contentColor: "var(--th-text-primary)",
    },
    client: {
      accentBar: "var(--th-accent)",
      bg: "transparent",
      badge: "Client",
      badgeBg: "var(--th-accent-glow)",
      badgeColor: "var(--th-accent)",
      label: "Client",
      contentColor: "var(--th-text-primary)",
    },
    agent: {
      accentBar: "var(--th-success, #22c55e)",
      bg: "var(--th-green-glow)",
      badge: "▸",
      badgeBg: "var(--th-green-glow)",
      badgeColor: "var(--th-success, #4ade80)",
      label: agentName,
      contentColor: "var(--th-text-primary)",
    },
    system: {
      accentBar: "var(--th-border)",
      bg: "transparent",
      badge: "//",
      badgeBg: "transparent",
      badgeColor: "var(--th-text-muted)",
      label: "SYSTEM",
      contentColor: "var(--th-text-secondary)",
    },
  };

  const v = VARIANTS[variant];

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        background: v.bg,
        borderBottom: "1px solid var(--th-border)",
      }}
    >
      {/* 왼쪽 색상 바 */}
      <div style={{ width: 3, flexShrink: 0, background: v.accentBar, opacity: 0.8 }} />

      <div style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--th-font-mono)", fontSize: 12 }}>
        {/* 메타 행: 배지 + 발신자 + 시간 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 4,
              background: v.badgeBg,
              color: v.badgeColor,
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {variant === "agent" ? agentName || v.badge : v.badge === "ANNOUNCE" ? "공지" : v.label}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>{time}</span>
        </div>

        {/* 본문 */}
        <div
          style={{
            color: v.contentColor,
            lineHeight: 1.6,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
        >
          <MessageContent content={msg.content} />
        </div>
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
  /** AppWindow 탭 등 컨테이너 안에 임베드될 때 true — fixed overlay 제거 */
  embedded?: boolean;
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
  embedded = false,
}: AnnouncementCliPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 80;
    const hasNew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (isNearBottom || hasNew) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

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

  const displayMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  const agentCount = agents.length;

  const panelContent = (
    <div
      className={embedded ? "flex h-full w-full flex-col" : "relative flex h-full w-full flex-col sm:w-[600px]"}
      style={{
        background: "var(--th-bg-primary)",
        borderLeft: embedded ? "none" : "1px solid var(--th-border)",
        fontFamily: "var(--th-font-mono)",
        boxShadow: embedded ? "none" : "-8px 0 40px rgba(0,0,0,0.4)",
      }}
    >
        {/* ── 헤더 ── */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
          }}
        >
          {/* 타이틀 행 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px 10px",
              borderLeft: "3px solid var(--th-accent)",
            }}
          >
            {/* Traffic Lights — 독립 오버레이 모드에서만 표시 */}
            {!embedded && <TrafficLights onClose={onClose} />}

            {/* 아이콘 + 제목 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width={18} height={18} style={{ color: "var(--th-accent)", flexShrink: 0 }}>
                <path d="M3 7v6h3l5 4V3L6 7H3z" />
                <path d="M15.5 7.5a4 4 0 010 5" />
                <path d="M17.5 5.5a7 7 0 010 9" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--th-text-heading)",
                    letterSpacing: "0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {tr("전사 공지 채널", "Broadcast Channel", "全社告知チャンネル", "全员广播频道")}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--th-text-muted)",
                    marginTop: 2,
                    letterSpacing: "0.04em",
                  }}
                >
                  {agentCount} {tr("에이전트 수신 중", "agents receiving", "エージェント受信中", "个代理接收中")}
                  {" · "}
                  {displayMessages.length} {tr("건", "messages", "件", "条")}
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {/* 검색 */}
              <button
                type="button"
                onClick={onSearchToggle}
                title={tr("검색", "Search")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  border: "1px solid",
                  borderColor: searchOpen ? "var(--th-accent)" : "var(--th-border)",
                  borderRadius: 6,
                  background: searchOpen ? "var(--th-accent-glow)" : "transparent",
                  color: searchOpen ? "var(--th-accent)" : "var(--th-text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                  <circle cx="6.5" cy="6.5" r="4" />
                  <path d="M10 10l3.5 3.5" strokeLinecap="round" />
                </svg>
              </button>

              {/* 내역 삭제 */}
              {onClearMessages && messages.length > 0 && (
                <button
                  type="button"
                  onClick={onClearMessages}
                  title={tr("내역 삭제", "Clear history")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    border: "1px solid var(--th-border)",
                    borderRadius: 6,
                    background: "transparent",
                    color: "var(--th-text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-danger, #ef4444)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-danger, #ef4444)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  </svg>
                </button>
              )}

            </div>
          </div>

          {/* 검색창 */}
          {searchOpen && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderTop: "1px solid var(--th-border)",
                background: "var(--th-bg-elevated)",
              }}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11, color: "var(--th-accent)", flexShrink: 0 }}>
                <circle cx="6.5" cy="6.5" r="4" />
                <path d="M10 10l3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={tr("메시지 검색...", "Search messages...", "メッセージ検索...", "搜索消息...")}
                autoFocus
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                  color: "var(--th-text-primary)",
                  caretColor: "var(--th-accent)",
                  fontFamily: "var(--th-font-mono)",
                }}
              />
              {searchQuery.trim() && (
                <span style={{ fontSize: 10, color: "var(--th-accent)", flexShrink: 0 }}>
                  {searchResultCount} {tr("건", "hits")}
                </span>
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--th-text-muted)" }}
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 메시지 로그 ── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            background: "var(--th-bg-primary)",
          }}
        >
          {displayMessages.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 16,
                padding: "40px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--th-accent-glow)",
                  border: "1px solid var(--th-accent-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width={28} height={28} style={{ color: "var(--th-accent)" }}>
                  <path d="M3 8v8h4l6 5V3L7 8H3z" />
                  <path d="M18 8.5a5 5 0 010 7" />
                  <path d="M20.5 6a9 9 0 010 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--th-text-secondary)", marginBottom: 6 }}>
                  {searchQuery.trim()
                    ? tr("검색 결과 없음", "No matches found", "一致なし", "无匹配结果")
                    : tr("공지 내역이 없습니다", "No broadcasts yet", "告知履歴なし", "暂无广播")}
                </div>
                {!searchQuery.trim() && (
                  <div style={{ fontSize: 11, color: "var(--th-text-muted)", lineHeight: 1.6 }}>
                    {tr(
                      "아래 입력창에서 전사 공지를 작성하세요.\n전체 에이전트에게 즉시 전달됩니다.",
                      "Write a broadcast below.\nAll agents will receive it immediately.",
                      "下の入力欄から告知を作成してください。\n全エージェントに即時届きます。",
                      "在下方输入框中撰写广播。\n所有代理将立即收到。",
                    )}
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

              {/* 스트리밍 에이전트 응답 */}
              {streamingMessage?.content && (
                <div
                  style={{
                    display: "flex",
                    borderBottom: "1px solid var(--th-border)",
                    background: "var(--th-green-glow)",
                  }}
                >
                  <div style={{ width: 3, flexShrink: 0, background: "var(--th-success, #22c55e)", opacity: 0.8 }} />
                  <div style={{ flex: 1, padding: "10px 14px", fontFamily: "var(--th-font-mono)", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--th-green-glow)",
                          color: "var(--th-success, #4ade80)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {streamingMessage.agent_name}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "var(--th-green-glow)",
                          color: "var(--th-success, #4ade80)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        ●&nbsp;{tr("응답 중", "responding", "応答中", "回复中")}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "var(--th-text-primary)",
                        lineHeight: 1.6,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <MessageContent content={streamingMessage.content} />
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 12,
                          background: "var(--th-accent)",
                          verticalAlign: "text-bottom",
                          marginLeft: 2,
                          animation: "pulse 1s infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── 첨부 파일 칩 ── */}
        {attachments.length > 0 && (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "8px 16px",
              borderTop: "1px solid var(--th-border)",
              background: "var(--th-bg-surface)",
            }}
          >
            {attachments.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  fontSize: 10,
                  fontFamily: "var(--th-font-mono)",
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-elevated)",
                  color: "var(--th-text-secondary)",
                  borderRadius: 6,
                }}
              >
                <span>{getFileIcon(f.name)}</span>
                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <span style={{ color: "var(--th-text-muted)" }}>({formatSize(f.size)})</span>
                <button
                  type="button"
                  onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--th-text-muted)", padding: 0, marginLeft: 2 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 입력창 ── */}
        <div
          style={{
            flexShrink: 0,
            padding: "12px 16px 16px",
            borderTop: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files) { addFiles(e.target.files); e.target.value = ""; }
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              background: "var(--th-bg-elevated)",
              padding: "8px 10px 8px 14px",
              transition: "border-color 0.15s",
            }}
            onFocus={() => {}}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current += 1; }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); dragCounterRef.current -= 1; }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => onKeyDown(e)}
              placeholder={tr(
                "전사 공지 내용을 입력하세요...",
                "Type broadcast message...",
                "全体告知内容を入力してください...",
                "请输入广播内容...",
              )}
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                minHeight: 36,
                maxHeight: 120,
                overflowY: "auto",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--th-text-primary)",
                caretColor: "var(--th-accent)",
                fontFamily: "var(--th-font-mono)",
                paddingTop: 4,
                scrollbarWidth: "none",
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />

            {/* 파일 첨부 버튼 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={attachments.length >= MAX_FILES}
              title={tr("파일 첨부", "Attach file")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                border: "1px solid var(--th-border)",
                borderRadius: 6,
                background: "transparent",
                color: "var(--th-text-muted)",
                cursor: "pointer",
                flexShrink: 0,
                opacity: attachments.length >= MAX_FILES ? 0.3 : 1,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (attachments.length < MAX_FILES) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-accent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)"; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>

            {/* 전송 버튼 */}
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() && attachments.length === 0}
              title={tr("전송 (Enter)", "Send (Enter)")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "none",
                background: input.trim() || attachments.length > 0 ? "var(--th-accent)" : "var(--th-bg-surface)",
                color: input.trim() || attachments.length > 0 ? "var(--th-accent-text)" : "var(--th-text-muted)",
                cursor: input.trim() || attachments.length > 0 ? "pointer" : "not-allowed",
                flexShrink: 0,
                transition: "all 0.15s",
                opacity: !input.trim() && attachments.length === 0 ? 0.4 : 1,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}>
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>

          <p style={{ marginTop: 8, fontSize: 10, color: "var(--th-text-muted)", fontFamily: "var(--th-font-mono)" }}>
            {tr("Enter 전송 · Shift+Enter 줄바꿈 · 파일 드래그 가능", "Enter to send · Shift+Enter newline · drag to attach", "Enter送信 · Shift+Enter改行 · ファイルドラッグ可", "Enter发送 · Shift+Enter换行 · 可拖拽文件")}
          </p>
        </div>
    </div>
  );

  if (embedded) return panelContent;

  return (
    <div className="fixed inset-0 flex items-stretch justify-end" style={{ zIndex: 1100 }}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        aria-label={tr("닫기", "Close")}
      />
      {panelContent}
    </div>
  );
}
