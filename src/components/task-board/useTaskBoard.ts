import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { bulkHideTasks, getProjects } from "../../api";
import { useI18n } from "../../i18n";
import type { Project, SubTask, Task, TaskExecutionState, TaskStatus } from "../../types";
import { useConfirm } from "../ui/ConfirmDialog";
import { useToast } from "../ui";
import { COLUMNS, isHideableStatus, type HideableStatus } from "../taskboard/constants";
import { loadCollapsedCardIds, saveCollapsedCardIds } from "./collapsedCardStorage";
import type { TaskBoardProps } from "./types";
import { BTN_BASE_STYLE, MONO_STYLE } from "./styles";

export function useTaskBoard({
  tasks,
  agents,
  currentProject,
  projectManagerAgents,
  departments,
  subtasks,
  onProjectCreate,
  onUpdateTask,
  onDeleteTask,
  onAssignTask,
  onRunTask,
  onStopTask,
  onPauseTask,
  onResumeTask,
  onOpenTerminal,
  onOpenMeetingMinutes,
  onMergeTask,
  onDiscardTask,
  onKickoff,
  kickoffBusy,
  onResume,
  resumeBusy,
  onAddTasks,
  addTasksBusy,
}: TaskBoardProps) {
  const { t } = useI18n();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<"board" | "gantt" | "dag">("board");
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showBulkHideModal, setShowBulkHideModal] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProject, setFilterProject] = useState(() => currentProject?.id ?? "");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterExecution, setFilterExecution] = useState<"" | TaskExecutionState | "attention">("");
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Pick<Project, "id" | "name">[]>([]);

  useEffect(() => {
    getProjects({ page_size: 200 })
      .then((res) => setProjects(res.projects.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {
        showToast(t({ ko: "프로젝트 불러오기에 실패했습니다", en: "Failed to load projects", ja: "プロジェクトの読み込みに失敗しました", zh: "加载项目失败" }), "error");
      });
  }, [showToast, t]);

  useEffect(() => {
    setFilterProject(currentProject?.id ?? "");
  }, [currentProject?.id]);

  const [showAllTasks, setShowAllTasks] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [collapsedCardIds, setCollapsedCardIds] = useState<Set<string>>(() => loadCollapsedCardIds());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<string | null>(null);

  const handleFilterExecution = useCallback((value: string) => {
    setFilterExecution(value as "" | TaskExecutionState | "attention");
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const hiddenTaskIds = useMemo(
    () => new Set(tasks.filter((task) => task.hidden === 1).map((task) => task.id)),
    [tasks],
  );

  const hideTask = useCallback(
    (taskId: string) => onUpdateTask(taskId, { hidden: 1 }),
    [onUpdateTask],
  );

  const unhideTask = useCallback(
    (taskId: string) => onUpdateTask(taskId, { hidden: 0 }),
    [onUpdateTask],
  );

  const hideByStatuses = useCallback((statuses: HideableStatus[]) => {
    if (statuses.length === 0) return;
    bulkHideTasks(statuses, 1);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterDept && task.department_id !== filterDept) return false;
      if (filterType && task.task_type !== filterType) return false;
      if (filterProject && task.project_id !== filterProject) return false;
      if (filterAgent && task.assigned_agent_id !== filterAgent) return false;
      if (filterExecution === "attention") {
        if (!task.execution_state || !["blocked", "stalled", "failed"].includes(task.execution_state)) return false;
      } else if (filterExecution && task.execution_state !== filterExecution) {
        return false;
      }
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      const isHidden = hiddenTaskIds.has(task.id);
      if (!showAllTasks && isHidden) return false;
      return true;
    });
  }, [tasks, filterDept, filterType, filterProject, filterAgent, filterExecution, search, hiddenTaskIds, showAllTasks]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const column of COLUMNS) {
      grouped[column.status] = filteredTasks
        .filter((task) => task.status === column.status)
        .sort((a, b) => b.priority - a.priority || b.created_at - a.created_at);
    }
    return grouped;
  }, [filteredTasks]);

  const subtasksByTask = useMemo(() => {
    const grouped: Record<string, SubTask[]> = {};
    for (const subtask of subtasks) {
      if (!grouped[subtask.task_id]) grouped[subtask.task_id] = [];
      grouped[subtask.task_id].push(subtask);
    }
    return grouped;
  }, [subtasks]);

  const toggleColumn = useCallback((status: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleCardCollapsed = useCallback((taskId: string) => {
    setCollapsedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      saveCollapsedCardIds(next);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overData = event.over?.data?.current as { status?: string } | undefined;
    setOverColumnStatus(overData?.status ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTaskId(null);
      setOverColumnStatus(null);
      const overData = event.over?.data?.current as { status?: string } | undefined;
      const targetStatus = overData?.status;
      if (!targetStatus) return;
      const taskId = String(event.active.id);
      const task = tasks.find((x) => x.id === taskId);
      if (task && task.status !== targetStatus) {
        onUpdateTask(taskId, { status: targetStatus as TaskStatus });
      }
    },
    [tasks, onUpdateTask],
  );

  const handleDragCancel = useCallback(() => {
    setActiveTaskId(null);
    setOverColumnStatus(null);
  }, []);

  const activeTask = activeTaskId ? tasks.find((x) => x.id === activeTaskId) ?? null : null;

  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => {
      if (prev) setSelectedTaskIds(new Set());
      return !prev;
    });
  }, []);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const handleBatchStop = useCallback(() => {
    for (const id of selectedTaskIds) {
      const task = tasks.find((x) => x.id === id);
      if (task && task.status === "in_progress") onStopTask(id);
    }
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, tasks, onStopTask]);

  const handleBatchDelete = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: "업무 일괄 삭제", en: "Delete Tasks", ja: "タスクの一括削除", zh: "批量删除任务" }),
      message: t({ ko: `${selectedTaskIds.size}개 업무를 삭제하시겠습니까?`, en: `Delete ${selectedTaskIds.size} task(s)?`, ja: `${selectedTaskIds.size}件を削除しますか？`, zh: `确定删除 ${selectedTaskIds.size} 个任务？` }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
      variant: "danger",
    });
    if (!ok) return;
    for (const id of selectedTaskIds) onDeleteTask(id);
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, onDeleteTask, confirm, t]);

  const handleBatchHide = useCallback(() => {
    for (const id of selectedTaskIds) hideTask(id);
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, hideTask]);

  const activeFilterCount = [filterDept, filterType, filterProject, filterAgent, filterExecution, search].filter(Boolean).length;

  const hiddenTaskCount = useMemo(() => {
    let count = 0;
    for (const task of tasks) {
      if (isHideableStatus(task.status) && hiddenTaskIds.has(task.id)) count++;
    }
    return count;
  }, [tasks, hiddenTaskIds]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of filteredTasks) {
      counts[task.status] = (counts[task.status] ?? 0) + 1;
    }
    return counts;
  }, [filteredTasks]);

  const statusCodeMap = useMemo(
    () => ({
      inbox: { code: t({ ko: "수신", en: "INBOX", ja: "受信", zh: "收件" }), color: "var(--th-status-muted)" },
      planned: { code: t({ ko: "계획", en: "PLAN", ja: "計画", zh: "计划" }), color: "var(--th-status-info)" },
      collaborating: { code: t({ ko: "협업", en: "COLLAB", ja: "協働", zh: "协作" }), color: "var(--th-status-purple)" },
      in_progress: { code: t({ ko: "진행", en: "WIP", ja: "進行", zh: "进行" }), color: "var(--th-status-success)" },
      review: { code: t({ ko: "검토", en: "REV", ja: "レビュー", zh: "审核" }), color: "var(--th-status-purple)" },
      done: { code: t({ ko: "완료", en: "DONE", ja: "完了", zh: "完成" }), color: "var(--th-status-muted)" },
      pending: { code: t({ ko: "보류", en: "HOLD", ja: "保留", zh: "待处理" }), color: "var(--th-status-warning)" },
      failed: { code: t({ ko: "실패", en: "ERR", ja: "失敗", zh: "失败" }), color: "var(--th-status-error)" },
      cancelled: { code: t({ ko: "취소", en: "VOID", ja: "中止", zh: "取消" }), color: "var(--th-status-muted)" },
    }),
    [t],
  );

  return {
    t,
    tasks,
    agents,
    departments,
    subtasks,
    currentProject,
    projectManagerAgents,
    onProjectCreate,
    viewMode,
    setViewMode,
    showProjectManager,
    setShowProjectManager,
    showBulkHideModal,
    setShowBulkHideModal,
    filterDept,
    setFilterDept,
    filterType,
    setFilterType,
    filterProject,
    setFilterProject,
    filterExecution,
    handleFilterExecution,
    search,
    setSearch,
    batchMode,
    toggleBatchMode,
    selectedTaskIds,
    setSelectedTaskIds,
    projects,
    showAllTasks,
    setShowAllTasks,
    collapsedColumns,
    toggleColumn,
    collapsedCardIds,
    toggleCardCollapsed,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    activeTask,
    toggleTaskSelection,
    handleBatchStop,
    handleBatchDelete,
    handleBatchHide,
    activeFilterCount,
    hiddenTaskCount,
    statusCounts,
    statusCodeMap,
    filteredTasks,
    tasksByStatus,
    subtasksByTask,
    hiddenTaskIds,
    hideTask,
    unhideTask,
    hideByStatuses,
    overColumnStatus,
    onUpdateTask,
    onDeleteTask,
    onAssignTask,
    onRunTask,
    onStopTask,
    onPauseTask,
    onResumeTask,
    onOpenTerminal,
    onOpenMeetingMinutes,
    onMergeTask,
    onDiscardTask,
    onKickoff,
    kickoffBusy,
    onResume,
    resumeBusy,
    onAddTasks,
    addTasksBusy,
    mono: MONO_STYLE,
    btnBase: BTN_BASE_STYLE,
  };
}

export type TaskBoardState = ReturnType<typeof useTaskBoard>;
