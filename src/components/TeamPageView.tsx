import { useCallback, useEffect, useState } from "react";
import type { Agent, Department, Project } from "../types";
import AgentManager from "./AgentManager";
import { fetchProjectAgents, addProjectAgent, removeProjectAgent } from "../api/categories-dashboard";
import AgentAvatar from "./AgentAvatar";

interface TeamPageViewProps {
  agents: Agent[];
  departments: Department[];
  onAgentsChange: () => void;
  projectAgentIds?: Set<string>;
  currentProject?: Project | null;
}

const STATUS_CONFIG: Record<Agent["status"], { label: string; color: string; dot: string }> = {
  working: { label: "실행 중", color: "#f59e0b", dot: "●" },
  idle:    { label: "대기 중", color: "#6b7280", dot: "○" },
  break:   { label: "휴식 중", color: "#8b5cf6", dot: "◐" },
  offline: { label: "오프라인", color: "#374151", dot: "○" },
};

export default function TeamPageView({
  agents,
  departments,
  onAgentsChange,
  projectAgentIds,
  currentProject,
}: TeamPageViewProps) {
  const [topTab, setTopTab] = useState<"project" | "org">(
    currentProject ? "project" : "org",
  );

  // 프로젝트가 바뀌면 "이 프로젝트 팀" 탭으로 이동
  useEffect(() => {
    if (currentProject) setTopTab("project");
    else setTopTab("org");
  }, [currentProject?.id]);

  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!currentProject) return;
    setLoadingTeam(true);
    try {
      const res = await fetchProjectAgents(currentProject.id);
      setTeamAgentIds(new Set(res.map((a) => a.id)));
    } finally {
      setLoadingTeam(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    if (topTab === "project" && currentProject) {
      void loadTeam();
    }
  }, [topTab, loadTeam, currentProject]);

  const handleAdd = async (agentId: string) => {
    if (!currentProject) return;
    await addProjectAgent(currentProject.id, agentId);
    setTeamAgentIds((prev) => new Set([...prev, agentId]));
    setShowPicker(false);
  };

  const handleRemove = async (agentId: string) => {
    if (!currentProject) return;
    await removeProjectAgent(currentProject.id, agentId);
    setTeamAgentIds((prev) => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  };

  // 프로젝트 없으면 바로 전체 조직 뷰
  if (!currentProject) {
    return (
      <AgentManager
        agents={agents}
        departments={departments}
        onAgentsChange={onAgentsChange}
        projectAgentIds={projectAgentIds}
      />
    );
  }

  const teamAgents = agents.filter((a) => teamAgentIds.has(a.id));
  const availableAgents = agents.filter(
    (a) => !teamAgentIds.has(a.id) && a.status !== "offline",
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* 최상위 탭 */}
      <div
        className="flex"
        style={{
          background: "var(--th-bg-surface)",
          border: "1px solid var(--th-border)",
          borderRadius: 2,
        }}
      >
        {[
          { key: "project" as const, label: "이 프로젝트 팀" },
          { key: "org" as const, label: "전체 조직" },
        ].map((tab, idx) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTopTab(tab.key)}
            className="flex-1 flex items-center justify-center px-4 py-2 text-xs font-mono font-bold uppercase transition-colors"
            style={{
              color: topTab === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              background: "transparent",
              borderBottom: topTab === tab.key ? "2px solid var(--th-accent)" : "2px solid transparent",
              borderRight: idx === 0 ? "1px solid var(--th-border)" : "none",
              letterSpacing: "0.08em",
            }}
          >
            {tab.label}
            {tab.key === "project" && teamAgents.length > 0 && (
              <span
                className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-normal"
                style={{ background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
              >
                {teamAgents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 이 프로젝트 팀 탭 */}
      {topTab === "project" && (
        <div className="space-y-3">
          {/* 헤더 */}
          <div
            className="flex items-center justify-between"
            style={{ borderLeft: "3px solid var(--th-accent)", paddingLeft: "0.75rem" }}
          >
            <div>
              <h1
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}
              >
                {currentProject.name} 팀
              </h1>
              <p className="text-[11px] text-[var(--th-text-muted)] mt-0.5">
                이 프로젝트에 배정된 에이전트
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="px-3 py-1.5 text-xs font-mono uppercase transition-colors hover:opacity-90"
              style={{
                borderRadius: 2,
                border: "1px solid var(--th-border)",
                color: "var(--th-text-heading)",
                background: "var(--th-bg-surface)",
              }}
            >
              {showPicker ? "✕ 닫기" : "+ 팀원 추가"}
            </button>
          </div>

          {/* 팀원 추가 피커 */}
          {showPicker && availableAgents.length > 0 && (
            <div
              className="p-3 rounded space-y-2"
              style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}
            >
              <p className="text-[11px] text-[var(--th-text-muted)]">추가할 에이전트 선택</p>
              <div className="flex flex-wrap gap-1.5">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => void handleAdd(agent.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded transition-colors hover:opacity-90"
                    style={{
                      border: "1px solid var(--th-border)",
                      background: "var(--th-bg-elevated)",
                      color: "var(--th-text)",
                    }}
                  >
                    <span>{agent.avatar_emoji || "🤖"}</span>
                    <span>{agent.name_ko || agent.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 팀원 목록 */}
          {loadingTeam ? (
            <div className="text-[11px] text-[var(--th-text-muted)] py-4 text-center">로딩 중…</div>
          ) : teamAgents.length === 0 ? (
            <div
              className="text-center py-10 rounded"
              style={{ border: "1px dashed var(--th-border)" }}
            >
              <p className="text-sm text-[var(--th-text-muted)] mb-1">아직 팀원이 없어요.</p>
              <p className="text-[11px] text-[var(--th-text-muted)]">
                + 팀원 추가 버튼으로 에이전트를 배정해보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamAgents.map((agent) => {
                const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;
                return (
                  <div
                    key={agent.id}
                    className="group rounded p-3 flex items-start gap-3"
                    style={{
                      background: "var(--th-bg-surface)",
                      border: "1px solid var(--th-border)",
                    }}
                  >
                    {/* 아바타 */}
                    <div className="flex-shrink-0">
                      <AgentAvatar agent={agent} size={36} />
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-semibold text-[var(--th-text)]">
                          {agent.name_ko || agent.name}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                          style={{
                            background: `${statusCfg.color}22`,
                            color: statusCfg.color,
                          }}
                        >
                          {statusCfg.dot} {statusCfg.label}
                        </span>
                      </div>

                      {/* 역할 */}
                      <p className="text-[11px] text-[var(--th-text-muted)] mt-0.5">
                        {agent.role === "team_leader" ? "팀 리더" :
                         agent.role === "senior" ? "시니어" :
                         agent.role === "junior" ? "주니어" : "인턴"}
                        {agent.personality && (
                          <span className="ml-1.5 text-[var(--th-text-muted)]">
                            · {agent.personality.slice(0, 30)}{agent.personality.length > 30 ? "…" : ""}
                          </span>
                        )}
                      </p>

                      {/* 현재 태스크 */}
                      {agent.status === "working" && agent.current_task_id && (
                        <p className="text-[10px] mt-1" style={{ color: "#f59e0b" }}>
                          ▶ 태스크 실행 중
                        </p>
                      )}
                    </div>

                    {/* 제거 버튼 */}
                    <button
                      type="button"
                      onClick={() => void handleRemove(agent.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded transition-opacity"
                      style={{
                        border: "1px solid var(--th-border)",
                        color: "var(--th-text-muted)",
                      }}
                    >
                      제거
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 전체 조직 탭 */}
      {topTab === "org" && (
        <AgentManager
          agents={agents}
          departments={departments}
          onAgentsChange={onAgentsChange}
          projectAgentIds={projectAgentIds}
        />
      )}
    </div>
  );
}
