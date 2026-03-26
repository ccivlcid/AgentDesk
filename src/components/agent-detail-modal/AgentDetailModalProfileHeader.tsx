import type { I18nContextValue } from "../../i18n";
import { localeName } from "../../i18n";
import type { Agent, Department } from "../../types";
import AgentAvatar from "../AgentAvatar";
import { roleLabel, statusLabel } from "../agent-detail/constants";
import { AgentDetailCliControls } from "./AgentDetailCliControls";
import type { UseAgentDetailCliStateResult } from "./useAgentDetailCliState";

interface AgentDetailModalProfileHeaderProps {
  onClose: () => void;
  agent: Agent;
  agents: Agent[];
  department: Department | undefined;
  language: string;
  t: I18nContextValue["t"];
  statusCfg: { label: string; color: string; bg: string };
  actsAsPlanningLead: boolean;
  savingPlanningLead: boolean;
  onPlanningLeadChange: (checked: boolean) => void;
  cli: UseAgentDetailCliStateResult;
}

export function AgentDetailModalProfileHeader({
  onClose,
  agent,
  agents,
  department,
  language,
  t,
  statusCfg,
  actsAsPlanningLead,
  savingPlanningLead,
  onPlanningLeadChange,
  cli,
}: AgentDetailModalProfileHeaderProps) {
  return (
    <div
      className="relative px-6 py-5"
      style={{
        borderBottom: "1px solid var(--th-border)",
        background: department ? `linear-gradient(135deg, ${department.color}22, transparent)` : undefined,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center transition-colors"
        style={{
          border: "1px solid var(--th-border)",
          background: "var(--th-bg-surface)",
          color: "var(--th-text-muted)",
          borderRadius: 8,
          fontFamily: "var(--th-font-mono)",
          fontSize: "0.75rem",
        }}
      >
        ✕
      </button>

      <div className="flex items-center gap-4">
        <div className="relative">
          <AgentAvatar
            agent={agent}
            agents={agents}
            size={64}
            rounded="2xl"
            className={agent.status === "working" ? "animate-agent-work" : ""}
          />
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${
              agent.status === "working"
                ? "bg-[#3b82f6]"
                : agent.status === "idle"
                  ? "bg-green-500"
                  : agent.status === "break"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
            }`}
            style={{ border: "2px solid var(--th-bg-primary)" }}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2
              className="text-base font-bold"
              style={{ fontFamily: "var(--th-font-mono)", color: "var(--th-text-primary)" }}
            >
              {localeName(language, agent)}
            </h2>
            <span
              className={`text-xs px-1.5 py-0.5 font-mono ${statusCfg.bg} ${statusCfg.color}`}
              style={{ borderRadius: 8 }}
            >
              {statusLabel(statusCfg.label, t)}
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: "var(--th-text-secondary)" }}>
            {department?.icon} {department ? localeName(language, department) : ""} ·{" "}
            {roleLabel(agent.role, t)}
          </div>
          {agent.role === "team_leader" && (
            <label
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono"
              style={{ color: "var(--th-text-secondary)" }}
            >
              <input
                type="checkbox"
                checked={actsAsPlanningLead}
                disabled={savingPlanningLead}
                onChange={(event) => {
                  void onPlanningLeadChange(event.target.checked);
                }}
                className="h-3.5 w-3.5 disabled:opacity-60"
                style={{ borderRadius: 4, accentColor: "var(--th-accent)" }}
              />
              <span>
                {t({
                  ko: "Lead (기획 리더)",
                  en: "Lead (Planning lead)",
                  ja: "Lead（企画リード）",
                  zh: "Lead（企划负责人）",
                })}
              </span>
              {savingPlanningLead && (
                <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  {t({ ko: "저장중...", en: "Saving...", ja: "保存中...", zh: "保存中..." })}
                </span>
              )}
            </label>
          )}
          <AgentDetailCliControls agent={agent} t={t} cli={cli} />
        </div>
      </div>
    </div>
  );
}
