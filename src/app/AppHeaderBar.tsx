import { useEffect, type ReactNode } from "react";
import type { View } from "./types";

interface AppHeaderBarProps {
  currentView: View;
  connected: boolean;
  viewTitle: string;
  tasksPrimaryLabel: string;
  decisionLabel: string;
  decisionInboxLoading: boolean;
  decisionInboxCount: number;
  agentStatusLabel: string;
  reportLabel: string;
  announcementLabel: string;
  groupChatLabel: string;
  notificationSlot?: ReactNode;
  theme: "light" | "dark";
  mobileHeaderMenuOpen: boolean;
  onOpenMobileNav: () => void;
  onOpenTasks: () => void;
  onOpenDecisionInbox: () => void;
  onOpenAgentStatus: () => void;
  onOpenReportHistory: () => void;
  onOpenAnnouncement: () => void;
  onOpenGroupChat: () => void;
  onToggleTheme: () => void;
  onToggleMobileHeaderMenu: () => void;
  onCloseMobileHeaderMenu: () => void;
  onOpenCommandPalette?: () => void;
  projectSelectorSlot?: ReactNode;
}

export default function AppHeaderBar({
  currentView,
  connected,
  viewTitle,
  tasksPrimaryLabel,
  decisionLabel,
  decisionInboxLoading,
  decisionInboxCount,
  agentStatusLabel,
  reportLabel,
  announcementLabel,
  groupChatLabel,
  notificationSlot,
  theme,
  mobileHeaderMenuOpen,
  onOpenMobileNav,
  onOpenTasks,
  onOpenDecisionInbox,
  onOpenAgentStatus,
  onOpenReportHistory,
  onOpenAnnouncement,
  onOpenGroupChat,
  onToggleTheme,
  onToggleMobileHeaderMenu,
  onCloseMobileHeaderMenu,
  onOpenCommandPalette,
  projectSelectorSlot,
}: AppHeaderBarProps) {
  useEffect(() => {
    if (!onOpenCommandPalette) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenCommandPalette]);

  return (
    <header
      className="header-sleek sticky top-0 z-30 flex min-h-[44px] items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6"
      style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-header)" }}
    >
      {/* Left: nav, logo */}
      <div className="header-sleek-left flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <button
          onClick={onOpenMobileNav}
          className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center transition lg:hidden"
          style={{
            borderRadius: "0",
            border: "1px solid var(--th-border)",
            background: "var(--th-bg-surface)",
            color: "var(--th-text-secondary)",
          }}
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ color: "#f59e0b", fontFamily: "var(--th-font-mono)", fontWeight: 700, fontSize: "0.9rem" }}>▶</span>
          <span style={{ fontFamily: "var(--th-font-mono)", fontWeight: 700, fontSize: "0.875rem", color: "var(--th-text-heading)", letterSpacing: "0.02em" }}>AgentDesk</span>
        </div>
        {/* Project selector */}
        {projectSelectorSlot && (
          <>
            <span style={{ color: "var(--th-border)", fontFamily: "var(--th-font-mono)", fontSize: "0.75rem" }} className="hidden sm:inline">·</span>
            <div className="hidden sm:block">{projectSelectorSlot}</div>
          </>
        )}
        {/* Current view title */}
        <span style={{ color: "var(--th-border)", fontFamily: "var(--th-font-mono)", fontSize: "0.75rem" }} className="hidden sm:inline">·</span>
        <span className="hidden sm:inline truncate" style={{ fontFamily: "var(--th-font-mono)", fontSize: "0.75rem", color: "var(--th-text-muted)" }}>{viewTitle}</span>
      </div>
      {/* Center: primary tabs (FM-style monospace, no emoji) */}
      <div className="header-sleek-tabs flex flex-shrink-0 items-center">
        <button
          onClick={onOpenTasks}
          className="header-action-btn header-action-btn-primary header-tab-item"
          aria-label={tasksPrimaryLabel}
        >
          {tasksPrimaryLabel}
        </button>
        <button
          onClick={onOpenDecisionInbox}
          disabled={decisionInboxLoading}
          className={`header-action-btn header-action-btn-secondary header-tab-item disabled:cursor-wait disabled:opacity-60${
            decisionInboxCount > 0 ? " decision-has-pending" : ""
          }`}
          aria-label={decisionLabel}
        >
          {decisionInboxLoading ? "..." : decisionLabel}
          {decisionInboxCount > 0 && <span className="header-decision-badge">{decisionInboxCount}</span>}
        </button>
        <button onClick={onOpenAgentStatus} className="header-action-btn header-action-btn-secondary header-tab-item header-desktop-only">
          {agentStatusLabel}
        </button>
        <button onClick={onOpenGroupChat} className="header-action-btn header-action-btn-secondary header-tab-item">
          {groupChatLabel}
        </button>
      </div>
      {/* Right: utils, command palette, notification, theme, status */}
      <div className="header-sleek-right flex flex-shrink-0 items-center gap-2">
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2"
            style={{
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              borderRadius: "0",
              padding: "4px 10px",
              fontFamily: "var(--th-font-mono)",
              fontSize: "0.75rem",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              gap: "8px",
            }}
            title="Open command palette (Ctrl+K)"
          >
            <span>⌘K</span>
            <span style={{ color: "var(--th-text-muted)", opacity: 0.6 }}>Search...</span>
          </button>
        )}
        <button onClick={onOpenReportHistory} className="header-action-btn header-action-btn-secondary header-desktop-only" title={reportLabel}>
          {reportLabel}
        </button>
        <button onClick={onOpenAnnouncement} className="header-action-btn header-action-btn-secondary" title={announcementLabel}>
          {announcementLabel}
        </button>
        <span className="header-sleek-divider hidden h-5 w-px sm:block" style={{ background: "var(--th-border)" }} />
        {notificationSlot}
        <button
          onClick={onToggleTheme}
          className="theme-toggle-btn header-sleek-icon-btn"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "라이트 모드" : "다크 모드"}
        >
          <span className="theme-toggle-icon">
            {theme === "dark" ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
        </button>
        <div className="relative sm:hidden">
          <button
            onClick={onToggleMobileHeaderMenu}
            className="inline-flex h-8 w-8 items-center justify-center transition"
            style={{
              borderRadius: 0,
              border: "1px solid var(--th-border)",
              background: "var(--th-bg-surface)",
              color: "var(--th-text-secondary)",
            }}
            aria-label="더보기 메뉴"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          {mobileHeaderMenuOpen && (
            <>
              <button className="fixed inset-0 z-40" onClick={onCloseMobileHeaderMenu} aria-label="Close menu" />
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[180px] py-1"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
              >
                <button
                  onClick={() => {
                    onOpenAgentStatus();
                    onCloseMobileHeaderMenu();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:opacity-80"
                  style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                >
                  {agentStatusLabel}
                </button>
                <button
                  onClick={() => {
                    onOpenReportHistory();
                    onCloseMobileHeaderMenu();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:opacity-80"
                  style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                >
                  {reportLabel}
                </button>
                <button
                  onClick={() => {
                    onOpenGroupChat();
                    onCloseMobileHeaderMenu();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:opacity-80"
                  style={{ color: "var(--th-text-primary)", fontFamily: "var(--th-font-mono)" }}
                >
                  {groupChatLabel}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="header-sleek-status flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium" style={{ background: "var(--th-bg-surface)", color: "var(--th-text-muted)", border: "1px solid var(--th-border)", borderRadius: 0, fontFamily: "var(--th-font-mono)" }}>
          <div className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-red-400"}`} />
          <span className="hidden sm:inline">{connected ? "Live" : "Offline"}</span>
        </div>
      </div>
    </header>
  );
}
