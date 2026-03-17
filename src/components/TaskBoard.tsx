import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./ui";
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
import type { Agent, Department, Project, SubTask, Task, TaskExecutionState, TaskStatus } from "../types";
import { useConfirm } from "./ui/ConfirmDialog";
import ProjectManagerModal from "./ProjectManagerModal";
import BulkHideModal from "./taskboard/BulkHideModal";
import CreateTaskModal from "./taskboard/CreateTaskModal";
import AppWindow from "./windows/AppWindow";
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
    <div ref={setNodeRef} className="flex flex-1 flex-col min-h-0">
      {children(isOver)}
    </div>
  );
}

interface TaskBoardProps {
  tasks: Task[];
  agents: Agent[];
  currentProject?: import("../types").Project | null;
  /** 프로젝트 관리 모달용 전체 에이전트(모든 워크플로 팩). 미전달 시 agents 사용 → 선택한 워크플로 팩에 해당 직원이 없을 수 있음 */
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
    workflow_pack_key?: string;
    context_hint?: string;
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
  onProjectCreate?: () => void;
}

export function TaskBoard({
  tasks,
  agents,
  currentProject,
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
  onProjectCreate,
}: TaskBoardProps) {
  const { t } = useI18n();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const packVocab = { task: t({ ko: "업무", en: "Task", ja: "タスク", zh: "任务" }), tasks: t({ ko: "업무", en: "Tasks", ja: "タスク", zh: "任务" }) };
  const [viewMode, setViewMode] = useState<"board" | "gantt" | "dag">("board");
  const [showCreate, setShowCreate] = useState(false);
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
      .catch(() => { showToast(t({ ko: "프로젝트 불러오기에 실패했습니다", en: "Failed to load projects", ja: "プロジェクトの読み込みに失敗しました", zh: "加载项目失败" }), "error"); });
  }, [showToast]);

  // Sync project filter when sidebar project selection changes
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

  const handleBatchDelete = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: "업무 일괄 삭제", en: "Delete Tasks", ja: "タスクの一括削除", zh: "批量删除任务" }),
      message: t({ ko: `${selectedTaskIds.size}개 업무를 삭제하시겠습니까?`, en: `Delete ${selectedTaskIds.size} task(s)?`, ja: `${selectedTaskIds.size}件を削除しますか？`, zh: `确定删除 ${selectedTaskIds.size} 个任务？` }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      cancelLabel: t({ ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" }),
      variant: "danger",
    });
    if (!ok) return;
    for (const id of selectedTaskIds) {
      onDeleteTask(id);
    }
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, onDeleteTask, confirm, t]);

  const handleBatchHide = useCallback(() => {
    for (const id of selectedTaskIds) {
      hideTask(id);
    }
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

  // 상태별 카운트 (status summary bar용)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of filteredTasks) {
      counts[task.status] = (counts[task.status] ?? 0) + 1;
    }
    return counts;
  }, [filteredTasks]);

  const STATUS_CODE: Record<string, { code: string; color: string }> = {
    inbox:        { code: t({ ko: "수신", en: "INBOX",  ja: "受信", zh: "收件" }), color: "var(--th-status-muted)" },
    planned:      { code: t({ ko: "계획", en: "PLAN",   ja: "計画", zh: "计划" }), color: "var(--th-status-info)" },
    collaborating:{ code: t({ ko: "협업", en: "COLLAB", ja: "協働", zh: "协作" }), color: "var(--th-status-purple)" },
    in_progress:  { code: t({ ko: "진행", en: "WIP",    ja: "進行", zh: "进行" }), color: "var(--th-status-success)" },
    review:       { code: t({ ko: "검토", en: "REV",    ja: "レビュー", zh: "审核" }), color: "var(--th-status-purple)" },
    done:         { code: t({ ko: "완료", en: "DONE",   ja: "完了", zh: "完成" }), color: "var(--th-status-muted)" },
    pending:      { code: t({ ko: "보류", en: "HOLD",   ja: "保留", zh: "待处理" }), color: "var(--th-status-warning)" },
    cancelled:    { code: t({ ko: "취소", en: "VOID",   ja: "中止", zh: "取消" }), color: "var(--th-status-muted)" },
  };

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const btnBase: React.CSSProperties = {
    ...mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
    padding: "3px 9px", border: "1px solid var(--th-border)",
    background: "transparent", color: "var(--th-text-muted)", cursor: "pointer",
  };

  return (
    <motion.div
      className="taskboard-shell flex h-full min-h-0 flex-col"
      style={{
        gap: 0,
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "linear" }}
    >
      {/* ── 터미널 타이틀 바 (설정과 동일 macOS) ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between"
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span style={{ ...mono, fontSize: "11px", color: "var(--th-accent)", fontWeight: 700 }}>$</span>
          <span style={{ ...mono, fontSize: "11px", color: "var(--th-text-secondary)", whiteSpace: "nowrap" }}>
            task-queue list
            {currentProject && (
              <span style={{ color: "var(--th-accent)" }}> --project=<span style={{ color: "var(--th-status-info)" }}>{currentProject.name}</span></span>
            )}
            {!showAllTasks && <span style={{ color: "var(--th-text-muted)" }}> --active</span>}
            {activeFilterCount > 0 && <span style={{ color: "var(--th-status-warning)" }}> --filter={activeFilterCount}</span>}
          </span>
          <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", padding: "1px 5px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", borderRadius: 6 }}>
            {filteredTasks.length} {t({ ko: "건", en: "tasks", ja: "件", zh: "项" })}
          </span>
        </div>

        {/* 뷰 모드 토글 + 주요 버튼 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 뷰 모드 */}
          <div className="flex" style={{ border: "1px solid var(--th-border)", borderRadius: 6, overflow: "hidden" }}>
            {(["board", "gantt", "dag"] as const).map((mode, i) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  ...mono, fontSize: "10px", fontWeight: 700,
                  padding: "3px 8px",
                  background: viewMode === mode ? "var(--th-accent)" : "transparent",
                  color: viewMode === mode ? "var(--th-accent-text)" : "var(--th-text-muted)",
                  borderRight: i < 2 ? "1px solid var(--th-border)" : "none",
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  borderRadius: 0,
                }}
              >
                {mode === "board" ? t({ ko: "보드", en: "BOARD", ja: "ボード", zh: "看板" })
                  : mode === "gantt" ? t({ ko: "간트", en: "GANTT", ja: "ガント", zh: "甘特" })
                  : "DAG"}
              </button>
            ))}
          </div>

          <button type="button" onClick={toggleBatchMode} style={{ ...btnBase, ...(batchMode ? { borderColor: "rgba(245,158,11,0.4)", color: "var(--th-accent)", background: "rgba(245,158,11,0.06)" } : {}) }}>
            {batchMode ? t({ ko: "취소", en: "CANCEL", ja: "取消", zh: "取消" }) : t({ ko: "일괄", en: "SELECT", ja: "一括", zh: "批量" })}
          </button>
          <button type="button" onClick={() => setShowBulkHideModal(true)} style={btnBase}>
            {t({ ko: "숨김", en: "HIDE", ja: "非表示", zh: "隐藏" })}
          </button>
          <button type="button" onClick={() => setShowProjectManager(true)} style={btnBase}>
            {t({ ko: "프로젝트", en: "PROJ", ja: "PJ", zh: "项目" })}
          </button>
          {onProjectCreate && (
            <button type="button" onClick={onProjectCreate} style={btnBase}>
              + {t({ ko: "새 프로젝트", en: "NEW PROJ", ja: "新規PJ", zh: "新项目" })}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{ ...mono, fontSize: "11px", fontWeight: 700, padding: "3px 14px", borderRadius: 6, background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}
          >
            + {t({ ko: "새 업무", en: "NEW TASK", ja: "新規", zh: "新建" })}
          </button>
        </div>
      </div>

      {/* ── 상태 요약 바 ── */}
      <div
        className="flex-shrink-0 flex items-center gap-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
      >
        {COLUMNS.map((col, i) => {
          const sc = STATUS_CODE[col.status];
          const count = statusCounts[col.status] ?? 0;
          return (
            <div
              key={col.status}
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{ borderRight: i < COLUMNS.length - 1 ? "1px solid var(--th-border)" : "none", flexShrink: 0 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: count > 0 ? sc.color : "var(--th-border)", display: "inline-block", flexShrink: 0 }} />
              <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: count > 0 ? sc.color : "var(--th-text-muted)", letterSpacing: "0.06em" }}>
                {sc.code}
              </span>
              <span style={{ ...mono, fontSize: "9px", color: count > 0 ? "var(--th-text-secondary)" : "var(--th-text-muted)", fontWeight: count > 0 ? 700 : 400 }}>
                {count}
              </span>
            </div>
          );
        })}
        {/* 숨김/전체 토글 */}
        <button
          type="button"
          onClick={() => setShowAllTasks((prev) => !prev)}
          style={{
            ...mono, fontSize: "9px", padding: "0 12px", height: "100%",
            borderRadius: 6,
            background: showAllTasks ? "rgba(245,158,11,0.06)" : "transparent",
            color: showAllTasks ? "var(--th-accent)" : "var(--th-text-muted)",
            borderTop: "none", borderBottom: "none", borderRight: "none", borderLeft: "1px solid var(--th-border)", cursor: "pointer", flexShrink: 0, fontWeight: 700,
          }}
        >
          {showAllTasks
            ? t({ ko: "전체", en: "ALL", ja: "全", zh: "全" })
            : t({ ko: "진행중", en: "ACTIVE", ja: "進行", zh: "进行" })}
          {hiddenTaskCount > 0 && <span style={{ marginLeft: 4, opacity: 0.6 }}>({hiddenTaskCount})</span>}
        </button>
      </div>

      {/* ── 필터 바 ── */}
      <div className="flex-shrink-0" style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>

        <FilterBar
          departments={departments}
          projects={projects}
          filterDept={filterDept}
          filterType={filterType}
          filterProject={filterProject}
          filterExecution={filterExecution}
          search={search}
          onFilterDept={setFilterDept}
          onFilterType={setFilterType}
          onFilterProject={setFilterProject}
          onFilterExecution={handleFilterExecution}
          onSearch={setSearch}
        />
      </div>

      {viewMode === "dag" ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <DependencyGraph tasks={filteredTasks} onOpenTerminal={onOpenTerminal} />
        </div>
      ) : viewMode === "gantt" ? (
        <div className="flex-1 overflow-auto pb-2">
          <GanttChart tasks={filteredTasks} agents={agents} departments={departments} />
        </div>
      ) : filteredTasks.length === 0 && filterProject ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", marginBottom: 4 }}>
            <span style={{ color: "var(--th-accent)" }}>$</span> task-queue list --project={currentProject?.name ?? "?"} <span className="animate-pulse">▌</span>
          </p>
          <p style={{ ...mono, fontSize: "11px", color: "var(--th-text-secondary)", marginBottom: 16 }}>
            {t({ ko: "아직 업무가 없습니다.", en: "No tasks yet.", ja: "タスクなし", zh: "暂无任务" })}
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            style={{ ...mono, fontSize: "11px", fontWeight: 700, padding: "5px 18px", borderRadius: 6, background: "var(--th-accent)", color: "var(--th-accent-text)", border: "none", cursor: "pointer" }}
          >
            + {t({ ko: "첫 업무 만들기", en: "Create first task", ja: "最初のタスク作成", zh: "创建第一个任务" })}
          </button>
        </div>
      ) : (
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-4 pt-1 sm:flex-row sm:overflow-x-auto sm:overflow-y-hidden sm:gap-6 sm:pb-4 sm:px-1">
          {COLUMNS.map((column) => {
            const columnTasks = tasksByStatus[column.status] ?? [];
            const isCollapsed = collapsedColumns.has(column.status);
            const isDragOver = overColumnStatus === column.status;
            const sc = STATUS_CODE[column.status];
            return (
              <div
                key={column.status}
                className={`taskboard-column flex flex-col transition-all duration-200 sm:min-h-0 ${
                  isCollapsed ? "w-full sm:w-12 sm:flex-shrink-0" : "w-full sm:w-72 sm:flex-shrink-0"
                }`}
                style={{
                  border: isDragOver ? `1px solid ${sc?.color ?? "var(--th-border)"}` : "1px solid var(--th-border)",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: isDragOver ? "var(--th-hover-overlay-subtle)" : "var(--th-bg-surface)",
                  outline: isDragOver ? `1px solid ${sc?.color ?? "transparent"}` : "none",
                  boxShadow: isDragOver ? `0 8px 24px rgba(0,0,0,0.12)` : "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                {/* 컬럼 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleColumn(column.status)}
                  className={`flex flex-nowrap items-center gap-1.5 px-3 py-2.5 w-full text-left ${isCollapsed ? "sm:flex-col sm:justify-center sm:gap-1 sm:px-1" : ""}`}
                  style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", borderTopLeftRadius: 10, borderTopRightRadius: 10 }}
                >
                  <span
                    style={{ width: 6, height: 6, borderRadius: "50%", background: sc?.color ?? "#888", flexShrink: 0,
                      ...(column.status === "in_progress" ? { boxShadow: `0 0 4px ${sc?.color}` } : {}) }}
                  />
                  {!isCollapsed && (
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{ ...mono, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", color: sc?.color ?? "var(--th-text-heading)" }}
                    >
                      {taskStatusLabel(column.status as TaskStatus, t)}
                    </span>
                  )}
                  <span
                    style={{
                      ...mono, fontSize: "9px", fontWeight: 700,
                      padding: "0 5px",
                      borderRadius: 6,
                      background: columnTasks.length > 0 ? `${sc?.color}18` : "transparent",
                      color: columnTasks.length > 0 ? sc?.color : "var(--th-text-muted)",
                      border: `1px solid ${columnTasks.length > 0 ? `${sc?.color}40` : "var(--th-border)"}`,
                      flexShrink: 0,
                    }}
                  >
                    {columnTasks.length}
                  </span>
                  {!isCollapsed && (
                    <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0 }}>{isCollapsed ? "▸" : "▾"}</span>
                  )}
                </button>

                {isCollapsed ? (
                  /* Collapsed body — vertical label */
                  <DroppableColumn status={column.status}>
                    {() => (
                      <button
                        type="button"
                        onClick={() => toggleColumn(column.status)}
                        className="flex flex-1 min-h-[5rem] sm:min-h-24 items-center justify-center py-4 sm:py-2"
                      >
                        <span
                          className="text-sm sm:[writing-mode:vertical-lr] sm:rotate-180 font-medium tracking-wider select-none whitespace-nowrap overflow-hidden text-ellipsis max-w-full sm:max-w-none sm:max-h-full"
                          style={{ ...mono, fontSize: "9px", color: sc?.color ?? "var(--th-text-muted)", letterSpacing: "0.1em" }}
                        >
                          {taskStatusLabel(column.status as TaskStatus, t)}
                        </span>
                      </button>
                    )}
                  </DroppableColumn>
                ) : (
                  /* Expanded body */
                  <DroppableColumn status={column.status}>
                    {(isOver) => (
                      <div className="flex flex-col gap-2 p-2" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                        {columnTasks.length === 0 ? (
                          <div
                            className="flex min-h-24 flex-col items-center justify-center py-6 sm:flex-1 transition-colors"
                            style={{
                              borderRadius: 8,
                              border: `1px dashed ${isOver ? sc?.color ?? "var(--th-accent)" : "var(--th-border)"}`,
                              background: isOver ? `${sc?.color}08` : "transparent",
                            }}
                          >
                            {isOver ? (
                              <span style={{ ...mono, fontSize: "10px", color: sc?.color ?? "var(--th-accent)" }}>
                                ▼ {t({ ko: "여기에 놓기", en: "drop here", ja: "ここにドロップ", zh: "放这里" })}
                              </span>
                            ) : (
                              <p style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.5 }}>
                                — {t({ ko: "비어 있음", en: "empty", ja: "空", zh: "空" })} —
                              </p>
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
                                      style={{ borderRadius: 0, background: isSelected ? "rgba(251,191,36,0.08)" : "transparent", border: isSelected ? "2px solid rgba(251,191,36,0.6)" : "2px solid transparent" }}
                                      onClick={() => toggleTaskSelection(task.id)}
                                    />
                                    <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                      <div
                                        className="h-4 w-4 flex items-center justify-center"
                                        style={{ borderRadius: 0, border: "1px solid rgba(251,191,36,0.7)", background: isSelected ? "var(--th-accent)" : "var(--th-bg-surface)" }}
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
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
            style={{ borderTop: "2px solid var(--th-accent)", background: "var(--th-bg-elevated)" }}
          >
            <span style={{ ...mono, fontSize: "10px", color: "var(--th-accent)", fontWeight: 700, marginRight: 4 }}>
              $ batch
            </span>
            <button
              type="button"
              onClick={() => setSelectedTaskIds(new Set(filteredTasks.map((task) => task.id)))}
              style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
            >
              {t({ ko: "전체선택", en: "all", ja: "全選", zh: "全选" })}({filteredTasks.length})
            </button>
            <span style={{ color: "var(--th-border)", fontSize: "10px" }}>·</span>
            <button
              type="button"
              onClick={() => setSelectedTaskIds(new Set())}
              disabled={selectedTaskIds.size === 0}
              style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 4px", opacity: selectedTaskIds.size === 0 ? 0.4 : 1 }}
            >
              {t({ ko: "해제", en: "clear", ja: "解除", zh: "清除" })}
            </button>
            {selectedTaskIds.size > 0 && (
              <span style={{ ...mono, fontSize: "9px", color: "var(--th-accent)", marginLeft: 4, fontWeight: 700 }}>
                [{selectedTaskIds.size} {t({ ko: "선택됨", en: "selected", ja: "選択中", zh: "已选" })}]
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBatchStop}
              disabled={selectedTaskIds.size === 0}
              style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(251,191,36,0.4)", color: "var(--th-accent)", background: "rgba(251,191,36,0.06)", cursor: "pointer", opacity: selectedTaskIds.size === 0 ? 0.3 : 1 }}
            >
              {t({ ko: "중지", en: "STOP", ja: "停止", zh: "停止" })}
            </button>
            <button
              type="button"
              onClick={handleBatchHide}
              disabled={selectedTaskIds.size === 0}
              style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent", cursor: "pointer", opacity: selectedTaskIds.size === 0 ? 0.3 : 1 }}
            >
              {t({ ko: "숨김", en: "HIDE", ja: "非表示", zh: "隐藏" })}
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={selectedTaskIds.size === 0}
              style={{ ...mono, fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(244,63,94,0.4)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.06)", cursor: "pointer", opacity: selectedTaskIds.size === 0 ? 0.3 : 1 }}
            >
              {t({ ko: "삭제", en: "DEL", ja: "削除", zh: "删除" })}
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
        <AppWindow
          windowType="create-task"
          title={t({ ko: "새 업무", en: "New Task", ja: "新規タスク", zh: "新建任务" })}
          emoji="✚"
          defaultWidth={520}
          defaultHeight={700}
          onClose={() => setShowCreate(false)}
        >
          <CreateTaskModal
            agents={projectManagerAgents ?? agents}
            departments={departments}
            onClose={() => setShowCreate(false)}
            onCreate={onCreateTask}
            onAssign={onAssignTask}
            defaultProjectId={currentProject?.id}
          />
        </AppWindow>
      )}

      {showProjectManager && (
        <ProjectManagerModal
          agents={projectManagerAgents ?? agents}
          departments={departments}
          onClose={() => setShowProjectManager(false)}
          onCreateProject={onProjectCreate}
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
