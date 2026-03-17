import { useState, type ReactNode } from "react";

export interface TerminalPanelTabsProps {
  activeTab: "terminal" | "minutes";
  setActiveTab: (tab: "terminal" | "minutes") => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  children?: ReactNode;
}

const mono = "var(--th-font-mono)";

export function TerminalPanelTabs({ activeTab, setActiveTab, tr }: TerminalPanelTabsProps) {
  return (
    <div style={{
      display: "inline-flex",
      borderRadius: 7,
      border: "1px solid var(--th-border)",
      background: "var(--th-bg-surface)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {(["terminal", "minutes"] as const).map((tabKey) => {
        const isActive = activeTab === tabKey;
        const label = tabKey === "terminal"
          ? tr("터미널", "Terminal", "ターミナル", "终端")
          : tr("회의록", "Minutes", "会議録", "会议纪要");
        return (
          <TabBtn
            key={tabKey}
            label={label}
            active={isActive}
            onClick={() => setActiveTab(tabKey)}
          />
        );
      })}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: mono,
        fontSize: 10,
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.04em",
        padding: "3px 10px",
        border: "none",
        background: active
          ? "var(--th-accent)"
          : hovered ? "var(--th-hover-overlay)" : "transparent",
        color: active
          ? "var(--th-accent-text, #000)"
          : hovered ? "var(--th-text-primary)" : "var(--th-text-muted)",
        cursor: "pointer",
        transition: "background 0.1s, color 0.1s",
        borderRadius: active ? 6 : 0,
      }}
    >
      {label}
    </button>
  );
}
