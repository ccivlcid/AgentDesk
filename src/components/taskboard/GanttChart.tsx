import { useState, useMemo } from "react";
import { useI18n } from "../../i18n";
import type { Task, Agent, Department } from "../../types";

interface Props {
  tasks: Task[];
  agents: Agent[];
  departments: Department[];
}

type ZoomLevel = "day" | "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  done: "bg-emerald-500/80",
  in_progress: "bg-sky-500/80",
  review: "bg-amber-500/80",
  collaborating: "bg-violet-500/80",
  planned: "bg-slate-400/60",
  inbox: "bg-slate-500/40",
  pending: "bg-orange-400/60",
  cancelled: "bg-red-500/30",
};

const STATUS_LABELS: Record<string, { ko: string; en: string }> = {
  done: { ko: "완료", en: "Done" },
  in_progress: { ko: "진행중", en: "In Progress" },
  review: { ko: "리뷰", en: "Review" },
  collaborating: { ko: "협업", en: "Collab" },
  planned: { ko: "계획", en: "Planned" },
  inbox: { ko: "수신함", en: "Inbox" },
  pending: { ko: "대기", en: "Pending" },
  cancelled: { ko: "취소", en: "Cancelled" },
};

function daysBetween(a: number, b: number): number {
  return Math.ceil((b - a) / 86_400_000);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateFull(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

export default function GanttChart({ tasks, agents, departments }: Props) {
  const { t, locale } = useI18n();
  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDept, setFilterDept] = useState<string>("all");

  // Filter tasks that have meaningful time data
  const chartTasks = useMemo(() => {
    let filtered = tasks.filter(
      (t) => t.created_at && t.status !== "cancelled",
    );
    if (filterStatus !== "all") filtered = filtered.filter((t) => t.status === filterStatus);
    if (filterDept !== "all") filtered = filtered.filter((t) => t.department_id === filterDept);
    // Sort by start time
    return filtered.sort((a, b) => (a.started_at ?? a.created_at) - (b.started_at ?? b.created_at));
  }, [tasks, filterStatus, filterDept]);

  // Calculate time range
  const timeRange = useMemo(() => {
    if (chartTasks.length === 0) return { start: Date.now(), end: Date.now() + 86_400_000 * 7, days: 7 };
    const starts = chartTasks.map((t) => t.started_at ?? t.created_at);
    const ends = chartTasks.map((t) => t.completed_at ?? Date.now());
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    // Add 1 day padding on each side
    const start = minStart - 86_400_000;
    const end = maxEnd + 86_400_000;
    return { start, end, days: Math.max(daysBetween(start, end), 1) };
  }, [chartTasks]);

  // Column width based on zoom
  const colWidth = zoom === "day" ? 40 : zoom === "week" ? 24 : 12;
  const totalWidth = timeRange.days * colWidth;

  // Generate time headers
  const headers = useMemo(() => {
    const result: { label: string; width: number; isWeekend?: boolean }[] = [];
    const cursor = new Date(timeRange.start);
    cursor.setHours(0, 0, 0, 0);

    for (let i = 0; i < timeRange.days; i++) {
      const d = new Date(cursor.getTime() + i * 86_400_000);
      const dow = d.getDay();
      if (zoom === "day") {
        result.push({
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          width: colWidth,
          isWeekend: dow === 0 || dow === 6,
        });
      } else if (zoom === "week") {
        if (dow === 1 || i === 0) {
          result.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, width: colWidth });
        }
      } else {
        if (d.getDate() === 1 || i === 0) {
          result.push({ label: `${d.getFullYear()}.${d.getMonth() + 1}`, width: colWidth });
        }
      }
    }
    return result;
  }, [timeRange, zoom, colWidth]);

  // Resolve agent name
  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  function getBarPosition(task: Task): { left: number; width: number } {
    const start = task.started_at ?? task.created_at;
    const end = task.completed_at ?? Date.now();
    const leftDays = daysBetween(timeRange.start, start);
    const durationDays = Math.max(daysBetween(start, end), 0.5);
    return {
      left: leftDays * colWidth,
      width: Math.max(durationDays * colWidth, 8),
    };
  }

  if (chartTasks.length === 0) {
    return (
      <div className="text-center py-16 font-mono" style={{ color: "var(--th-text-muted)" }}>
        <p>{tr("표시할 태스크가 없습니다", "No tasks to display")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-0.5" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          {(["day", "week", "month"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="px-3 py-1 text-xs font-mono transition"
              style={zoom === z
                ? { borderRadius: "2px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.5)", color: "var(--th-accent)" }
                : { borderRadius: "2px", background: "transparent", border: "1px solid transparent", color: "var(--th-text-muted)" }}
            >
              {z === "day" ? tr("일", "Day") : z === "week" ? tr("주", "Week") : tr("월", "Month")}
            </button>
          ))}
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2 py-1 text-xs font-mono outline-none"
          style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
        >
          <option value="all">{tr("전체 상태", "All Status")}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {locale === "ko" ? v.ko : v.en}
            </option>
          ))}
        </select>

        {departments.length > 0 && (
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-2 py-1 text-xs font-mono outline-none"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}
          >
            <option value="all">{tr("전체 부서", "All Depts")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon} {locale === "ko" ? d.name_ko : d.name}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
          {chartTasks.length} {tr("건", "tasks")}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`w-3 h-2 rounded-sm ${STATUS_COLORS[k]}`} />
            {locale === "ko" ? v.ko : v.en}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-primary)" }}>
        <div className="flex">
          {/* Left: Task names */}
          <div className="shrink-0 w-52" style={{ borderRight: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
            {/* Header placeholder */}
            <div className="h-8 px-2 flex items-center" style={{ borderBottom: "1px solid var(--th-border)" }}>
              <span className="text-[10px] font-semibold font-mono" style={{ color: "var(--th-text-muted)" }}>
                {tr("태스크", "Task")}
              </span>
            </div>
            {/* Task labels */}
            {chartTasks.map((task) => {
              const agent = task.assigned_agent_id ? agentMap.get(task.assigned_agent_id) : null;
              return (
                <div
                  key={task.id}
                  className="h-7 px-2 flex items-center gap-1 hover:bg-slate-800/30 transition"
                  style={{ borderBottom: "1px solid var(--th-border)" }}
                  title={task.title}
                >
                  {agent && <span className="text-xs">{agent.avatar_emoji}</span>}
                  <span className="text-[11px] font-mono truncate flex-1" style={{ color: "var(--th-text-secondary)" }}>
                    {task.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Timeline */}
          <div className="flex-1 overflow-x-auto">
            <div style={{ minWidth: totalWidth }}>
              {/* Time header */}
              <div className="h-8 flex" style={{ borderBottom: "1px solid var(--th-border)" }}>
                {headers.map((h, i) => (
                  <div
                    key={i}
                    className="shrink-0 flex items-center justify-center text-[10px] font-mono"
                    style={{
                      width: h.width,
                      borderRight: "1px solid var(--th-border)",
                      background: h.isWeekend ? "var(--th-bg-elevated)" : "transparent",
                      color: h.isWeekend ? "var(--th-text-muted)" : "var(--th-text-secondary)",
                    }}
                  >
                    {h.label}
                  </div>
                ))}
              </div>

              {/* Bars */}
              {chartTasks.map((task) => {
                const { left, width } = getBarPosition(task);
                const statusColor = STATUS_COLORS[task.status] ?? STATUS_COLORS.inbox;
                const startTs = task.started_at ?? task.created_at;
                const endTs = task.completed_at ?? Date.now();

                return (
                  <div
                    key={task.id}
                    className="h-7 relative"
                    style={{ borderBottom: "1px solid var(--th-border)" }}
                  >
                    {/* Today marker */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-500/30"
                      style={{
                        left: daysBetween(timeRange.start, Date.now()) * colWidth,
                      }}
                    />
                    {/* Bar */}
                    <div
                      className={`absolute top-1 h-5 ${statusColor} cursor-default transition-all hover:brightness-110`}
                      style={{ borderRadius: "2px", left, width }}
                      title={`${task.title}\n${formatDateFull(startTs)} → ${task.completed_at ? formatDateFull(endTs) : tr("진행중", "ongoing")}\n${locale === "ko" ? STATUS_LABELS[task.status]?.ko : STATUS_LABELS[task.status]?.en}`}
                    >
                      {width > 60 && (
                        <span className="absolute inset-0 flex items-center px-1.5 text-[9px] text-white/90 truncate font-medium">
                          {task.title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
        <span>
          {tr("기간", "Period")}: {formatDate(timeRange.start)} — {formatDate(timeRange.end)} ({timeRange.days}{tr("일", "d")})
        </span>
        <span className="flex items-center gap-1">
          <span className="w-px h-3 bg-red-500/50" />
          {tr("오늘", "Today")}
        </span>
      </div>
    </div>
  );
}
