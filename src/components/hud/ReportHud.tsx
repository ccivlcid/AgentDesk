import React from "react";
import type { Task } from "../../types";

interface ReportHudProps {
  tasks: Task[];
}

/** Editorial Newsroom HUD — deadline countdown + story progress */
export default function ReportHud({ tasks }: ReportHudProps) {
  const activeTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const totalStories = activeTasks.length + doneTasks.length;
  const pct = totalStories > 0 ? Math.round((doneTasks.length / totalStories) * 100) : 0;

  // Simulated deadline (end of current day)
  const now = new Date();
  const eod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
  const diffMs = Math.max(0, eod.getTime() - now.getTime());
  const hoursLeft = Math.floor(diffMs / 3600000);
  const minsLeft = Math.floor((diffMs % 3600000) / 60000);

  return (
    <div className="pack-hud pack-hud--report">
      <span className="pack-hud__badge" style={{ color: "#ef4444" }}>DEADLINE</span>
      <span className="pack-hud__sep" />
      <span>{totalStories} Tasks</span>
      <span className="pack-hud__sep" />
      <span>{hoursLeft}h {minsLeft}m left</span>
      <span className="pack-hud__sep" />
      <span>{doneTasks.length} Done</span>
      <span className="pack-hud__sep" />
      <span className="pack-hud__bar-wrap">
        <span className="pack-hud__bar-fill" style={{ width: `${pct}%`, background: "#22c55e" }} />
      </span>
      <span style={{ color: "var(--th-text-muted)" }}>{pct}%</span>
    </div>
  );
}
