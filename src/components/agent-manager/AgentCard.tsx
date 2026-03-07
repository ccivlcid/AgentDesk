import type { Agent, Department } from "../../types";
import { localeName } from "../../i18n";
import AgentAvatar from "../AgentAvatar";
import { ROLE_BADGE, ROLE_LABEL } from "./constants";
import type { Translator } from "./types";
import { PersonaBadge } from "../agent-persona/PersonaBadge";

interface AgentCardProps {
  agent: Agent;
  spriteMap: Map<string, number>;
  isKo: boolean;
  locale: string;
  tr: Translator;
  departments: Department[];
  onEdit: () => void;
  confirmDeleteId: string | null;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  saving: boolean;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  working: "status-badge status-badge-running",
  idle: "status-badge status-badge-idle",
  break: "status-badge status-badge-paused",
  offline: "status-badge status-badge-error",
};

const STATUS_LABEL: Record<string, string> = {
  working: "RUNNING",
  idle: "IDLE",
  break: "BREAK",
  offline: "OFFLINE",
};

const ACTIVITY_PCT: Record<string, number> = {
  working: 85,
  idle: 50,
  break: 22,
  offline: 5,
};

const ACTIVITY_COLOR: Record<string, string> = {
  working: "var(--th-attr-elite)",
  idle: "var(--th-attr-avg)",
  break: "var(--th-attr-poor)",
  offline: "var(--th-attr-vlow)",
};

export default function AgentCard({
  agent,
  spriteMap,
  isKo,
  locale,
  tr,
  departments,
  onEdit,
  confirmDeleteId,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  saving,
}: AgentCardProps) {
  const isDeleting = confirmDeleteId === agent.id;
  const dept = departments.find((d) => d.id === agent.department_id);
  const isWorking = agent.status === "working";
  const activityPct = ACTIVITY_PCT[agent.status] ?? 5;
  const activityColor = ACTIVITY_COLOR[agent.status] ?? "var(--th-attr-vlow)";

  return (
    <div
      onClick={onEdit}
      className="group cursor-pointer fm-agent-card"
      style={{
        background: "var(--th-bg-surface)",
        border: "1px solid var(--th-border)",
        borderLeft: isWorking ? "3px solid #22c55e" : "3px solid var(--th-border)",
        borderRadius: "4px",
        transition: "border-color 0.1s linear, background 0.1s linear",
      }}
    >
      {/* Top: avatar + name + status badge */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <div className="relative shrink-0 mt-0.5">
          <AgentAvatar agent={agent} spriteMap={spriteMap} size={38} rounded="sm" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <span
              className="font-semibold text-sm leading-tight truncate"
              style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}
            >
              {localeName(locale, agent)}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {agent.persona_id && <PersonaBadge personaId={agent.persona_id} size="sm" />}
              <span className={STATUS_BADGE_CLASS[agent.status] ?? "status-badge status-badge-idle"}>
                {STATUS_LABEL[agent.status] ?? "IDLE"}
              </span>
            </div>
          </div>

          {/* Role + Dept row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 border font-medium font-mono ${ROLE_BADGE[agent.role] || ""}`} style={{ borderRadius: "2px" }}>
              {isKo ? ROLE_LABEL[agent.role]?.ko : ROLE_LABEL[agent.role]?.en}
            </span>
            {dept && (
              <span
                className="text-[10px] font-mono"
                style={{ color: "var(--th-text-muted)" }}
              >
                {localeName(locale, dept)}
              </span>
            )}
          </div>

          {/* CLI provider */}
          <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {agent.cli_provider}
          </div>
        </div>
      </div>

      {/* FM2024 Attribute bar */}
      <div
        className="px-3 pb-2.5"
        style={{ borderTop: "1px solid var(--th-border)", paddingTop: "0.5rem" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono uppercase tracking-widest shrink-0"
            style={{ color: "var(--th-text-muted)", width: "3.25rem" }}
          >
            ACTIVITY
          </span>
          <div
            className="flex-1 overflow-hidden"
            style={{ height: "4px", borderRadius: "1px", background: "var(--th-border)" }}
          >
            <div
              style={{
                width: `${activityPct}%`,
                height: "100%",
                background: activityColor,
                transition: "width 0.3s linear",
              }}
            />
          </div>
          <span
            className="text-[9px] font-mono tabular-nums shrink-0 text-right"
            style={{ color: activityColor, width: "1.5rem" }}
          >
            {activityPct}
          </span>
        </div>
      </div>

      {/* Delete action — only on hover */}
      <div
        className="flex items-center justify-end px-3 pb-1.5 opacity-0 group-hover:opacity-100"
        style={{ transition: "opacity 0.1s linear" }}
        onClick={(e) => e.stopPropagation()}
      >
        {isDeleting ? (
          <>
            <button
              onClick={onDeleteConfirm}
              disabled={saving || agent.status === "working"}
              className="px-2 py-0.5 text-[10px] font-medium font-mono uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 transition-colors"
              style={{ borderRadius: "2px" }}
            >
              {tr("해고", "Fire")}
            </button>
            <button
              onClick={onDeleteCancel}
              className="ml-1.5 px-2 py-0.5 text-[10px] font-mono transition-colors"
              style={{ color: "var(--th-text-muted)", borderRadius: "2px" }}
            >
              {tr("취소", "No")}
            </button>
          </>
        ) : (
          <button
            onClick={onDeleteClick}
            className="px-1.5 py-0.5 text-xs font-mono hover:bg-red-500/15 hover:text-red-400 transition-colors"
            style={{ borderRadius: "2px", color: "var(--th-text-muted)" }}
            title={tr("해고", "Fire")}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
