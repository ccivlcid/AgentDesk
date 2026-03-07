import type { Dispatch, SetStateAction } from "react";
import type { ProjectDetailResponse } from "../../api";
import type { Agent, Department, Project, AssignmentMode } from "../../types";
import AgentAvatar from "../AgentAvatar";
import type { ManualAssignmentWarning, ProjectI18nTranslate, ProjectManualSelectionStats } from "./types";

interface ManualAssignmentSelectorProps {
  t: ProjectI18nTranslate;
  language: string;
  isCreating: boolean;
  editingProjectId: string | null;
  assignmentMode: AssignmentMode;
  setAssignmentMode: Dispatch<SetStateAction<AssignmentMode>>;
  setManualAssignmentWarning: Dispatch<SetStateAction<ManualAssignmentWarning | null>>;
  manualSelectionStats: ProjectManualSelectionStats;
  selectedAgentIds: Set<string>;
  setSelectedAgentIds: Dispatch<SetStateAction<Set<string>>>;
  agentFilterDept: string;
  setAgentFilterDept: Dispatch<SetStateAction<string>>;
  departments: Department[];
  agents: Agent[];
  spriteMap: Map<string, number>;
  detail: ProjectDetailResponse | null;
  selectedProject: Project | null;
}

export default function ManualAssignmentSelector({
  t,
  language,
  isCreating,
  editingProjectId,
  assignmentMode,
  setAssignmentMode,
  setManualAssignmentWarning,
  manualSelectionStats,
  selectedAgentIds,
  setSelectedAgentIds,
  agentFilterDept,
  setAgentFilterDept,
  departments,
  agents,
  spriteMap,
  detail,
  selectedProject,
}: ManualAssignmentSelectorProps) {
  return (
    <>
      {(isCreating || !!editingProjectId) && (
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "직원 할당 방식", en: "Assignment Mode", ja: "割り当てモード", zh: "分配模式" })}
            </span>
            <div className="flex gap-1 p-0.5" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-elevated)" }}>
              <button
                type="button"
                onClick={() => {
                  setAssignmentMode("auto");
                  setManualAssignmentWarning(null);
                }}
                className="px-3 py-1 text-xs font-medium font-mono transition-all"
                style={{
                  borderRadius: "2px",
                  background: assignmentMode === "auto" ? "var(--th-accent)" : "transparent",
                  color: assignmentMode === "auto" ? "#000" : "var(--th-text-muted)",
                }}
              >
                {t({ ko: "자동 할당", en: "Auto", ja: "自動", zh: "自动" })}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignmentMode("manual");
                  setManualAssignmentWarning(null);
                }}
                className="px-3 py-1 text-xs font-medium font-mono transition-all"
                style={{
                  borderRadius: "2px",
                  background: assignmentMode === "manual" ? "#7c3aed" : "transparent",
                  color: assignmentMode === "manual" ? "#fff" : "var(--th-text-muted)",
                }}
              >
                {t({ ko: "직접 선택", en: "Manual", ja: "手動", zh: "手动" })}
              </button>
            </div>
          </div>

          {assignmentMode === "manual" && (
            <div className="space-y-2 p-3" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "참여 직원 선택", en: "Select Agents", ja: "エージェント選択", zh: "选择员工" })}
                  <span className="ml-2 font-medium" style={{ color: "var(--th-accent)" }}>
                    {selectedAgentIds.size}
                    {t({ ko: "명", en: " selected", ja: "人", zh: "人" })}
                  </span>
                </span>
                {departments.length > 0 && (
                  <select
                    value={agentFilterDept}
                    onChange={(e) => setAgentFilterDept(e.target.value)}
                    className="px-2 py-1 text-[11px] font-mono outline-none"
                    style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-input-bg)", color: "var(--th-text-secondary)" }}
                  >
                    <option value="all">{t({ ko: "전체 부서", en: "All Depts", ja: "全部署", zh: "所有部门" })}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.icon} {language === "ko" ? dept.name_ko || dept.name : dept.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 font-mono" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}>
                  {t({ ko: "총", en: "Total", ja: "合計", zh: "总计" })}: {manualSelectionStats.total}
                </span>
                <span className="px-2 py-0.5 font-mono text-amber-300" style={{ borderRadius: "2px", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)" }}>
                  {t({ ko: "팀장", en: "Leaders", ja: "リーダー", zh: "组长" })}: {manualSelectionStats.leaders}
                </span>
                <span className="px-2 py-0.5 font-mono text-emerald-300" style={{ borderRadius: "2px", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.1)" }}>
                  {t({ ko: "하위 직원", en: "Subordinates", ja: "サブ担当", zh: "下属成员" })}:{" "}
                  {manualSelectionStats.subordinates}
                </span>
              </div>
              {manualSelectionStats.subordinates === 0 && (
                <p className="text-[11px] text-amber-300">
                  {t({
                    ko: "하위 직원이 없으면 실행 시 팀장이 직접(단독) 수행할 수 있습니다.",
                    en: "Without subordinates, team leaders may execute tasks directly.",
                    ja: "サブ担当がいない場合、実行時にチームリーダーが直接対応する可能性があります。",
                    zh: "若无下属成员，运行时可能由组长直接执行。",
                  })}
                </p>
              )}
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {agents
                  .filter((agent) => agentFilterDept === "all" || agent.department_id === agentFilterDept)
                  .sort((a, b) => {
                    const roleOrder: Record<string, number> = {
                      team_leader: 0,
                      senior: 1,
                      junior: 2,
                      intern: 3,
                    };
                    return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || a.name.localeCompare(b.name);
                  })
                  .map((agent) => {
                    const checked = selectedAgentIds.has(agent.id);
                    const dept = departments.find((row) => row.id === agent.department_id);
                    return (
                      <label
                        key={agent.id}
                        className="flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-all"
                        style={{
                          borderRadius: "2px",
                          border: checked ? "1px solid var(--th-accent)" : "1px solid transparent",
                          background: checked ? "rgba(245,158,11,0.08)" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(selectedAgentIds);
                            if (checked) next.delete(agent.id);
                            else next.add(agent.id);
                            setSelectedAgentIds(next);
                            setManualAssignmentWarning(null);
                          }}
                          className="h-3.5 w-3.5"
                          style={{ borderRadius: "2px", accentColor: "var(--th-accent)" }}
                        />
                        <AgentAvatar agent={agent} spriteMap={spriteMap} size={24} />
                        <span className="text-xs font-medium font-mono" style={{ color: "var(--th-text-primary)" }}>
                          {language === "ko" ? agent.name_ko || agent.name : agent.name}
                        </span>
                        {dept && (
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-mono"
                            style={{ borderRadius: "2px", background: `${dept.color}22`, color: dept.color }}
                          >
                            {language === "ko" ? dept.name_ko || dept.name : dept.name}
                          </span>
                        )}
                        <span
                          className="ml-auto px-1.5 py-0.5 text-[10px] font-mono"
                          style={{ borderRadius: "2px", color: "var(--th-text-muted)", background: "rgba(255,255,255,0.05)" }}
                        >
                          {agent.role === "team_leader"
                            ? language === "ko"
                              ? "팀장"
                              : "Leader"
                            : agent.role === "senior"
                              ? language === "ko"
                                ? "시니어"
                                : "Senior"
                              : agent.role === "junior"
                                ? language === "ko"
                                  ? "주니어"
                                  : "Junior"
                                : agent.role === "intern"
                                  ? language === "ko"
                                    ? "인턴"
                                    : "Intern"
                                  : ""}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {!isCreating && !editingProjectId && selectedProject && selectedProject.assignment_mode === "manual" && (
        <div className="mt-2 px-3 py-2" style={{ borderRadius: "2px", border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium font-mono text-violet-400">
              {t({ ko: "직접 선택 모드", en: "Manual Assignment", ja: "手動割り当て", zh: "手动分配" })}
            </span>
            <span className="text-xs font-mono" style={{ color: "var(--th-text-muted)" }}>
              {detail?.assigned_agents?.length ?? 0}
              {t({ ko: "명 지정", en: " agents", ja: "人", zh: "人" })}
            </span>
          </div>
          {detail?.assigned_agents && detail.assigned_agents.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {detail.assigned_agents.map((agent: Agent) => (
                <span
                  key={agent.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono"
                  style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
                >
                  <AgentAvatar agent={agent} spriteMap={spriteMap} size={16} />
                  {language === "ko" ? agent.name_ko || agent.name : agent.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
