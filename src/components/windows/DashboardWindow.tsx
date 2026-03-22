import { useEffect, useMemo, useRef, useState } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useTheme } from "../../ThemeContext";
import { useI18n } from "../../i18n";
import { getGlobalCostSummary, type GlobalCostSummary } from "../../api/cost-summary";
import type { Task } from "../../types";

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────────
const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);
const fmtUsd   = (n: number) => `$${n.toFixed(2)}`;
const fmtPct   = (a: number, b: number) => b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;
const dayLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

// ── smooth bezier ─────────────────────────────────────────────────────────────
function smoothLinePath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(i - 2, 0)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(i + 1, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

// ── 도넛 arc path ─────────────────────────────────────────────────────────────
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const GAP = 0.12;
  const sa = startAngle + GAP, ea = endAngle - GAP;
  if (ea <= sa) return "";
  const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

// ── 애니메이션 ────────────────────────────────────────────────────────────────
const ANIM = `
@keyframes dashDraw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRing {
  0%   { r: 3;   opacity: 0.9; }
  70%  { r: 6.5; opacity: 0;   }
  100% { r: 6.5; opacity: 0;   }
}
`;

const SANS: React.CSSProperties = { fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" };
const MONO: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

// ── 테마별 색상 헬퍼 ──────────────────────────────────────────────────────────
function useColors() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  return {
    isLight,
    // 카드 배경
    cardBg:        isLight ? "rgba(0,0,0,0.03)"              : "rgba(255,255,255,0.04)",
    cardBorder:    "var(--th-border)",
    cardShadow:    isLight
      ? "0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
      : "0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)",
    // 텍스트
    label:         "var(--th-text-muted)",
    textPrimary:   "var(--th-text-primary)",
    textSecondary: "var(--th-text-secondary)",
    textHeading:   "var(--th-text-heading)",
    // 행/항목 배경
    rowBg:         isLight ? "rgba(0,0,0,0.03)"  : "rgba(255,255,255,0.03)",
    rowBorder:     isLight ? "rgba(0,0,0,0.06)"  : "rgba(255,255,255,0.05)",
    // 진행바 트랙
    trackBg:       isLight ? "rgba(0,0,0,0.08)"  : "rgba(255,255,255,0.08)",
    // 버튼
    pillBg:        isLight ? "rgba(0,0,0,0.06)"  : "rgba(255,255,255,0.06)",
    pillBgHov:     isLight ? "rgba(0,0,0,0.1)"   : "rgba(255,255,255,0.1)",
    pillColor:     isLight ? "rgba(0,0,0,0.5)"   : "rgba(255,255,255,0.5)",
    pillColorHov:  isLight ? "rgba(0,0,0,0.85)"  : "rgba(255,255,255,0.9)",
    // 도넛 track
    donutTrack:    isLight ? "rgba(0,0,0,0.06)"  : "rgba(255,255,255,0.06)",
    // 오프라인 세그먼트
    donutOffline:  isLight ? "rgba(0,0,0,0.12)"  : "rgba(255,255,255,0.12)",
    // 구분선
    divider:       isLight ? "rgba(0,0,0,0.07)"  : "rgba(255,255,255,0.06)",
  };
}

// ── 카드 컴포넌트 ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const c = useColors();
  return (
    <div style={{
      background: c.cardBg,
      border: `1px solid ${c.cardBorder}`,
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: c.cardShadow,
      minHeight: 0,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── 섹션 라벨 ─────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...SANS, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "var(--th-text-muted)",
      marginBottom: 14, flexShrink: 0 }}>
      {children}
    </div>
  );
}

// ── 큰 숫자 블록 ──────────────────────────────────────────────────────────────
function Stat({ value, sub, color }: { value: string; sub: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ ...SANS, fontSize: 26, fontWeight: 700, lineHeight: 1,
        letterSpacing: "-0.02em", color: color ?? "var(--th-text-heading)" }}>
        {value}
      </span>
      <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-secondary)", fontWeight: 400 }}>
        {sub}
      </span>
    </div>
  );
}

