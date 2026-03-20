import { COLUMNS } from "../taskboard/constants";
import type { TaskBoardState } from "./useTaskBoard";

interface TaskBoardStatusBarProps {
  state: TaskBoardState;
}

export function TaskBoardStatusBar({ state }: TaskBoardStatusBarProps) {
  const {
    t,
    mono,
    statusCodeMap,
    statusCounts,
    showAllTasks,
    setShowAllTasks,
    hiddenTaskCount,
  } = state;

  return (
    <div
      className="flex-shrink-0 flex items-center gap-0 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}
    >
      {COLUMNS.map((col, i) => {
        const sc = statusCodeMap[col.status];
        const count = statusCounts[col.status] ?? 0;
        return (
          <div
            key={col.status}
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{ borderRight: i < COLUMNS.length - 1 ? "1px solid var(--th-border)" : "none", flexShrink: 0 }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: count > 0 ? sc.color : "var(--th-border)", display: "inline-block", flexShrink: 0 }} />
            <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: count > 0 ? sc.color : "var(--th-text-muted)", letterSpacing: "0.06em" }}>
              {sc.code}
            </span>
            <span style={{ ...mono, fontSize: "9px", color: count > 0 ? "var(--th-text-secondary)" : "var(--th-text-muted)", fontWeight: count > 0 ? 700 : 400 }}>
              {count}
            </span>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => setShowAllTasks((prev) => !prev)}
        style={{
          ...mono, fontSize: "9px", padding: "0 12px", height: "100%",
          borderRadius: 6,
          background: showAllTasks ? "rgba(245,158,11,0.06)" : "transparent",
          color: showAllTasks ? "var(--th-accent)" : "var(--th-text-muted)",
          borderTop: "none", borderBottom: "none", borderRight: "none", borderLeft: "1px solid var(--th-border)", cursor: "pointer", flexShrink: 0, fontWeight: 700,
        }}
      >
        {showAllTasks
          ? t({ ko: "전체", en: "ALL", ja: "全", zh: "全" })
          : t({ ko: "진행중", en: "ACTIVE", ja: "進行", zh: "进行" })}
        {hiddenTaskCount > 0 && <span style={{ marginLeft: 4, opacity: 0.6 }}>({hiddenTaskCount})</span>}
      </button>
    </div>
  );
}
