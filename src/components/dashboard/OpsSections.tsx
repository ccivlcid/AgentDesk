import { localeName, type UiLanguage } from "../../i18n";
import type { Agent, Task } from "../../types";
import AgentAvatar from "../AgentAvatar";
import { getRankTier, STATUS_LABELS, STATUS_LEFT_BORDER, taskStatusLabel, timeAgo, type TFunction } from "./model";

export interface DepartmentPerformance {
  id: string;
  name: string;
  icon: string;
  done: number;
  total: number;
  ratio: number;
  color: {
    bar: string;
    badge: string;
  };
}

interface DashboardDeptAndSquadProps {
  deptData: DepartmentPerformance[];
  workingAgents: Agent[];
  idleAgentsList: Agent[];
  agents: Agent[];
  language: UiLanguage;
  numberFormatter: Intl.NumberFormat;
  t: TFunction;
}

export function DashboardDeptAndSquad({
  deptData,
  workingAgents,
  idleAgentsList,
  agents,
  language,
  numberFormatter,
  t,
}: DashboardDeptAndSquadProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
      <div className="dashboard-panel rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-5 shadow-sm">
        <h2 className="mb-4 flex items-center justify-between text-sm font-semibold text-[var(--th-text-heading)]">
          {t({ ko: "부서 성과", en: "Department performance", ja: "部署パフォーマンス", zh: "部门绩效" })}
          <span className="text-[10px] font-normal normal-case text-[var(--th-text-muted)]">
            {t({ ko: "부서별", en: "By dept.", ja: "部署別", zh: "按部门" })}
          </span>
        </h2>

        {deptData.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-sm text-[var(--th-text-muted)]">
            {t({ ko: "데이터가 없습니다.", en: "No data available.", ja: "データがありません。", zh: "暂无数据。" })}
          </div>
        ) : (
          <div className="space-y-3">
            {deptData.map((dept) => (
              <article
                key={dept.id}
                className="rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md text-sm"
                      style={{ background: "var(--th-bg-surface)", color: "var(--th-text-secondary)" }}
                    >
                      {dept.icon}
                    </span>
                    <span className="text-sm font-medium text-[var(--th-text-primary)]">{dept.name}</span>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${dept.color.badge}`}>
                    {dept.ratio}%
                  </span>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--th-bg-surface)]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${dept.color.bar} transition-all duration-500`}
                    style={{ width: `${dept.ratio}%` }}
                  />
                </div>

                <div className="mt-1.5 flex justify-between text-[10px] text-[var(--th-text-muted)]">
                  <span>
                    {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })} {numberFormatter.format(dept.done)}
                  </span>
                  <span>
                    {t({ ko: "전체", en: "Total", ja: "全体", zh: "总计" })} {numberFormatter.format(dept.total)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-panel rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--th-text-heading)]">
            {t({ ko: "스쿼드", en: "Squad", ja: "スクワッド", zh: "小队" })}
          </h2>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 [.dark_theme_*]:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [.dark_theme_*]:bg-emerald-400" />
              {numberFormatter.format(workingAgents.length)}
            </span>
            <span className="rounded border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 font-medium text-[var(--th-text-muted)]">
              {numberFormatter.format(idleAgentsList.length)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {agents.map((agent) => {
            const isWorking = agent.status === "working";
            const tier = getRankTier(agent.stats_xp);
            return (
              <div
                key={agent.id}
                title={`${localeName(language, agent)} — ${
                  isWorking
                    ? t({ ko: "작업 중", en: "Working", ja: "作業中", zh: "工作中" })
                    : t({ ko: "대기 중", en: "Idle", ja: "待機中", zh: "空闲" })
                }`}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className="relative">
                  <div
                    className="overflow-hidden rounded-xl border border-[var(--th-border)] transition-colors group-hover:border-[var(--th-border-strong)]"
                    style={isWorking ? { borderColor: `${tier.color}50`, boxShadow: `0 0 0 1px ${tier.color}30` } : {}}
                  >
                    <AgentAvatar agent={agent} agents={agents} size={40} rounded="xl" />
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                      isWorking ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                    style={{ borderColor: "var(--th-bg-surface)" }}
                  />
                </div>
                <span
                  className="max-w-[52px] truncate text-center text-[10px] font-medium leading-tight"
                  style={{ color: isWorking ? "var(--th-text-primary)" : "var(--th-text-muted)" }}
                >
                  {localeName(language, agent)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface DashboardMissionLogProps {
  recentTasks: Task[];
  agentMap: Map<string, Agent>;
  agents: Agent[];
  language: UiLanguage;
  localeTag: string;
  idleAgents: number;
  numberFormatter: Intl.NumberFormat;
  t: TFunction;
  /** When true, render only content (no panel/title). For use inside CollapsibleSection. */
  embedded?: boolean;
}

export function DashboardMissionLog({
  recentTasks,
  agentMap,
  agents,
  language,
  localeTag,
  idleAgents,
  numberFormatter,
  t,
  embedded,
}: DashboardMissionLogProps) {
  const content = recentTasks.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-10 text-sm text-[var(--th-text-muted)]">
      {t({ ko: "최근 작업이 없습니다.", en: "No recent tasks.", ja: "最近のタスクがありません。", zh: "暂无最近任务。" })}
    </div>
  ) : (
    <div className="space-y-2">
          {recentTasks.map((task) => {
            const statusInfo = STATUS_LABELS[task.status] ?? {
              color: "bg-slate-500/15 text-slate-600 border-slate-400/30 [.dark_theme_*]:text-slate-300",
              dot: "bg-slate-400",
            };
            const assignedAgent =
              task.assigned_agent ?? (task.assigned_agent_id ? agentMap.get(task.assigned_agent_id) : undefined);
            const leftBorder = STATUS_LEFT_BORDER[task.status] ?? "border-l-slate-400";

            return (
              <article
                key={task.id}
                className={`group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-[var(--th-border)] border-l-[3px] ${leftBorder} bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]`}
              >
                {assignedAgent ? (
                  <AgentAvatar agent={assignedAgent} agents={agents} size={36} rounded="lg" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-surface)] text-xs font-medium text-[var(--th-text-muted)]">
                    —
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--th-text-primary)]">{task.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--th-text-muted)]">
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusInfo.dot}`} />
                    {assignedAgent
                      ? localeName(language, assignedAgent)
                      : t({ ko: "미배정", en: "Unassigned", ja: "未割り当て", zh: "未分配" })}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[9px] font-semibold ${statusInfo.color}`}
                  >
                    {taskStatusLabel(task.status, t)}
                  </span>
                  <span className="text-[9px] text-[var(--th-text-muted)]">
                    {timeAgo(task.updated_at, localeTag)}
                  </span>
                </div>
              </article>
            );
          })}
    </div>
  );

  if (embedded) {
    return <div className="relative">{content}</div>;
  }

  return (
    <div className="dashboard-panel rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--th-text-heading)]">
          {t({ ko: "최근 활동", en: "Recent activity", ja: "最近の活動", zh: "最近活动" })}
        </h2>
        <span className="rounded border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--th-text-muted)]">
          {t({ ko: "유휴", en: "Idle", ja: "待機", zh: "空闲" })} {numberFormatter.format(idleAgents)}
        </span>
      </div>
      {content}
    </div>
  );
}
