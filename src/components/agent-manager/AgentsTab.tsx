import type { Agent, Department, Persona } from "../../types";
import { localeName } from "../../i18n";
import type { Translator } from "./types";
import PersonaBadge from "../persona/PersonaBadge";

interface AgentsTabProps {
  tr: Translator;
  locale: string;
  isKo: boolean;
  agents: Agent[];
  departments: Department[];
  personas?: Persona[];
  personasLoading?: boolean;
  projectAgentIds?: Set<string>;
  deptTab: string;
  setDeptTab: (deptId: string) => void;
  sortedAgents: Agent[];
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onEditAgent: (agent: Agent) => void;
  onEditDepartment: (department: Department) => void;
  onDeleteAgent: (agentId: string) => void;
  saving: boolean;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "working") {
    return (
      <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-success)" }}>● RUNNING</span>
    );
  }
  if (status === "offline") {
    return (
      <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-text-muted)", opacity: 0.5 }}>● OFFLINE</span>
    );
  }
  return (
    <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-text-muted)" }}>○ IDLE</span>
  );
}

export default function AgentsTab({
  tr,
  locale,
  agents,
  departments,
  personas = [],
  personasLoading = false,
  projectAgentIds,
  deptTab,
  setDeptTab,
  sortedAgents,
  confirmDeleteId,
  setConfirmDeleteId,
  onEditAgent,
  onEditDepartment,
  onDeleteAgent,
  saving,
}: AgentsTabProps) {
  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const workingCount = agents.filter((a) => a.status === "working").length;

  // Group sortedAgents by dept for list view
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const grouped: Array<{ dept: Department | null; agents: Agent[] }> = [];

  if (deptTab === "all") {
    // Group by department in dept order
    const seen = new Set<string | null>();
    // first pass: in dept order
    for (const dept of departments) {
      const deptAgents = sortedAgents.filter((a) => a.department_id === dept.id);
      if (deptAgents.length > 0) {
        grouped.push({ dept, agents: deptAgents });
        seen.add(dept.id);
      }
    }
    // unassigned
    const unassigned = sortedAgents.filter((a) => !a.department_id || !deptMap.has(a.department_id));
    if (unassigned.length > 0) {
      grouped.push({ dept: null, agents: unassigned });
    }
  } else {
    const dept = deptMap.get(deptTab) ?? null;
    grouped.push({ dept, agents: sortedAgents });
  }

  return (
    <>
      {/* Dept tab bar + inline stat */}
      <div className="flex items-center gap-0 flex-wrap" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <div className="flex items-center gap-3 px-3 py-2 mr-2" style={{ borderRight: "1px solid var(--th-border)" }}>
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", color: "var(--th-text-muted)" }}>
            {agents.length} total · {workingCount} running
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDeptTab("all")}
          className="flex items-center gap-1 px-3 py-2 border-b-2 transition-colors"
          style={{
            fontFamily: "var(--th-font-mono)",
            borderRadius: "6px 6px 0 0",
            fontSize: "0.75rem",
            color: deptTab === "all" ? "var(--th-text-primary)" : "var(--th-text-muted)",
            borderColor: deptTab === "all" ? "var(--th-accent)" : "transparent",
            transition: "color 0.1s linear, border-color 0.1s linear",
          }}
        >
          ALL
        </button>
        {departments.map((department) => {
          const isActive = deptTab === department.id;
          return (
            <button
              key={department.id}
              type="button"
              onClick={() => setDeptTab(department.id)}
              onDoubleClick={(e) => { e.preventDefault(); onEditDepartment(department); }}
              title={tr("더블클릭: 전문 분야 편집", "Double-click: edit specialty")}
              className="flex items-center gap-1 px-3 py-2 border-b-2 transition-colors"
              style={{
                fontFamily: "var(--th-font-mono)",
                fontSize: "0.75rem",
                color: isActive ? "var(--th-text-primary)" : "var(--th-text-muted)",
                borderColor: isActive ? "var(--th-accent)" : "transparent",
                transition: "color 0.1s linear, border-color 0.1s linear",
                borderRadius: "6px 6px 0 0",
              }}
            >
              <span className="hidden sm:inline">{localeName(locale, department)}</span>
            </button>
          );
        })}
      </div>

      {/* Agent list — dept-grouped */}
      {sortedAgents.length === 0 ? (
        <div className="terminal-empty-state py-16">
          <p className="terminal-empty-state-cmd">$ ls agents/</p>
          <p className="terminal-empty-state-result">(empty)</p>
          <p className="terminal-empty-state-hint">{tr("검색 결과 없음", "No agents found")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ dept, agents: groupAgents }) => (
            <div key={dept?.id ?? "__none"}>
              {/* Dept header */}
              <div
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
                style={{ borderBottom: "1px solid var(--th-border)", borderLeft: "2px solid var(--th-border)" }}
                onDoubleClick={() => dept && onEditDepartment(dept)}
                title={dept ? tr("더블클릭: 전문 분야 편집", "Double-click: edit specialty") : undefined}
              >
                <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
                  {dept ? localeName(locale, dept) : tr("미배정", "Unassigned", "未割当", "未分配")}
                </span>
                <span
                  className="px-1.5 py-0.5"
                  style={{ fontFamily: "var(--th-font-mono)", fontSize: "10px", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", borderRadius: 6 }}
                >
                  {groupAgents.length}
                </span>
              </div>

              {/* Agent rows */}
              <div>
                {groupAgents.map((agent) => {
                  const isWorking = agent.status === "working";
                  const isTeamMember = projectAgentIds !== undefined && projectAgentIds.has(agent.id);
                  const agentName = localeName(locale, agent);
                  const isConfirmingDelete = confirmDeleteId === agent.id;

                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-2 px-3 py-2 group transition-colors"
                      style={{
                        borderBottom: "1px solid var(--th-border)",
                        borderLeft: isWorking ? "3px solid #22c55e" : "3px solid transparent",
                        background: "var(--th-bg-surface)",
                      }}
                    >
                      <span className="text-base shrink-0">{agent.avatar_emoji || "🤖"}</span>
                      <span className="font-mono text-sm font-medium min-w-0 truncate" style={{ color: "var(--th-text-primary)", flex: "0 0 auto", maxWidth: "8rem" }}>
                        {agentName}
                      </span>
                      {agent.role && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono uppercase" style={{ background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", borderRadius: 8 }}>
                          {agent.role.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                      {isTeamMember && (
                        <span className="shrink-0 px-1 py-0.5 text-[10px] font-mono" style={{ background: "var(--th-accent-bg)", border: "1px solid var(--th-accent-focus)", color: "var(--th-accent)", borderRadius: 8 }}>
                          TEAM
                        </span>
                      )}
                      {agent.persona_id && (personasLoading
                        ? <span style={{ width: 40, height: 16, background: "var(--th-bg-primary)", borderRadius: 8, display: "inline-block" }} />
                        : personaMap.has(agent.persona_id) && <PersonaBadge persona={personaMap.get(agent.persona_id)!} size="sm" />
                      )}
                      <span className="flex-1" />
                      {agent.cli_provider && (
                        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono hidden sm:inline" style={{ color: "var(--th-text-muted)", opacity: 0.7 }}>
                          {agent.cli_provider}
                        </span>
                      )}
                      <StatusBadge status={agent.status ?? "idle"} />
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onEditAgent(agent)}
                          className="px-2 py-1 text-[10px] font-mono transition"
                          style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-secondary)" }}
                        >
                          {tr("편집", "edit")}
                        </button>
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { onDeleteAgent(agent.id); setConfirmDeleteId(null); }}
                              disabled={saving}
                              className="px-2 py-1 text-[10px] font-mono"
                              style={{ borderRadius: 8, border: "1px solid rgba(244,63,94,0.5)", background: "rgba(244,63,94,0.1)", color: "#fb7185" }}
                            >
                              {tr("확인", "confirm")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-[10px] font-mono"
                              style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
                            >
                              {tr("취소", "cancel")}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(agent.id)}
                            className="px-2 py-1 text-[10px] font-mono transition"
                            style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
