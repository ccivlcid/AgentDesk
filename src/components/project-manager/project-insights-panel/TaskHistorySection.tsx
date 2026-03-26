import type { ProjectTaskHistoryItem } from "../../../api";
import type { GroupedProjectTaskCard, ProjectI18nTranslate } from "../types";
import { fmtTime } from "../utils";

interface TaskHistorySectionProps {
  t: ProjectI18nTranslate;
  selectedProject: { id: string } | null;
  groupedTaskCards: GroupedProjectTaskCard[];
  handleOpenTaskDetail: (taskId: string) => Promise<void>;
}

export function TaskHistorySection({ t, selectedProject, groupedTaskCards, handleOpenTaskDetail }: TaskHistorySectionProps) {
  return (
    <div className="min-w-0 p-4" style={{ border: "1px solid #E5E7EB", borderRadius: 0, background: "#F9FAFB" }}>
      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#111827", fontFamily: "var(--th-font-mono)" }}>
        {t({ ko: "작업 이력", en: "Task History", ja: "作業履歴", zh: "任务历史" })}
      </h4>
      {!selectedProject ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "#9CA3AF" }}>-</p>
      ) : groupedTaskCards.length === 0 ? (
        <p className="mt-2 text-xs font-mono" style={{ color: "#9CA3AF" }}>
          {t({ ko: "연결된 작업이 없습니다", en: "No mapped tasks", ja: "紐づくタスクなし", zh: "没有映射任务" })}
        </p>
      ) : (
        <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
          {groupedTaskCards.map((group) => (
            <button
              key={group.root.id}
              type="button"
              onClick={() => void handleOpenTaskDetail(group.root.id)}
              className="w-full min-w-0 overflow-hidden px-3 py-2 text-left transition"
              style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "#FFFFFF" }}
            >
              <p className="whitespace-pre-wrap break-all text-xs font-semibold font-mono" style={{ color: "#111827" }}>{group.root.title}</p>
              <p className="mt-1 break-all text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
                {group.root.status} · {group.root.task_type} · {fmtTime(group.root.created_at)}
              </p>
              <p className="mt-1 break-all text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
                {t({ ko: "담당", en: "Owner", ja: "担当", zh: "负责人" })}:{" "}
                {group.root.assigned_agent_name_ko || group.root.assigned_agent_name || "-"}
              </p>
              <p className="mt-1 text-[11px] text-[#93c5fd]">
                {t({ ko: "하위 작업", en: "Sub tasks", ja: "サブタスク", zh: "子任务" })}: {group.children.length}
              </p>
              {group.children.length > 0 && (
                <div className="mt-1 space-y-1">
                  {group.children.slice(0, 3).map((child: ProjectTaskHistoryItem) => (
                    <p key={child.id} className="whitespace-pre-wrap break-all text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
                      - {child.title}
                    </p>
                  ))}
                  {group.children.length > 3 && (
                    <p className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>+{group.children.length - 3}</p>
                  )}
                </div>
              )}
              <p className="mt-2 text-right text-[11px] text-emerald-300">
                {t({
                  ko: "카드 클릭으로 상세 보기",
                  en: "Click card for details",
                  ja: "クリックで詳細表示",
                  zh: "点击卡片查看详情",
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
