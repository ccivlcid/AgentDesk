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
        className={`group task-card-hover overflow-hidden transition-all duration-300 ${cardCollapsed ? "p-3 px-4" : "p-4.5"}`}
        style={{
          background: "#FFFFFF",
          border: executionAlert ? "1px solid #FECACA" : isInProgress ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
          borderLeft: `4px solid ${executionAlert ? "#EF4444" : leftBorderColor}`,
          borderRadius: 16,
          opacity: isHiddenTask ? 0.6 : 1,
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
          transition: "all 0.2s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)";
          e.currentTarget.style.transform = "translateY(0)";
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
            {/* 에러 분석 요약 (failed 태스크) */}
            {task.status === "failed" && task.error_analysis && (() => {
              try {
                const analysis = JSON.parse(task.error_analysis) as { summary?: string; cause?: string; suggestion?: string };
                return (
                  <div className="mt-2 px-2.5 py-2" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)", borderRadius: 8, fontSize: "10px", fontFamily: "var(--th-font-mono)" }}>
                    <div style={{ color: "var(--th-status-error)", fontWeight: 700, marginBottom: 2 }}>
                      {analysis.summary}
                    </div>
                    {analysis.suggestion && (
                      <div style={{ color: "var(--th-text-muted)", marginTop: 2 }}>
                        {analysis.suggestion}
                      </div>
                    )}
                  </div>
                );
              } catch { return null; }
            })()}
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
