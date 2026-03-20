import type { TaskCardState } from "./useTaskCardState";
import { priorityIcon, priorityLabel } from "../constants";

interface TaskCardHeaderProps {
  state: TaskCardState;
}

export function TaskCardHeader({ state }: TaskCardHeaderProps) {
  const {
    t,
    task,
    cardCollapsed,
    setCardCollapsed,
    isInProgress,
    expanded,
    setExpanded,
  } = state;

  return (
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
  );
}
