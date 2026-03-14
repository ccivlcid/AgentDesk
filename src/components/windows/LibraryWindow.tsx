import { lazy, Suspense } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";

const SkillsLibrary     = lazy(() => import("../SkillsLibrary"));
const AgentRulesLibrary = lazy(() => import("../AgentRulesLibrary"));
const MemoryLibrary     = lazy(() => import("../MemoryLibrary"));
const HooksLibrary      = lazy(() => import("../HooksLibrary"));
const Deliverables      = lazy(() => import("../deliverables/Deliverables"));

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "var(--th-font-mono)", fontSize: 11, color: "var(--th-text-muted)" }}>
      loading...
    </div>
  );
}

export default function LibraryWindow() {
  const { agents, libraryAgents, departments } = useAgentStore();
  const { currentProjectId, projects } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const libAgents = libraryAgents.length > 0 ? libraryAgents : agents;

  return (
    <AppWindow
      windowType="library"
      title="Library"
      emoji="📚"
      defaultWidth={860}
      defaultHeight={600}
      tabs={[
        {
          id: "skills",
          label: "Skills",
          content: (
            <Suspense fallback={<Loading />}>
              <SkillsLibrary agents={libAgents} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "rules",
          label: "Rules",
          content: (
            <Suspense fallback={<Loading />}>
              <AgentRulesLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "memory",
          label: "Memory",
          content: (
            <Suspense fallback={<Loading />}>
              <MemoryLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "hooks",
          label: "Hooks",
          content: (
            <Suspense fallback={<Loading />}>
              <HooksLibrary agents={libAgents} departments={departments} currentProject={currentProject} />
            </Suspense>
          ),
        },
        {
          id: "deliverables",
          label: "Deliverables",
          content: (
            <Suspense fallback={<Loading />}>
              <Deliverables agents={libAgents} currentProject={currentProject} />
            </Suspense>
          ),
        },
      ]}
    />
  );
}
