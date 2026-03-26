import { useState, useEffect, useCallback } from "react";
import type { Task, Agent, Department } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getAgentsPerformance, type AgentPerformanceEntry } from "../../../api/organization-projects";

const mono = "var(--th-font-mono)";

interface AgentsTabProps {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  projectId?: string;
}

export default function AgentsTab({ agents, tasks, departments, projectId }: AgentsTabProps) {
  const [perfMap, setPerfMap] = useState<Map<string, AgentPerformanceEntry>>(new Map());
  const [actionMenuAgentId, setActionMenuAgentId] = useState<string | null>(null);

  useEffect(() => {
    getAgentsPerformance(projectId)
      .then((entries) => setPerfMap(new Map(entries.map((e) => [e.agent_id, e]))))
      .catch(() => {});
  }, [projectId]);

  const activeCount = agents.filter((a) => a.status === "working").length;

  // Compute metrics
  const totalDone = [...perfMap.values()].reduce((s, e) => s + (e.done ?? 0), 0);
  const totalTasks = [...perfMap.values()].reduce((s, e) => s + (e.total ?? 0), 0);
  const costEfficiency = totalTasks > 0 ? (totalDone / totalTasks * 100).toFixed(0) : "--";

  const handleToggleMenu = useCallback((agentId: string) => {
    setActionMenuAgentId((prev) => (prev === agentId ? null : agentId));
  }, []);

  return (
    <div style={{ fontFamily: mono }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 6, background: "#EBF5FF", borderRadius: 10, color: "#3B82F6", display: "flex", alignItems: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "#374151", margin: 0 }}>
              Team Agents
            </h3>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, fontWeight: 600 }}>
              ACTIVE: {String(activeCount).padStart(2, "0")} / TOTAL: {agents.length}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricBar
          label="TOKEN_THROUGHPUT"
          value={`${totalDone} tasks done`}
          percent={totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0}
          color="#3B82F6"
        />
        <MetricBar
          label="COST_EFFICIENCY"
          value={costEfficiency !== "--" ? `${costEfficiency}% success` : "--"}
          percent={costEfficiency !== "--" ? parseFloat(costEfficiency) : 0}
          color="#059669"
        />
      </div>

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 40px",
        gap: 8,
        padding: "10px 16px",
        background: "#F9FAFB",
        borderRadius: "12px 12px 0 0",
        border: "1px solid #E5E7EB",
        borderBottom: "none",
        fontSize: 10,
        color: "#9CA3AF",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
      }}>
        <span>Agent / Identity</span>
        <span>Role / Domain</span>
        <span>Status</span>
        <span>Current Process</span>
        <span>Fitness Metrics</span>
        <span>Action</span>
      </div>

      {/* Agent rows */}
      <div style={{ border: "1px solid #E5E7EB", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      {agents.map((agent) => {
        const agentTasks = tasks.filter((t) => t.assigned_agent_id === agent.id);
        const currentTask = agentTasks.find((t) => t.status === "in_progress");
        const dept = departments.find((d) => d.id === agent.department_id);

        const roleLabel = agent.role === "team_leader" ? "PM"
          : agent.role === "senior" ? "SENIOR"
          : "JUNIOR";

        const domainLabel = dept?.name ? dept.name.toUpperCase() : roleLabel;

        const isWorking = agent.status === "working";

        const perf = perfMap.get(agent.id);
        const fitnessByType = perf?.fitness_by_type ?? [];

        return (
          <div key={agent.id} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 40px",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid #F3F4F6",
            alignItems: "start",
            fontSize: 12,
            position: "relative",
            background: "#FFFFFF",
            transition: "background 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFBFC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
          >
            {/* Identity */}
            <div>
              <div style={{ color: "#111827", fontWeight: 700 }}>
                {agent.name.toUpperCase().replace(/\s+/g, "_")}
              </div>
              <div style={{ fontSize: 10, color: "#9CA3AF" }}>
                ID: {agent.id.substring(0, 8)}
              </div>
            </div>

            {/* Role / Domain */}
            <div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                color: "#FFFFFF",
                background: agent.role === "team_leader" ? "#3B82F6" : "#059669",
                padding: "3px 8px",
                borderRadius: 6,
                display: "inline-block",
                width: "fit-content",
              }}>
                {roleLabel}
              </span>
              {dept && (
                <div style={{ fontSize: 9, color: "#9CA3AF", marginTop: 4 }}>
                  {domainLabel}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isWorking ? "#059669" : "#D1D5DB",
                boxShadow: isWorking ? "0 0 6px rgba(5,150,105,0.3)" : "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isWorking ? "#059669" : "#9CA3AF",
              }}>
                {agent.status.toUpperCase()}
              </span>
            </div>

            {/* Current process */}
            <div>
              <div style={{ fontSize: 11, color: "#111827", marginBottom: 4, fontWeight: 500 }}>
                {currentTask ? currentTask.title : (
                  <span style={{ fontStyle: "italic", color: "#D1D5DB" }}>
                    No active task...
                  </span>
                )}
              </div>
              {currentTask && (
                <div style={{ height: 4, background: "#E5E7EB", width: "100%", borderRadius: 2 }}>
                  <div style={{ height: 4, background: "#3B82F6", width: `${getTaskProgress(currentTask)}%`, transition: "width 0.3s", borderRadius: 2 }} />
                </div>
              )}
            </div>

            {/* Fitness Metrics */}
            <div style={{ fontSize: 10 }}>
              {fitnessByType.length > 0 ? (
                fitnessByType.slice(0, 4).map((f) => (
                  <div key={f.task_type} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "#9CA3AF", width: 36, flexShrink: 0, textTransform: "uppercase" as const, fontWeight: 600 }}>
                      {f.task_type.slice(0, 4)}:
                    </span>
                    <span style={{
                      color: f.success_rate >= 80 ? "#059669" : f.success_rate >= 50 ? "#D97706" : "#DC2626",
                      fontWeight: 800,
                    }}>
                      {f.success_rate}%
                    </span>
                    <span style={{ color: "#D1D5DB", fontSize: 9 }}>({f.total})</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "#3B82F6", fontWeight: 700 }}>
                  FITNESS: {perf?.success_rate != null ? `${Math.round(perf.success_rate)}%` : "--"}
                </div>
              )}
            </div>

            {/* Action menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => handleToggleMenu(agent.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "#9CA3AF", padding: 4,
                  borderRadius: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {actionMenuAgentId === agent.id && (
                <ActionMenu
                  agentName={agent.name}
                  onClose={() => setActionMenuAgentId(null)}
                />
              )}
            </div>
          </div>
        );
      })}
      </div>

      {agents.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 12, background: "#FFFFFF", borderRadius: 16, border: "1px dashed #E5E7EB" }}>
          No agents assigned to this project.
        </div>
      )}
    </div>
  );
}

/* -- Action Menu -- */

function ActionMenu({ agentName, onClose }: { agentName: string; onClose: () => void }) {
  const actions = [
    { label: "View Logs", icon: "log" },
    { label: "Reassign Task", icon: "reassign" },
    { label: "Stop Agent", icon: "stop" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 28,
        width: 170,
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        zIndex: 100,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
      }}
      onMouseLeave={onClose}
    >
      <div style={{
        fontFamily: mono, fontSize: 9, color: "#9CA3AF", fontWeight: 800,
        padding: "8px 14px", borderBottom: "1px solid #F3F4F6",
        letterSpacing: "0.05em", textTransform: "uppercase" as const,
      }}>
        {agentName.toUpperCase().replace(/\s+/g, "_")}
      </div>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "10px 14px",
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 600,
            color: action.icon === "stop" ? "#DC2626" : "#6B7280",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {action.icon === "log" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
          )}
          {action.icon === "reassign" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
          )}
          {action.icon === "stop" && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><rect x="9" y="9" width="6" height="6" /></svg>
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}

/* -- Metric Bar -- */

function MetricBar({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 14,
      padding: "12px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: "#E5E7EB", width: "100%", borderRadius: 2 }}>
        <div style={{ height: 4, background: color, width: `${Math.min(percent, 100)}%`, transition: "width 0.3s", borderRadius: 2 }} />
      </div>
    </div>
  );
}
