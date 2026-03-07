import { useMemo } from "react";
import type { Agent, Task } from "../../types";
import { localeName } from "../../i18n";
import type { TFunction } from "../taskboard/constants";

interface Props {
  tasks: Task[];
  agents: Agent[];
  language: string;
  t: TFunction;
}

interface Insight {
  id: string;
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone: "positive" | "neutral" | "warning" | "critical";
}

function weekStart(offsetWeeks = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() - offsetWeeks * 7);
  return d.getTime();
}

function healthBar(score: number): string {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export function DashboardInsights({ tasks, agents, language, t }: Props) {
  const insights = useMemo<Insight[]>(() => {
    const now = Date.now();
    const thisWeekStart = weekStart(0);
    const lastWeekStart = weekStart(1);

    const doneTasks = tasks.filter((tk) => tk.status === "done" && tk.completed_at);
    const thisWeekDone = doneTasks.filter((tk) => tk.completed_at! >= thisWeekStart);
    const lastWeekDone = doneTasks.filter(
      (tk) => tk.completed_at! >= lastWeekStart && tk.completed_at! < thisWeekStart,
    );

    // ── 1. 이번 주 MVP 에이전트 ──
    const agentDoneCount = new Map<string, number>();
    for (const tk of thisWeekDone) {
      if (tk.assigned_agent_id) {
        agentDoneCount.set(tk.assigned_agent_id, (agentDoneCount.get(tk.assigned_agent_id) ?? 0) + 1);
      }
    }
    let mvpAgent: Agent | null = null;
    let mvpCount = 0;
    for (const [id, count] of agentDoneCount) {
      if (count > mvpCount) {
        mvpCount = count;
        mvpAgent = agents.find((a) => a.id === id) ?? null;
      }
    }

    // ── 2. 완료율 주간 트렌드 ──
    const thisWeekCreated = tasks.filter((tk) => tk.created_at >= thisWeekStart).length;
    const lastWeekCreated = tasks.filter(
      (tk) => tk.created_at >= lastWeekStart && tk.created_at < thisWeekStart,
    ).length;
    const thisRate = thisWeekCreated > 0 ? Math.round((thisWeekDone.length / thisWeekCreated) * 100) : 0;
    const lastRate = lastWeekCreated > 0 ? Math.round((lastWeekDone.length / lastWeekCreated) * 100) : 0;
    const rateDelta = thisRate - lastRate;

    // ── 3. 병목 감지 (review + planned 체류 >24h) ──
    const stuckThreshold = 24 * 3_600_000;
    const stuckTasks = tasks.filter(
      (tk) =>
        (tk.status === "review" || tk.status === "planned") &&
        now - tk.updated_at > stuckThreshold,
    );

    // ── 4. 가장 활발한 완료 시간대 ──
    const hourBuckets = new Array<number>(24).fill(0);
    for (const tk of doneTasks) {
      if (tk.completed_at) {
        const h = new Date(tk.completed_at).getHours();
        hourBuckets[h]++;
      }
    }
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));
    const peakCount = hourBuckets[peakHour];

    // ── 5. 시스템 헬스 스코어 ──
    const totalAgents = agents.length;
    const workingAgents = agents.filter((a) => a.status === "working").length;
    const activeRate = totalAgents > 0 ? workingAgents / totalAgents : 0;
    const completionRate = tasks.length > 0 ? doneTasks.length / tasks.length : 0;
    const recentActivity = thisWeekDone.length > 0 ? Math.min(thisWeekDone.length / 5, 1) : 0;
    const healthScore = Math.round(
      (completionRate * 0.4 + activeRate * 0.35 + recentActivity * 0.25) * 100,
    );

    // ── 6. 평균 태스크 처리 시간 ──
    const completedWithTime = doneTasks.filter((tk) => tk.started_at && tk.completed_at);
    const avgMs =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, tk) => sum + (tk.completed_at! - tk.started_at!), 0) /
          completedWithTime.length
        : 0;
    const avgHours = Math.round(avgMs / 3_600_000);

    const result: Insight[] = [];

    // MVP
    if (mvpAgent && mvpCount > 0) {
      result.push({
        id: "mvp",
        icon: "★",
        label: t({ ko: "이번 주 MVP", en: "This Week MVP", ja: "今週MVP", zh: "本周MVP" }),
        value: localeName(language, mvpAgent),
        sub: `${mvpCount} ${t({ ko: "건 완료", en: "tasks done", ja: "件完了", zh: "项完成" })}`,
        tone: "positive",
      });
    } else {
      result.push({
        id: "mvp",
        icon: "★",
        label: t({ ko: "이번 주 MVP", en: "This Week MVP", ja: "今週MVP", zh: "本周MVP" }),
        value: t({ ko: "데이터 없음", en: "No data", ja: "データなし", zh: "无数据" }),
        tone: "neutral",
      });
    }

    // 완료율 트렌드
    result.push({
      id: "trend",
      icon: rateDelta >= 0 ? "▲" : "▼",
      label: t({ ko: "주간 완료율", en: "Weekly completion", ja: "週間完了率", zh: "周完成率" }),
      value: `${thisRate}%`,
      sub:
        lastRate > 0
          ? `${rateDelta >= 0 ? "+" : ""}${rateDelta}% ${t({ ko: "전주 대비", en: "vs last week", ja: "前週比", zh: "对比上周" })}`
          : t({ ko: "이번 주 첫 데이터", en: "First week data", ja: "今週初データ", zh: "本周首次数据" }),
      tone: rateDelta >= 0 ? "positive" : "warning",
    });

    // 병목
    result.push({
      id: "stuck",
      icon: "⚠",
      label: t({ ko: "지연 태스크", en: "Stalled tasks", ja: "滞留タスク", zh: "滞留任务" }),
      value: String(stuckTasks.length),
      sub:
        stuckTasks.length > 0
          ? t({ ko: ">24h 정체 (review/planned)", en: ">24h in review/planned", ja: ">24h 滞留", zh: ">24h未处理" })
          : t({ ko: "병목 없음", en: "No bottleneck", ja: "ボトルネックなし", zh: "无瓶颈" }),
      tone: stuckTasks.length === 0 ? "positive" : stuckTasks.length < 3 ? "warning" : "critical",
    });

    // 피크 시간대
    if (peakCount > 0) {
      const peakEnd = (peakHour + 1) % 24;
      result.push({
        id: "peak",
        icon: "◈",
        label: t({ ko: "최고 활동 시간대", en: "Peak activity hour", ja: "最高活動時間帯", zh: "活跃高峰时段" }),
        value: `${String(peakHour).padStart(2, "0")}:00–${String(peakEnd).padStart(2, "0")}:00`,
        sub: `${peakCount} ${t({ ko: "건 완료", en: "completions", ja: "件完了", zh: "项完成" })}`,
        tone: "neutral",
      });
    }

    // 평균 처리 시간
    if (avgHours > 0) {
      result.push({
        id: "avgtime",
        icon: "◷",
        label: t({ ko: "평균 처리 시간", en: "Avg task duration", ja: "平均処理時間", zh: "平均处理时间" }),
        value: avgHours >= 24 ? `${Math.round(avgHours / 24)}d` : `${avgHours}h`,
        sub: `${completedWithTime.length} ${t({ ko: "건 기준", en: "tasks measured", ja: "件基準", zh: "项基准" })}`,
        tone: avgHours < 2 ? "positive" : avgHours < 8 ? "neutral" : "warning",
      });
    }

    // 시스템 헬스
    result.push({
      id: "health",
      icon: "◉",
      label: t({ ko: "시스템 헬스", en: "System health", ja: "システムヘルス", zh: "系统健康" }),
      value: `${healthScore}/100`,
      sub: healthBar(healthScore),
      tone: healthScore >= 70 ? "positive" : healthScore >= 40 ? "warning" : "critical",
    });

    return result;
  }, [tasks, agents, language, t]);

  const toneColors: Record<Insight["tone"], { border: string; bg: string; icon: string; value: string }> = {
    positive: {
      border: "rgba(52,211,153,0.35)",
      bg: "rgba(52,211,153,0.06)",
      icon: "rgb(52,211,153)",
      value: "rgb(167,243,208)",
    },
    neutral: {
      border: "var(--th-border)",
      bg: "var(--th-bg-elevated)",
      icon: "var(--th-accent)",
      value: "var(--th-text-primary)",
    },
    warning: {
      border: "rgba(251,191,36,0.35)",
      bg: "rgba(251,191,36,0.06)",
      icon: "var(--th-accent)",
      value: "var(--th-accent)",
    },
    critical: {
      border: "rgba(244,63,94,0.35)",
      bg: "rgba(244,63,94,0.06)",
      icon: "rgb(253,164,175)",
      value: "rgb(253,164,175)",
    },
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {insights.map((ins) => {
        const colors = toneColors[ins.tone];
        return (
          <div
            key={ins.id}
            className="flex items-start gap-3 p-3"
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.bg,
              borderRadius: "2px",
              borderLeft: `3px solid ${colors.icon}`,
            }}
          >
            <span className="mt-0.5 text-sm font-mono shrink-0" style={{ color: colors.icon }}>
              {ins.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
                {ins.label}
              </div>
              <div className="mt-0.5 text-sm font-bold font-mono truncate" style={{ color: colors.value }}>
                {ins.value}
              </div>
              {ins.sub && (
                <div
                  className="mt-0.5 text-[10px] font-mono truncate"
                  style={{
                    color: ins.id === "health" ? colors.icon : "var(--th-text-muted)",
                    letterSpacing: ins.id === "health" ? "0" : undefined,
                    fontFeatureSettings: ins.id === "health" ? "'tnum'" : undefined,
                  }}
                >
                  {ins.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
