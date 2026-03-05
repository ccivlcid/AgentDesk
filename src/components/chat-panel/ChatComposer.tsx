import { useRef, type KeyboardEvent, type RefObject, type DragEvent } from "react";
import type { Agent } from "../../types";
import ChatModeHint from "./ChatModeHint";

type ChatMode = "chat" | "task" | "announcement" | "report";
type Tr = (ko: string, en: string, ja?: string, zh?: string) => string;

const ACCEPTED_TYPES = ".pdf,.pptx,.docx,.xlsx,.png,.jpg,.gif,.md,.txt,.csv,.json,.zip,.mp4";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
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

interface ChatComposerProps {
  mode: ChatMode;
  input: string;
  selectedAgent: Agent | null;
  isDirectiveMode: boolean;
  isAnnouncementMode: boolean;
  tr: Tr;
  getAgentName: (agent: Agent | null | undefined) => string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
  onModeChange: (mode: ChatMode) => void;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function ChatComposer({
  mode,
  input,
  selectedAgent,
  isDirectiveMode,
  isAnnouncementMode,
  tr,
  getAgentName,
  textareaRef,
  attachments,
  onAttachmentsChange,
  onModeChange,
  onInputChange,
  onSend,
  onKeyDown,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const addFiles = (incoming: FileList | File[]) => {
    const newFiles: File[] = [];
    const arr = Array.from(incoming);
    for (const file of arr) {
      if (file.size > MAX_FILE_SIZE) continue;
      if (attachments.length + newFiles.length >= MAX_FILES) break;
      // Avoid duplicates by name+size
      const isDup = attachments.some((f) => f.name === file.name && f.size === file.size);
      if (!isDup) newFiles.push(file);
    }
    if (newFiles.length > 0) {
      onAttachmentsChange([...attachments, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <>
      <div className="flex flex-shrink-0 gap-2 border-t border-gray-700/50 px-4 pb-1 pt-3">
        <button
          onClick={() => onModeChange(mode === "task" ? "chat" : "task")}
          disabled={!selectedAgent}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
            mode === "task"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          <span>📋</span>
          <span>{tr("업무 지시", "Task", "タスク指示", "任务指示")}</span>
        </button>

        <button
          onClick={() => onModeChange(mode === "announcement" ? "chat" : "announcement")}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
            mode === "announcement" ? "bg-yellow-500 text-gray-900" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          <span>📢</span>
          <span>{tr("전사 공지", "Announcement", "全体告知", "全员公告")}</span>
        </button>

        <button
          onClick={() => onModeChange(mode === "report" ? "chat" : "report")}
          disabled={!selectedAgent}
          className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
            mode === "report"
              ? "bg-emerald-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          <span>📊</span>
          <span>{tr("보고 요청", "Report", "レポート依頼", "报告请求")}</span>
        </button>
      </div>

      <ChatModeHint mode={mode} isDirectiveMode={isDirectiveMode} tr={tr} />

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-shrink-0 flex-wrap gap-1.5 px-4 pb-1">
          {attachments.map((file, idx) => (
            <div
              key={`${file.name}-${file.size}-${idx}`}
              className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-700/80 px-2 py-1 text-xs text-gray-300"
            >
              <span>{getFileIcon(file.name)}</span>
              <span className="max-w-[120px] truncate">{file.name}</span>
              <span className="text-gray-500">({formatFileSize(file.size)})</span>
              <button
                onClick={() => removeFile(idx)}
                className="ml-0.5 text-gray-400 hover:text-red-400 transition-colors"
                aria-label={tr("제거", "Remove", "削除", "移除")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex items-end gap-2 rounded-2xl border bg-gray-800 transition-colors ${
            isDirectiveMode
              ? "border-red-500/50 focus-within:border-red-400"
              : isAnnouncementMode
                ? "border-yellow-500/50 focus-within:border-yellow-400"
                : mode === "task"
                  ? "border-blue-500/50 focus-within:border-blue-400"
                  : mode === "report"
                    ? "border-emerald-500/50 focus-within:border-emerald-400"
                    : "border-gray-600 focus-within:border-blue-500"
          }`}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= MAX_FILES}
            className="mb-2 ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={tr("파일 첨부", "Attach files", "ファイル添付", "附加文件")}
            title={tr(
              `파일 첨부 (최대 ${MAX_FILES}개, 각 10MB)`,
              `Attach files (max ${MAX_FILES}, 10MB each)`,
              `ファイル添付 (最大${MAX_FILES}件、各10MB)`,
              `附加文件 (最多${MAX_FILES}个，每个10MB)`,
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              isAnnouncementMode
                ? tr(
                    "전사 공지 내용을 입력하세요...",
                    "Write an announcement...",
                    "全体告知内容を入力してください...",
                    "请输入公告内容...",
                  )
                : mode === "task"
                  ? tr(
                      "업무 지시 내용을 입력하세요...",
                      "Write a task instruction...",
                      "タスク指示内容を入力してください...",
                      "请输入任务指示内容...",
                    )
                  : mode === "report"
                    ? tr(
                        "보고 요청 내용을 입력하세요...",
                        "Write a report request...",
                        "レポート依頼内容を入力してください...",
                        "请输入报告请求内容...",
                      )
                    : selectedAgent
                      ? tr(
                          `${getAgentName(selectedAgent)}에게 메시지 보내기...`,
                          `Send a message to ${getAgentName(selectedAgent)}...`,
                          `${getAgentName(selectedAgent)}にメッセージを送る...`,
                          `向 ${getAgentName(selectedAgent)} 发送消息...`,
                        )
                      : tr(
                          "메시지를 입력하세요...",
                          "Type a message...",
                          "メッセージを入力してください...",
                          "请输入消息...",
                        )
            }
            rows={1}
            className="min-h-[44px] max-h-32 flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 text-sm leading-relaxed text-gray-100 placeholder-gray-500 focus:outline-none"
            style={{ scrollbarWidth: "none" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() && attachments.length === 0}
            className={`mb-2 mr-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
              input.trim() || attachments.length > 0
                ? isDirectiveMode
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : isAnnouncementMode
                    ? "bg-yellow-500 text-gray-900 hover:bg-yellow-400"
                    : mode === "task"
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : mode === "report"
                        ? "bg-emerald-600 text-white hover:bg-emerald-500"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                : "cursor-not-allowed bg-gray-700 text-gray-600"
            }`}
            aria-label={tr("전송", "Send", "送信", "发送")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-gray-600">
          {tr(
            "Enter로 전송, Shift+Enter로 줄바꿈",
            "Press Enter to send, Shift+Enter for a new line",
            "Enterで送信、Shift+Enterで改行",
            "按 Enter 发送，Shift+Enter 换行",
          )}
        </p>
      </div>
    </>
  );
}
