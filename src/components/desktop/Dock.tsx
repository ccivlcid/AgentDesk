import { useRef, useState } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useTheme } from "../../ThemeContext";
import { useI18n } from "../../i18n";
import { IconDockWorkflow, IconDockLibrary, IconDockSettings, IconDockChat, IconDockTasks } from "./DesktopIcons";
import DockBadge from "./DockBadge";

const mono = "var(--th-font-mono)";

interface DockProps {
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onCreateAgent?: () => void;
  onCreateFeature?: () => void;
}

export default function Dock({ onCreateTask, onCreateProject, onCreateAgent, onCreateFeature }: DockProps) {
  const { openWindows, toggleWindow, minimizedWindows, restoreWindow } = useUiStore();
  const { agents, unreadAgentIds } = useAgentStore();
  const { tasks } = useTaskStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const workingAgentCount = agents.filter((a) => a.status === "working").length;
  const activeTaskCount = tasks.filter((t) => ["in_progress", "collaborating", "review"].includes(t.status)).length;
  const failedTaskCount = tasks.filter((t) => t.execution_state === "failed").length;
  const tasksBadgeCount = failedTaskCount > 0 ? failedTaskCount : activeTaskCount;
  const tasksBadgeType = failedTaskCount > 0 ? "red" as const : "amber" as const;
  const chatUnreadCount = unreadAgentIds.size;

  const DOCK_ITEMS: Array<{ id: WindowType; icon: (c: string) => React.ReactNode; label: string; accentColor: string; gradient: string; badge?: number; badgeType?: "amber" | "red" | "blue" }> = [
    {
      id: "tasks",
      icon: (c) => <IconDockTasks color={c} />,
      label: t({ ko: "업무보드", en: "Board", ja: "タスクボード", zh: "工作看板" }),
      accentColor: "#ff9f0a",
      gradient: "linear-gradient(145deg, #ffb340 0%, #ff9f0a 60%, #e8820a 100%)",
      badge: tasksBadgeCount || undefined,
      badgeType: tasksBadgeType,
    },
    {
      id: "workflow",
      icon: (c) => <IconDockWorkflow color={c} />,
      label: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }),
      accentColor: "#007aff",
      gradient: "linear-gradient(145deg, #409cff 0%, #007aff 60%, #0056cc 100%)",
    },
    {
      id: "library",
      icon: (c) => <IconDockLibrary color={c} />,
      label: t({ ko: "라이브러리", en: "Library", ja: "ライブラリ", zh: "库" }),
      accentColor: "#30d158",
      gradient: "linear-gradient(145deg, #60e080 0%, #30d158 60%, #25a244 100%)",
    },
    {
      id: "settings",
      icon: (c) => <IconDockSettings color={c} />,
      label: t({ ko: "설정", en: "Settings", ja: "設定", zh: "设置" }),
      accentColor: "#8e8e93",
      gradient: "linear-gradient(145deg, #aeaeb2 0%, #8e8e93 60%, #6c6c70 100%)",
    },
    {
      id: "chat",
      icon: (c) => <IconDockChat color={c} />,
      label: t({ ko: "채팅", en: "Chat", ja: "チャット", zh: "聊天" }),
      accentColor: "#5e5ce6",
      gradient: "linear-gradient(145deg, #7d7aff 0%, #5e5ce6 60%, #4a48c2 100%)",
      badge: chatUnreadCount || undefined,
      badgeType: "blue",
    },
  ];

  const CREATE_ITEMS = [
    {
      label: t({ ko: "새 업무", en: "New Task", ja: "新規タスク", zh: "新任务" }),
      accentColor: "#ff9f0a",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" width={16} height={16}>
          <rect x="2" y="4" width="14" height="11" rx="2" />
          <line x1="9" y1="8" x2="9" y2="14" />
          <line x1="6" y1="11" x2="12" y2="11" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); onCreateTask?.(); },
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
    {
      label: t({ ko: "새 기능", en: "New Feature", ja: "新規機能", zh: "新功能" }),
      accentColor: "#30d158",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M9 2l1.8 3.6L15 6.3l-3 2.9.7 4.1L9 11.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); onCreateFeature?.(); },
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        background: isLight
          ? "rgba(255,255,255,0.72)"
          : "rgba(30,30,36,0.72)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: isLight
          ? "1px solid rgba(255,255,255,0.9)"
          : "1px solid rgba(255,255,255,0.12)",
        borderRadius: 22,
        padding: "10px 16px 8px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const isOpen = openWindows.has(item.id);
        const isMinimized = minimizedWindows.has(item.id);
        return (
          <DockButton
            key={item.id}
            label={item.label}
            isOpen={isOpen}
            isMinimized={isMinimized}
            accentColor={item.accentColor}
            gradient={item.gradient}
            icon={item.icon}
            isLight={isLight}
            badge={item.badge}
            badgeType={item.badgeType}
            onClick={() => {
              if (isMinimized) restoreWindow(item.id);
              else toggleWindow(item.id);
            }}
          />
        );
      })}

      {/* 구분선 */}
      <div style={{
        width: 1,
        height: 36,
        background: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)",
        alignSelf: "center",
        margin: "0 4px",
        flexShrink: 0,
      }} />

      {/* + 추가 버튼 */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <DockButton
          label={t({ ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          isOpen={menuOpen}
          isLight={isLight}
          accentColor="#ff9f0a"
          gradient="linear-gradient(145deg, #ffb340 0%, #ff9f0a 60%, #e8820a 100%)"
          icon={(c) => (
            <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" width={24} height={24}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
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
              bottom: "calc(100% + 12px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1001,
              background: isLight ? "rgba(255,255,255,0.85)" : "rgba(30,30,36,0.88)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "6px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 168,
            }}>
              {/* 아래 화살표 */}
              <div style={{
                position: "absolute",
                bottom: -5,
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
                width: 10,
                height: 10,
                background: isLight ? "rgba(255,255,255,0.85)" : "rgba(30,30,36,0.88)",
                border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.12)",
                borderTop: "none",
                borderLeft: "none",
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
  isMinimized = false,
  accentColor,
  gradient,
  icon,
  isLight,
  badge,
  badgeType = "red",
  onClick,
}: {
  label: string;
  isOpen: boolean;
  isMinimized?: boolean;
  accentColor: string;
  gradient: string;
  icon: (color: string) => React.ReactNode;
  isLight: boolean;
  badge?: number;
  badgeType?: "amber" | "red" | "blue";
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative" }}>
      {/* 툴팁 */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: isLight ? "rgba(30,30,30,0.82)" : "rgba(20,20,20,0.88)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.92)",
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 7,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 10,
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          {label}
        </div>
      )}

      {/* Squircle 아이콘 버튼 */}
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: gradient,
          border: `1px solid rgba(255,255,255,${isOpen ? "0.28" : "0.14"})`,
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isOpen
            ? `0 6px 24px ${accentColor}55, 0 2px 6px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.22)`
            : `0 3px 12px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)`,
          transform: hovered
            ? "scale(1.28) translateY(-8px)"
            : isOpen
            ? "scale(1.06)"
            : "scale(1)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease",
          outline: "none",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* 아이콘 위 광택 레이어 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            borderRadius: "14px 14px 0 0",
            background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
          }}
        />
        {icon("rgba(255,255,255,0.95)")}
        <DockBadge count={badge} type={badgeType} show={badge != null && badge > 0} />
      </button>

      {/* 실행중/최소화 표시 점 */}
      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: isMinimized
            ? accentColor + "99"   // 최소화: accent 반투명
            : isOpen
              ? isLight ? "rgba(0,0,0,0.48)" : "rgba(255,255,255,0.82)"
              : "transparent",
          border: isMinimized ? `1px solid ${accentColor}` : "none",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      />
    </div>
  );
}
