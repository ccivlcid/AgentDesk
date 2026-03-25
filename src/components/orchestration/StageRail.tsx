const mono = "var(--th-font-mono)";

interface StageRailProps {
  stage: string;
}

const STAGES = [
  { id: "meeting", label: "MEETING", icon: meetingIcon },
  { id: "planning", label: "PLANNING", icon: planningIcon },
  { id: "assigning", label: "ASSIGNING", icon: assigningIcon },
  { id: "executing", label: "EXECUTING", icon: executingIcon },
  { id: "review", label: "REVIEW", icon: reviewIcon },
] as const;

const STAGE_ORDER = STAGES.map((s) => s.id);

export default function StageRail({ stage }: StageRailProps) {
  const activeIdx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: 64,
      borderRight: "1px solid var(--th-border)",
      background: "var(--th-bg-primary)",
      padding: "12px 0",
      gap: 4,
      flexShrink: 0,
    }}>
      {STAGES.map((s, i) => {
        const isCurrent = s.id === stage;
        const isDone = activeIdx >= 0 && i < activeIdx;
        const isPending = activeIdx < 0 || i > activeIdx;

        let color = "var(--th-text-muted)";
        if (isCurrent) color = "var(--th-accent)";
        else if (isDone) color = "var(--th-text-code)";

        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 4px",
              borderLeft: isCurrent ? "3px solid var(--th-accent)" : "3px solid transparent",
              cursor: "default",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ color, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {s.icon(color)}
            </div>
            <span style={{
              fontFamily: mono,
              fontSize: 8,
              fontWeight: isCurrent ? 700 : 500,
              color,
              letterSpacing: 0.5,
              textAlign: "center",
              lineHeight: 1.2,
            }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Stage icons (inline SVG, 18x18)
function meetingIcon(color: string) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function planningIcon(color: string) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function assigningIcon(color: string) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function executingIcon(color: string) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function reviewIcon(color: string) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
