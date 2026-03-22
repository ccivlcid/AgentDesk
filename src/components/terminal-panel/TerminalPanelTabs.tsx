import type { ReactNode } from "react";

export interface TerminalPanelTabsProps {
  activeTab: "terminal";
  setActiveTab: (tab: "terminal") => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  children?: ReactNode;
}

const mono = "var(--th-font-mono)";

/** Single-tab header — just displays "터미널" label without tab switching */
export function TerminalPanelTabs({ tr }: TerminalPanelTabsProps) {
  return (
    <div style={{
      display: "inline-flex",
      borderRadius: 7,
      border: "1px solid var(--th-border)",
      background: "var(--th-bg-surface)",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "3px 10px",
        background: "var(--th-accent)",
        color: "var(--th-accent-text, #000)",
        borderRadius: 6,
      }}>
        {tr("터미널", "Terminal", "ターミナル", "终端")}
      </span>
    </div>
  );
}
