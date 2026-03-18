import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Project, Category } from "../../types";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { useTheme } from "../../ThemeContext";
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
  onOpenMissionControl?: () => void;
  onOpenUserGuide?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenExportModal?: () => void;
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
  onOpenMissionControl,
  onOpenUserGuide,
  onOpenCommandPalette,
  onOpenExportModal,
  runningAgentCount = 0,
}: MenuBarProps) {
  const [now, setNow] = useState(() => new Date());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
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

      <div style={{ flex: 1 }} />

      {/* 에이전트 활동 펄스 */}
      {runningAgentCount > 0 && (
        <span
          className="menubar-pulse"
          style={{ fontSize: 10, color: "var(--th-success, #22c55e)", letterSpacing: 1 }}
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
