import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";

const WorkflowBuilder = lazy(() => import("../workflow-builder/WorkflowBuilder"));
const ScheduledTasksPanel = lazy(() => import("../scheduled-tasks/ScheduledTasksPanel"));
const AgentCompositionBuilder = lazy(() => import("../agent-composition/AgentCompositionBuilder"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      loading...
    </div>
  );
}

export default function WorkflowWindow() {
  const { agents } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();

  const filteredAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  return (
    <AppWindow
      windowType="workflow"
      title="Workflow"
      emoji="⚡"
      defaultWidth={900}
      defaultHeight={620}
      tabs={[
        {
          id: "builder",
          label: "Builder",
          content: (
            <Suspense fallback={<Loading />}>
              <WorkflowBuilder />
            </Suspense>
          ),
        },
        {
          id: "scheduled",
          label: "Scheduled",
          content: (
            <Suspense fallback={<Loading />}>
              <ScheduledTasksPanel agents={filteredAgents} currentProjectId={currentProjectId} />
            </Suspense>
          ),
        },
        {
          id: "composition",
          label: "Composition",
          content: (
            <Suspense fallback={<Loading />}>
              <AgentCompositionBuilder />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
