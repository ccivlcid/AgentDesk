import { motion } from "framer-motion";
import ProjectManagerModal from "../ProjectManagerModal";
import BulkHideModal from "../taskboard/BulkHideModal";
import FilterBar from "../taskboard/FilterBar";
import DependencyGraph from "../taskboard/DependencyGraph";
import GanttChart from "../taskboard/GanttChart";
import { TaskBoardKanban } from "./TaskBoardKanban";
import { TaskBoardStatusBar } from "./TaskBoardStatusBar";
import { TaskBoardToolbar } from "./TaskBoardToolbar";
import type { TaskBoardProps } from "./types";
import { useTaskBoard } from "./useTaskBoard";

export function TaskBoard(props: TaskBoardProps) {
  const state = useTaskBoard(props);
  const {
    t,
    mono,
    viewMode,
    departments,
    projects,
    filterDept,
    filterType,
    filterProject,
    filterExecution,
    search,
    setFilterDept,
    setFilterType,
    setFilterProject,
    handleFilterExecution,
    setSearch,
    filteredTasks,
    currentProject,
    showProjectManager,
    setShowProjectManager,
    showBulkHideModal,
    setShowBulkHideModal,
    tasks,
    hiddenTaskIds,
    hideByStatuses,
    agents,
    projectManagerAgents,
    onOpenTerminal,
    onProjectCreate,
  } = state;

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
      <TaskBoardToolbar state={state} />
      <TaskBoardStatusBar state={state} />

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
          <p style={{ ...mono, fontSize: "11px", color: "var(--th-text-secondary)" }}>
            {t({ ko: "아직 업무가 없습니다.", en: "No tasks yet.", ja: "タスクなし", zh: "暂无任务" })}
          </p>
        </div>
      ) : (
        <TaskBoardKanban state={state} />
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
