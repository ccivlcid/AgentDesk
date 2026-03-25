import { useEffect } from "react";
import type { OrchestraTab } from "./OrchestrationWindow";

const mono = "var(--th-font-mono)";

interface TabBarProps {
  activeTab: OrchestraTab;
  onTabChange: (tab: OrchestraTab) => void;
}

const TABS: Array<{ id: OrchestraTab; label: string; icon: (c: string) => React.ReactNode }> = [
  { id: "timeline", label: "TIMELINE", icon: timelineIcon },
  { id: "logs", label: "LOGS", icon: logsIcon },
  { id: "agents", label: "AGENTS", icon: agentsIcon },
  { id: "room", label: "ROOM", icon: roomIcon },
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
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      borderTop: "1px solid var(--th-border)",
      background: "var(--th-bg-secondary)",
      padding: "0",
      flexShrink: 0,
    }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "8px 24px 6px",
              background: "transparent",
              border: "none",
              borderTop: isActive ? "2px solid var(--th-accent)" : "2px solid transparent",
              cursor: "pointer",
              color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
              fontFamily: mono,
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: 0.8,
              transition: "color 0.15s, border-color 0.15s",
              outline: "none",
            }}
          >
            {tab.icon(isActive ? "var(--th-accent)" : "var(--th-text-muted)")}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function timelineIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function logsIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function agentsIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function roomIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
