import { useRef, useState } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useTheme } from "../../ThemeContext";
import { useI18n } from "../../i18n";
import { IconDockWorkflow, IconDockLibrary, IconDockSettings, IconDockChat, IconDockTasks } from "./DesktopIcons";

const mono = "var(--th-font-mono)";

interface DockProps {
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onCreateAgent?: () => void;
  /** @deprecated use onCreateTask */
  onQuickTask?: () => void;
}

export default function Dock({ onCreateTask, onCreateProject, onCreateAgent, onQuickTask }: DockProps) {
  const { openWindows, toggleWindow } = useUiStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleTask = onCreateTask ?? onQuickTask;

  const DOCK_ITEMS: Array<{ id: WindowType; icon: (c: string) => React.ReactNode; label: string; accentColor: string }> = [
    { id: "tasks",    icon: (c) => <IconDockTasks color={c} />,    label: t({ ko: "보드",       en: "Board",    ja: "ボード",      zh: "看板" }),    accentColor: "#ff9f0a" },
    { id: "workflow", icon: (c) => <IconDockWorkflow color={c} />, label: t({ ko: "워크플로",   en: "Workflow", ja: "ワークフロー", zh: "工作流" }),  accentColor: "#007aff" },
    { id: "library",  icon: (c) => <IconDockLibrary color={c} />,  label: t({ ko: "라이브러리", en: "Library",  ja: "ライブラリ",  zh: "库" }),      accentColor: "#30d158" },
    { id: "settings", icon: (c) => <IconDockSettings color={c} />, label: t({ ko: "설정",       en: "Settings", ja: "設定",        zh: "设置" }),    accentColor: "#636366" },
    { id: "chat",     icon: (c) => <IconDockChat color={c} />,     label: t({ ko: "채팅",       en: "Chat",     ja: "チャット",    zh: "聊天" }),    accentColor: "#5e5ce6" },
  ];

  const CREATE_ITEMS = [
    {
      label: t({ ko: "새 태스크", en: "New Task", ja: "新規タスク", zh: "新任务" }),
      accentColor: "#ff9f0a",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={16} height={16}>
          <rect x="2" y="4" width="14" height="11" rx="2" />
          <line x1="9" y1="8" x2="9" y2="14" />
          <line x1="6" y1="11" x2="12" y2="11" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); handleTask?.(); },
    },
    {
      label: t({ ko: "새 프로젝트", en: "New Project", ja: "新規プロジェクト", zh: "新建项目" }),
      accentColor: "#30d158",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={16} height={16}>
          <path d="M2 5a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z" />
          <line x1="9" y1="8" x2="9" y2="13" />
          <line x1="6.5" y1="10.5" x2="11.5" y2="10.5" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); onCreateProject?.(); },
    },
    {
      label: t({ ko: "새 에이전트", en: "New Agent", ja: "新規エージェント", zh: "新建代理" }),
      accentColor: "#5e5ce6",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={16} height={16}>
          <circle cx="9" cy="7" r="3" />
          <path d="M3 16c0-3 2.7-5 6-5s6 2 6 5" />
          <line x1="14" y1="4" x2="14" y2="8" />
          <line x1="12" y1="6" x2="16" y2="6" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); onCreateAgent?.(); },
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        gap: 6,
        background: "var(--th-menubar-bg)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--th-border)",
        borderRadius: 20,
        padding: "8px 14px",
        boxShadow: "0 8px 32px var(--th-glass-shadow)",
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const isOpen = openWindows.has(item.id);
        return (
          <DockButton
            key={item.id}
            label={item.label}
            isOpen={isOpen}
            accentColor={item.accentColor}
            icon={item.icon}
            isLight={isLight}
            onClick={() => toggleWindow(item.id)}
          />
        );
      })}

      {/* 구분선 */}
      <div style={{ width: 1, height: 32, background: "var(--th-border)", alignSelf: "center", margin: "0 6px" }} />

      {/* + 추가 버튼 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <DockButton
          label={t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          isOpen={menuOpen}
          isLight={isLight}
          accentColor="#ff9f0a"
          icon={(c) => (
            <svg viewBox="0 0 22 22" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" width={22} height={22}>
              <line x1="11" y1="4" x2="11" y2="18" />
              <line x1="4" y1="11" x2="18" y2="11" />
            </svg>
          )}
          onClick={() => setMenuOpen((v) => !v)}
        />

        {/* 팝업 메뉴 */}
        {menuOpen && (
          <>
            {/* 바깥 클릭 닫기 */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 999 }}
              onClick={() => setMenuOpen(false)}
            />
            <div style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
              background: "var(--th-menubar-bg)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid var(--th-border)",
              borderRadius: 14,
              padding: "6px",
              boxShadow: "0 8px 32px var(--th-glass-shadow)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 160,
            }}>
              {/* 아래 화살표 */}
              <div style={{
                position: "absolute",
                bottom: -5, left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
                width: 10, height: 10,
                background: "var(--th-menubar-bg)",
                border: "1px solid var(--th-border)",
                borderTop: "none", borderLeft: "none",
              }} />

              {CREATE_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 9,
                    cursor: "pointer",
                    color: "var(--th-text-primary)",
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `${item.accentColor}22`;
                    (e.currentTarget as HTMLElement).style.color = item.accentColor;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--th-text-primary)";
                  }}
                >
                  <span style={{ color: item.accentColor, display: "flex", alignItems: "center" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DockButton({
  label,
  isOpen,
  accentColor,
  icon,
  isLight,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  accentColor: string;
  icon: (color: string) => React.ReactNode;
  isLight: boolean;
  onClick?: () => void;
}) {
  const iconColor = isOpen
    ? "rgba(255,255,255,0.95)"
    : isLight ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.70)";
  const bgOpen = `${accentColor}dd`;
  const bgHover = isLight ? `${accentColor}33` : `${accentColor}55`;

  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        background: isOpen ? bgOpen : "transparent",
        border: `1px solid ${isOpen ? `${accentColor}88` : "transparent"}`,
        borderRadius: 12,
        padding: "7px 11px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        minWidth: 50,
        boxShadow: isOpen ? `0 2px 12px ${accentColor}44` : "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        if (!isOpen) {
          el.style.background = bgHover;
          el.style.borderColor = `${accentColor}44`;
        }
        el.style.transform = "translateY(-2px) scale(1.05)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = isOpen ? bgOpen : "transparent";
        el.style.borderColor = isOpen ? `${accentColor}88` : "transparent";
        el.style.transform = "";
      }}
    >
      {icon(iconColor)}
      <span style={{
        fontFamily: mono,
        fontSize: 9,
        color: isOpen ? "rgba(255,255,255,0.9)" : "var(--th-text-muted)",
        letterSpacing: "0.02em",
      }}>
        {label}
      </span>
      {isOpen && (
        <div style={{
          width: 4, height: 4, borderRadius: "50%",
          background: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.8)",
          marginTop: -2,
        }} />
      )}
    </button>
  );
}
