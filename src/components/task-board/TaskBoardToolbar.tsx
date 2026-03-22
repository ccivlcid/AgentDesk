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
    onKickoff,
    kickoffBusy,
    onResume,
    resumeBusy,
  } = state;

  const hasRunningTask = filteredTasks.some((tk) => tk.status === "in_progress");
  const hasPlannedTask = filteredTasks.some((tk) => tk.status === "planned");

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
        {/* 킥오프 버튼 — 프로젝트 선택 + 진행·계획 중 태스크 없을 때 */}
        {currentProject && onKickoff && !hasRunningTask && !hasPlannedTask && (
          <button
            type="button"
            onClick={onKickoff}
            disabled={kickoffBusy}
            title={t({ ko: "에이전트가 태스크를 자동 계획·실행합니다", en: "Agent plans and runs tasks automatically", ja: "エージェントがタスクを自動計画・実行", zh: "代理自动规划执行任务" })}
            style={{
              ...mono, fontSize: "10px", fontWeight: 700,
              padding: "3px 10px",
              border: "1px solid rgba(245,158,11,0.5)",
              borderRadius: 6,
              background: kickoffBusy ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.1)",
              color: kickoffBusy ? "var(--th-text-muted)" : "var(--th-accent)",
              cursor: kickoffBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.12s",
            }}
          >
            <span style={{ fontSize: 11 }}>{kickoffBusy ? "⟳" : "⚡"}</span>
            {kickoffBusy
              ? t({ ko: "계획 중...", en: "Planning...", ja: "計画中...", zh: "计划中..." })
              : t({ ko: "킥오프", en: "Kickoff", ja: "キックオフ", zh: "启动" })}
          </button>
        )}
        {/* Resume 버튼 — planned 태스크가 있고 실행 중이 아닐 때 */}
        {currentProject && onResume && hasPlannedTask && !hasRunningTask && (
          <button
            type="button"
            onClick={onResume}
            disabled={resumeBusy}
            title={t({ ko: "중단된 연쇄 실행을 재개합니다", en: "Resume chained task execution", ja: "中断された連鎖実行を再開", zh: "恢复链式任务执行" })}
            style={{
              ...mono, fontSize: "10px", fontWeight: 700,
              padding: "3px 10px",
              border: "1px solid rgba(34,197,94,0.5)",
              borderRadius: 6,
              background: resumeBusy ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.1)",
              color: resumeBusy ? "var(--th-text-muted)" : "rgb(34,197,94)",
              cursor: resumeBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.12s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {resumeBusy
              ? t({ ko: "재개 중...", en: "Resuming...", ja: "再開中...", zh: "恢复中..." })
              : t({ ko: "재개", en: "Resume", ja: "再開", zh: "恢复" })}
          </button>
        )}
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
