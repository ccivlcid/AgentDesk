import type { ReactNode } from "react";

export type TerminalTabId = "terminal" | "prompt";

export interface TerminalPanelTabsProps {
  activeTab: TerminalTabId;
  setActiveTab: (tab: TerminalTabId) => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  children?: ReactNode;
}

const mono = "var(--th-font-mono)";

const TABS: { id: TerminalTabId; label: (tr: TerminalPanelTabsProps["tr"]) => string }[] = [
  { id: "terminal", label: (tr) => tr("터미널", "Terminal", "ターミナル", "终端") },
  { id: "prompt", label: (tr) => tr("프롬프트", "Prompt", "プロンプト", "提示词") },
];

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
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "3px 10px",
              background: isActive ? "var(--th-accent)" : "transparent",
              color: isActive ? "var(--th-accent-text, #000)" : "var(--th-text-muted)",
              border: "none",
              borderRadius: isActive ? 6 : 0,
              cursor: "pointer",
            }}
          >
            {tab.label(tr)}
          </button>
        );
      })}
    </div>
  );
}
