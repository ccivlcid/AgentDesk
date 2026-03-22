import { KAKAO_MSG } from "../messenger-kakao-theme";
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
        fontFamily: KAKAO_MSG.fontSans,
        background: KAKAO_MSG.surfaceMuted,
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
          roomHistory={vm.roomHistory}
          loadRoom={vm.loadRoom}
          currentRoomId={vm.currentRoomId}
          agentById={vm.agentById}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: KAKAO_MSG.roomBgGradient,
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
            selectedIds={vm.selectedIds}
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
