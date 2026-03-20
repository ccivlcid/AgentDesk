import { useEffect, useRef, useState, type ReactNode, type FC } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import TrafficLights, { type TileZone } from "../desktop/TrafficLights";

const WIN_OPEN_ANIM = `
@keyframes winOpen {
  0%   { opacity: 0; transform: scale(0.84) translateY(-16px); }
  60%  { opacity: 1; transform: scale(1.02) translateY(2px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}
`;

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
  label: ReactNode;
  content: ReactNode;
}

interface AppWindowProps {
  windowType: WindowType;
  title: string;
  emoji: ReactNode;
  tabs?: AppWindowTab[];
  children?: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultX?: number;
  defaultY?: number;
  /** Override default closeWindow(windowType) behavior for the traffic-lights red button */
  onClose?: () => void;
  /** Extra actions rendered in the title bar right side (e.g. ? help button) */
  headerActions?: ReactNode;
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

// MX-08: all snap zones including corners
type SnapZone = "left" | "right" | "full" | "top" | "tl" | "tr" | "bl" | "br";

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

// ── macOS-style cascade positioning ─────────────────────────────────────────
let _cascadeStep = 0;
const CASCADE_STEP = 28;
const CASCADE_WRAP = 9;

function takeCascadeStep(): number {
  const step = _cascadeStep;
  _cascadeStep = (_cascadeStep + 1) % CASCADE_WRAP;
  return step;
}

/** Returns true if this windowType has a saved position in localStorage */
function hasSavedState(wt: WindowType): boolean {
  try { return !!window.localStorage.getItem(LS_KEY(wt)); } catch { return false; }
}

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

// MX-08: corner detection thresholds
const CORNER_THRESHOLD = 40;
const EDGE_THRESHOLD = 20;

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
  headerActions,
}: AppWindowProps) {
  const {
    closeWindow,
    windowFocusOrder,
    bringWindowToFront,
    minimizedWindows,
    minimizeWindow,
    fullscreenWindowId,
    setFullscreenWindowId,
    snapStates,
    setSnapPreview,
    setSnapDraggingWindow,
    setSnapState,
    setSnapFillSuggestion,
    snapRequest,
    setSnapRequest,
  } = useUiStore();
  const handleClose = onClose ?? (() => closeWindow(windowType));
  const handleMinimize = () => minimizeWindow(windowType);
  const isMinimized = minimizedWindows.has(windowType);
  const isFullscreen = fullscreenWindowId === windowType;
  const focusIdx = windowFocusOrder.indexOf(windowType);
  const zIndex = isFullscreen ? 999 : 200 + Math.max(0, focusIdx) * 2;
  const isFrontmost = focusIdx === windowFocusOrder.length - 1;
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id ?? "");

  // ── Viewport-proportional sizes (never exceed 90% of available space) ──────
  const availH = window.innerHeight - MENUBAR_H - DOCK_CLEARANCE;
  const safeW = Math.max(MIN_W, Math.min(defaultWidth, Math.floor(window.innerWidth * 0.90)));
  const safeH = Math.max(MIN_H, Math.min(defaultHeight, Math.floor(availH * 0.90)));

  // ── Cascade or center position ───────────────────────────────────────────
  let fallbackX: number;
  let fallbackY: number;
  if (defaultX !== undefined) {
    fallbackX = defaultX;
    fallbackY = defaultY ?? Math.max(MENUBAR_H, (window.innerHeight - safeH) / 3);
  } else if (hasSavedState(windowType)) {
    fallbackX = Math.max(40, (window.innerWidth - safeW) / 2);
    fallbackY = Math.max(MENUBAR_H, (window.innerHeight - safeH) / 3);
  } else {
    const step = takeCascadeStep();
    const cx = 80 + step * CASCADE_STEP;
    const cy = MENUBAR_H + 20 + step * CASCADE_STEP;
    fallbackX = Math.max(20, Math.min(cx, window.innerWidth - safeW - 20));
    fallbackY = Math.max(MENUBAR_H, Math.min(cy, window.innerHeight - DOCK_CLEARANCE - safeH - 20));
  }

  const raw = loadWinState(windowType, { x: fallbackX, y: fallbackY, w: safeW, h: safeH });

  const clampedX = Math.max(0, Math.min(raw.x, window.innerWidth - MIN_W));
  const clampedY = Math.max(MENUBAR_H, Math.min(raw.y, window.innerHeight - DOCK_CLEARANCE - MIN_H));
  const clampedW = Math.max(MIN_W, Math.min(raw.w, window.innerWidth));
  const clampedH = Math.max(MIN_H, Math.min(raw.h, window.innerHeight - DOCK_CLEARANCE - clampedY));
  const saved = { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
  const [pos, setPos] = useState({ x: saved.x, y: saved.y });
  const [size, setSize] = useState({ w: saved.w, h: saved.h });
  const preMaxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Compute snap zone rect ────────────────────────────────────────────────
  function getZoneRect(zone: SnapZone | "center"): { x: number; y: number; w: number; h: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const totalH = vh - MENUBAR_H - DOCK_CLEARANCE;
    const halfH = Math.floor(totalH / 2);
    const halfW = Math.floor(vw / 2);
    switch (zone) {
      case "left":   return { x: 0,      y: MENUBAR_H,          w: halfW, h: totalH };
      case "right":  return { x: halfW,  y: MENUBAR_H,          w: halfW, h: totalH };
      case "tl":     return { x: 0,      y: MENUBAR_H,          w: halfW, h: halfH };
      case "tr":     return { x: halfW,  y: MENUBAR_H,          w: halfW, h: halfH };
      case "bl":     return { x: 0,      y: MENUBAR_H + halfH,  w: halfW, h: halfH };
      case "br":     return { x: halfW,  y: MENUBAR_H + halfH,  w: halfW, h: halfH };
      case "center": {
        const cw = Math.min(defaultWidth, vw * 0.7);
        const ch = Math.min(defaultHeight, totalH * 0.7);
        return { x: (vw - cw) / 2, y: MENUBAR_H + (totalH - ch) / 3, w: cw, h: ch };
      }
      default: // full / top
        return { x: 0, y: MENUBAR_H, w: vw, h: totalH };
    }
  }

  // ── Apply snap zone (used by drag, keyboard, tile menu) ──────────────────
  function applySnapZone(zone: SnapZone | "center", prevX: number, prevY: number) {
    if (zone === "center") {
      const rect = getZoneRect("center");
      setPos({ x: rect.x, y: rect.y });
      setSize({ w: rect.w, h: rect.h });
      setSnapState(windowType, null);
      saveWinState(windowType, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });
      return;
    }
    const rect = getZoneRect(zone);
    setPos({ x: rect.x, y: rect.y });
    setSize({ w: rect.w, h: rect.h });
    setSnapState(windowType, {
      snapped: true,
      snapZone: zone,
      prevPos: { x: prevX, y: prevY },
      prevSize: { w: size.w, h: size.h },
    });
    saveWinState(windowType, { x: rect.x, y: rect.y, w: rect.w, h: rect.h });

    // MX-11: suggest fill for left/right snaps
    const opp: Record<string, "left" | "right" | "tl" | "tr" | "bl" | "br"> = {
      left: "right", right: "left",
      tl: "tr", tr: "tl",
      bl: "br", br: "bl",
    };
    if (opp[zone]) {
      setSnapFillSuggestion({ oppZone: opp[zone], forWindow: windowType });
    } else {
      setSnapFillSuggestion(null);
    }
  }

  // ── Fullscreen toggle ──────────────────────────────────────────────────────
  function handleMaximize() {
    if (!isFullscreen) {
      preMaxRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
      setPos({ x: 0, y: MENUBAR_H });
      setSize({ w: window.innerWidth, h: window.innerHeight - MENUBAR_H - DOCK_CLEARANCE });
      setFullscreenWindowId(windowType);
    } else {
      const prev = preMaxRef.current ?? { x: fallbackX, y: fallbackY, w: defaultWidth, h: defaultHeight };
      setPos({ x: prev.x, y: prev.y });
      setSize({ w: prev.w, h: prev.h });
      setFullscreenWindowId(null);
    }
  }

  // MX-09: tile menu snap handler
  function handleSnapTo(zone: TileZone) {
    if (zone === "full") {
      handleMaximize();
      return;
    }
    applySnapZone(zone as SnapZone | "center", pos.x, pos.y);
  }

  useEffect(() => {
    if (!isFullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const prev = preMaxRef.current ?? { x: fallbackX, y: fallbackY, w: defaultWidth, h: defaultHeight };
        setPos({ x: prev.x, y: prev.y });
        setSize({ w: prev.w, h: prev.h });
        setFullscreenWindowId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen, setFullscreenWindowId, windowType, fallbackX, fallbackY, defaultWidth, defaultHeight]);

  // MX-11: respond to external snap requests
  useEffect(() => {
    if (!snapRequest || snapRequest.windowType !== windowType) return;
    applySnapZone(snapRequest.zone as SnapZone | "center", pos.x, pos.y);
    setSnapRequest(null);
    bringWindowToFront(windowType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapRequest]);

  // MX-10: tile keyboard shortcuts (only when this window is frontmost)
  useEffect(() => {
    if (!isFrontmost || isMinimized) return;
    function onKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      const snapMap: Record<string, SnapZone | "center"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "full",
        ArrowDown: "center",
      };
      const zone = snapMap[e.key];
      if (zone) {
        e.preventDefault();
        // Ctrl+Shift+← / → = full snap, not half
        if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          applySnapZone(e.key === "ArrowLeft" ? "left" : "right", pos.x, pos.y);
        } else {
          applySnapZone(zone, pos.x, pos.y);
        }
        return;
      }
      // Ctrl+M = center
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        applySnapZone("center", pos.x, pos.y);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFrontmost, isMinimized, pos.x, pos.y, size.w, size.h]);

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeState = useRef<ResizeState | null>(null);
  const snapZoneRef = useRef<SnapZone | null>(null);

  // MX-08: detect corner snap zones first, then edges
  function getSnapZone(clientX: number, clientY: number): SnapZone | null {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nearLeft  = clientX < CORNER_THRESHOLD;
    const nearRight = clientX > vw - CORNER_THRESHOLD;
    const nearTop   = clientY < MENUBAR_H + CORNER_THRESHOLD;
    const nearBot   = clientY > vh - DOCK_CLEARANCE - CORNER_THRESHOLD;

    // Corners first (higher priority)
    if (nearLeft && nearTop) return "tl";
    if (nearRight && nearTop) return "tr";
    if (nearLeft && nearBot) return "bl";
    if (nearRight && nearBot) return "br";

    // Then edges
    if (clientY < MENUBAR_H + 4) return "full";
    if (clientX < EDGE_THRESHOLD) return "left";
    if (clientX > vw - EDGE_THRESHOLD) return "right";
    return null;
  }

  function onTitlebarMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const snap = snapStates[windowType];
    if (snap?.snapped) {
      setPos(snap.prevPos);
      setSize(snap.prevSize);
      setSnapState(windowType, null);
    }
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };
    snapZoneRef.current = null;

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const zone = getSnapZone(ev.clientX, ev.clientY);
      if (zone !== snapZoneRef.current) {
        snapZoneRef.current = zone;
        setSnapPreview(zone);
        setSnapDraggingWindow(windowType);
      }
      const maxY = window.innerHeight - DOCK_CLEARANCE - 40;
      setPos({
        x: Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx),
        y: Math.min(maxY, Math.max(MENUBAR_H, dragStart.current.oy + ev.clientY - dragStart.current.my)),
      });
    }
    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const zone = snapZoneRef.current;
      setSnapPreview(null);
      setSnapDraggingWindow(null);
      const maxY = window.innerHeight - DOCK_CLEARANCE - 40;
      const nx = Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx);
      const ny = Math.min(maxY, Math.max(MENUBAR_H, dragStart.current.oy + ev.clientY - dragStart.current.my));
      if (zone) {
        applySnapZone(zone, nx, ny);
      } else {
        setPos({ x: nx, y: ny });
        setSnapFillSuggestion(null);
        saveWinState(windowType, { x: nx, y: ny, w: size.w, h: size.h });
      }
      dragStart.current = null;
      snapZoneRef.current = null;
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

  // ── Minimize animation: slide to dock (bottom-center) ────────────────────
  const minimizeTX = window.innerWidth / 2 - (pos.x + size.w / 2);
  const minimizeTY = window.innerHeight - 50 - (pos.y + size.h / 2);

  // Shared style for resize handles
  const edgeStyle = (dir: ResizeDir, style: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    cursor: CURSOR[dir],
    zIndex: 20,
    ...style,
  });

  return (
    <>
      <style>{WIN_OPEN_ANIM}</style>
    <div
      onMouseDown={() => bringWindowToFront(windowType)}
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
        zIndex,
        boxShadow: "0 20px 60px var(--th-glass-shadow), 0 0 0 0.5px var(--th-glass-border) inset",
        opacity: isMinimized ? 0 : 1,
        transform: isMinimized
          ? `translateX(${minimizeTX}px) translateY(${minimizeTY}px) scale(0.08)`
          : "scale(1)",
        pointerEvents: isMinimized ? "none" : "all",
        transition: "opacity 0.28s ease, transform 0.28s cubic-bezier(0.4, 0, 0.6, 1)",
        animation: "winOpen 0.18s ease",
      }}
    >
      {/* ── macOS unified titlebar ── */}
      <div
        onMouseDown={onTitlebarMouseDown}
        onDoubleClick={handleMinimize}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: 44,
          padding: "0 14px",
          background: "var(--th-glass-bg)",
          borderBottom: "1px solid var(--th-border)",
          cursor: "default",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        {/* Traffic lights — absolute left */}
        <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          <TrafficLights
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onSnapTo={handleSnapTo}
          />
        </div>

        {/* Title — centered (drag area) */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, pointerEvents: "none", cursor: "grab" }}>
          <span style={{ display: "flex", alignItems: "center", fontSize: 13 }}>{emoji}</span>
          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", letterSpacing: "0.01em" }}>
            {title}
          </span>
        </div>

        {/* Right side actions */}
        {headerActions && (
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", zIndex: 2, display: "flex", alignItems: "center", gap: 4 }}>
            {headerActions}
          </div>
        )}
      </div>

      {/* ── Tab bar (탭이 있을 때만) ── */}
      {tabs && tabs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            padding: "0 14px",
            height: 36,
            background: "var(--th-glass-bg)",
            borderBottom: "1px solid var(--th-border)",
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  fontFamily: mono,
                  fontWeight: active ? 600 : 400,
                  background: active ? "var(--th-accent)" : "transparent",
                  color: active ? "var(--th-accent-text)" : "var(--th-text-muted)",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

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
    </>
  );
}
