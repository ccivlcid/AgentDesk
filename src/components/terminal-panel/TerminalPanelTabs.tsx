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
        style={{ borderRadius: "2px", border: "1px solid var(--th-border)" }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("terminal")}
          className={`px-2 py-0.5 text-[10px] transition ${
            activeTab === "terminal" ? "bg-cyan-700/30 text-cyan-200" : ""
          }`}
          style={
            activeTab !== "terminal"
              ? { background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }
              : undefined
          }
        >
          {tr("터미널", "Terminal", "ターミナル", "终端")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("minutes")}
          className={`px-2 py-0.5 text-[10px] transition ${
            activeTab === "minutes" ? "bg-cyan-700/30 text-cyan-200" : ""
          }`}
          style={
            activeTab !== "minutes"
              ? { background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }
              : undefined
          }
        >
          {tr("회의록", "Minutes", "会議録", "会议纪要")}
        </button>
      </div>
      {children != null ? children : null}
    </>
  );
}
