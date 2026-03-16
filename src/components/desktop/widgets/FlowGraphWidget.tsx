import { lazy, Suspense, useCallback } from "react";
import { useAgentStore } from "../../../store/agentStore";
import { useTaskStore } from "../../../store/taskStore";
import { useProjectStore } from "../../../store/projectStore";
import { useUiStore } from "../../../store/uiStore";
import type { Agent } from "../../../types";

const AgentFlowGraph = lazy(() => import("../../flow-graph/AgentFlowGraph"));

export default function FlowGraphWidget() {
  const { agents, departments, subAgents } = useAgentStore();
  const { tasks, crossDeptDeliveries, meetingPresence } = useTaskStore();
  const { projectAgentIds, projectAgentsLoaded, currentProjectId } = useProjectStore();
  const { setSelectedAgentId, openWindow } = useUiStore();

  const filteredAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  const handleSelectAgent = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id);
    openWindow("agent-manager");
  }, [setSelectedAgentId, openWindow]);

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <Suspense fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
          loading...
        </div>
      }>
        <AgentFlowGraph
          agents={filteredAgents}
          departments={departments}
          tasks={tasks}
          subAgents={subAgents}
          crossDeptDeliveries={crossDeptDeliveries}
          meetingPresences={meetingPresence}
          projectAgentIds={currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0 ? projectAgentIds : undefined}
          onSelectAgent={handleSelectAgent}
        />
      </Suspense>
    </div>
  );
}
