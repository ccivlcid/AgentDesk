import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import {
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
  BASEMENT_H,
  FLOOR_W,
  SKY_H,
  GROUND_H,
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

/** Compute tower overlay position from rendered canvas */
function useTowerRect(
  containerRef: React.RefObject<HTMLDivElement | null>,
  totalH: number,
  isOverviewMode: boolean,
) {
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!isOverviewMode) { setRect(null); return; }

    const measure = () => {
      const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas || totalH <= 0) { setRect(null); return; }

      const canvasRect = canvas.getBoundingClientRect();
      const wrapEl = canvas.closest(".office-canvas-wrap") as HTMLElement | null;
      if (!wrapEl) { setRect(null); return; }
      const wrapRect = wrapEl.getBoundingClientRect();

      const sceneH = totalH + SKY_H + GROUND_H;
      const resolution = Math.min(window.devicePixelRatio || 1, 2);
      const sceneW = canvas.width / resolution;
      const towerX = Math.floor((sceneW - FLOOR_W) / 2);

      const scale = canvasRect.height / sceneH;
      const towerLeft = canvasRect.left - wrapRect.left + towerX * scale;
      const towerTop = canvasRect.top - wrapRect.top + SKY_H * scale;
      const towerWidth = FLOOR_W * scale;
      const towerHeight = totalH * scale;

      setRect({ top: towerTop, left: towerLeft, width: towerWidth, height: towerHeight });
    };

    measure();
    // Re-measure on resize
    const onResize = () => { cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(measure); };
    window.addEventListener("resize", onResize);
    // Re-measure after layout settles
    const t = setTimeout(measure, 100);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(t);
    };
  }, [containerRef, totalH, isOverviewMode]);

  return rect;
}

export default function OfficeOverviewBars({
  departments,
  agents,
  tasks,
  isOverviewMode,
  onClickFloor,
  containerRef,
  totalH,
  customDeptThemes,
}: OfficeOverviewBarsProps) {
  const towerRect = useTowerRect(containerRef, totalH, isOverviewMode);

  const bars = useMemo(() => {
    if (!isOverviewMode) return [];

    const nFloors = departments.length;
    const sections: Array<{
      key: string;
      label: string;
      icon: string;
      accent: string;
      yStart: number;
      height: number;
      working: number;
      total: number;
      extra?: string;
    }> = [];

    // CEO (Penthouse)
    const ceoTasks = tasks.filter(t => t.status === "in_progress").length;
    sections.push({
      key: "ceo",
      label: "CEO",
      icon: "👑",
      accent: "#f59e0b",
      yStart: ROOF_H,
      height: PENTHOUSE_H,
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
      height: CONFERENCE_FLOOR_H,
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
        height: FLOOR_TOTAL_H,
        working,
        total: deptAgents.length,
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
      height: BASEMENT_H,
      working: 0,
      total: breakAgents.length,
      extra: breakAgents.length > 0 ? `${breakAgents.length} resting` : "",
    });

    return sections;
  }, [isOverviewMode, departments, agents, tasks, customDeptThemes]);

  const handleClick = useCallback((yStart: number) => {
    onClickFloor(yStart, 0.35);
  }, [onClickFloor]);

  if (!isOverviewMode || !towerRect || bars.length === 0) return null;

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "absolute",
        top: towerRect.top,
        left: towerRect.left,
        width: towerRect.width,
        height: towerRect.height,
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Roof spacer */}
      <div style={{ height: `${(ROOF_H / totalH) * 100}%`, flexShrink: 0 }} />

      {bars.map((bar) => (
        <div
          key={bar.key}
          onClick={() => handleClick(bar.yStart)}
          className="pointer-events-auto"
          style={{
            height: `${(bar.height / totalH) * 100}%`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "0 6px",
            background: "rgba(0,0,0,0.65)",
            borderLeft: `2px solid ${bar.accent}`,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
            transition: "background 0.15s",
            overflow: "hidden",
            minHeight: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.85)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.65)"; }}
        >
          <span style={{ fontSize: "clamp(7px, 1.2vw, 12px)", flexShrink: 0 }}>{bar.icon}</span>
          <span
            style={{
              fontFamily: "var(--th-font-mono)",
              fontSize: "clamp(6px, 1vw, 10px)",
              color: bar.accent,
              fontWeight: "bold",
              letterSpacing: 0.5,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {bar.label}
          </span>
          {/* Agent dots */}
          {bar.total > 0 && bar.key !== "ceo" && (
            <span style={{ display: "flex", gap: 1, flexShrink: 0, alignItems: "center" }}>
              {Array.from({ length: Math.min(bar.total, 8) }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: "clamp(3px, 0.5vw, 5px)",
                    height: "clamp(3px, 0.5vw, 5px)",
                    borderRadius: "50%",
                    background: i < bar.working ? bar.accent : "rgba(255,255,255,0.2)",
                    display: "inline-block",
                  }}
                />
              ))}
              {bar.total > 8 && (
                <span style={{ fontSize: "clamp(5px, 0.8vw, 8px)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--th-font-mono)" }}>
                  +{bar.total - 8}
                </span>
              )}
            </span>
          )}
          {/* Count */}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--th-font-mono)",
              fontSize: "clamp(5px, 0.8vw, 9px)",
              color: "rgba(255,255,255,0.5)",
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
