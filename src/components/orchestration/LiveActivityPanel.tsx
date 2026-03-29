import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Task, Agent } from "../../types";
import { getTaskExecutionEvents } from "../../api/organization-projects";

const mono = "var(--th-font-mono)";

/* ================================================================
   Log entry
   ================================================================ */

interface LogEntry {
  time: string;
  tag: string;
  message: string;
  timestamp: number;
}

/* ================================================================
   Props
   ================================================================ */

interface LiveActivityPanelProps {
  tasks: Task[];
  agents: Agent[];
  projectId?: string;
  filterAgentId: string | null;
  onOpenRoom: () => void;
}

/* ================================================================
   Component — Activity log only (Room is a separate modal)
   ================================================================ */

export default function LiveActivityPanel({
  tasks, agents, projectId, filterAgentId, onOpenRoom,
}: LiveActivityPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Fetch activity logs from tasks
  const taskSig = tasks.map((t) => `${t.id}:${t.status}:${t.execution_state ?? ""}`).join(",");
  useEffect(() => {
    if (!projectId) return;
    const fetchLogs = async () => {
      const allEntries: LogEntry[] = [];
      const activeTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "done" || t.status === "review" || t.status === "failed");
      const fetchTasks = activeTasks.slice(0, 8);
      const results = await Promise.allSettled(
        fetchTasks.map((t) => getTaskExecutionEvents(t.id, 15)),
      );
      const agentMap = new Map(agents.map((a) => [a.id, a]));
      results.forEach((res, idx) => {
        if (res.status !== "fulfilled") return;
        const task = fetchTasks[idx];
        const agent = agentMap.get(task.assigned_agent_id ?? "");
        const tag = agent?.name?.slice(0, 3).toUpperCase() ?? "SYS";
        for (const ev of res.value.events) {
          const d = new Date(ev.created_at);
          allEntries.push({
            time: d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }),
            tag,
            message: ev.summary
              ? `${ev.event_type}: ${ev.summary}`
              : ev.event_type,
            timestamp: d.getTime(),
          });
        }
      });
      allEntries.sort((a, b) => a.timestamp - b.timestamp);
      setLogs(allEntries.slice(-50));
    };
    fetchLogs();
  }, [projectId, taskSig, agents, tasks]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    autoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }, []);

  const filteredLogs = useMemo(() => {
    if (!filterAgentId) return logs;
    const agent = agents.find((a) => a.id === filterAgentId);
    if (!agent) return logs;
    const tag = agent.name.slice(0, 3).toUpperCase();
    return logs.filter((l) => l.tag === tag);
  }, [logs, filterAgentId, agents]);

  return (
    <div style={{
      height: 160, flexShrink: 0, display: "flex", flexDirection: "column",
      borderTop: "1px solid var(--th-border)",
      background: "var(--th-bg-primary)", fontFamily: mono,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 16px", borderBottom: "1px solid var(--th-border)",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
          {filterAgentId ? "ACTIVITY (filtered)" : "LIVE ACTIVITY"}
        </span>
        <button
          type="button"
          onClick={onOpenRoom}
          style={{
            fontFamily: mono, fontSize: 9, fontWeight: 700,
            color: "var(--th-text-muted)", background: "var(--th-bg-surface)",
            border: "1px solid var(--th-border)", borderRadius: 4,
            padding: "2px 8px", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; e.currentTarget.style.borderColor = "var(--th-accent-border)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.borderColor = "var(--th-border)"; }}
        >
          Room
        </button>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: "auto", padding: "4px 16px" }}
      >
        {filteredLogs.map((log, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "2px 0", fontSize: 11, lineHeight: 1.5 }}>
            <span style={{ color: "var(--th-text-muted)", fontWeight: 600, width: 38, flexShrink: 0 }}>
              {log.time}
            </span>
            <span style={{
              fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
              background: "rgba(59,130,246,0.12)", color: "#3b82f6",
              flexShrink: 0, alignSelf: "flex-start", marginTop: 2,
            }}>
              {log.tag}
            </span>
            <span style={{ color: "var(--th-text-secondary)", minWidth: 0 }}>
              {log.message}
            </span>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div style={{ padding: "12px 0", fontSize: 10, color: "var(--th-text-muted)", fontStyle: "italic" }}>
            아직 활동이 없습니다...
          </div>
        )}
      </div>
    </div>
  );
}
