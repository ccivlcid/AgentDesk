import { useState, useMemo, useEffect, useRef } from "react";
import AppWindow from "../windows/AppWindow";
import { useI18n } from "../../i18n";
import { useTaskStore } from "../../store/taskStore";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore, type PendingClarification } from "../../store/projectStore";
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
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  const prevStageRef = useRef<string | null>(null);

  const { tasks } = useTaskStore();
  const { agents, departments } = useAgentStore();
  const { currentProjectId, projects, projectAgentIds } = useProjectStore();
  const pendingClarification = useProjectStore((s) => s.pendingClarification) as PendingClarification | null;
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
    // Merge task-assigned agents AND project_agents (includes PM who never gets tasks)
    const assignedIds = new Set(projectTasks.map((t) => t.assigned_agent_id).filter(Boolean));
    const allIds = new Set([...projectAgentIds, ...assignedIds]);
    if (allIds.size > 0) return agents.filter((a) => allIds.has(a.id));
    return [];
  }, [agents, projectTasks, projectAgentIds]);

  // Auto-switch tabs based on kickoff stage
  useEffect(() => {
    const prev = prevStageRef.current;
    prevStageRef.current = kickoffStage;

    if (!kickoffStage || kickoffStage === "idle") return;

    // When meeting starts, jump to room tab so user sees the live meeting
    if (kickoffStage === "meeting" && prev !== "meeting") {
      setActiveTab("room");
      return;
    }

    // When planning/assigning starts (tasks being created), switch to timeline
    if ((kickoffStage === "planning" || kickoffStage === "assigning") && prev === "meeting") {
      setActiveTab("timeline");
      return;
    }
  }, [kickoffStage]);

  // Auto-switch to room tab when clarification arrives for this project
  useEffect(() => {
    if (pendingClarification && pendingClarification.projectId === currentProjectId) {
      setActiveTab("room");
    }
  }, [pendingClarification, currentProjectId]);

  const titleIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );

  return (
    <AppWindow
      windowType="tasks"
      title={t({ ko: "워크플로우", en: "Workflow", ja: "ワークフロー", zh: "工作流" })}
      emoji={titleIcon}
      defaultWidth={1120}
      defaultHeight={720}
    >
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--th-bg-primary)",
        fontFamily: mono,
        overflow: "hidden",
      }}>
        {/* Metrics Header */}
        <MetricsHeader
          tasks={projectTasks}
          agents={projectAgents}
          project={currentProject}
          onFailedClick={() => {
            const failed = projectTasks.find((t) => t.status === "failed" || t.execution_state === "failed");
            if (failed) setFocusTaskId(failed.id);
            setActiveTab("timeline");
          }}
        />

        {/* Tab Bar (top, settings-style) */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main content: Stage Rail + Tab Content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Stage Rail (left sidebar) */}
          <StageRail stage={kickoffStage ?? "idle"} />

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className={activeTab !== "room" ? "custom-scrollbar" : undefined} style={{
              flex: 1,
              overflow: activeTab === "room" ? "hidden" : "auto",
              padding: activeTab === "room" ? "12px 16px" : "20px 24px",
              display: "flex",
              flexDirection: "column",
            }}>
              <div style={{
                background: activeTab === "room" ? "transparent" : "var(--th-bg-elevated)",
                backdropFilter: activeTab === "room" ? "none" : "var(--th-glass-blur)",
                border: activeTab === "room" ? "none" : "1px solid var(--th-border)",
                borderRadius: activeTab === "room" ? 0 : 20,
                padding: activeTab === "room" ? 0 : "24px 28px",
                boxShadow: activeTab === "room" ? "none" : "var(--th-shadow-sm)",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}>
              {activeTab === "timeline" && (
                <TimelineTab
                  tasks={projectTasks}
                  agents={projectAgents}
                  focusTaskId={focusTaskId}
                  onFocusConsumed={() => setFocusTaskId(null)}
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
                  onSwitchToLogs={() => { setActiveTab("logs"); }}
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
