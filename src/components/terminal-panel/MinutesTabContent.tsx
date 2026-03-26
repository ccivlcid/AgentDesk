import { useState } from "react";
import type { MeetingMinute, Task } from "../../types";

export interface MinutesTabContentProps {
  meetingMinutes: MeetingMinute[];
  task: Task | undefined;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  meetingTypeLabel: (type: "planned" | "review") => string;
  meetingStatusLabel: (status: MeetingMinute["status"]) => string;
  locale: string;
}

const mono = "var(--th-font-mono)";

// 발언자별 색상 (이름 해시 기반)
function speakerColor(name: string): string {
  const colors = ["#60a5fa", "#a78bfa", "#34d399", "#fb923c", "#f472b6", "#38bdf8", "#facc15", "#4ade80"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

function statusDot(status: MeetingMinute["status"]) {
  if (status === "completed")          return { color: "#30d158", label: "완료" };
  if (status === "revision_requested") return { color: "#ff9f0a", label: "보완 요청" };
  if (status === "failed")             return { color: "#ff453a", label: "실패" };
  return                                      { color: "#0a84ff", label: "진행 중" };
}

export function MinutesTabContent({
  meetingMinutes,
  tr,
  meetingTypeLabel,
  locale,
}: MinutesTabContentProps) {
  // 라운드별 그룹화
  const rounds = Array.from(
    meetingMinutes.reduce((map, m) => {
      const r = m.round ?? 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
      return map;
    }, new Map<number, MeetingMinute[]>())
  ).sort(([a], [b]) => a - b);

  const lastRound = rounds.length > 0 ? rounds[rounds.length - 1][0] : null;
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const activeRound =
    selectedRound !== null && rounds.some(([r]) => r === selectedRound)
      ? selectedRound
      : lastRound;

  // 빈 상태
  if (meetingMinutes.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--th-text-muted)" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" style={{ marginBottom: 10, opacity: 0.3 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span style={{ fontFamily: mono, fontSize: 11 }}>
          {tr("회의록이 아직 없습니다", "No meeting minutes yet", "会議録はまだありません", "暂无会议纪要")}
        </span>
      </div>
    );
  }

  const currentMeetings = rounds.find(([r]) => r === activeRound)?.[1] ?? [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* ── 라운드 선택 (라운드 2개 이상일 때만) ── */}
      {rounds.length > 1 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "7px 16px",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}>
          {rounds.map(([round, meetings]) => {
            const isActive = round === activeRound;
            const live = meetings.some((m) => m.status === "in_progress");
            return (
              <button
                key={round}
                type="button"
                onClick={() => setSelectedRound(round)}
                style={{
                  fontFamily: mono, fontSize: 10, fontWeight: isActive ? 700 : 500,
                  padding: "2px 10px",
                  borderRadius: 20,
                  border: isActive ? "1px solid #BFDBFE" : "1px solid #E5E7EB",
                  background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                  color: isActive ? "var(--th-accent)" : "var(--th-text-muted)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.1s",
                }}
              >
                Round {round}
                {live && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#30d158", animation: "pulse 1.5s infinite" }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── 회의 목록 ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
        {currentMeetings.map((meeting, mi) => {
          const dot = statusDot(meeting.status);
          const timeStr = new Date(meeting.started_at).toLocaleString(locale, {
            month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          });

          return (
            <div key={meeting.id}>
              {/* 회의 헤더 — 얇은 선 + 메타 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-accent)" }}>
                  {meetingTypeLabel(meeting.meeting_type)}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--th-border)" }} />
                {/* 상태 dot */}
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: mono, fontSize: 9, color: dot.color }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", background: dot.color,
                    ...(meeting.status === "in_progress" ? { animation: "pulse 1.5s infinite" } : {}),
                  }} />
                  {dot.label}
                </span>
                <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>{timeStr}</span>
              </div>

              {/* 발언 목록 — 채팅 스타일 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {meeting.entries.map((entry, ei) => {
                  const color = speakerColor(entry.speaker_name);
                  const isLast = ei === meeting.entries.length - 1;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex", gap: 12,
                        paddingBottom: isLast ? 0 : 12,
                        marginBottom: isLast ? 0 : 12,
                        borderBottom: isLast ? "none" : "1px solid #E5E7EB",
                      }}
                    >
                      {/* 아바타 컬럼 */}
                      <div style={{ flexShrink: 0, paddingTop: 1 }}>
                        <div style={{
                          width: 26, height: 26,
                          borderRadius: "50%",
                          background: `${color}1a`,
                          border: `1.5px solid ${color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: mono, fontSize: 10, fontWeight: 700,
                          color,
                        }}>
                          {entry.speaker_name.slice(0, 1).toUpperCase()}
                        </div>
                      </div>

                      {/* 내용 컬럼 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* 발언자 정보 */}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color }}>
                            {entry.speaker_name}
                          </span>
                          {entry.department_name && (
                            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                              {entry.department_name}
                            </span>
                          )}
                          {entry.role_label && (
                            <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                              · {entry.role_label}
                            </span>
                          )}
                          <span style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", marginLeft: "auto" }}>
                            #{entry.seq}
                          </span>
                        </div>

                        {/* 발언 내용 */}
                        <p style={{
                          margin: 0,
                          fontSize: 12,
                          lineHeight: 1.65,
                          color: "var(--th-text-secondary)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}>
                          {entry.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 회의 사이 구분 (마지막 제외) */}
              {mi < currentMeetings.length - 1 && (
                <div style={{ marginTop: 20, borderTop: "1px dashed #E5E7EB" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
