import { useCallback, useEffect, useState } from "react";
import type { Agent, Department, SubTask, Task, TaskStatus } from "../../types";
import { useI18n } from "../../i18n";
import AgentAvatar from "../AgentAvatar";
import AgentSelect from "../AgentSelect";
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

const SUBTASK_STATUS_ICON: Record<string, string> = {
  pending: "\u23F3",
  in_progress: "\uD83D\uDD28",
  done: "\u2705",
  blocked: "\uD83D\uDEAB",
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
  const [agentWarning, setAgentWarning] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [depPredecessors, setDepPredecessors] = useState<TaskDependencyItem[]>([]);
  const [depInput, setDepInput] = useState("");
  const [depError, setDepError] = useState<string | null>(null);

  const loadDeps = useCallback(async () => {
    try {
      const data = await getTaskDependencies(task.id);
      setDepPredecessors(data.predecessors);
    } catch { /* ignore */ }
  }, [task.id]);

  useEffect(() => {
    if (showDeps) void loadDeps();
  }, [showDeps, loadDeps]);

  const assignedAgent = task.assigned_agent ?? agents.find((agent) => agent.id === task.assigned_agent_id);
  const fallbackAssignedName =
    (locale === "ko" ? task.agent_name_ko || task.agent_name : task.agent_name || task.agent_name_ko) ||
    task.assigned_agent_id;
  const assignedDisplayName = assignedAgent ? (locale === "ko" ? assignedAgent.name_ko : assignedAgent.name) : null;
  const assignedLabel = assignedDisplayName || fallbackAssignedName || null;
  const department = departments.find((d) => d.id === task.department_id);
  const typeBadge = getTaskTypeBadge(task.task_type, t);

  const canRun = task.status === "planned" || task.status === "inbox";
  const canStop = task.status === "in_progress";
  const canPause = task.status === "in_progress" && !!onPauseTask;
  const canResume = (task.status === "pending" || task.status === "cancelled") && !!onResumeTask;
  const canDelete = task.status !== "in_progress";
  const canHideTask = isHideableStatus(task.status);

  return (
    <div
      className={`group rounded-xl border shadow-sm transition hover:shadow-md ${cardCollapsed ? "p-2" : "p-3.5"}`}
      style={{
        borderColor: isHiddenTask ? "var(--th-border)" : "var(--th-border)",
        background: "var(--th-bg-surface)",
      }}
    >
      {/* 제목 행 — 접기 아이콘 클릭: 카드 접기/펼치기, 제목 클릭(펼침 시): 설명 2줄↔전체 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setCardCollapsed((v) => !v)}
            className="shrink-0 rounded p-0.5 text-xs transition-colors hover:opacity-80"
            style={{ color: "var(--th-text-muted)" }}
            aria-expanded={!cardCollapsed}
            title={cardCollapsed ? t({ ko: "펼치기", en: "Expand", ja: "展開", zh: "展开" }) : t({ ko: "접기", en: "Collapse", ja: "折りたたむ", zh: "收起" })}
          >
            {cardCollapsed ? "▸" : "▾"}
          </button>
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
        <p className={`mb-2 text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`} style={{ color: "var(--th-text-muted)" }}>
          {task.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge.color}`}>{typeBadge.label}</span>
        {isHiddenTask && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-muted)" }}
          >
            {t({ ko: "숨김", en: "Hidden", ja: "非表示", zh: "隐藏" })}
          </span>
        )}
        {department && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-secondary)" }}
          >
            {locale === "ko" ? department.name_ko : department.name}
          </span>
        )}
      </div>

      <div className="mb-3">
        <select
          value={task.status}
          onChange={(event) => onUpdateTask(task.id, { status: event.target.value as TaskStatus })}
          className="w-full rounded-lg border px-2 py-1 text-xs outline-none transition focus:ring-1"
          style={{
            borderColor: "var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-primary)",
          }}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabel(status as TaskStatus, t)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {assignedAgent && assignedLabel ? (
            <>
              <AgentAvatar agent={assignedAgent} agents={agents} size={20} />
              <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{assignedLabel}</span>
            </>
          ) : assignedLabel ? (
            <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{assignedLabel}</span>
          ) : (
            <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "미배정", en: "Unassigned", ja: "未割り当て", zh: "未分配" })}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{timeAgo(task.created_at, localeTag)}</span>
      </div>

      <div
        className={`mb-3 rounded-lg transition-all ${agentWarning ? "ring-2 ring-red-500 animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        <AgentSelect
          agents={agents}
          departments={departments}
          value={task.assigned_agent_id ?? ""}
          placeholder={
            assignedAgent || !assignedLabel
              ? undefined
              : t({
                  ko: `배정됨(숨김): ${assignedLabel}`,
                  en: `Assigned (hidden): ${assignedLabel}`,
                  ja: `割り当て済み(非表示): ${assignedLabel}`,
                  zh: `已分配（隐藏）: ${assignedLabel}`,
                })
          }
          onChange={(agentId) => {
            setAgentWarning(false);
            if (agentId) {
              onAssignTask(task.id, agentId);
            } else {
              onUpdateTask(task.id, { assigned_agent_id: null });
            }
          }}
        />
        {agentWarning && (
          <p className="mt-1 text-xs font-medium text-red-400 animate-[shake_0.4s_ease-in-out]">
            {t({
              ko: "담당자를 배정해주세요!",
              en: "Please assign an agent!",
              ja: "担当者を割り当ててください！",
              zh: "请分配负责人！",
            })}
          </p>
        )}
      </div>

      {(task.subtask_total ?? 0) > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowSubtasks((v) => !v)}
            className="mb-1.5 flex w-full items-center gap-2 text-left"
          >
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--th-border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.round(((task.subtask_done ?? 0) / (task.subtask_total ?? 1)) * 100)}%`,
                  background: "var(--th-accent, #2563eb)",
                }}
              />
            </div>
            <span className="text-xs whitespace-nowrap" style={{ color: "var(--th-text-muted)" }}>
              {task.subtask_done ?? 0}/{task.subtask_total ?? 0}
            </span>
            <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{showSubtasks ? "▲" : "▼"}</span>
          </button>
          {showSubtasks && taskSubtasks.length > 0 && (
            <div className="space-y-1 pl-1">
              {taskSubtasks.map((subtask) => {
                const targetDepartment = subtask.target_department_id
                  ? departments.find((departmentItem) => departmentItem.id === subtask.target_department_id)
                  : null;
                return (
                  <div key={subtask.id} className="flex items-center gap-1.5 text-xs">
                    <span>{SUBTASK_STATUS_ICON[subtask.status] || "\u23F3"}</span>
                    <span
                      className={`flex-1 truncate ${subtask.status === "done" ? "line-through" : ""}`}
                      style={{ color: subtask.status === "done" ? "var(--th-text-muted)" : "var(--th-text-secondary)" }}
                    >
                      {subtask.title}
                    </span>
                    {targetDepartment && (
                      <span
                        className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: targetDepartment.color + "30", color: targetDepartment.color }}
                      >
                        {targetDepartment.icon} {targetDepartment.name_ko}
                      </span>
                    )}
                    {subtask.delegated_task_id && subtask.status !== "done" && (
                      <span
                        className="text-blue-400 shrink-0"
                        title={t({ ko: "위임됨", en: "Delegated", ja: "委任済み", zh: "已委派" })}
                      >
                        🔗
                      </span>
                    )}
                    {subtask.status === "blocked" && subtask.blocked_reason && (
                      <span className="text-red-400 text-[10px] truncate max-w-[80px]" title={subtask.blocked_reason}>
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

      <div className="flex flex-wrap items-center gap-1.5">
        {canRun && (
          <button
            onClick={() => {
              if (!task.assigned_agent_id) {
                setAgentWarning(true);
                setTimeout(() => setAgentWarning(false), 3000);
                return;
              }
              onRunTask(task.id);
            }}
            title={t({ ko: "작업 실행", en: "Run task", ja: "タスク実行", zh: "运行任务" })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-700 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-green-600"
          >
            ▶ {t({ ko: "실행", en: "Run", ja: "実行", zh: "运行" })}
          </button>
        )}
        {canPause && (
          <button
            onClick={() => onPauseTask!(task.id)}
            title={t({ ko: "작업 일시중지", en: "Pause task", ja: "タスク一時停止", zh: "暂停任务" })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-orange-700 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-orange-600"
          >
            ⏸ {t({ ko: "일시중지", en: "Pause", ja: "一時停止", zh: "暂停" })}
          </button>
        )}
        {canStop && (
          <button
            onClick={() => {
              if (
                confirm(
                  t({
                    ko: `"${task.title}" 작업을 중지할까요?\n\n경고: Stop 처리 시 해당 프로젝트 변경분은 롤백됩니다.`,
                    en: `Stop "${task.title}"?\n\nWarning: stopping will roll back project changes.`,
                    ja: `「${task.title}」を停止しますか？\n\n警告: 停止するとプロジェクトの変更はロールバックされます。`,
                    zh: `要停止“${task.title}”吗？\n\n警告：停止后将回滚该项目的更改。`,
                  }),
                )
              ) {
                onStopTask(task.id);
              }
            }}
            title={t({ ko: "작업 중지", en: "Cancel task", ja: "タスク停止", zh: "取消任务" })}
            className="flex items-center justify-center gap-1 rounded-lg bg-red-800 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
          >
            ⏹ {t({ ko: "중지", en: "Cancel", ja: "キャンセル", zh: "取消" })}
          </button>
        )}
        {canResume && (
          <button
            onClick={() => onResumeTask!(task.id)}
            title={t({ ko: "작업 재개", en: "Resume task", ja: "タスク再開", zh: "恢复任务" })}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-blue-700 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600"
          >
            ↩ {t({ ko: "재개", en: "Resume", ja: "再開", zh: "恢复" })}
          </button>
        )}
        {(task.status === "in_progress" ||
          task.status === "review" ||
          task.status === "done" ||
          task.status === "pending") &&
          onOpenTerminal && (
            <button
              onClick={() => onOpenTerminal(task.id)}
              title={t({
                ko: "터미널 출력 보기",
                en: "View terminal output",
                ja: "ターミナル出力を見る",
                zh: "查看终端输出",
              })}
              className="flex items-center justify-center rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-slate-300 transition hover:bg-slate-600 hover:text-white"
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
              title={t({
                ko: "회의록 보기",
                en: "View meeting minutes",
                ja: "会議録を見る",
                zh: "查看会议纪要",
              })}
              className="flex items-center justify-center rounded-lg bg-cyan-800/70 px-2 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-700 hover:text-white"
            >
              📝
            </button>
          )}
        {task.status === "review" && (
          <button
            onClick={() => setShowDiff(true)}
            title={t({
              ko: "변경사항 보기 (Git diff)",
              en: "View changes (Git diff)",
              ja: "変更を見る (Git diff)",
              zh: "查看更改 (Git diff)",
            })}
            className="flex items-center justify-center gap-1 rounded-lg bg-purple-800 px-2 py-1.5 text-xs font-medium text-purple-200 transition hover:bg-purple-700"
          >
            {t({ ko: "Diff", en: "Diff", ja: "差分", zh: "差异" })}
          </button>
        )}
        {canHideTask && !isHiddenTask && onHideTask && (
          <button
            onClick={() => onHideTask(task.id)}
            title={t({
              ko: "완료/보류/취소 작업 숨기기",
              en: "Hide done/pending/cancelled task",
              ja: "完了/保留/キャンセルのタスクを非表示",
              zh: "隐藏已完成/待处理/已取消任务",
            })}
            className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--th-bg-surface-hover)", color: "var(--th-text-secondary)" }}
          >
            {t({ ko: "숨김", en: "Hide", ja: "非表示", zh: "隐藏" })}
          </button>
        )}
        {canHideTask && !!isHiddenTask && onUnhideTask && (
          <button
            onClick={() => onUnhideTask(task.id)}
            title={t({ ko: "숨긴 작업 복원", en: "Restore hidden task", ja: "非表示タスクを復元", zh: "恢复隐藏任务" })}
            className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--th-accent, #2563eb)", color: "white" }}
          >
            {t({ ko: "복원", en: "Restore", ja: "復元", zh: "恢复" })}
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => {
              if (
                confirm(
                  t({
                    ko: `"${task.title}" 업무를 삭제할까요?`,
                    en: `Delete "${task.title}"?`,
                    ja: `「${task.title}」を削除しますか？`,
                    zh: `要删除“${task.title}”吗？`,
                  }),
                )
              )
                onDeleteTask(task.id);
            }}
            title={t({ ko: "작업 삭제", en: "Delete task", ja: "タスク削除", zh: "删除任务" })}
            className="flex items-center justify-center rounded-lg bg-red-900/60 px-2 py-1.5 text-xs text-red-400 transition hover:bg-red-800 hover:text-red-300"
          >
            🗑
          </button>
        )}
      </div>
        </>
      )}

      {showDiff && <DiffModal taskId={task.id} onClose={() => setShowDiff(false)} />}

      {/* Dependencies section — shown when expanded */}
      {!cardCollapsed && (
        <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--th-border)" }}>
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
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-400">{depPredecessors.length}</span>
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
                <div key={dep.id} className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1" style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)" }}>
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
                    className="shrink-0 rounded p-0.5 text-[10px] text-red-400 hover:text-red-300"
                  >✕</button>
                </div>
              ))}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={depInput}
                  onChange={(e) => { setDepInput(e.target.value); setDepError(null); }}
                  placeholder={t({ ko: "태스크 ID 입력", en: "Enter task ID", ja: "タスクIDを入力", zh: "输入任务ID" })}
                  className="flex-1 rounded border px-2 py-1 text-[11px] outline-none"
                  style={{ borderColor: "var(--th-border)", background: "var(--th-bg-primary)", color: "var(--th-text-primary)" }}
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
                  className="rounded border px-2 py-1 text-[11px] transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
                >+</button>
              </div>
              {depError && <p className="text-[10px] text-red-400">{depError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
