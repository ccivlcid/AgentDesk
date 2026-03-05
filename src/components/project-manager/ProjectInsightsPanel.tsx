import { useMemo } from "react";
import type { ProjectDecisionEventItem, ProjectReportHistoryItem, ProjectTaskHistoryItem } from "../../api";
import type { Project } from "../../types";
import type { GroupedProjectTaskCard, ProjectI18nTranslate } from "./types";
import { fmtTime } from "./utils";

const STATUS_DONE = new Set(["done", "completed", "complete"]);
const STATUS_IN_PROGRESS = new Set(["in_progress", "running", "working"]);
const STATUS_REVIEW = new Set(["review", "reviewing"]);
const STATUS_FAILED = new Set(["failed", "error", "cancelled"]);
const STATUS_PAUSED = new Set(["paused"]);

function classifyStatus(status: string): "done" | "in_progress" | "review" | "failed" | "paused" | "planned" {
  const s = status.toLowerCase();
  if (STATUS_DONE.has(s)) return "done";
  if (STATUS_IN_PROGRESS.has(s)) return "in_progress";
  if (STATUS_REVIEW.has(s)) return "review";
  if (STATUS_FAILED.has(s)) return "failed";
  if (STATUS_PAUSED.has(s)) return "paused";
  return "planned";
}

interface ProjectProgressSectionProps {
  t: ProjectI18nTranslate;
  groupedTaskCards: GroupedProjectTaskCard[];
}

