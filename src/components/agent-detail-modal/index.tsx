import { useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import type { SubTask } from "../../types";
import AgentChatTab from "../agent-detail/AgentChatTab";
import AgentDetailTabContent from "../agent-detail/AgentDetailTabContent";
import AgentTimeline from "../agent-detail/AgentTimeline";
import { STATUS_CONFIG } from "../agent-detail/constants";
import { AgentDetailModalProfileHeader } from "./AgentDetailModalProfileHeader";
import { AgentDetailModalTabBar } from "./AgentDetailModalTabBar";
import type { AgentDetailModalProps, AgentDetailTabKey } from "./types";
import { useAgentDetailCliState } from "./useAgentDetailCliState";
import { useAgentDetailPlanningLead } from "./useAgentDetailPlanningLead";

export default function AgentDetailModal({
  agent,
  agents,
  department,
  departments,
  tasks,
  subAgents,
  subtasks,
  onClose,
  onChat,
  onAssignTask,
  onOpenTerminal,
  onAgentUpdated,
}: AgentDetailModalProps) {
  const { t, language } = useI18n();
  const cli = useAgentDetailCliState(agent, onAgentUpdated, t);
  const planning = useAgentDetailPlanningLead(agent, onAgentUpdated, t);
  const [tab, setTab] = useState<AgentDetailTabKey>("info");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const agentTasks = tasks.filter((task) => task.assigned_agent_id === agent.id);
  const subtasksByTask = useMemo(() => {
    const grouped: Record<string, SubTask[]> = {};
    for (const subtask of subtasks) {
      if (!grouped[subtask.task_id]) grouped[subtask.task_id] = [];
      grouped[subtask.task_id].push(subtask);
    }
    return grouped;
  }, [subtasks]);
  const agentSubAgents = subAgents.filter((subAgent) => subAgent.parentAgentId === agent.id);
  const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", zIndex: 1100 }}
    >
      <div
        className="w-[calc(100vw-1.5rem)] max-w-[480px] max-h-[85vh] overflow-hidden rounded border shadow-2xl"
        style={{ background: "var(--th-bg-elevated)", borderColor: "var(--th-border-strong)" }}
      >
        <AgentDetailModalProfileHeader
          onClose={onClose}
          agent={agent}
          agents={agents}
          department={department}
          language={language}
          t={t}
          statusCfg={statusCfg}
          actsAsPlanningLead={planning.actsAsPlanningLead}
          savingPlanningLead={planning.savingPlanningLead}
          onPlanningLeadChange={planning.handlePlanningLeadToggle}
          cli={cli}
        />

        <AgentDetailModalTabBar
          tab={tab}
          setTab={setTab}
          t={t}
          agentTasksLength={agentTasks.length}
          agentSubAgentsLength={agentSubAgents.length}
        />

        <div className="p-4 overflow-y-auto max-h-[40vh]">
          {tab === "chat" ? (
            <AgentChatTab agent={agent} />
          ) : tab === "timeline" ? (
            <AgentTimeline agentId={agent.id} t={t} />
          ) : (
            <AgentDetailTabContent
              tab={tab}
              t={t}
              language={language}
              agent={agent}
              departments={departments}
              agentTasks={agentTasks}
              agentSubAgents={agentSubAgents}
              subtasksByTask={subtasksByTask}
              expandedTaskId={expandedTaskId}
              setExpandedTaskId={setExpandedTaskId}
              onChat={onChat}
              onAssignTask={onAssignTask}
              onOpenTerminal={onOpenTerminal}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export type { AgentDetailModalProps, AgentDetailProps, AgentDetailTabKey } from "./types";
