import { useEffect, useRef, useState } from "react";
import type { Project, Category } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
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
  onOpenCommandPalette?: () => void;
  runningAgentCount?: number;
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
  onOpenCommandPalette,
  runningAgentCount = 0,
}: MenuBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openWindow } = useUiStore();
  const { t } = useI18n();

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
    color: "var(--th-text-primary)",
    cursor: "pointer",
    textAlign: "left",
    gap: 24,
    whiteSpace: "nowrap",
  };

  const menuSepStyle: React.CSSProperties = {
    borderTop: "1px solid var(--th-border)",
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
              background: "var(--th-panel-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--th-border)",
              borderRadius: 10,
              boxShadow: "0 16px 48px var(--th-glass-shadow)",
              padding: "4px 0",
              zIndex: 2000,
            }}
          >
            {/* About */}
            <div style={{ padding: "7px 14px 4px", fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)" }}>
              AgentDesk v0.9
            </div>
            <div style={menuSepStyle} />

            {/* 배경화면 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenWallpaperPicker)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "배경화면 변경...", en: "Change Wallpaper...", ja: "壁紙を変更...", zh: "更换壁纸..." })}</span>
            </button>

            {/* 위젯 추가 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenWidgetPicker)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "위젯 추가...", en: "Add Widget...", ja: "ウィジェット追加...", zh: "添加小组件..." })}</span>
            </button>

            <div style={menuSepStyle} />

            {/* 유저 가이드 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenUserGuide)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>📖 {t({ ko: "유저 가이드", en: "User Guide", ja: "ユーザーガイド", zh: "用户指南" })}</span>
            </button>

            {/* Mission Control */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenMissionControl)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>Mission Control</span>
              <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>Ctrl ↑</span>
            </button>
          </div>
        )}
      </div>

      {/* 연결 끊김 표시 (연결됐을 땐 숨김) */}
      {!connected && (
        <span style={{ color: "#ef4444", fontSize: 10 }} title="Server disconnected">○</span>
      )}

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

      {/* 에이전트 활동 펄스 */}
      {runningAgentCount > 0 && (
        <span
          className="menubar-pulse"
          style={{ fontSize: 10, color: "#22c55e", letterSpacing: 1 }}
          title={`${runningAgentCount} agent(s) running`}
        >
          ● {runningAgentCount}
        </span>
      )}

      {/* 검색 트리거 */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        title={t({ ko: "검색  ⌘K", en: "Search  ⌘K", ja: "検索  ⌘K", zh: "搜索  ⌘K" })}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--th-border)",
          borderRadius: 6,
          color: "var(--th-text-muted)",
          fontFamily: mono,
          fontSize: 11,
          cursor: "pointer",
          padding: "3px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "var(--th-accent)";
          el.style.color = "var(--th-text-primary)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "var(--th-border)";
          el.style.color = "var(--th-text-muted)";
        }}
      >
        🔍 {t({ ko: "검색", en: "Search", ja: "検索", zh: "搜索" })}
        <span style={{ fontSize: 10, opacity: 0.6 }}>⌘K</span>
      </button>

      {/* CLI 비용 */}
      {totalCostToday && (
        <button
          onClick={() => openWindow("settings")}
          title={t({ ko: "→ 사용량 설정 보기", en: "→ View usage settings", ja: "→ 使用設定を見る", zh: "→ 查看使用设置" })}
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

      {/* 알림 */}
      {notificationSlot}

      {/* 시각 */}
      <span style={{ color: "var(--th-text-secondary)", fontSize: 11, minWidth: 40, textAlign: "right" }}>
        {timeStr}
      </span>
    </div>
  );
}
