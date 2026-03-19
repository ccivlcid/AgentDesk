import { useEffect, useMemo, useRef, useState } from "react";
import AppWindow from "./AppWindow";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useI18n } from "../../i18n";
import { getGlobalCostSummary, type GlobalCostSummary } from "../../api/cost-summary";
import type { Task } from "../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

// ── 포맷 헬퍼 ────────────────────────────────────────────────────────────────
const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtPct = (a: number, b: number) => b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;
const dayLabel = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

// ── smooth bezier — catmull-rom → cubic bezier 변환 ───────────────────────
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

// ── 도넛 세그먼트 arc path 계산 ───────────────────────────────────────────
function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const GAP_RAD = 0.06; // 세그먼트 간 간격 (라디안)
  const sa = startAngle + GAP_RAD;
  const ea = endAngle   - GAP_RAD;
  if (ea <= sa) return "";
  const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa);
  const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea);
  const large = ea - sa > Math.PI ? 1 : 0;
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

// ── CSS 애니메이션 ────────────────────────────────────────────────────────
const DASH_ANIM_STYLE = `
@keyframes dashDraw {
  from { stroke-dashoffset: 1; }
  to   { stroke-dashoffset: 0; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse-ring {
  0%   { r: 3;   opacity: 0.9; }
  70%  { r: 6.5; opacity: 0;   }
  100% { r: 6.5; opacity: 0;   }
}
`;

// ── 섹션 헤더 ────────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ ...mono, fontSize: 9, color: "var(--th-text-secondary)", letterSpacing: "0.1em",
                  marginBottom: 14, flexShrink: 0 }}>
      // {label}
    </div>
  );
}

