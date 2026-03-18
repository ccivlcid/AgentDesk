import { useRef, useState, type ReactNode } from "react";
import type { WidgetId } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import TrafficLights from "./TrafficLights";

const mono = "var(--th-font-mono)";

const EXP_W = 800;
const EXP_H = 560;
const MIN_W = 320;
const MIN_H = 200;

interface WidgetProps {
  id: WidgetId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  defaultPopped?: boolean;
  children: ReactNode;
}

export default function Widget({ id, title, x, y, w, h, defaultPopped = false, children }: WidgetProps) {
  const { updateWidgetPos, updateWidgetSize, removeWidget } = useUiStore();

  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ w, h });
  const [expanded, setExpanded] = useState(defaultPopped);
  const snapshot = useRef<{ pos: typeof pos; size: typeof size } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  function handleExpand() {
    if (!expanded) {
      snapshot.current = { pos: { ...pos }, size: { ...size } };
      const nx = Math.max(0, (window.innerWidth - EXP_W) / 2);
      const ny = Math.max(44, (window.innerHeight - EXP_H) / 3);
      setPos({ x: nx, y: ny });
      setSize({ w: EXP_W, h: EXP_H });
      setExpanded(true);
    } else {
      const snap = snapshot.current;
      if (snap) { setPos(snap.pos); setSize(snap.size); }
      setExpanded(false);
    }
  }

  function onDragMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      setPos({
        x: Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx),
        y: Math.max(44, dragStart.current.oy + ev.clientY - dragStart.current.my),
      });
    }
    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const nx = Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx);
      const ny = Math.max(44, dragStart.current.oy + ev.clientY - dragStart.current.my);
      setPos({ x: nx, y: ny });
      updateWidgetPos(id, nx, ny);
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onResizeMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: size.w, oh: size.h };

    function onMove(ev: MouseEvent) {
      if (!resizeStart.current) return;
      setSize({
        w: Math.max(MIN_W, resizeStart.current.ow + ev.clientX - resizeStart.current.mx),
        h: Math.max(MIN_H, resizeStart.current.oh + ev.clientY - resizeStart.current.my),
      });
    }
    function onUp(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const nw = Math.max(MIN_W, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      setSize({ w: nw, h: nh });
      updateWidgetSize(id, nw, nh);
      resizeStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: "var(--th-panel-bg)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid var(--th-border)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: expanded ? 150 : 20,
        boxShadow: expanded
          ? "0 20px 60px var(--th-glass-shadow)"
          : "0 12px 40px var(--th-glass-shadow)",
        transition: "box-shadow 0.15s, z-index 0s",
      }}
    >
      {/* 타이틀바 */}
      <div
        onMouseDown={onDragMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "7px 10px",
          borderBottom: "1px solid var(--th-border)",
          cursor: "grab",
          background: "var(--th-glass-bg)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <TrafficLights
          onClose={() => removeWidget(id)}
          onMaximize={handleExpand}
        />
        <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", flex: 1 }}>
          {title}
        </span>
      </div>

      {/* 내용 */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {children}
      </div>

      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 16,
          height: 16,
          cursor: "se-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "2px",
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M2 8L8 2M5 8L8 5" stroke="var(--th-border-strong)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
