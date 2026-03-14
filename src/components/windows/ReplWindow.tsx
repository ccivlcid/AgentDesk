import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";

const AgentRepl = lazy(() => import("../AgentRepl"));

export default function ReplWindow() {
  const { agents } = useAgentStore();
  const { projects, currentProjectId } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  return (
    <AppWindow
      windowType="repl"
      title="에이전트 REPL"
      emoji=">_"
      defaultWidth={720}
      defaultHeight={500}
    >
      <div style={{ height: "100%", overflow: "hidden" }}>
        <Suspense fallback={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
            loading...
          </div>
        }>
          <AgentRepl agents={agents} currentProject={currentProject} />
        </Suspense>
      </div>
    </AppWindow>
  );
}
