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
  queueStatusSlot?: ReactNode;
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
  onOpenScreenGuide?: () => void;
  projectSelectorSlot?: ReactNode;
}

const mono = "var(--th-font-mono)";

/** CLI bracket button — design-system: [run] style */
function HdrBtn({
  onClick,
  children,
  primary,
  badge,
  title,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  primary?: boolean;
  badge?: number;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        background: primary ? "var(--th-accent-glow)" : "transparent",
        border: `1px solid ${primary ? "var(--th-accent-border)" : "var(--th-border)"}`,
        borderRadius: 6,
        color: primary ? "var(--th-accent)" : "var(--th-text-secondary)",
        fontFamily: mono,
        fontSize: "11px",
        fontWeight: primary ? 600 : 500,
        letterSpacing: "0.03em",
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        transition: "color 0.15s, border-color 0.15s, background 0.15s",
      }}
      className={
        !primary && !disabled
          ? "hover:!text-[var(--th-text)] hover:!border-[var(--th-border-strong)] hover:!bg-[var(--th-hover-bg)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
          : "focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
      }
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "16px",
            height: "16px",
            padding: "0 3px",
            background: "var(--th-accent)",
            color: "#000",
            fontFamily: mono,
            fontSize: "9px",
            fontWeight: 700,
            borderRadius: 8,
            lineHeight: 1,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
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
  queueStatusSlot,
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
  onOpenScreenGuide,
  projectSelectorSlot,
}: AppHeaderBarProps) {

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "12px 18px",
        minHeight: "52px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        fontFamily: mono,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile nav toggle */}
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="lg:hidden"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          flexShrink: 0,
          marginRight: "4px",
          border: "1px solid var(--th-border)",
          background: "transparent",
          borderRadius: 6,
          color: "var(--th-text-muted)",
          cursor: "pointer",
          fontFamily: mono,
          fontSize: "14px",
        }}
        aria-label="Open navigation"
      >
        ☰
      </button>

      {/* === LEFT: Prompt line (identity + breadcrumb) === */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 0,
          minWidth: 0,
          overflow: "hidden",
          paddingRight: "12px",
        }}
      >
        {/* $ prompt — sigil: app root */}
        <span
          style={{
            color: "var(--th-accent)",
            fontWeight: 700,
            fontSize: "13px",
            paddingRight: "6px",
            flexShrink: 0,
          }}
        >
          $
        </span>
        <span
          style={{
            fontWeight: 600,
            fontSize: "12px",
            color: "var(--th-text-heading)",
            flexShrink: 0,
          }}
        >
          agentdesk
        </span>

        {/* / project */}
        {projectSelectorSlot && (
          <>
            <span
              className="hidden sm:inline"
              style={{
                color: "var(--th-text-muted)",
                padding: "0 6px",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              /
            </span>
            <div
              className="hidden sm:block"
              style={{ flexShrink: 0, maxWidth: "200px", minWidth: 0 }}
            >
              {projectSelectorSlot}
            </div>
          </>
        )}

        {/* > view — sigil: active nav (current page) */}
        {viewTitle && (
          <>
            <span
              className="hidden sm:inline"
              style={{
                color: "var(--th-text-muted)",
                padding: "0 6px",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              /
            </span>
            <span
              className="hidden sm:inline"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--th-accent)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
                maxWidth: "140px",
              }}
              title={viewTitle}
            >
              {viewTitle}
            </span>
          </>
        )}

        {/* cursor blink */}
        <span
          className="hidden sm:inline"
          style={{
            display: "inline-block",
            width: "2px",
            height: "13px",
            background: "var(--th-accent)",
            marginLeft: "6px",
            flexShrink: 0,
            animation: "blink 1.2s step-end infinite",
          }}
        />
      </div>

      {/* Divider: breadcrumb | actions */}
      <span
        style={{
          width: "1px",
          height: "20px",
          background: "var(--th-border)",
          marginRight: "10px",
          flexShrink: 0,
        }}
        className="hidden sm:block"
        aria-hidden
      />

      {/* === CENTER: Primary actions (업무, 의사결정) === */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          paddingRight: "10px",
        }}
      >
        <HdrBtn onClick={onOpenTasks} primary>
          {tasksPrimaryLabel}
        </HdrBtn>
        <HdrBtn
          onClick={onOpenDecisionInbox}
          disabled={decisionInboxLoading}
          badge={decisionInboxCount}
        >
          {decisionInboxLoading ? "···" : decisionLabel}
        </HdrBtn>
      </div>

      {/* Divider: primary | secondary */}
      <span
        style={{
          width: "1px",
          height: "20px",
          background: "var(--th-border)",
          marginRight: "10px",
          flexShrink: 0,
        }}
        className="hidden md:block"
        aria-hidden
      />

      {/* Secondary actions (agent status, group chat) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          paddingRight: "10px",
        }}
        className="hidden md:flex"
      >
        <HdrBtn onClick={onOpenAgentStatus} title={agentStatusLabel}>
          {agentStatusLabel}
        </HdrBtn>
        <HdrBtn onClick={onOpenGroupChat}>{groupChatLabel}</HdrBtn>
      </div>

      {/* === RIGHT: Utils === */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {/* Command palette */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Command palette (Ctrl+Shift+K)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: 6,
              fontFamily: mono,
              fontSize: "11px",
              color: "var(--th-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            className="hidden sm:flex hover:!text-[var(--th-text-secondary)] hover:!border-[var(--th-border-strong)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
          >
            <span style={{ opacity: 0.8 }}>⌘⇧K</span>
            <span style={{ opacity: 0.5 }}>search...</span>
          </button>
        )}

        <HdrBtn onClick={onOpenReportHistory} title={reportLabel}>
          <span className="hidden lg:inline">{reportLabel}</span>
          <span className="lg:hidden">↗</span>
        </HdrBtn>

        <HdrBtn onClick={onOpenAnnouncement} title={announcementLabel}>
          <span className="hidden lg:inline">{announcementLabel}</span>
          <span className="lg:hidden">!</span>
        </HdrBtn>

        {/* divider */}
        <span style={{ width: "1px", height: "16px", background: "var(--th-border)", margin: "0 2px", flexShrink: 0 }} className="hidden sm:block" />

        {notificationSlot}

        {queueStatusSlot}

        {/* Screen guide (Help) — macOS Inspector style */}
        {onOpenScreenGuide && (
          <button
            type="button"
            onClick={onOpenScreenGuide}
            title="Help (this screen)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              padding: 0,
              background: "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: 6,
              color: "var(--th-text-muted)",
              fontFamily: mono,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            className="hover:!text-[var(--th-text-secondary)] hover:!border-[var(--th-border-strong)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
            aria-label="Help"
          >
            ?
          </button>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            padding: "4px 8px",
            background: "transparent",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            color: "var(--th-text-muted)",
            fontFamily: mono,
            fontSize: "11px",
            cursor: "pointer",
            transition: "color 0.15s, border-color 0.15s",
          }}
          className="hover:!text-[var(--th-text-secondary)] hover:!border-[var(--th-border-strong)] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-offset-1 focus-visible:!outline-[var(--th-accent)]"
          title={theme === "dark" ? "light mode" : "dark mode"}
        >
          {theme === "dark" ? "○" : "●"}
        </button>

        {/* Status indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          border: "1px solid var(--th-border)",
          background: "transparent",
          fontFamily: mono,
          fontSize: "10px",
          color: "var(--th-text-muted)",
          borderRadius: 6,
        }}>
          <span style={{
            display: "inline-flex",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: connected ? "var(--th-green)" : "var(--th-red)",
            flexShrink: 0,
          }} />
          <span className="hidden sm:inline">{connected ? "live" : "offline"}</span>
        </div>

        {/* Mobile overflow */}
        <div className="relative sm:hidden">
          <button
            onClick={onToggleMobileHeaderMenu}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "30px",
              border: "1px solid var(--th-border)",
              background: "transparent",
              borderRadius: 0,
              color: "var(--th-text-muted)",
              fontFamily: mono,
              fontSize: "12px",
              cursor: "pointer",
            }}
            aria-label="More"
          >
            ···
          </button>
          {mobileHeaderMenuOpen && (
            <>
              <button className="fixed inset-0 z-40" onClick={onCloseMobileHeaderMenu} aria-label="Close menu" style={{ background: "transparent", border: "none" }} />
              <div
                className="absolute right-0 top-full z-50 mt-1"
                style={{
                  border: "1px solid var(--th-border)",
                  background: "var(--th-bg-elevated)",
                  minWidth: "160px",
                  fontFamily: mono,
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  overflow: "hidden",
                }}
              >
                {[
                  { label: agentStatusLabel, action: onOpenAgentStatus },
                  { label: reportLabel, action: onOpenReportHistory },
                  { label: groupChatLabel, action: onOpenGroupChat },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={() => { action(); onCloseMobileHeaderMenu(); }}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--th-border)",
                      color: "var(--th-text-secondary)",
                      fontFamily: mono,
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    className="hover:bg-[var(--th-hover-bg)]"
                  >
                    <span style={{ color: "var(--th-text-muted)" }}>›</span>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
