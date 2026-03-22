import type { TaskCardState } from "./useTaskCardState";

interface TaskCardHeaderProps {
  state: TaskCardState;
}

const RUNTIME_BADGE: Record<string, { label: string; color: string; pulse?: boolean }> = {
  thinking:  { label: "THINKING",  color: "#5ac8fa", pulse: true },
  tool_use:  { label: "TOOL USE",  color: "#f59e0b", pulse: true },
  complete:  { label: "DONE",      color: "#30d158" },
  error:     { label: "ERROR",     color: "#ff453a" },
};

export function TaskCardHeader({ state }: TaskCardHeaderProps) {
  const {
    t,
    task,
    cardCollapsed,
    setCardCollapsed,
    runtimeStatus,
    isInProgress,
    expanded,
    setExpanded,
  } = state;

  const badge = runtimeStatus ? RUNTIME_BADGE[runtimeStatus.status] : null;

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
        {badge && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "1px 6px", borderRadius: 3,
            background: `${badge.color}18`, border: `1px solid ${badge.color}33`,
            fontFamily: "var(--th-font-mono, monospace)", fontSize: 8, fontWeight: 700,
            color: badge.color, letterSpacing: "0.06em", flexShrink: 0,
          }}>
            {badge.pulse && <span style={{ width: 4, height: 4, borderRadius: "50%", background: badge.color, animation: "pulse 1.5s infinite" }} />}
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
