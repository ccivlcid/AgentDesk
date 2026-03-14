import { lazy, Suspense } from "react";
import { useAgentStore } from "../../../store/agentStore";
import { useTaskStore } from "../../../store/taskStore";

const AgentFlowGraph = lazy(() => import("../../flow-graph/AgentFlowGraph"));

export default function FlowGraphWidget() {
  const { agents, departments, subAgents } = useAgentStore();
  const { tasks, crossDeptDeliveries, meetingPresence } = useTaskStore();

  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <Suspense fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
          loading...
        </div>
      }>
        <AgentFlowGraph
          agents={agents}
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
