/**
 * RightShelf -- PM Activity Log panel.
 * macOS-native design: glass background, segmented controls, accent bars, thin scrollbar.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { fetchPmActivity, type PmActivityItem, type PmActivityResponse, type MeetingEntry } from "../../api/pm-activity";
import { replyDecisionInbox } from "../../api/messaging-runtime-oauth";
import { useWebSocket } from "../../hooks/useWebSocket";

const mono = "var(--th-font-mono)";
const PANEL_W = 340;
const STRIP_W = 14;

// ── SVG Icons ──
const IconPm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconPlay = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const IconMeeting = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);
const IconEmptyInbox = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

type FilterKey = "all" | "meeting" | "oversight" | "task_status" | "pm_message" | "decision";
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "전체" },
  { key: "meeting", label: "회의록" },
  { key: "oversight", label: "지시" },
  { key: "task_status", label: "상태" },
  { key: "decision", label: "검토" },
  { key: "pm_message", label: "보고" },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return new Date(ts).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function typeIcon(type: PmActivityItem["type"]) {
  switch (type) {
    case "meeting": return <IconMeeting />;
    case "oversight": return <IconPlay />;
    case "task_status": return <IconCheck />;
    case "decision": return <IconEdit />;
    default: return <IconPm />;
  }
}
function typeColor(type: PmActivityItem["type"]): string {
  switch (type) {
    case "meeting": return "#06b6d4";
    case "oversight": return "#f59e0b";
    case "task_status": return "#30d158";
    case "decision": return "#bf5af2";
    case "pm_message": return "#0a84ff";
    default: return "#8e8e93";
  }
}

/* Thin macOS-style scrollbar CSS (injected once) */
const SCROLLBAR_CLASS = "pm-shelf-scroll";
const scrollStyleId = "pm-shelf-scroll-style";
function ensureScrollStyle() {
  if (document.getElementById(scrollStyleId)) return;
  const style = document.createElement("style");
  style.id = scrollStyleId;
  style.textContent = `
    .${SCROLLBAR_CLASS}::-webkit-scrollbar { width: 5px; }
    .${SCROLLBAR_CLASS}::-webkit-scrollbar-track { background: transparent; }
    .${SCROLLBAR_CLASS}::-webkit-scrollbar-thumb {
      background: var(--th-scrollbar-thumb);
      border-radius: 4px;
    }
    .${SCROLLBAR_CLASS}::-webkit-scrollbar-thumb:hover {
      background: var(--th-scrollbar-thumb-hover);
    }
  `;
  document.head.appendChild(style);
}

