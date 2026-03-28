import { useState, useEffect, useRef, useMemo } from "react";
import type { Task, Agent, Project } from "../../types";
import { getProjectCostSummary, type ProjectCostSummary } from "../../api/cost-summary";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";
const COST_REFRESH_DEBOUNCE_MS = 5_000;

interface MetricsHeaderProps {
  tasks: Task[];
  agents: Agent[];
  project: Project | null;
  onFailedClick?: () => void;
}

export default function MetricsHeader({ tasks, agents, project, onFailedClick }: MetricsHeaderProps) {
  const [cost, setCost] = useState<ProjectCostSummary | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runtimeStatuses = useUiStore((s) => s.runtimeStatuses);

  // Derive a lightweight signature from tasks to detect status changes
  const taskSignature = tasks.map((t) => `${t.id}:${t.status}`).join(",");

  useEffect(() => {
    if (!project?.id) { setCost(null); return; }
    getProjectCostSummary(project.id).then(setCost).catch(() => setCost(null));
  }, [project?.id]);

  // Debounced re-fetch when task statuses change
  useEffect(() => {
    if (!project?.id) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getProjectCostSummary(project.id).then(setCost).catch(() => {});
    }, COST_REFRESH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [project?.id, taskSignature]);

  // Aggregate real-time CLI token usage from runtime statuses
  const liveTokens = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));
    let input = 0;
    let output = 0;
    for (const [taskId, info] of runtimeStatuses) {
      if (!taskIds.has(taskId)) continue;
      input += info.inputTokens ?? 0;
      output += info.outputTokens ?? 0;
    }
    return { input, output, total: input + output };
  }, [tasks, runtimeStatuses]);

  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

  // Combine API cost data + live CLI tokens
  const totalTokens = (cost?.totalTokens ?? 0) + liveTokens.total;
  const totalUsd = cost?.totalUsd ?? 0;

  const workingCount = agents.filter((a) => a.status === "working").length;
  const idleCount = agents.filter((a) => a.status !== "working").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const failedCount = tasks.filter((t) => t.execution_state === "failed").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "10px 20px",
      borderBottom: "1px solid var(--th-border)",
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
          워크플로우
        </span>
      </div>

      <MetricBadge label="토큰" value={totalTokens > 0 ? fmtTokens(totalTokens) : "--"} color={totalTokens > 0 ? "var(--th-text-primary)" : "var(--th-text-muted)"} />
      <MetricBadge label="비용" value={totalUsd > 0 ? fmtUsd(totalUsd) : "--"} color={totalUsd > 0 ? "var(--th-accent)" : "var(--th-text-muted)"} />
      {totalUsd >= 1.0 && (
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          color: totalUsd >= 5.0 ? "var(--th-danger-text)" : "var(--th-warning)",
          background: totalUsd >= 5.0 ? "var(--th-danger-bg)" : "var(--th-warning-bg)",
          border: `1px solid ${totalUsd >= 5.0 ? "var(--th-danger-border)" : "var(--th-warning-border)"}`,
          borderRadius: 6,
          padding: "2px 7px",
          letterSpacing: "0.05em",
        }}>
          {totalUsd >= 5.0 ? "COST HIGH" : "COST"}
        </span>
      )}
      <MetricBadge
        label="에이전트"
        value={`활성 ${workingCount} / 대기 ${idleCount}`}
        color={workingCount > 0 ? "var(--th-success)" : "var(--th-text-muted)"}
      />
      <MetricBadge
        label="태스크"
        value={`${doneCount}/${tasks.length}`}
        color={doneCount > 0 ? "var(--th-success)" : "var(--th-text-muted)"}
      />

      <div style={{ flex: 1 }} />

      {project?.core_goal && (
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-muted)",
          fontWeight: 500,
          maxWidth: 320,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          borderLeft: "2px solid var(--th-border)",
          paddingLeft: 12,
        }}
          title={project.core_goal}
        >
          {project.core_goal}
        </span>
      )}

      {failedCount > 0 && (
        <span
          onClick={onFailedClick}
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "var(--th-danger-text)",
            background: "var(--th-danger-bg)",
            border: "1px solid var(--th-danger-border)",
            borderRadius: 8,
            padding: "3px 10px",
            letterSpacing: "0.05em",
            cursor: onFailedClick ? "pointer" : "default",
            userSelect: "none",
          }}
        >
          {failedCount} FAILED
        </span>
      )}
      {inProgressCount > 0 && (
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          color: "var(--th-success)",
          background: "var(--th-success-bg)",
          border: "1px solid var(--th-success-border)",
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
