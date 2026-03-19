import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ── vibefund domain types (re-declared locally since the package is types-only) ── */
type ProjectStatus = "Prototype" | "Beta" | "Live";
type ApprovalStatus = "pending" | "approved" | "rejected" | "hidden";
type RewardType = "beta" | "lifetime" | "subscription_discount";

interface VFProject {
  id: string;
  title: string;
  description: string;
  service_url: string;
  category: string;
  status: ProjectStatus;
  approval_status: ApprovalStatus;
  thumbnail_url?: string;
  goal_amount: number;
  current_amount: number;
  deadline: string;
  backer_count: number;
  rewards: { name: string; type: RewardType; amount: number }[];
}

/* ── seed data ── */
const SEED_PROJECTS: VFProject[] = [
  {
    id: "vf-001",
    title: "PixelForge Studio",
    description: "AI-powered no-code design tool for indie makers",
    service_url: "https://pixelforge.app",
    category: "Design",
    status: "Beta",
    approval_status: "approved",
    goal_amount: 5000000,
    current_amount: 3720000,
    deadline: "2026-04-30",
    backer_count: 214,
    rewards: [
      { name: "Beta Access", type: "beta", amount: 10000 },
      { name: "Lifetime Plan", type: "lifetime", amount: 50000 },
    ],
  },
  {
    id: "vf-002",
    title: "TaskPilot",
    description: "Voice-first task manager with calendar sync",
    service_url: "https://taskpilot.io",
    category: "Productivity",
    status: "Prototype",
    approval_status: "approved",
    goal_amount: 3000000,
    current_amount: 870000,
    deadline: "2026-05-15",
    backer_count: 63,
    rewards: [
      { name: "Early Bird", type: "beta", amount: 5000 },
      { name: "50% Off Year 1", type: "subscription_discount", amount: 30000 },
    ],
  },
  {
    id: "vf-003",
    title: "ShipNote",
    description: "Changelog & release notes generator for SaaS teams",
    service_url: "https://shipnote.dev",
    category: "DevTools",
    status: "Live",
    approval_status: "approved",
    goal_amount: 2000000,
    current_amount: 2150000,
    deadline: "2026-03-20",
    backer_count: 189,
    rewards: [
      { name: "Lifetime License", type: "lifetime", amount: 45000 },
    ],
  },
  {
    id: "vf-004",
    title: "MealMap",
    description: "AI meal planner with grocery list & delivery integration",
    service_url: "https://mealmap.kr",
    category: "Lifestyle",
    status: "Prototype",
    approval_status: "pending",
    goal_amount: 8000000,
    current_amount: 1200000,
    deadline: "2026-06-01",
    backer_count: 41,
    rewards: [
      { name: "Beta Tester", type: "beta", amount: 0 },
      { name: "Premium Lifetime", type: "lifetime", amount: 60000 },
    ],
  },
  {
    id: "vf-005",
    title: "CodeReviewBot",
    description: "Automated PR review assistant with team style learning",
    service_url: "https://codereviewbot.dev",
    category: "DevTools",
    status: "Beta",
    approval_status: "approved",
    goal_amount: 4000000,
    current_amount: 3980000,
    deadline: "2026-04-10",
    backer_count: 327,
    rewards: [
      { name: "Early Access", type: "beta", amount: 15000 },
      { name: "Team Lifetime", type: "lifetime", amount: 120000 },
      { name: "30% Discount", type: "subscription_discount", amount: 25000 },
    ],
  },
];

