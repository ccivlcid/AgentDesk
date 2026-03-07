import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { bulkHideTasks, getProjects } from "../api";
import { useI18n } from "../i18n";
import type { Agent, Department, Project, SubTask, Task, TaskStatus, WorkflowPackKey } from "../types";
import ProjectManagerModal from "./ProjectManagerModal";
import BulkHideModal from "./taskboard/BulkHideModal";
import CreateTaskModal from "./taskboard/CreateTaskModal";
import FilterBar from "./taskboard/FilterBar";
import DependencyGraph from "./taskboard/DependencyGraph";
import GanttChart from "./taskboard/GanttChart";
import TaskCard from "./taskboard/TaskCard";
import { COLUMNS, isHideableStatus, taskStatusLabel, type HideableStatus } from "./taskboard/constants";

const COLLAPSED_CARD_IDS_KEY = "agentdesk_taskboard_collapsed_ids";

function loadCollapsedCardIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_CARD_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((id): id is string => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsedCardIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSED_CARD_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode
  }
}

/* ── Draggable task wrapper ───────────────────────────────────────── */
function DraggableTaskCard({
  task,
  children,
}: {
  task: Task;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      {children}
    </div>
  );
}

/* ── Droppable column wrapper ─────────────────────────────────────── */
function DroppableColumn({
  status,
  children,
}: {
  status: string;
  children: (isOver: boolean) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });
  return (
    <div ref={setNodeRef} className="flex flex-1 flex-col">
      {children(isOver)}
    </div>
  );
}

interface TaskBoardProps {
  tasks: Task[];
  agents: Agent[];
  /** 프로젝트 관리 모달용 전체 에이전트(모든 오피스 팩). 미전달 시 agents 사용 → 선택한 오피스 팩에 해당 직원이 없을 수 있음 */
  projectManagerAgents?: Agent[];
  departments: Department[];
  subtasks: SubTask[];
  onCreateTask: (input: {
    title: string;
    description?: string;
    department_id?: string;
    task_type?: string;
    priority?: number;
    project_id?: string;
    project_path?: string;
    assigned_agent_id?: string;
    workflow_pack_key?: WorkflowPackKey;
  }) => void;
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
  activeWorkflowPackKey?: WorkflowPackKey;
}

