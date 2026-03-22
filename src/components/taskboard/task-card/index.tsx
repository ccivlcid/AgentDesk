import { useCallback, useState } from "react";
import DiffModal from "../DiffModal";
import { useTaskCardState } from "./useTaskCardState";
import { TaskCardHeader } from "./TaskCardHeader";
import { TaskCardBody } from "./TaskCardBody";
import { TaskCardActions } from "./TaskCardActions";
import { TaskCardDeps } from "./TaskCardDeps";
import { TaskCardGates } from "./TaskCardGates";
import { TaskCardImages } from "./TaskCardImages";
import { TaskCardContextMenu } from "./TaskCardContextMenu";
import type { TaskCardProps } from "./types";

export default function TaskCard(props: TaskCardProps) {
  const state = useTaskCardState(props);
  const {
    task,
    isHiddenTask,
    cardCollapsed,
    leftBorderColor,
    executionAlert,
    executionBadge,
    isInProgress,
    assignedLabel,
    showDiff,
    setShowDiff,
  } = state;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        className={`group task-card-hover overflow-hidden transition-all duration-200 ${cardCollapsed ? "p-2.5 px-3" : "p-3.5"}`}
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
        onContextMenu={handleContextMenu}
      >
        <TaskCardHeader state={state} />

        {/* ── Compact: agent + execution badge inline ── */}
        {cardCollapsed && (assignedLabel || executionBadge) && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap" style={{ fontSize: "10px", fontFamily: "var(--th-font-mono)" }}>
            {assignedLabel && (
              <span className="flex items-center gap-1" style={{ color: "var(--th-text-muted)" }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <circle cx="6" cy="9" r="1" fill="currentColor"/>
                  <circle cx="10" cy="9" r="1" fill="currentColor"/>
                  <path d="M6 4V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M10 4V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {assignedLabel}
              </span>
            )}
            {executionBadge && (
              <span
                className="px-1.5 py-0.5 text-[9px] font-bold leading-none"
                style={executionBadge.style}
              >
                {executionBadge.label}
              </span>
            )}
          </div>
        )}

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

      {ctxMenu && (
        <TaskCardContextMenu
          state={state}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
