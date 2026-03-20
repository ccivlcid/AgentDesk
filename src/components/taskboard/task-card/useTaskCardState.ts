import { useCallback, useEffect, useState } from "react";
import type { TaskStatus } from "../../../types";
import { useI18n } from "../../../i18n";
import { useConfirm } from "../../ui";
import { getTaskTypeBadge, isHideableStatus, STATUS_OPTIONS, taskStatusLabel, timeAgo } from "../constants";
import { getTaskDependencies, type TaskDependencyItem } from "../../../api/task-dependencies";
import { getTaskGates, type TaskGateResult } from "../../../api/pipeline-gates";
import { getTaskImages, type ImageGenerationItem } from "../../../api/image-studio";
import { useUiStore } from "../../../store/uiStore";
import { STATUS_LEFT_BORDER, EXECUTION_STATE_BADGES } from "./constants";
import type { TaskCardProps } from "./types";

export function useTaskCardState(props: TaskCardProps) {
  const {
    task,
    agents,
    departments,
    taskSubtasks,
    isHiddenTask,
    cardCollapsed: cardCollapsedProp,
    onToggleCardCollapsed,
    onUpdateTask,
    onDeleteTask,
    onStopTask,
    onPauseTask,
    onResumeTask,
  } = props;

  const { t, locale: localeTag, language: locale } = useI18n();
  const { confirm } = useConfirm();
  const openWindow = useUiStore((s) => s.openWindow);

  const handleStopTask = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: `"${task.title}" 작업을 중지할까요?`, en: `Stop task?`, ja: `タスクを停止しますか？`, zh: `要停止任务吗？` }),
      message: t({ ko: "경고: Stop 처리 시 해당 프로젝트 변경분은 롤백됩니다.", en: "Warning: stopping will roll back project changes.", ja: "停止するとプロジェクトの変更はロールバックされます。", zh: "停止后将回滚该项目的更改。" }),
      confirmLabel: t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" }),
      variant: "danger",
    });
    if (ok) onStopTask(task.id);
  }, [confirm, t, task.title, task.id, onStopTask]);

  const handleDeleteTask = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: `"${task.title}" 업무를 삭제할까요?`, en: `Delete task?`, ja: `タスクを削除しますか？`, zh: `要删除任务吗？` }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      variant: "danger",
    });
    if (ok) onDeleteTask(task.id);
  }, [confirm, t, task.title, task.id, onDeleteTask]);

  const [cardCollapsedLocal, setCardCollapsedLocal] = useState(false);
  const cardCollapsed = cardCollapsedProp ?? cardCollapsedLocal;
  const setCardCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    if (onToggleCardCollapsed) {
      const next = typeof value === "function" ? value(cardCollapsed) : value;
      if (next !== cardCollapsed) onToggleCardCollapsed(task.id);
    } else {
      setCardCollapsedLocal(typeof value === "function" ? value(cardCollapsedLocal) : value);
    }
  };

  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [depPredecessors, setDepPredecessors] = useState<TaskDependencyItem[]>([]);
  const [depInput, setDepInput] = useState("");
  const [depError, setDepError] = useState<string | null>(null);
  const [showGates, setShowGates] = useState(false);
  const [gateResults, setGateResults] = useState<TaskGateResult[]>([]);
  const [showImages, setShowImages] = useState(false);
  const [taskImages, setTaskImages] = useState<ImageGenerationItem[]>([]);

  const loadDeps = useCallback(async () => {
    try {
      const data = await getTaskDependencies(task.id);
      setDepPredecessors(data.predecessors);
    } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => {
    if (showDeps) void loadDeps();
  }, [showDeps, loadDeps]);

  const loadGates = useCallback(async () => {
    try {
      const data = await getTaskGates(task.id);
      setGateResults(data.gates);
    } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => {
    if (showGates) void loadGates();
  }, [showGates, loadGates]);

  useEffect(() => {
    if (showImages) {
      getTaskImages(task.id).then(setTaskImages).catch(() => {});
    }
  }, [showImages, task.id]);

  const subtaskTotal = task.subtask_total ?? taskSubtasks.length;
  const subtaskDoneCount = taskSubtasks.filter((s) => s.status === "done").length;
  const subtaskInProgressCount = taskSubtasks.filter((s) => s.status === "in_progress").length;
  const subtaskBlockedCount = taskSubtasks.filter((s) => s.status === "blocked").length;
  const subtaskPendingCount = Math.max(0, subtaskTotal - subtaskDoneCount - subtaskInProgressCount - subtaskBlockedCount);

  const leftBorderColor = STATUS_LEFT_BORDER[task.status] ?? "var(--th-border)";
  const executionAlert = task.execution_state === "stalled" || task.execution_state === "failed";
  const assignedAgent = task.assigned_agent ?? agents.find((a) => a.id === task.assigned_agent_id);
  const fallbackAssignedName =
    (locale === "ko" ? task.agent_name_ko || task.agent_name : task.agent_name || task.agent_name_ko) ||
    task.assigned_agent_id;
  const assignedDisplayName = assignedAgent ? (locale === "ko" ? assignedAgent.name_ko : assignedAgent.name) : null;
  const assignedLabel = assignedDisplayName || fallbackAssignedName || null;
  const department = departments.find((d) => d.id === task.department_id);
  const typeBadge = getTaskTypeBadge(task.task_type, t);
  const executionBadge = task.execution_state ? EXECUTION_STATE_BADGES[task.execution_state] : null;

  const isInProgress = task.status === "in_progress";
  const canRun = task.status === "planned" || task.status === "inbox";
  const canStop = isInProgress;
  const canPause = isInProgress && !!onPauseTask;
  const canResume = (task.status === "pending" || task.status === "cancelled") && !!onResumeTask;
  const canDelete = !isInProgress;
  const canHideTask = isHideableStatus(task.status);

  return {
    t,
    localeTag,
    locale,
    task,
    agents,
    departments,
    taskSubtasks,
    isHiddenTask,
    onUpdateTask,
    onRunTask: props.onRunTask,
    onPauseTask,
    onResumeTask,
    onOpenTerminal: props.onOpenTerminal,
    onOpenMeetingMinutes: props.onOpenMeetingMinutes,
    onHideTask: props.onHideTask,
    onUnhideTask: props.onUnhideTask,
    cardCollapsed,
    setCardCollapsed,
    expanded,
    setExpanded,
    showDiff,
    setShowDiff,
    showSubtasks,
    setShowSubtasks,
    showDeps,
    setShowDeps,
    depPredecessors,
    depInput,
    setDepInput,
    depError,
    setDepError,
    loadDeps,
    showGates,
    setShowGates,
    gateResults,
    loadGates,
    showImages,
    setShowImages,
    taskImages,
    subtaskTotal,
    subtaskDoneCount,
    subtaskInProgressCount,
    subtaskBlockedCount,
    subtaskPendingCount,
    leftBorderColor,
    executionAlert,
    assignedAgent,
    assignedLabel,
    department,
    typeBadge,
    executionBadge,
    isInProgress,
    canRun,
    canStop,
    canPause,
    canResume,
    canDelete,
    canHideTask,
    handleStopTask,
    handleDeleteTask,
    openWindow,
    STATUS_OPTIONS,
    taskStatusLabel,
    timeAgo,
  };
}

export type TaskCardState = ReturnType<typeof useTaskCardState>;