export function TaskBoard({
  tasks,
  agents,
  projectManagerAgents,
  departments,
  subtasks,
  onCreateTask,
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
  activeWorkflowPackKey,
}: TaskBoardProps) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState<"board" | "gantt" | "dag">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showBulkHideModal, setShowBulkHideModal] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [search, setSearch] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<Pick<Project, "id" | "name">[]>([]);

  useEffect(() => {
    getProjects({ page_size: 200 })
      .then((res) => setProjects(res.projects.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, []);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [collapsedCardIds, setCollapsedCardIds] = useState<Set<string>>(() => loadCollapsedCardIds());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overColumnStatus, setOverColumnStatus] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const hiddenTaskIds = useMemo(
    () => new Set(tasks.filter((task) => task.hidden === 1).map((task) => task.id)),
    [tasks],
  );

  const hideTask = useCallback(
    (taskId: string) => {
      onUpdateTask(taskId, { hidden: 1 });
    },
    [onUpdateTask],
  );

  const unhideTask = useCallback(
    (taskId: string) => {
      onUpdateTask(taskId, { hidden: 0 });
    },
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
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      const isHidden = hiddenTaskIds.has(task.id);
      if (!showAllTasks && isHidden) return false;
      return true;
    });
  }, [tasks, filterDept, filterType, filterProject, search, hiddenTaskIds, showAllTasks]);

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
      const task = tasks.find((t) => t.id === taskId);
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

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null;

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
      const task = tasks.find((t) => t.id === id);
      if (task && task.status === "in_progress") {
        onStopTask(id);
      }
    }
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, tasks, onStopTask]);

  const handleBatchDelete = useCallback(() => {
    if (!window.confirm(t({ ko: `${selectedTaskIds.size}개 업무를 삭제하시겠습니까?`, en: `Delete ${selectedTaskIds.size} task(s)?`, ja: `${selectedTaskIds.size}件を削除しますか？`, zh: `确定删除 ${selectedTaskIds.size} 个任务？` }))) return;
    for (const id of selectedTaskIds) {
      onDeleteTask(id);
    }
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, onDeleteTask, t]);

  const handleBatchHide = useCallback(() => {
    for (const id of selectedTaskIds) {
      hideTask(id);
    }
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, hideTask]);

  const activeFilterCount = [filterDept, filterType, filterProject, search].filter(Boolean).length;
  const hiddenTaskCount = useMemo(() => {
    let count = 0;
    for (const task of tasks) {
      if (isHideableStatus(task.status) && hiddenTaskIds.has(task.id)) count++;
    }
    return count;
  }, [tasks, hiddenTaskIds]);

  return (
    <motion.div
      className="taskboard-shell flex h-full flex-col gap-4 p-3 sm:p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "linear" }}
    >
      <div className="flex flex-wrap items-center gap-3" style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.75rem" }}>
        <h1
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}
        >
          {t({ ko: "업무 보드", en: "Task Board", ja: "タスクボード", zh: "任务看板" })}
        </h1>
        <span
          className="px-2 py-0.5 text-xs font-mono"
          style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)", border: "1px solid var(--th-border)", borderRadius: "2px" }}
        >
          {filteredTasks.length} {t({ ko: "건", en: "tasks", ja: "件", zh: "项" })}
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilterDept("");
              setFilterType("");
              setFilterProject("");
              setSearch("");
            }}
            className="px-3 py-1.5 text-xs font-medium font-mono transition-colors hover:opacity-90"
            style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-surface)" }}
          >
            {t({ ko: "필터 초기화", en: "Reset filters", ja: "フィルターリセット", zh: "重置筛选" })}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAllTasks((prev) => !prev)}
          className={`px-3 py-1.5 text-xs font-medium font-mono transition-colors ${
            showAllTasks
              ? "border-[rgba(251,191,36,0.5)] bg-[rgba(251,191,36,0.1)] text-[var(--th-accent)]"
              : "border-[var(--th-border)] bg-[var(--th-bg-surface)] text-[var(--th-text-secondary)] hover:bg-[var(--th-bg-surface-hover)]"
          }`}
            title={
              showAllTasks
                ? t({
                    ko: "진행중 보기로 전환 (숨김 제외)",
                    en: "Switch to active view (exclude hidden)",
                    ja: "進行中表示へ切替（非表示を除外）",
                    zh: "切换到进行中视图（排除隐藏）",
                  })
                : t({
                    ko: "모두보기로 전환 (숨김 포함)",
                    en: "Switch to all view (include hidden)",
                    ja: "全体表示へ切替（非表示を含む）",
                    zh: "切换到全部视图（包含隐藏）",
                  })
            }
          >
            <span className={showAllTasks ? "opacity-60" : ""} style={{ color: "var(--th-text-secondary)" }}>
              {t({ ko: "진행중", en: "Active", ja: "進行中", zh: "进行中" })}
            </span>
            <span className="mx-1 opacity-50" style={{ color: "var(--th-text-muted)" }}>/</span>
            <span className={showAllTasks ? "" : "opacity-60"} style={{ color: "var(--th-text-secondary)" }}>
              {t({ ko: "모두보기", en: "All", ja: "すべて", zh: "全部" })}
            </span>
            <span
              className="ml-1 px-1.5 py-0.5 text-[10px] font-medium font-mono"
              style={{ borderRadius: "2px", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
            >
              {hiddenTaskCount}
            </span>
          </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center" style={{ border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className="px-2.5 py-1 text-xs transition-colors"
              style={{
                fontFamily: "var(--th-font-mono)",
                background: viewMode === "board" ? "var(--th-accent)" : "transparent",
                color: viewMode === "board" ? "#000" : "var(--th-text-secondary)",
                borderRight: "1px solid var(--th-border)",
              }}
            >
              {t({ ko: "보드", en: "BOARD", ja: "ボード", zh: "看板" })}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("gantt")}
              className="px-2.5 py-1 text-xs transition-colors"
              style={{
                fontFamily: "var(--th-font-mono)",
                background: viewMode === "gantt" ? "var(--th-accent)" : "transparent",
                color: viewMode === "gantt" ? "#000" : "var(--th-text-secondary)",
                borderRight: "1px solid var(--th-border)",
              }}
            >
              {t({ ko: "간트", en: "GANTT", ja: "ガント", zh: "甘特" })}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("dag")}
              className="px-2.5 py-1 text-xs transition-colors"
              style={{
                fontFamily: "var(--th-font-mono)",
                background: viewMode === "dag" ? "var(--th-accent)" : "transparent",
                color: viewMode === "dag" ? "#000" : "var(--th-text-secondary)",
              }}
            >
              {t({ ko: "그래프", en: "DAG", ja: "グラフ", zh: "图谱" })}
            </button>
          </div>
          <button
            type="button"
            onClick={toggleBatchMode}
            className="px-3 py-1.5 text-xs font-mono uppercase transition-colors hover:opacity-90"
            style={{
              borderRadius: "2px",
              border: batchMode ? "1px solid rgba(251,191,36,0.5)" : "1px solid var(--th-border)",
              color: batchMode ? "var(--th-accent)" : "var(--th-text-secondary)",
              background: batchMode ? "rgba(251,191,36,0.08)" : "var(--th-bg-surface)",
            }}
            title={t({ ko: "일괄 선택 모드", en: "Batch select mode", ja: "一括選択モード", zh: "批量选择模式" })}
          >
            {batchMode
              ? t({ ko: "선택 취소", en: "CANCEL", ja: "キャンセル", zh: "取消" })
              : t({ ko: "일괄 선택", en: "SELECT", ja: "一括", zh: "批量" })}
          </button>
          <button
            type="button"
            onClick={() => setShowBulkHideModal(true)}
            className="px-3 py-1.5 text-xs font-mono uppercase transition-colors hover:opacity-90"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-surface)" }}
            title={t({
              ko: "완료/보류/취소 상태 업무 숨기기",
              en: "Hide done/pending/cancelled tasks",
              ja: "完了/保留/キャンセル状態を非表示",
              zh: "隐藏完成/待处理/已取消任务",
            })}
          >
            {t({ ko: "숨김 관리", en: "HIDE", ja: "非表示", zh: "隐藏" })}
          </button>
          <button
            type="button"
            onClick={() => setShowProjectManager(true)}
            className="px-3 py-1.5 text-xs font-mono uppercase transition-colors hover:opacity-90"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-heading)", background: "var(--th-bg-surface)" }}
          >
            {t({ ko: "프로젝트", en: "PROJ", ja: "プロジェクト", zh: "项目" })}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-1.5 text-xs font-mono font-bold uppercase transition-colors hover:opacity-90"
            style={{ borderRadius: "2px", background: "var(--th-accent)", color: "#000" }}
          >
            + {t({ ko: "새 업무", en: "NEW", ja: "新規", zh: "新建" })}
          </button>
        </div>
      </div>

      <FilterBar
        departments={departments}
        projects={projects}
        filterDept={filterDept}
        filterType={filterType}
        filterProject={filterProject}
        search={search}
        onFilterDept={setFilterDept}
        onFilterType={setFilterType}
        onFilterProject={setFilterProject}
        onSearch={setSearch}
      />

      {viewMode === "dag" ? (
        <div className="flex-1 overflow-hidden">
          <DependencyGraph tasks={filteredTasks} onOpenTerminal={onOpenTerminal} />
        </div>
      ) : viewMode === "gantt" ? (
        <div className="flex-1 overflow-auto pb-2">
          <GanttChart tasks={filteredTasks} agents={agents} departments={departments} />
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2 sm:flex-row sm:overflow-x-auto sm:overflow-y-hidden">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByStatus[column.status] ?? [];
            const isCollapsed = collapsedColumns.has(column.status);
            const isDragOver = overColumnStatus === column.status;
            return (
              <div
                key={column.status}
                className={`taskboard-column flex flex-col border transition-all duration-200 ${
                  isCollapsed ? "w-full sm:w-14 sm:flex-shrink-0" : "w-full sm:w-72 sm:flex-shrink-0"
                } ${column.borderColor} ${isDragOver ? "ring-2 ring-[rgba(251,191,36,0.5)]" : ""}`}
                style={{
                  background: isDragOver ? "var(--th-bg-surface-hover)" : "var(--th-bg-surface)",
                  borderColor: isDragOver ? "var(--th-border)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleColumn(column.status)}
                  className={`flex items-center gap-2 px-3 py-2 w-full text-left transition-opacity hover:opacity-90 ${column.headerBg}`}
                  style={{ borderBottom: "1px solid var(--th-border)" }}
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 ${column.dotColor}`} style={{ borderRadius: "1px" }} />
                  {!isCollapsed && (
                    <span
                      className="flex-1 text-xs font-bold uppercase tracking-wider"
                      style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}
                    >
                      {taskStatusLabel(column.status, t)}
                    </span>
                  )}
                  <span
                    className="px-1.5 py-0.5 text-xs font-mono font-bold"
                    style={{ background: "rgba(0,0,0,0.25)", color: "var(--th-text-heading)", borderRadius: "2px" }}
                  >
                    {columnTasks.length}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{isCollapsed ? "▸" : "▾"}</span>
                </button>

                {isCollapsed ? (
                  /* Collapsed body — vertical label, click to expand */
                  <DroppableColumn status={column.status}>
                    {() => (
                      <button
                        type="button"
                        onClick={() => toggleColumn(column.status)}
                        className="flex flex-1 items-center justify-center py-4 sm:py-0"
                      >
                        <span
                          className="text-sm sm:[writing-mode:vertical-lr] sm:rotate-180 font-medium tracking-wider select-none"
                          style={{ color: "var(--th-text-muted)" }}
                        >
                          {taskStatusLabel(column.status, t)}
                        </span>
                      </button>
                    )}
                  </DroppableColumn>
                ) : (
                  /* Expanded body — droppable zone with cards */
                  <DroppableColumn status={column.status}>
                    {(isOver) => (
                      <div className="flex flex-col gap-2.5 p-2.5 sm:flex-1 sm:overflow-y-auto">
                        {columnTasks.length === 0 ? (
                          <div
                            className="flex min-h-24 flex-col items-center justify-center rounded border border-dashed py-6 sm:flex-1 transition-colors"
                            style={{
                              borderColor: isOver ? "var(--th-accent)" : "var(--th-border)",
                              background: isOver ? "var(--th-bg-surface-hover)" : "transparent",
                            }}
                          >
                            {isOver ? (
                              <span className="font-mono text-xs" style={{ color: "var(--th-accent)" }}>
                                {t({ ko: "여기에 놓기", en: "drop here", ja: "ここにドロップ", zh: "放在这里" })}
                              </span>
                            ) : (
                              <div className="terminal-empty-state py-2">
                                <p className="terminal-empty-state-cmd">$ ls tasks/</p>
                                <p className="terminal-empty-state-result">(empty)</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          columnTasks.map((task) => {
                            const isSelected = selectedTaskIds.has(task.id);
                            const cardEl = (
                              <div className="relative">
                                {batchMode && (
                                  <>
                                    <div
                                      className="absolute inset-0 z-10 cursor-pointer"
                                      style={{ borderRadius: "2px", background: isSelected ? "rgba(251,191,36,0.08)" : "transparent", border: isSelected ? "2px solid rgba(251,191,36,0.6)" : "2px solid transparent" }}
                                      onClick={() => toggleTaskSelection(task.id)}
                                    />
                                    <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                      <div
                                        className="h-4 w-4 flex items-center justify-center"
                                        style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.7)", background: isSelected ? "var(--th-accent)" : "var(--th-bg-surface)" }}
                                      >
                                        {isSelected && <span className="text-[9px] font-bold text-black">✓</span>}
                                      </div>
                                    </div>
                                  </>
                                )}
                                <div className={batchMode ? "pointer-events-none" : ""}>
                                  <TaskCard
                                    task={task}
                                    agents={agents}
                                    departments={departments}
                                    taskSubtasks={subtasksByTask[task.id] ?? []}
                                    isHiddenTask={hiddenTaskIds.has(task.id)}
                                    cardCollapsed={collapsedCardIds.has(task.id)}
                                    onToggleCardCollapsed={toggleCardCollapsed}
                                    onUpdateTask={onUpdateTask}
                                    onDeleteTask={onDeleteTask}
                                    onAssignTask={onAssignTask}
                                    onRunTask={onRunTask}
                                    onStopTask={onStopTask}
                                    onPauseTask={onPauseTask}
                                    onResumeTask={onResumeTask}
                                    onOpenTerminal={onOpenTerminal}
                                    onOpenMeetingMinutes={onOpenMeetingMinutes}
                                    onMergeTask={onMergeTask}
                                    onDiscardTask={onDiscardTask}
                                    onHideTask={hideTask}
                                    onUnhideTask={unhideTask}
                                  />
                                </div>
                              </div>
                            );
                            return batchMode ? (
                              <div key={task.id}>{cardEl}</div>
                            ) : (
                              <DraggableTaskCard key={task.id} task={task}>{cardEl}</DraggableTaskCard>
                            );
                          })
                        )}
                      </div>
                    )}
                  </DroppableColumn>
                )}
              </div>
            );
          })}
        </div>

        {/* Batch action bar */}
        {batchMode && (
          <div
            className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 mt-1"
            style={{ borderTop: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderRadius: "2px" }}
          >
            <button
              type="button"
              onClick={() => setSelectedTaskIds(new Set(filteredTasks.map((t) => t.id)))}
              className="text-xs font-mono transition-colors hover:opacity-80"
              style={{ color: "var(--th-text-muted)" }}
            >
              {t({ ko: "전체 선택", en: "Select all", ja: "全選択", zh: "全选" })} ({filteredTasks.length})
            </button>
            <span style={{ color: "var(--th-border)" }}>·</span>
            <button
              type="button"
              onClick={() => setSelectedTaskIds(new Set())}
              className="text-xs font-mono transition-colors hover:opacity-80"
              style={{ color: "var(--th-text-muted)" }}
              disabled={selectedTaskIds.size === 0}
            >
              {t({ ko: "선택 해제", en: "Clear", ja: "解除", zh: "清除" })}
            </button>
            <span className="text-xs font-mono ml-1" style={{ color: "var(--th-accent)" }}>
              {selectedTaskIds.size > 0 && `${selectedTaskIds.size} ${t({ ko: "선택됨", en: "selected", ja: "選択中", zh: "已选" })}`}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchStop}
                disabled={selectedTaskIds.size === 0}
                className="px-3 py-1 text-xs font-mono uppercase disabled:opacity-30"
                style={{ borderRadius: "2px", border: "1px solid rgba(251,191,36,0.4)", color: "var(--th-accent)", background: "rgba(251,191,36,0.06)" }}
              >
                {t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })}
              </button>
              <button
                type="button"
                onClick={handleBatchHide}
                disabled={selectedTaskIds.size === 0}
                className="px-3 py-1 text-xs font-mono uppercase disabled:opacity-30"
                style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-surface)" }}
              >
                {t({ ko: "숨김", en: "Hide", ja: "非表示", zh: "隐藏" })}
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={selectedTaskIds.size === 0}
                className="px-3 py-1 text-xs font-mono uppercase disabled:opacity-30"
                style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.4)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.06)" }}
              >
                {t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            </div>
          </div>
        )}

        {/* Drag overlay — floating card that follows the cursor */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeTask ? (
            <div className="w-72 rotate-2 scale-105 opacity-90">
              <TaskCard
                task={activeTask}
                agents={agents}
                departments={departments}
                taskSubtasks={subtasksByTask[activeTask.id] ?? []}
                isHiddenTask={hiddenTaskIds.has(activeTask.id)}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAssignTask={onAssignTask}
                onRunTask={onRunTask}
                onStopTask={onStopTask}
                onPauseTask={onPauseTask}
                onResumeTask={onResumeTask}
                onOpenTerminal={onOpenTerminal}
                onOpenMeetingMinutes={onOpenMeetingMinutes}
                onMergeTask={onMergeTask}
                onDiscardTask={onDiscardTask}
                onHideTask={hideTask}
                onUnhideTask={unhideTask}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {showCreate && (
        <CreateTaskModal
          agents={projectManagerAgents ?? agents}
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreate={onCreateTask}
          onAssign={onAssignTask}
          activeWorkflowPackKey={activeWorkflowPackKey}
        />
      )}

      {showProjectManager && (
        <ProjectManagerModal
          agents={projectManagerAgents ?? agents}
          departments={departments}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {showBulkHideModal && (
        <BulkHideModal
          tasks={tasks}
          hiddenTaskIds={hiddenTaskIds}
          onClose={() => setShowBulkHideModal(false)}
          onApply={(statuses) => {
            hideByStatuses(statuses);
            setShowBulkHideModal(false);
          }}
        />
      )}
    </motion.div>
  );
}

export default TaskBoard;
