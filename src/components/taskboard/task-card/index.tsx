import DiffModal from "../DiffModal";
import { useTaskCardState } from "./useTaskCardState";
import { TaskCardHeader } from "./TaskCardHeader";
import { TaskCardBody } from "./TaskCardBody";
import { TaskCardActions } from "./TaskCardActions";
import { TaskCardDeps } from "./TaskCardDeps";
import { TaskCardGates } from "./TaskCardGates";
import { TaskCardImages } from "./TaskCardImages";
import type { TaskCardProps } from "./types";

export default function TaskCard(props: TaskCardProps) {
  const state = useTaskCardState(props);
  const {
    task,
    isHiddenTask,
    cardCollapsed,
    leftBorderColor,
    executionAlert,
    isInProgress,
    showDiff,
    setShowDiff,
  } = state;

  return (
    <div
      className={`group task-card-hover overflow-hidden ${cardCollapsed ? "p-2" : "p-3.5"} transition-all duration-200`}
      style={{
        background: "var(--th-bg-surface)",
        border: executionAlert ? "1px solid rgba(244,63,94,0.22)" : isInProgress ? "1px solid rgba(34,197,94,0.18)" : "1px solid var(--th-border)",
        borderLeft: `3px solid ${executionAlert ? "var(--th-status-error)" : leftBorderColor}`,
        borderRadius: 12,
        opacity: isHiddenTask ? 0.7 : 1,
        boxShadow: executionAlert
          ? "inset 0 0 0 1px rgba(244,63,94,0.06), 0 1px 4px rgba(0,0,0,0.08), 0 4px 12px rgba(244,63,94,0.06)"
          : isInProgress
          ? "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(34,197,94,0.08)"
          : "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      <TaskCardHeader state={state} />

      {!cardCollapsed && (
        <>
          <TaskCardBody state={state} />
          <TaskCardActions state={state} />
        </>
      )}

      {showDiff && <DiffModal taskId={task.id} onClose={() => setShowDiff(false)} />}

      {!cardCollapsed && (
        <div className="mt-4 pt-3">
          <TaskCardDeps state={state} />
          <TaskCardGates state={state} />
          <TaskCardImages state={state} />
        </div>
      )}
    </div>
  );
}
