import { useRef, useState, type ReactNode } from "react";
import type { WidgetId } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import TrafficLights from "./TrafficLights";

const mono = "var(--th-font-mono)";

const POP_W = 800;
const POP_H = 560;
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
  const [pos, setPos] = useState(() =>
    defaultPopped
      ? { x: Math.max(0, (window.innerWidth - POP_W) / 2), y: Math.max(44, (window.innerHeight - POP_H) / 3) }
      : { x, y }
  );
  const [size, setSize] = useState(() => defaultPopped ? { w: POP_W, h: POP_H } : { w, h });
  const [popped, setPopped] = useState(defaultPopped);
  // saved widget pos/size to restore when popping back in
  const widgetSnapshot = useRef<{ pos: typeof pos; size: typeof size } | null>(null);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  function handlePopToggle() {
    if (!popped) {
      // save current widget state, expand to window
      widgetSnapshot.current = { pos: { ...pos }, size: { ...size } };
      setPos({
        x: Math.max(0, (window.innerWidth - POP_W) / 2),
        y: Math.max(44, (window.innerHeight - POP_H) / 3),
      });
      setSize({ w: POP_W, h: POP_H });
      setPopped(true);
    } else {
      // restore saved widget state
      const snap = widgetSnapshot.current;
      if (snap) {
        setPos(snap.pos);
        setSize(snap.size);
      }
      setPopped(false);
    }
  }

  function onDragMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const nx = dragStart.current.ox + ev.clientX - dragStart.current.mx;
      const ny = dragStart.current.oy + ev.clientY - dragStart.current.my;
      setPos({ x: Math.max(0, nx), y: Math.max(44, ny) });
    }
    function onUp(ev: MouseEvent) {
      if (!dragStart.current) return;
      const nx = Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx);
      const ny = Math.max(44, dragStart.current.oy + ev.clientY - dragStart.current.my);
      setPos({ x: nx, y: ny });
      if (!popped) updateWidgetPos(id, nx, ny);
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
      const nw = Math.max(MIN_W, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      setSize({ w: nw, h: nh });
    }
    function onUp(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const nw = Math.max(MIN_W, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(MIN_H, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      setSize({ w: nw, h: nh });
      if (!popped) updateWidgetSize(id, nw, nh);
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
        position: popped ? "fixed" : "absolute",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: popped ? "var(--th-bg-surface)" : "var(--th-panel-bg)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid var(--th-border)",
        borderRadius: popped ? 10 : 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: popped ? 200 : 20,
        boxShadow: popped
          ? "0 16px 48px var(--th-glass-shadow)"
          : "0 12px 40px var(--th-glass-shadow)",
        transition: "box-shadow 0.15s",
      }}
    >
      {/* 타이틀바 */}
      <div
        onMouseDown={onDragMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          padding: popped ? "8px 12px" : "6px 10px",
          borderBottom: "1px solid var(--th-border)",
          cursor: "grab",
          background: "var(--th-glass-bg)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <TrafficLights
          onClose={() => removeWidget(id)}
          onMaximize={handlePopToggle}
        />
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)", flex: 1 }}>
          {title}
        </span>
        {popped && (
          <span style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.5 }}>
            ⊞ widget
          </span>
        )}
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
