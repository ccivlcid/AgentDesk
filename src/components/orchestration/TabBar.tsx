import { useEffect } from "react";
import type { OrchestraTab } from "./OrchestrationWindow";

const mono = "var(--th-font-mono)";

interface TabBarProps {
  activeTab: OrchestraTab;
  onTabChange: (tab: OrchestraTab) => void;
}

const TABS: Array<{ id: OrchestraTab; label: string; sigil: string; icon: (c: string) => React.ReactNode }> = [
  { id: "timeline", label: "타임라인", sigil: "//", icon: timelineIcon },
  { id: "logs", label: "로그", sigil: "$", icon: logsIcon },
  { id: "agents", label: "에이전트", sigil: "@", icon: agentsIcon },
  { id: "room", label: "룸", sigil: "#", icon: roomIcon },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  // Keyboard: 0-3 for tab switching
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const orchWindow = document.querySelector("[data-orch-window]");
      if (!orchWindow || !orchWindow.contains(document.activeElement)) return;
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
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-elevated)",
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
              background: isActive ? "var(--th-bg-primary)" : "transparent",
              color: isActive ? "var(--th-text-primary)" : "var(--th-text-secondary)",
              border: "1px solid",
              borderColor: isActive ? "var(--th-border)" : "transparent",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.23, 1, 0.32, 1)",
              borderRadius: 12,
              outline: "none",
              boxShadow: isActive ? "var(--th-shadow-sm)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--th-text-primary)";
                e.currentTarget.style.background = "var(--th-bg-surface)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "var(--th-text-secondary)";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span style={{ opacity: isActive ? 1 : 0.6, display: "flex", alignItems: "center" }}>
              {tab.icon(isActive ? "var(--th-text-primary)" : "var(--th-text-muted)")}
            </span>
            <span style={{ textTransform: "uppercase" as const }}>{tab.label}</span>
            <span style={{ fontSize: 9, color: isActive ? "var(--th-text-muted)" : "var(--th-text-muted)", opacity: 0.5, fontWeight: 600 }}>
              {TABS.indexOf(tab)}
            </span>
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
