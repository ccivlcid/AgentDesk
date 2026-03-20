import type { Agent, Department, SubTask, Task, TaskExecutionState, TaskStatus } from "../../../types";
import type { TaskDependencyItem } from "../../../api/task-dependencies";
import type { TaskGateResult } from "../../../api/pipeline-gates";
import type { ImageGenerationItem } from "../../../api/image-studio";

export interface TaskCardProps {
  task: Task;
  agents: Agent[];
  departments: Department[];
  taskSubtasks: SubTask[];
  isHiddenTask?: boolean;
  cardCollapsed?: boolean;
  onToggleCardCollapsed?: (taskId: string) => void;
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
  onHideTask?: (id: string) => void;
  onUnhideTask?: (id: string) => void;
}

export type { TaskExecutionState, TaskDependencyItem, TaskGateResult, ImageGenerationItem };
