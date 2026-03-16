import { useRef, useState, type ReactNode } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import TrafficLights from "../desktop/TrafficLights";

const mono = "var(--th-font-mono)";

const LS_KEY = (wt: WindowType) => `agentdesk_win_${wt}`;

interface WindowState { x: number; y: number; w: number; h: number }

function loadWinState(wt: WindowType, defaults: WindowState): WindowState {
  try {
    const raw = window.localStorage.getItem(LS_KEY(wt));
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaults;
}

function saveWinState(wt: WindowType, state: WindowState) {
  try { window.localStorage.setItem(LS_KEY(wt), JSON.stringify(state)); } catch { /* ignore */ }
}

export interface AppWindowTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface AppWindowProps {
  windowType: WindowType;
  title: string;
  emoji: string;
  tabs?: AppWindowTab[];
  children?: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  /** Override default closeWindow(windowType) behavior for the traffic-lights red button */
  onClose?: () => void;
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ResizeState {
  dir: ResizeDir;
  mx: number;
  my: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
}

const MIN_W = 400;
const MIN_H = 300;
const MENUBAR_H = 44;   // top menu bar height
const DOCK_CLEARANCE = 88; // dock height + bottom margin

function computeResize(
  ev: MouseEvent,
  s: ResizeState,
): { x: number; y: number; w: number; h: number } {
  const dx = ev.clientX - s.mx;
  const dy = ev.clientY - s.my;
  let x = s.ox, y = s.oy, w = s.ow, h = s.oh;

  if (s.dir.includes("s")) {
    h = Math.max(MIN_H, s.oh + dy);
  }
  if (s.dir.includes("n")) {
    const rawH = s.oh - dy;
    h = Math.max(MIN_H, rawH);
    y = rawH >= MIN_H ? s.oy + dy : s.oy + (s.oh - MIN_H);
    y = Math.max(44, y);
  }
  if (s.dir.includes("e")) {
    w = Math.max(MIN_W, s.ow + dx);
  }
  if (s.dir.includes("w")) {
    const rawW = s.ow - dx;
    w = Math.max(MIN_W, rawW);
    x = rawW >= MIN_W ? s.ox + dx : s.ox + (s.ow - MIN_W);
    x = Math.max(0, x);
  }

  return { x, y, w, h };
}

const CURSOR: Record<ResizeDir, string> = {
  n: "n-resize", s: "s-resize",
  e: "e-resize", w: "w-resize",
  ne: "ne-resize", nw: "nw-resize",
  se: "se-resize", sw: "sw-resize",
};

const EDGE = 6;   // edge handle thickness
const CORN = 14;  // corner handle size

export default function AppWindow({
  windowType,
  title,
  emoji,
  tabs,
  children,
  defaultWidth = 800,
  defaultHeight = 560,
  defaultX,
  defaultY,
  onClose,
}: AppWindowProps) {
  const { closeWindow } = useUiStore();
  const handleClose = onClose ?? (() => closeWindow(windowType));
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id ?? "");

  const fallbackX = defaultX ?? Math.max(40, (window.innerWidth - defaultWidth) / 2);
  const availH = window.innerHeight - MENUBAR_H - DOCK_CLEARANCE;
  const safeH = Math.min(defaultHeight, availH);
  const fallbackY = defaultY ?? Math.max(MENUBAR_H, (window.innerHeight - safeH) / 3);
  const raw = loadWinState(windowType, { x: fallbackX, y: fallbackY, w: defaultWidth, h: safeH });
  // 저장된 위치가 Dock 영역을 침범하면 보정
  const saved = {
    ...raw,
    h: Math.min(raw.h, window.innerHeight - DOCK_CLEARANCE - raw.y),
  };
  const [pos, setPos] = useState({ x: saved.x, y: saved.y });
  const [size, setSize] = useState({ w: saved.w, h: saved.h });
  const [maximized, setMaximized] = useState(false);
  const preMaxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  function handleMaximize() {
    if (!maximized) {
      preMaxRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setPos({ x: 0, y: MENUBAR_H });
      setSize({ w: window.innerWidth, h: window.innerHeight - MENUBAR_H - DOCK_CLEARANCE });
      setMaximized(true);
    } else {
      const prev = preMaxRef.current ?? { x: fallbackX, y: fallbackY, w: defaultWidth, h: defaultHeight };
      setPos({ x: prev.x, y: prev.y });
      setSize({ w: prev.w, h: prev.h });
      setMaximized(false);
    }
  }
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeState = useRef<ResizeState | null>(null);

  function onTitlebarMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const maxY = window.innerHeight - DOCK_CLEARANCE - 40;
      setPos({
        x: Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx),
        y: Math.min(maxY, Math.max(MENUBAR_H, dragStart.current.oy + ev.clientY - dragStart.current.my)),
      });
    }
    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const maxY = window.innerHeight - DOCK_CLEARANCE - 40;
      const nx = Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx);
      const ny = Math.min(maxY, Math.max(MENUBAR_H, dragStart.current.oy + ev.clientY - dragStart.current.my));
      setPos({ x: nx, y: ny });
      saveWinState(windowType, { x: nx, y: ny, w: size.w, h: size.h });
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onResizeMouseDown(dir: ResizeDir) {
    return (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      resizeState.current = {
        dir,
        mx: e.clientX, my: e.clientY,
        ox: pos.x, oy: pos.y,
        ow: size.w, oh: size.h,
      };

      function clampResize(r: { x: number; y: number; w: number; h: number }) {
        const maxH = window.innerHeight - DOCK_CLEARANCE - r.y;
        return { ...r, h: Math.min(r.h, maxH) };
      }
      function onMove(ev: MouseEvent) {
        if (!resizeState.current) return;
        const r = clampResize(computeResize(ev, resizeState.current));
        setPos({ x: r.x, y: r.y });
        setSize({ w: r.w, h: r.h });
      }
      function onUp(ev: MouseEvent) {
        if (!resizeState.current) return;
        const r = clampResize(computeResize(ev, resizeState.current));
        setPos({ x: r.x, y: r.y });
        setSize({ w: r.w, h: r.h });
        saveWinState(windowType, { x: r.x, y: r.y, w: r.w, h: r.h });
        resizeState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };
  }

  const activeContent = tabs?.find((t) => t.id === activeTab)?.content ?? children;

  // Shared style for resize handles
  const edgeStyle = (dir: ResizeDir, style: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    cursor: CURSOR[dir],
    zIndex: 20,
    ...style,
  });

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: "var(--th-bg-surface)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid var(--th-border-strong)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 200,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.06) inset",
      }}
    >
      {/* ── macOS unified titlebar ── */}
      <div
        onMouseDown={onTitlebarMouseDown}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: 44,
          padding: "0 14px",
          background: "var(--th-glass-bg)",
          borderBottom: "1px solid var(--th-border)",
          cursor: "grab",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Traffic lights — absolute left */}
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          <TrafficLights onClose={handleClose} onMaximize={handleMaximize} />
        </div>

        {/* Title — centered */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, pointerEvents: "none" }}>
          <span style={{ fontSize: 13 }}>{emoji}</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", letterSpacing: "0.01em" }}>
            {title}
          </span>
        </div>

        {/* Tabs — inline pill style inside titlebar (right side) */}
        {tabs && tabs.length > 0 && (
          <div
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, zIndex: 2 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "4px 11px",
                    fontSize: 11,
                    fontFamily: mono,
                    fontWeight: active ? 600 : 400,
                    background: active ? "var(--th-accent)" : "var(--th-bg-elevated)",
                    color: active ? "#fff" : "var(--th-text-muted)",
                    border: active ? "none" : "1px solid var(--th-border)",
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    lineHeight: 1.4,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden" }}>
          {activeContent}
        </div>
      </div>

      {/* ── Resize handles ── */}

      {/* Corners */}
      <div onMouseDown={onResizeMouseDown("nw")} style={edgeStyle("nw", { top: 0, left: 0, width: CORN, height: CORN })} />
      <div onMouseDown={onResizeMouseDown("ne")} style={edgeStyle("ne", { top: 0, right: 0, width: CORN, height: CORN })} />
      <div onMouseDown={onResizeMouseDown("sw")} style={edgeStyle("sw", { bottom: 0, left: 0, width: CORN, height: CORN })} />
      <div onMouseDown={onResizeMouseDown("se")} style={edgeStyle("se", { bottom: 0, right: 0, width: CORN, height: CORN })}>
        {/* SE grip icon */}
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ position: "absolute", bottom: 3, right: 3 }}>
          <path d="M2 9L9 2M5 9L9 5" stroke="var(--th-border-strong)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Edges (between corners) */}
      <div onMouseDown={onResizeMouseDown("n")} style={edgeStyle("n", { top: 0, left: CORN, right: CORN, height: EDGE })} />
      <div onMouseDown={onResizeMouseDown("s")} style={edgeStyle("s", { bottom: 0, left: CORN, right: CORN, height: EDGE })} />
      <div onMouseDown={onResizeMouseDown("w")} style={edgeStyle("w", { top: CORN, bottom: CORN, left: 0, width: EDGE })} />
      <div onMouseDown={onResizeMouseDown("e")} style={edgeStyle("e", { top: CORN, bottom: CORN, right: 0, width: EDGE })} />
    </div>
  );
}
