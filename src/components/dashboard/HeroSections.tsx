import AgentAvatar from "../AgentAvatar";
import type { Agent } from "../../types";
import { getRankTier, RankBadge, XpBar, type TFunction } from "./model";

export interface HudStat {
  id: string;
  label: string;
  value: number | string;
  sub: string;
  color: string;
  icon: string;
}

export interface RankedAgent {
  id: string;
  name: string;
  department: string;
  tasksDone: number;
  xp: number;
}

interface DashboardHeroHeaderProps {
  companyName: string;
  time: string;
  date: string;
  briefing: string;
  reviewQueue: number;
  numberFormatter: Intl.NumberFormat;
  primaryCtaEyebrow: string;
  primaryCtaDescription: string;
  primaryCtaLabel: string;
  onPrimaryCtaClick: () => void;
  t: TFunction;
}

export function DashboardHeroHeader({
  companyName,
  time,
  date,
  briefing,
  reviewQueue,
  numberFormatter,
  primaryCtaEyebrow,
  primaryCtaDescription,
  primaryCtaLabel,
  onPrimaryCtaClick,
  t,
}: DashboardHeroHeaderProps) {
  return (
    <div className="dashboard-panel relative overflow-hidden rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-[var(--th-text-heading)] sm:text-2xl">
              {companyName}
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-600 [.dark_theme_*]:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 [.dark_theme_*]:bg-emerald-400" />
              {t({ ko: "실시간", en: "Live", ja: "ライブ", zh: "实时" })}
            </span>
          </div>
          <p className="text-sm text-[var(--th-text-muted)]">
            {t({
              ko: "에이전트가 실시간으로 작업을 수행 중입니다.",
              en: "Agents are executing work in real time.",
              ja: "エージェントがリアルタイムで作業を実行中です。",
              zh: "代理正在实时执行任务。",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-3 py-2">
            <span className="font-mono text-lg font-medium text-[var(--th-text-primary)]">{time}</span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span className="rounded border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 text-[10px] text-[var(--th-text-muted)]">
              {date}
            </span>
            <span
              className="rounded border border-blue-500/20 bg-blue-500/5 px-2 py-0.5 text-[10px] text-blue-600 [.dark_theme_*]:text-blue-400"
              title={t({
                ko: "현재 시간대 표시 (오전 브리핑 / 오후 운영 점검 / 저녁 마감 점검)",
                en: "Current time-of-day label (Morning / Afternoon / Evening)",
                ja: "現在の時間帯表示（午前 / 午後 / 夜）",
                zh: "当前时段标签（上午 / 下午 / 晚间）",
              })}
            >
              {briefing}
            </span>
          </div>
          {reviewQueue > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 [.dark_theme_*]:text-amber-400">
              {t({ ko: "검토 대기", en: "In review", ja: "レビュー待ち", zh: "待审核" })} {numberFormatter.format(reviewQueue)}
              {t({ ko: "건", en: "", ja: "件", zh: "项" })}
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-5 rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-primary)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--th-text-muted)]">
              {primaryCtaEyebrow}
            </p>
            <p className="mt-1 text-sm text-[var(--th-text-primary)]">{primaryCtaDescription}</p>
          </div>
          <button
            type="button"
            onClick={onPrimaryCtaClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-0 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 sm:w-auto sm:min-w-[180px]"
          >
            {primaryCtaLabel}
            <span className="text-white/80" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DashboardHudStatsProps {
  hudStats: HudStat[];
  numberFormatter: Intl.NumberFormat;
}

export function DashboardHudStats({ hudStats, numberFormatter }: DashboardHudStatsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {hudStats.map((stat) => (
        <div
          key={stat.id}
          className="dashboard-panel relative overflow-hidden rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--th-text-muted)]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--th-text-primary)]">
                {typeof stat.value === "number" ? numberFormatter.format(stat.value) : stat.value}
              </p>
              <p className="mt-0.5 text-xs text-[var(--th-text-muted)]">{stat.sub}</p>
            </div>
            <span
              className="h-9 w-9 flex-shrink-0 rounded-lg"
              style={{ backgroundColor: `${stat.color}18`, borderLeft: `3px solid ${stat.color}` }}
              aria-hidden
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DashboardRankingBoardProps {
  topAgents: RankedAgent[];
  podiumOrder: RankedAgent[];
  agentMap: Map<string, Agent>;
  agents: Agent[];
  maxXp: number;
  numberFormatter: Intl.NumberFormat;
  t: TFunction;
  /** When true, render only content (no panel/title). For use inside CollapsibleSection. */
  embedded?: boolean;
}

export function DashboardRankingBoard({
  topAgents,
  podiumOrder,
  agentMap,
  agents,
  maxXp,
  numberFormatter,
  t,
  embedded,
}: DashboardRankingBoardProps) {
  const content = topAgents.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-sm text-[var(--th-text-muted)]">
          <p>
            {t({
              ko: "등록된 에이전트가 없습니다.",
              en: "No agents registered.",
              ja: "登録されたエージェントがいません。",
              zh: "暂无已注册代理。",
            })}
          </p>
          <p className="text-xs">
            {t({
              ko: "에이전트를 추가한 뒤 작업을 시작하세요.",
              en: "Add agents and start tasks.",
              ja: "エージェントを追加してタスクを開始しましょう。",
              zh: "添加代理并开始任务。",
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {topAgents.length >= 2 && (
            <div className="flex items-end justify-center gap-6 pb-2 sm:gap-8">
              {podiumOrder.map((agent, visualIdx) => {
                const ranks = topAgents.length >= 3 ? [2, 1, 3] : [2, 1];
                const rank = ranks[visualIdx];
                const tier = getRankTier(agent.xp);
                const isFirst = rank === 1;
                const avatarSize = isFirst ? 56 : 44;
                const podiumH = isFirst ? "h-20" : rank === 2 ? "h-14" : "h-10";

                return (
                  <div key={agent.id} className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium text-[var(--th-text-muted)]">#{rank}</span>
                    <div
                      className="overflow-hidden rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-primary)]"
                      style={{ borderColor: `${tier.color}40` }}
                    >
                      <AgentAvatar agent={agentMap.get(agent.id)} agents={agents} size={avatarSize} rounded="xl" />
                    </div>
                    <span className="max-w-[72px] truncate text-center text-xs font-medium text-[var(--th-text-primary)]">
                      {agent.name}
                    </span>
                    <span className="font-mono text-[10px] font-medium" style={{ color: tier.color }}>
                      {numberFormatter.format(agent.xp)} XP
                    </span>
                    <div
                      className={`${podiumH} flex w-16 items-center justify-center rounded-t-md sm:w-20`}
                      style={{
                        background: `linear-gradient(to top, ${tier.color}15, ${tier.color}08)`,
                        border: `1px solid ${tier.color}30`,
                        borderBottom: "none",
                      }}
                    >
                      <span className="text-sm font-semibold opacity-70" style={{ color: tier.color }}>
                        {rank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {topAgents.length > 3 && (
            <div className="space-y-2 border-t border-[var(--th-border)] pt-4">
              {topAgents.slice(3).map((agent, idx) => {
                const rank = idx + 4;
                const tier = getRankTier(agent.xp);
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 rounded-lg border border-[var(--th-border)] bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]"
                    style={{ borderLeftWidth: "3px", borderLeftColor: `${tier.color}50` }}
                  >
                    <span className="w-6 text-center font-mono text-xs font-medium text-[var(--th-text-muted)]">
                      #{rank}
                    </span>
                    <div className="flex-shrink-0 overflow-hidden rounded-lg border border-[var(--th-border)]">
                      <AgentAvatar agent={agentMap.get(agent.id)} agents={agents} size={32} rounded="lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--th-text-primary)]">{agent.name}</p>
                      <p className="text-[10px] text-[var(--th-text-muted)]">
                        {agent.department || t({ ko: "미지정", en: "Unassigned", ja: "未指定", zh: "未指定" })}
                      </p>
                    </div>
                    <div className="hidden w-24 sm:block">
                      <XpBar xp={agent.xp} maxXp={maxXp} color={tier.color} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium" style={{ color: tier.color }}>
                        {numberFormatter.format(agent.xp)}
                      </span>
                      <RankBadge xp={agent.xp} size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {topAgents.length === 1 && (() => {
            const agent = topAgents[0];
            const tier = getRankTier(agent.xp);
            return (
              <div
                className="flex items-center gap-4 rounded-lg border border-[var(--th-border)] p-4"
                style={{ backgroundColor: `${tier.color}08`, borderColor: `${tier.color}30` }}
              >
                <div className="overflow-hidden rounded-xl border border-[var(--th-border)]">
                  <AgentAvatar agent={agentMap.get(agent.id)} agents={agents} size={48} rounded="xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--th-text-primary)]">{agent.name}</p>
                  <p className="text-xs text-[var(--th-text-muted)]">
                    {agent.department || t({ ko: "미지정", en: "Unassigned", ja: "未指定", zh: "未指定" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold" style={{ color: tier.color }}>
                    {numberFormatter.format(agent.xp)} XP
                  </p>
                  <RankBadge xp={agent.xp} size="sm" />
                </div>
              </div>
            );
          })()}
        </div>
      );

  if (embedded) {
    return <div className="relative">{content}</div>;
  }

  return (
    <div className="dashboard-panel relative overflow-hidden rounded-xl border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--th-text-heading)]">
            {t({ ko: "에이전트 순위", en: "Agent ranking", ja: "エージェント順位", zh: "代理排名" })}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--th-text-muted)]">
            {t({ ko: "XP 기준", en: "By XP", ja: "XP 基準", zh: "按 XP" })}
          </p>
        </div>
        {topAgents.length > 0 && (
          <span className="rounded border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--th-text-muted)]">
            Top {topAgents.length}
          </span>
        )}
      </div>
      {content}
    </div>
  );
}
