import { useCallback, useEffect, useState } from "react";
import type { Agent } from "../../types";
import { fetchProjectAgents, addProjectAgent, removeProjectAgent } from "../../api/categories-dashboard";

interface TeamPanelProps {
  projectId: string;
  allAgents: Agent[];
}

export default function TeamPanel({ projectId, allAgents }: TeamPanelProps) {
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

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

  const handleAdd = async (agentId: string) => {
    try {
      await addProjectAgent(projectId, agentId);
      setTeamAgentIds((prev) => new Set([...prev, agentId]));
    } catch {}
    setShowPicker(false);
  };

  const handleRemove = async (agentId: string) => {
    try {
      await removeProjectAgent(projectId, agentId);
      setTeamAgentIds((prev) => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    } catch {}
  };

  return (
    <div
      className="border border-[var(--th-border)] rounded flex flex-col"
      style={{ borderLeft: "3px solid var(--th-accent)", minHeight: 80 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--th-border)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--th-text-muted)] font-mono">팀</p>
          <p className="text-[9px] text-[var(--th-text-muted)]">프로젝트 담당 멤버</p>
        </div>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--th-text-muted)] hover:bg-[var(--th-bg-elevated)] hover:text-[var(--th-text)] transition-colors text-sm font-bold"
          title="팀원 추가"
        >
          {showPicker ? "×" : "+"}
        </button>
      </div>

      {/* 팀원 목록 */}
      <div className="flex-1 px-3 py-2 overflow-y-auto" style={{ maxHeight: 160 }}>
        {loading ? (
          <p className="text-[10px] text-[var(--th-text-muted)]">로딩 중…</p>
        ) : teamAgents.length === 0 ? (
          <p className="text-[10px] text-[var(--th-text-muted)] italic">팀원 없음 — + 버튼으로 추가하세요</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {teamAgents.map((agent) => (
              <span
                key={agent.id}
                className="group inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[var(--th-border)] bg-[var(--th-bg-surface)] font-mono"
              >
                <span>{agent.avatar_emoji || "🤖"}</span>
                <span className="text-[var(--th-text)]">{agent.name_ko || agent.name}</span>
                <button
                  onClick={() => handleRemove(agent.id)}
                  className="text-[var(--th-text-muted)] hover:text-red-400 transition-colors ml-0.5 opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 팀원 추가 피커 */}
      {showPicker && (
        <div className="border-t border-[var(--th-border)] px-3 py-2">
          <p className="text-[9px] text-[var(--th-text-muted)] mb-2">추가할 멤버 선택</p>
          <div className="flex flex-wrap gap-1">
            {availableAgents.length === 0 ? (
              <p className="text-[9px] text-[var(--th-text-muted)] italic">모든 직원이 팀에 포함됐습니다</p>
            ) : (
              availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleAdd(agent.id)}
                  className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-[var(--th-border)] bg-[var(--th-bg-surface)] hover:border-[var(--th-accent)] hover:text-[var(--th-accent)] transition-colors font-mono"
                >
                  {agent.avatar_emoji || "🤖"} {agent.name_ko || agent.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
