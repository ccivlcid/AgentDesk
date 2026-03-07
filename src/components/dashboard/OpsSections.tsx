import { useMemo } from "react";
import { localeName, type UiLanguage } from "../../i18n";
import type { Agent, Task } from "../../types";
import AgentAvatar from "../AgentAvatar";
import { getRankTier, STATUS_LABELS, STATUS_LEFT_BORDER, taskStatusLabel, timeAgo, type TFunction } from "./model";
import { PersonaBadge } from "../agent-persona/PersonaBadge";

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
      <div className="dashboard-panel p-5" style={{ border: "1px solid var(--th-border)", borderRadius: "4px", background: "var(--th-bg-surface)" }}>
        <h2 className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "부서 성과", en: "Department performance", ja: "部署パフォーマンス", zh: "部门绩效" })}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "부서별", en: "By dept.", ja: "部署別", zh: "按部门" })}
          </span>
        </h2>

        {deptData.length === 0 ? (
          <div className="terminal-empty-state min-h-[180px] flex flex-col items-center justify-center">
            <p className="terminal-empty-state-cmd">$ ls departments/</p>
            <p className="terminal-empty-state-result">(empty)</p>
            <p className="terminal-empty-state-hint">{t({ ko: "부서를 추가하면 성과 데이터가 표시됩니다.", en: "Add departments to see performance data.", ja: "部署を追加するとデータが表示されます。", zh: "添加部门后显示数据。" })}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deptData.map((dept) => (
              <article
                key={dept.id}
                className="border border-[var(--th-border)] bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]"
                style={{ borderRadius: "2px" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center text-sm"
                      style={{ background: "var(--th-bg-surface)", color: "var(--th-text-secondary)", borderRadius: "2px" }}
                    >
                      {dept.icon}
                    </span>
                    <span className="text-sm font-medium text-[var(--th-text-primary)]">{dept.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold font-mono ${dept.color.badge}`} style={{ borderRadius: "2px" }}>
                    {dept.ratio}%
                  </span>
                </div>

                <div className="mt-2.5 h-1.5 overflow-hidden bg-[var(--th-bg-surface)]" style={{ borderRadius: "1px" }}>
                  <div
                    className={`h-full bg-gradient-to-r ${dept.color.bar} transition-all duration-500`}
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

      <div className="dashboard-panel p-5" style={{ border: "1px solid var(--th-border)", borderRadius: "4px", background: "var(--th-bg-surface)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "스쿼드", en: "Squad", ja: "スクワッド", zh: "小队" })}
          </h2>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1 px-2 py-0.5 font-mono font-medium" style={{ border: "1px solid rgba(34,197,94,0.3)", borderRadius: "2px", background: "rgba(34,197,94,0.08)", color: "#22c55e" }}>
              <span className="h-1.5 w-1.5 bg-emerald-500 [.dark_theme_*]:bg-emerald-400" style={{ borderRadius: "1px" }} />
              {numberFormatter.format(workingAgents.length)}
            </span>
            <span className="border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 font-mono font-medium text-[var(--th-text-muted)]" style={{ borderRadius: "2px", fontSize: "0.625rem" }}>
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
                    className="overflow-hidden border border-[var(--th-border)] transition-colors group-hover:border-[var(--th-border-strong)]"
                    style={{
                      borderRadius: "4px",
                      ...(isWorking ? { borderColor: `${tier.color}50`, boxShadow: `0 0 0 1px ${tier.color}30` } : {}),
                    }}
                  >
                    <AgentAvatar agent={agent} agents={agents} size={40} rounded="xl" />
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                      isWorking ? "bg-emerald-500" : "bg-[var(--th-text-muted)]"
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
              color: "bg-[rgba(100,116,139,0.15)] text-[#475569] border-[rgba(148,163,184,0.3)]",
              dot: "bg-[#94a3b8]",
            };
            const assignedAgent =
              task.assigned_agent ?? (task.assigned_agent_id ? agentMap.get(task.assigned_agent_id) : undefined);
            const leftBorder = STATUS_LEFT_BORDER[task.status] ?? "border-l-[#94a3b8]";

            return (
              <article
                key={task.id}
                className={`group grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-[var(--th-border)] border-l-[3px] ${leftBorder} bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]`}
                style={{ borderRadius: "2px" }}
              >
                {assignedAgent ? (
                  <AgentAvatar agent={assignedAgent} agents={agents} size={36} rounded="lg" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center border border-[var(--th-border)] bg-[var(--th-bg-surface)] text-xs font-medium text-[var(--th-text-muted)]" style={{ borderRadius: "2px" }}>
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
                    className={`px-2 py-0.5 text-[9px] font-semibold font-mono ${statusInfo.color}`}
                    style={{ borderRadius: "2px" }}
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
    <div className="dashboard-panel p-5" style={{ border: "1px solid var(--th-border)", borderRadius: "4px", background: "var(--th-bg-surface)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
          {t({ ko: "최근 활동", en: "Recent activity", ja: "最近の活動", zh: "最近活动" })}
        </h2>
        <span className="border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 font-mono font-medium text-[var(--th-text-muted)]" style={{ borderRadius: "2px", fontSize: "0.625rem" }}>
          {t({ ko: "유휴", en: "Idle", ja: "待機", zh: "空闲" })} {numberFormatter.format(idleAgents)}
        </span>
      </div>
      {content}
    </div>
  );
}

interface DashboardActivePersonasProps {
  agents: Agent[];
  language: UiLanguage;
  t: TFunction;
}

export function DashboardActivePersonas({ agents, language, t }: DashboardActivePersonasProps) {
  const personaAgents = agents.filter((a) => a.persona_id);

  if (personaAgents.length === 0) {
    return (
      <div className="py-6 text-center font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
        <div>$ ls personas/</div>
        <div className="mt-1">(empty)</div>
        <div className="mt-2" style={{ color: "var(--th-text-muted)", fontSize: "0.65rem" }}>
          {t({ ko: "에이전트 생성 시 페르소나를 지정하세요", en: "Assign a persona when creating an agent", ja: "エージェント作成時にペルソナを指定", zh: "创建代理时分配角色" })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {personaAgents.map((agent) => {
        const isWorking = agent.status === "working";
        return (
          <div
            key={agent.id}
            className="flex items-center gap-2 px-2.5 py-2"
            style={{
              border: `1px solid ${isWorking ? "rgba(34,197,94,0.25)" : "var(--th-border)"}`,
              borderRadius: "2px",
              background: isWorking ? "rgba(34,197,94,0.05)" : "var(--th-bg-primary)",
            }}
          >
            <AgentAvatar agent={agent} agents={personaAgents} size={28} rounded="sm" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className="max-w-[80px] truncate text-xs font-medium"
                  style={{ color: isWorking ? "var(--th-text-primary)" : "var(--th-text-secondary)" }}
                >
                  {localeName(language, agent)}
                </span>
                <PersonaBadge personaId={agent.persona_id!} size="sm" />
              </div>
              <div className="mt-0.5 font-mono text-[9px]" style={{ color: isWorking ? "#22c55e" : "var(--th-text-muted)" }}>
                {isWorking ? "RUNNING" : "IDLE"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


interface TodaySummaryProps {
  agents: Agent[];
  tasks: Task[];
  language: UiLanguage;
  t: TFunction;
}

export function DashboardTodaySummary({ agents, tasks, language, t }: TodaySummaryProps) {
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const todayStats = useMemo(() => {
    const byAgent: Map<string, { agent: Agent; done: number; inProgress: number }> = new Map();
    for (const task of tasks) {
      const agentId = task.assigned_agent_id;
      if (!agentId) continue;
      const agent = agentMap.get(agentId);
      if (!agent) continue;
      if (task.status === "done" && task.completed_at && task.completed_at >= todayStart) {
        const entry = byAgent.get(agentId) ?? { agent, done: 0, inProgress: 0 };
        byAgent.set(agentId, { ...entry, done: entry.done + 1 });
      } else if (task.status === "in_progress") {
        const entry = byAgent.get(agentId) ?? { agent, done: 0, inProgress: 0 };
        byAgent.set(agentId, { ...entry, inProgress: entry.inProgress + 1 });
      }
    }
    return [...byAgent.values()].sort((a, b) => b.done - a.done || b.inProgress - a.inProgress);
  }, [tasks, agentMap, todayStart]);

  const totalDoneToday = todayStats.reduce((s, e) => s + e.done, 0);

  if (todayStats.length === 0) {
    return (
      <div className="terminal-empty-state min-h-[80px] flex flex-col items-center justify-center">
        <p className="terminal-empty-state-cmd">$ cat today.log</p>
        <p className="terminal-empty-state-result">{t({ ko: "오늘 완료된 작업 없음", en: "No tasks completed today", ja: "本日完了なし", zh: "今日无完成任务" })}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "오늘 완료", en: "Completed today", ja: "本日完了", zh: "今日完成" })}
        </span>
        <span className="px-2 py-0.5 text-[10px] font-mono font-bold" style={{ borderRadius: "2px", background: "rgba(52,211,153,0.15)", color: "rgb(110,231,183)", border: "1px solid rgba(52,211,153,0.3)" }}>
          {totalDoneToday}
        </span>
      </div>
      {todayStats.map(({ agent, done, inProgress }) => (
        <div key={agent.id} className="flex items-center gap-3 px-2.5 py-2" style={{ borderRadius: "2px", background: "var(--th-bg-surface)", border: "1px solid var(--th-border)" }}>
          <AgentAvatar agent={agent} size={24} />
          <span className="flex-1 min-w-0 text-xs font-mono truncate" style={{ color: "var(--th-text-secondary)" }}>
            {language === "ko" ? agent.name_ko || agent.name : agent.name}
          </span>
          {done > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", background: "rgba(52,211,153,0.12)", color: "rgb(110,231,183)" }}>
              ✓ {done}
            </span>
          )}
          {inProgress > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono" style={{ borderRadius: "2px", background: "rgba(251,191,36,0.1)", color: "var(--th-accent)" }}>
              ▶ {inProgress}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
