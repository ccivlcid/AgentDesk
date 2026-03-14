import { useRef, useState, type ReactNode } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

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
}

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
}: AppWindowProps) {
  const { closeWindow } = useUiStore();
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id ?? "");

  const initX = defaultX ?? Math.max(40, (window.innerWidth - defaultWidth) / 2);
  const initY = defaultY ?? Math.max(60, (window.innerHeight - defaultHeight) / 3);
  const [pos, setPos] = useState({ x: initX, y: initY });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  function onTitlebarMouseDown(e: React.MouseEvent) {
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
      setPos({
        x: Math.max(0, dragStart.current.ox + ev.clientX - dragStart.current.mx),
        y: Math.max(44, dragStart.current.oy + ev.clientY - dragStart.current.my),
      });
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
        w: Math.max(400, resizeStart.current.ow + ev.clientX - resizeStart.current.mx),
        h: Math.max(300, resizeStart.current.oh + ev.clientY - resizeStart.current.my),
      });
    }
    function onUp(ev: MouseEvent) {
      resizeStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const activeContent = tabs?.find((t) => t.id === activeTab)?.content ?? children;

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        background: "rgba(18,18,18,0.96)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--th-border)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 200,
        boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
      }}
    >
      {/* 타이틀바 */}
      <div
        onMouseDown={onTitlebarMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: tabs ? "none" : "1px solid var(--th-border)",
          cursor: "grab",
          background: "rgba(255,255,255,0.02)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        {/* 트래픽 라이트 */}
        <div style={{ display: "flex", gap: 5 }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => closeWindow(windowType)}
            style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57", border: "none", cursor: "pointer", padding: 0 }}
            title="닫기"
          />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2a2a2a" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#2a2a2a" }} />
        </div>
        <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
          {emoji} {title}
        </span>
      </div>

      {/* 탭 바 */}
      {tabs && tabs.length > 0 && (
        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--th-border)",
          background: "rgba(0,0,0,0.2)",
          flexShrink: 0,
          overflowX: "auto",
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "rgba(245,158,11,0.08)" : "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid var(--th-accent)" : "2px solid transparent",
                padding: "6px 14px",
                fontFamily: mono,
                fontSize: 11,
                color: activeTab === tab.id ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 내용 */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {activeContent}
      </div>

      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 18,
          height: 18,
          cursor: "se-resize",
          zIndex: 10,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "3px",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M2 9L9 2M5 9L9 5" stroke="var(--th-border-strong)" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
