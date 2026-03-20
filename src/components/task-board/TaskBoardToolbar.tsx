import type { TaskBoardState } from "./useTaskBoard";

interface TaskBoardToolbarProps {
  state: TaskBoardState;
}

export function TaskBoardToolbar({ state }: TaskBoardToolbarProps) {
  const {
    t,
    mono,
    btnBase,
    currentProject,
    showAllTasks,
    activeFilterCount,
    filteredTasks,
    viewMode,
    setViewMode,
    batchMode,
    toggleBatchMode,
    setShowBulkHideModal,
  } = state;

  return (
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

      <div className="flex items-center gap-1.5 flex-shrink-0">
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
      </div>
    </div>
  );
}
