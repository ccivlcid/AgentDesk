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
  const [helpOpen, setHelpOpen] = useState(false);

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
      className="border-b border-[var(--th-border)] flex flex-col bg-[var(--th-bg-surface)]"
      style={{ borderLeft: "3px solid var(--th-accent)", minHeight: 80 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--th-border)]">
        <div>
          <p className="text-[13px] font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>팀</p>
          <p className="text-[11px] text-[var(--th-text-muted)] mt-0.5">이 프로젝트를 담당하는 에이전트</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 도움말 버튼 */}
          <div className="relative">
            <button
              onClick={() => setHelpOpen((v) => !v)}
              className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold transition-colors"
              style={{
                border: `1px solid ${helpOpen ? "var(--th-accent)" : "var(--th-border)"}`,
                color: helpOpen ? "var(--th-accent)" : "var(--th-text-muted)",
                background: helpOpen ? "var(--th-accent-alpha, rgba(99,102,241,0.1))" : "transparent",
              }}
              title="사용 방법 보기"
            >
              ?
            </button>
            {helpOpen && (
              <div
                className="absolute right-0 top-7 z-50 rounded shadow-lg p-3 text-left"
                style={{
                  width: 220,
                  background: "var(--th-bg-elevated)",
                  border: "1px solid var(--th-border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                }}
              >
                <div className="text-[11px] leading-relaxed whitespace-pre-line" style={{ color: "var(--th-text-muted)" }}>
                  {"팀에 에이전트를 배정하면 이 프로젝트의 담당자를 명확히 할 수 있습니다.\n\n사용법:\n• + 버튼 → 에이전트 선택\n• 에이전트 이름 마우스 올리기 → × 클릭으로 제거"}
                </div>
                <button
                  onClick={() => setHelpOpen(false)}
                  className="mt-2 text-[10px] font-medium"
                  style={{ color: "var(--th-accent)" }}
                >
                  닫기
                </button>
              </div>
            )}
          </div>
          {/* 추가 버튼 */}
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--th-text-muted)] hover:bg-[var(--th-bg-elevated)] hover:text-[var(--th-text)] transition-colors text-base font-bold"
            title={showPicker ? "닫기" : "팀원 추가"}
          >
            {showPicker ? "×" : "+"}
          </button>
        </div>
      </div>

      {/* 팀원 목록 */}
      <div className="flex-1 px-3 py-2.5 overflow-y-auto" style={{ maxHeight: 200 }}>
        {loading ? (
          <p className="text-[11px] text-[var(--th-text-muted)]">로딩 중…</p>
        ) : teamAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-2 gap-1.5">
            <p className="text-[11px] text-[var(--th-text-muted)]">아직 배정된 에이전트가 없어요.</p>
            <button
              onClick={() => setShowPicker(true)}
              className="text-[11px] px-3 py-1 font-medium hover:opacity-90 transition-opacity"
              style={{ background: "var(--th-accent)", color: "#fff" }}
            >
              + 에이전트 배정하기
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {teamAgents.map((agent) => (
              <span
                key={agent.id}
                className="group inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-[var(--th-border)] bg-[var(--th-bg-elevated)] font-mono"
              >
                <span>{agent.avatar_emoji || "🤖"}</span>
                <span className="text-[var(--th-text)]">{agent.name_ko || agent.name}</span>
                <button
                  onClick={() => void handleRemove(agent.id)}
                  className="text-[var(--th-text-muted)] hover:text-red-400 transition-colors ml-0.5 opacity-0 group-hover:opacity-100"
                  title="팀에서 제거"
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
        <div className="border-t border-[var(--th-border)] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--th-text-muted)] mb-2">
            추가할 에이전트 선택
          </p>
          <div className="flex flex-wrap gap-1">
            {availableAgents.length === 0 ? (
              <p className="text-[11px] text-[var(--th-text-muted)] italic">모든 에이전트가 이미 팀에 있습니다</p>
            ) : (
              availableAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => void handleAdd(agent.id)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-[var(--th-border)] bg-[var(--th-bg-surface)] hover:border-[var(--th-accent)] hover:text-[var(--th-accent)] transition-colors font-mono"
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
