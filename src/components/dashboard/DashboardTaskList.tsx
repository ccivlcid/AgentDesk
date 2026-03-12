import type { Agent, Task, TaskStatus } from "../../types";

interface DashboardTaskListProps {
  tasks: Task[];
  agents: Agent[];
  onGoToTasks?: () => void;
  t: (map: { ko: string; en: string; ja: string; zh: string }) => string;
  fillHeight?: boolean;
}

const STATUS_ORDER: TaskStatus[] = [
  "in_progress", "review", "collaborating",
  "planned", "pending", "inbox",
  "done",
  "cancelled",
];

const STATUS_META: Record<TaskStatus, { sigil: string; color: string; label: string }> = {
  in_progress:   { sigil: "●", color: "#f59e0b",  label: "RUN" },
  review:        { sigil: "◑", color: "#a78bfa",  label: "REV" },
  collaborating: { sigil: "◈", color: "#60a5fa",  label: "COL" },
  planned:       { sigil: "○", color: "#94a3b8",  label: "PLN" },
  pending:       { sigil: "◌", color: "#64748b",  label: "PND" },
  inbox:         { sigil: "·", color: "#475569",  label: "NEW" },
  done:          { sigil: "✓", color: "#4ade80",  label: "DONE" },
  cancelled:     { sigil: "✗", color: "#f87171",  label: "ERR" },
};

const SHOW_MAX: Partial<Record<TaskStatus, number>> = {
  done: 3,
  cancelled: 2,
};

export default function DashboardTaskList({ tasks, agents, onGoToTasks, t, fillHeight = false }: DashboardTaskListProps) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  // Sort tasks by status priority order, then by updated_at desc
  const sorted = [...tasks].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return b.updated_at - a.updated_at;
  });

  // Apply per-status caps
  const counts: Partial<Record<TaskStatus, number>> = {};
  const visible = sorted.filter((task) => {
    const max = SHOW_MAX[task.status];
    if (max === undefined) return true;
    counts[task.status] = (counts[task.status] ?? 0) + 1;
    return (counts[task.status] ?? 0) <= max;
  });

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <div style={fillHeight ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : { flexShrink: 0, borderBottom: "1px solid var(--th-border)" }}>
      {/* 헤더 */}
      <div
        style={{
          ...mono,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 16px",
          background: "var(--th-bg-elevated)",
          borderBottom: "1px solid var(--th-border)",
          borderLeft: "3px solid var(--th-accent)",
        }}
      >
        <span style={{ fontSize: "9px", color: "var(--th-accent)", opacity: 0.7 }}>//</span>
        <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", flex: 1, textTransform: "uppercase" }}>
          {t({ ko: "태스크", en: "tasks", ja: "タスク", zh: "任务" })}
          <span style={{ opacity: 0.5, marginLeft: 6 }}>({tasks.length})</span>
        </span>
        {onGoToTasks && (
          <button
            onClick={onGoToTasks}
            style={{ ...mono, fontSize: "9px", background: "none", border: "none", color: "var(--th-accent)", cursor: "pointer", padding: "0 2px", opacity: 0.8 }}
          >
            {t({ ko: "전체 →", en: "all →", ja: "全て →", zh: "全部 →" })}
          </button>
        )}
      </div>

      {/* 태스크 목록 */}
      <div style={fillHeight ? { overflowY: "auto", flex: 1, minHeight: 0, background: "var(--th-bg-primary)" } : { overflowY: "auto", maxHeight: "196px", background: "var(--th-bg-primary)" }}>
        {visible.length === 0 ? (
          <div style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.35, padding: "12px 16px", textAlign: "center" }}>
            {t({ ko: "$ ls tasks/ (empty)", en: "$ ls tasks/ (empty)", ja: "$ ls tasks/ (empty)", zh: "$ ls tasks/ (empty)" })}
          </div>
        ) : (
          visible.map((task) => {
            const meta = STATUS_META[task.status];
            const agent = task.assigned_agent_id ? agentMap.get(task.assigned_agent_id) : null;
            const agentName = agent?.name ?? task.agent_name ?? null;

            return (
              <button
                key={task.id}
                onClick={onGoToTasks}
                className="group w-full text-left"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--th-border)",
                  cursor: onGoToTasks ? "pointer" : "default",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (onGoToTasks) e.currentTarget.style.background = "var(--th-bg-elevated)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* 상태 sigil */}
                <span
                  style={{
                    ...mono,
                    fontSize: "11px",
                    color: meta.color,
                    flexShrink: 0,
                    width: 12,
                    textAlign: "center",
                    opacity: task.status === "done" ? 0.5 : 1,
                  }}
                >
                  {meta.sigil}
                </span>

                {/* 제목 */}
                <span
                  style={{
                    ...mono,
                    fontSize: "10px",
                    color: task.status === "done" || task.status === "cancelled"
                      ? "var(--th-text-muted)"
                      : "var(--th-text-primary)",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: task.status === "done" ? 0.5 : 1,
                    textDecoration: task.status === "done" ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </span>

                {/* 에이전트 */}
                {agentName && (
                  <span
                    style={{
                      ...mono,
                      fontSize: "9px",
                      color: "var(--th-text-muted)",
                      flexShrink: 0,
                      maxWidth: 72,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      opacity: 0.55,
                    }}
                  >
                    @{agentName}
                  </span>
                )}

                {/* 상태 레이블 (hover 시 표시) */}
                <span
                  style={{
                    ...mono,
                    fontSize: "8px",
                    color: meta.color,
                    flexShrink: 0,
                    opacity: 0.6,
                    letterSpacing: "0.05em",
                  }}
                >
                  {meta.label}
                </span>
              </button>
            );
          })
        )}

        {/* 잘린 태스크 있을 때 footer */}
        {visible.length < tasks.length && onGoToTasks && (
          <button
            onClick={onGoToTasks}
            style={{
              ...mono,
              display: "block",
              width: "100%",
              padding: "6px 16px",
              background: "transparent",
              border: "none",
              borderTop: "1px solid var(--th-border)",
              fontSize: "9px",
              color: "var(--th-accent)",
              cursor: "pointer",
              textAlign: "left",
              opacity: 0.7,
            }}
          >
            +{tasks.length - visible.length} {t({ ko: "개 더 보기 →", en: "more →", ja: "件以上 →", zh: "条以上 →" })}
          </button>
        )}
      </div>
    </div>
  );
}
