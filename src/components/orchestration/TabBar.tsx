import { useEffect } from "react";
import type { OrchestraTab } from "./OrchestrationWindow";

const mono = "var(--th-font-mono)";

interface TabBarProps {
  activeTab: OrchestraTab;
  onTabChange: (tab: OrchestraTab) => void;
}

const TABS: Array<{ id: OrchestraTab; label: string; sigil: string; icon: (c: string) => React.ReactNode }> = [
  { id: "timeline", label: "TIMELINE", sigil: "//", icon: timelineIcon },
  { id: "logs", label: "LOGS", sigil: "$", icon: logsIcon },
  { id: "agents", label: "AGENTS", sigil: "@", icon: agentsIcon },
  { id: "room", label: "ROOM", sigil: "#", icon: roomIcon },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  // Keyboard: 0-3 for tab switching
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key);
      if (idx >= 0 && idx <= 3) {
        onTabChange(TABS[idx].id);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onTabChange]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 8,
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        background: "#FFFFFF",
        padding: "12px 16px 8px",
        fontFamily: mono,
        flexShrink: 0,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: "10.5px",
              fontWeight: isActive ? 800 : 600,
              fontFamily: mono,
              letterSpacing: "0.1em",
              background: isActive ? "#F3F4F6" : "transparent",
              color: isActive ? "#111827" : "#6B7280",
              border: "1px solid",
              borderColor: isActive ? "rgba(0, 0, 0, 0.05)" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.23, 1, 0.32, 1)",
              borderRadius: 12,
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#374151";
                e.currentTarget.style.background = "#F9FAFB";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "#6B7280";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.6, display: "flex", alignItems: "center" }}>
              {tab.icon(isActive ? "#111827" : "#9CA3AF")}
            </span>
            <span style={{ textTransform: "uppercase" as const }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function timelineIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function logsIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function agentsIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function roomIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
