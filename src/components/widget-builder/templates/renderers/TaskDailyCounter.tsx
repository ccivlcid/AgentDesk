import { useMemo } from "react";
import { useTaskStore } from "../../../../store/taskStore";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function TaskDailyCounter({ config }: { config: CustomFeatureConfig }) {
  const { tasks } = useTaskStore();
  const showTarget = config.params?.showTarget as boolean | undefined;
  const target = (config.params?.target as number | undefined) ?? 10;

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const count = tasks.filter(
    (t) => t.status === "done" && t.updated_at >= todayStart,
  ).length;

  const pct = showTarget && target > 0 ? Math.min(100, Math.round((count / target) * 100)) : null;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      <div style={{ ...mono, fontSize: 52, fontWeight: 800, color: "var(--th-attr-elite)", lineHeight: 1 }}>
        {count}
      </div>
      <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>오늘 완료된 태스크</div>
      {pct !== null && (
        <div className="w-full px-4">
          <div className="flex justify-between mb-1">
            <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>목표 {target}건</span>
            <span style={{ ...mono, fontSize: 9, color: "var(--th-accent)" }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--th-attr-elite)", borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>
        </div>
      )}
    </div>
  );
}
