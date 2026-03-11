import type { MeetingMinute, Task } from "../../types";

export interface MinutesTabContentProps {
  meetingMinutes: MeetingMinute[];
  task: Task | undefined;
  tr: (ko: string, en: string, ja?: string, zh?: string) => string;
  meetingTypeLabel: (type: "planned" | "review") => string;
  meetingStatusLabel: (status: MeetingMinute["status"]) => string;
  locale: string;
}

export function MinutesTabContent({
  meetingMinutes,
  task,
  tr,
  meetingTypeLabel,
  meetingStatusLabel,
  locale,
}: MinutesTabContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {meetingMinutes.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center" style={{ color: "var(--th-text-muted)" }}>
          <div className="text-3xl mb-3">📝</div>
          <div className="text-sm">
            {tr("회의록이 아직 없습니다", "No meeting minutes yet", "会議録はまだありません", "暂无会议纪要")}
          </div>
        </div>
      ) : (
        meetingMinutes.map((meeting) => (
          <div
            key={meeting.id}
            className="border p-3"
            style={{ borderRadius: 0, borderColor: "var(--th-border)", background: "var(--th-bg-elevated)" }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="px-2 py-0.5 text-[10px] font-mono"
                style={{
                  borderRadius: 0,
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.3)",
                  color: "var(--th-accent)",
                }}
              >
                {meetingTypeLabel(meeting.meeting_type)}
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-mono"
                style={{
                  borderRadius: 0,
                  background: "var(--th-bg-primary)",
                  border: "1px solid var(--th-border)",
                  color: "var(--th-text-secondary)",
                }}
              >
                {tr("라운드", "Round", "ラウンド", "轮次")} {meeting.round}
              </span>
              <span
                className="px-2 py-0.5 text-[10px] font-mono"
                style={{
                  borderRadius: 0,
                  background: "var(--th-bg-primary)",
                  border: "1px solid var(--th-border)",
                  color: "var(--th-text-secondary)",
                }}
              >
                {meetingStatusLabel(meeting.status)}
              </span>
              <span className="ml-auto text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                {new Date(meeting.started_at).toLocaleString(locale)}
              </span>
            </div>
            <div className="space-y-1.5">
              {meeting.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border px-2 py-1.5"
                  style={{
                    borderRadius: 0,
                    borderColor: "var(--th-border)",
                    background: "var(--th-bg-primary)",
                  }}
                >
                  <div
                    className="mb-0.5 flex items-center gap-2 text-[10px]"
                    style={{ color: "var(--th-text-secondary)" }}
                  >
                    <span>#{entry.seq}</span>
                    <span style={{ color: "var(--th-accent)" }}>{entry.speaker_name}</span>
                    {entry.department_name && <span>{entry.department_name}</span>}
                    {entry.role_label && <span>· {entry.role_label}</span>}
                  </div>
                  <div
                    className="text-xs leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: "var(--th-text-primary)" }}
                  >
                    {entry.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
