import { useMemo, useState } from "react";
import type { Task } from "../../types";
import type { TFunction } from "../taskboard/constants";

interface Props {
  tasks: Task[];
  t: TFunction;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DOW_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DashboardCalendar({ tasks, t }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const completionsByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const task of tasks) {
      if (task.completed_at && task.status === "done") {
        const day = startOfDay(task.completed_at);
        map.set(day, (map.get(day) ?? 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const creationsByDay = useMemo(() => {
    const map = new Map<number, number>();
    for (const task of tasks) {
      const day = startOfDay(task.created_at);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const { daysInMonth, firstDow } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    return { daysInMonth: lastDay.getDate(), firstDow: firstDay.getDay() };
  }, [viewYear, viewMonth]);

  const todayStart = startOfDay(Date.now());
  const maxDone = Math.max(...Array.from(completionsByDay.values()), 1);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  // Build cell list: null = empty, number = day
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Summary counts for current view month
  const monthDone = useMemo(() => {
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTs = new Date(viewYear, viewMonth, d).getTime();
      total += completionsByDay.get(dayTs) ?? 0;
    }
    return total;
  }, [completionsByDay, viewYear, viewMonth, daysInMonth]);

  const monthCreated = useMemo(() => {
    let total = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayTs = new Date(viewYear, viewMonth, d).getTime();
      total += creationsByDay.get(dayTs) ?? 0;
    }
    return total;
  }, [creationsByDay, viewYear, viewMonth, daysInMonth]);

  return (
    <div className="space-y-3 p-4" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: "2px" }}>
      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="px-2 py-1 text-xs font-mono transition hover:opacity-70"
          style={{ color: "var(--th-text-muted)", border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)" }}
        >
          ‹
        </button>
        <div className="text-center">
          <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: "var(--th-text-heading)" }}>
            {monthLabel}
          </span>
          <div className="flex items-center justify-center gap-3 mt-0.5">
            <span className="text-[10px] font-mono" style={{ color: "rgb(167,243,208)" }}>
              ✓ {monthDone}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
              + {monthCreated}
            </span>
          </div>
        </div>
        <button
          onClick={nextMonth}
          className="px-2 py-1 text-xs font-mono transition hover:opacity-70"
          style={{ color: "var(--th-text-muted)", border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)" }}
        >
          ›
        </button>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 gap-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dayTs = new Date(viewYear, viewMonth, day).getTime();
          const done = completionsByDay.get(dayTs) ?? 0;
          const created = creationsByDay.get(dayTs) ?? 0;
          const isToday = dayTs === todayStart;
          const intensity = done > 0 ? Math.min(0.25 + (done / maxDone) * 0.55, 0.8) : 0;

          return (
            <div
              key={day}
              className="flex flex-col items-center justify-center"
              style={{
                height: 28,
                borderRadius: "2px",
                border: isToday
                  ? "1px solid var(--th-accent)"
                  : done > 0
                    ? "1px solid rgba(52,211,153,0.35)"
                    : "1px solid var(--th-border)",
                background: done > 0
                  ? `rgba(52,211,153,${intensity})`
                  : isToday
                    ? "rgba(251,191,36,0.08)"
                    : "var(--th-bg-primary)",
              }}
              title={`${String(viewYear)}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}: ${done} done, ${created} created`}
            >
              <span
                className="text-[10px] font-mono leading-none"
                style={{
                  color: isToday ? "var(--th-accent)" : done > 0 ? "rgb(167,243,208)" : "var(--th-text-muted)",
                  fontWeight: isToday ? "bold" : "normal",
                }}
              >
                {day}
              </span>
              {done > 0 && (
                <span className="text-[8px] font-mono leading-none mt-px" style={{ color: "rgb(134,239,172)" }}>
                  {done}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1" style={{ borderTop: "1px solid var(--th-border)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3" style={{ borderRadius: "1px", background: "rgba(52,211,153,0.5)" }} />
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3" style={{ borderRadius: "1px", border: "1px solid var(--th-accent)" }} />
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "오늘", en: "Today", ja: "今日", zh: "今天" })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "숫자 = 해당일 완료 수", en: "number = completions that day", ja: "数 = その日の完了数", zh: "数字 = 当日完成数" })}
          </span>
        </div>
      </div>
    </div>
  );
}
