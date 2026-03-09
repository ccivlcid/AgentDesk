import React, { useRef, useEffect, useCallback } from "react";
import {
  ROOF_H,
  PENTHOUSE_H,
  CONFERENCE_FLOOR_H,
  FLOOR_TOTAL_H,
  BASEMENT_H,
  FLOOR_W,
  SKY_H,
  GROUND_H,
  SCENE_W,
} from "./model";
import type { Department } from "../../types";
import type { Application } from "./pixi-compat";

interface OfficeMinimapProps {
  departments: Department[];
  totalH: number;
  /** The Phaser application ref (for camera-based viewport reading) */
  appRef: React.RefObject<Application | null>;
  /** Whether overview mode is active (minimap hidden when overview) */
  isOverviewMode: boolean;
  /** Custom dept themes for floor colors */
  customDeptThemes?: Record<string, { floor1: number; floor2: number; wall: number; accent: number }>;
}

const MAP_W = 56;
const MAP_MAX_H = 180;

const DEPT_DEFAULT_COLORS = [
  0x22c55e, // green
  0x3b82f6, // blue
  0xa855f7, // purple
  0xf59e0b, // amber
  0xef4444, // red
  0x06b6d4, // cyan
  0xec4899, // pink
  0x84cc16, // lime
];

function hexToCSS(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

export default function OfficeMinimap({
  departments,
  totalH,
  appRef,
  isOverviewMode,
  customDeptThemes,
}: OfficeMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const sceneH = totalH + SKY_H + GROUND_H;
  const scale = sceneH > 0 ? Math.min(MAP_MAX_H / sceneH, 1) : 0.5;
  const mapH = Math.floor(sceneH * scale);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const w = MAP_W;
    const h = mapH;
    cv.width = w;
    cv.height = h;

    // Background
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, w, h);

    // Tower area
    const towerTop = SKY_H * scale;
    const towerH = totalH * scale;
    const towerLeft = 4;
    const towerW = w - 8;

    // Sky area (subtle gradient)
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, towerTop);

    // Ground area
    ctx.fillStyle = "#0f1218";
    ctx.fillRect(0, towerTop + towerH, w, h - towerTop - towerH);

    // Tower background
    ctx.fillStyle = "#161b22";
    ctx.fillRect(towerLeft, towerTop, towerW, towerH);

    // Roof
    const roofH = ROOF_H * scale;
    ctx.fillStyle = "#21262d";
    ctx.fillRect(towerLeft, towerTop, towerW, roofH);
    // HQ label
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(towerLeft + towerW / 2 - 4, towerTop + 1, 8, 2);

    // Penthouse
    const pentTop = towerTop + roofH;
    const pentH = PENTHOUSE_H * scale;
    ctx.fillStyle = "#1a1f2e";
    ctx.fillRect(towerLeft, pentTop, towerW, pentH);
    // CEO indicator
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(towerLeft + 2, pentTop + 2, 3, 3);

    // Conference
    const confTop = pentTop + pentH;
    const confH = CONFERENCE_FLOOR_H * scale;
    ctx.fillStyle = "#1a1620";
    ctx.fillRect(towerLeft, confTop, towerW, confH);

    // Department floors
    const nFloors = departments.length;
    const floorH = FLOOR_TOTAL_H * scale;
    departments.forEach((dept, i) => {
      const y = confTop + confH + i * floorH;
      const accent = customDeptThemes?.[dept.id]?.accent ?? DEPT_DEFAULT_COLORS[i % DEPT_DEFAULT_COLORS.length];
      // Floor background
      ctx.fillStyle = "#12161e";
      ctx.fillRect(towerLeft, y, towerW, floorH - 1);
      // Left accent bar
      ctx.fillStyle = hexToCSS(accent);
      ctx.fillRect(towerLeft, y, 2, floorH - 1);
      // Floor separator
      ctx.fillStyle = "#21262d";
      ctx.fillRect(towerLeft, y + floorH - 1, towerW, 1);
    });

    // Basement
    const basementTop = confTop + confH + nFloors * floorH;
    const basementH = BASEMENT_H * scale;
    ctx.fillStyle = "#12100e";
    ctx.fillRect(towerLeft, basementTop, towerW, basementH);

    // Tower border
    ctx.strokeStyle = "rgba(245,158,11,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(towerLeft - 0.5, towerTop - 0.5, towerW + 1, towerH + 1);

    // Viewport indicator (from camera position)
    const app = appRef.current;
    if (app && !isOverviewMode) {
      const { y: scrollY } = app.getCameraScroll();
      const vp = app.getCameraViewportSize();
      if (sceneH > 0) {
        const vpTop = scrollY * scale;
        const vpH = vp.h * scale;
        ctx.fillStyle = "rgba(245,158,11,0.15)";
        ctx.fillRect(1, vpTop, w - 2, vpH);
        ctx.strokeStyle = "rgba(245,158,11,0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(1.5, vpTop + 0.5, w - 3, vpH - 1);
      }
    }
  }, [departments, totalH, mapH, scale, sceneH, appRef, isOverviewMode, customDeptThemes]);

  // Continuous draw loop (for viewport indicator tracking)
  useEffect(() => {
    if (isOverviewMode) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [draw, isOverviewMode]);

  // Single draw for overview mode
  useEffect(() => {
    if (isOverviewMode) draw();
  }, [draw, isOverviewMode]);

  // Click to scroll camera
  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv || isOverviewMode) return;
    const app = appRef.current;
    if (!app) return;

    const rect = cv.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    // Convert minimap Y → world Y → camera scroll
    const worldY = clickY / scale;
    const vp = app.getCameraViewportSize();
    app.setCameraScroll(0, Math.max(0, worldY - vp.h / 2));
  }, [scale, appRef, isOverviewMode]);

  if (totalH <= 0) return null;

  return (
    <div
      style={{
        opacity: isOverviewMode ? 0.4 : 0.85,
        transition: "opacity 0.2s",
        pointerEvents: isOverviewMode ? "none" : "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={mapH}
        onClick={handleMinimapClick}
        style={{
          display: "block",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: 2,
          cursor: isOverviewMode ? "default" : "pointer",
          background: "#080c14",
          imageRendering: "pixelated",
        }}
        title="Minimap — click to navigate"
      />
      <div
        style={{
          fontSize: 7,
          fontFamily: "monospace",
          color: "rgba(245,158,11,0.5)",
          textAlign: "center",
          marginTop: 2,
          letterSpacing: 1,
        }}
      >
        MAP
      </div>
    </div>
  );
}
