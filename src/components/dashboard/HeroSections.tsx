import { motion } from "framer-motion";
import AgentAvatar from "../AgentAvatar";
import type { Agent } from "../../types";
import { getRankTier, RankBadge, XpBar, type TFunction } from "./model";

const statContainer = { show: { transition: { staggerChildren: 0.06 } } };
const statItem = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.1, ease: "linear" as const } },
};

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
    <div
      className="dashboard-panel relative overflow-hidden"
      style={{ border: "1px solid var(--th-border)", borderRadius: "4px", background: "var(--th-bg-surface)", padding: "1.25rem 1.5rem" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1
              className="text-xl font-semibold sm:text-2xl"
              style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-display)", letterSpacing: "-0.02em" }}
            >
              {companyName}
            </h1>
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
              style={{ border: "1px solid rgba(34,197,94,0.35)", borderRadius: "2px", background: "rgba(34,197,94,0.08)", color: "#22c55e" }}
            >
              <span className="h-1.5 w-1.5 bg-emerald-500" style={{ borderRadius: "1px" }} />
              {t({ ko: "실시간", en: "Live", ja: "ライブ", zh: "实时" })}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--th-text-muted)" }}>
            {t({
              ko: "에이전트가 실시간으로 작업을 수행 중입니다.",
              en: "Agents are executing work in real time.",
              ja: "エージェントがリアルタイムで作業を実行中です。",
              zh: "代理正在实时执行任务。",
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)" }}
          >
            <span className="font-mono text-lg font-medium" style={{ color: "var(--th-text-primary)" }}>{time}</span>
          </div>
          <div className="hidden flex-col gap-1 sm:flex">
            <span
              className="px-2 py-0.5 font-mono text-[10px]"
              style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}
            >
              {date}
            </span>
            <span
              className="px-2 py-0.5 font-mono text-[10px]"
              style={{ border: "1px solid rgba(245,158,11,0.25)", borderRadius: "2px", background: "rgba(245,158,11,0.06)", color: "#f59e0b" }}
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
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium font-mono"
              style={{ border: "1px solid rgba(245,158,11,0.35)", borderRadius: "2px", background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}
            >
              {t({ ko: "검토 대기", en: "In review", ja: "レビュー待ち", zh: "待审核" })} {numberFormatter.format(reviewQueue)}
              {t({ ko: "건", en: "", ja: "件", zh: "项" })}
            </span>
          )}
        </div>
      </div>

      <div
        className="relative mt-5 p-4"
        style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)", borderLeft: "3px solid var(--th-accent, #f59e0b)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p
              className="text-[10px] font-medium uppercase tracking-wider font-mono"
              style={{ color: "var(--th-text-accent)" }}
            >
              {primaryCtaEyebrow}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--th-text-primary)" }}>{primaryCtaDescription}</p>
          </div>
          <button
            type="button"
            onClick={onPrimaryCtaClick}
            className="inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium font-mono sm:w-auto sm:min-w-[180px]"
            style={{
              border: "1px solid rgba(245,158,11,0.5)",
              borderRadius: "2px",
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              transition: "background 0.1s linear, border-color 0.1s linear",
            }}
          >
            {primaryCtaLabel}
            <span aria-hidden="true">→</span>
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
    <motion.div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      variants={statContainer}
      initial="hidden"
      animate="show"
    >
      {hudStats.map((stat) => (
        <motion.div
          key={stat.id}
          variants={statItem}
          className="dashboard-panel relative overflow-hidden"
          style={{
            border: "1px solid var(--th-border)",
            borderLeft: `3px solid ${stat.color}`,
            borderRadius: "4px",
            background: "var(--th-bg-surface)",
            padding: "0.875rem 1rem",
            transition: "border-color 0.1s linear",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="font-mono text-[10px] font-medium uppercase tracking-widest"
                style={{ color: "var(--th-text-muted)" }}
              >
                {stat.label}
              </p>
              <p
                className="mt-1 tabular-nums font-bold"
                style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)", fontSize: "1.625rem", lineHeight: 1.2 }}
              >
                {typeof stat.value === "number" ? numberFormatter.format(stat.value) : stat.value}
              </p>
              <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--th-text-muted)" }}>{stat.sub}</p>
            </div>
            <span
              className="flex-shrink-0"
              style={{
                backgroundColor: `${stat.color}15`,
                border: `1px solid ${stat.color}30`,
                borderRadius: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2.25rem",
                height: "2.25rem",
                fontFamily: "var(--th-font-mono)",
                fontSize: "0.6rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: stat.color,
              }}
              aria-hidden
            >
              {stat.icon}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
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
        <div className="terminal-empty-state min-h-[160px] flex flex-col items-center justify-center">
          <p className="terminal-empty-state-cmd">$ ls agents/ --sort=activity</p>
          <p className="terminal-empty-state-result">(empty)</p>
          <p className="terminal-empty-state-hint">{t({ ko: "에이전트를 추가한 뒤 작업을 시작하세요.", en: "Add agents and start tasks.", ja: "エージェントを追加してタスクを開始しましょう。", zh: "添加代理并开始任务。" })}</p>
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
                      className="overflow-hidden border border-[var(--th-border)] bg-[var(--th-bg-primary)]"
                      style={{ borderColor: `${tier.color}40`, borderRadius: "2px" }}
                    >
                      <AgentAvatar agent={agentMap.get(agent.id)} agents={agents} size={avatarSize} rounded="xl" />
                    </div>
                    <span className="max-w-[72px] truncate text-center text-xs font-medium text-[var(--th-text-primary)]">
                      {agent.name}
                    </span>
                    <span className="font-mono text-[10px] font-medium uppercase tracking-wider" style={{ color: tier.color }}>
                      {numberFormatter.format(agent.xp)} XP
                    </span>
                    <div
                      className={`${podiumH} flex w-16 items-center justify-center sm:w-20`}
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
                    className="flex items-center gap-3 border border-[var(--th-border)] bg-[var(--th-bg-primary)] p-3 transition-colors hover:bg-[var(--th-bg-surface-hover)]"
                    style={{ borderRadius: "2px", borderLeftWidth: "3px", borderLeftColor: `${tier.color}50` }}
                  >
                    <span className="w-6 text-center font-mono text-xs font-medium text-[var(--th-text-muted)]">
                      #{rank}
                    </span>
                    <div className="flex-shrink-0 overflow-hidden border border-[var(--th-border)]" style={{ borderRadius: "2px" }}>
                      <AgentAvatar agent={agentMap.get(agent.id)} agents={agents} size={32} rounded="sm" />
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
                className="flex items-center gap-4 border border-[var(--th-border)] p-4"
                style={{ backgroundColor: `${tier.color}08`, borderColor: `${tier.color}30`, borderRadius: "2px" }}
              >
                <div className="overflow-hidden border border-[var(--th-border)]" style={{ borderRadius: "2px" }}>
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
    <div className="dashboard-panel relative overflow-hidden border border-[var(--th-border)] bg-[var(--th-bg-surface)] p-5" style={{ borderRadius: "4px" }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--th-text-heading)", fontFamily: "var(--th-font-mono)" }}>
            {t({ ko: "에이전트 순위", en: "Agent ranking", ja: "エージェント順位", zh: "代理排名" })}
          </h2>
          <p className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "XP 기준", en: "By XP", ja: "XP 基準", zh: "按 XP" })}
          </p>
        </div>
        {topAgents.length > 0 && (
          <span className="border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--th-text-muted)]" style={{ borderRadius: "2px" }}>
            Top {topAgents.length}
          </span>
        )}
      </div>
      {content}
    </div>
  );
}
