import { useCallback, useState, useRef, useEffect } from "react";
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
    onAddTasks,
    addTasksBusy,
  } = state;

  const hasRunningTask = filteredTasks.some((tk) => tk.status === "in_progress");
  const hasPlannedTask = filteredTasks.some((tk) => tk.status === "planned");
  const hasDoneTask = filteredTasks.some((tk) => tk.status === "done");
  const totalTasks = filteredTasks.length;

  // "Add Tasks" — show when all done (or have some done), no running/planned tasks, and there are tasks
  const showAddTasks = currentProject && onAddTasks && !hasRunningTask && !hasPlannedTask && totalTasks > 0 && hasDoneTask;
  // "Kickoff" — show only when there are NO tasks at all for the project
  const showKickoff = currentProject && onKickoff && !hasRunningTask && !hasPlannedTask && totalTasks === 0;

  const [addTasksInputOpen, setAddTasksInputOpen] = useState(false);
  const [addTasksDirective, setAddTasksDirective] = useState("");
  const [addTasksFile, setAddTasksFile] = useState<{ name: string; content: string } | null>(null);
  const addTasksInputRef = useRef<HTMLInputElement>(null);
  const addTasksFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addTasksInputOpen) addTasksInputRef.current?.focus();
  }, [addTasksInputOpen]);

  const handleAddTasksClick = useCallback(() => {
    setAddTasksInputOpen(true);
    setAddTasksDirective("");
    setAddTasksFile(null);
  }, []);

  const handleAddTasksSubmit = useCallback(() => {
    if (!onAddTasks || (!addTasksDirective.trim() && !addTasksFile)) return;
    const directive = addTasksDirective.trim() + (addTasksFile ? `\n\n--- Reference: ${addTasksFile.name} ---\n${addTasksFile.content}` : "");
    onAddTasks(directive, addTasksFile ?? undefined);
    setAddTasksInputOpen(false);
    setAddTasksDirective("");
    setAddTasksFile(null);
  }, [onAddTasks, addTasksDirective, addTasksFile]);

  const handleAddTasksCancel = useCallback(() => {
    setAddTasksInputOpen(false);
    setAddTasksDirective("");
    setAddTasksFile(null);
  }, []);

  const handleAddTasksFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAddTasksFile({ name: file.name, content: reader.result as string });
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  return (
    <div className="flex-shrink-0" style={{ borderTopLeftRadius: 10, borderTopRightRadius: 10 }}>
    <div
      className="flex items-center justify-between"
      style={{
        borderBottom: addTasksInputOpen ? "none" : "1px solid var(--th-border)",
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
        {/* 킥오프 버튼 — 프로젝트에 태스크가 하나도 없을 때만 */}
        {showKickoff && (
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            {kickoffBusy
              ? t({ ko: "계획 중...", en: "Planning...", ja: "計画中...", zh: "计划中..." })
              : t({ ko: "킥오프", en: "Kickoff", ja: "キックオフ", zh: "启动" })}
          </button>
        )}
        {/* 추가 업무 버튼 — 완료된 태스크가 있고 진행·계획 중인 태스크가 없을 때 */}
        {showAddTasks && (
          <button
            type="button"
            onClick={handleAddTasksClick}
            disabled={addTasksBusy}
            title={t({ ko: "기존 프로젝트에 추가 업무를 생성합니다", en: "Create additional tasks for this project", ja: "既存プロジェクトに追加タスクを作成", zh: "为该项目创建追加任务" })}
            style={{
              ...mono, fontSize: "10px", fontWeight: 700,
              padding: "3px 10px",
              border: "1px solid rgba(59,130,246,0.5)",
              borderRadius: 6,
              background: addTasksBusy ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.1)",
              color: addTasksBusy ? "var(--th-text-muted)" : "rgb(59,130,246)",
              cursor: addTasksBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 4,
              transition: "all 0.12s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {addTasksBusy
              ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." })
              : t({ ko: "추가 업무", en: "Add Tasks", ja: "追加タスク", zh: "追加任务" })}
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
    {/* Inline add-tasks input bar */}
    {addTasksInputOpen && (
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 18px",
          borderBottom: "1px solid var(--th-border)",
          background: "rgba(59,130,246,0.04)",
        }}
      >
        <input
          ref={addTasksFileRef}
          type="file"
          accept=".md,.txt,.markdown"
          style={{ display: "none" }}
          onChange={handleAddTasksFileChange}
        />
        <button
          type="button"
          onClick={() => addTasksFileRef.current?.click()}
          title={t({ ko: "MD 파일 첨부", en: "Attach MD file", ja: "MDファイル添付", zh: "附加MD文件" })}
          style={{
            background: addTasksFile ? "rgba(59,130,246,0.12)" : "transparent",
            border: addTasksFile ? "1px solid rgba(59,130,246,0.4)" : "1px solid var(--th-border)",
            borderRadius: 4, padding: "3px 6px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
            color: addTasksFile ? "rgb(59,130,246)" : "var(--th-text-muted)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {addTasksFile && (
            <span style={{ fontFamily: "var(--th-font-mono)", fontSize: 9, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {addTasksFile.name}
            </span>
          )}
        </button>
        <input
          ref={addTasksInputRef}
          type="text"
          value={addTasksDirective}
          onChange={(e) => setAddTasksDirective(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTasksSubmit();
            if (e.key === "Escape") handleAddTasksCancel();
          }}
          placeholder={t({
            ko: "추가할 업무를 설명해주세요...",
            en: "Describe the additional tasks to add...",
            ja: "追加するタスクを説明してください...",
            zh: "请描述要添加的任务...",
          })}
          style={{
            flex: 1, background: "var(--th-input-bg)", border: "1px solid rgba(59,130,246,0.3)",
            color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)", fontSize: 11,
            padding: "5px 8px", outline: "none", borderRadius: 4,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.6)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)")}
          disabled={addTasksBusy}
        />
        <button
          type="button"
          onClick={handleAddTasksSubmit}
          disabled={addTasksBusy || (!addTasksDirective.trim() && !addTasksFile)}
          style={{
            ...mono, fontSize: "10px", fontWeight: 700,
            padding: "4px 10px", borderRadius: 4,
            border: "1px solid rgba(59,130,246,0.5)",
            background: (addTasksBusy || (!addTasksDirective.trim() && !addTasksFile)) ? "transparent" : "rgba(59,130,246,0.12)",
            color: (addTasksBusy || (!addTasksDirective.trim() && !addTasksFile)) ? "var(--th-text-muted)" : "rgb(59,130,246)",
            cursor: (addTasksBusy || (!addTasksDirective.trim() && !addTasksFile)) ? "not-allowed" : "pointer",
          }}
        >
          {addTasksBusy
            ? t({ ko: "생성 중...", en: "Creating...", ja: "作成中...", zh: "创建中..." })
            : t({ ko: "실행", en: "Submit", ja: "実行", zh: "执行" })}
        </button>
        <button
          type="button"
          onClick={handleAddTasksCancel}
          disabled={addTasksBusy}
          style={{
            ...mono, fontSize: "10px", fontWeight: 700,
            padding: "4px 8px", borderRadius: 4,
            border: "1px solid var(--th-border)",
            background: "transparent",
            color: "var(--th-text-muted)",
            cursor: addTasksBusy ? "not-allowed" : "pointer",
          }}
        >
          {t({ ko: "취소", en: "Cancel", ja: "取消", zh: "取消" })}
        </button>
      </div>
    )}
    </div>
  );
}