/* ── helpers ── */
const fmt = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만` : n.toLocaleString();

const pct = (cur: number, goal: number) =>
  Math.min(Math.round((cur / goal) * 100), 100);

const daysLeft = (deadline: string) => {
  const d = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / 86400000
  );
  return d > 0 ? `D-${d}` : "종료";
};

const statusColor = (s: ProjectStatus) =>
  s === "Live" ? "#22c55e" : s === "Beta" ? "#f59e0b" : "#94a3b8";

const approvalBadge = (s: ApprovalStatus) => {
  if (s === "approved") return { label: "승인", color: "#22c55e" };
  if (s === "pending") return { label: "심사중", color: "#f59e0b" };
  if (s === "rejected") return { label: "반려", color: "#ef4444" };
  return { label: "숨김", color: "#64748b" };
};

/* ── component ── */
interface Props {
  config: {
    refresh: string;
    theme: string;
    sizePreset: string;
    params?: Record<string, unknown>;
  };
}

type View = "list" | "detail";
type Filter = "all" | ProjectStatus;

export default function CustomFeatureWidget({ config }: Props) {
  const [projects] = useState<VFProject[]>(SEED_PROJECTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? projects
        : projects.filter((p) => p.status === filter),
    [projects, filter]
  );

  const stats = useMemo(() => {
    const total = projects.reduce((s, p) => s + p.current_amount, 0);
    const backers = projects.reduce((s, p) => s + p.backer_count, 0);
    const funded = projects.filter(
      (p) => p.current_amount >= p.goal_amount
    ).length;
    return { total, backers, funded, count: projects.length };
  }, [projects]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
    setView("detail");
  }, []);

  const goBack = useCallback(() => {
    setView("list");
    setSelectedId(null);
  }, []);

  /* ── styles ── */
  const root: React.CSSProperties = {
    fontFamily: "var(--th-font-mono)",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "var(--th-bg-elevated)",
    color: "var(--th-text-primary)",
    overflow: "hidden",
  };

  const header: React.CSSProperties = {
    padding: "12px 16px 8px",
    borderBottom: "1px solid var(--th-border)",
    flexShrink: 0,
  };

  const body: React.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px",
  };

  /* ── detail view ── */
  if (view === "detail" && selected) {
    const p = selected;
    const percentage = pct(p.current_amount, p.goal_amount);
    const badge = approvalBadge(p.approval_status);
    return (
      <div style={root}>
        <div style={header}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              onClick={goBack}
              style={{
                cursor: "pointer",
                color: "var(--th-accent)",
                fontSize: 13,
              }}
            >
              ← 목록
            </span>
            <span style={{ color: "var(--th-text-muted)", fontSize: 11 }}>
              /
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--th-text-heading)",
              }}
            >
              {p.title}
            </span>
          </div>
        </div>

        <div style={body}>
          {/* title row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: statusColor(p.status) + "22",
                color: statusColor(p.status),
                border: `1px solid ${statusColor(p.status)}44`,
              }}
            >
              {p.status}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 6px",
                borderRadius: 4,
                background: badge.color + "22",
                color: badge.color,
                border: `1px solid ${badge.color}44`,
              }}
            >
              {badge.label}
            </span>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "var(--th-text-muted)",
              margin: "0 0 16px",
              lineHeight: 1.5,
            }}
          >
            {p.description}
          </p>

          {/* funding bar */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 4,
                color: "var(--th-text-muted)",
              }}
            >
              <span>
                ₩{fmt(p.current_amount)} / ₩{fmt(p.goal_amount)}
              </span>
              <span>{percentage}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--th-bg-panel)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${percentage}%`,
                  borderRadius: 4,
                  background:
                    percentage >= 100
                      ? "var(--th-attr-elite)"
                      : "var(--th-accent)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginTop: 6,
                color: "var(--th-text-muted)",
              }}
            >
              <span>{p.backer_count}명 후원</span>
              <span>{daysLeft(p.deadline)}</span>
            </div>
          </div>

          {/* info grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {[
              { label: "카테고리", value: p.category },
              { label: "서비스", value: p.service_url.replace(/https?:\/\//, "") },
              { label: "마감일", value: p.deadline },
              {
                label: "최소 후원",
                value: `₩${fmt(Math.min(...p.rewards.map((r) => r.amount).filter(a => a > 0)) || 0)}`,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "8px 10px",
                  background: "var(--th-bg-panel)",
                  borderRadius: 6,
                  border: "1px solid var(--th-border)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--th-text-muted)",
                    marginBottom: 2,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* rewards */}
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            // rewards
          </div>
          {p.rewards.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 10px",
                marginBottom: 6,
                background: "var(--th-bg-panel)",
                borderRadius: 6,
                border: "1px solid var(--th-border)",
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    color: "var(--th-text-muted)",
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: "var(--th-bg-elevated)",
                  }}
                >
                  {r.type}
                </span>
              </div>
              <span style={{ color: "var(--th-accent)", fontWeight: 600 }}>
                {r.amount > 0 ? `₩${fmt(r.amount)}` : "무료"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── list view ── */
  return (
    <div style={root}>
      <div style={header}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--th-text-heading)",
            }}
          >
            $ vibefund / dashboard
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 14,
                marginLeft: 4,
                background: "var(--th-accent)",
                animation: "vfBlink 1s step-end infinite",
                verticalAlign: "middle",
              }}
            />
          </span>
          <span style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
            {stats.count} projects
          </span>
        </div>

        {/* stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          {[
            { label: "총 펀딩", value: `₩${fmt(stats.total)}`, color: "var(--th-accent)" },
            { label: "후원자", value: `${stats.backers}명`, color: "var(--th-text-primary)" },
            { label: "달성", value: `${stats.funded}건`, color: "var(--th-attr-elite)" },
          ].map((s) => (
            <div key={s.label} style={{ fontSize: 11 }}>
              <span style={{ color: "var(--th-text-muted)" }}>
                {s.label}{" "}
              </span>
              <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* filter tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "Prototype", "Beta", "Live"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "2px 8px",
                fontSize: 11,
                fontFamily: "var(--th-font-mono)",
                background:
                  filter === f ? "var(--th-accent)" + "22" : "transparent",
                color:
                  filter === f ? "var(--th-accent)" : "var(--th-text-muted)",
                border: `1px solid ${filter === f ? "var(--th-accent)" + "44" : "var(--th-border)"}`,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {f === "all" ? "전체" : f}
            </button>
          ))}
        </div>
      </div>

      <div style={body}>
        {filtered.map((p) => {
          const percentage = pct(p.current_amount, p.goal_amount);
          return (
            <div
              key={p.id}
              onClick={() => openDetail(p.id)}
              style={{
                padding: "10px 12px",
                marginBottom: 8,
                background: "var(--th-bg-panel)",
                borderRadius: 6,
                border: "1px solid var(--th-border)",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "#f59e0b66")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--th-border)")
              }
            >
              {/* top row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {p.title}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 5px",
                      borderRadius: 3,
                      background: statusColor(p.status) + "22",
                      color: statusColor(p.status),
                    }}
                  >
                    {p.status}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      percentage >= 100
                        ? "var(--th-attr-elite)"
                        : "var(--th-accent)",
                  }}
                >
                  {percentage}%
                </span>
              </div>

              {/* description */}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--th-text-muted)",
                  marginBottom: 8,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.description}
              </div>

              {/* progress bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "var(--th-bg-elevated)",
                  marginBottom: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${percentage}%`,
                    borderRadius: 2,
                    background:
                      percentage >= 100
                        ? "var(--th-attr-elite)"
                        : "var(--th-accent)",
                  }}
                />
              </div>

              {/* bottom row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--th-text-muted)",
                }}
              >
                <span>
                  ₩{fmt(p.current_amount)} · {p.backer_count}명
                </span>
                <span>
                  {p.category} · {daysLeft(p.deadline)}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--th-text-muted)",
              fontSize: 12,
              padding: "32px 0",
            }}
          >
            해당 상태의 프로젝트가 없습니다
          </div>
        )}
      </div>

      <style>{`
        @keyframes vfBlink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}