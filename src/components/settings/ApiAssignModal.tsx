import AgentAvatar, { buildSpriteMap } from "../AgentAvatar";
import type { Agent } from "../../types";
import type { ApiStateBundle, TFunction } from "./types";

interface ApiAssignModalProps {
  t: TFunction;
  localeTag: string;
  apiState: ApiStateBundle;
}

export default function ApiAssignModal({ t, localeTag, apiState }: ApiAssignModalProps) {
  const { apiAssignTarget, apiAssigning, apiAssignAgents, apiAssignDepts, setApiAssignTarget, handleApiAssignToAgent } =
    apiState;

  if (!apiAssignTarget) return null;

  const spriteMap = buildSpriteMap(apiAssignAgents);
  const localName = (nameEn: string, nameKo: string) => (localeTag === "ko" ? nameKo || nameEn : nameEn || nameKo);
  const ROLE_LABELS: Record<string, Record<string, string>> = {
    team_leader: { ko: "팀장", en: "Team Leader", ja: "チームリーダー", zh: "组长" },
    senior: { ko: "시니어", en: "Senior", ja: "シニア", zh: "高级" },
    junior: { ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" },
    intern: { ko: "인턴", en: "Intern", ja: "インターン", zh: "实习生" },
  };

  const roleBadge = (role: string) => {
    const label = ROLE_LABELS[role];
    const text = label ? t(label as Record<"ko" | "en" | "ja" | "zh", string>) : role;
    const colorStyle =
      role === "team_leader"
        ? { color: "var(--th-accent)", background: "rgba(251,191,36,0.15)" }
        : role === "senior"
          ? { color: "rgb(196,181,253)", background: "rgba(167,139,250,0.1)" }
          : role === "junior"
            ? { color: "rgb(167,243,208)", background: "rgba(52,211,153,0.15)" }
            : { color: "var(--th-text-muted)", background: "var(--th-bg-elevated)" };
    return <span className="text-[9px] px-1.5 py-0.5 font-medium font-mono" style={{ borderRadius: "2px", ...colorStyle }}>{text}</span>;
  };

  const grouped = apiAssignDepts
    .map((dept) => ({
      dept,
      agents: apiAssignAgents.filter((agent) => agent.department_id === dept.id),
    }))
    .filter((group) => group.agents.length > 0);

  const deptIds = new Set(apiAssignDepts.map((dept) => dept.id));
  const unassigned = apiAssignAgents.filter((agent) => !agent.department_id || !deptIds.has(agent.department_id));

  const renderAgentRow = (agent: Agent) => {
    const isAssigned =
      agent.cli_provider === "api" &&
      agent.api_provider_id === apiAssignTarget.providerId &&
      agent.api_model === apiAssignTarget.model;

    return (
      <button
        key={agent.id}
        disabled={apiAssigning || isAssigned}
        onClick={() => void handleApiAssignToAgent(agent.id)}
        className="w-full text-left px-2 py-1.5 text-xs font-mono transition flex items-center gap-2.5 disabled:opacity-60"
        style={{ borderRadius: "2px", ...(isAssigned ? { background: "rgba(52,211,153,0.1)", color: "rgb(167,243,208)", cursor: "default" } : { color: "var(--th-text-primary)" }) }}
      >
        <AgentAvatar agent={agent} spriteMap={spriteMap} size={28} rounded="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{localName(agent.name, agent.name_ko)}</span>
            {roleBadge(agent.role)}
          </div>
          <div className="text-[10px] truncate mt-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
            {agent.cli_provider === "api" && agent.api_model ? `API: ${agent.api_model}` : agent.cli_provider}
          </div>
        </div>
        {isAssigned && <span className="text-green-400 flex-shrink-0">✓</span>}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "var(--th-modal-overlay)" }}
      onClick={() => setApiAssignTarget(null)}
    >
      <div
        className="w-96 max-h-[75vh] shadow-2xl overflow-hidden"
        style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--th-border)" }}>
          <h4 className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {t({
              ko: "에이전트에 모델 배정",
              en: "Assign Model to Agent",
              ja: "エージェントにモデル割当",
              zh: "分配模型给代理",
            })}
          </h4>
          <p className="text-[11px] mt-0.5 font-mono truncate" style={{ color: "var(--th-text-muted)" }}>{apiAssignTarget.model}</p>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2 space-y-3">
          {apiAssignAgents.length === 0 ? (
            <p className="text-xs text-center py-4 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {t({
                ko: "에이전트를 불러오는 중...",
                en: "Loading agents...",
                ja: "エージェント読み込み中...",
                zh: "正在加载代理...",
              })}
            </p>
          ) : (
            <>
              {grouped.map(({ dept, agents }) => (
                <div key={dept.id}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: "1px solid var(--th-border)" }}>
                    <span className="text-sm">{dept.icon}</span>
                    <span className="text-[11px] font-semibold font-mono tracking-wide" style={{ color: "var(--th-text-secondary)" }}>
                      {localName(dept.name, dept.name_ko)}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>({agents.length})</span>
                  </div>
                  {agents.map(renderAgentRow)}
                </div>
              ))}
              {unassigned.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderBottom: "1px solid var(--th-border)" }}>
                    <span className="text-sm">📁</span>
                    <span className="text-[11px] font-semibold font-mono tracking-wide" style={{ color: "var(--th-text-muted)" }}>
                      {t({ ko: "미배정", en: "Unassigned", ja: "未配属", zh: "未分配" })}
                    </span>
                  </div>
                  {unassigned.map(renderAgentRow)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: "1px solid var(--th-border)" }}>
          <button
            onClick={() => setApiAssignTarget(null)}
            className="text-xs px-3 py-1.5 font-mono transition-colors"
            style={{ borderRadius: "2px", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
          >
            {t({ ko: "닫기", en: "Close", ja: "閉じる", zh: "关闭" })}
          </button>
        </div>
      </div>
    </div>
  );
}
