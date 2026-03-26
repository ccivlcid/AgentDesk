import { useRef, useState } from "react";
import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useTaskStore } from "../../store/taskStore";
import { IconDecisions ,
  IconDockLibrary, IconDockSettings, IconRepoStore,
  IconAgents,
  IconFileTree, IconRepl,
} from "./DesktopIcons";
import { useTheme } from "../../ThemeContext";
import { useI18n } from "../../i18n";
import DockBadge from "./DockBadge";

/** Dock에 없지만 최소화될 수 있는 창들의 아이콘/레이블 */
const EXTRA_WIN_META: Partial<Record<WindowType, { icon: (c: string) => React.ReactNode; label: string; accent: string }>> = {
  "agent-manager":  { icon: (c) => <IconAgents color={c} />,       label: "Agents",       accent: "#a78bfa" },
  cli:              { icon: (c) => <IconRepl color={c} />,          label: "CLI",          accent: "#34d399" },
  "file-tree":      { icon: (c) => <IconFileTree color={c} />,      label: "Files",        accent: "#4ade80" },
  "decision-inbox": { icon: (c) => <IconDecisions color={c} />,     label: "Decisions",    accent: "#ff453a" },
};

const mono = "var(--th-font-mono)";

interface DockProps {
  onCreateProject?: () => void;
  onCreateAgent?: () => void;
  onImportRepo?: () => void;
}

export default function Dock({ onCreateProject, onCreateAgent, onImportRepo }: DockProps) {
  const { openWindows, toggleWindow, minimizedWindows, restoreWindow, dockAutoHide } = useUiStore();
  const [dockHovered, setDockHovered] = useState(false);
  const { tasks, decisionInboxItems } = useTaskStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeTaskCount = tasks.filter((t: { status: string }) => ["in_progress", "collaborating", "review"].includes(t.status)).length;
  const failedTaskCount = tasks.filter((t: { execution_state?: string }) => t.execution_state === "failed").length;
  const tasksBadgeCount = failedTaskCount > 0 ? failedTaskCount : activeTaskCount;
  const tasksBadgeType = failedTaskCount > 0 ? "red" as const : "amber" as const;

  const DOCK_ITEMS: Array<{ id: WindowType; icon: (c: string) => React.ReactNode; label: string; accentColor: string; gradient: string; badge?: number; badgeType?: "amber" | "red" | "blue" }> = [
    {
      id: "tasks",
      icon: (c) => (
        <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={24} height={24}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      label: t({ ko: "Orchestration", en: "Orchestration", ja: "Orchestration", zh: "Orchestration" }),
      accentColor: "#ff9f0a",
      gradient: "linear-gradient(145deg, #ffb340 0%, #ff9f0a 60%, #e8820a 100%)",
      badge: tasksBadgeCount || undefined,
      badgeType: tasksBadgeType,
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
  ];

  const CREATE_ITEMS = [
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
      label: "Repo Store",
      accentColor: "#30d158",
      icon: (
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={16} height={16}>
          <path d="M9 13V3" /><path d="M5 7l4-4 4 4" /><path d="M3 15h12" />
        </svg>
      ),
      onClick: () => { setMenuOpen(false); onImportRepo?.(); },
    },
  ];

  const dockHidden = dockAutoHide && !dockHovered;

  return (
    <>
      {/* 하단 트리거 스트립 — auto-hide 시 dock을 드러내기 위한 invisible hover zone */}
      {dockAutoHide && (
        <div
          onMouseEnter={() => setDockHovered(true)}
          onMouseLeave={() => setDockHovered(false)}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            zIndex: 999,
          }}
        />
      )}
    <div
      onMouseEnter={() => setDockHovered(true)}
      onMouseLeave={() => setDockHovered(false)}
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: dockHidden ? "translateX(-50%) translateY(calc(100% + 20px))" : "translateX(-50%)",
        transition: "transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        gap: 12,
        background: "var(--th-bg-surface)",
        backdropFilter: "var(--th-glass-blur) saturate(200%)",
        WebkitBackdropFilter: "var(--th-glass-blur) saturate(200%)",
        border: "1px solid var(--th-border-strong)",
        borderRadius: 28,
        padding: "12px 20px 10px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      {/* Floor Reflection */}
      <div style={{
        position: "absolute",
        bottom: -15,
        left: "10%",
        right: "10%",
        height: 20,
        background: "var(--th-accent)",
        filter: "blur(30px)",
        opacity: 0.08,
        pointerEvents: "none",
        zIndex: -1,
      }} />
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

      {/* 최소화된 비-dock 창 */}
      {(() => {
        const dockIds = new Set(DOCK_ITEMS.map((i) => i.id));
        const extraMin = Array.from(minimizedWindows).filter((id) => !dockIds.has(id) && EXTRA_WIN_META[id]);
        if (extraMin.length === 0) return null;
        return (
          <>
            <div style={{ width: 1, height: 36, background: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)", alignSelf: "center", margin: "0 4px", flexShrink: 0 }} />
            {extraMin.map((id) => {
              const meta = EXTRA_WIN_META[id]!;
              const badge = id === "decision-inbox" ? (decisionInboxItems.length || undefined) : undefined;
              return (
                <DockButton
                  key={id}
                  label={meta.label}
                  isOpen={false}
                  isMinimized={true}
                  accentColor={meta.accent}
                  gradient={`linear-gradient(145deg, ${meta.accent}cc, ${meta.accent})`}
                  icon={meta.icon}
                  isLight={isLight}
                  badge={badge}
                  badgeType="red"
                  onClick={() => restoreWindow(id)}
                />
              );
            })}
          </>
        );
      })()}

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
              background: "var(--th-bg-surface)",
              backdropFilter: "var(--th-glass-blur)",
              WebkitBackdropFilter: "var(--th-glass-blur)",
              border: "1px solid var(--th-border-strong)",
              borderRadius: 14,
              padding: "6px",
              boxShadow: "var(--th-glass-shadow-active)",
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
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border-strong)",
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
    </>
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
