import { useAgentStore } from "../../../store/agentStore";
import { useUiStore } from "../../../store/uiStore";
import type { AgentStatus } from "../../../types";

const mono = "var(--th-font-mono)";

const STATUS_COLOR: Record<AgentStatus, string> = {
  working: "#22c55e",
  idle:    "#64748b",
  break:   "#f59e0b",
  offline: "#3f3f3f",
};

const STATUS_LABEL: Record<AgentStatus, string> = {
  working: "working",
  idle:    "idle",
  break:   "break",
  offline: "off",
};

export default function AgentsWidget() {
  const { agents } = useAgentStore();
  const { openWindow } = useUiStore();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 상단 요약 */}
      <div style={{
        display: "flex",
        gap: 12,
        padding: "6px 10px",
        borderBottom: "1px solid var(--th-border)",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        flexShrink: 0,
      }}>
        {(["working", "idle", "offline"] as AgentStatus[]).map((s) => {
          const count = agents.filter((a) => a.status === s).length;
          return (
            <span key={s} style={{ color: STATUS_COLOR[s] }}>
              {count} {s}
            </span>
          );
        })}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => openWindow("agent-manager")}
          style={{ background: "none", border: "none", color: "var(--th-accent)", fontSize: 10, fontFamily: mono, cursor: "pointer" }}
        >
          [설정]
        </button>
      </div>

      {/* 에이전트 목록 */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {agents.length === 0 ? (
          <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px", textAlign: "center" }}>
            에이전트 없음
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "none"; }}
            >
              <span style={{ fontSize: 16 }}>{agent.avatar_emoji || "🤖"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {agent.name_ko || agent.name}
                </div>
                {agent.current_task_id && (
                  <div style={{ fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)" }}>
                    task: {agent.current_task_id.slice(0, 8)}…
                  </div>
                )}
              </div>
              <span style={{ fontFamily: mono, fontSize: 9, color: STATUS_COLOR[agent.status] }}>
                {STATUS_LABEL[agent.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
