import { useEffect, useRef, useState } from "react";
import type { Project, Category } from "../../types";
import { useUiStore } from "../../store/uiStore";
import ProjectSelector from "../project-selector/ProjectSelector";

const mono = "var(--th-font-mono)";

interface MenuBarProps {
  projects: Project[];
  categories: Category[];
  currentProject: Project | null;
  onProjectSelect: (id: string) => void;
  onProjectCreate: () => void;
  connected: boolean;
  totalCostToday?: string;
  notificationSlot?: React.ReactNode;
  onOpenWallpaperPicker?: () => void;
  onOpenWidgetPicker?: () => void;
  onOpenMissionControl?: () => void;
  onOpenUserGuide?: () => void;
}

export default function MenuBar({
  projects,
  categories,
  currentProject,
  onProjectSelect,
  onProjectCreate,
  connected,
  totalCostToday,
  notificationSlot,
  onOpenWallpaperPicker,
  onOpenWidgetPicker,
  onOpenMissionControl,
  onOpenUserGuide,
}: MenuBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openWindow } = useUiStore();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!appMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAppMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [appMenuOpen]);

  const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "7px 14px",
    background: "none",
    border: "none",
    fontFamily: mono,
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    cursor: "pointer",
    textAlign: "left",
    gap: 24,
    whiteSpace: "nowrap",
  };

  const menuSepStyle: React.CSSProperties = {
    borderTop: "1px solid rgba(255,255,255,0.07)",
    margin: "4px 0",
  };

  function menuAction(fn?: () => void) {
    setAppMenuOpen(false);
    fn?.();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 1000,
        background: "rgba(12,12,12,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--th-border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        fontFamily: mono,
        fontSize: 12,
      }}
    >
      {/* 로고 — 앱 메뉴 트리거 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setAppMenuOpen((v) => !v)}
          style={{
            background: appMenuOpen ? "rgba(255,255,255,0.08)" : "none",
            border: "none",
            color: "var(--th-accent)",
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 6,
            letterSpacing: 1,
          }}
        >
          AgentDesk
        </button>

        {appMenuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 220,
              background: "rgba(20,20,24,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              padding: "4px 0",
              zIndex: 2000,
            }}
          >
            {/* About */}
            <div style={{ padding: "7px 14px 4px", fontFamily: mono, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              AgentDesk v0.9
            </div>
            <div style={menuSepStyle} />

            {/* 배경화면 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenWallpaperPicker)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>배경화면 변경...</span>
            </button>

            {/* 위젯 추가 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenWidgetPicker)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>위젯 추가...</span>
            </button>

            <div style={menuSepStyle} />

            {/* 유저 가이드 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenUserGuide)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>📖 유저 가이드</span>
            </button>

            {/* Mission Control */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenMissionControl)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>Mission Control</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Ctrl ↑</span>
            </button>
          </div>
        )}
      </div>

      {/* 연결 상태 */}
      <span style={{ color: connected ? "#22c55e" : "#ef4444", fontSize: 10 }}>
        {connected ? "●" : "○"}
      </span>

      {/* 프로젝트 선택 */}
      <div style={{ flex: 1, maxWidth: 260 }}>
        <ProjectSelector
          currentProject={currentProject}
          projects={projects}
          categories={categories}
          onSelect={onProjectSelect}
          onCreateNew={onProjectCreate}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* CLI 비용 */}
      {totalCostToday && (
        <button
          onClick={() => openWindow("settings")}
          style={{
            background: "none",
            border: "none",
            color: "var(--th-text-secondary)",
            fontFamily: mono,
            fontSize: 11,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          ${totalCostToday}
        </button>
      )}

      {/* 유저 가이드 ? 버튼 */}
      <button
        type="button"
        onClick={onOpenUserGuide}
        title="유저 가이드 (?)"
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid var(--th-border)",
          background: "transparent",
          color: "rgba(255,255,255,0.45)",
          fontFamily: mono,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(245,158,11,0.15)";
          el.style.color = "var(--th-accent)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "transparent";
          el.style.color = "rgba(255,255,255,0.45)";
        }}
      >
        ?
      </button>

      {/* 알림 */}
      {notificationSlot}

      {/* 시각 */}
      <span style={{ color: "var(--th-text-secondary)", fontSize: 11, minWidth: 40, textAlign: "right" }}>
        {timeStr}
      </span>
    </div>
  );
}