function ProjectProgressSection({ t, groupedTaskCards }: ProjectProgressSectionProps) {
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
          agentMap.set(task.assigned_agent_id, { name: agentName, done: cls === "done" ? 1 : 0, total: 1 });
        } else {
          existing.total += 1;
          if (cls === "done") existing.done += 1;
        }
      }
    }

    const total = allTasks.length;
    const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    const topAgents = [...agentMap.values()].sort((a, b) => b.done - a.done || b.total - a.total).slice(0, 4);

    return { counts, total, donePct, topAgents };
  }, [groupedTaskCards]);

  if (stats.total === 0) return null;

  const statusItems = [
    { key: "done", label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), color: "bg-emerald-500", textColor: "text-emerald-400" },
    { key: "in_progress", label: t({ ko: "진행중", en: "In Progress", ja: "進行中", zh: "进行中" }), color: "bg-blue-500", textColor: "text-blue-400" },
    { key: "review", label: t({ ko: "리뷰", en: "Review", ja: "レビュー", zh: "审查" }), color: "bg-amber-400", textColor: "text-amber-400" },
    { key: "paused", label: t({ ko: "일시정지", en: "Paused", ja: "一時停止", zh: "暂停" }), color: "bg-yellow-500", textColor: "text-yellow-400" },
    { key: "planned", label: t({ ko: "예정", en: "Planned", ja: "予定", zh: "计划" }), color: "bg-slate-500", textColor: "text-slate-400" },
    { key: "failed", label: t({ ko: "실패", en: "Failed", ja: "失敗", zh: "失败" }), color: "bg-red-500", textColor: "text-red-400" },
  ].filter((item) => (stats.counts[item.key] ?? 0) > 0);

  return (
    <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">
        {t({ ko: "프로젝트 진행률", en: "Project Progress", ja: "プロジェクト進捗", zh: "项目进度" })}
      </h4>

      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {stats.counts.done}/{stats.total} {t({ ko: "태스크 완료", en: "tasks done", ja: "タスク完了", zh: "任务完成" })}
        </span>
        <span className={`font-semibold ${stats.donePct >= 80 ? "text-emerald-400" : stats.donePct >= 40 ? "text-amber-400" : "text-slate-300"}`}>
          {stats.donePct}%
        </span>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-700/60">
        <div
          className={`h-full rounded-full transition-all duration-700 ${stats.donePct >= 80 ? "bg-emerald-500" : stats.donePct >= 40 ? "bg-amber-400" : "bg-blue-500"}`}
          style={{ width: `${stats.donePct}%` }}
        />
      </div>

      {/* Status breakdown */}
      <div className="mb-4 flex flex-wrap gap-2">
        {statusItems.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 rounded-full bg-slate-900/60 px-2 py-1">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            <span className={`text-[11px] font-medium ${item.textColor}`}>{stats.counts[item.key]}</span>
            <span className="text-[11px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Agent contribution */}
      {stats.topAgents.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium text-slate-400">
            {t({ ko: "에이전트 기여도", en: "Agent Contribution", ja: "エージェント貢献度", zh: "代理贡献度" })}
          </p>
          <div className="space-y-1.5">
            {stats.topAgents.map((agent) => {
              const agentPct = agent.total > 0 ? Math.round((agent.done / agent.total) * 100) : 0;
              return (
                <div key={agent.name} className="flex items-center gap-2">
                  <span className="w-24 truncate text-[11px] text-slate-300">{agent.name}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-slate-700/60" style={{ height: 6 }}>
                    <div
                      className="h-full rounded-full bg-cyan-500/70"
                      style={{ width: `${agentPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] text-slate-400">{agent.done}/{agent.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectInsightsPanelProps {
  t: ProjectI18nTranslate;
  selectedProject: Project | null;
  loadingDetail: boolean;
  isCreating: boolean;
  groupedTaskCards: GroupedProjectTaskCard[];
  sortedReports: ProjectReportHistoryItem[];
  sortedDecisionEvents: ProjectDecisionEventItem[];
  getDecisionEventLabel: (eventType: ProjectDecisionEventItem["event_type"]) => string;
  handleOpenTaskDetail: (taskId: string) => Promise<void>;
}

export default function ProjectInsightsPanel({
  t,
  selectedProject,
  loadingDetail,
  isCreating,
  groupedTaskCards,
  sortedReports,
  sortedDecisionEvents,
  getDecisionEventLabel,
  handleOpenTaskDetail,
}: ProjectInsightsPanelProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            {t({ ko: "프로젝트 정보", en: "Project Info", ja: "プロジェクト情報", zh: "项目信息" })}
          </h4>
          {selectedProject?.github_repo && (
            <a
              href={`https://github.com/${selectedProject.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              title={selectedProject.github_repo}
              className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300 transition hover:border-blue-500 hover:text-white"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              {selectedProject.github_repo}
            </a>
          )}
        </div>
        {loadingDetail ? (
          <p className="mt-2 text-xs text-slate-400">
            {t({ ko: "불러오는 중...", en: "Loading...", ja: "読み込み中...", zh: "加载中..." })}
          </p>
        ) : isCreating ? (
          <p className="mt-2 text-xs text-slate-500">
            {t({
              ko: "신규 프로젝트를 입력 중입니다",
              en: "Creating a new project",
              ja: "新規プロジェクトを入力中です",
              zh: "正在输入新项目",
            })}
          </p>
        ) : !selectedProject ? (
          <p className="mt-2 text-xs text-slate-500">
            {t({ ko: "프로젝트를 선택하세요", en: "Select a project", ja: "プロジェクトを選択", zh: "请选择项目" })}
          </p>
        ) : (
          <div className="mt-2 space-y-2 text-xs">
            <p className="text-slate-200">
              <span className="text-slate-500">ID:</span> {selectedProject.id}
            </p>
            <p className="break-all text-slate-200">
              <span className="text-slate-500">Path:</span> {selectedProject.project_path}
            </p>
            <p className="break-all text-slate-200">
              <span className="text-slate-500">Goal:</span> {selectedProject.core_goal}
            </p>
          </div>
        )}
      </div>

      {selectedProject && !loadingDetail && !isCreating && groupedTaskCards.length > 0 && (
        <ProjectProgressSection t={t} groupedTaskCards={groupedTaskCards} />
      )}

      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h4 className="text-sm font-semibold text-white">
          {t({ ko: "작업 이력", en: "Task History", ja: "作業履歴", zh: "任务历史" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs text-slate-500">-</p>
        ) : groupedTaskCards.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {t({ ko: "연결된 작업이 없습니다", en: "No mapped tasks", ja: "紐づくタスクなし", zh: "没有映射任务" })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {groupedTaskCards.map((group) => (
              <button
                key={group.root.id}
                type="button"
                onClick={() => void handleOpenTaskDetail(group.root.id)}
                className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-left transition hover:border-blue-500/70 hover:bg-slate-900"
              >
                <p className="whitespace-pre-wrap break-all text-xs font-semibold text-slate-100">{group.root.title}</p>
                <p className="mt-1 break-all text-[11px] text-slate-400">
                  {group.root.status} · {group.root.task_type} · {fmtTime(group.root.created_at)}
                </p>
                <p className="mt-1 break-all text-[11px] text-slate-500">
                  {t({ ko: "담당", en: "Owner", ja: "担当", zh: "负责人" })}:{" "}
                  {group.root.assigned_agent_name_ko || group.root.assigned_agent_name || "-"}
                </p>
                <p className="mt-1 text-[11px] text-blue-300">
                  {t({ ko: "하위 작업", en: "Sub tasks", ja: "サブタスク", zh: "子任务" })}: {group.children.length}
                </p>
                {group.children.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {group.children.slice(0, 3).map((child: ProjectTaskHistoryItem) => (
                      <p key={child.id} className="whitespace-pre-wrap break-all text-[11px] text-slate-500">
                        - {child.title}
                      </p>
                    ))}
                    {group.children.length > 3 && (
                      <p className="text-[11px] text-slate-500">+{group.children.length - 3}</p>
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

      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h4 className="text-sm font-semibold text-white">
          {t({ ko: "보고서 이력(프로젝트 매핑)", en: "Mapped Reports", ja: "紐づくレポート", zh: "映射报告" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs text-slate-500">-</p>
        ) : sortedReports.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {t({
              ko: "연결된 보고서가 없습니다",
              en: "No mapped reports",
              ja: "紐づくレポートなし",
              zh: "没有映射报告",
            })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {sortedReports.map((row) => (
              <div
                key={row.id}
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-all text-xs font-medium text-slate-100">{row.title}</p>
                  <p className="text-[11px] text-slate-400">{fmtTime(row.completed_at || row.created_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleOpenTaskDetail(row.id)}
                  className="shrink-0 rounded-md bg-emerald-700 px-2 py-1 text-[11px] text-white hover:bg-emerald-600"
                >
                  {t({ ko: "열람", en: "Open", ja: "表示", zh: "查看" })}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-800/40 p-4">
        <h4 className="text-sm font-semibold text-white">
          {t({ ko: "대표 선택사항", en: "Representative Decisions", ja: "代表選択事項", zh: "代表选择事项" })}
        </h4>
        {!selectedProject ? (
          <p className="mt-2 text-xs text-slate-500">-</p>
        ) : sortedDecisionEvents.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {t({
              ko: "기록된 대표 의사결정이 없습니다",
              en: "No representative decision records",
              ja: "代表意思決定の記録はありません",
              zh: "暂无代表决策记录",
            })}
          </p>
        ) : (
          <div className="mt-2 max-h-56 overflow-x-hidden overflow-y-auto space-y-2 pr-1">
            {sortedDecisionEvents.map((event) => {
              let selectedLabels: string[] = [];
              if (event.selected_options_json) {
                try {
                  const parsed = JSON.parse(event.selected_options_json) as Array<{ label?: unknown }>;
                  selectedLabels = Array.isArray(parsed)
                    ? parsed
                        .map((row) => (typeof row?.label === "string" ? row.label.trim() : ""))
                        .filter((label) => label.length > 0)
                    : [];
                } catch {
                  selectedLabels = [];
                }
              }

              return (
                <div
                  key={`${event.id}-${event.created_at}`}
                  className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-semibold text-slate-100">
                      {getDecisionEventLabel(event.event_type)}
                    </p>
                    <p className="text-[11px] text-slate-400">{fmtTime(event.created_at)}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-slate-300">{event.summary}</p>
                  {selectedLabels.length > 0 && (
                    <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-blue-300">
                      {t({ ko: "선택 내용", en: "Selected Items", ja: "選択内容", zh: "已选内容" })}:{" "}
                      {selectedLabels.join(" / ")}
                    </p>
                  )}
                  {event.note && event.note.trim().length > 0 && (
                    <p className="mt-1 whitespace-pre-wrap break-all text-[11px] text-emerald-300">
                      {t({ ko: "추가 요청사항", en: "Additional Request", ja: "追加要請事項", zh: "追加请求事项" })}:{" "}
                      {event.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
