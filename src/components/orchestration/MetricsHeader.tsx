import { useState, useEffect } from "react";
import type { Task, Agent, Project } from "../../types";
import { getProjectCostSummary, type ProjectCostSummary } from "../../api/cost-summary";

const mono = "var(--th-font-mono)";

interface MetricsHeaderProps {
  tasks: Task[];
  agents: Agent[];
  project: Project | null;
}

export default function MetricsHeader({ tasks, agents, project }: MetricsHeaderProps) {
  const [cost, setCost] = useState<ProjectCostSummary | null>(null);

  useEffect(() => {
    if (!project?.id) { setCost(null); return; }
    getProjectCostSummary(project.id).then(setCost).catch(() => setCost(null));
  }, [project?.id]);

  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

  const workingCount = agents.filter((a) => a.status === "working").length;
  const idleCount = agents.filter((a) => a.status !== "working").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const failedCount = tasks.filter((t) => t.execution_state === "failed").length;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "10px 20px",
      borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
      background: "var(--th-bg-elevated)",
      fontSize: 11,
      fontFamily: mono,
      color: "var(--th-text-secondary)",
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ padding: 4, background: "var(--th-accent-glow)", borderRadius: 8, color: "var(--th-accent)", display: "flex", alignItems: "center" }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span style={{ color: "var(--th-text-primary)", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
          Orchestrator
        </span>
      </div>

      <MetricBadge label="TOKENS" value={cost ? fmtTokens(cost.totalTokens) : "--"} color={cost ? "var(--th-text-primary)" : "var(--th-text-muted)"} />
      <MetricBadge label="BUDGET" value={cost ? fmtUsd(cost.totalUsd) : "--"} color={cost ? "var(--th-accent)" : "var(--th-text-muted)"} />
      <MetricBadge
        label="AGENTS"
        value={`${workingCount} Active / ${idleCount} Idle`}
        color={workingCount > 0 ? "var(--th-success)" : "var(--th-text-muted)"}
      />

      <div style={{ flex: 1 }} />

      {failedCount > 0 && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: "var(--th-danger-text)",
          background: "var(--th-danger-bg)",
          border: "1px solid #FECACA",
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
        }}>
          {failedCount} FAILED
        </span>
      )}
      {inProgressCount > 0 && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: "var(--th-success)",
          background: "#ECFDF5",
          border: "1px solid #A7F3D0",
          borderRadius: 8,
          padding: "3px 10px",
          letterSpacing: "0.05em",
        }}>
          {inProgressCount} RUNNING
        </span>
      )}
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--th-text-muted)", fontSize: 10, fontWeight: 600, letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 11 }}>{value}</span>
    </span>
  );
}
