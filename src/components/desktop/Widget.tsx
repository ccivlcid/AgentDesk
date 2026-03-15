import { useRef, useState, type ReactNode } from "react";
import type { WidgetId } from "../../app/types";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

interface WidgetProps {
  id: WidgetId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  children: ReactNode;
}

export default function Widget({ id, title, x, y, w, h, children }: WidgetProps) {
  const { updateWidgetPos, updateWidgetSize, removeWidget } = useUiStore();
  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ w, h });
  const dragging = useRef(false);
  const resizing = useRef(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  function onDragMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
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
      updateWidgetPos(id, nx, ny);
      dragging.current = false;
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
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: size.w, oh: size.h };

    function onMove(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const nw = Math.max(240, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(160, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      setSize({ w: nw, h: nh });
    }
    function onUp(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const nw = Math.max(240, resizeStart.current.ow + ev.clientX - resizeStart.current.mx);
      const nh = Math.max(160, resizeStart.current.oh + ev.clientY - resizeStart.current.my);
      updateWidgetSize(id, nw, nh);
      resizing.current = false;
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
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(32px) saturate(200%) brightness(1.1)",
        WebkitBackdropFilter: "blur(32px) saturate(200%) brightness(1.1)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 20,
        boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}
    >
      {/* 타이틀바 */}
      <div
        onMouseDown={onDragMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 10px",
          borderBottom: "1px solid var(--th-border)",
          cursor: "grab",
          background: "rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        {/* 트래픽 라이트 장식 */}
        <div style={{ display: "flex", gap: 5, marginRight: 8 }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => removeWidget(id)}
            style={{
              width: 11, height: 11, borderRadius: "50%",
              background: "#ff5f57", border: "none", cursor: "pointer", padding: 0,
            }}
            title="닫기"
          />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#2a2a2a" }} />
        </div>
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)", flex: 1 }}>
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
