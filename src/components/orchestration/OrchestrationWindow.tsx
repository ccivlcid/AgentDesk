import { useState, useMemo } from "react";
import AppWindow from "../windows/AppWindow";
import { useI18n } from "../../i18n";
import { useTaskStore } from "../../store/taskStore";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import StageRail from "./StageRail";
import MetricsHeader from "./MetricsHeader";
import TabBar from "./TabBar";
import TimelineTab from "./tabs/TimelineTab";
import LogsTab from "./tabs/LogsTab";
import AgentsTab from "./tabs/AgentsTab";
import RoomTab from "./tabs/RoomTab";

const mono = "var(--th-font-mono)";

export type OrchestraTab = "timeline" | "logs" | "agents" | "room";

export default function OrchestrationWindow() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<OrchestraTab>("timeline");

  const { tasks } = useTaskStore();
  const { agents, departments } = useAgentStore();
  const { currentProjectId, projects } = useProjectStore();
  const { kickoffStage } = useUiStore();

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const projectTasks = useMemo(
    () => currentProjectId ? tasks.filter((t) => t.project_id === currentProjectId) : tasks,
    [tasks, currentProjectId],
  );

  const projectAgents = useMemo(() => {
    const assignedIds = new Set(projectTasks.map((t) => t.assigned_agent_id).filter(Boolean));
    return agents.filter((a) => assignedIds.has(a.id));
  }, [agents, projectTasks]);

  const titleIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );

  return (
    <AppWindow
      windowType="tasks"
      title={t({ ko: "Orchestration", en: "Orchestration", ja: "Orchestration", zh: "Orchestration" })}
      emoji={titleIcon}
      defaultWidth={1120}
      defaultHeight={720}
    >
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#F3F4F6",
        fontFamily: mono,
        overflow: "hidden",
      }}>
        {/* Metrics Header */}
        <MetricsHeader
          tasks={projectTasks}
          agents={projectAgents}
          project={currentProject}
        />

        {/* Tab Bar (top, settings-style) */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main content: Stage Rail + Tab Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Stage Rail (left sidebar) */}
          <StageRail stage={kickoffStage ?? "idle"} />

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "24px 20px" }}>
              <div style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: 24,
                padding: "24px 24px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
                minHeight: "100%",
              }}>
              {activeTab === "timeline" && (
                <TimelineTab
                  tasks={projectTasks}
                  agents={projectAgents}
                />
              )}
              {activeTab === "logs" && (
                <LogsTab
                  tasks={projectTasks}
                  agents={projectAgents}
                  projectId={currentProjectId ?? undefined}
                />
              )}
              {activeTab === "agents" && (
                <AgentsTab
                  agents={projectAgents}
                  tasks={projectTasks}
                  departments={departments}
                  projectId={currentProjectId ?? undefined}
                />
              )}
              {activeTab === "room" && (
                <RoomTab
                  tasks={projectTasks}
                  agents={projectAgents}
                  project={currentProject}
                  projectId={currentProjectId ?? undefined}
                />
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