// ── StatBlock ────────────────────────────────────────────────────────────────
function StatBlock({ value, label, color, glow }: { value: string; label: string; color?: string; glow?: boolean }) {
  const c = color ?? "var(--th-text-heading)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{
        ...mono, fontSize: 22, fontWeight: 700, lineHeight: 1, color: c,
        textShadow: glow ? `0 0 12px ${c}` : undefined,
      }}>
        {value}
      </span>
      <span style={{ ...mono, fontSize: 9, color: "var(--th-text-secondary)", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

// ── 링크 버튼 ────────────────────────────────────────────────────────────────
function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ ...mono, fontSize: 10, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
        transition: "all 0.15s", letterSpacing: "0.03em",
        border: `1px solid ${hov ? "var(--th-accent)" : "var(--th-border)"}`,
        background: hov ? "rgba(245,158,11,0.1)" : "transparent",
        color: hov ? "var(--th-accent)" : "var(--th-text-muted)",
        boxShadow: hov ? "0 0 10px rgba(245,158,11,0.15)" : "none",
      }}>
      › {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 차트 1 — Smooth Sparkline
// ════════════════════════════════════════════════════════════════════════════
function Sparkline({ tasks, projectId }: { tasks: Task[]; projectId: string | null }) {
  const W = 220, H = 56, PX = 6, PY = 8;
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      return d;
    });
  }, []);

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

  const gradId = "spark-grad";
  const maskId = "spark-mask";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
         style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
        </linearGradient>
        <clipPath id={maskId}>
          <rect x={PX} y={0} width={W - PX * 2} height={H} />
        </clipPath>
      </defs>

      {/* 가로 격자 */}
      {[0.33, 0.67, 1].map((r) => {
        const gy = H - PY - r * (H - PY * 2);
        return <line key={r} x1={PX} y1={gy} x2={W - PX} y2={gy}
          stroke="var(--th-border)" strokeWidth={1} strokeDasharray="3 4" />;
      })}

      {/* 면적 fill */}
      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${maskId})`} />

      {/* 라인 — 드로잉 애니메이션 */}
      <path ref={pathRef} d={linePath} fill="none"
        stroke="#22c55e" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round"
        style={pathLen > 0 ? {
          strokeDasharray: pathLen,
          strokeDashoffset: pathLen,
          animation: "dashDraw 1s ease-out 0.1s forwards",
        } : undefined}
      />

      {/* 데이터 포인트 */}
      {pts.map(([x, y], i) => counts[i] > 0 && (
        <g key={i}>
          <circle cx={x} cy={y} r={2.5} fill="#22c55e" />
          {/* 마지막 포인트에 펄스 */}
          {i === 6 && (
            <circle cx={x} cy={y} r={3} fill="none" stroke="#22c55e" strokeWidth={1.5}
              style={{ animation: "pulse-ring 2s ease-out infinite" }} />
          )}
        </g>
      ))}

      {/* X축 날짜 */}
      <text x={PX}     y={H + 1} fontSize={7.5} style={{ fill: "var(--th-text-secondary)" }} fontFamily="monospace">{dayLabel(days[0])}</text>
      <text x={W - PX} y={H + 1} fontSize={7.5} style={{ fill: "var(--th-text-secondary)" }} fontFamily="monospace" textAnchor="end">{dayLabel(days[6])}</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 차트 2 — Refined Donut
// ════════════════════════════════════════════════════════════════════════════
function DonutChart({ working, idle, offline }: { working: number; idle: number; offline: number }) {
  const total = working + idle + offline || 1;
  const CX = 38, CY = 38, R = 29, SW = 6;
  const TWO_PI = Math.PI * 2;
  // strokeLinecap="butt" 기준: 간격이 온전히 보이려면 GAP_RAD > SW/2/R
  // SW=6 → 최소 0.103. 0.14로 여유있게 설정
  const GAP_RAD_DONUT = 0.14;

  const segs = [
    { value: working, color: "#10b981", glow: true  },
    { value: idle,    color: "#f59e0b", glow: false },
    { value: offline, color: "#475569", glow: false },
  ];

  let angle = -Math.PI / 2;
  const paths = segs.map((s) => {
    const sweep = (s.value / total) * TWO_PI;
    const path  = arcPath(CX, CY, R, angle, angle + sweep);
    angle += sweep;
    return { ...s, path };
  });

  const pctWorking = Math.round((working / total) * 100);

  return (
    <svg width={76} height={76} style={{ flexShrink: 0, overflow: "visible" }}>
      <defs>
        {/* working 세그먼트 글로우만 정의 */}
        <filter id="donut-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* 배경 링 */}
      <circle cx={CX} cy={CY} r={R} fill="none"
        stroke="var(--th-border)" strokeWidth={SW} />

      {/* 세그먼트 — butt 캡으로 간격을 정확히 유지 */}
      {paths.map((seg, i) =>
        seg.value > 0 && seg.path ? (
          <path key={i} d={seg.path} fill="none"
            stroke={seg.color} strokeWidth={SW} strokeLinecap="butt"
            filter={seg.glow ? "url(#donut-glow)" : undefined}
            opacity={0}
            style={{ animation: `fadeUp 0.35s ease-out ${i * 0.08}s forwards` }}
          />
        ) : null
      )}

      {/* 중심 퍼센트 */}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize={13} fontWeight={700}
        fill="var(--th-text-heading)" fontFamily="monospace">
        {pctWorking}%
      </text>
      <text x={CX} y={CY + 9} textAnchor="middle" fontSize={7}
        style={{ fill: "var(--th-text-secondary)" }} fontFamily="monospace" letterSpacing="0.08em">
        ACTIVE
      </text>
    </svg>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// 차트 4 — Cost Horizontal Bar
// ════════════════════════════════════════════════════════════════════════════
function CostBarChart({ items, agents }: {
  items: { agentId: string; name: string; thisMonthUsd: number }[];
  agents: { id: string; avatar_emoji: string }[];
}) {
  const maxUsd = Math.max(...items.map((i) => i.thisMonthUsd), 0.001);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, idx) => {
        const agent = agents.find((a) => a.id === item.agentId);
        const pct   = (item.thisMonthUsd / maxUsd) * 100;
        return (
          <div key={item.agentId} style={{ display: "flex", alignItems: "center", gap: 8,
            animation: `fadeUp 0.3s ease-out ${idx * 0.07}s both` }}>
            <span style={{ fontSize: 13, flexShrink: 0, width: 20, textAlign: "center" }}>
              {agent?.avatar_emoji ?? "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                  {item.name}
                </span>
                <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: "var(--th-accent)",
                  flexShrink: 0, marginLeft: 6, textShadow: "0 0 8px rgba(245,158,11,0.5)" }}>
                  {fmtUsd(item.thisMonthUsd)}
                </span>
              </div>
              {/* 그라디언트 바 */}
              <div style={{ height: 4, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  width: mounted ? `${pct}%` : "0%",
                  height: "100%", borderRadius: 2,
                  background: `linear-gradient(90deg, rgba(245,158,11,0.5), var(--th-accent))`,
                  transition: "width 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 6px rgba(245,158,11,0.4)",
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
// 섹션 1 — Project Health
// ════════════════════════════════════════════════════════════════════════════
function ProjectHealthSection() {
  const { t } = useI18n();
  const { projects, currentProjectId } = useProjectStore();
  const { tasks } = useTaskStore();
  const { openWindow } = useUiStore();

  const cur        = projects.find((p) => p.id === currentProjectId) ?? null;
  const src        = currentProjectId ? tasks.filter((tk) => tk.project_id === currentProjectId) : tasks;
  const done       = src.filter((tk) => tk.status === "done").length;
  const total      = src.length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor   = pct >= 70 ? "#22c55e" : pct >= 40 ? "var(--th-accent)" : "#ef4444";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 6 }}>
      <SectionHeader label="project-health" />

      <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
        <StatBlock value={fmtPct(done, total)} label={t({ ko: "완료율", en: "completion", ja: "完了率", zh: "完成率" })}
          color={barColor} glow={pct >= 70} />
        <StatBlock value={String(total)} label={t({ ko: "태스크", en: "tasks", ja: "タスク", zh: "任务" })} />
        <StatBlock value={String(projects.length)} label={t({ ko: "프로젝트", en: "projects", ja: "PJ", zh: "项目" })} />
      </div>

      {/* 스파크라인 */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 2 }}>
        <Sparkline tasks={tasks} projectId={currentProjectId} />
      </div>

      <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", opacity: 0.5,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
        {cur ? `› ${cur.name}` : t({ ko: "프로젝트 미선택", en: "no project selected", ja: "未選択", zh: "未选择" })}
      </div>

      <ActionBtn label={t({ ko: "태스크보드", en: "open board", ja: "ボード", zh: "看板" })} onClick={() => openWindow("tasks")} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 섹션 2 — Agent Status
// ════════════════════════════════════════════════════════════════════════════
function AgentStatusSection() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { openWindow } = useUiStore();

  const working = agents.filter((a) => a.status === "working").length;
  const idle    = agents.filter((a) => a.status === "idle").length;
  const offline = agents.filter((a) => a.status === "offline" || a.status === "break").length;
  const top3    = [...agents].sort((a, b) => (b.stats_tasks_done ?? 0) - (a.stats_tasks_done ?? 0)).slice(0, 3);

  const legendItems = [
    { label: t({ ko: "작업중", en: "working", ja: "作業中", zh: "工作中" }), val: working, color: "#10b981" },
    { label: t({ ko: "대기",   en: "idle",    ja: "待機",  zh: "空闲"   }), val: idle,    color: "#f59e0b" },
    { label: t({ ko: "오프",   en: "offline", ja: "オフ",  zh: "离线"   }), val: offline, color: "#475569" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <SectionHeader label="agent-status" />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <DonutChart working={working} idle={idle} offline={offline} />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {legendItems.map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: item.color,
                flexShrink: 0, boxShadow: `0 0 5px ${item.color}` }} />
              <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>
                <span style={{ fontWeight: 700, color: item.color }}>{item.val}</span>
                {" "}{item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
        {top3.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13 }}>{a.avatar_emoji}</span>
            <span style={{ ...mono, fontSize: 10, color: "var(--th-text-primary)", flex: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
            <span style={{ ...mono, fontSize: 9, color: "#22c55e", opacity: 0.8 }}>✓ {a.stats_tasks_done ?? 0}</span>
          </div>
        ))}
        {agents.length === 0 && (
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.3 }}>
            {t({ ko: "에이전트 없음", en: "no agents", ja: "なし", zh: "无" })}
          </span>
        )}
      </div>

      <ActionBtn label={t({ ko: "에이전트 설정", en: "manage agents", ja: "管理", zh: "管理" })} onClick={() => openWindow("agent-manager")} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 섹션 3 — Active Work (현재 진행 중인 태스크 실시간 목록)
// ════════════════════════════════════════════════════════════════════════════
const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  in_progress:   { label: "진행",   color: "#f59e0b", dot: "▶" },
  collaborating: { label: "협업",   color: "#a78bfa", dot: "⇄" },
  review:        { label: "검토",   color: "#38bdf8", dot: "·" },
};

function ActiveWorkSection() {
  const { t } = useI18n();
  const { tasks } = useTaskStore();
  const { agents } = useAgentStore();
  const { projects } = useProjectStore();
  const { openWindow } = useUiStore();

  const active = tasks
    .filter((tk) => ["in_progress", "collaborating", "review"].includes(tk.status ?? ""))
    .slice(0, 6);

  const totalActive = tasks.filter((tk) =>
    ["in_progress", "collaborating", "review"].includes(tk.status ?? "")
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <SectionHeader label="active-work" />

      <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
        <StatBlock
          value={String(totalActive)}
          label={t({ ko: "진행 중", en: "in progress", ja: "進行中", zh: "进行中" })}
          color="#f59e0b"
        />
        <StatBlock
          value={String(tasks.filter((tk) => tk.status === "review").length)}
          label={t({ ko: "검토 대기", en: "in review", ja: "レビュー中", zh: "审核中" })}
          color="#38bdf8"
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
        {active.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: "var(--th-text-secondary)",
            paddingTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ opacity: 0.4 }}>·</span>
            {t({ ko: "진행 중인 태스크 없음", en: "no active tasks", ja: "進行中なし", zh: "无进行中任务" })}
          </div>
        ) : active.map((tk, i) => {
          const meta = STATUS_META[tk.status ?? ""] ?? STATUS_META.in_progress;
          const agent = agents.find((a) => a.id === tk.assigned_agent_id);
          const proj  = projects.find((p) => p.id === tk.project_id);
          return (
            <div key={tk.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
                borderRadius: 6, border: "1px solid var(--th-border)",
                background: "var(--th-bg-panel)",
                animation: `fadeUp 0.25s ease-out ${i * 0.04}s both` }}>
              {/* 상태 dot */}
              <span style={{ ...mono, fontSize: 11, color: meta.color, flexShrink: 0, width: 14,
                textAlign: "center", textShadow: `0 0 6px ${meta.color}` }}>
                {meta.dot}
              </span>
              {/* 태스크명 */}
              <span style={{ ...mono, fontSize: 10, color: "var(--th-text-primary)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tk.title}
              </span>
              {/* 에이전트 아바타 */}
              {agent && (
                <span title={agent.name} style={{ fontSize: 12, flexShrink: 0 }}>
                  {agent.avatar_emoji}
                </span>
              )}
              {/* 프로젝트 태그 */}
              {proj && (
                <span style={{ ...mono, fontSize: 8, color: "var(--th-text-secondary)",
                  background: "var(--th-border)", borderRadius: 3, padding: "1px 5px",
                  flexShrink: 0, maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {proj.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ActionBtn label={t({ ko: "보드 열기", en: "open board", ja: "ボード", zh: "看板" })} onClick={() => openWindow("tasks")} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 섹션 4 — Cost Summary
// ════════════════════════════════════════════════════════════════════════════
function CostSummarySection() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { openWindow } = useUiStore();
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <SectionHeader label="cost-summary" />

      <div style={{ display: "flex", gap: 18 }}>
        <StatBlock
          value={cost ? fmtUsd(cost.thisMonthUsd) : "—"}
          label={t({ ko: "이번달", en: "this month", ja: "今月", zh: "本月" })}
          color="var(--th-accent)" glow
        />
        <StatBlock
          value={cost ? fmtTokens(cost.totalTokens) : "—"}
          label={t({ ko: "총 토큰", en: "tokens", ja: "トークン", zh: "令牌" })}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {!cost ? (
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.3 }}>
            {t({ ko: "로딩 중...", en: "loading...", ja: "読込中...", zh: "加载中..." })}
          </span>
        ) : top4.length === 0 ? (
          <span style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.3 }}>
            {t({ ko: "기록 없음", en: "no data", ja: "記録なし", zh: "无记录" })}
          </span>
        ) : (
          <CostBarChart items={top4} agents={agents} />
        )}
      </div>

      <ActionBtn label={t({ ko: "비용 상세", en: "cli cost", ja: "コスト詳細", zh: "费用详情" })} onClick={() => openWindow("cli-usage")} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 메인 창
// ════════════════════════════════════════════════════════════════════════════
const CELL: React.CSSProperties = {
  padding: "18px 20px",
  background: "var(--th-bg-surface)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

export default function DashboardWindow() {
  const { t } = useI18n();

  return (
    <AppWindow
      windowType="dashboard"
      title={t({ ko: "대시보드", en: "Dashboard", ja: "ダッシュボード", zh: "控制台" })}
      emoji="◈"
      defaultWidth={880}
      defaultHeight={540}
    >
      <style>{DASH_ANIM_STYLE}</style>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 1,
        height: "100%",
        background: "var(--th-border)",
        overflow: "hidden",
      }}>
        <div style={CELL}><ProjectHealthSection /></div>
        <div style={CELL}><AgentStatusSection /></div>
        <div style={CELL}><ActiveWorkSection /></div>
        <div style={CELL}><CostSummarySection /></div>
      </div>
    </AppWindow>
  );
}
