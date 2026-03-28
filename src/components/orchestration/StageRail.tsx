const mono = "var(--th-font-mono)";

interface StageRailProps {
  stage: string;
}

const STAGES = [
  { id: "meeting", label: "회의", icon: meetingIcon },
  { id: "planning", label: "계획", icon: planningIcon },
  { id: "assigning", label: "배정", icon: assigningIcon },
  { id: "executing", label: "실행", icon: executingIcon },
  { id: "review", label: "검토", icon: reviewIcon },
] as const;

const STAGE_ORDER = STAGES.map((s) => s.id);

export default function StageRail({ stage }: StageRailProps) {
  const isAllDone = stage === "done";
  const activeIdx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: 72,
      background: "var(--th-bg-elevated)",
      borderRight: "1px solid var(--th-border)",
      padding: "16px 0",
      gap: 4,
      flexShrink: 0,
    }}>
      {STAGES.map((s, i) => {
        const isCurrent = !isAllDone && s.id === stage;
        const isDone = isAllDone || (activeIdx >= 0 && i < activeIdx);

        let iconBg = "var(--th-bg-surface)";
        let iconColor = "var(--th-text-muted)";
        let textColor = "var(--th-text-muted)";
        let borderLeftColor = "transparent";

        if (isCurrent) {
          iconBg = "var(--th-accent-glow)";
          iconColor = "var(--th-accent)";
          textColor = "var(--th-accent)";
          borderLeftColor = "var(--th-accent)";
        } else if (isDone) {
          iconBg = "var(--th-success-bg)";
          iconColor = "var(--th-success)";
          textColor = "var(--th-success)";
        }

        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "8px 4px",
              borderLeft: `3px solid ${borderLeftColor}`,
              cursor: "default",
              transition: "all 0.2s",
            }}
          >
            <div style={{
              padding: 5,
              background: iconBg,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}>
              {s.icon(iconColor)}
            </div>
            <span style={{
              fontFamily: mono,
              fontSize: 8,
              fontWeight: isCurrent ? 800 : 600,
              color: textColor,
              letterSpacing: "0.05em",
              textAlign: "center",
              lineHeight: 1.2,
              textTransform: "uppercase" as const,
            }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Stage icons (inline SVG, 16x16)
function meetingIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function planningIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function assigningIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function executingIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function reviewIcon(color: string) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
