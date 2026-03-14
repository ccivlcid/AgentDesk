import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";

const WorkflowBuilder = lazy(() => import("../workflow-builder/WorkflowBuilder"));
const ScheduledTasksPanel = lazy(() => import("../scheduled-tasks/ScheduledTasksPanel"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      loading...
    </div>
  );
}

export default function WorkflowWindow() {
  const { agents } = useAgentStore();
  const { currentProjectId } = useProjectStore();

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
              <ScheduledTasksPanel agents={agents} currentProjectId={currentProjectId} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