/* Hover state helper for activity items */
function ActivityItem({
  item,
  expandedMeetings,
  setExpandedMeetings,
  approvedTaskIds,
  busyTaskId,
  handleApprove,
  handleRevision,
}: {
  item: PmActivityItem;
  expandedMeetings: Set<string>;
  setExpandedMeetings: React.Dispatch<React.SetStateAction<Set<string>>>;
  approvedTaskIds: Set<string>;
  busyTaskId: string | null;
  handleApprove: (id: string) => void;
  handleRevision: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = typeColor(item.type);
  const isReviewItem = item.taskId
    && (item.summary.includes("review") || item.summary.includes("Review") || item.summary.includes("검토"))
    && !approvedTaskIds.has(item.taskId);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "7px 12px 7px 0",
        marginLeft: 12,
        marginRight: 8,
        marginBottom: 1,
        display: "flex",
        gap: 8,
        alignItems: "stretch",
        borderRadius: 6,
        background: hovered ? "var(--th-hover-overlay-subtle)" : "transparent",
        transition: "background 0.15s ease",
        cursor: "default",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: 2,
        flexShrink: 0,
        borderRadius: 1,
        background: color,
        opacity: 0.7,
        alignSelf: "stretch",
      }} />

      {/* Icon badge */}
      <div style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        background: `${color}14`,
        border: `1px solid ${color}25`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        flexShrink: 0,
        marginTop: 1,
      }}>
        {typeIcon(item.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Agent name + timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          {item.agentName && (
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              color: "var(--th-text-secondary)",
              letterSpacing: "0.02em",
            }}>
              {item.agentName}
            </span>
          )}
          <span style={{
            fontFamily: mono,
            fontSize: 9,
            color: "var(--th-text-muted)",
            marginLeft: "auto",
            flexShrink: 0,
          }}>
            {timeAgo(item.timestamp)}
          </span>
        </div>

        {/* Summary */}
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: "var(--th-text-primary)",
            lineHeight: 1.5,
            wordBreak: "break-word",
            cursor: item.type === "meeting" ? "pointer" : "default",
          }}
          onClick={() => {
            if (item.type === "meeting") {
              setExpandedMeetings((prev) => {
                const next = new Set(prev);
                next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                return next;
              });
            }
          }}
        >
          {item.type === "meeting" && (
            <span style={{ marginRight: 4, opacity: 0.5, display: "inline-flex", verticalAlign: "middle" }}>
              {expandedMeetings.has(item.id) ? <IconChevronDown /> : <IconChevronRight />}
            </span>
          )}
          {item.summary.length > 120 ? item.summary.slice(0, 120) + "..." : item.summary}
        </div>

        {/* Meeting entries (expandable) */}
        {item.type === "meeting" && expandedMeetings.has(item.id) && item.meetingEntries && (
          <div style={{
            marginTop: 6,
            padding: "6px 8px",
            background: "var(--th-hover-overlay-subtle)",
            border: "1px solid var(--th-border)",
            borderRadius: 6,
            maxHeight: 200,
            overflowY: "auto",
          }}>
            {item.meetingEntries.map((entry: MeetingEntry, idx: number) => (
              <div key={idx} style={{ marginBottom: idx < item.meetingEntries!.length - 1 ? 6 : 0 }}>
                <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, color: "var(--th-accent)" }}>
                  {entry.speaker}
                </span>
                <div style={{ fontFamily: mono, fontSize: 10, color: "var(--th-text-secondary)", lineHeight: 1.4, marginTop: 1 }}>
                  {entry.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review actions */}
        {isReviewItem && item.taskId && (
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            <button
              type="button"
              onClick={() => handleApprove(item.taskId!)}
              disabled={busyTaskId === item.taskId}
              style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: 600,
                padding: "3px 10px",
                border: "1px solid rgba(48,209,88,0.35)",
                background: "rgba(48,209,88,0.1)",
                color: "#30d158",
                borderRadius: 6,
                cursor: busyTaskId === item.taskId ? "not-allowed" : "pointer",
                opacity: busyTaskId === item.taskId ? 0.5 : 1,
                transition: "background 0.15s",
              }}
            >
              {busyTaskId === item.taskId ? "..." : "승인"}
            </button>
            <button
              type="button"
              onClick={() => handleRevision(item.taskId!)}
              disabled={busyTaskId === item.taskId}
              style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: 600,
                padding: "3px 10px",
                border: "1px solid var(--th-border)",
                background: "transparent",
                color: "var(--th-text-muted)",
                borderRadius: 6,
                cursor: busyTaskId === item.taskId ? "not-allowed" : "pointer",
                opacity: busyTaskId === item.taskId ? 0.5 : 1,
                transition: "background 0.15s",
              }}
            >
              수정요청
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RightShelf() {
  const { on } = useWebSocket();
  const { pmActivityProjectId, pmActivityExpanded, togglePmActivityExpanded, setPmActivityProjectId } = useUiStore();
  const { projects } = useProjectStore();

  const [data, setData] = useState<PmActivityResponse | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [approvedTaskIds, setApprovedTaskIds] = useState<Set<string>>(new Set());
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeProjectId = pmActivityProjectId || projects[0]?.id || null;

  useEffect(() => { ensureScrollStyle(); }, []);

  const loadActivity = useCallback(() => {
    if (!activeProjectId) return;
    fetchPmActivity(activeProjectId, { limit: 80 }).then(setData).catch(() => {});
  }, [activeProjectId]);

  useEffect(() => { loadActivity(); }, [loadActivity]);
  useEffect(() => on("pm_activity", () => { loadActivity(); }), [on, loadActivity]);
  useEffect(() => on("task_update", () => { loadActivity(); }), [on, loadActivity]);

  const items = data?.items ?? [];
  const counts = data?.counts ?? { planned: 0, in_progress: 0, review: 0, done: 0, total: 0 };
  const deduped = items.reduce<PmActivityItem[]>((acc, item) => {
    const key = `${item.taskId ?? ""}:${item.type}`;
    if (!acc.some((a) => `${a.taskId ?? ""}:${a.type}` === key)) acc.push(item);
    return acc;
  }, []);
  const filtered = filter === "all" ? deduped : deduped.filter((i) => i.type === filter);

  async function handleApprove(taskId: string) {
    setBusyTaskId(taskId);
    try {
      await replyDecisionInbox(`task-review:${taskId}`, 1);
      setApprovedTaskIds((prev) => new Set([...prev, taskId]));
      setTimeout(loadActivity, 1500);
    } catch (err) {
      console.error("[PM Activity] approve failed:", err);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleRevision(taskId: string) {
    setBusyTaskId(taskId);
    try {
      await replyDecisionInbox(`task-review:${taskId}`, 2);
      setApprovedTaskIds((prev) => new Set([...prev, taskId]));
      setTimeout(loadActivity, 1500);
    } catch (err) {
      console.error("[PM Activity] revision failed:", err);
    } finally {
      setBusyTaskId(null);
    }
  }

  function scheduleClose() {
    closeTimerRef.current = setTimeout(() => togglePmActivityExpanded(), 300);
  }
  function cancelClose() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }

  const translateX = pmActivityExpanded ? 0 : PANEL_W;

  // Stats bar config
  const statItems = [
    { label: "계획", count: counts.planned, bg: "rgba(142,142,147,0.12)", color: "#8e8e93", border: "rgba(142,142,147,0.2)" },
    { label: "진행", count: counts.in_progress, bg: "rgba(10,132,255,0.12)", color: "#0a84ff", border: "rgba(10,132,255,0.2)" },
    { label: "검토", count: counts.review, bg: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "rgba(245,158,11,0.2)" },
    { label: "완료", count: counts.done, bg: "rgba(48,209,88,0.12)", color: "#30d158", border: "rgba(48,209,88,0.2)" },
  ];

  return (
    <div
      data-no-ctx="true"
      style={{
        position: "fixed",
        right: 0,
        top: 44,
        bottom: 56,
        width: PANEL_W + STRIP_W,
        transform: `translateX(${translateX}px)`,
        transition: "transform 0.26s cubic-bezier(0.32, 0, 0.67, 0)",
        zIndex: 990,
        display: "flex",
        flexDirection: "row",
        pointerEvents: pmActivityExpanded ? "auto" : "none",
      }}
      onMouseEnter={() => { cancelClose(); if (!pmActivityExpanded) togglePmActivityExpanded(); }}
      onMouseLeave={() => { if (pmActivityExpanded) scheduleClose(); }}
    >
      {/* Panel (left side) */}
      <div style={{
        flex: 1,
        background: "var(--th-panel-bg)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderLeft: "1px solid var(--th-glass-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        order: 2,
      }}>
        {/* Header */}
        <div style={{
          padding: "11px 14px 9px",
          borderBottom: "1px solid var(--th-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--th-glass-bg)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--th-text-heading)" }}>
            <div style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "rgba(10,132,255,0.12)",
              border: "1px solid rgba(10,132,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0a84ff",
            }}>
              <IconPm />
            </div>
            <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" }}>
              PM Activity
            </span>
          </div>
          {projects.length > 1 && (
            <select
              value={activeProjectId || ""}
              onChange={(e) => setPmActivityProjectId(e.target.value || null)}
              style={{
                fontFamily: mono,
                fontSize: 10,
                background: "var(--th-hover-overlay)",
                border: "1px solid var(--th-border)",
                color: "var(--th-text-secondary)",
                borderRadius: 6,
                padding: "3px 6px",
                outline: "none",
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Stats bar -- pill badges */}
        <div style={{
          display: "flex",
          padding: "8px 12px",
          gap: 6,
          borderBottom: "1px solid var(--th-border)",
        }}>
          {statItems.map((s) => (
            <div key={s.label} style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "4px 0",
              borderRadius: 8,
              background: s.count > 0 ? s.bg : "var(--th-hover-overlay-subtle)",
              border: `1px solid ${s.count > 0 ? s.border : "var(--th-border)"}`,
              transition: "all 0.2s ease",
            }}>
              <span style={{
                fontFamily: mono,
                fontSize: 13,
                fontWeight: 700,
                color: s.count > 0 ? s.color : "var(--th-text-muted)",
                opacity: s.count > 0 ? 1 : 0.6,
                lineHeight: 1,
              }}>
                {s.count}
              </span>
              <span style={{
                fontFamily: mono,
                fontSize: 9,
                color: s.count > 0 ? s.color : "var(--th-text-muted)",
                opacity: s.count > 0 ? 0.8 : 0.5,
                lineHeight: 1,
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Filter tabs -- macOS segmented control */}
        <div style={{
          padding: "6px 12px",
          borderBottom: "1px solid var(--th-border)",
        }}>
          <div style={{
            display: "flex",
            background: "var(--th-hover-overlay-subtle)",
            border: "1px solid var(--th-border)",
            borderRadius: 8,
            padding: 2,
            gap: 1,
          }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  flex: 1,
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: filter === f.key ? 600 : 400,
                  padding: "4px 0",
                  border: "none",
                  borderRadius: 6,
                  background: filter === f.key ? "var(--th-hover-overlay)" : "transparent",
                  color: filter === f.key ? "var(--th-text-heading)" : "var(--th-text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: filter === f.key ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className={SCROLLBAR_CLASS} style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {!activeProjectId ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 14px",
              gap: 10,
            }}>
              <IconEmptyInbox />
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
                활성 프로젝트 없음
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 14px",
              gap: 10,
            }}>
              <IconEmptyInbox />
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-secondary)" }}>
                PM 활동 없음
              </span>
              <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                에이전트가 작업을 시작하면 여기에 표시됩니다
              </span>
            </div>
          ) : filtered.map((item) => (
            <ActivityItem
              key={item.id}
              item={item}
              expandedMeetings={expandedMeetings}
              setExpandedMeetings={setExpandedMeetings}
              approvedTaskIds={approvedTaskIds}
              busyTaskId={busyTaskId}
              handleApprove={handleApprove}
              handleRevision={handleRevision}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "7px 14px",
          borderTop: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 9,
          color: "var(--th-text-secondary)",
          textAlign: "center",
          background: "var(--th-glass-bg)",
        }}>
          {data?.pmAgent ? `PM: ${data.pmAgent.nameKo || data.pmAgent.name}` : "PM 미할당"} · {counts.total}건
        </div>
      </div>

      {/* Trigger strip — macOS-style glowing edge */}
      <style>{`
        @keyframes pm-glow-pulse {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 6px rgba(245,158,11,0.3); }
          50% { opacity: 0.9; box-shadow: 0 0 14px rgba(245,158,11,0.6), 0 0 28px rgba(245,158,11,0.15); }
        }
      `}</style>
      <div
        style={{
          width: STRIP_W,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
          position: "relative",
          order: 1,
          transition: "background 0.3s",
          background: pmActivityExpanded ? "transparent" : "linear-gradient(270deg, transparent, rgba(245,158,11,0.04))",
        }}
        onClick={() => togglePmActivityExpanded()}
      >
        {!pmActivityExpanded && (
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            transition: "opacity 0.3s",
          }}>
            {/* Top glowing line — full height to center */}
            <div style={{
              width: 2.5,
              flex: 1,
              background: "linear-gradient(180deg, transparent 0%, rgba(245,158,11,0.15) 30%, rgba(245,158,11,0.4) 100%)",
              borderRadius: 3,
              animation: "pm-glow-pulse 3s ease-in-out infinite",
            }} />
            {/* Chevron — center */}
            <svg
              width="10" height="16" viewBox="0 0 10 16" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, margin: "6px 0", filter: "drop-shadow(0 0 5px rgba(245,158,11,0.7))" }}
            >
              <polyline points="8 2 2 8 8 14" />
            </svg>
            {/* Bottom glowing line — full height to center */}
            <div style={{
              width: 2.5,
              flex: 1,
              background: "linear-gradient(180deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.15) 70%, transparent 100%)",
              borderRadius: 3,
              animation: "pm-glow-pulse 3s ease-in-out infinite",
              animationDelay: "1.5s",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
