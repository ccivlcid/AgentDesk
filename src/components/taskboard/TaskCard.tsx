import { useCallback, useEffect, useState } from "react";
import type { Agent, Department, SubTask, Task, TaskExecutionState, TaskStatus } from "../../types";
import { useI18n } from "../../i18n";
import { useConfirm } from "../ui";
import AgentAvatar from "../AgentAvatar";
import DiffModal from "./DiffModal";
import {
  getTaskTypeBadge,
  isHideableStatus,
  priorityIcon,
  priorityLabel,
  STATUS_OPTIONS,
  taskStatusLabel,
  timeAgo,
} from "./constants";
import { addTaskDependency, getTaskDependencies, removeTaskDependency, type TaskDependencyItem } from "../../api/task-dependencies";
import { getTaskGates, evaluateTaskGate, type TaskGateResult } from "../../api/pipeline-gates";
import { PersonaBadge } from "../agent-persona/PersonaBadge";
import { getTaskImages, getImageUrl, type ImageGenerationItem } from "../../api/image-studio";
import { useUiStore } from "../../store/uiStore";

interface TaskCardProps {
  task: Task;
  agents: Agent[];
  departments: Department[];
  taskSubtasks: SubTask[];
  isHiddenTask?: boolean;
  /** 접기 상태(제목만 보이기). 부모에서 넘기면 localStorage와 연동되어 페이지 이동 후에도 유지됨 */
  cardCollapsed?: boolean;
  /** 접기 토글. task.id를 인자로 호출 */
  onToggleCardCollapsed?: (taskId: string) => void;
  onUpdateTask: (id: string, data: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAssignTask: (taskId: string, agentId: string) => void;
  onRunTask: (id: string) => void;
  onStopTask: (id: string) => void;
  onPauseTask?: (id: string) => void;
  onResumeTask?: (id: string) => void;
  onOpenTerminal?: (taskId: string) => void;
  onOpenMeetingMinutes?: (taskId: string) => void;
  onMergeTask?: (id: string) => void;
  onDiscardTask?: (id: string) => void;
  onHideTask?: (id: string) => void;
  onUnhideTask?: (id: string) => void;
}

const STATUS_LEFT_BORDER: Partial<Record<string, string>> = {
  in_progress: "var(--th-status-success)",
  review: "var(--th-status-purple)",
  planned: "var(--th-status-warning)",
  inbox: "var(--th-status-cyan)",
  collaborating: "var(--th-status-info)",
  done: "var(--th-border-strong)",
  pending: "var(--th-status-error)",
  cancelled: "var(--th-status-muted)",
};

const EXECUTION_STATE_BADGES: Partial<Record<TaskExecutionState, { label: string; style: React.CSSProperties }>> = {
  queued: { label: "Q", style: { background: "rgba(6,182,212,0.08)", color: "var(--th-status-cyan)", border: "1px solid rgba(6,182,212,0.18)" } },
  running: { label: "RUN", style: { background: "rgba(34,197,94,0.08)", color: "var(--th-status-success)", border: "1px solid rgba(34,197,94,0.18)" } },
  awaiting_review: { label: "REV", style: { background: "rgba(167,139,250,0.08)", color: "var(--th-status-purple)", border: "1px solid rgba(167,139,250,0.18)" } },
  blocked: { label: "HOLD", style: { background: "rgba(251,191,36,0.08)", color: "var(--th-status-warning)", border: "1px solid rgba(251,191,36,0.18)" } },
  stalled: { label: "STALL", style: { background: "rgba(244,63,94,0.1)", color: "var(--th-status-error)", border: "1px solid rgba(244,63,94,0.2)" } },
  succeeded: { label: "OK", style: { background: "rgba(34,197,94,0.08)", color: "var(--th-status-success)", border: "1px solid rgba(34,197,94,0.18)" } },
  failed: { label: "ERR", style: { background: "rgba(244,63,94,0.1)", color: "var(--th-status-error)", border: "1px solid rgba(244,63,94,0.2)" } },
  cancelled: { label: "STOP", style: { background: "rgba(110,118,129,0.14)", color: "var(--th-status-muted)", border: "1px solid rgba(110,118,129,0.2)" } },
};

export default function TaskCard({
  task,
  agents,
  departments,
  taskSubtasks,
  isHiddenTask,
  cardCollapsed: cardCollapsedProp,
  onToggleCardCollapsed,
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
  onHideTask,
  onUnhideTask,
}: TaskCardProps) {
  void onMergeTask;
  void onDiscardTask;
  const { t, locale: localeTag, language: locale } = useI18n();
  const { confirm } = useConfirm();

  const handleStopTask = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: `"${task.title}" 작업을 중지할까요?`, en: `Stop task?`, ja: `タスクを停止しますか？`, zh: `要停止任务吗？` }),
      message: t({ ko: "경고: Stop 처리 시 해당 프로젝트 변경분은 롤백됩니다.", en: "Warning: stopping will roll back project changes.", ja: "停止するとプロジェクトの変更はロールバックされます。", zh: "停止后将回滚该项目的更改。" }),
      confirmLabel: t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" }),
      variant: "danger",
    });
    if (ok) onStopTask(task.id);
  }, [confirm, t, task.title, task.id, onStopTask]);

  const handleDeleteTask = useCallback(async () => {
    const ok = await confirm({
      title: t({ ko: `"${task.title}" 업무를 삭제할까요?`, en: `Delete task?`, ja: `タスクを削除しますか？`, zh: `要删除任务吗？` }),
      confirmLabel: t({ ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      variant: "danger",
    });
    if (ok) onDeleteTask(task.id);
  }, [confirm, t, task.title, task.id, onDeleteTask]);

  const [cardCollapsedLocal, setCardCollapsedLocal] = useState(false);
  const cardCollapsed = cardCollapsedProp ?? cardCollapsedLocal;
  const setCardCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    if (onToggleCardCollapsed) {
      const next = typeof value === "function" ? value(cardCollapsed) : value;
      if (next !== cardCollapsed) onToggleCardCollapsed(task.id);
    } else {
      setCardCollapsedLocal(typeof value === "function" ? value(cardCollapsedLocal) : value);
    }
  };
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [depPredecessors, setDepPredecessors] = useState<TaskDependencyItem[]>([]);
  const [depInput, setDepInput] = useState("");
  const [depError, setDepError] = useState<string | null>(null);
  const [showGates, setShowGates] = useState(false);
  const [gateResults, setGateResults] = useState<TaskGateResult[]>([]);
  const [showImages, setShowImages] = useState(false);
  const [taskImages, setTaskImages] = useState<ImageGenerationItem[]>([]);
  const openWindow = useUiStore((s) => s.openWindow);

  const loadDeps = useCallback(async () => {
    try {
      const data = await getTaskDependencies(task.id);
      setDepPredecessors(data.predecessors);
    } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => {
    if (showDeps) void loadDeps();
  }, [showDeps, loadDeps]);

  const loadGates = useCallback(async () => {
    try {
      const data = await getTaskGates(task.id);
      setGateResults(data.gates);
    } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => {
    if (showGates) void loadGates();
  }, [showGates, loadGates]);

  useEffect(() => {
    if (showImages) {
      getTaskImages(task.id).then(setTaskImages).catch(() => {});
    }
  }, [showImages, task.id]);

  const subtaskTotal = task.subtask_total ?? taskSubtasks.length;
  const subtaskDoneCount = taskSubtasks.filter((s) => s.status === "done").length;
  const subtaskInProgressCount = taskSubtasks.filter((s) => s.status === "in_progress").length;
  const subtaskBlockedCount = taskSubtasks.filter((s) => s.status === "blocked").length;
  const subtaskPendingCount = Math.max(0, subtaskTotal - subtaskDoneCount - subtaskInProgressCount - subtaskBlockedCount);

  const SUBTASK_STATUS_COLOR: Record<string, string> = {
    done: "rgb(52,211,153)",
    in_progress: "var(--th-accent, #f59e0b)",
    blocked: "rgb(253,164,175)",
    pending: "var(--th-text-muted)",
  };

  const leftBorderColor = STATUS_LEFT_BORDER[task.status] ?? "var(--th-border)";
  const executionAlert = task.execution_state === "stalled" || task.execution_state === "failed";
  const assignedAgent = task.assigned_agent ?? agents.find((agent) => agent.id === task.assigned_agent_id);
  const fallbackAssignedName =
    (locale === "ko" ? task.agent_name_ko || task.agent_name : task.agent_name || task.agent_name_ko) ||
    task.assigned_agent_id;
  const assignedDisplayName = assignedAgent ? (locale === "ko" ? assignedAgent.name_ko : assignedAgent.name) : null;
  const assignedLabel = assignedDisplayName || fallbackAssignedName || null;
  const department = departments.find((d) => d.id === task.department_id);
  const typeBadge = getTaskTypeBadge(task.task_type, t);
  const executionBadge = task.execution_state ? EXECUTION_STATE_BADGES[task.execution_state] : null;

  const isInProgress = task.status === "in_progress";
  const canRun = task.status === "planned" || task.status === "inbox";
  const canStop = isInProgress;
  const canPause = isInProgress && !!onPauseTask;
  const canResume = (task.status === "pending" || task.status === "cancelled") && !!onResumeTask;
  const canDelete = !isInProgress;
  const canHideTask = isHideableStatus(task.status);

  return (
    <div
      className={`group task-card-hover overflow-hidden ${cardCollapsed ? "p-2" : "p-3.5"} transition-all duration-200`}
      style={{
        background: isInProgress ? "var(--th-bg-surface)" : "var(--th-bg-surface)",
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
      {/* 제목 행 */}
      <div className="flex flex-nowrap items-center justify-between gap-2 min-h-[1.5rem]">
        <div className="flex min-w-0 flex-1 items-center gap-2 flex-nowrap">
          <button
            type="button"
            onClick={() => setCardCollapsed((v) => !v)}
            className="shrink-0 p-0.5 text-xs hover:opacity-80"
            style={{ color: "var(--th-text-muted)", transition: "opacity 0.1s linear" }}
            aria-expanded={!cardCollapsed}
            title={cardCollapsed ? t({ ko: "펼치기", en: "Expand", ja: "展開", zh: "展开" }) : t({ ko: "접기", en: "Collapse", ja: "折りたたむ", zh: "收起" })}
          >
            {cardCollapsed ? "▸" : "▾"}
          </button>
          {/* Running pulse dot */}
          {isInProgress && (
            <span
              className="shrink-0 animate-pulse"
              style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--th-status-success)", display: "inline-block", flexShrink: 0 }}
            />
          )}
          {cardCollapsed ? (
            <span className="min-w-0 truncate text-sm font-semibold leading-snug" style={{ color: "var(--th-text-heading)" }}>
              {task.title}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="min-w-0 flex-1 text-left text-sm font-semibold leading-snug"
              style={{ color: "var(--th-text-heading)" }}
            >
              {task.title}
            </button>
          )}
        </div>
        <span
          className="flex-shrink-0 text-base"
          title={`${t({ ko: "우선순위", en: "Priority", ja: "優先度", zh: "优先级" })}: ${priorityLabel(task.priority, t)}`}
        >
          {priorityIcon(task.priority)}
        </span>
      </div>

      {!cardCollapsed && (
        <>
      {task.description && (
        <p className={`mb-3 text-xs ${expanded ? "" : "line-clamp-2"}`} style={{ color: "var(--th-text-muted)", lineHeight: 1.55 }}>
          {task.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium font-mono ${typeBadge.color}`} style={{ borderRadius: 6 }}>{typeBadge.label}</span>
        {isHiddenTask && (
          <span
            className="px-2 py-0.5 text-xs font-medium font-mono"
            style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)", borderRadius: 6 }}
          >
            HIDDEN
          </span>
        )}
        {department && (
          <span
            className="px-2 py-0.5 text-xs font-medium font-mono"
            style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-secondary)", borderRadius: 6 }}
          >
            {locale === "ko" ? department.name_ko : department.name}
          </span>
        )}
        {executionBadge && (
          <span
            className="px-2 py-0.5 text-xs font-medium font-mono"
            style={{ borderRadius: 6, ...executionBadge.style }}
            title={`execution: ${task.execution_state}`}
          >
            {executionBadge.label}
          </span>
        )}
      </div>

      {/* 상태 · 담당자 블록 */}
      <div className="mb-3 flex flex-col gap-2">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={(event) => onUpdateTask(task.id, { status: event.target.value as TaskStatus })}
            disabled={isInProgress}
            className="flex-1 outline-none"
            style={{
              border: "1px solid var(--th-border)",
              borderRadius: 7,
              background: isInProgress ? "transparent" : "var(--th-bg-elevated)",
              color: isInProgress ? "var(--th-text-muted)" : "var(--th-text-primary)",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.72rem",
              padding: "0.28rem 0.5rem",
              cursor: isInProgress ? "default" : "pointer",
              opacity: isInProgress ? 0.6 : 1,
            }}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabel(status as TaskStatus, t)}
              </option>
            ))}
          </select>
          <span className="text-[10px] flex-shrink-0 tabular-nums" style={{ color: "var(--th-text-muted)" }}>
            {timeAgo(task.created_at, localeTag)}
          </span>
        </div>

        {/* Agent — 읽기 전용 표시 */}
        <div
          className="flex items-center gap-2 px-2.5 py-1.5"
          style={{
            background: isInProgress ? "rgba(34,197,94,0.06)" : "var(--th-bg-elevated)",
            border: isInProgress ? "1px solid rgba(34,197,94,0.18)" : "1px solid var(--th-border)",
            borderRadius: 7,
          }}
        >
          {assignedAgent ? (
            <AgentAvatar agent={assignedAgent} agents={agents} size={18} />
          ) : (
            <span style={{ fontSize: "0.75rem", color: "var(--th-text-muted)" }}>—</span>
          )}
          <span className="flex-1 min-w-0 truncate text-[11px] font-mono" style={{ color: assignedLabel ? "var(--th-text-secondary)" : "var(--th-text-muted)" }}>
            {assignedLabel ?? t({ ko: "미배정", en: "Unassigned", ja: "未割り当て", zh: "未分配" })}
          </span>
          {assignedAgent?.persona_id && <PersonaBadge personaId={assignedAgent.persona_id} size="sm" />}
          {isInProgress && (
            <span className="font-mono text-[9px] flex-shrink-0" style={{ color: "rgba(34,197,94,0.85)" }}>
              RUNNING
            </span>
          )}
        </div>
      </div>

      {subtaskTotal > 0 && (
        <div className="mb-4">
          {/* Progress bar + fraction */}
          <button
            onClick={() => setShowSubtasks((v) => !v)}
            className="mb-1 flex w-full items-center gap-2 text-left"
          >
            <div
              className="flex h-1.5 flex-1 overflow-hidden"
              style={{ borderRadius: 6, background: "var(--th-border)" }}
            >
              {subtaskDoneCount > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${(subtaskDoneCount / subtaskTotal) * 100}%`, background: "rgb(52,211,153)" }}
                />
              )}
              {subtaskInProgressCount > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${(subtaskInProgressCount / subtaskTotal) * 100}%`, background: "var(--th-accent)" }}
                />
              )}
              {subtaskBlockedCount > 0 && (
                <div
                  className="h-full transition-all"
                  style={{ width: `${(subtaskBlockedCount / subtaskTotal) * 100}%`, background: "rgb(253,164,175)" }}
                />
              )}
            </div>
            <span className="font-mono text-[10px] tabular-nums whitespace-nowrap" style={{ color: "var(--th-text-muted)" }}>
              {subtaskDoneCount}/{subtaskTotal}
            </span>
            <span className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{showSubtasks ? "▲" : "▼"}</span>
          </button>

          {/* Status chips */}
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono">
            {subtaskDoneCount > 0 && <span style={{ color: "rgb(52,211,153)" }}>✓ {subtaskDoneCount}</span>}
            {subtaskInProgressCount > 0 && <span style={{ color: "var(--th-accent)" }}>⚡ {subtaskInProgressCount}</span>}
            {subtaskBlockedCount > 0 && <span style={{ color: "rgb(253,164,175)" }}>✖ {subtaskBlockedCount}</span>}
            {subtaskPendingCount > 0 && <span style={{ color: "var(--th-text-muted)" }}>· {subtaskPendingCount} {t({ ko: "대기", en: "pending", ja: "待機", zh: "待处理" })}</span>}
          </div>

          {/* Subtask rows */}
          {showSubtasks && taskSubtasks.length > 0 && (
            <div className="space-y-px">
              {taskSubtasks.map((subtask) => {
                const targetDepartment = subtask.target_department_id
                  ? departments.find((d) => d.id === subtask.target_department_id)
                  : null;
                const barColor = SUBTASK_STATUS_COLOR[subtask.status] ?? "var(--th-border)";
                return (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-1.5 py-1 pl-2"
                    style={{ borderLeft: `2px solid ${barColor}` }}
                  >
                    <span
                      className={`flex-1 truncate text-[11px] font-mono`}
                      style={{
                        color: subtask.status === "done" ? "var(--th-text-muted)" : "var(--th-text-secondary)",
                        textDecoration: subtask.status === "done" ? "line-through" : "none",
                      }}
                    >
                      {subtask.title}
                    </span>
                    {targetDepartment && (
                      <span
                        className="shrink-0 px-1 py-0.5 text-[10px] font-mono"
                        style={{ background: targetDepartment.color + "30", color: targetDepartment.color, borderRadius: 6 }}
                      >
                        {targetDepartment.icon}
                      </span>
                    )}
                    {subtask.delegated_task_id && subtask.status !== "done" && (
                      <span
                        className="shrink-0 text-[10px] font-mono"
                        style={{ color: "var(--th-status-info)" }}
                        title={t({ ko: "위임됨", en: "Delegated", ja: "委任済み", zh: "已委派" })}
                      >
                        ↗
                      </span>
                    )}
                    {subtask.status === "blocked" && subtask.blocked_reason && (
                      <span
                        className="shrink-0 truncate max-w-[80px] text-[10px] font-mono"
                        style={{ color: "rgb(253,164,175)" }}
                        title={subtask.blocked_reason}
                      >
                        {subtask.blocked_reason}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 액션 툴바 — macOS refined */}
      <div
        className="flex flex-wrap items-center gap-1.5 pt-3 mt-2"
        style={{ borderTop: "1px solid var(--th-border)" }}
      >
        {/* Primary action group */}
        {canRun && (
          <button
            onClick={() => {
              onRunTask(task.id);
            }}
            title={t({ ko: "작업 실행", en: "Run task", ja: "タスク実行", zh: "运行任务" })}
            className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono text-white"
            style={{ background: "rgba(34,197,94,0.85)", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(34,197,94,0.4)", transition: "background 0.12s" }}
          >
            ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
          </button>
        )}
        {canPause && (
          <button
            onClick={() => onPauseTask!(task.id)}
            title={t({ ko: "작업 일시중지", en: "Pause task", ja: "タスク一時停止", zh: "暂停任务" })}
            className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono text-white"
            style={{ background: "rgba(234,88,12,0.8)", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(234,88,12,0.35)", transition: "background 0.12s" }}
          >
            ⏸ {t({ ko: "일시중지", en: "Pause", ja: "一時停止", zh: "暂停" })}
          </button>
        )}
        {canStop && (
          <button
            onClick={() => void handleStopTask()}
            title={t({ ko: "작업 중지", en: "Cancel task", ja: "タスク停止", zh: "取消任务" })}
            className="flex items-center justify-center gap-1 text-xs font-medium font-mono"
            style={{ background: "rgba(185,28,28,0.7)", color: "white", borderRadius: 8, padding: "5px 10px", border: "1px solid rgba(185,28,28,0.35)", transition: "background 0.12s" }}
          >
            ⏹ {t({ ko: "중지", en: "Stop", ja: "停止", zh: "停止" })}
          </button>
        )}
        {canResume && (
          <button
            onClick={() => onResumeTask!(task.id)}
            title={t({ ko: "작업 재개", en: "Resume task", ja: "タスク再開", zh: "恢复任务" })}
            className="flex flex-1 items-center justify-center gap-1 text-xs font-medium font-mono"
            style={{ borderRadius: 8, padding: "5px 10px", background: "var(--th-accent-glow)", color: "var(--th-text-accent)", border: "1px solid var(--th-border-accent)", transition: "opacity 0.12s" }}
          >
            ↩ {t({ ko: "재개", en: "Resume", ja: "再開", zh: "恢复" })}
          </button>
        )}

        {/* Secondary actions — compact icon group */}
        <div className="ml-auto flex items-center gap-1">
          {(task.status === "in_progress" ||
            task.status === "review" ||
            task.status === "done" ||
            task.status === "pending") &&
            onOpenTerminal && (
              <button
                onClick={() => onOpenTerminal(task.id)}
                title={t({ ko: "터미널 출력 보기", en: "View terminal output", ja: "ターミナル出力を見る", zh: "查看终端输出" })}
                className="flex items-center justify-center"
                style={{ background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)", borderRadius: 7, padding: "4px 7px", border: "1px solid var(--th-border)", fontSize: "0.8rem", transition: "background 0.1s" }}
              >
                &#128421;
              </button>
            )}
          {(task.status === "planned" ||
            task.status === "collaborating" ||
            task.status === "in_progress" ||
            task.status === "review" ||
            task.status === "done" ||
            task.status === "pending") &&
            onOpenMeetingMinutes && (
              <button
                onClick={() => onOpenMeetingMinutes(task.id)}
                title={t({ ko: "회의록 보기", en: "View meeting minutes", ja: "会議録を見る", zh: "查看会议纪要" })}
                className="flex items-center justify-center"
                style={{ background: "rgba(8,145,178,0.12)", color: "rgb(103,232,249)", borderRadius: 7, padding: "4px 7px", border: "1px solid rgba(8,145,178,0.25)", fontSize: "0.8rem", transition: "background 0.1s" }}
              >
                📝
              </button>
            )}
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
              🗑
            </button>
          )}
        </div>
      </div>
        </>
      )}

      {showDiff && <DiffModal taskId={task.id} onClose={() => setShowDiff(false)} />}

      {/* 하단 접이식: 선행 태스크 · 실행 로그 · 파이프라인 게이트 */}
      {!cardCollapsed && (
        <div className="mt-4 pt-3">
          <button
            type="button"
            onClick={() => setShowDeps((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] transition-colors"
            style={{ color: "var(--th-text-muted)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            {t({ ko: "선행 태스크", en: "Dependencies", ja: "依存関係", zh: "依赖关系" })}
            {depPredecessors.length > 0 && (
              <span className="bg-amber-500/20 px-1.5 text-[10px] font-mono text-amber-400" style={{ borderRadius: 6 }}>{depPredecessors.length}</span>
            )}
            <span className="ml-0.5">{showDeps ? "▲" : "▼"}</span>
          </button>

          {showDeps && (
            <div className="mt-2 space-y-1.5">
              {depPredecessors.length === 0 && (
                <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "선행 태스크 없음", en: "No dependencies", ja: "依存なし", zh: "无依赖" })}
                </p>
              )}
              {depPredecessors.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between gap-2 border px-2 py-1" style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)", borderRadius: 6 }}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium" style={{ color: "var(--th-text-primary)" }}>{dep.title}</p>
                    <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{dep.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeTaskDependency(task.id, dep.id);
                      await loadDeps();
                    }}
                    className="shrink-0 p-0.5 text-[10px] font-mono text-red-400 hover:text-red-300"
                    style={{ borderRadius: 6 }}
                  >✕</button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={depInput}
                  onChange={(e) => { setDepInput(e.target.value); setDepError(null); }}
                  placeholder={t({ ko: "태스크 ID 입력", en: "Enter task ID", ja: "タスクIDを入力", zh: "输入任务ID" })}
                  className="flex-1 border px-2 py-1 text-[11px] font-mono outline-none"
                  style={{ borderRadius: 6, borderColor: "var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-primary)" }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    const id = depInput.trim();
                    if (!id) return;
                    const result = await addTaskDependency(task.id, id);
                    if (result.ok) {
                      setDepInput("");
                      await loadDeps();
                    } else {
                      setDepError(result.error ?? "Error");
                    }
                  }}
                  className="border px-2 py-1 text-[11px] font-mono transition-colors hover:opacity-80"
                  style={{ borderRadius: 6, borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
                >+</button>
              </div>
              {depError && <p className="text-[10px] text-red-400">{depError}</p>}
            </div>
          )}

          {/* Pipeline Gates section */}
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--th-border)" }}>
            <button
              type="button"
              onClick={() => setShowGates((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] transition-colors"
              style={{ color: "var(--th-text-muted)" }}
            >
              <span>🔒</span>
              {t({ ko: "파이프라인 게이트", en: "Pipeline Gates", ja: "パイプラインゲート", zh: "管道门" })}
              {gateResults.length > 0 && (() => {
                const passed = gateResults.filter((g) => g.status === "passed" || g.status === "skipped").length;
                const failed = gateResults.filter((g) => g.status === "failed").length;
                return (
                  <span className={`px-1.5 text-[10px] font-mono ${
                    failed > 0 ? "bg-red-500/20 text-red-400" :
                    passed === gateResults.length ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-amber-500/20 text-amber-400"
                  }`} style={{ borderRadius: 6 }}>
                    {passed}/{gateResults.length}
                  </span>
                );
              })()}
              <span className="ml-0.5">{showGates ? "▲" : "▼"}</span>
            </button>

            {showGates && (
              <div className="mt-2 space-y-1">
                {gateResults.length === 0 && (
                  <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                    {t({ ko: "게이트 없음", en: "No gates configured", ja: "ゲートなし", zh: "无门控" })}
                  </p>
                )}
                {gateResults.map((gate) => {
                  const statusIcon = gate.status === "passed" ? "✓" :
                    gate.status === "failed" ? "✗" :
                    gate.status === "skipped" ? "↷" : "·";
                  const isManual = gate.gate_type === "manual";
                  const isPending = gate.status === "pending";
                  return (
                    <div
                      key={gate.gate_id}
                      className="flex items-center justify-between gap-2 border px-2 py-1"
                      style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)", borderRadius: 6 }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-xs">{statusIcon}</span>
                        <span className="truncate text-[11px]" style={{ color: "var(--th-text-primary)" }}>
                          {locale === "ko" && gate.gate_label_ko ? gate.gate_label_ko : gate.gate_label}
                        </span>
                        {isManual && (
                          <span className="px-1 text-[9px] font-mono" style={{ background: "var(--th-accent-glow)", color: "var(--th-text-accent)", borderRadius: 6 }}>
                            {t({ ko: "수동", en: "Manual", ja: "手動", zh: "手动" })}
                          </span>
                        )}
                        {gate.sla_minutes && (
                          <span className="text-[9px]" style={{ color: "var(--th-text-muted)" }}>
                            SLA {gate.sla_minutes}m
                          </span>
                        )}
                      </div>
                      {isManual && isPending && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await evaluateTaskGate(task.id, gate.gate_id, { status: "passed" });
                              await loadGates();
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                            style={{ borderRadius: 6 }}
                          >
                            {t({ ko: "승인", en: "Pass", ja: "承認", zh: "通过" })}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await evaluateTaskGate(task.id, gate.gate_id, { status: "failed" });
                              await loadGates();
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            style={{ borderRadius: 6 }}
                          >
                            {t({ ko: "반려", en: "Fail", ja: "却下", zh: "拒绝" })}
                          </button>
                        </div>
                      )}
                      {gate.note && (
                        <span className="truncate text-[9px]" style={{ color: "var(--th-text-muted)" }} title={gate.note}>
                          {gate.note.slice(0, 30)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Generated Images section */}
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--th-border)" }}>
            <button
              type="button"
              onClick={() => setShowImages((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] transition-colors"
              style={{ color: "var(--th-text-muted)" }}
            >
              <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="2" width="16" height="14" rx="2" />
                <circle cx="5.5" cy="7" r="1.5" />
                <polyline points="1,14 6,9 9,12 12,9 17,14" />
              </svg>
              {t({ ko: "생성 이미지", en: "Generated Images", ja: "生成画像", zh: "生成图像" })}
              {taskImages.length > 0 && (
                <span className="px-1.5 text-[10px] font-mono" style={{ borderRadius: 6, background: "rgba(236,72,153,0.15)", color: "#ec4899" }}>
                  {taskImages.length}
                </span>
              )}
              <span className="ml-0.5">{showImages ? "▲" : "▼"}</span>
            </button>

            {showImages && (
              <div className="mt-2">
                {taskImages.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                      {t({ ko: "연동된 이미지 없음", en: "No images linked", ja: "画像なし", zh: "无关联图像" })}
                    </p>
                    <button
                      type="button"
                      onClick={() => openWindow("image-studio")}
                      className="text-[10px] font-mono px-2 py-0.5"
                      style={{ borderRadius: 6, border: "1px solid var(--th-border-accent)", color: "var(--th-accent)", background: "rgba(245,158,11,0.08)", cursor: "pointer" }}
                    >
                      {t({ ko: "Image Studio 열기", en: "Open Image Studio", ja: "Image Studioを開く", zh: "打开图像工作室" })}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      {taskImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative overflow-hidden"
                          style={{ borderRadius: 6, border: "1px solid var(--th-border)", aspectRatio: "1", cursor: "pointer" }}
                          onClick={() => openWindow("image-studio")}
                          title={img.prompt}
                        >
                          <img
                            src={getImageUrl(img.id, true)}
                            alt={img.prompt}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => openWindow("image-studio")}
                      className="mt-1.5 w-full text-[10px] font-mono py-1"
                      style={{ borderRadius: 6, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
                    >
                      {t({ ko: "Image Studio에서 더 보기 →", en: "View in Image Studio →", ja: "Image Studioで表示 →", zh: "在图像工作室查看 →" })}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
