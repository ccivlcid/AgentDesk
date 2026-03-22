import type { DragEvent, KeyboardEvent, RefObject } from "react";
import { FileTypeIcon, IconX } from "../../ui/SvgIcons";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { ACCEPTED_TYPES, MAX_FILES } from "./constants";
import { formatSize } from "./helpers";
import type { Tr } from "./types";

export interface AnnouncementCliPanelComposerProps {
  attachments: File[];
  input: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onAttachmentsChange: (files: File[]) => void;
  onInputChange: (val: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  tr: Tr;
  addFiles: (incoming: FileList | File[]) => void;
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export function AnnouncementCliPanelComposer({
  attachments,
  input,
  fileInputRef,
  textareaRef,
  onAttachmentsChange,
  onInputChange,
  onKeyDown,
  onSend,
  tr,
  addFiles,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: AnnouncementCliPanelComposerProps) {
  return (
    <>
      {attachments.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 16px",
            borderTop: `1px solid ${KAKAO_MSG.borderLight}`,
            background: KAKAO_MSG.surfaceMuted,
            fontFamily: KAKAO_MSG.fontSans,
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
                fontFamily: KAKAO_MSG.fontSans,
                border: `1px solid ${KAKAO_MSG.borderLight}`,
                background: KAKAO_MSG.surface,
                color: KAKAO_MSG.bubbleMineText,
                borderRadius: 6,
              }}
            >
              <FileTypeIcon fileName={f.name} size={12} style={{ color: KAKAO_MSG.meta, flexShrink: 0 }} />
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ color: KAKAO_MSG.meta }}>({formatSize(f.size)})</span>
              <button
                type="button"
                onClick={() => onAttachmentsChange(attachments.filter((_, j) => j !== i))}
                style={{ background: "none", border: "none", cursor: "pointer", color: KAKAO_MSG.meta, padding: 0, marginLeft: 2, display: "flex" }}
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px 16px",
          borderTop: `1px solid ${KAKAO_MSG.borderLight}`,
          background: KAKAO_MSG.surface,
          fontFamily: KAKAO_MSG.fontSans,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) {
              addFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            border: `1px solid ${KAKAO_MSG.borderLight}`,
            borderRadius: KAKAO_MSG.radiusInput,
            background: KAKAO_MSG.surfaceMuted,
            padding: "8px 10px 8px 14px",
            transition: "border-color 0.15s",
          }}
          onFocus={() => {}}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
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
              fontSize: 13,
              lineHeight: 1.6,
              color: KAKAO_MSG.bubbleMineText,
              caretColor: "#191919",
              fontFamily: KAKAO_MSG.fontSans,
              paddingTop: 4,
              scrollbarWidth: "none",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />

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
              border: `1px solid ${KAKAO_MSG.borderLight}`,
              borderRadius: "50%",
              background: KAKAO_MSG.surface,
              color: KAKAO_MSG.meta,
              cursor: "pointer",
              flexShrink: 0,
              opacity: attachments.length >= MAX_FILES ? 0.3 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (attachments.length < MAX_FILES) (e.currentTarget as HTMLButtonElement).style.borderColor = "#E6D000";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = KAKAO_MSG.borderLight;
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

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
              borderRadius: "50%",
              border: "none",
              background:
                input.trim() || attachments.length > 0 ? KAKAO_MSG.sendActive : KAKAO_MSG.sendDisabled,
              color:
                input.trim() || attachments.length > 0 ? KAKAO_MSG.sendActiveIcon : KAKAO_MSG.meta,
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

        <p style={{ marginTop: 8, fontSize: 10, color: KAKAO_MSG.meta, fontFamily: KAKAO_MSG.fontSans }}>
          {tr(
            "Enter 전송 · Shift+Enter 줄바꿈 · 파일 드래그 가능",
            "Enter to send · Shift+Enter newline · drag to attach",
            "Enter送信 · Shift+Enter改行 · ファイルドラッグ可",
            "Enter发送 · Shift+Enter换行 · 可拖拽文件",
          )}
        </p>
      </div>
    </>
  );
}
