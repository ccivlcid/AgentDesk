import { useState, useEffect } from "react";
import { useI18n } from "../../i18n";
import { getTaskReportDetail, type TaskReportTeamSection } from "../../api";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";

interface CollaboratorSectionProps {
  taskId: string;
  agents: Agent[];
  sectionOpen: boolean;
  onToggleSection: () => void;
}

const ROLE_LABELS: Record<string, Record<string, string>> = {
  team_leader: { ko: "팀장", en: "Team Lead", ja: "チームリーダー", zh: "组长" },
  senior: { ko: "시니어", en: "Senior", ja: "シニア", zh: "高级" },
  junior: { ko: "주니어", en: "Junior", ja: "ジュニア", zh: "初级" },
  intern: { ko: "인턴", en: "Intern", ja: "インターン", zh: "实习" },
};

export default function CollaboratorSection({ taskId, agents, sectionOpen, onToggleSection }: CollaboratorSectionProps) {
  const { t, locale } = useI18n();
  const [collaborators, setCollaborators] = useState<TaskReportTeamSection[] | null>(null);
  const [error, setError] = useState(false);

  const preferKo = locale === "ko";

  useEffect(() => {
    getTaskReportDetail(taskId)
      .then((detail) => {
        // Filter: only entries with source_task_id (i.e. delegated child tasks, not the root)
        const collabs = (detail.team_reports ?? []).filter(
          (tr) => tr.source_task_id && tr.task_id !== taskId,
        );
        setCollaborators(collabs);
      })
      .catch(() => {
        setError(true);
        setCollaborators([]);
      });
  }, [taskId]);

  if (error) {
    return (
      <div className="px-3 py-2 text-[11px] font-mono" style={{ borderRadius: "2px", border: "1px solid rgba(244,63,94,0.3)", background: "var(--th-bg-surface)", color: "rgb(253,164,175)" }}>
        {t({ ko: "협업 정보를 불러올 수 없습니다", en: "Failed to load collaboration info", ja: "コラボ情報を取得できません", zh: "无法加载协作信息" })}
      </div>
    );
  }

  if (collaborators === null) {
    return (
      <div className="px-3 py-2 text-[11px] font-mono animate-pulse" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)", color: "var(--th-text-muted)" }}>
        {t({ ko: "협업 정보 로딩중...", en: "Loading collaborators...", ja: "コラボ情報を読み込み中...", zh: "加载协作信息..." })}
      </div>
    );
  }

  if (collaborators.length === 0) return null;

  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const statusCls = (status: string) => {
    switch (status) {
      case "done":
        return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
      case "review":
        return "border-amber-500/40 bg-amber-500/15 text-amber-300";
      case "in_progress":
        return "border-[rgba(59,130,246,0.4)] bg-[rgba(59,130,246,0.15)] text-[#93c5fd]";
      default:
        return "border-[var(--th-border)] bg-[var(--th-bg-elevated)] text-[var(--th-text-muted)]";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "done":
        return t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" });
      case "review":
        return t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审核" });
      case "in_progress":
        return t({ ko: "진행중", en: "In Progress", ja: "進行中", zh: "进行中" });
      default:
        return status;
    }
  };

  return (
    <div className="overflow-hidden" style={{ borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}>
      <button
        type="button"
        onClick={onToggleSection}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[var(--th-bg-surface-hover)] transition"
      >
        <span className="text-[11px] font-medium font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "협업 참여자", en: "Collaborators", ja: "コラボレーター", zh: "协作者" })}
          <span className="ml-1.5" style={{ color: "var(--th-text-muted)" }}>{collaborators.length}{t({ ko: "명", en: "", ja: "名", zh: "人" })}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform ${sectionOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--th-text-muted)" }}>
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>
      {sectionOpen && (
        <div style={{ borderTop: "1px solid var(--th-border)" }}>
          {collaborators.map((collab) => {
            const agent = collab.agent_id ? agentMap.get(collab.agent_id) : undefined;
            const name = preferKo
              ? collab.agent_name_ko || collab.agent_name
              : collab.agent_name || collab.agent_name_ko;
            const dept = preferKo
              ? collab.department_name_ko || collab.department_name
              : collab.department_name || collab.department_name_ko;
            const roleKey = collab.agent_role || "";
            const role = ROLE_LABELS[roleKey]?.[locale] || ROLE_LABELS[roleKey]?.en || roleKey;

            return (
              <div key={collab.task_id} className="flex items-start gap-2.5 px-3 py-2.5" style={{ borderBottom: "1px solid var(--th-border)" }}>
                <AgentAvatar agent={agent} agents={agents} size={28} rounded="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium font-mono" style={{ color: "var(--th-text-heading)" }}>{name || "-"}</span>
                    {dept && <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{dept}</span>}
                    {role && <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>· {role}</span>}
                    <span className={`ml-auto inline-flex items-center border px-1.5 py-0.5 text-[9px] font-medium font-mono ${statusCls(collab.status)}`} style={{ borderRadius: "2px" }}>
                      {statusLabel(collab.status)}
                    </span>
                  </div>
                  {collab.summary && (
                    <div className="mt-0.5 text-[11px] font-mono truncate" style={{ color: "var(--th-text-secondary)" }} title={collab.summary}>
                      {collab.summary.length > 120 ? `${collab.summary.slice(0, 120)}...` : collab.summary}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
