import { useTaskStore } from "../../../store/taskStore";
import { useI18n } from "../../../i18n";
import type { TaskStatus } from "../../../types";

const mono = "var(--th-font-mono)";

const STATUS_COLOR: Partial<Record<TaskStatus, string>> = {
  in_progress:   "var(--th-status-success)",
  pending:       "var(--th-status-muted)",
  collaborating: "var(--th-status-cyan)",
  review:        "var(--th-status-warning)",
  done:          "var(--th-status-info)",
  cancelled:     "var(--th-text-muted)",
};

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  in_progress:   "▶",
  pending:       "○",
  collaborating: "⟳",
  review:        "?",
  done:          "✓",
  cancelled:     "✕",
};

const ACTIVE_STATUSES: TaskStatus[] = ["in_progress", "pending", "collaborating", "review", "planned"];

export default function TasksWidget() {
  const { tasks, setTaskPanel } = useTaskStore();
  const { t } = useI18n();

  const activeTasks = tasks.filter((t) => ACTIVE_STATUSES.includes(t.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 상단 요약 */}
      <div style={{
        display: "flex",
        gap: 12,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
      }}>
        <span style={{ color: "var(--th-status-success)" }}>{tasks.filter((t) => t.status === "in_progress").length} in progress</span>
        <span>{tasks.filter((t) => t.status === "pending").length} pending</span>
        <span style={{ color: "var(--th-status-warning)" }}>{tasks.filter((t) => t.status === "review").length} review</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "var(--th-text-muted)" }}>{activeTasks.length} active</span>
      </div>

      {/* 태스크 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {activeTasks.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            {t({ ko: "실행 중인 태스크 없음", en: "No active tasks", ja: "アクティブなタスクなし", zh: "无活动任务" })}
          </div>
        ) : (
          activeTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setTaskPanel({ taskId: task.id, tab: "terminal" })}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "5px 10px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "none"; }}
            >
              <span style={{ fontFamily: mono, fontSize: 13, color: STATUS_COLOR[task.status] ?? "#64748b", lineHeight: 1.4 }}>
                {STATUS_LABEL[task.status] ?? "○"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title}
                </div>
                {task.assigned_agent && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    → {task.assigned_agent.name_ko || task.assigned_agent.name}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 9, color: STATUS_COLOR[task.status] ?? "#64748b", flexShrink: 0 }}>
                {task.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
