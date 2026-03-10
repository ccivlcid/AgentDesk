import React from "react";
import type { Agent, Task } from "../../types";

interface NovelHudProps {
  agents: Agent[];
  tasks: Task[];
}

/** Writer's Retreat HUD — word count goal + chapter progress */
export default function NovelHud({ agents, tasks }: NovelHudProps) {
  const totalChapters = tasks.length;
  const written = tasks.filter((t) => t.status === "done").length;
  const drafting = tasks.filter((t) => t.status === "in_progress").length;

  // Simulated word count from XP
  const totalWords = agents.reduce((sum, a) => sum + (a.stats_xp ?? 0), 0);
  const dailyGoal = 5000;
  const goalPct = Math.min(100, Math.round((totalWords / dailyGoal) * 100));

  return (
    <div className="pack-hud pack-hud--novel">
      <span style={{ color: "#d4a85a" }}>📖</span>
      <span>GOAL: {dailyGoal.toLocaleString()} xp</span>
      <span className="pack-hud__sep" />
      <span>NOW: {totalWords.toLocaleString()}</span>
      <span className="pack-hud__sep" />
      <span className="pack-hud__bar-wrap">
        <span className="pack-hud__bar-fill" style={{ width: `${goalPct}%`, background: "#d4a85a" }} />
      </span>
      <span style={{ color: "var(--th-text-muted)" }}>{goalPct}%</span>
      <span className="pack-hud__sep" />
      <span>{drafting} running</span>
      <span className="pack-hud__sep" />
      <span>{written}/{totalChapters} done</span>
    </div>
  );
}
