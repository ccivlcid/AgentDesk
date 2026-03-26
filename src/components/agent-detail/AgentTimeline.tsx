import { useEffect, useState } from "react";
import type { TFunction } from "./constants";
import type { TimelineEvent } from "../../api/agent-timeline";
import { getAgentTimeline } from "../../api/agent-timeline";

const EVENT_COLOR: Record<TimelineEvent["type"], string> = {
  task_start: "#3B82F6",
  task_done: "#30d158",
  task_fail: "#DC2626",
  skill_learn: "#3fb950",
  memory_save: "#6B7280",
  hook_run: "#3B82F6",
  api_completion: "#3B82F6",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (sameDay) {
    return `${hh}:${mm}`;
  }

  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mo}/${dd} ${hh}:${mm}`;
}

interface AgentTimelineProps {
  agentId: string;
  t: TFunction;
}

export default function AgentTimeline({ agentId, t }: AgentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAgentTimeline(agentId)
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => {
        setError(t({ ko: "타임라인을 불러오지 못했습니다", en: "Failed to load timeline", ja: "タイムラインの読み込みに失敗しました", zh: "无法加载时间线" }));
        setLoading(false);
      });
  }, [agentId, t]);

  if (loading) {
    return (
      <div
        className="py-8 text-center text-xs"
        style={{ fontFamily: "var(--th-font-mono)", color: "#9CA3AF" }}
      >
        {t({ ko: "로딩 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="py-8 text-center text-xs"
        style={{ fontFamily: "var(--th-font-mono)", color: "#DC2626" }}
      >
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="terminal-empty-state py-8">
        <p className="terminal-empty-state-cmd">$ cat timeline.log --agent={agentId.slice(0, 8)}</p>
        <p className="terminal-empty-state-result">(empty)</p>
        <p className="terminal-empty-state-hint">
          {t({
            ko: "아직 기록된 이벤트가 없습니다. 에이전트가 태스크를 실행하면 여기에 표시됩니다.",
            en: "No events recorded yet. Events will appear here as the agent runs tasks.",
            ja: "まだイベントが記録されていません。エージェントがタスクを実行すると表示されます。",
            zh: "暂无记录的事件。代理执行任务后将在此处显示。",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: "var(--th-font-mono)" }}>
      {events.map((ev, idx) => (
        <div
          key={ev.id}
          className="flex gap-3 py-2"
          style={{
            borderBottom: idx < events.length - 1 ? "1px solid #E5E7EB" : "none",
          }}
        >
          {/* Time column */}
          <div
            className="w-20 text-[10px] shrink-0 pt-0.5"
            style={{ color: "#9CA3AF" }}
          >
            {formatTime(ev.created_at)}
          </div>

          {/* Dot + connector line */}
          <div className="flex flex-col items-center gap-0.5" style={{ width: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: EVENT_COLOR[ev.type] ?? "#E5E7EB",
                flexShrink: 0,
              }}
            />
            {idx < events.length - 1 && (
              <div
                style={{
                  flex: 1,
                  width: 1,
                  minHeight: 12,
                  background: "#E5E7EB",
                }}
              />
            )}
          </div>

          {/* Event content */}
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span
              className="text-[11px] truncate"
              style={{ color: "#6B7280" }}
            >
              {ev.message}
            </span>
            {ev.taskTitle && (
              <span
                className="text-[10px] truncate"
                style={{ color: "#9CA3AF" }}
              >
                // {ev.taskTitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
