import type { Task } from "../../types";

const mono = "var(--th-font-mono)";

interface StageRailProps {
  stage: string;
  tasks?: Task[];
}

const STAGES = [
  { id: "meeting", label: "회의", icon: meetingIcon },
  { id: "planning", label: "계획", icon: planningIcon },
  { id: "assigning", label: "배정", icon: assigningIcon },
  { id: "executing", label: "실행", icon: executingIcon },
  { id: "review", label: "검토", icon: reviewIcon },
] as const;

const STAGE_ORDER = STAGES.map((s) => s.id);

type PmStatus = "idle" | "kickoff" | "waiting" | "reviewing" | "project_review" | "completed";

function computePmStatus(stage: string, tasks: Task[]): {
  status: PmStatus;
  label: string;
  metric: string | null;
  color: string;
  bg: string;
  border: string;
} {
  if (stage === "idle") {
    return { status: "idle", label: "대기", metric: null, color: "var(--th-text-muted)", bg: "var(--th-bg-surface)", border: "var(--th-border)" };
  }
  if (stage !== "done") {
    return { status: "kickoff", label: "킥오프", metric: null, color: "var(--th-accent)", bg: "var(--th-accent-glow)", border: "var(--th-accent-border)" };
  }

  const reviewCount = tasks.filter((t) => t.status === "review").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const failedCount = tasks.filter((t) => t.status === "failed" || t.execution_state === "failed").length;
  const total = tasks.length;

  if (reviewCount > 0) {
    return { status: "reviewing", label: "검토 중", metric: `${reviewCount}건`, color: "var(--th-review)", bg: "var(--th-review-bg)", border: "var(--th-review-border)" };
  }
  if (inProgressCount > 0) {
    return { status: "waiting", label: "실행 감시", metric: `${doneCount}/${total}`, color: "var(--th-accent)", bg: "var(--th-accent-glow)", border: "var(--th-accent-border)" };
  }
  if (total > 0 && doneCount + failedCount >= total) {
    if (failedCount === 0) {
      const rate = Math.round((doneCount / total) * 100);
      return { status: "completed", label: "완료", metric: `${rate}%`, color: "var(--th-success)", bg: "var(--th-success-bg)", border: "var(--th-success-border)" };
    }
    return { status: "project_review", label: "최종 검토", metric: null, color: "var(--th-warning)", bg: "var(--th-warning-bg)", border: "var(--th-warning-border)" };
  }
  return { status: "waiting", label: "대기", metric: null, color: "var(--th-text-muted)", bg: "var(--th-bg-surface)", border: "var(--th-border)" };
}

export default function StageRail({ stage, tasks = [] }: StageRailProps) {
  const isAllDone = stage === "done";
  const activeIdx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
  const pmInfo = computePmStatus(stage, tasks);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: 72,
      background: "var(--th-bg-elevated)",
      borderRight: "1px solid var(--th-border)",
      flexShrink: 0,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Kickoff pipeline */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 0 8px",
        gap: 2,
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
                gap: 4,
                padding: "6px 4px",
                borderLeft: `3px solid ${borderLeftColor}`,
                cursor: "default",
                transition: "all 0.2s",
              }}
            >
              <div style={{
                padding: 4,
                background: iconBg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}>
                {s.icon(iconColor)}
              </div>
              <span style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: isCurrent ? 800 : 600,
                color: textColor,
                letterSpacing: "0.04em",
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

      {/* Divider */}
      <div style={{ height: 1, background: "var(--th-border)", margin: "0 8px" }} />

      {/* PM Status section */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 4px",
        flex: 1,
        borderLeft: `3px solid ${pmInfo.status === "reviewing" || pmInfo.status === "project_review" ? pmInfo.color : "transparent"}`,
        transition: "all 0.3s",
      }}>
        {/* PM icon */}
        <div style={{
          padding: 5,
          background: pmInfo.bg,
          border: `1px solid ${pmInfo.border}`,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s",
        }}>
          {pmIcon(pmInfo.color)}
        </div>

        {/* Section label */}
        <span style={{
          fontFamily: mono,
          fontSize: 8,
          fontWeight: 700,
          color: "var(--th-text-muted)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
        }}>
          PM
        </span>

        {/* Status label */}
        <span style={{
          fontFamily: mono,
          fontSize: 9,
          fontWeight: 800,
          color: pmInfo.color,
          letterSpacing: "0.04em",
          textAlign: "center",
          lineHeight: 1.2,
          textTransform: "uppercase" as const,
        }}>
          {pmInfo.label}
        </span>

        {/* Metric */}
        {pmInfo.metric && (
          <span style={{
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 800,
            color: pmInfo.color,
            background: pmInfo.bg,
            border: `1px solid ${pmInfo.border}`,
            borderRadius: 6,
            padding: "2px 6px",
            textAlign: "center",
          }}>
            {pmInfo.metric}
          </span>
        )}
      </div>

    </div>
  );
}

// Stage icons (inline SVG, 14x14 — compact)
function meetingIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function planningIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function assigningIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function executingIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function reviewIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function pmIcon(color: string) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
