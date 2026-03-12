import type { ReactNode } from "react";

export interface TerminalPanelTabsProps {
  activeTab: "terminal" | "minutes";
  setActiveTab: (tab: "terminal" | "minutes") => void;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  children?: ReactNode;
}

/**
 * Tab buttons (Terminal | Minutes) and optional content wrapper.
 * Use children to render tab content below or elsewhere.
 */
export function TerminalPanelTabs({ activeTab, setActiveTab, tr, children }: TerminalPanelTabsProps) {
  return (
    <>
      <div
        className="inline-flex overflow-hidden w-fit"
        style={{ borderRadius: 0, border: "1px solid var(--th-border)" }}
      >
        {(["terminal", "minutes"] as const).map((tabKey) => {
          const isActive = activeTab === tabKey;
          const label = tabKey === "terminal"
            ? tr("TERMINAL", "TERMINAL", "ターミナル", "终端")
            : tr("MINUTES", "MINUTES", "会議録", "会议纪要");
          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveTab(tabKey)}
              style={{
                fontFamily: "var(--th-font-mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                padding: "2px 8px",
                background: isActive ? "rgba(6,182,212,0.15)" : "var(--th-bg-surface)",
                color: isActive ? "#7dd3fc" : "var(--th-text-muted)",
                border: "none",
                borderRight: "1px solid var(--th-border)",
                cursor: "pointer",
                transition: "background 0.1s, color 0.1s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {children != null ? children : null}
    </>
  );
}
