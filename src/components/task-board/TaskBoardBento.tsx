import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { taskStatusLabel } from "../taskboard/constants";
import TaskCard from "../taskboard/TaskCard";
import { DraggableTaskCard } from "./DndWrappers";
import type { TaskStatus } from "../../types";
import type { TaskBoardState } from "./useTaskBoard";
import { Activity, LayoutGrid, ListTodo, CheckCircle2, AlertCircle, Clock, ArrowUpRight } from "lucide-react";

interface TaskBoardBentoProps {
  state: TaskBoardState;
}

export function TaskBoardBento({ state }: TaskBoardBentoProps) {
  const {
    t,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
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
    activeTask,
  } = state;

  // Modern sorting: Spotlight important tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;
    return (b.created_at ?? 0) - (a.created_at ?? 0);
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 overflow-hidden relative bg-[#F9FAFB]">
        {/* Abstract Background Mesh */}
        <div className="absolute inset-0 pointer-events-none opacity-40" style={{
          background: `
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(16, 185, 129, 0.05) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(245, 158, 11, 0.05) 0px, transparent 50%),
            radial-gradient(at 0% 100%, rgba(99, 102, 241, 0.05) 0px, transparent 50%)
          `
        }} />

        <motion.div 
          layout
          className="h-full overflow-y-auto p-10 custom-scrollbar relative z-10"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gridAutoRows: "min-content",
            gap: "32px",
          }}
        >
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task, idx) => {
              const isInProgress = task.status === "in_progress" || task.status === "collaborating";
              const isSpotlight = isInProgress && idx < 2; // First two in-progress tasks get spotlight
              
              return (
                <motion.div
                  layout
                  key={task.id}
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 25, 
                    delay: idx * 0.03 
                  }}
                  style={{
                    gridColumn: isSpotlight ? "span 2" : "span 1",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <DraggableTaskCard task={task}>
                    <motion.div 
                      whileHover={{ 
                        scale: 1.01,
                        y: -8,
                      }}
                      style={{
                        position: "relative",
                        height: "100%",
                        background: "#FFFFFF",
                        border: "1px solid rgba(0, 0, 0, 0.04)",
                        borderRadius: 32,
                        padding: isSpotlight ? "12px" : "4px",
                        boxShadow: isInProgress 
                          ? "0 20px 40px -12px rgba(59, 130, 246, 0.12), 0 0 1px 0 rgba(0, 0, 0, 0.1)" 
                          : "0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 0 1px 0 rgba(0, 0, 0, 0.05)",
                        transition: "box-shadow 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
                      }}
                    >
                      {/* Spotlight Header Overlay */}
                      {isSpotlight && (
                        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
                          <div style={{
                            position: "absolute",
                            top: 0, left: 0, right: 0, height: "140px",
                            background: "linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, transparent 100%)",
                          }} />
                        </div>
                      )}

                      {/* Dynamic Badge */}
                      <div style={{
                        position: "absolute",
                        top: 20,
                        right: 20,
                        zIndex: 20,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 14,
                        background: isInProgress ? "#3B82F6" : "#F1F5F9",
                        color: isInProgress ? "#FFFFFF" : "#64748B",
                        boxShadow: isInProgress ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
                        border: "none",
                      }}>
                        <StatusIcon status={task.status} light={isInProgress} />
                        <span style={{ 
                          fontSize: 10, 
                          fontWeight: 900, 
                          textTransform: "uppercase", 
                          letterSpacing: "0.04em" 
                        }}>
                          {taskStatusLabel(task.status as TaskStatus, t)}
                        </span>
                      </div>

                      {/* Spotlight Decoration */}
                      {isSpotlight && (
                        <div className="absolute top-6 left-6 text-blue-500 opacity-20">
                          <ArrowUpRight size={48} strokeWidth={3} />
                        </div>
                      )}

                      <div className="relative z-10">
                        <TaskCard
                          task={task}
                          agents={agents}
                          departments={departments}
                          taskSubtasks={subtasksByTask[task.id] ?? []}
                          isHiddenTask={hiddenTaskIds.has(task.id)}
                          cardCollapsed={!isSpotlight} // Only spotlight tasks are expanded by default
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
                        />
                      </div>

                      {/* Bottom Glowing Bar */}
                      {isInProgress && (
                        <motion.div 
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  </DraggableTaskCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div style={{ width: 300, opacity: 0.9, transform: "scale(1.05)" }}>
            <TaskCard
              task={activeTask}
              agents={agents}
              departments={departments}
              taskSubtasks={subtasksByTask[activeTask.id] ?? []}
              isHiddenTask={hiddenTaskIds.has(activeTask.id)}
              cardCollapsed={true}
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
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function StatusIcon({ status, light }: { status: string; light?: boolean }) {
  const size = 12;
  const color = light ? "text-white" : "";
  if (status === "in_progress" || status === "collaborating") return <Activity size={size} className={`${color || "text-blue-500"} animate-pulse`} />;
  if (status === "done") return <CheckCircle2 size={size} className={color || "text-emerald-500"} />;
  if (status === "error") return <AlertCircle size={size} className={color || "text-red-500"} />;
  if (status === "inbox" || status === "planned") return <Clock size={size} className={color || "text-slate-400"} />;
  return <LayoutGrid size={size} className={color || "text-slate-400"} />;
}
