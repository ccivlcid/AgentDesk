import { useEffect, useRef, type DragEvent } from "react";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { MAX_FILE_SIZE, MAX_FILES } from "./constants";
import { AnnouncementCliPanelComposer } from "./AnnouncementCliPanelComposer";
import { AnnouncementCliPanelHeader } from "./AnnouncementCliPanelHeader";
import { AnnouncementCliPanelMessageList } from "./AnnouncementCliPanelMessageList";
import type { AnnouncementCliPanelProps } from "./types";

export type { AnnouncementCliPanelProps } from "./types";

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
        background: KAKAO_MSG.surface,
        borderLeft: embedded ? "none" : `1px solid ${KAKAO_MSG.borderLight}`,
        fontFamily: KAKAO_MSG.fontSans,
        boxShadow: embedded ? "none" : "-8px 0 40px rgba(0,0,0,0.25)",
      }}
    >
      <AnnouncementCliPanelHeader
        embedded={embedded}
        onClose={onClose}
        tr={tr}
        agentCount={agentCount}
        displayMessageCount={displayMessages.length}
        messages={messages}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchResultCount={searchResultCount}
        onSearchToggle={onSearchToggle}
        onClearMessages={onClearMessages}
        onSearchChange={onSearchChange}
      />

      <AnnouncementCliPanelMessageList
        scrollRef={scrollRef}
        messagesEndRef={messagesEndRef}
        displayMessages={displayMessages}
        agents={agents}
        locale={locale}
        getAgentName={getAgentName}
        searchQuery={searchQuery}
        streamingMessage={streamingMessage}
        tr={tr}
      />

      <AnnouncementCliPanelComposer
        attachments={attachments}
        input={input}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        onAttachmentsChange={onAttachmentsChange}
        onInputChange={onInputChange}
        onKeyDown={onKeyDown}
        onSend={onSend}
        tr={tr}
        addFiles={addFiles}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounterRef.current += 1;
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounterRef.current -= 1;
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
      />
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
