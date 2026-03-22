/**
 * RightShelf — PM Activity Log 패널.
 * 프로젝트의 PM 활동을 타임라인으로 표시: 업무 지시, 검토, 상태 변경.
 * 검토 대기 태스크에 [승인] [수정요청] 버튼 포함.
 * 라이트모드/다크모드 모두 지원 (var(--th-*) CSS 변수 사용).
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useUiStore } from "../../store/uiStore";
import { useProjectStore } from "../../store/projectStore";
import { fetchPmActivity, type PmActivityItem, type PmActivityResponse, type MeetingEntry } from "../../api/pm-activity";
import { replyDecisionInbox } from "../../api/messaging-runtime-oauth";
import { useWebSocket } from "../../hooks/useWebSocket";

const mono = "var(--th-font-mono)";
const PANEL_W = 340;
const STRIP_W = 6;

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

const IconMeeting = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

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
        pointerEvents: pmActivityExpanded ? "auto" : "none",
      }}
      onMouseEnter={() => { cancelClose(); if (!pmActivityExpanded) togglePmActivityExpanded(); }}
      onMouseLeave={() => { if (pmActivityExpanded) scheduleClose(); }}
    >
      {/* Trigger strip */}
      <div
        style={{
          width: STRIP_W,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
        onClick={() => togglePmActivityExpanded()}
      >
        <div style={{
          width: 3,
          height: pmActivityExpanded ? 0 : 52,
          background: "var(--th-text-muted)",
          borderRadius: 2,
          transition: "height 0.2s ease, opacity 0.2s",
          opacity: pmActivityExpanded ? 0 : 0.3,
        }} />
      </div>

      {/* Panel */}
      <div style={{
        flex: 1,
        background: "var(--th-bg-panel)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        borderLeft: "1px solid var(--th-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "10px 14px 8px",
          borderBottom: "1px solid var(--th-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--th-text-heading)" }}>
            <IconPm />
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
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
                background: "var(--th-bg-surface)",
                border: "1px solid var(--th-border)",
                color: "var(--th-text-secondary)",
                borderRadius: 4,
                padding: "2px 4px",
                outline: "none",
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status counts */}
        <div style={{
          display: "flex",
          padding: "6px 14px",
          gap: 2,
          borderBottom: "1px solid var(--th-border)",
        }}>
          {([
            { label: "계획", count: counts.planned, color: "var(--th-text-muted)" },
            { label: "진행", count: counts.in_progress, color: "#0a84ff" },
            { label: "검토", count: counts.review, color: "#f59e0b" },
            { label: "완료", count: counts.done, color: "#30d158" },
          ] as const).map((s) => (
            <div key={s.label} style={{
              flex: 1,
              textAlign: "center",
              fontFamily: mono,
              fontSize: 9,
              color: s.count > 0 ? s.color : "var(--th-text-disabled, var(--th-text-muted))",
              opacity: s.count > 0 ? 1 : 0.4,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{s.count}</div>
              <div>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{
          display: "flex",
          padding: "6px 14px",
          gap: 4,
          borderBottom: "1px solid var(--th-border)",
        }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: filter === f.key ? 700 : 400,
                padding: "2px 8px",
                border: filter === f.key ? "1px solid var(--th-border-strong, var(--th-border))" : "1px solid transparent",
                borderRadius: 10,
                background: filter === f.key ? "var(--th-hover-overlay)" : "transparent",
                color: filter === f.key ? "var(--th-text-heading)" : "var(--th-text-muted)",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {!activeProjectId ? (
            <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "24px 14px" }}>
              활성 프로젝트 없음
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", textAlign: "center", padding: "24px 14px" }}>
              PM 활동 없음
            </div>
          ) : filtered.map((item) => {
            const color = typeColor(item.type);
            const isReviewItem = item.taskId
              && (item.summary.includes("review") || item.summary.includes("Review") || item.summary.includes("검토"))
              && !approvedTaskIds.has(item.taskId);

            return (
              <div
                key={item.id}
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--th-border)",
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: `${color}18`,
                  border: `1px solid ${color}30`,
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
                  {/* Summary — meetings are clickable to expand */}
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
                      <span style={{ fontSize: 9, marginRight: 4, opacity: 0.5 }}>
                        {expandedMeetings.has(item.id) ? "▾" : "▸"}
                      </span>
                    )}
                    {item.summary.length > 120 ? item.summary.slice(0, 120) + "..." : item.summary}
                  </div>

                  {/* Meeting entries (expandable) */}
                  {item.type === "meeting" && expandedMeetings.has(item.id) && item.meetingEntries && (
                    <div style={{
                      marginTop: 6,
                      padding: "6px 8px",
                      background: "var(--th-bg-surface)",
                      border: "1px solid var(--th-border)",
                      borderRadius: 4,
                      maxHeight: 200,
                      overflowY: "auto",
                    }}>
                      {item.meetingEntries.map((entry, idx) => (
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

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    {item.agentName && (
                      <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                        {item.agentName}
                      </span>
                    )}
                    <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.6 }}>
                      {timeAgo(item.timestamp)}
                    </span>
                  </div>

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
                          fontWeight: 700,
                          padding: "3px 10px",
                          border: "1px solid #30d158",
                          background: "rgba(48,209,88,0.12)",
                          color: "#30d158",
                          borderRadius: 4,
                          cursor: busyTaskId === item.taskId ? "not-allowed" : "pointer",
                          opacity: busyTaskId === item.taskId ? 0.5 : 1,
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
                          fontWeight: 700,
                          padding: "3px 10px",
                          border: "1px solid var(--th-border)",
                          background: "transparent",
                          color: "var(--th-text-muted)",
                          borderRadius: 4,
                          cursor: busyTaskId === item.taskId ? "not-allowed" : "pointer",
                          opacity: busyTaskId === item.taskId ? 0.5 : 1,
                        }}
                      >
                        수정요청
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "6px 14px",
          borderTop: "1px solid var(--th-border)",
          fontFamily: mono,
          fontSize: 9,
          color: "var(--th-text-muted)",
          textAlign: "center",
        }}>
          {data?.pmAgent ? `PM: ${data.pmAgent.nameKo || data.pmAgent.name}` : "PM 미할당"} · {counts.total}건
        </div>
      </div>
    </div>
  );
}
