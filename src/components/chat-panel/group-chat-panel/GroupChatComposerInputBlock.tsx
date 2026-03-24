import { IconCheck } from "../../ui/SvgIcons";
import KbMentionDropdown from "../KbMentionDropdown";
import { KAKAO_MSG } from "../messenger-kakao-theme";
import { MAX_FILES } from "./constants";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "mentionTarget"
  | "mentionQuery"
  | "handleKbSelect"
  | "closeMention"
  | "fileInputRef"
  | "textareaRef"
  | "input"
  | "handleInputChange"
  | "onTextareaKeyDown"
  | "onTextareaInput"
  | "sending"
  | "selectedIds"
  | "attachments"
  | "handleSend"
  | "sendError"
  | "uploading"
  | "sentOk"
>;

export function GroupChatComposerInputBlock({
  tr,
  mentionTarget,
  mentionQuery,
  handleKbSelect,
  closeMention,
  fileInputRef,
  textareaRef,
  input,
  handleInputChange,
  onTextareaKeyDown,
  onTextareaInput,
  sending,
  selectedIds,
  attachments,
  handleSend,
  sendError,
  uploading,
  sentOk,
}: Props) {
  return (
    <>
      <div style={{ position: "relative" }}>
        {mentionTarget && (
          <KbMentionDropdown
            mentionTarget={mentionTarget}
            query={mentionQuery}
            onSelect={handleKbSelect}
            onClose={closeMention}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 8,
          background: KAKAO_MSG.surfaceMuted,
          border: `1px solid ${KAKAO_MSG.borderLight}`,
          borderRadius: KAKAO_MSG.radiusInput,
          padding: "4px 6px 4px 14px",
          transition: "border-color 0.2s",
        }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= MAX_FILES || selectedIds.size === 0}
          title={tr("파일 첨부", "Attach file")}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: KAKAO_MSG.surface,
            border: `1px solid ${KAKAO_MSG.borderLight}`,
            color: KAKAO_MSG.meta,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            fontSize: 13,
            opacity: attachments.length >= MAX_FILES || selectedIds.size === 0 ? 0.3 : 1,
            alignSelf: "flex-end",
            marginBottom: 2,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={onTextareaKeyDown}
          rows={1}
          disabled={sending || selectedIds.size === 0}
          placeholder={
            selectedIds.size === 0
              ? tr("에이전트를 선택하세요", "Select agents first")
              : tr(
                  `${selectedIds.size}명에게 메시지… (Enter) · 업무 플로우는 맨 앞에 !`,
                  `Message ${selectedIds.size}… (Enter) · Prefix ! to force work/task flow`,
                )
          }
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 13,
            fontFamily: KAKAO_MSG.fontSans,
            color: KAKAO_MSG.bubbleMineText,
            caretColor: "#191919",
            lineHeight: 1.5,
            padding: "6px 0",
            maxHeight: 96,
            overflowY: "auto",
          }}
          onInput={onTextareaInput}
        />

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={
            (!input.trim() && attachments.length === 0) ||
            sending ||
            selectedIds.size === 0
          }
          title={tr("전송 (Enter)", "Send (Enter)")}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              (input.trim() || attachments.length > 0) && selectedIds.size > 0
                ? KAKAO_MSG.sendActive
                : KAKAO_MSG.sendDisabled,
            border: "none",
            color:
              (input.trim() || attachments.length > 0) && selectedIds.size > 0
                ? KAKAO_MSG.sendActiveIcon
                : KAKAO_MSG.meta,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 0.15s",
            opacity:
              (!input.trim() && attachments.length === 0) ||
              sending ||
              selectedIds.size === 0
                ? 0.4
                : 1,
            alignSelf: "flex-end",
            marginBottom: 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 10,
          color: KAKAO_MSG.meta,
        }}
      >
        <span>
          {sendError && (
            <span style={{ color: "var(--th-danger, #ef4444)" }}>{sendError}</span>
          )}
          {uploading && (
            <span style={{ color: "#C9A000" }}>
              {tr("파일 업로드 중...", "Uploading...")}
            </span>
          )}
          {sentOk && (
            <span className="inline-flex items-center gap-1" style={{ color: "var(--th-success, #22c55e)" }}>
              <IconCheck size={12} className="flex-shrink-0" />
              {tr(`${selectedIds.size}명 전송 완료`, `Sent to ${selectedIds.size}`)}
            </span>
          )}
        </span>
        <span>
          Enter {tr("전송", "send")} · Shift+Enter {tr("줄바꿈", "newline")}
        </span>
      </div>
    </>
  );
}
