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

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const STATUS_DOT: Record<Agent["status"], { svgPath: string; color: string; label: string; filled?: boolean }> = {
  working: { svgPath: "M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0", color: "#f59e0b", label: "WORKING", filled: true },
  idle:    { svgPath: "M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0", color: "#4ade80", label: "IDLE" },
  break:   { svgPath: "M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0", color: "#8b5cf6", label: "BREAK" },
  offline: { svgPath: "M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0", color: "#374151", label: "OFFLINE" },
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

  useEffect(() => {
    if (currentProject) setTopTab("project");
    else setTopTab("org");
  }, [currentProject]);

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
  }, [currentProject]);

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

  if (!currentProject) {
    return (
      <div className="flex-1 min-h-0 flex flex-col w-full">
        <AgentManager
          agents={agents}
          departments={departments}
          onAgentsChange={onAgentsChange}
          projectAgentIds={projectAgentIds}
        />
      </div>
    );
  }

  const teamAgents = agents.filter((a) => teamAgentIds.has(a.id));
  const availableAgents = agents.filter(
    (a) => !teamAgentIds.has(a.id) && a.status !== "offline",
  );

  const TABS = [
    { key: "project" as const, label: "THIS PROJECT TEAM", count: teamAgents.length },
    { key: "org" as const, label: "ALL AGENTS", count: agents.length },
  ];

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{
        ...mono,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* ── 터미널 헤더 (macOS) ── */}
      <div
        style={{
          borderBottom: "1px solid var(--th-border)",
          padding: "12px 18px",
          background: "var(--th-bg-panel)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderTopLeftRadius: 10,
          borderTopRightRadius: 10,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "11px" }}>$</span>
        <span style={{ fontSize: "11px", color: "var(--th-text-muted)" }}>
          ls team/ --project=&quot;{currentProject.name}&quot;
        </span>
        <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
          {teamAgents.length} members
        </span>
      </div>

      {/* ── 탭 바 ── */}
      <div style={{ borderBottom: "1px solid var(--th-border)", display: "flex", background: "var(--th-bg-primary)", padding: "6px 12px 0" }}>
        {TABS.map((tab, idx) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTopTab(tab.key)}
            style={{
              ...mono,
              flex: 1,
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              padding: "8px 16px",
              border: "none",
              borderRight: idx === 0 ? "1px solid var(--th-border)" : "none",
              borderBottom: topTab === tab.key ? "2px solid var(--th-accent)" : "2px solid transparent",
              background: topTab === tab.key ? "var(--th-bg-elevated)" : "transparent",
              color: topTab === tab.key ? "var(--th-accent)" : "var(--th-text-muted)",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0",
            }}
          >
            {tab.label}
            <span style={{ marginLeft: 6, opacity: 0.6 }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ── 이 프로젝트 팀 (스크롤 영역) ── */}
      {topTab === "project" && (
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          {/* 액션 바 */}
          <div style={{ borderBottom: "1px solid var(--th-border)", padding: "5px 12px", background: "var(--th-bg-primary)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.6 }}>
              {loadingTeam ? "loading…" : `${teamAgents.length} assigned`}
            </span>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              style={{
                ...mono,
                marginLeft: "auto",
                fontSize: "9px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 6,
                border: `1px solid ${showPicker ? "rgba(245,158,11,0.5)" : "var(--th-border)"}`,
                background: showPicker ? "rgba(245,158,11,0.08)" : "transparent",
                color: showPicker ? "var(--th-accent)" : "var(--th-text-muted)",
                cursor: "pointer",
                letterSpacing: "0.05em",
              }}
            >
              {showPicker ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>CLOSE</> : "+ ADD MEMBER"}
            </button>
          </div>

          {/* 팀원 추가 피커 */}
          {showPicker && (
            <div style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", padding: "10px 14px" }}>
              <div style={{ fontSize: "9px", color: "var(--th-text-muted)", marginBottom: 8, opacity: 0.7 }}>
                $ select agent --add-to-project
              </div>
              {availableAgents.length === 0 ? (
                <div style={{ fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.4 }}>— no available agents —</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {availableAgents.map((agent) => {
                    const st = STATUS_DOT[agent.status] ?? STATUS_DOT.idle;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => void handleAdd(agent.id)}
                        style={{
                          ...mono,
                          fontSize: "9px",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--th-border)",
                          background: "var(--th-bg-primary)",
                          color: "var(--th-text-secondary)",
                          cursor: "pointer",
                          letterSpacing: "0.04em",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)"; e.currentTarget.style.color = "var(--th-accent)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; e.currentTarget.style.color = "var(--th-text-secondary)"; }}
                      >
                        <span style={{ color: st.color, fontSize: "8px" }}><svg width="8" height="8" viewBox="0 0 24 24" fill={st.filled ? st.color : "none"} stroke={st.color} strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg></span>
                        {agent.name_ko || agent.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 컬럼 헤더 */}
          {!loadingTeam && teamAgents.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", padding: "4px 14px", background: "var(--th-bg-primary)", borderBottom: "1px solid var(--th-border)", gap: 8 }}>
              <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 70, flexShrink: 0 }}>STATUS</span>
              <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", flex: 1 }}>NAME</span>
              <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", width: 100, flexShrink: 0 }}>ROLE</span>
            </div>
          )}

          {/* 팀원 목록 (스크롤) */}
          {loadingTeam ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 48, borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-surface)", opacity: 0.4, borderLeft: "3px solid var(--th-border)" }} />
              ))}
            </div>
          ) : teamAgents.length === 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--th-text-muted)" }}>$ ls team/</div>
              <div style={{ fontSize: "11px", color: "var(--th-text-muted)", opacity: 0.4, marginTop: 6 }}>(empty)</div>
              <div style={{ fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.3, marginTop: 4 }}>use [+ ADD MEMBER] to assign agents</div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {teamAgents.map((agent) => {
                const st = STATUS_DOT[agent.status] ?? STATUS_DOT.idle;
                const roleLabel =
                  agent.role === "team_leader" ? "LEADER" :
                  agent.role === "senior" ? "SENIOR" :
                  agent.role === "junior" ? "JUNIOR" : "INTERN";
                return (
                  <div
                    key={agent.id}
                    className="group"
                    style={{
                      ...mono,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderBottom: "1px solid var(--th-border)",
                      borderLeft: `3px solid ${st.color}`,
                      padding: "10px 14px",
                      background: "var(--th-bg-primary)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--th-bg-primary)"; }}
                  >
                    {/* 아바타 */}
                    <AgentAvatar agent={agent} size={22} />

                    {/* 상태 */}
                    <span style={{ fontSize: "8px", fontWeight: 700, width: 58, flexShrink: 0, color: st.color, letterSpacing: "0.06em" }}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill={st.filled ? st.color : "none"} stroke={st.color} strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg> {st.label}
                    </span>

                    {/* 이름 */}
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--th-text-primary)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name_ko || agent.name}
                    </span>

                    {/* 역할 */}
                    <span style={{ fontSize: "8px", color: "var(--th-text-muted)", width: 100, flexShrink: 0 }}>
                      {roleLabel}
                      {agent.status === "working" && (
                        <span style={{ marginLeft: 6, color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: 3 }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg> running</span>
                      )}
                    </span>

                    {/* 제거 버튼 */}
                    <button
                      type="button"
                      onClick={() => void handleRemove(agent.id)}
                      className="opacity-0 group-hover:opacity-100"
                      style={{
                        ...mono,
                        fontSize: "9px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: "1px solid var(--th-border)",
                        background: "none",
                        color: "var(--th-text-muted)",
                        cursor: "pointer",
                        letterSpacing: "0.04em",
                        transition: "opacity 0.1s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.4)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; e.currentTarget.style.borderColor = "var(--th-border)"; }}
                    >
                      REMOVE
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 푸터 */}
          <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--th-border)", padding: "5px 16px", background: "var(--th-bg-primary)" }}>
            <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.4 }}>
              $ {teamAgents.length} members · {availableAgents.length} available
            </span>
          </div>
        </div>
      )}

      {/* ── 전체 조직 탭 (스크롤은 AgentManager 내부) ── */}
      {topTab === "org" && (
        <div className="min-h-0 flex-1 flex flex-col">
          <AgentManager
            agents={agents}
            departments={departments}
            onAgentsChange={onAgentsChange}
            projectAgentIds={projectAgentIds}
          />
        </div>
      )}
    </div>
  );
}
