import { GroupChatComposerAttachmentsBlock } from "./GroupChatComposerAttachmentsBlock";
import { GroupChatComposerInputBlock } from "./GroupChatComposerInputBlock";
import { GroupChatComposerModes } from "./GroupChatComposerModes";
import type { GroupChatPanelVm } from "./types";

type Props = Pick<
  GroupChatPanelVm,
  | "tr"
  | "t"
  | "isKo"
  | "selectedIds"
  | "chatMode"
  | "setChatMode"
  | "deadline"
  | "setDeadline"
  | "priority"
  | "setPriority"
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
    t,
    isKo,
    selectedIds,
    chatMode,
    setChatMode,
    deadline,
    setDeadline,
    priority,
    setPriority,
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
        borderTop: `1px solid ${chatMode === "urgent" ? "var(--th-danger)" : "var(--th-border)"}`,
        background: "var(--th-bg-elevated)",
        padding: "10px 14px",
        transition: "border-color 0.2s",
      }}
    >
      <GroupChatComposerModes
        t={t}
        isKo={isKo}
        chatMode={chatMode}
        setChatMode={setChatMode}
        deadline={deadline}
        setDeadline={setDeadline}
        priority={priority}
        setPriority={setPriority}
      />

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
        chatMode={chatMode}
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
