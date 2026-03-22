import { KAKAO_MSG } from "../messenger-kakao-theme";
import { GroupChatComposerAttachmentsBlock } from "./GroupChatComposerAttachmentsBlock";
import { GroupChatComposerInputBlock } from "./GroupChatComposerInputBlock";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "selectedIds"
  | "fileInputRef"
  | "textareaRef"
  | "input"
  | "handleInputChange"
  | "sending"
  | "sendError"
  | "sentOk"
  | "uploading"
  | "attachments"
  | "removeAttachment"
  | "kbSources"
  | "removeKbSource"
  | "mentionTarget"
  | "mentionQuery"
  | "handleKbSelect"
  | "closeMention"
  | "handleSend"
  | "onFileInputChange"
  | "onTextareaKeyDown"
  | "onTextareaInput"
>;

export function GroupChatComposer(props: Props) {
  const {
    tr,
    selectedIds,
    fileInputRef,
    textareaRef,
    input,
    handleInputChange,
    sending,
    sendError,
    sentOk,
    uploading,
    attachments,
    removeAttachment,
    kbSources,
    removeKbSource,
    mentionTarget,
    mentionQuery,
    handleKbSelect,
    closeMention,
    handleSend,
    onFileInputChange,
    onTextareaKeyDown,
    onTextareaInput,
  } = props;

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: `1px solid ${KAKAO_MSG.borderLight}`,
        background: KAKAO_MSG.surface,
        padding: "10px 14px",
        transition: "border-color 0.2s",
        fontFamily: KAKAO_MSG.fontSans,
      }}
    >
      <GroupChatComposerAttachmentsBlock
        fileInputRef={fileInputRef}
        onFileInputChange={onFileInputChange}
        kbSources={kbSources}
        removeKbSource={removeKbSource}
        attachments={attachments}
        removeAttachment={removeAttachment}
      />

      <GroupChatComposerInputBlock
        tr={tr}
        mentionTarget={mentionTarget}
        mentionQuery={mentionQuery}
        handleKbSelect={handleKbSelect}
        closeMention={closeMention}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        input={input}
        handleInputChange={handleInputChange}
        onTextareaKeyDown={onTextareaKeyDown}
        onTextareaInput={onTextareaInput}
        sending={sending}
        selectedIds={selectedIds}
        attachments={attachments}
        handleSend={handleSend}
        sendError={sendError}
        uploading={uploading}
        sentOk={sentOk}
      />
    </div>
  );
}
