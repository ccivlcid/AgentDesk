import type { TaskReportDetail } from "../api";
import { ChatPanel } from "../components/ChatPanel";
import GroupChatPanel from "../components/chat-panel/GroupChatPanel";
import DecisionInboxModal from "../components/DecisionInboxModal";
import TerminalPanel from "../components/TerminalPanel";
import TaskReportPopup from "../components/TaskReportPopup";
import AgentStatusPanel from "../components/AgentStatusPanel";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import type { Agent, Message, Task } from "../types";
import type { UiLanguage } from "../i18n";
import type { ProjectMetaPayload, TaskPanelTab } from "./types";
import { useAgentStore } from "../store/agentStore";

interface AppOverlaysProps {
  showChat: boolean;
  chatAgent: Agent | null;
  messages: Message[];
  agents: Agent[];
  groupChatAgents: Agent[];
  streamingMessage: {
    message_id: string;
    agent_id: string;
    agent_name: string;
    agent_avatar: string;
    content: string;
  } | null;
  onSendMessage: (
    content: string,
    receiverType: "agent" | "department" | "all",
    receiverId?: string,
    messageType?: string,
    projectMeta?: ProjectMetaPayload,
  ) => Promise<void>;
  onSendAnnouncement: (content: string) => Promise<void>;
  onSendDirective: (content: string, projectMeta?: ProjectMetaPayload) => Promise<void>;
  onClearMessages: (agentId?: string) => Promise<void>;
  onCloseChat: () => void;
  showDecisionInbox: boolean;
  decisionInboxLoading: boolean;
  decisionInboxItems: DecisionInboxItem[];
  decisionReplyBusyKey: string | null;
  uiLanguage: UiLanguage;
  onCloseDecisionInbox: () => void;
  onRefreshDecisionInbox: () => void;
  onReplyDecisionOption: (
    item: DecisionInboxItem,
    optionNumber: number,
    payloadInput?: { note?: string; selected_option_numbers?: number[] },
  ) => Promise<void>;
  onOpenDecisionChat: (agentId: string) => void;
  taskPanel: { taskId: string; tab: TaskPanelTab } | null;
  tasks: Task[];
  onCloseTaskPanel: () => void;
  taskReport: TaskReportDetail | null;
  onCloseTaskReport: () => void;
  showReportHistory: boolean;
  onCloseReportHistory: () => void;
  showAgentStatus: boolean;
  onCloseAgentStatus: () => void;
  showGroupChat: boolean;
  groupChatInitialAgentIds?: string[];
  onCloseGroupChat: () => void;
  onOpenGroupChatWithAgents?: (agentIds: string[]) => void;
}

export default function AppOverlays({
  showChat,
  chatAgent,
  messages,
  agents,
  groupChatAgents,
  streamingMessage,
  onSendMessage,
  onSendAnnouncement,
  onSendDirective,
  onClearMessages,
  onCloseChat,
  showDecisionInbox,
  decisionInboxLoading,
  decisionInboxItems,
  decisionReplyBusyKey,
  uiLanguage,
  onCloseDecisionInbox,
  onRefreshDecisionInbox,
  onReplyDecisionOption,
  onOpenDecisionChat,
  taskPanel,
  tasks,
  onCloseTaskPanel,
  taskReport,
  onCloseTaskReport,
  showReportHistory: _showReportHistory,
  onCloseReportHistory: _onCloseReportHistory,
  showAgentStatus,
  onCloseAgentStatus,
  showGroupChat,
  groupChatInitialAgentIds,
  onCloseGroupChat,
  onOpenGroupChatWithAgents,
}: AppOverlaysProps) {
  const { departments } = useAgentStore();

  return (
    <>
      {showGroupChat && (
        <GroupChatPanel
          agents={groupChatAgents}
          initialAgentIds={groupChatInitialAgentIds}
          onClose={onCloseGroupChat}
        />
      )}

      {showChat && (
        <ChatPanel
          selectedAgent={chatAgent}
          messages={messages}
          agents={agents}
          streamingMessage={streamingMessage}
          onSendMessage={onSendMessage}
          onSendAnnouncement={onSendAnnouncement}
          onSendDirective={onSendDirective}
          onClearMessages={onClearMessages}
          onClose={onCloseChat}
        />
      )}

      {showDecisionInbox && (
        <DecisionInboxModal
          open={showDecisionInbox}
          loading={decisionInboxLoading}
          items={decisionInboxItems}
          agents={agents}
          busyKey={decisionReplyBusyKey}
          uiLanguage={uiLanguage}
          onClose={onCloseDecisionInbox}
          onRefresh={onRefreshDecisionInbox}
          onReplyOption={onReplyDecisionOption}
          onOpenChat={onOpenDecisionChat}
          onOpenGroupChat={onOpenGroupChatWithAgents}
        />
      )}

      {taskPanel && (
        <TerminalPanel
          taskId={taskPanel.taskId}
          initialTab={taskPanel.tab}
          task={tasks.find((t) => t.id === taskPanel.taskId)}
          agent={agents.find(
            (a) =>
              a.current_task_id === taskPanel.taskId ||
              tasks.find((t) => t.id === taskPanel.taskId)?.assigned_agent_id === a.id,
          )}
          agents={agents}
          onClose={onCloseTaskPanel}
        />
      )}

      {taskReport && (
        <TaskReportPopup
          report={taskReport}
          agents={agents}
          departments={departments}
          uiLanguage={uiLanguage}
          onClose={onCloseTaskReport}
        />
      )}

      {showAgentStatus && <AgentStatusPanel agents={groupChatAgents} uiLanguage={uiLanguage} onClose={onCloseAgentStatus} />}
    </>
  );
}
