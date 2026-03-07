import { useMemo, useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Agent, CompanyStats, Task } from "../types";
import { localeName, useI18n } from "../i18n";
import {
  DashboardHeroHeader,
  DashboardHudStats,
  DashboardRankingBoard,
  type HudStat,
  type RankedAgent,
} from "./dashboard/HeroSections";
import { DashboardDeptAndSquad, DashboardMissionLog, DashboardActivePersonas, DashboardTodaySummary, type DepartmentPerformance } from "./dashboard/OpsSections";
import { CollapsibleSection } from "./dashboard/CollapsibleSection";
import { DEPT_COLORS, useNow } from "./dashboard/model";
import ProviderHealthPanel from "./dashboard/ProviderHealthPanel";
import { DashboardCalendar } from "./dashboard/CalendarWidget";
import { DashboardInsights } from "./dashboard/InsightsWidget";

const SECTION_ORDER_KEY = "agentdesk_dashboard_order";
const DEFAULT_SECTION_ORDER: SectionKey[] = ["overview", "metrics", "insights", "ranking", "personas", "dept", "mission", "today", "calendar", "providers"];

function loadSectionOrder(): SectionKey[] {
  try {
    const raw = localStorage.getItem(SECTION_ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as SectionKey[];
    }
  } catch { /* ignore */ }
  return DEFAULT_SECTION_ORDER;
}

interface SortableWrapperProps {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}

function SortableWrapper({ id, children }: SortableWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dragHandle = (
    <div
      {...attributes}
      {...listeners}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        cursor: "grab",
        color: "var(--th-text-muted)",
        fontSize: "14px",
        flexShrink: 0,
        opacity: 0.5,
        touchAction: "none",
      }}
      title="Drag to reorder"
    >
      ⠿
    </div>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}

type SectionKey = "overview" | "metrics" | "ranking" | "personas" | "dept" | "mission" | "providers" | "today" | "calendar" | "insights";

interface DashboardProps {
  stats: CompanyStats | null;
  agents: Agent[];
  tasks: Task[];
  companyName: string;
  onPrimaryCtaClick: () => void;
}

const defaultSectionsOpen: Record<SectionKey, boolean> = {
  overview: true,
  metrics: true,
  ranking: true,
  personas: true,
  dept: true,
  mission: true,
  providers: true,
  today: true,
  calendar: true,
  insights: true,
};

