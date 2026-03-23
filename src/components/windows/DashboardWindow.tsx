import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Users, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  ChevronRight,
  Target,
  PlayCircle,
  LayoutGrid,
  BarChart3
} from "lucide-react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { getGlobalCostSummary, type GlobalCostSummary } from "../../api/cost-summary";
import type { Task } from "../../types";

// ── 포맷 헬퍼 (원본 로직 유지) ───────────────────────────────────────────────────────────
const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);
const fmtUsd   = (n: number) => `$${n.toFixed(2)}`;
const fmtPct   = (a: number, b: number) => b === 0 ? "0%" : `${Math.round((a / b) * 100)}%`;
const dayLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

// ── 애니메이션 & 스타일 상수 ─────────────────────────────────────────────────────────────
const ANIM_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  },
};

// ── 공통 카드 컴포넌트 (디자인만 현대화) ──────────────────────────────────────────────────
function ModernCard({ children, title, icon: Icon, span = "span 1" }: { children: React.ReactNode; title: string; icon: any; span?: string }) {
  return (
    <motion.div
      variants={ANIM_VARIANTS.item}
      style={{
        gridColumn: span,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 24,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 8 }}>
          <Icon size={14} className="text-blue-600" />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4B5563" }}>
          {title}
        </span>
      </div>
      <div style={{ color: "#111827" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Overview Tab - 원본 컴포넌트 복구 및 디자인 고도화
// ════════════════════════════════════════════════════════════════════════════

function ProjectHealthSection() {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openWindow } = useUiStore();

  const cur = projects.find((p) => p.id === currentProjectId) ?? null;
  const src = currentProjectId ? tasks.filter((tk) => tk.project_id === currentProjectId) : tasks;
  
  const done = src.filter((tk) => tk.status === "done").length;
  const inProgress = src.filter((tk) => tk.status === "in_progress" || tk.status === "collaborating").length;
  const review = src.filter((tk) => tk.status === "review").length;
  const planned = src.filter((tk) => tk.status === "planned" || tk.status === "inbox").length;
  const total = src.length || 1;

  const pct = Math.round((done / total) * 100);

  const segments = [
    { label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }), count: done, color: "#10B981" },
    { label: t({ ko: "진행", en: "Progress", ja: "進行中", zh: "进行中" }), count: inProgress, color: "#fbbf24" },
    { label: t({ ko: "검토", en: "Review", ja: "検討", zh: "评审" }), count: review, color: "#3B82F6" },
    { label: t({ ko: "계획", en: "Planned", ja: "計画", zh: "计划" }), count: planned, color: "var(--th-text-muted)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.05em", color: "var(--th-text-heading)" }}>{pct}%</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{src.length}</div>
          <div style={{ fontSize: 10, color: "var(--th-text-muted)", textTransform: "uppercase" }}>Total Tasks</div>
        </div>
      </div>

      <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 100, overflow: "hidden", display: "flex" }}>
        {segments.map((seg, i) => seg.count > 0 && (
          <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${(seg.count / total) * 100}%` }}
            style={{ height: "100%", background: seg.color }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: seg.color }} />
            <span style={{ fontSize: 11, color: "var(--th-text-secondary)" }}>
              <span style={{ fontWeight: 700, color: seg.color }}>{seg.count}</span> {seg.label}
            </span>
          </div>
        ))}
      </div>

      <button onClick={() => openWindow("tasks")} style={{
        marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "#F9FAFB", border: "1px solid #E5E7EB",
        borderRadius: 14, cursor: "pointer", transition: "all 0.2s"
      }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{cur?.name || t({ ko: "전체 프로젝트", en: "All Projects", ja: "全プロジェクト", zh: "所有项目" })}</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function AgentStatusSection() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { setSelectedAgentId } = useUiStore();
  
  const working = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle").length;
  const total = agents.length || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 80, height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <motion.circle cx="40" cy="40" r="34" fill="none" stroke="#10B981" strokeWidth="6" strokeDasharray="213.6" 
              initial={{ strokeDashoffset: 213.6 }} animate={{ strokeDashoffset: 213.6 - (213.6 * (working / total)) }} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", fontSize: 18, fontWeight: 900 }}>{working}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
            <span style={{ fontSize: 12, color: "var(--th-text-primary)", fontWeight: 600 }}>{working} {t({ ko: "작업 중", en: "Working", ja: "稼働中", zh: "工作中" })}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fbbf24" }} />
            <span style={{ fontSize: 12, color: "var(--th-text-secondary)" }}>{idle} {t({ ko: "대기", en: "Idle", ja: "待機", zh: "空闲" })}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {agents.slice(0, 3).map((a) => (
          <button key={a.id} onClick={() => setSelectedAgentId(a.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 12,
            background: "rgba(255,255,255,0.02)", border: "1px solid var(--th-glass-border-subtle)",
            cursor: "pointer", textAlign: "left", transition: "all 0.2s"
          }}>
            <span style={{ fontSize: 18 }}>{a.avatar_emoji}</span>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>{a.name}</span>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.status === "working" ? "#10B981" : "#fbbf24" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CostCardSection() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const [cost, setCost] = useState<GlobalCostSummary | null>(null);

  useEffect(() => {
    getGlobalCostSummary().then(setCost).catch(() => {});
  }, []);

  const topAgents = useMemo(() =>
    [...(cost?.agentBreakdown ?? [])].sort((a, b) => b.thisMonthUsd - a.thisMonthUsd).slice(0, 3),
    [cost]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: "var(--th-accent)" }}>{cost ? fmtUsd(cost.thisMonthUsd) : "$0.00"}</span>
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontWeight: 700 }}>MONTHLY EST.</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {topAgents.map((item, idx) => {
          const agent = agents.find((a) => a.id === item.agentId);
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14 }}>{agent?.avatar_emoji || "🤖"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: "var(--th-text-secondary)" }}>{item.name}</span>
                  <span style={{ fontWeight: 700 }}>{fmtUsd(item.thisMonthUsd)}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: "70%" }} style={{ height: "100%", background: "var(--th-accent)" }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Execution Tab - 원본 타임라인 복구
// ════════════════════════════════════════════════════════════════════════════

function ExecutionPipelineTab() {
  const { t } = useI18n();
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();
  const { currentProjectId } = useProjectStore();

  const projectTasks = useMemo(() => 
    currentProjectId
      ? tasks.filter((tk) => tk.project_id === currentProjectId).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
      : tasks.slice(0, 20).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)),
    [tasks, currentProjectId]
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px", background: "#F9FAFB" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {projectTasks.map((tk, idx) => {
          const agent = agents.find((a) => a.id === tk.assigned_agent_id);
          const isDone = tk.status === "done";
          const isRunning = tk.status === "in_progress";
          const color = isDone ? "#10B981" : isRunning ? "#3B82F6" : "#D1D5DB";

          return (
            <div key={tk.id} style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
                <div style={{ 
                  width: isRunning ? 12 : 8, height: isRunning ? 12 : 8, borderRadius: "50%", 
                  background: color, boxShadow: isRunning ? `0 0 12px ${color}40` : "none",
                  zIndex: 2, marginTop: 8
                }} />
                {idx < projectTasks.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: "#E5E7EB", margin: "4px 0" }} />
                )}
              </div>
              <div style={{ flex: 1, paddingBottom: 32 }}>
                <div style={{ 
                  background: isRunning ? "#EBF5FF" : "transparent",
                  padding: isRunning ? "16px 20px" : "0",
                  borderRadius: 16,
                  border: isRunning ? "1px solid #BFDBFE" : "none"
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isDone ? "#9CA3AF" : "#111827", textDecoration: isDone ? "line-through" : "none" }}>
                    {tk.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    {agent && <span style={{ fontWeight: 600 }}>{agent.avatar_emoji} {agent.name}</span>}
                    <span style={{ opacity: 0.3 }}>•</span>
                    <span>{new Date(tk.created_at ?? 0).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Agents Tab - 원본 에이전트 리스트 복구
// ════════════════════════════════════════════════════════════════════════════

function AgentActivityTab() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { setSelectedAgentId } = useUiStore();

  const activity = useMemo(() => agents.map(agent => {
    const agentTasks = tasks.filter(tk => tk.assigned_agent_id === agent.id);
    const done = agentTasks.filter(tk => tk.status === "done").length;
    return { agent, done, total: agentTasks.length };
  }).sort((a, b) => b.done - a.done), [agents, tasks]);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "32px", background: "#F9FAFB" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {activity.map(({ agent, done, total }, idx) => (
          <motion.button key={agent.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedAgentId(agent.id)}
            style={{
              display: "flex", alignItems: "center", gap: 16, padding: "20px",
              background: "#FFFFFF", border: "1px solid #E5E7EB",
              borderRadius: 20, textAlign: "left", cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#F0F7FF";
              e.currentTarget.style.borderColor = "#BFDBFE";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.borderColor = "#E5E7EB";
            }}
          >
            <div style={{ fontSize: 28, width: 48, height: 48, background: "#F3F4F6", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {agent.avatar_emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, fontWeight: 600 }}>{done} / {total} {t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" })}</div>
            </div>
            <ChevronRight size={18} style={{ color: "#D1D5DB" }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 메인 대시보드 창
// ════════════════════════════════════════════════════════════════════════════

export default function DashboardWindow() {
  const { t } = useI18n();
  const [activeTabId, setActiveTabId] = useState("overview");

  const overviewContent = (
    <motion.div 
      initial="hidden" animate="visible" variants={ANIM_VARIANTS.container}
      style={{ height: "100%", overflowY: "auto", padding: "24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "min-content", gap: "20px" }}
    >
      <ModernCard title={t({ ko: "프로젝트 헬스", en: "Project Health", ja: "プロジェクト状態", zh: "项目健康" })} icon={Activity} span="span 2">
        <ProjectHealthSection />
      </ModernCard>

      <ModernCard title={t({ ko: "에이전트 상태", en: "Agent Status", ja: "エージェント状態", zh: "代理状态" })} icon={Users}>
        <AgentStatusSection />
      </ModernCard>

      <ModernCard title={t({ ko: "비용 요약", en: "Cost Summary", ja: "コスト", zh: "费用 요약" })} icon={DollarSign}>
        <CostCardSection />
      </ModernCard>

      <ModernCard title={t({ ko: "시스템 성능", en: "Performance", ja: "性能", zh: "性能" })} icon={Zap}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--th-success)" }}>98.2%</div>
          <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>Workspace Reliability</div>
        </div>
      </ModernCard>

      <ModernCard title={t({ ko: "데이터 트래픽", en: "Traffic", ja: "トラフィック", zh: "流量" })} icon={TrendingUp}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 900 }}>Optimal</div>
          <div style={{ fontSize: 11, color: "var(--th-text-muted)" }}>0.42ms average latency</div>
        </div>
      </ModernCard>
    </motion.div>
  );

  return (
    <AppWindow
      windowType="dashboard"
      title={t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "控制台" })}
      emoji="◈"
      defaultWidth={1080}
      defaultHeight={720}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      tabs={[
        { id: "overview", label: t({ ko: "개요", en: "Overview", ja: "概要", zh: "概览" }), content: overviewContent },
        { id: "execution", label: t({ ko: "실행", en: "Execution", ja: "実行", zh: "执行" }), content: <ExecutionPipelineTab /> },
        { id: "agents", label: t({ ko: "인력", en: "Agents", ja: "エージェント", zh: "代理" }), content: <AgentActivityTab /> },
        { id: "cost", label: t({ ko: "비용", en: "Cost", ja: "コスト", zh: "费用" }), content: <div style={{padding: 32}}><CostCardSection /></div> },
      ]}
    />
  );
}
