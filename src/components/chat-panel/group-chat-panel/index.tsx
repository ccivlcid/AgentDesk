import { GroupChatAgentSidebar } from "./GroupChatAgentSidebar";
import { GroupChatComposer } from "./GroupChatComposer";
import { GroupChatMessageList } from "./GroupChatMessageList";
import { GroupChatToBar } from "./GroupChatToBar";
import type { GroupChatPanelProps } from "./types";
import { useGroupChatPanel } from "./useGroupChatPanel";

export default function GroupChatPanel(props: GroupChatPanelProps) {
  const vm = useGroupChatPanel(props);

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "var(--th-font-mono)",
        background: "var(--th-bg-surface)",
      }}
    >
      <GroupChatToBar
        tr={vm.tr}
        getAgentName={vm.getAgentName}
        toggleAgent={vm.toggleAgent}
        search={vm.search}
        setSearch={vm.setSearch}
        selectedIds={vm.selectedIds}
        clearAllRecipients={vm.clearAllRecipients}
        selectedAgents={vm.selectedAgents}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <GroupChatAgentSidebar
          tr={vm.tr}
          agents={vm.agents}
          filteredAgents={vm.filteredAgents}
          selectedIds={vm.selectedIds}
          loadingIds={vm.loadingIds}
          toggleAgent={vm.toggleAgent}
          getAgentName={vm.getAgentName}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--th-bg-surface)",
          }}
        >
          <GroupChatMessageList
            tr={vm.tr}
            t={vm.t}
            isKo={vm.isKo}
            locale={vm.locale}
            selectedIds={vm.selectedIds}
            mergedMessages={vm.mergedMessages}
            agentById={vm.agentById}
            getAgentName={vm.getAgentName}
            bottomRef={vm.bottomRef}
          />

          <GroupChatComposer
            tr={vm.tr}
            t={vm.t}
            isKo={vm.isKo}
            selectedIds={vm.selectedIds}
            chatMode={vm.chatMode}
            setChatMode={vm.setChatMode}
            deadline={vm.deadline}
            setDeadline={vm.setDeadline}
            priority={vm.priority}
            setPriority={vm.setPriority}
            fileInputRef={vm.fileInputRef}
            textareaRef={vm.textareaRef}
            input={vm.input}
            handleInputChange={vm.handleInputChange}
            sending={vm.sending}
            sendError={vm.sendError}
            sentOk={vm.sentOk}
            uploading={vm.uploading}
            attachments={vm.attachments}
            removeAttachment={vm.removeAttachment}
            kbSources={vm.kbSources}
            removeKbSource={vm.removeKbSource}
            mentionTarget={vm.mentionTarget}
            mentionQuery={vm.mentionQuery}
            handleKbSelect={vm.handleKbSelect}
            closeMention={vm.closeMention}
            handleSend={vm.handleSend}
            onFileInputChange={vm.onFileInputChange}
            onTextareaKeyDown={vm.onTextareaKeyDown}
            onTextareaInput={vm.onTextareaInput}
          />
        </div>
      </div>
    </div>
  );
}