export default function Dashboard({ stats, agents, tasks, companyName, onPrimaryCtaClick }: DashboardProps) {
  const { t, language, locale: localeTag } = useI18n();
  const { date, time, briefing } = useNow(localeTag, t);
  const [sectionOpen, setSectionOpen] = useState<Record<SectionKey, boolean>>(defaultSectionsOpen);
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(loadSectionOrder);
  const toggleSection = useCallback((key: SectionKey) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as SectionKey);
        const newIndex = prev.indexOf(over.id as SectionKey);
        const next = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem(SECTION_ORDER_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);
  const agentMap = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(localeTag), [localeTag]);

  const totalTasks = stats?.tasks?.total ?? tasks.length;
  const completedTasks = stats?.tasks?.done ?? tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = stats?.tasks?.in_progress ?? tasks.filter((task) => task.status === "in_progress").length;
  const plannedTasks = stats?.tasks?.planned ?? tasks.filter((task) => task.status === "planned").length;
  const reviewTasks = stats?.tasks?.review ?? tasks.filter((task) => task.status === "review").length;
  const pendingTasks = tasks.filter((task) => task.status === "pending").length;
  const activeAgents = stats?.agents?.working ?? agents.filter((agent) => agent.status === "working").length;
  const idleAgents = stats?.agents?.idle ?? agents.filter((agent) => agent.status === "idle").length;
  const totalAgents = stats?.agents?.total ?? agents.length;
  const completionRate =
    stats?.tasks?.completion_rate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const activeRate = totalAgents > 0 ? Math.round((activeAgents / totalAgents) * 100) : 0;
  const reviewQueue = reviewTasks + pendingTasks;

  const primaryCtaLabel = t({ ko: "미션 시작", en: "Start Mission", ja: "ミッション開始", zh: "开始任务" });
  const primaryCtaEyebrow = t({ ko: "빠른 실행", en: "Quick Start", ja: "クイック開始", zh: "快速开始" });
  const primaryCtaDescription = t({
    ko: "핵심 업무를 바로 생성하고 실행으로 전환하세요",
    en: "Create a priority task and move execution immediately.",
    ja: "最優先タスクをすぐ作成して実行へ移行します。",
    zh: "立即创建优先任务并进入执行。",
  });

  const deptData = useMemo<DepartmentPerformance[]>(() => {
    if (stats?.tasks_by_department && stats.tasks_by_department.length > 0) {
      return stats.tasks_by_department
        .map((department, idx) => ({
          id: department.id,
          name: department.name,
          icon: department.icon ?? "🏢",
          done: department.done_tasks,
          total: department.total_tasks,
          ratio: department.total_tasks > 0 ? Math.round((department.done_tasks / department.total_tasks) * 100) : 0,
          color: DEPT_COLORS[idx % DEPT_COLORS.length],
        }))
        .sort((a, b) => b.ratio - a.ratio || b.total - a.total);
    }

    const deptMap = new Map<string, { name: string; icon: string; done: number; total: number }>();
    for (const agent of agents) {
      if (!agent.department_id) continue;
      if (!deptMap.has(agent.department_id)) {
        deptMap.set(agent.department_id, {
          name: agent.department ? localeName(language, agent.department) : agent.department_id,
          icon: agent.department?.icon ?? "🏢",
          done: 0,
          total: 0,
        });
      }
    }
    for (const task of tasks) {
      if (!task.department_id) continue;
      const entry = deptMap.get(task.department_id);
      if (!entry) continue;
      entry.total += 1;
      if (task.status === "done") entry.done += 1;
    }
    return Array.from(deptMap.entries())
      .map(([id, value], idx) => ({
        id,
        ...value,
        ratio: value.total > 0 ? Math.round((value.done / value.total) * 100) : 0,
        color: DEPT_COLORS[idx % DEPT_COLORS.length],
      }))
      .sort((a, b) => b.ratio - a.ratio || b.total - a.total);
  }, [stats, agents, tasks, language]);

  const topAgents = useMemo<RankedAgent[]>(() => {
    if (stats?.top_agents && stats.top_agents.length > 0) {
      return stats.top_agents.slice(0, 5).map((topAgent) => {
        const agent = agentMap.get(topAgent.id);
        return {
          id: topAgent.id,
          name: agent ? localeName(language, agent) : topAgent.name,
          department: agent?.department ? localeName(language, agent.department) : "",
          tasksDone: topAgent.stats_tasks_done,
          xp: topAgent.stats_xp,
        };
      });
    }
    return [...agents]
      .sort((a, b) => b.stats_xp - a.stats_xp)
      .slice(0, 5)
      .map((agent) => ({
        id: agent.id,
        name: localeName(language, agent),
        department: agent.department ? localeName(language, agent.department) : "",
        tasksDone: agent.stats_tasks_done,
        xp: agent.stats_xp,
      }));
  }, [stats, agents, agentMap, language]);

  const maxXp = topAgents.length > 0 ? Math.max(...topAgents.map((agent) => agent.xp), 1) : 1;
  const recentTasks = useMemo(() => [...tasks].sort((a, b) => b.updated_at - a.updated_at).slice(0, 6), [tasks]);
  const workingAgents = agents.filter((agent) => agent.status === "working");
  const idleAgentsList = agents.filter((agent) => agent.status === "idle");

  const podiumOrder =
    topAgents.length >= 3
      ? [topAgents[1], topAgents[0], topAgents[2]]
      : topAgents.length === 2
        ? [topAgents[1], topAgents[0]]
        : topAgents;

  const hudStats: HudStat[] = [
    {
      id: "total",
      label: t({ ko: "미션", en: "MISSIONS", ja: "ミッション", zh: "任务" }),
      value: totalTasks,
      sub: t({ ko: "누적 태스크", en: "Total tasks", ja: "累積タスク", zh: "累计任务" }),
      color: "#06b6d4",
      icon: "TSK",
    },
    {
      id: "clear",
      label: t({ ko: "완료율", en: "CLEAR RATE", ja: "クリア率", zh: "完成率" }),
      value: `${completionRate}%`,
      sub: `${numberFormatter.format(completedTasks)} ${t({ ko: "클리어", en: "cleared", ja: "クリア", zh: "完成" })}`,
      color: "#10b981",
      icon: "CLR",
    },
    {
      id: "squad",
      label: t({ ko: "스쿼드", en: "SQUAD", ja: "スクワッド", zh: "小队" }),
      value: `${activeAgents}/${totalAgents}`,
      sub: `${t({ ko: "가동률", en: "uptime", ja: "稼働率", zh: "运行率" })} ${activeRate}%`,
      color: "#00f0ff",
      icon: "AGT",
    },
    {
      id: "active",
      label: t({ ko: "진행중", en: "IN PROGRESS", ja: "進行中", zh: "进行中" }),
      value: inProgressTasks,
      sub: `${t({ ko: "계획", en: "planned", ja: "計画", zh: "计划" })} ${numberFormatter.format(plannedTasks)}${t({
        ko: "건",
        en: "",
        ja: "件",
        zh: "项",
      })}`,
      color: "#f59e0b",
      icon: "RUN",
    },
  ];

  const agentsWithPersona = agents.filter((a) => a.persona_id);

  const sectionTitles = {
    overview: t({ ko: "요약", en: "Overview", ja: "概要", zh: "概览" }),
    metrics: t({ ko: "핵심 지표", en: "Key metrics", ja: "主要指標", zh: "关键指标" }),
    ranking: t({ ko: "에이전트 순위", en: "Agent ranking", ja: "エージェント順位", zh: "代理排名" }),
    personas: t({ ko: "활성 페르소나", en: "Active personas", ja: "アクティブペルソナ", zh: "活跃角色" }),
    dept: t({ ko: "부서 성과 · 스쿼드", en: "Department & squad", ja: "部署・スクワッド", zh: "部门与小队" }),
    mission: t({ ko: "최근 활동", en: "Recent activity", ja: "最近の活動", zh: "最近活动" }),
    providers: t({ ko: "프로바이더 상태", en: "Provider health", ja: "プロバイダー状態", zh: "提供商状态" }),
    today: t({ ko: "오늘의 작업 요약", en: "Today's activity", ja: "本日の作業", zh: "今日工作汇总" }),
    calendar: t({ ko: "활동 캘린더", en: "Activity calendar", ja: "アクティビティカレンダー", zh: "活动日历" }),
    insights: t({ ko: "AI 인사이트", en: "AI insights", ja: "AIインサイト", zh: "AI洞察" }),
  };

  const renderSectionContent = useCallback((key: SectionKey, dragHandle: ReactNode) => {
    switch (key) {
      case "overview":
        return (
          <CollapsibleSection id="overview" title={sectionTitles.overview} open={sectionOpen.overview} onToggle={() => toggleSection("overview")} dragHandle={dragHandle}>
            <DashboardHeroHeader companyName={companyName} time={time} date={date} briefing={briefing} reviewQueue={reviewQueue} numberFormatter={numberFormatter} primaryCtaEyebrow={primaryCtaEyebrow} primaryCtaDescription={primaryCtaDescription} primaryCtaLabel={primaryCtaLabel} onPrimaryCtaClick={onPrimaryCtaClick} t={t} />
          </CollapsibleSection>
        );
      case "metrics":
        return (
          <CollapsibleSection id="metrics" title={sectionTitles.metrics} open={sectionOpen.metrics} onToggle={() => toggleSection("metrics")} dragHandle={dragHandle}>
            <DashboardHudStats hudStats={hudStats} numberFormatter={numberFormatter} />
          </CollapsibleSection>
        );
      case "insights":
        return (
          <CollapsibleSection id="insights" title={sectionTitles.insights} open={sectionOpen.insights} onToggle={() => toggleSection("insights")} dragHandle={dragHandle}>
            <DashboardInsights tasks={tasks} agents={agents} language={language} t={t} />
          </CollapsibleSection>
        );
      case "ranking":
        return (
          <CollapsibleSection id="ranking" title={sectionTitles.ranking} subtitle={t({ ko: "XP 기준", en: "By XP", ja: "XP 基準", zh: "按 XP" })} right={topAgents.length > 0 ? (<span className="px-2 py-0.5 font-mono text-[10px] font-medium" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>Top {topAgents.length}</span>) : undefined} open={sectionOpen.ranking} onToggle={() => toggleSection("ranking")} dragHandle={dragHandle}>
            <DashboardRankingBoard topAgents={topAgents} podiumOrder={podiumOrder} agentMap={agentMap} agents={agents} maxXp={maxXp} numberFormatter={numberFormatter} t={t} embedded />
          </CollapsibleSection>
        );
      case "personas":
        return (
          <CollapsibleSection id="personas" title={sectionTitles.personas} subtitle={t({ ko: "페르소나 지정 에이전트", en: "Persona-assigned agents", ja: "ペルソナ割り当てエージェント", zh: "角色分配代理" })} right={agentsWithPersona.length > 0 ? (<span className="px-2 py-0.5 font-mono text-[10px] font-medium" style={{ border: "1px solid var(--th-border)", borderRadius: "2px", background: "var(--th-bg-primary)", color: "var(--th-text-muted)" }}>{agentsWithPersona.length}</span>) : undefined} open={sectionOpen.personas} onToggle={() => toggleSection("personas")} dragHandle={dragHandle}>
            <DashboardActivePersonas agents={agents} language={language} t={t} />
          </CollapsibleSection>
        );
      case "dept":
        return (
          <CollapsibleSection id="dept" title={sectionTitles.dept} open={sectionOpen.dept} onToggle={() => toggleSection("dept")} dragHandle={dragHandle}>
            <DashboardDeptAndSquad deptData={deptData} workingAgents={workingAgents} idleAgentsList={idleAgentsList} agents={agents} language={language} numberFormatter={numberFormatter} t={t} />
          </CollapsibleSection>
        );
      case "mission":
        return (
          <CollapsibleSection id="mission" title={sectionTitles.mission} right={<span className="rounded border border-[var(--th-border)] bg-[var(--th-bg-primary)] px-2 py-0.5 text-[10px] font-medium text-[var(--th-text-muted)]">{t({ ko: "유휴", en: "Idle", ja: "待機", zh: "空闲" })} {numberFormatter.format(idleAgents)}</span>} open={sectionOpen.mission} onToggle={() => toggleSection("mission")} dragHandle={dragHandle}>
            <DashboardMissionLog recentTasks={recentTasks} agentMap={agentMap} agents={agents} language={language} localeTag={localeTag} idleAgents={idleAgents} numberFormatter={numberFormatter} t={t} embedded />
          </CollapsibleSection>
        );
      case "today":
        return (
          <CollapsibleSection id="today" title={sectionTitles.today} open={sectionOpen.today} onToggle={() => toggleSection("today")} dragHandle={dragHandle}>
            <DashboardTodaySummary agents={agents} tasks={tasks} language={language} t={t} />
          </CollapsibleSection>
        );
      case "calendar":
        return (
          <CollapsibleSection id="calendar" title={sectionTitles.calendar} open={sectionOpen.calendar} onToggle={() => toggleSection("calendar")} dragHandle={dragHandle}>
            <DashboardCalendar tasks={tasks} t={t} />
          </CollapsibleSection>
        );
      case "providers":
        return (
          <CollapsibleSection id="providers" title={sectionTitles.providers} open={sectionOpen.providers} onToggle={() => toggleSection("providers")} dragHandle={dragHandle}>
            <ProviderHealthPanel />
          </CollapsibleSection>
        );
    }
  }, [sectionTitles, sectionOpen, toggleSection, companyName, time, date, briefing, reviewQueue, numberFormatter, primaryCtaEyebrow, primaryCtaDescription, primaryCtaLabel, onPrimaryCtaClick, t, hudStats, tasks, agents, language, topAgents, podiumOrder, agentMap, maxXp, agentsWithPersona, deptData, workingAgents, idleAgentsList, idleAgents, localeTag, recentTasks]);

  return (
    <motion.section
      className="relative isolate space-y-4"
      style={{ color: "var(--th-text-primary)" }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.14, ease: "linear" }}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sectionOrder.map((key) => (
              <SortableWrapper key={key} id={key}>
                {(dragHandle) => renderSectionContent(key, dragHandle) ?? null}
              </SortableWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </motion.section>
  );
}
