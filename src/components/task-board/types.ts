import type { Agent, Department, Project, SubTask, Task } from "../../types";

export interface TaskBoardProps {
  tasks: Task[];
  agents: Agent[];
  currentProject?: Project | null;
  projectManagerAgents?: Agent[];
  departments: Department[];
  subtasks: SubTask[];
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAssignTask: (taskId: string, agentId: string) => void;
  onRunTask: (id: string) => void;
  onStopTask: (id: string) => void;
  onPauseTask?: (id: string) => void;
  onResumeTask?: (id: string) => void;
  onOpenTerminal?: (taskId: string) => void;
  onOpenMeetingMinutes?: (taskId: string) => void;
  onMergeTask?: (id: string) => void;
  onDiscardTask?: (id: string) => void;
  onProjectCreate?: () => void;
  onKickoff?: () => void;
  kickoffBusy?: boolean;
  onResume?: () => void;
  resumeBusy?: boolean;
}
