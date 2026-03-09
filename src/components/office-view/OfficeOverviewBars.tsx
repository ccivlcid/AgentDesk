import React, { useMemo, useCallback } from "react";
import {
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
  BASEMENT_H,
} from "./model";
import type { Department, Agent, Task } from "../../types";

interface OfficeOverviewBarsProps {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  isOverviewMode: boolean;
  /** Called when a bar is clicked — (towerLocalY, scrollOffset) */
  onClickFloor: (logicalY: number, offset: number) => void;
  /** The canvas container ref to read rendered canvas dimensions */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Total tower height (tower-local) */
  totalH: number;
  /** Custom dept themes for accent colors */
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
}

const DEPT_DEFAULT_COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

function hexNumToCSS(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

export default function OfficeOverviewBars({
  departments,
  agents,
  tasks,
  isOverviewMode,
  onClickFloor,
  customDeptThemes,
}: OfficeOverviewBarsProps) {
  const bars = useMemo(() => {
    if (!isOverviewMode) return [];

    const nFloors = departments.length;
    const sections: Array<{
      key: string;
      label: string;
      icon: string;
      accent: string;
      yStart: number;
      working: number;
      total: number;
      extra?: string;
      agentNames?: string[];
    }> = [];

    // CEO (Penthouse)
    const ceoTasks = tasks.filter(t => t.status === "in_progress").length;
    sections.push({
      key: "ceo",
      label: "CEO",
      icon: "👑",
      accent: "#f59e0b",
      yStart: ROOF_H,
      working: ceoTasks,
      total: tasks.length,
      extra: `${ceoTasks} active`,
    });

    // Conference
    const workingCount = agents.filter(a => a.status === "working").length;
    sections.push({
      key: "conf",
      label: "CONF",
      icon: "🤝",
      accent: "#a855f7",
      yStart: ROOF_H + PENTHOUSE_H,
      working: workingCount,
      total: agents.length,
      extra: workingCount > 0 ? `${workingCount} working` : "",
    });

    // Department floors
    departments.forEach((dept, i) => {
      const deptAgents = agents.filter(a => a.department_id === dept.id);
      const working = deptAgents.filter(a => a.status === "working").length;
      const accent = customDeptThemes?.[dept.id]?.accent
        ? hexNumToCSS(customDeptThemes[dept.id].accent)
        : DEPT_DEFAULT_COLORS[i % DEPT_DEFAULT_COLORS.length];

      sections.push({
        key: dept.id,
        label: dept.name,
        icon: dept.icon || "🏢",
        accent,
        yStart: ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + i * FLOOR_TOTAL_H,
        working,
        total: deptAgents.length,
        agentNames: deptAgents.map(a => a.name),
      });
    });

    // Break Room
    const breakAgents = agents.filter(a => a.status === "break" || a.status === "idle");
    sections.push({
      key: "break",
      label: "BREAK",
      icon: "☕",
      accent: "#92400e",
      yStart: ROOF_H + PENTHOUSE_H + CONFERENCE_FLOOR_H + nFloors * FLOOR_TOTAL_H,
      working: 0,
      total: breakAgents.length,
      extra: breakAgents.length > 0 ? `${breakAgents.length} resting` : "",
    });

    return sections;
  }, [isOverviewMode, departments, agents, tasks, customDeptThemes]);

  const handleClick = useCallback((yStart: number) => {
    onClickFloor(yStart, 0.35);
  }, [onClickFloor]);

  if (!isOverviewMode || bars.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        background: "var(--th-bg-primary, #0a0a0a)",
        overflow: "auto",
      }}
    >
      {bars.map((bar) => (
        <div
          key={bar.key}
          onClick={() => handleClick(bar.yStart)}
          style={{
            flex: 1,
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            borderLeft: `3px solid ${bar.accent}`,
            borderBottom: "1px solid var(--th-border, rgba(255,255,255,0.06))",
            cursor: "pointer",
            transition: "background 0.12s",
            background: "transparent",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-surface-hover, rgba(255,255,255,0.04))"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {/* Icon */}
          <span style={{ fontSize: 16, flexShrink: 0, width: 24, textAlign: "center" }}>{bar.icon}</span>

          {/* Name */}
          <span
            style={{
              fontFamily: "var(--th-font-mono)",
              fontSize: 13,
              color: bar.accent,
              fontWeight: 700,
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {bar.label}
          </span>

          {/* Agent dots */}
          {bar.total > 0 && bar.key !== "ceo" && (
            <span style={{ display: "flex", gap: 3, flexShrink: 0, alignItems: "center" }}>
              {Array.from({ length: Math.min(bar.total, 12) }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i < bar.working ? bar.accent : "var(--th-border-strong, rgba(255,255,255,0.15))",
                    display: "inline-block",
                  }}
                />
              ))}
              {bar.total > 12 && (
                <span style={{ fontSize: 10, color: "var(--th-text-muted, rgba(255,255,255,0.35))", fontFamily: "var(--th-font-mono)" }}>
                  +{bar.total - 12}
                </span>
              )}
            </span>
          )}

          {/* Count */}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--th-font-mono)",
              fontSize: 12,
              color: "var(--th-text-secondary, rgba(255,255,255,0.45))",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {bar.extra || (bar.total > 0 ? `${bar.working}/${bar.total}` : "")}
          </span>
        </div>
      ))}
    </div>
  );
}
