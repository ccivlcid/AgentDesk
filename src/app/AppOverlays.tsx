import DecisionInboxModal from "../components/DecisionInboxModal";
import TerminalPanel from "../components/TerminalPanel";
import AgentStatusPanel from "../components/AgentStatusPanel";
import DirectiveEditModal from "../components/project-create-modal/DirectiveEditModal";
import type { DecisionInboxItem } from "../components/chat/decision-inbox";
import type { Agent, Task } from "../types";
import type { UiLanguage } from "../i18n";
import type { TaskPanelTab } from "./types";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";

interface AppOverlaysProps {
  agents: Agent[];
  decisionInboxLoading: boolean;
  decisionInboxItems: DecisionInboxItem[];
  decisionReplyBusyKey: string | null;
  uiLanguage: UiLanguage;
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
  showAgentStatus: boolean;
  onCloseAgentStatus: () => void;
}

export default function AppOverlays({
  agents,
  decisionInboxLoading,
  decisionInboxItems,
  decisionReplyBusyKey,
  uiLanguage,
  onRefreshDecisionInbox,
  onReplyDecisionOption,
  onOpenDecisionChat,
  taskPanel,
  tasks,
  onCloseTaskPanel,
  showAgentStatus,
  onCloseAgentStatus,
}: AppOverlaysProps) {
  const { editDirectiveProjectId } = useProjectStore();
  const { openWindows, closeWindow } = useUiStore();

  return (
    <>
      {editDirectiveProjectId && <DirectiveEditModal />}

      {openWindows.has("decision-inbox") && (
        <DecisionInboxModal
          loading={decisionInboxLoading}
          items={decisionInboxItems}
          agents={agents}
          busyKey={decisionReplyBusyKey}
          uiLanguage={uiLanguage}
          onClose={() => closeWindow("decision-inbox")}
          onRefresh={onRefreshDecisionInbox}
          onReplyOption={onReplyDecisionOption}
          onOpenChat={onOpenDecisionChat}
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

      {showAgentStatus && <AgentStatusPanel agents={agents} uiLanguage={uiLanguage} onClose={onCloseAgentStatus} />}
    </>
  );
}
