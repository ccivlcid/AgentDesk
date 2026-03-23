import { useCallback, useState } from "react";
import { useTaskStore } from "../../store/taskStore";
import { useAgentStore } from "../../store/agentStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { kickoffProject, resumeProject, addProjectTasks } from "../../api/project-kickoff";
import {
  updateTask,
  deleteTask,
  assignTask,
  runTask,
  stopTask,
  pauseTask,
  resumeTask,
} from "../../api/organization-projects";
import { mergeTask, discardTask } from "../../api/workflow-skills-subtasks";
import AppWindow from "./AppWindow";
import { TaskBoard } from "../TaskBoard";
import { useI18n } from "../../i18n";
import type { Task } from "../../types";

export default function TaskBoardWindow() {
  const { tasks, subtasks, setTasks, setTaskPanel } = useTaskStore();
  const { agents, departments } = useAgentStore();
  const { projects, currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { closeWindow } = useUiStore();
  const { t } = useI18n();

  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;
  const projectAgents = currentProject && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : undefined;

  const handleUpdateTask = useCallback(async (id: string, data: Partial<Task>) => {
    await updateTask(id, data);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...data } : task));
  }, [setTasks]);

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, [setTasks]);

  const handleAssignTask = useCallback(async (taskId: string, agentId: string) => {
    await assignTask(taskId, agentId);
    const agent = agents.find((a) => a.id === agentId);
    setTasks((prev) => prev.map((task) =>
      task.id === taskId ? { ...task, assigned_agent_id: agentId, assigned_agent: agent } : task
    ));
  }, [agents, setTasks]);

  const handleRunTask = useCallback(async (id: string) => {
    await runTask(id);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, status: "in_progress" as const } : task));
  }, [setTasks]);

  const handleStopTask = useCallback(async (id: string) => {
    await stopTask(id);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, status: "cancelled" as const } : task));
  }, [setTasks]);

  const handlePauseTask = useCallback(async (id: string) => {
    await pauseTask(id);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, status: "pending" as const } : task));
  }, [setTasks]);

  const handleResumeTask = useCallback(async (id: string) => {
    await resumeTask(id);
    setTasks((prev) => prev.map((task) => task.id === id ? { ...task, status: "in_progress" as const } : task));
  }, [setTasks]);

  const handleMergeTask = useCallback(async (id: string) => {
    await mergeTask(id);
  }, []);

  const handleDiscardTask = useCallback(async (id: string) => {
    await discardTask(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, [setTasks]);

  const handleOpenTerminal = useCallback((taskId: string) => {
    setTaskPanel({ taskId, tab: "terminal" });
  }, [setTaskPanel]);

  const handleOpenMeetingMinutes = useCallback((taskId: string) => {
    setTaskPanel({ taskId, tab: "terminal" });
  }, [setTaskPanel]);

  const [kickoffBusy, setKickoffBusy] = useState(false);
  const handleKickoff = useCallback(async () => {
    if (!currentProjectId || kickoffBusy) return;
    setKickoffBusy(true);
    try {
      await kickoffProject(currentProjectId);
    } finally {
      setKickoffBusy(false);
    }
  }, [currentProjectId, kickoffBusy]);

  const [resumeBusy, setResumeBusy] = useState(false);
  const handleResume = useCallback(async () => {
    if (!currentProjectId || resumeBusy) return;
    setResumeBusy(true);
    try {
      await resumeProject(currentProjectId);
    } finally {
      setResumeBusy(false);
    }
  }, [currentProjectId, resumeBusy]);

  const [addTasksBusy, setAddTasksBusy] = useState(false);
  const handleAddTasks = useCallback(async (directive: string, attachedFile?: { name: string; content: string }) => {
    if (!currentProjectId || addTasksBusy) return;
    setAddTasksBusy(true);
    try {
      await addProjectTasks(currentProjectId, directive, attachedFile);
    } finally {
      setAddTasksBusy(false);
    }
  }, [currentProjectId, addTasksBusy]);

  const boardIcon = (
    <svg viewBox="0 0 18 18" fill="none" stroke="var(--th-text-heading)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
      <rect x="1.5" y="2" width="15" height="14" rx="2" />
      <line x1="1.5" y1="6" x2="16.5" y2="6" />
      <line x1="6" y1="2" x2="6" y2="6" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <path d="M4.5 10l1.5 1.5 3-3" />
      <line x1="10.5" y1="10" x2="14" y2="10" />
      <line x1="10.5" y1="13" x2="14" y2="13" />
    </svg>
  );

  return (
    <AppWindow
      windowType="tasks"
      title={t({ ko: "보드", en: "Board", ja: "ボード", zh: "看板" })}
      emoji={boardIcon}
      defaultWidth={1100}
      defaultHeight={700}
      onClose={() => closeWindow("tasks")}
    >
      <TaskBoard
        tasks={tasks}
        agents={agents}
        projectManagerAgents={projectAgents}
        departments={departments}
        subtasks={subtasks}
        currentProject={currentProject}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onAssignTask={handleAssignTask}
        onRunTask={handleRunTask}
        onStopTask={handleStopTask}
        onPauseTask={handlePauseTask}
        onResumeTask={handleResumeTask}
        onMergeTask={handleMergeTask}
        onDiscardTask={handleDiscardTask}
        onOpenTerminal={handleOpenTerminal}
        onOpenMeetingMinutes={handleOpenMeetingMinutes}
        onKickoff={handleKickoff}
        kickoffBusy={kickoffBusy}
        onResume={handleResume}
        resumeBusy={resumeBusy}
        onAddTasks={handleAddTasks}
        addTasksBusy={addTasksBusy}
      />
    </AppWindow>
  );
}
