import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";
import { useTheme } from "../../ThemeContext";
import { useI18n } from "../../i18n";
import { IconDockWorkflow, IconDockLibrary, IconDockSettings, IconDockChat } from "./DesktopIcons";

const mono = "var(--th-font-mono)";

interface DockProps {
  onQuickTask?: () => void;
}

export default function Dock({ onQuickTask }: DockProps) {
  const { openWindows, toggleWindow } = useUiStore();
  const { theme } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";

  const DOCK_ITEMS: Array<{ id: WindowType; icon: (c: string) => React.ReactNode; label: string; accentColor: string }> = [
    { id: "workflow", icon: (c) => <IconDockWorkflow color={c} />, label: t({ ko: "워크플로", en: "Workflow", ja: "ワークフロー", zh: "工作流" }), accentColor: "#007aff" },
    { id: "library",  icon: (c) => <IconDockLibrary color={c} />,  label: t({ ko: "라이브러리", en: "Library",  ja: "ライブラリ",  zh: "库" }),    accentColor: "#30d158" },
    { id: "settings", icon: (c) => <IconDockSettings color={c} />, label: t({ ko: "설정",      en: "Settings", ja: "設定",        zh: "设置" }),   accentColor: "#636366" },
    { id: "chat",     icon: (c) => <IconDockChat color={c} />,     label: t({ ko: "채팅",      en: "Chat",     ja: "チャット",    zh: "聊天" }),   accentColor: "#5e5ce6" },
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

      {/* New Task 버튼 */}
      <DockButton
        label={t({ ko: "새 태스크", en: "New Task", ja: "新規タスク", zh: "新任务" })}
        isOpen={false}
        isLight={isLight}
        accentColor="#ff9f0a"
        icon={(c) => (
          <svg viewBox="0 0 22 22" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" width={22} height={22}>
            <line x1="11" y1="4" x2="11" y2="18" />
            <line x1="4" y1="11" x2="18" y2="11" />
          </svg>
        )}
        onClick={onQuickTask}
      />
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
  // open 상태 = 컬러 배경 → 항상 흰 아이콘 / 비활성 = 테마에 따라
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
      {/* 활성 도트 */}
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
