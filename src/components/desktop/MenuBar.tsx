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
      background: "#EBF5FF",
      border: "1px solid rgba(245,158,11,0.18)",
      borderRadius: 8,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "#3B82F6", whiteSpace: "nowrap" }}>
        {t({ ko: "업무 계획 중...", en: "Planning...", ja: "計画中...", zh: "计划中..." })}
      </span>
    </div>
  );
}

function ProjectProgressIndicator() {
  const kickoffStage = useUiStore((s) => s.kickoffStage);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const tasks = useTaskStore((s) => s.tasks);

  const projectTasks = currentProjectId
    ? tasks.filter((t) => t.project_id === currentProjectId)
    : [];
  const total = projectTasks.length;
  const doneCount = projectTasks.filter((t) => t.status === "done").length;
  const runningCount = projectTasks.filter((t) => t.status === "in_progress").length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  // Hide when kickoff stage overlay is active
  if (kickoffStage !== "idle" && kickoffStage !== "done") return null;
  // No project or no tasks
  if (!currentProjectId || total === 0) return null;

  // All done state: checkmark (always visible)
  if (allDone) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "3px 14px",
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.18)",
        borderRadius: 8,
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
      border: "1px solid #E5E7EB",
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
        <span style={{ color: "#9CA3AF", fontSize: 10 }}>
          {"\u00B7"}
        </span>
      )}
      {/* Done fraction */}
      <span style={{
        fontFamily: mono, fontSize: 11, fontWeight: 500,
        color: "#6B7280", whiteSpace: "nowrap",
      }}>
        {doneCount}/{total} done
      </span>
      {/* Progress bar */}
      <div style={{
        width: 60, height: 3,
        background: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        flexShrink: 0,
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: "#3B82F6",
          borderRadius: 2,
          transition: "width 0.3s ease",
        }} />
      </div>
      {/* Percentage */}
      <span style={{
        fontFamily: mono, fontSize: 10, fontWeight: 600,
        color: "#9CA3AF", whiteSpace: "nowrap",
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
    color: "#111827",
    cursor: "pointer",
    textAlign: "left",
    gap: 24,
    whiteSpace: "nowrap",
  };

  const menuSepStyle: React.CSSProperties = {
    borderTop: "1px solid #E5E7EB",
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
        background: "#F9FAFB",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 12,
        fontFamily: "var(--th-font-body)",
        fontSize: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      {/* 로고 — 앱 메뉴 트리거 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setAppMenuOpen((v) => !v)}
          style={{
            background: appMenuOpen ? "rgba(0,0,0,0.06)" : "none",
            border: "none",
            color: "#111827",
            fontFamily: "var(--th-font-display)",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "2px 10px",
            borderRadius: 8,
            letterSpacing: -0.2,
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onMouseEnter={e => { if (!appMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)"; }}
          onMouseLeave={e => { if (!appMenuOpen) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
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
              background: "#F9FAFB",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid #D1D5DB",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              padding: "4px 0",
              zIndex: 2000,
            }}
          >
            {/* About */}
            <div style={{ padding: "7px 14px 4px", fontFamily: mono, fontSize: 11, color: "#9CA3AF" }}>
              AgentDesk v1.0
            </div>
            <div style={menuSepStyle} />

            {/* 다크/라이트 모드 전환 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(toggleTheme)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
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
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>📖 {t({ ko: "유저 가이드", en: "User Guide", ja: "ユーザーガイド", zh: "用户指南" })}</span>
            </button>

            {/* 데이터 내보내기 */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenExportModal)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {t({ ko: "데이터 내보내기...", en: "Export Data...", ja: "データエクスポート...", zh: "导出数据..." })}
              </span>
            </button>

            {/* Mission Control */}
            <button
              style={menuItemStyle}
              onClick={() => menuAction(onOpenMissionControl)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "미션 컨트롤", en: "Mission Control", ja: "ミッションコントロール", zh: "调度中心" })}</span>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>Ctrl ↑</span>
            </button>

            <div style={menuSepStyle} />

            {/* Dock Auto-hide */}
            <button
              style={menuItemStyle}
              onClick={() => setDockAutoHide(!dockAutoHide)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>{t({ ko: "Dock 자동 숨기기", en: "Auto-hide Dock", ja: "Dockを自動的に隠す", zh: "自动隐藏Dock" })}</span>
              <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center" }}>
                {dockAutoHide ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </span>
            </button>

            {/* Do Not Disturb */}
            <button
              style={menuItemStyle}
              onClick={() => setDoNotDisturb(!doNotDisturb)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EBF5FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              <span>🌙 {t({ ko: "방해 금지 모드", en: "Do Not Disturb", ja: "おやすみモード", zh: "勿扰模式" })}</span>
              <span style={{ fontSize: 11, display: "inline-flex", alignItems: "center" }}>
                {doNotDisturb ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 연결 끊김 표시 (연결됐을 땐 숨김) */}
      {!connected && (
        <span style={{ color: "#DC2626", fontSize: 10, display: "inline-flex", alignItems: "center" }} title={t({ ko: "서버 연결 끊김", en: "Server disconnected", ja: "サーバー切断", zh: "服务器断开" })}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/></svg></span>
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
          background: "rgba(0,0,0,0.03)",
          border: "1px solid #E5E7EB",
          borderRadius: 6,
          color: "#9CA3AF",
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
          el.style.borderColor = "#3B82F6";
          el.style.color = "#111827";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.borderColor = "#E5E7EB";
          el.style.color = "#9CA3AF";
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
            color: "#6B7280",
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
          background: clockOpen ? "rgba(0,0,0,0.06)" : "none",
          border: "none",
          color: "#6B7280",
          fontFamily: mono,
          fontSize: 11,
          cursor: "pointer",
          padding: "2px 8px",
          borderRadius: 6,
          minWidth: 40,
          textAlign: "right",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { if (!clockOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)"; }}
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
            border: "1px solid #E5E7EB",
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
            borderBottom: "1px solid #E5E7EB",
            background: "#EBF5FF",
          }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#111827", letterSpacing: "-1px", lineHeight: 1 }}>
              {timeStrFull}
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>
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
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
              >‹</button>

              <button
                type="button"
                onClick={goToday}
                style={{
                  background: "none", border: "none",
                  color: isCurrentMonth ? "#3B82F6" : "#111827",
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
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 14, padding: "2px 6px", borderRadius: 4 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#3B82F6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
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
                  color: i === 0 ? "#DC2626" : i === 6 ? "#3B82F6" : "#9CA3AF",
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
                      background: isToday ? "#3B82F6" : "transparent",
                      color: day == null
                        ? "transparent"
                        : isToday
                          ? "#FFFFFF"
                          : isSun
                            ? "#DC2626"
                            : isSat
                              ? "#3B82F6"
                              : "#6B7280",
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
                  background: "#EBF5FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 6,
                  color: "#3B82F6",
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
