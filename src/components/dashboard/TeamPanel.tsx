import { useCallback, useEffect, useState } from "react";
import type { Agent } from "../../types";
import { fetchProjectAgents, addProjectAgent, removeProjectAgent } from "../../api/categories-dashboard";

interface TeamPanelProps {
  projectId: string;
  allAgents: Agent[];
  onTeamChange?: () => void;
}

const STATUS_ICON: Record<string, string> = {
  working: "●", running: "●", idle: "○", offline: "─", error: "✕",
};
const STATUS_COLOR: Record<string, string> = {
  working: "#22c55e", running: "#22c55e", idle: "#6e7681", offline: "#6e7681", error: "#ef4444",
};

export default function TeamPanel({ projectId, allAgents, onTeamChange }: TeamPanelProps) {
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchProjectAgents(projectId);
      setTeamAgentIds(new Set(res.map((a) => a.id)));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const teamAgents = allAgents.filter((a) => teamAgentIds.has(a.id));
  const availableAgents = allAgents.filter((a) => !teamAgentIds.has(a.id));
  const filteredAvailable = pickerQuery
    ? availableAgents.filter((a) => (a.name_ko ?? a.name).toLowerCase().includes(pickerQuery.toLowerCase()))
    : availableAgents;

  const handleAdd = async (agentId: string) => {
    try {
      await addProjectAgent(projectId, agentId);
      setTeamAgentIds((prev) => new Set([...prev, agentId]));
      onTeamChange?.();
    } catch {}
    setShowPicker(false);
    setPickerQuery("");
  };

  const handleRemove = async (agentId: string) => {
    try {
      await removeProjectAgent(projectId, agentId);
      setTeamAgentIds((prev) => { const n = new Set(prev); n.delete(agentId); return n; });
      onTeamChange?.();
    } catch {}
  };

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <div
      className="border-b border-[var(--th-border)] flex flex-col"
      style={{ background: "var(--th-bg-surface)" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <span style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
          PROJECT TEAM
        </span>
        <button
          onClick={() => { setShowPicker((v) => !v); setPickerQuery(""); }}
          style={{
            ...mono,
            fontSize: "0.65rem",
            padding: "2px 6px",
            border: "1px solid var(--th-border)",
            background: "none",
            color: "var(--th-text-muted)",
            cursor: "pointer",
          }}
          title={showPicker ? "Close picker" : "Add agent to team"}
        >
          {showPicker ? "✕" : "+ Add"}
        </button>
      </div>

      {/* 팀원 목록 */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: 200 }}>
        {loading ? (
          <div style={{ padding: "8px 12px", ...mono, fontSize: "0.7rem", color: "var(--th-text-muted)" }}>Loading…</div>
        ) : teamAgents.length === 0 ? (
          <div style={{ padding: "10px 12px" }}>
            <p style={{ ...mono, fontSize: "0.7rem", color: "var(--th-text-muted)" }}>No agents in team.</p>
            <button
              onClick={() => setShowPicker(true)}
              style={{
                marginTop: 6, ...mono, fontSize: "0.65rem",
                padding: "3px 8px",
                border: "1px dashed var(--th-border)",
                background: "none",
                color: "var(--th-text-muted)",
                cursor: "pointer",
              }}
            >
              + Add Agent to Team
            </button>
          </div>
        ) : (
          <div style={{ padding: "4px 0" }}>
            {teamAgents.map((agent) => {
              const statusKey = agent.status ?? "idle";
              return (
                <div
                  key={agent.id}
                  className="group"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{agent.avatar_emoji ?? "🤖"}</span>
                  <span style={{ ...mono, fontSize: "0.75rem", color: "var(--th-text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.name_ko ?? agent.name}
                  </span>
                  <span style={{ ...mono, fontSize: "0.65rem", color: STATUS_COLOR[statusKey] ?? "#6e7681", flexShrink: 0 }}>
                    {STATUS_ICON[statusKey] ?? "○"} {statusKey.toUpperCase()}
                  </span>
                  <button
                    onClick={() => void handleRemove(agent.id)}
                    className="opacity-0 group-hover:opacity-100"
                    title="Remove from team"
                    style={{
                      ...mono, fontSize: "0.7rem",
                      background: "none", border: "none",
                      color: "var(--th-text-muted)",
                      cursor: "pointer", flexShrink: 0,
                      transition: "opacity 0.1s",
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {/* 팀원 추가 버튼 */}
            <button
              onClick={() => setShowPicker((v) => !v)}
              style={{
                display: "block", width: "calc(100% - 24px)", margin: "4px 12px",
                ...mono, fontSize: "0.65rem",
                padding: "4px",
                border: "1px dashed var(--th-border)",
                background: "none",
                color: "var(--th-text-muted)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              + Add Agent to Team
            </button>
          </div>
        )}
      </div>

      {/* 에이전트 피커 */}
      {showPicker && (
        <div style={{ borderTop: "1px solid var(--th-border)", padding: "8px 12px" }}>
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search agents..."
            autoFocus
            style={{
              ...mono, fontSize: "0.7rem",
              width: "100%",
              padding: "4px 6px",
              background: "var(--th-bg-surface)",
              border: "1px solid var(--th-border)",
              color: "var(--th-text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ marginTop: 4, maxHeight: 120, overflowY: "auto" }}>
            {filteredAvailable.length === 0 ? (
              <p style={{ ...mono, fontSize: "0.65rem", color: "var(--th-text-muted)", padding: "4px 0" }}>
                {availableAgents.length === 0 ? "All agents are already in the team." : "No match."}
              </p>
            ) : (
              filteredAvailable.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => void handleAdd(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    width: "100%", padding: "4px 6px",
                    background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                >
                  <span>{agent.avatar_emoji ?? "🤖"}</span>
                  <span style={{ ...mono, fontSize: "0.7rem", color: "var(--th-text-primary)", flex: 1 }}>
                    {agent.name_ko ?? agent.name}
                  </span>
                  <span style={{ ...mono, fontSize: "0.65rem", color: "var(--th-text-muted)" }}>+</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
