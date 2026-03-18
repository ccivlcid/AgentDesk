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

  const activeTasks = tasks.filter((task) => ACTIVE_STATUSES.includes(task.status));

  const STATUS_TEXT: Partial<Record<TaskStatus, string>> = {
    in_progress:   t({ ko: "진행 중", en: "in progress",   ja: "進行中",   zh: "进行中" }),
    pending:       t({ ko: "대기",   en: "pending",        ja: "待機",     zh: "待处理" }),
    collaborating: t({ ko: "협업",   en: "collaborating",  ja: "コラボ",   zh: "协作中" }),
    review:        t({ ko: "검토",   en: "review",         ja: "レビュー", zh: "审查中" }),
    done:          t({ ko: "완료",   en: "done",           ja: "完了",     zh: "已完成" }),
    cancelled:     t({ ko: "취소",   en: "cancelled",      ja: "キャンセル", zh: "已取消" }),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 상단 요약 */}
      <div style={{
        display: "flex",
        gap: 12,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 11,
        color: "var(--th-text-muted)",
        flexShrink: 0,
      }}>
        <span style={{ color: "var(--th-status-success)" }}>{tasks.filter((task) => task.status === "in_progress").length} {STATUS_TEXT.in_progress}</span>
        <span>{tasks.filter((task) => task.status === "pending").length} {STATUS_TEXT.pending}</span>
        <span style={{ color: "var(--th-status-warning)" }}>{tasks.filter((task) => task.status === "review").length} {STATUS_TEXT.review}</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: "var(--th-text-muted)" }}>{activeTasks.length} {t({ ko: "활성", en: "active", ja: "アクティブ", zh: "活动" })}</span>
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
                alignItems: "center",
                gap: 8,
                padding: "5px 10px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "var(--th-hover-overlay-subtle)";
                const btn = el.querySelector<HTMLButtonElement>(".min-btn");
                if (btn) btn.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = "none";
                const btn = el.querySelector<HTMLButtonElement>(".min-btn");
                if (btn) btn.style.opacity = "0";
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 13, color: STATUS_COLOR[task.status] ?? "var(--th-text-muted)", lineHeight: 1.4 }}>
                {STATUS_LABEL[task.status] ?? "○"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {task.title}
                </div>
                {task.assigned_agent && (
                  <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                    {task.assigned_agent.name_ko || task.assigned_agent.name}
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 10, color: STATUS_COLOR[task.status] ?? "var(--th-text-muted)", flexShrink: 0 }}>
                {STATUS_TEXT[task.status] ?? task.status}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setTaskPanel({ taskId: task.id, tab: "minutes" }); }}
                title={t({ ko: "회의록 보기", en: "View meeting minutes", ja: "会議録", zh: "会议纪要" })}
                className="min-btn"
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "1px solid var(--th-border)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 10,
                  color: "var(--th-text-muted)",
                  lineHeight: 1.4,
                  opacity: 0,
                  transition: "opacity 0.15s",
                }}
              >
                {t({ ko: "회의록", en: "min", ja: "議事録", zh: "纪要" })}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
