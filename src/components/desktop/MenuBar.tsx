import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Project, Category } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useTaskStore } from "../../store/taskStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import { useTheme } from "../../ThemeContext";
import ProjectSelector from "../project-selector/ProjectSelector";
import ControlCenter from "./ControlCenter";

const mono = "var(--th-font-mono)";

function KickoffIndicator() {
  const busy = useUiStore((s) => s.kickoffBusy);
  const kickoffStage = useUiStore((s) => s.kickoffStage);
  const { t } = useI18n();
  // Hide when the detailed KickoffStageOverlay is active
  if (kickoffStage !== "idle") return null;
  if (!busy) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "3px 14px",
      background: "var(--th-accent-glow, rgba(245,158,11,0.08))",
      border: "1px solid rgba(245,158,11,0.18)",
      borderRadius: 8,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--th-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--th-accent)", whiteSpace: "nowrap" }}>
        {t({ ko: "업무 계획 중...", en: "Planning...", ja: "計画中...", zh: "计划中..." })}
      </span>
    </div>
  );
}

function ProjectProgressIndicator() {
  const kickoffBusy = useUiStore((s) => s.kickoffBusy);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const tasks = useTaskStore((s) => s.tasks);
  const [allDoneVisible, setAllDoneVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const prevAllDoneRef = useRef(false);

  // Filter tasks for current project
  const projectTasks = currentProjectId
    ? tasks.filter((t) => t.project_id === currentProjectId)
    : [];
  const total = projectTasks.length;
  const doneCount = projectTasks.filter((t) => t.status === "done").length;
  const runningCount = projectTasks.filter((t) => t.status === "in_progress").length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  // When all tasks become done, show checkmark briefly then fade out
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setAllDoneVisible(true);
      setFadingOut(false);
      const fadeTimer = setTimeout(() => setFadingOut(true), 2000);
      const hideTimer = setTimeout(() => setAllDoneVisible(false), 2800);
      return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
    }
    if (!allDone) {
      setAllDoneVisible(true);
      setFadingOut(false);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  // Don't render when kickoff is busy (KickoffIndicator takes priority)
  if (kickoffBusy) return null;
  // No project or no tasks
  if (!currentProjectId || total === 0) return null;
  // All done and fade finished
  if (allDone && !allDoneVisible) return null;

  // All done state: checkmark
  if (allDone) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "3px 14px",
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.18)",
        borderRadius: 8,
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.8s ease-out",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--th-success, #22c55e)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 600,
          color: "var(--th-success, #22c55e)", whiteSpace: "nowrap",
        }}>
          {doneCount}/{total} done
        </span>
      </div>
    );
  }

  // Normal progress state
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "3px 14px",
      background: "var(--th-hover-overlay-subtle, rgba(255,255,255,0.03))",
      border: "1px solid var(--th-border)",
      borderRadius: 8,
    }}>
      {/* Running dot + count */}
      {runningCount > 0 && (
        <span style={{
          fontFamily: mono, fontSize: 11, fontWeight: 600,
          color: "var(--th-success, #22c55e)", whiteSpace: "nowrap",
        }}>
          <span className="menubar-pulse" style={{ letterSpacing: 1 }}>
            {"\u25CF"}
          </span>
          {" "}{runningCount} running
        </span>
      )}
      {runningCount > 0 && (
        <span style={{ color: "var(--th-text-muted)", fontSize: 10 }}>
          {"\u00B7"}
        </span>
      )}
      {/* Done fraction */}
      <span style={{
        fontFamily: mono, fontSize: 11, fontWeight: 500,
        color: "var(--th-text-secondary)", whiteSpace: "nowrap",
      }}>
        {doneCount}/{total} done
      </span>
      {/* Progress bar */}
      <div style={{
        width: 60, height: 3,
        background: "var(--th-border, rgba(255,255,255,0.1))",
        borderRadius: 2,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: "var(--th-accent)",
          borderRadius: 2,
          transition: "width 0.3s ease",
        }} />
      </div>
      {/* Percentage */}
      <span style={{
        fontFamily: mono, fontSize: 10, fontWeight: 600,
        color: "var(--th-text-muted)", whiteSpace: "nowrap",
        minWidth: 24, textAlign: "right",
      }}>
        {pct}%
      </span>
    </div>
  );
}

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
  onOpenMissionControl?: () => void;
  onOpenUserGuide?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenExportModal?: () => void;
  runningAgentCount?: number;
  projectAgentCount?: number;
  yoloMode?: boolean;
  onToggleYoloMode?: () => void;
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
  onOpenMissionControl,
  onOpenUserGuide,
  onOpenCommandPalette,
  onOpenExportModal,
  runningAgentCount = 0,
  projectAgentCount = 0,
  yoloMode,
  onToggleYoloMode,
}: MenuBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const { dockAutoHide, setDockAutoHide, doNotDisturb, setDoNotDisturb } = useUiStore();
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const menuRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLDivElement>(null);
  const clockBtnRef = useRef<HTMLButtonElement>(null);
  const { openWindow } = useUiStore();
  const { t, locale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
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

  useEffect(() => {
    if (!clockOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        clockRef.current && !clockRef.current.contains(e.target as Node) &&
        clockBtnRef.current && !clockBtnRef.current.contains(e.target as Node)
      ) {
        setClockOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clockOpen]);

  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const timeStrFull = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  // 요일 배열: 해당 locale의 short 요일, 일요일부터 시작
  const DOW = Array.from({ length: 7 }, (_, i) =>
    new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: "short" }),
  );
  // 일요일이 index 0이 되도록 정렬 (2023-01-01은 일요일)
  // DOW[0]=Sun, DOW[1]=Mon ... DOW[6]=Sat (already correct)

  function buildCalendarDays(base: Date): (number | null)[] {
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= lastDay; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const calDays = buildCalendarDays(calMonth);
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();
  const isCurrentMonth = calMonth.getFullYear() === todayYear && calMonth.getMonth() === todayMonth;

  function prevMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function goToday() {
    const d = new Date();
    setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

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
        background: "var(--th-menubar-bg, rgba(12,12,12,0.92))",
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
            background: appMenuOpen ? "var(--th-hover-overlay)" : "none",
            border: "none",
            color: "var(--th-text-primary)",
            fontFamily: mono,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "2px 8px",
            borderRadius: 6,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="22" height="22" rx="5" fill="#3B82F6" />
            <rect x="0.5" y="0.5" width="21" height="21" rx="4.5" stroke="rgba(255,255,255,0.15)" />
            <text x="11" y="15.5" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="700" fill="white">A</text>
          </svg>
          <span>AgentDesk</span>
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
              AgentDesk v1.0
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

            {/* 다크/라이트 모드 전환 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(toggleTheme)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{theme === "dark"
                ? t({ ko: "라이트 모드", en: "Light Mode", ja: "ライトモード", zh: "浅色模式" })
                : t({ ko: "다크 모드", en: "Dark Mode", ja: "ダークモード", zh: "深色模式" })
              }</span>
              <span style={{ fontSize: 12 }}>{theme === "dark" ? "\u2600" : "\u263D"}</span>
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

            {/* 데이터 내보내기 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenExportModal)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>↓ {t({ ko: "데이터 내보내기...", en: "Export Data...", ja: "データエクスポート...", zh: "导出数据..." })}</span>
            </button>

            {/* Mission Control */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenMissionControl)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "미션 컨트롤", en: "Mission Control", ja: "ミッションコントロール", zh: "调度中心" })}</span>
              <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>Ctrl ↑</span>
            </button>

            <div style={menuSepStyle} />

            {/* Dock Auto-hide */}
            <button
              style={menuItemStyle}
              onClick={() => setDockAutoHide(!dockAutoHide)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "Dock 자동 숨기기", en: "Auto-hide Dock", ja: "Dockを自動的に隠す", zh: "自动隐藏Dock" })}</span>
              <span style={{ fontSize: 11 }}>{dockAutoHide ? "✓" : ""}</span>
            </button>

            {/* Do Not Disturb */}
            <button
              style={menuItemStyle}
              onClick={() => setDoNotDisturb(!doNotDisturb)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-accent-glow)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>🌙 {t({ ko: "방해 금지 모드", en: "Do Not Disturb", ja: "おやすみモード", zh: "勿扰模式" })}</span>
              <span style={{ fontSize: 11 }}>{doNotDisturb ? "✓" : ""}</span>
            </button>
          </div>
        )}
      </div>

      {/* 연결 끊김 표시 (연결됐을 땐 숨김) */}
      {!connected && (
        <span style={{ color: "var(--th-danger, #ef4444)", fontSize: 10 }} title={t({ ko: "서버 연결 끊김", en: "Server disconnected", ja: "サーバー切断", zh: "服务器断开" })}>○</span>
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

      {/* 킥오프 진행 중 인디케이터 — 메뉴바 중앙 */}
      <KickoffIndicator />
      <ProjectProgressIndicator />

      <div style={{ flex: 1 }} />



      {/* 검색 트리거 */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        title={t({ ko: "검색  ⌘K", en: "Search  ⌘K", ja: "検索  ⌘K", zh: "搜索  ⌘K" })}
        style={{
          background: "var(--th-hover-overlay-subtle)",
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

      {/* Control Center */}
      <ControlCenter
        connected={connected}
        runningAgentCount={runningAgentCount}
        projectAgentCount={projectAgentCount}
        yoloMode={yoloMode}
        onToggleYoloMode={onToggleYoloMode}
      />

      {/* 시각 — 클릭하면 달력 패널 */}
      <button
        ref={clockBtnRef}
        type="button"
        onClick={() => setClockOpen(v => !v)}
        style={{
          background: clockOpen ? "var(--th-hover-overlay)" : "none",
          border: "none",
          color: "var(--th-text-secondary)",
          fontFamily: mono,
          fontSize: 11,
          cursor: "pointer",
          padding: "2px 8px",
          borderRadius: 6,
          minWidth: 40,
          textAlign: "right",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (!clockOpen) (e.currentTarget as HTMLButtonElement).style.background = "var(--th-hover-overlay-subtle)"; }}
        onMouseLeave={e => { if (!clockOpen) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        {timeStr}
      </button>

      {/* 달력 / 시계 패널 */}
      {clockOpen && createPortal(
        <div
          ref={clockRef}
          style={{
            position: "fixed",
            top: 50,
            right: 12,
            width: 280,
            background: "var(--th-panel-bg, rgba(18,18,18,0.96))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--th-border)",
            borderRadius: 12,
            boxShadow: "0 24px 56px rgba(0,0,0,0.5)",
            zIndex: 2000,
            overflow: "hidden",
            fontFamily: mono,
          }}
        >
          {/* 시간 헤더 */}
          <div style={{
            padding: "20px 20px 14px",
            borderBottom: "1px solid var(--th-border)",
            background: "var(--th-accent-glow)",
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "var(--th-text-heading)", letterSpacing: "-1px", lineHeight: 1 }}>
              {timeStrFull}
            </div>
            <div style={{ fontSize: 12, color: "var(--th-text-muted)", marginTop: 6 }}>
              {now.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
            </div>
          </div>

          {/* 달력 */}
          <div style={{ padding: "12px 16px 16px" }}>
            {/* 월 네비게이션 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-accent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
              >‹</button>

              <button
                type="button"
                onClick={goToday}
                style={{
                  background: "none", border: "none",
                  color: isCurrentMonth ? "var(--th-accent)" : "var(--th-text-primary)",
                  fontFamily: mono, fontSize: 12, fontWeight: 700,
                  cursor: "pointer", padding: "2px 8px", borderRadius: 4,
                  letterSpacing: "0.05em",
                }}
              >
                {calMonth.toLocaleDateString(locale, { year: "numeric", month: "long" })}
              </button>

              <button
                type="button"
                onClick={nextMonth}
                style={{ background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-accent)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)"; }}
              >›</button>
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
              {DOW.map((d, i) => (
                <div key={d} style={{
                  textAlign: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 0",
                  color: i === 0 ? "var(--th-danger, #ef4444)" : i === 6 ? "var(--th-info, #60a5fa)" : "var(--th-text-muted)",
                  letterSpacing: "0.05em",
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
              {calDays.map((day, idx) => {
                const isToday = isCurrentMonth && day === todayDate;
                const colIdx = idx % 7;
                const isSun = colIdx === 0;
                const isSat = colIdx === 6;
                return (
                  <div
                    key={idx}
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      padding: "4px 0",
                      borderRadius: 6,
                      fontWeight: isToday ? 800 : 400,
                      background: isToday ? "var(--th-accent)" : "transparent",
                      color: day == null
                        ? "transparent"
                        : isToday
                          ? "var(--th-accent-text)"
                          : isSun
                            ? "var(--th-danger, #ef4444)"
                            : isSat
                              ? "var(--th-info, #60a5fa)"
                              : "var(--th-text-secondary)",
                      cursor: day != null ? "default" : "default",
                    }}
                  >
                    {day ?? ""}
                  </div>
                );
              })}
            </div>

            {/* 오늘로 이동 버튼 */}
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={goToday}
                style={{
                  marginTop: 10,
                  width: "100%",
                  background: "var(--th-accent-glow)",
                  border: "1px solid var(--th-accent-border)",
                  borderRadius: 6,
                  color: "var(--th-accent)",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "5px 0",
                  letterSpacing: "0.08em",
                }}
              >
                {t({ ko: "오늘로", en: "Today", ja: "今日へ", zh: "今天" })}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
