import { useMemo } from "react";
import type { ProjectTaskHistoryItem } from "../../../api";
import type { GroupedProjectTaskCard, ProjectI18nTranslate } from "../types";
import { classifyStatus } from "./utils";

interface ProjectProgressSectionProps {
  t: ProjectI18nTranslate;
  groupedTaskCards: GroupedProjectTaskCard[];
}

export function ProjectProgressSection({ t, groupedTaskCards }: ProjectProgressSectionProps) {
  const stats = useMemo(() => {
    const allTasks: ProjectTaskHistoryItem[] = [];
    for (const group of groupedTaskCards) {
      allTasks.push(group.root);
      allTasks.push(...group.children);
    }

    const counts: Record<string, number> = { done: 0, in_progress: 0, review: 0, failed: 0, paused: 0, planned: 0 };
    const agentMap: Map<string, { name: string; done: number; total: number }> = new Map();

    for (const task of allTasks) {
      const cls = classifyStatus(task.status);
      counts[cls] = (counts[cls] ?? 0) + 1;

      if (task.assigned_agent_id && (task.assigned_agent_name || task.assigned_agent_name_ko)) {
        const agentName = task.assigned_agent_name_ko || task.assigned_agent_name;
        const existing = agentMap.get(task.assigned_agent_id);
        if (!existing) {
          agentMap.set(task.assigned_agent_id, { name: agentName!, done: cls === "done" ? 1 : 0, total: 1 });
        } else {
          existing.total += 1;
          if (cls === "done") existing.done += 1;
        }
      }
    }

    const deptMap: Map<string, { name: string; done: number; total: number }> = new Map();
    for (const task of allTasks) {
      const cls = classifyStatus(task.status);
      const deptId = task.department_id;
      const deptName = task.department_name_ko || task.department_name;
      if (deptId && deptName) {
        const existing = deptMap.get(deptId);
        if (!existing) {
          deptMap.set(deptId, { name: deptName, done: cls === "done" ? 1 : 0, total: 1 });
        } else {
          existing.total += 1;
          if (cls === "done") existing.done += 1;
        }
      }
    }

    const total = allTasks.length;
    const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    const topAgents = [...agentMap.values()].sort((a, b) => b.done - a.done || b.total - a.total).slice(0, 4);
    const topDepts = [...deptMap.values()].sort((a, b) => b.total - a.total || b.done - a.done).slice(0, 6);

    return { counts, total, donePct, topAgents, topDepts };
  }, [groupedTaskCards]);

  if (stats.total === 0) return null;

  const statusItems = [
    { key: "done", label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), color: "bg-emerald-500", textColor: "text-emerald-400" },
    { key: "in_progress", label: t({ ko: "진행중", en: "In Progress", ja: "進行中", zh: "进行中" }), color: "bg-[#3b82f6]", textColor: "text-[#60a5fa]" },
    { key: "review", label: t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审查" }), color: "bg-amber-400", textColor: "text-amber-400" },
    { key: "paused", label: t({ ko: "일시정지", en: "Paused", ja: "一時停止", zh: "暂停" }), color: "bg-yellow-500", textColor: "text-yellow-400" },
    { key: "planned", label: t({ ko: "예정", en: "Planned", ja: "予定", zh: "计划" }), color: "bg-[#64748b]", textColor: "text-[#94a3b8]" },
    { key: "failed", label: t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" }), color: "bg-red-500", textColor: "text-red-400" },
  ].filter((item) => (stats.counts[item.key] ?? 0) > 0);

  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "#F9FAFB" }}>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#111827", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "프로젝트 진행률", en: "Project Progress", ja: "プロジェクト進捗", zh: "项目进度" })}
      </h4>

      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-mono" style={{ color: "#9CA3AF" }}>
          {stats.counts.done}/{stats.total} {t({ ko: "태스크 완료", en: "tasks done", ja: "タスク完了", zh: "任务完成" })}
        </span>
        <span className={`font-semibold font-mono ${stats.donePct >= 80 ? "text-emerald-400" : stats.donePct >= 40 ? "text-amber-400" : ""}`} style={stats.donePct < 40 ? { color: "#6B7280" } : undefined}>
          {stats.donePct}%
        </span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden" style={{ borderRadius: 0, background: "#F3F4F6" }}>
        <div
          className={`h-full transition-all duration-700 ${stats.donePct >= 80 ? "bg-emerald-500" : stats.donePct >= 40 ? "bg-amber-400" : "bg-[#3b82f6]"}`}
          style={{ width: `${stats.donePct}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {statusItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 px-2 py-1" style={{ borderRadius: 0, background: "#FFFFFF" }}>
            <span className={`h-2 w-2 ${item.color}`} style={{ borderRadius: 0 }} />
            <span className={`text-[11px] font-mono font-medium ${item.textColor}`}>{stats.counts[item.key]}</span>
            <span className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {stats.topAgents.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium font-mono" style={{ color: "#9CA3AF" }}>
            {t({ ko: "에이전트 기여도", en: "Agent Contribution", ja: "エージェント貢献度", zh: "代理贡献度" })}
          </p>
          <div className="space-y-1.5">
            {stats.topAgents.map((agent) => {
              const agentPct = agent.total > 0 ? Math.round((agent.done / agent.total) * 100) : 0;
              return (
                <div key={agent.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-[11px] font-mono" style={{ color: "#6B7280" }}>{agent.name}</span>
                  <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 0, background: "#F3F4F6" }}>
                    <div className="h-full bg-cyan-500/70" style={{ width: `${agentPct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] font-mono" style={{ color: "#9CA3AF" }}>{agent.done}/{agent.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.topDepts.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium font-mono" style={{ color: "#9CA3AF" }}>
            {t({ ko: "전문 분야별 기여도", en: "Specialty Contribution", ja: "専門分野別貢献度", zh: "专业领域贡献度" })}
          </p>
          <div className="space-y-1.5">
            {stats.topDepts.map((dept) => {
              const deptPct = dept.total > 0 ? Math.round((dept.done / dept.total) * 100) : 0;
              return (
                <div key={dept.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-[11px] font-mono" style={{ color: "#6B7280" }}>{dept.name}</span>
                  <div className="flex-1 overflow-hidden" style={{ height: 6, borderRadius: 0, background: "#F3F4F6" }}>
                    <div className="h-full bg-violet-500/70" style={{ width: `${deptPct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] font-mono" style={{ color: "#9CA3AF" }}>{dept.done}/{dept.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
