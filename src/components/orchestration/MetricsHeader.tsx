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
      gap: 24,
      padding: "6px 16px",
      borderBottom: "1px solid var(--th-border)",
      background: "var(--th-bg-secondary)",
      fontSize: 11,
      fontFamily: mono,
      color: "var(--th-text-secondary)",
      flexShrink: 0,
    }}>
      <span style={{ color: "var(--th-text-primary)", fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>
        ORCHESTRATOR_OS
      </span>

      <MetricBadge label="TOKENS" value={cost ? fmtTokens(cost.totalTokens) : "—"} color={cost ? "var(--th-text-code)" : "var(--th-text-secondary)"} />
      <MetricBadge label="BUDGET" value={cost ? fmtUsd(cost.totalUsd) : "—"} color={cost ? "var(--th-accent)" : "var(--th-text-secondary)"} />
      <MetricBadge
        label="AGENTS"
        value={`${workingCount} Active / ${idleCount} Idle`}
        color={workingCount > 0 ? "var(--th-accent)" : "var(--th-text-muted)"}
      />

      <div style={{ flex: 1 }} />

      {failedCount > 0 && (
        <span style={{
          color: "#ef4444",
          fontWeight: 600,
          fontSize: 11,
        }}>
          {failedCount} FAILED
        </span>
      )}
      {inProgressCount > 0 && (
        <span style={{ color: "var(--th-accent)", fontSize: 11 }}>
          {inProgressCount} RUNNING
        </span>
      )}
    </div>
  );
}

function MetricBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--th-text-muted)", fontSize: 10, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{value}</span>
    </span>
  );
}
