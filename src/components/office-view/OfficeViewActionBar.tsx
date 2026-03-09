import React from "react";
import type { Agent } from "../../types";

export interface OfficeViewActionBarProps {
  packVocab: { agent: string; task: string; department: string; onBreak: string; running: string; idle: string };
  agents: Agent[];
  tasks: Array<{ status: string }>;
  departmentCount: number;
  visitorCount: number;
}

export default function OfficeViewActionBar({
  packVocab,
  agents,
  tasks,
  departmentCount,
  visitorCount,
}: OfficeViewActionBarProps) {
  const workingCount = agents.filter((a) => a.status === "working").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const onBreakCount = agents.filter((a) => a.status === "break").length;

  return (
    <div className="office-actionbar">
      <div className="office-actionbar-stat">
        <span className="office-actionbar-stat__lbl">
          {packVocab.agent.slice(0, 3).toUpperCase()}
        </span>
        <span className="office-actionbar-stat__val" style={{ color: "#22c55e" }}>
          {workingCount}
        </span>
        <span className="office-actionbar-stat__total">/{agents.length}</span>
      </div>
      <div className="office-actionbar-sep" />
      <div className="office-actionbar-stat">
        <span className="office-actionbar-stat__lbl">
          {packVocab.task.slice(0, 3).toUpperCase()}
        </span>
        <span className="office-actionbar-stat__val" style={{ color: "var(--th-accent)" }}>
          {inProgressCount}
        </span>
        <span className="office-actionbar-stat__total">/{tasks.length}</span>
      </div>
      <div className="office-actionbar-sep" />
      <div className="office-actionbar-stat">
        <span className="office-actionbar-stat__lbl">
          {packVocab.department.slice(0, 4).toUpperCase()}
        </span>
        <span className="office-actionbar-stat__val">{departmentCount}</span>
      </div>
      <div className="office-actionbar-sep" />
      <div className="office-actionbar-stat">
        <span className="office-actionbar-stat__lbl">
          {packVocab.onBreak.slice(0, 5).toUpperCase()}
        </span>
        <span className="office-actionbar-stat__val" style={{ color: "rgba(245,158,11,0.7)" }}>
          {onBreakCount}
        </span>
      </div>
      {visitorCount > 0 && (
        <>
          <div className="office-actionbar-sep" />
          <div className="office-actionbar-stat">
            <span className="office-actionbar-stat__lbl">VISIT</span>
            <span className="office-actionbar-stat__val" style={{ color: "#22c55e" }}>
              {visitorCount}
            </span>
          </div>
        </>
      )}
      <div className="office-actionbar-info" style={{ marginLeft: "auto" }}>
        <span
          style={{
            color: workingCount > 0 ? "#22c55e" : "var(--th-text-muted)",
          }}
        >
          {workingCount > 0 ? packVocab.running.toUpperCase() : packVocab.idle.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
