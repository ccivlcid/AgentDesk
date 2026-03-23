import { DndContext, DragOverlay } from "@dnd-kit/core";
import { COLUMNS, taskStatusLabel } from "../taskboard/constants";
import TaskCard from "../taskboard/TaskCard";
import type { TaskStatus } from "../../types";
import { DraggableTaskCard, DroppableColumn } from "./DndWrappers";
import type { TaskBoardState } from "./useTaskBoard";

interface TaskBoardKanbanProps {
  state: TaskBoardState;
}

export function TaskBoardKanban({ state }: TaskBoardKanbanProps) {
  const {
    t,
    mono,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    tasksByStatus,
    collapsedColumns,
    toggleColumn,
    overColumnStatus,
    statusCodeMap,
    batchMode,
    selectedTaskIds,
    setSelectedTaskIds,
    toggleTaskSelection,
    handleBatchStop,
    handleBatchHide,
    handleBatchDelete,
    filteredTasks,
    agents,
    departments,
    subtasksByTask,
    hiddenTaskIds,
    collapsedCardIds,
    toggleCardCollapsed,
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
    hideTask,
    unhideTask,
    activeTask,
  } = state;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div 
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-6 pt-1 sm:flex-row sm:overflow-x-auto sm:overflow-y-hidden sm:gap-6 sm:px-2 custom-scrollbar"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.status] ?? [];
          const isCollapsed = collapsedColumns.has(column.status);
          const isDragOver = overColumnStatus === column.status;
          const sc = statusCodeMap[column.status];
          return (
            <div
              key={column.status}
              className={`taskboard-column flex flex-col transition-all duration-200 sm:min-h-0 ${
                isCollapsed ? "w-full sm:w-12 sm:flex-shrink-0" : "w-full sm:w-80 sm:flex-shrink-0"
              }`}
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 20,
                overflow: "hidden",
                background: isDragOver ? "#EBF5FF" : "#FFFFFF",
                boxShadow: isDragOver ? "0 8px 24px rgba(59, 130, 246, 0.08)" : "0 2px 8px rgba(0,0,0,0.03)",
                margin: "4px 0",
              }}
            >
              <button
                type="button"
                onClick={() => toggleColumn(column.status)}
                className={`flex flex-nowrap items-center gap-2 px-4 py-3.5 w-full text-left ${isCollapsed ? "sm:flex-col sm:justify-center sm:gap-2 sm:px-1" : ""}`}
                style={{ borderBottom: "1px solid #F3F4F6", background: "#F9FAFB" }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: "50%", background: sc?.color ?? "#888", flexShrink: 0,
                    ...(column.status === "in_progress" ? { boxShadow: `0 0 4px ${sc?.color}` } : {}),
                  }}
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

      {batchMode && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
          style={{ borderTop: "2px solid var(--th-accent)", background: "var(--th-bg-elevated)" }}
        >
          <span style={{ ...mono, fontSize: "10px", color: "var(--th-accent)", fontWeight: 700, marginRight: 4 }}>$ batch</span>
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
  );
}
