import type { TaskStatus } from "../../../types";
import AgentAvatar from "../../AgentAvatar";
import { PersonaBadge } from "../../agent-persona/PersonaBadge";
import { SUBTASK_STATUS_COLOR } from "./constants";
import type { TaskCardState } from "./useTaskCardState";

interface TaskCardBodyProps {
  state: TaskCardState;
}

export function TaskCardBody({ state }: TaskCardBodyProps) {
  const {
    t,
    locale,
    task,
    agents,
    taskSubtasks,
    isHiddenTask,
    expanded,
    typeBadge,
    department,
    executionBadge,
    isInProgress,
    assignedAgent,
    assignedLabel,
    onUpdateTask,
    STATUS_OPTIONS,
    taskStatusLabel,
    timeAgo,
    localeTag,
  } = state;

  return (
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

      <div className="mb-3 flex flex-col gap-2">
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

      {state.subtaskTotal > 0 && (
        <TaskCardSubtasksSection state={state} />
      )}
    </>
  );
}

function TaskCardSubtasksSection({ state }: TaskCardBodyProps) {
  const {
    t,
    taskSubtasks,
    departments,
    subtaskTotal,
    subtaskDoneCount,
    subtaskInProgressCount,
    subtaskBlockedCount,
    subtaskPendingCount,
    showSubtasks,
    setShowSubtasks,
  } = state;

  return (
    <div className="mb-4">
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

      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-mono">
        {subtaskDoneCount > 0 && <span style={{ color: "rgb(52,211,153)" }}>✓ {subtaskDoneCount}</span>}
        {subtaskInProgressCount > 0 && <span style={{ color: "var(--th-accent)" }}>⚡ {subtaskInProgressCount}</span>}
        {subtaskBlockedCount > 0 && <span style={{ color: "rgb(253,164,175)" }}>✖ {subtaskBlockedCount}</span>}
        {subtaskPendingCount > 0 && <span style={{ color: "var(--th-text-muted)" }}>· {subtaskPendingCount} {t({ ko: "대기", en: "pending", ja: "待機", zh: "待处理" })}</span>}
      </div>

      {showSubtasks && taskSubtasks.length > 0 && (
        <div className="space-y-px">
          {taskSubtasks.map((subtask) => {
            const targetDepartment = subtask.target_department_id
              ? departments.find((d) => d.id === subtask.target_department_id)
              : null;
            const color = SUBTASK_STATUS_COLOR[subtask.status] ?? "var(--th-border)";
            return (
              <div
                key={subtask.id}
                className="flex items-center gap-1.5 py-1 pl-2"
                style={{ borderLeft: `2px solid ${color}` }}
              >
                <span
                  className="flex-1 truncate text-[11px] font-mono"
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
  );
}
