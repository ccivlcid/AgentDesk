import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import AppWindow from "../windows/AppWindow";
import { useI18n } from "../../i18n";
import { useTaskStore } from "../../store/taskStore";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore, type PendingClarification } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import TopBar from "./TopBar";
import ConstellationCanvas from "./ConstellationCanvas";
import Sidebar from "./Sidebar";
import LiveActivityPanel from "./LiveActivityPanel";
import RoomModal from "./RoomModal";

const mono = "var(--th-font-mono)";

export default function OrchestrationWindow() {
  const { t } = useI18n();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [filterAgentId, setFilterAgentId] = useState<string | null>(null);
  const [roomOpen, setRoomOpen] = useState(false);

  const { tasks } = useTaskStore();
  const { agents, departments } = useAgentStore();
  const { currentProjectId, projects, projectAgentIds, projectPmAgentId } = useProjectStore();
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
    const assignedIds = new Set(projectTasks.map((t) => t.assigned_agent_id).filter(Boolean));
    const allIds = new Set([...projectAgentIds, ...assignedIds]);
    if (allIds.size > 0) return agents.filter((a) => allIds.has(a.id));
    return [];
  }, [agents, projectTasks, projectAgentIds]);

  const pmAgentId = projectPmAgentId ?? projectAgents.find((a) => a.role === "team_leader")?.id ?? null;

  // Auto-open Room when clarification arrives
  useEffect(() => {
    if (pendingClarification && pendingClarification.projectId === currentProjectId) {
      setRoomOpen(true);
    }
  }, [pendingClarification, currentProjectId]);

  const handleDoubleClickAgent = useCallback((agentId: string) => {
    setFilterAgentId((prev) => prev === agentId ? null : agentId);
  }, []);

  const handleFilterLogs = useCallback((agentId: string) => {
    setFilterAgentId((prev) => prev === agentId ? null : agentId);
  }, []);

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
      <div data-orch-window tabIndex={-1} style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--th-bg-primary)",
        fontFamily: mono,
        overflow: "hidden",
        outline: "none",
        position: "relative",
      }}>
        <TopBar project={currentProject} tasks={projectTasks} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: "0 0 65%", position: "relative", overflow: "hidden", background: "var(--th-bg-primary)" }}>
            <ConstellationCanvas
              agents={projectAgents}
              tasks={projectTasks}
              departments={departments}
              pmAgentId={pmAgentId}
              selectedAgentId={selectedAgentId}
              onSelectAgent={setSelectedAgentId}
              onDoubleClickAgent={handleDoubleClickAgent}
            />
          </div>

          <div style={{ flex: "0 0 35%", borderLeft: "1px solid var(--th-border)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Sidebar
              agents={projectAgents}
              tasks={projectTasks}
              departments={departments}
              projectId={currentProjectId ?? undefined}
              pmAgentId={pmAgentId}
              selectedAgentId={selectedAgentId}
              kickoffStage={kickoffStage ?? "idle"}
              onSelectAgent={setSelectedAgentId}
              onFilterLogs={handleFilterLogs}
            />
          </div>
        </div>

        <LiveActivityPanel
          tasks={projectTasks}
          agents={projectAgents}
          projectId={currentProjectId ?? undefined}
          filterAgentId={filterAgentId}
          onOpenRoom={() => setRoomOpen(true)}
        />

        {/* Room Modal */}
        {roomOpen && (
          <RoomModal
            tasks={projectTasks}
            agents={projectAgents}
            projectId={currentProjectId ?? undefined}
            pmAgentId={pmAgentId}
            onClose={() => setRoomOpen(false)}
          />
        )}
      </div>
    </AppWindow>
  );
}
