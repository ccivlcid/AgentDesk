import { lazy, Suspense } from "react";
import { useAgentStore } from "../../../store/agentStore";
import { useTaskStore } from "../../../store/taskStore";
import { useProjectStore } from "../../../store/projectStore";

const AgentFlowGraph = lazy(() => import("../../flow-graph/AgentFlowGraph"));

export default function FlowGraphWidget() {
  const { agents, departments, subAgents } = useAgentStore();
  const { tasks, crossDeptDeliveries, meetingPresence } = useTaskStore();
  const { projectAgentIds, projectAgentsLoaded, currentProjectId } = useProjectStore();

  const filteredAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

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
        />
      </Suspense>
    </div>
  );
}
