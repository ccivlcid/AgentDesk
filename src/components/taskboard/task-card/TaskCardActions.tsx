import { useState } from "react";
import { retryTask } from "../../../api/project-kickoff";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardActionsProps {
  state: TaskCardState;
}

export function TaskCardActions({ state }: TaskCardActionsProps) {
  const [retrying, setRetrying] = useState(false);
  const {
    t,
    task,
    canRun,
    canPause,
    canStop,
    canResume,
    canDelete,
    canHideTask,
    isHiddenTask,
    isInProgress,
    onRunTask,
    onPauseTask,
    onResumeTask,
    onOpenTerminal,
    onOpenMeetingMinutes,
    onHideTask,
    onUnhideTask,
    setShowDiff,
    handleStopTask,
    handleDeleteTask,
  } = state;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 pt-3 mt-2"
      style={{ borderTop: "1px solid var(--th-border)" }}
    >
      {canRun && (
        <button
          onClick={() => onRunTask(task.id)}
          title={t({ ko: "작업 실행", en: "Run task", ja: "タスク実行", zh: "运行任务" })}
          className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono text-white"
          style={{ background: "rgba(34,197,94,0.85)", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(34,197,94,0.4)", transition: "background 0.12s" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21" /></svg>
          {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
        </button>
      )}
      {task.status === "failed" && (
        <button
          onClick={async () => {
            setRetrying(true);
            try { await retryTask(task.id); } catch { /* ignore */ }
            finally { setRetrying(false); }
          }}
          disabled={retrying}
          title={t({ ko: "재실행", en: "Retry", ja: "再実行", zh: "重试" })}
          className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono text-white"
          style={{ background: "rgba(245,158,11,0.85)", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(245,158,11,0.4)", opacity: retrying ? 0.6 : 1 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
          {retrying
            ? t({ ko: "재실행 중...", en: "Retrying...", ja: "再実行中...", zh: "重试中..." })
            : t({ ko: "재실행", en: "Retry", ja: "再実行", zh: "重试" })}
        </button>
      )}
      {canPause && onPauseTask && (
        <button
          onClick={() => onPauseTask(task.id)}
          title={t({ ko: "작업 일시중지", en: "Pause task", ja: "タスク一時停止", zh: "暂停任务" })}
          className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono text-white"
          style={{ background: "rgba(234,88,12,0.8)", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(234,88,12,0.35)", transition: "background 0.12s" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="5" y="3" width="4" height="18" rx="1" /><rect x="15" y="3" width="4" height="18" rx="1" /></svg>
          {t({ ko: "일시중지", en: "Pause", ja: "一時停止", zh: "暂停" })}
        </button>
      )}
      {canStop && (
        <button
          onClick={() => void handleStopTask()}
          title={t({ ko: "작업 중지", en: "Cancel task", ja: "タスク停止", zh: "取消任务" })}
          className="flex items-center justify-center gap-1 text-xs font-medium font-mono"
          style={{ background: "rgba(185,28,28,0.7)", color: "white", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(185,28,28,0.35)", transition: "background 0.12s" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
          {t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })}
        </button>
      )}
      {canResume && onResumeTask && (
        <button
          onClick={() => onResumeTask(task.id)}
          title={t({ ko: "작업 재개", en: "Resume task", ja: "タスク再開", zh: "恢复任务" })}
          className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono"
          style={{ borderRadius: 8, padding: "5px 10px", background: "var(--th-accent-glow)", color: "var(--th-text-accent)", border: "1px solid var(--th-border-accent)", transition: "opacity 0.12s" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
          {t({ ko: "재개", en: "Resume", ja: "再開", zh: "恢复" })}
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        {(task.status === "in_progress" || task.status === "review" || task.status === "done" || task.status === "pending") && onOpenTerminal && (
          <button
            onClick={() => onOpenTerminal(task.id)}
            title={t({ ko: "터미널 출력 보기", en: "View terminal output", ja: "ターミナル出力を見る", zh: "查看终端输出" })}
            className="flex items-center justify-center"
            style={{ background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", borderRadius: 7, padding: "4px 7px", border: "1px solid var(--th-border)", fontSize: "0.8rem", transition: "background 0.1s" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
          </button>
        )}
        {/* 회의록 버튼 제거 — PM Activity 패널에서 확인 */}
        {task.status === "review" && (
          <button
            onClick={() => setShowDiff(true)}
            title={t({ ko: "변경사항 보기 (Git diff)", en: "View changes (Git diff)", ja: "変更を見る (Git diff)", zh: "查看更改 (Git diff)" })}
            className="flex items-center justify-center text-[10px] font-medium font-mono"
            style={{ background: "rgba(126,34,206,0.15)", color: "rgb(196,181,253)", borderRadius: 7, padding: "4px 8px", border: "1px solid rgba(126,34,206,0.3)", transition: "background 0.1s" }}
          >
            {t({ ko: "Diff", en: "Diff", ja: "差分", zh: "差异" })}
          </button>
        )}
        {canHideTask && !isHiddenTask && onHideTask && (
          <button
            onClick={() => onHideTask(task.id)}
            title={t({ ko: "완료/보류/취소 작업 숨기기", en: "Hide done/pending/cancelled task", ja: "完了/保留/キャンセルのタスクを非表示", zh: "隐藏已完成/待处理/已取消任务" })}
            className="flex items-center justify-center text-[10px] font-medium font-mono"
            style={{ background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", borderRadius: 7, padding: "4px 8px", border: "1px solid var(--th-border)", transition: "opacity 0.1s" }}
          >
            {t({ ko: "숨김", en: "Hide", ja: "非表示", zh: "隐藏" })}
          </button>
        )}
        {canHideTask && !!isHiddenTask && onUnhideTask && (
          <button
            onClick={() => onUnhideTask(task.id)}
            title={t({ ko: "숨긴 작업 복원", en: "Restore hidden task", ja: "非表示タスクを復元", zh: "恢复隐藏任务" })}
            className="flex items-center justify-center text-[10px] font-medium font-mono"
            style={{ background: "var(--th-accent, #f59e0b)", color: "var(--th-accent-text)", borderRadius: 7, padding: "4px 8px", transition: "opacity 0.1s" }}
          >
            {t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" })}
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => void handleDeleteTask()}
            title={t({ ko: "작업 삭제", en: "Delete task", ja: "タスク削除", zh: "删除任务" })}
            className="flex items-center justify-center"
            style={{ background: "rgba(127,29,29,0.4)", color: "rgb(252,165,165)", borderRadius: 7, padding: "4px 7px", border: "1px solid rgba(127,29,29,0.35)", fontSize: "0.8rem", transition: "background 0.1s" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
