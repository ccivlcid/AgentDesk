import type { WindowType } from "../../app/types";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";

const DOCK_ITEMS: { id: WindowType; emoji: string; label: string }[] = [
  { id: "workflow",      emoji: "⚡", label: "Workflow" },
  { id: "library",       emoji: "📚", label: "Library" },
  { id: "settings",      emoji: "⚙",  label: "Settings" },
  { id: "chat",          emoji: "💬", label: "Chat" },
];

export default function Dock() {
  const { openWindows, toggleWindow } = useUiStore();

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
        gap: 8,
        background: "rgba(12,12,12,0.88)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--th-border)",
        borderRadius: 18,
        padding: "8px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const isOpen = openWindows.has(item.id);
        return (
          <button
            key={item.id}
            onClick={() => toggleWindow(item.id)}
            title={item.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: isOpen ? "rgba(245,158,11,0.12)" : "none",
              border: `1px solid ${isOpen ? "var(--th-border-accent)" : "transparent"}`,
              borderRadius: 10,
              padding: "6px 10px",
              cursor: "pointer",
              transition: "all 0.15s",
              minWidth: 52,
            }}
            onMouseEnter={(e) => {
              if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = isOpen ? "rgba(245,158,11,0.12)" : "none";
            }}
          >
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: isOpen ? "var(--th-accent)" : "var(--th-text-muted)" }}>
              {item.label}
            </span>
            {/* 활성 도트 */}
            {isOpen && (
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--th-accent)" }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
