import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [viewMode, setViewMode] = useState<"board" | "gantt">("board");
  const [showCreate, setShowCreate] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showBulkHideModal, setShowBulkHideModal] = useState(false);
  const [filterDept, setFilterDept] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [search, setSearch] = useState("");
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
      if (filterAgent && task.assigned_agent_id !== filterAgent) return false;
      if (filterType && task.task_type !== filterType) return false;
      if (filterProject && task.project_id !== filterProject) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      const isHidden = hiddenTaskIds.has(task.id);
      if (!showAllTasks && isHidden) return false;
      return true;
    });
  }, [tasks, filterDept, filterAgent, filterType, filterProject, search, hiddenTaskIds, showAllTasks]);

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

  const activeFilterCount = [filterDept, filterAgent, filterType, filterProject, search].filter(Boolean).length;
  const hiddenTaskCount = useMemo(() => {
    let count = 0;
    for (const task of tasks) {
      if (isHideableStatus(task.status) && hiddenTaskIds.has(task.id)) count++;
    }
    return count;
  }, [tasks, hiddenTaskIds]);

  return (
    <div className="taskboard-shell flex h-full flex-col gap-4 p-3 sm:p-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--th-text-heading)" }}>
            {t({ ko: "업무 보드", en: "Task Board", ja: "タスクボード", zh: "任务看板" })}
          </h1>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
          >
            {t({ ko: "총", en: "Total", ja: "合計", zh: "总计" })} {filteredTasks.length}
            {t({ ko: "개", en: "", ja: "件", zh: "项" })}
            {activeFilterCount > 0 &&
              ` · ${t({ ko: "필터", en: "filters", ja: "フィルター", zh: "筛选" })} ${activeFilterCount}`}
          </span>
        </div>
        <p className="mt-0.5 text-sm" style={{ color: "var(--th-text-muted)" }}>
          {t({
            ko: "상태별로 업무를 드래그하여 관리합니다.",
            en: "Drag and manage tasks by status.",
            ja: "ステータスごとにタスクをドラッグして管理します。",
            zh: "按状态拖拽管理任务。",
          })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilterDept("");
              setFilterAgent("");
              setFilterType("");
              setFilterProject("");
              setSearch("");
            }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-surface)" }}
          >
            {t({ ko: "필터 초기화", en: "Reset filters", ja: "フィルターリセット", zh: "重置筛选" })}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAllTasks((prev) => !prev)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showAllTasks
              ? "border-blue-500/50 bg-blue-500/15 text-blue-600 [.dark_theme_*]:text-blue-400"
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
              className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}
            >
              {hiddenTaskCount}
            </span>
          </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center bg-[var(--th-bg-surface)] border border-[var(--th-border)] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === "board" ? "bg-sky-600 text-white" : "text-[var(--th-text-secondary)] hover:text-[var(--th-text-heading)]"
              }`}
            >
              {t({ ko: "보드", en: "Board", ja: "ボード", zh: "看板" })}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("gantt")}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                viewMode === "gantt" ? "bg-sky-600 text-white" : "text-[var(--th-text-secondary)] hover:text-[var(--th-text-heading)]"
              }`}
            >
              {t({ ko: "간트", en: "Gantt", ja: "ガント", zh: "甘特" })}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowBulkHideModal(true)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)", background: "var(--th-bg-surface)" }}
            title={t({
              ko: "완료/보류/취소 상태 업무 숨기기",
              en: "Hide done/pending/cancelled tasks",
              ja: "完了/保留/キャンセル状態を非表示",
              zh: "隐藏完成/待处理/已取消任务",
            })}
          >
            {t({ ko: "숨김 관리", en: "Hide", ja: "非表示", zh: "隐藏" })}
          </button>
          <button
            type="button"
            onClick={() => setShowProjectManager(true)}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
            style={{ borderColor: "var(--th-border)", color: "var(--th-text-heading)", background: "var(--th-bg-surface)" }}
          >
            {t({ ko: "프로젝트", en: "Projects", ja: "プロジェクト", zh: "项目" })}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: "var(--th-accent, #2563eb)", color: "var(--th-text-heading)" }}
          >
            + {t({ ko: "새 업무", en: "New task", ja: "新規タスク", zh: "新建任务" })}
          </button>
        </div>
      </div>

      <FilterBar
        agents={agents}
        departments={departments}
        projects={projects}
        filterDept={filterDept}
        filterAgent={filterAgent}
        filterType={filterType}
        filterProject={filterProject}
        search={search}
        onFilterDept={setFilterDept}
        onFilterAgent={setFilterAgent}
        onFilterType={setFilterType}
        onFilterProject={setFilterProject}
        onSearch={setSearch}
      />

      {viewMode === "gantt" ? (
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
                className={`taskboard-column flex flex-col rounded-xl border transition-all duration-200 ${
                  isCollapsed ? "w-full sm:w-14 sm:flex-shrink-0" : "w-full sm:w-72 sm:flex-shrink-0"
                } ${column.borderColor} ${isDragOver ? "ring-2 ring-blue-400/50" : ""}`}
                style={{
                  background: isDragOver ? "var(--th-bg-surface-hover)" : "var(--th-bg-surface)",
                  borderColor: isDragOver ? "var(--th-border)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleColumn(column.status)}
                  className={`flex items-center gap-2 rounded-t-xl px-3.5 py-2.5 w-full text-left transition-opacity hover:opacity-90 ${column.headerBg}`}
                >
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${column.dotColor}`} />
                  {!isCollapsed && (
                    <span className="flex-1 text-sm font-semibold" style={{ color: "var(--th-text-heading)" }}>
                      {taskStatusLabel(column.status, t)}
                    </span>
                  )}
                  <span
                    className="rounded-full bg-black/25 px-2 py-0.5 text-xs font-semibold"
                    style={{ color: "var(--th-text-heading)" }}
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
                            className="flex min-h-24 items-center justify-center rounded-lg border border-dashed py-8 text-xs sm:flex-1 transition-colors"
                            style={{
                              borderColor: isOver ? "var(--th-accent, #2563eb)" : "var(--th-border)",
                              background: isOver ? "var(--th-bg-surface-hover)" : "transparent",
                              color: isOver ? "var(--th-text-secondary)" : "var(--th-text-muted)",
                            }}
                          >
                            {isOver
                              ? t({ ko: "여기에 놓기", en: "Drop here", ja: "ここにドロップ", zh: "放在这里" })
                              : t({ ko: "업무 없음", en: "No tasks", ja: "タスクなし", zh: "暂无任务" })}
                          </div>
                        ) : (
                          columnTasks.map((task) => (
                            <DraggableTaskCard key={task.id} task={task}>
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
                            </DraggableTaskCard>
                          ))
                        )}
                      </div>
                    )}
                  </DroppableColumn>
                )}
              </div>
            );
          })}
        </div>

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
          agents={agents}
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreate={onCreateTask}
          onAssign={onAssignTask}
          activeWorkflowPackKey={activeWorkflowPackKey}
        />
      )}

      {showProjectManager && (
        <ProjectManagerModal agents={agents} departments={departments} onClose={() => setShowProjectManager(false)} />
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
    </div>
  );
}

export default TaskBoard;