// ── Pill 버튼 ─────────────────────────────────────────────────────────────────
function PillBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const c = useColors();
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...SANS, fontSize: 11, fontWeight: 500, padding: "5px 14px",
        borderRadius: 100, cursor: "pointer", transition: "all 0.15s",
        border: `1px solid ${c.cardBorder}`,
        background: hov ? c.pillBgHov : c.pillBg,
        color: hov ? c.pillColorHov : c.pillColor,
      }}>
      {label}
    </button>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ tasks, projectId }: { tasks: Task[]; projectId: string | null }) {
  const W = 220, H = 52, PX = 4, PY = 6;
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
    return d;
  }), []);

  const counts = useMemo(() => {
    const src = projectId ? tasks.filter((t) => t.project_id === projectId) : tasks;
    return days.map((day) => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      return src.filter((t) => {
        if (t.status !== "done") return false;
        const ms = t.updated_at ? +new Date(t.updated_at)
                 : t.created_at ? +new Date(t.created_at) : 0;
        return ms >= +day && ms < +next;
      }).length;
    });
  }, [tasks, days, projectId]);

  const maxVal = Math.max(...counts, 1);
  const pts: [number, number][] = counts.map((c, i) => [
    PX + (i / 6) * (W - PX * 2),
    H - PY - (c / maxVal) * (H - PY * 2),
  ]);
  const linePath = smoothLinePath(pts);
  const areaPath = linePath + ` L${pts[6][0]},${H} L${pts[0][0]},${H} Z`;

  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, [linePath]);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 12}`} preserveAspectRatio="xMidYMid meet"
         style={{ display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#34d399" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-g)" />
      <path ref={pathRef} d={linePath} fill="none"
        stroke="#34d399" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"
        style={pathLen > 0 ? {
          strokeDasharray: pathLen, strokeDashoffset: pathLen,
          animation: "dashDraw 1s ease-out 0.1s forwards",
        } : undefined}
      />
      {pts.map(([x, y], i) => counts[i] > 0 && (
        <g key={i}>
          <circle cx={x} cy={y} r={2} fill="#34d399" opacity={0.9} />
          {i === 6 && (
            <circle cx={x} cy={y} r={2} fill="none" stroke="#34d399" strokeWidth={1.5}
              style={{ animation: "pulseRing 2s ease-out infinite" }} />
          )}
        </g>
      ))}
      <text x={PX}     y={H + 12} fontSize={8} fill="var(--th-text-muted)" fontFamily="monospace">{dayLabel(days[0])}</text>
      <text x={W - PX} y={H + 12} fontSize={8} fill="var(--th-text-muted)" fontFamily="monospace" textAnchor="end">{dayLabel(days[6])}</text>
    </svg>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ working, idle, offline }: { working: number; idle: number; offline: number }) {
  const c = useColors();
  const total = working + idle + offline || 1;
  const CX = 42, CY = 42, R = 33, SW = 5;
  const segs = [
    { value: working, color: "#34d399" },
    { value: idle,    color: "#fbbf24" },
    { value: offline, color: c.donutOffline },
  ];
  let angle = -Math.PI / 2;
  const paths = segs.map((s) => {
    const sweep = (s.value / total) * Math.PI * 2;
    const path  = arcPath(CX, CY, R, angle, angle + sweep);
    angle += sweep;
    return { ...s, path };
  });
  const pct = Math.round((working / total) * 100);
  return (
    <svg width={84} height={84} style={{ flexShrink: 0 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={c.donutTrack} strokeWidth={SW} />
      {paths.map((seg, i) => seg.value > 0 && seg.path ? (
        <path key={i} d={seg.path} fill="none"
          stroke={seg.color} strokeWidth={SW} strokeLinecap="butt"
          opacity={0} style={{ animation: `fadeSlide 0.3s ease-out ${i * 0.07}s forwards` }} />
      ) : null)}
      <text x={CX} y={CY - 3} textAnchor="middle" fontSize={14} fontWeight={700}
        fill="var(--th-text-heading)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {pct}%
      </text>
      <text x={CX} y={CY + 11} textAnchor="middle" fontSize={8} fill="var(--th-text-muted)"
        fontFamily="monospace" letterSpacing="0.1em">
        ACTIVE
      </text>
    </svg>
  );
}

// ── Cost Bar ──────────────────────────────────────────────────────────────────
function CostBar({ items, agents }: {
  items: { agentId: string; name: string; thisMonthUsd: number }[];
  agents: { id: string; avatar_emoji: string }[];
}) {
  const c = useColors();
  const maxUsd = Math.max(...items.map((i) => i.thisMonthUsd), 0.001);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((item, idx) => {
        const agent = agents.find((a) => a.id === item.agentId);
        const pct   = (item.thisMonthUsd / maxUsd) * 100;
        return (
          <div key={item.agentId} style={{ display: "flex", alignItems: "center", gap: 10,
            animation: `fadeSlide 0.28s ease-out ${idx * 0.06}s both` }}>
            <span style={{ fontSize: 14, flexShrink: 0, width: 22, textAlign: "center" }}>
              {agent?.avatar_emoji ?? "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }}>
                  {item.name}
                </span>
                <span style={{ ...MONO, fontSize: 11, fontWeight: 600, color: "var(--th-accent)", flexShrink: 0, marginLeft: 8 }}>
                  {fmtUsd(item.thisMonthUsd)}
                </span>
              </div>
              <div style={{ height: 3, background: c.trackBg, borderRadius: 100, overflow: "hidden" }}>
                <div style={{
                  width: mounted ? `${pct}%` : "0%", height: "100%", borderRadius: 100,
                  background: "linear-gradient(90deg, rgba(245,158,11,0.5), var(--th-accent))",
                  transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Overview 카드들
// ════════════════════════════════════════════════════════════════════════════

function ProjectHealthCard() {
  const { t } = useI18n();
  const c = useColors();
  const { projects, currentProjectId } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openWindow } = useUiStore();

  const cur   = projects.find((p) => p.id === currentProjectId) ?? null;
  const src   = currentProjectId ? tasks.filter((tk) => tk.project_id === currentProjectId) : tasks;
  const done  = src.filter((tk) => tk.status === "done").length;
  const total = src.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct >= 70 ? "#34d399" : pct >= 40 ? "var(--th-accent)" : "#f87171";

  const planned    = src.filter((tk) => tk.status === "planned").length;
  const inProgress = src.filter((tk) => tk.status === "in_progress").length;
  const review     = src.filter((tk) => tk.status === "review").length;

  const segments = [
    { label: t({ ko: "완료", en: "Done", ja: "完了", zh: "完成" }),     count: done,       color: "#34d399" },
    { label: t({ ko: "진행", en: "Progress", ja: "進行", zh: "进行" }), count: inProgress, color: "#fbbf24" },
    { label: t({ ko: "검토", en: "Review", ja: "検討", zh: "审核" }),   count: review,     color: "#38bdf8" },
    { label: t({ ko: "계획", en: "Planned", ja: "計画", zh: "计划" }),  count: planned,    color: "var(--th-text-muted)" },
  ];

  return (
    <Card>
      <Label>{t({ ko: "프로젝트", en: "Project Health", ja: "プロジェクト", zh: "项目健康" })}</Label>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-end", marginBottom: 12 }}>
        <Stat value={fmtPct(done, total)} sub={t({ ko: "완료율", en: "completion", ja: "完了率", zh: "完成率" })} color={barColor} />
        <Stat value={String(total)} sub={t({ ko: "태스크", en: "tasks", ja: "タスク", zh: "任务" })} />
        <Stat value={String(projects.length)} sub={t({ ko: "프로젝트", en: "projects", ja: "PJ", zh: "项目" })} />
      </div>
      {/* 상태별 스택 바 */}
      <div style={{ height: 6, background: c.trackBg, borderRadius: 100, overflow: "hidden", marginBottom: 14, display: "flex" }}>
        {segments.map((seg) => seg.count > 0 && (
          <div key={seg.label} style={{
            width: `${(seg.count / Math.max(total, 1)) * 100}%`, height: "100%",
            background: seg.color, transition: "width 0.6s ease",
          }} />
        ))}
      </div>
      {/* 범례 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-secondary)" }}>
              <span style={{ fontWeight: 600, color: seg.color }}>{seg.count}</span>
              {" "}{seg.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-muted)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
          {cur ? cur.name : t({ ko: "프로젝트 미선택", en: "No project selected", ja: "未選択", zh: "未选择" })}
        </span>
        <PillBtn label={t({ ko: "보드", en: "Open Board", ja: "ボード", zh: "看板" })} onClick={() => openWindow("tasks")} />
      </div>
    </Card>
  );
}

function AgentStatusCard({ onSwitchTab }: { onSwitchTab?: (id: string) => void }) {
  const { t } = useI18n();
  const c = useColors();
  const { agents: allAgents } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { setSelectedAgentId } = useUiStore();

  const agents = useMemo(
    () => currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
      ? allAgents.filter((a) => projectAgentIds.has(a.id))
      : allAgents,
    [allAgents, currentProjectId, projectAgentIds, projectAgentsLoaded],
  );

  const working = agents.filter((a) => a.status === "working").length;
  const idle    = agents.filter((a) => a.status === "idle").length;
  const offline = agents.filter((a) => a.status === "offline" || a.status === "break").length;
  const top3    = [...agents].sort((a, b) => (b.stats_tasks_done ?? 0) - (a.stats_tasks_done ?? 0)).slice(0, 3);

  const legend = [
    { label: t({ ko: "작업중", en: "Working", ja: "作業中", zh: "工作中" }), val: working, color: "#34d399" },
    { label: t({ ko: "대기",   en: "Idle",    ja: "待機",  zh: "空闲"   }), val: idle,    color: "#fbbf24" },
    { label: t({ ko: "오프",   en: "Offline", ja: "オフ",  zh: "离线"   }), val: offline, color: "var(--th-text-muted)" },
  ];

  return (
    <Card>
      <Label>{t({ ko: "에이전트", en: "Agent Status", ja: "エージェント", zh: "代理状态" })}</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <Donut working={working} idle={idle} offline={offline} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {legend.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span style={{ ...SANS, fontSize: 12, color: "var(--th-text-secondary)" }}>
                <span style={{ fontWeight: 600, color: item.color }}>{item.val}</span>
                {" "}{item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {top3.map((a) => (
          <button key={a.id} type="button" onClick={() => setSelectedAgentId(a.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", borderRadius: 8,
              background: c.rowBg, border: `1px solid ${c.rowBorder}`,
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.pillBgHov; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = c.rowBg; }}
          >
            <span style={{ fontSize: 14 }}>{a.avatar_emoji}</span>
            <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-primary)", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <span style={{ ...MONO, fontSize: 10, color: "#34d399" }}>{a.stats_tasks_done ?? 0}</span>
          </button>
        ))}
        {agents.length === 0 && (
          <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "에이전트 없음", en: "No agents", ja: "なし", zh: "无" })}
          </span>
        )}
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <PillBtn label={t({ ko: "에이전트 관리", en: "Manage", ja: "管理", zh: "管理" })} onClick={() => onSwitchTab?.("agents")} />
      </div>
    </Card>
  );
}

function ActiveWorkCard({ onSwitchTab }: { onSwitchTab?: (id: string) => void }) {
  const { t } = useI18n();
  const c = useColors();
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();
  const { projects: projectList } = useProjectStore();

  const statusMeta: Record<string, { label: string; color: string }> = {
    in_progress:   { label: t({ ko: "진행", en: "Running", ja: "進行", zh: "进行" }),  color: "#fbbf24" },
    collaborating: { label: t({ ko: "협업", en: "Collab",  ja: "協働", zh: "协作" }),  color: "#a78bfa" },
    review:        { label: t({ ko: "검토", en: "Review",  ja: "検討", zh: "审核" }),  color: "#38bdf8" },
  };

  const active = tasks
    .filter((tk) => ["in_progress", "collaborating", "review"].includes(tk.status ?? ""))
    .slice(0, 4);

  const inProgressCount = tasks.filter((tk) => tk.status === "in_progress").length;
  const doneCount       = tasks.filter((tk) => tk.status === "done").length;
  const reviewCount     = tasks.filter((tk) => tk.status === "review").length;
  const plannedCount    = tasks.filter((tk) => tk.status === "planned").length;

  const statItems = [
    { value: inProgressCount, label: t({ ko: "진행", en: "progress", ja: "進行", zh: "进行" }),  color: "#fbbf24" },
    { value: doneCount,       label: t({ ko: "완료", en: "done", ja: "完了", zh: "完成" }),       color: "#34d399" },
    { value: reviewCount,     label: t({ ko: "수신", en: "review", ja: "受信", zh: "收件" }),     color: "#38bdf8" },
    { value: plannedCount,    label: t({ ko: "계획", en: "planned", ja: "計画", zh: "计划" }),    color: "var(--th-text-muted)" },
  ];

  return (
    <Card>
      <Label>{t({ ko: "진행 중인 작업", en: "Active Work", ja: "進行中の作業", zh: "活动任务" })}</Label>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        {statItems.map((s) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ ...SANS, fontSize: 20, fontWeight: 700, lineHeight: 1, color: s.color }}>{s.value}</span>
            <span style={{ ...SANS, fontSize: 10, color: "var(--th-text-secondary)" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {active.length === 0 ? (
          <div style={{ ...SANS, fontSize: 12, color: "var(--th-text-muted)", paddingTop: 8 }}>
            {t({ ko: "진행 중인 태스크 없음", en: "No active tasks", ja: "進行中なし", zh: "无任务" })}
          </div>
        ) : active.map((tk, i) => {
          const meta  = statusMeta[tk.status ?? ""] ?? statusMeta.in_progress;
          const agent = agents.find((a) => a.id === tk.assigned_agent_id);
          const proj  = projectList.find((p) => p.id === tk.project_id);
          return (
            <div key={tk.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              background: c.rowBg, border: `1px solid ${c.rowBorder}`,
              animation: `fadeSlide 0.22s ease-out ${i * 0.04}s both`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
              <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-primary)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tk.title}
              </span>
              {agent && <span style={{ fontSize: 12, flexShrink: 0 }}>{agent.avatar_emoji}</span>}
              {proj && (
                <span style={{ ...SANS, fontSize: 9, color: "var(--th-text-muted)",
                  background: c.rowBg, border: `1px solid ${c.rowBorder}`,
                  borderRadius: 4, padding: "1px 6px", flexShrink: 0,
                  maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {proj.name}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <PillBtn label={t({ ko: "실행 보기", en: "Execution", ja: "実行", zh: "执行" })} onClick={() => onSwitchTab?.("execution")} />
      </div>
    </Card>
  );
}

function CostCard({ onSwitchTab }: { onSwitchTab?: (id: string) => void }) {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const [cost, setCost] = useState<GlobalCostSummary | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getGlobalCostSummary().then((c) => { if (mounted.current) setCost(c); }).catch(() => {});
    return () => { mounted.current = false; };
  }, []);

  const top4 = useMemo(() =>
    [...(cost?.agentBreakdown ?? [])].sort((a, b) => b.thisMonthUsd - a.thisMonthUsd).slice(0, 4),
    [cost]);

  return (
    <Card>
      <Label>{t({ ko: "비용", en: "Cost Summary", ja: "コスト", zh: "费用" })}</Label>
      <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
        <Stat value={cost ? fmtUsd(cost.thisMonthUsd) : "—"} sub={t({ ko: "이번달", en: "this month", ja: "今月", zh: "本月" })} color="var(--th-accent)" />
        <Stat value={cost ? fmtTokens(cost.totalTokens) : "—"} sub={t({ ko: "총 토큰", en: "total tokens", ja: "総トークン", zh: "总令牌" })} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {!cost ? (
          <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "로딩 중...", en: "Loading...", ja: "読込中...", zh: "加载中..." })}
          </span>
        ) : top4.length === 0 ? (
          <span style={{ ...SANS, fontSize: 11, color: "var(--th-text-muted)" }}>
            {t({ ko: "기록 없음", en: "No data", ja: "記録なし", zh: "无记录" })}
          </span>
        ) : (
          <CostBar items={top4} agents={agents} />
        )}
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        <PillBtn label={t({ ko: "비용 상세", en: "Cost Details", ja: "コスト詳細", zh: "费用详情" })} onClick={() => onSwitchTab?.("cost")} />
      </div>
    </Card>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Execution Pipeline 탭
// ════════════════════════════════════════════════════════════════════════════
function ExecutionPipelineTab() {
  const { t } = useI18n();
  const c = useColors();
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();
  const { projects, currentProjectId } = useProjectStore();
  const { openWindow } = useUiStore();

  const cur = projects.find((p) => p.id === currentProjectId) ?? null;
  const projectTasks = currentProjectId
    ? tasks.filter((tk) => tk.project_id === currentProjectId).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
    : [];
  const doneCount = projectTasks.filter((tk) => tk.status === "done").length;

  const statusColor = (s: string, es?: string | null) => {
    if (s === "done")        return "#34d399";
    if (s === "in_progress") return "#fbbf24";
    if (s === "review")      return "#a78bfa";
    if (es === "failed")     return "#f87171";
    return "var(--th-text-muted)";
  };
  const statusLabel = (s: string, es: string | null) => {
    if (s === "done")        return "done";
    if (s === "in_progress") return es === "running" ? "running" : "exec";
    if (s === "review")      return "review";
    if (es === "failed")     return "error";
    if (s === "planned")     return "planned";
    return s;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{ANIM}</style>
      <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${c.divider}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...SANS, fontSize: 16, fontWeight: 600, color: "var(--th-text-heading)", letterSpacing: "-0.01em" }}>
              {cur?.name ?? t({ ko: "프로젝트 미선택", en: "No project selected", ja: "未選択", zh: "未选择" })}
            </div>
            {cur && (
              <div style={{ ...SANS, fontSize: 11, color: "var(--th-text-muted)", marginTop: 3 }}>
                {doneCount} / {projectTasks.length} {t({ ko: "완료", en: "tasks completed", ja: "完了", zh: "已完成" })}
              </div>
            )}
          </div>
          {cur && <PillBtn label={t({ ko: "보드", en: "Board", ja: "ボード", zh: "看板" })} onClick={() => openWindow("tasks")} />}
        </div>
        {projectTasks.length > 0 && (
          <div style={{ marginTop: 12, height: 3, background: c.trackBg, borderRadius: 100, overflow: "hidden" }}>
            <div style={{
              width: `${(doneCount / projectTasks.length) * 100}%`, height: "100%",
              background: "linear-gradient(90deg, rgba(52,211,153,0.6), #34d399)",
              borderRadius: 100, transition: "width 0.5s ease",
            }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
        {!cur ? (
          <div style={{ ...SANS, fontSize: 13, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 48, lineHeight: 1.6 }}>
            {t({ ko: "프로젝트를 선택하면 실행 파이프라인이 표시됩니다", en: "Select a project to view its execution pipeline", ja: "プロジェクトを選択してください", zh: "选择项目查看执行管线" })}
          </div>
        ) : projectTasks.length === 0 ? (
          <div style={{ ...SANS, fontSize: 13, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 48 }}>
            {t({ ko: "태스크가 없습니다. 킥오프를 실행하세요.", en: "No tasks yet. Run kickoff to begin.", ja: "タスクなし", zh: "无任务" })}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {projectTasks.map((tk, idx) => {
              const agent    = agents.find((a) => a.id === tk.assigned_agent_id);
              const isDone   = tk.status === "done";
              const isRunning = tk.status === "in_progress";
              const isFailed  = tk.execution_state === "failed";
              const color    = statusColor(tk.status, tk.execution_state);
              const dotBg    = isDone ? "#34d399" : isRunning ? "#fbbf24" : isFailed ? "#f87171" : c.trackBg;
              return (
                <div key={tk.id} style={{ display: "flex", alignItems: "stretch" }}>
                  <div style={{ width: 28, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    {idx > 0 && <div style={{ width: 1, flex: "0 0 8px", background: isDone ? "rgba(52,211,153,0.4)" : c.divider }} />}
                    <div style={{
                      width: isRunning ? 10 : 8, height: isRunning ? 10 : 8, borderRadius: "50%", flexShrink: 0,
                      background: dotBg,
                      boxShadow: isRunning ? "0 0 10px #fbbf24" : "none",
                    }} />
                    {idx < projectTasks.length - 1 && <div style={{ width: 1, flex: 1, background: isDone ? "rgba(52,211,153,0.4)" : c.divider }} />}
                  </div>
                  <div style={{
                    flex: 1, padding: "7px 12px", minHeight: 40,
                    display: "flex", alignItems: "center", gap: 10,
                    background: isRunning ? (c.isLight ? "rgba(251,191,36,0.06)" : "rgba(251,191,36,0.05)") : "transparent",
                    borderRadius: 8, margin: "1px 0",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...SANS, fontSize: 12, fontWeight: isRunning ? 600 : 400,
                        color: isDone ? "var(--th-text-muted)" : "var(--th-text-heading)",
                        textDecoration: isDone ? "line-through" : "none",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tk.title}
                      </div>
                    </div>
                    {agent && <span style={{ ...SANS, fontSize: 10, color: "var(--th-text-muted)", flexShrink: 0 }}>{agent.name_ko || agent.name}</span>}
                    <span style={{ ...MONO, fontSize: 9, fontWeight: 600, flexShrink: 0,
                      padding: "2px 7px", borderRadius: 4,
                      color, background: `${color}18`, border: `1px solid ${color}30` }}>
                      {statusLabel(tk.status, tk.execution_state ?? null)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Agent Activity 탭 (에이전트 클릭 → 상세 패널)
// ════════════════════════════════════════════════════════════════════════════
function AgentActivityTab() {
  const { t } = useI18n();
  const c = useColors();
  const { agents: allAgents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();
  const { setSelectedAgentId } = useUiStore();

  const agents = useMemo(
    () => currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
      ? allAgents.filter((a) => projectAgentIds.has(a.id))
      : allAgents,
    [allAgents, currentProjectId, projectAgentIds, projectAgentsLoaded],
  );

  const activity = useMemo(() => {
    return agents.map((agent) => {
      const ag      = tasks.filter((tk) => tk.assigned_agent_id === agent.id);
      const done    = ag.filter((tk) => tk.status === "done").length;
      const running = ag.filter((tk) => tk.status === "in_progress").length;
      const total   = ag.length;
      return { agent, done, running, total };
    }).filter((a) => a.total > 0).sort((a, b) => b.running - a.running || b.done - a.done);
  }, [agents, tasks]);

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "16px 24px" }}>
      <style>{ANIM}</style>
      {activity.length === 0 ? (
        <div style={{ ...SANS, fontSize: 13, color: "var(--th-text-muted)", textAlign: "center", paddingTop: 48 }}>
          {t({ ko: "에이전트 활동 없음", en: "No agent activity yet", ja: "エージェント活動なし", zh: "无代理活动" })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {activity.map(({ agent, done, running, total }, idx) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isRunning = running > 0;
            return (
              <button key={agent.id} type="button"
                onClick={() => setSelectedAgentId(agent.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: 12,
                  border: `1px solid ${isRunning ? "rgba(52,211,153,0.2)" : c.rowBorder}`,
                  background: isRunning
                    ? (c.isLight ? "rgba(52,211,153,0.05)" : "rgba(52,211,153,0.04)")
                    : c.rowBg,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "background 0.15s, box-shadow 0.15s",
                  animation: `fadeSlide 0.24s ease-out ${idx * 0.04}s both`,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = c.pillBgHov;
                  el.style.boxShadow = `0 2px 8px rgba(0,0,0,0.1)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.background = isRunning
                    ? (c.isLight ? "rgba(52,211,153,0.05)" : "rgba(52,211,153,0.04)")
                    : c.rowBg;
                  el.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{agent.avatar_emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...SANS, fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)" }}>
                    {agent.name_ko || agent.name}
                  </div>
                  <div style={{ ...SANS, fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                    {done}/{total} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}
                    {isRunning && (
                      <span style={{ color: "#34d399", marginLeft: 8 }}>
                        {running} {t({ ko: "실행중", en: "running", ja: "実行中", zh: "运行中" })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ width: 72, flexShrink: 0 }}>
                  <div style={{ height: 3, background: c.trackBg, borderRadius: 100, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 100,
                      background: pct >= 70 ? "#34d399" : "var(--th-accent)", transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ ...MONO, fontSize: 9, color: "var(--th-text-muted)", textAlign: "right" }}>{pct}%</div>
                </div>
                {/* 상세 보기 화살표 */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--th-text-muted)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// 메인 창
// ════════════════════════════════════════════════════════════════════════════
export default function DashboardWindow() {
  const { t } = useI18n();
  const [activeTabId, setActiveTabId] = useState("overview");

  const switchTab = (id: string) => setActiveTabId(id);

  const overviewContent = (
    <div style={{ height: "100%", overflow: "hidden", padding: 14, display: "flex", flexDirection: "column" }}>
      <style>{ANIM}</style>
      <div style={{
        flex: 1, minHeight: 0,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 10,
      }}>
        <ProjectHealthCard />
        <AgentStatusCard onSwitchTab={switchTab} />
        <ActiveWorkCard onSwitchTab={switchTab} />
        <CostCard onSwitchTab={switchTab} />
      </div>
    </div>
  );

  return (
    <AppWindow
      windowType="dashboard"
      title={t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "控制台" })}
      emoji="◈"
      defaultWidth={920}
      defaultHeight={600}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      tabs={[
        {
          id: "overview",
          label: t({ ko: "개요", en: "Overview", ja: "概要", zh: "概览" }),
          content: overviewContent,
        },
        {
          id: "execution",
          label: t({ ko: "실행", en: "Execution", ja: "実行", zh: "执行" }),
          content: <ExecutionPipelineTab />,
        },
        {
          id: "agents",
          label: t({ ko: "에이전트", en: "Agents", ja: "エージェント", zh: "代理" }),
          content: <AgentActivityTab />,
        },
        {
          id: "cost",
          label: t({ ko: "비용", en: "Cost", ja: "コスト", zh: "费用" }),
          content: (
            <div style={{ padding: 16, height: "100%", boxSizing: "border-box" }}>
              <style>{ANIM}</style>
              <CostCard />
            </div>
          ),
        },
      ]}
    />
  );
}
