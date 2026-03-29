import { useState, useEffect, useRef } from "react";
import type { Task, Project } from "../../types";

const mono = "var(--th-font-mono)";

interface TopBarProps {
  project: Project | null;
  tasks: Task[];
}

export default function TopBar({ project, tasks }: TopBarProps) {
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const totalCount = tasks.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Elapsed timer since first in_progress task
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const firstActive = tasks.find((t) => t.status === "in_progress" || t.status === "done");
    if (firstActive && !startRef.current) {
      startRef.current = Date.now();
    }
    if (!firstActive) return;

    const iv = setInterval(() => {
      if (startRef.current) setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [tasks]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: 36,
      padding: "0 16px",
      background: "var(--th-bg-header)",
      borderBottom: "1px solid var(--th-border)",
      fontFamily: mono,
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, minWidth: 0, overflow: "hidden" }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--th-accent)",
          boxShadow: "0 0 6px rgba(245,158,11,0.4)",
          flexShrink: 0,
        }} />
        <span style={{ color: "var(--th-text-muted)", fontWeight: 700 }}>AGENT TEAM</span>
        <span style={{ color: "var(--th-border-strong)" }}>/</span>
        <span style={{
          color: "var(--th-text-secondary)", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {project?.name ?? "No Project"}
        </span>
        {project?.core_goal && (
          <>
            <span style={{ color: "var(--th-border-strong)" }}>/</span>
            <span style={{
              color: "var(--th-text-muted)", fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {project.core_goal.length > 40 ? project.core_goal.slice(0, 38) + ".." : project.core_goal}
            </span>
          </>
        )}
      </div>

      {/* Right: progress + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 120, height: 3,
            background: "var(--th-border)",
            borderRadius: 2,
            overflow: "hidden",
          }}>
            <div style={{
              width: `${percent}%`,
              height: 3,
              background: "var(--th-accent)",
              borderRadius: 2,
              transition: "width 0.5s ease",
              boxShadow: percent > 0 ? "0 0 4px rgba(245,158,11,0.3)" : "none",
            }} />
          </div>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontWeight: 700, width: 30 }}>
            {percent}%
          </span>
        </div>

        {/* Elapsed time */}
        <span style={{ fontSize: 11, color: "var(--th-text-muted)", fontWeight: 600, letterSpacing: "0.05em" }}>
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
}
