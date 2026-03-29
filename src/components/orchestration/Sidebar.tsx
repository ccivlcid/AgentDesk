import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Task, Agent, Department, TaskExecutionEvent } from "../../types";
import { getTaskProgress } from "./task-progress";
import {
  getAgentsPerformance,
  getTaskExecutionEvents,
  stopTask, pauseTask, resumeTask, assignTask,
  type AgentPerformanceEntry,
} from "../../api/organization-projects";
import { useUiStore } from "../../store/uiStore";

const mono = "var(--th-font-mono)";
const PERF_REFRESH_MS = 3_000;

/* ================================================================
   Agent colors (matches ConstellationCanvas)
   ================================================================ */

const DEPT_COLORS: Record<string, string> = {
  planning: "#06b6d4", dev: "#eab308", design: "#ec4899",
  qa: "#22c55e", devsecops: "#ef4444", operations: "#f97316",
};
const PM_COLOR = "#6366f1";

function getColor(dept?: Department, isPm?: boolean): string {
  if (isPm) return PM_COLOR;
  if (!dept) return "#3b82f6";
  const k = dept.name.toLowerCase();
  for (const [key, c] of Object.entries(DEPT_COLORS)) { if (k.includes(key)) return c; }
  return "#3b82f6";
}

/* ================================================================
   Props
   ================================================================ */

export type DrilldownType = "none" | "agent" | "pm" | "task";

interface SidebarProps {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  projectId?: string;
  pmAgentId?: string | null;
  selectedAgentId: string | null;
  kickoffStage: string;
  onSelectAgent: (id: string | null) => void;
  onFilterLogs: (agentId: string) => void;
}

/* ================================================================
   Component
   ================================================================ */

export default function Sidebar({
  agents, tasks, departments, projectId, pmAgentId, selectedAgentId, kickoffStage,
  onSelectAgent, onFilterLogs,
}: SidebarProps) {
  const [drilldown, setDrilldown] = useState<DrilldownType>("none");
  const [drilldownTaskId, setDrilldownTaskId] = useState<string | null>(null);
  const [perfMap, setPerfMap] = useState<Map<string, AgentPerformanceEntry>>(new Map());
  const [taskEvents, setTaskEvents] = useState<TaskExecutionEvent[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const perfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addToast = useUiStore((s) => s.addToast);

  // Perf data fetch
  const doneCount = tasks.filter((t) => t.status === "done" || t.execution_state === "failed").length;
  useEffect(() => {
    getAgentsPerformance(projectId).then((e) => setPerfMap(new Map(e.map((x) => [x.agent_id, x])))).catch(() => {});
  }, [projectId]);
  useEffect(() => {
    if (perfDebounceRef.current) clearTimeout(perfDebounceRef.current);
    perfDebounceRef.current = setTimeout(() => {
      getAgentsPerformance(projectId).then((e) => setPerfMap(new Map(e.map((x) => [x.agent_id, x])))).catch(() => {});
    }, PERF_REFRESH_MS);
    return () => { if (perfDebounceRef.current) clearTimeout(perfDebounceRef.current); };
  }, [projectId, doneCount]);

  // Token map
  const runtimeStatuses = useUiStore((s) => s.runtimeStatuses);
  const agentTokenMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [, info] of runtimeStatuses) {
      if (!info.agentId) continue;
      map.set(info.agentId, (map.get(info.agentId) ?? 0) + (info.inputTokens ?? 0) + (info.outputTokens ?? 0));
    }
    return map;
  }, [runtimeStatuses]);

  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  // Sync drilldown with constellation selection
  useEffect(() => {
    if (!selectedAgentId) { setDrilldown("none"); setReassignOpen(false); return; }
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) { setDrilldown("none"); return; }
    setDrilldown(agent.role === "team_leader" || agent.id === pmAgentId ? "pm" : "agent");
    setReassignOpen(false);
  }, [selectedAgentId, agents, pmAgentId]);

  // Fetch task events for task drilldown
  useEffect(() => {
    if (drilldown !== "task" || !drilldownTaskId) { setTaskEvents([]); return; }
    getTaskExecutionEvents(drilldownTaskId, 30).then((res) => setTaskEvents(res.events)).catch(() => setTaskEvents([]));
  }, [drilldown, drilldownTaskId]);

  const handleBack = useCallback(() => {
    setDrilldown("none");
    setDrilldownTaskId(null);
    onSelectAgent(null);
  }, [onSelectAgent]);

  const handleTaskClick = useCallback((taskId: string) => {
    setDrilldown("task");
    setDrilldownTaskId(taskId);
    onSelectAgent(null);
  }, [onSelectAgent]);

  // Action handlers
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const agentTasks = selectedAgent ? tasks.filter((t) => t.assigned_agent_id === selectedAgent.id) : [];
  const currentTask = agentTasks.find((t) => t.status === "in_progress");

  const handleStop = useCallback(async () => {
    if (!selectedAgent) return;
    const active = tasks.filter((t) => t.assigned_agent_id === selectedAgent.id && t.status === "in_progress");
    if (!active.length) return;
    setBusyAction("stop");
    try { await Promise.all(active.map((t) => stopTask(t.id))); }
    catch { addToast({ type: "error", title: "Failed to stop" }); }
    setBusyAction(null);
  }, [selectedAgent, tasks, addToast]);

  const handlePause = useCallback(async () => {
    if (!selectedAgent) return;
    const active = tasks.filter((t) => t.assigned_agent_id === selectedAgent.id && t.status === "in_progress");
    if (!active.length) return;
    setBusyAction("pause");
    try { await Promise.all(active.map((t) => pauseTask(t.id))); }
    catch { addToast({ type: "error", title: "Failed to pause" }); }
    setBusyAction(null);
  }, [selectedAgent, tasks, addToast]);

  const handleResume = useCallback(async () => {
    if (!selectedAgent) return;
    const pending = tasks.filter((t) => t.assigned_agent_id === selectedAgent.id && t.status === "pending");
    if (!pending.length) return;
    setBusyAction("resume");
    try { await Promise.all(pending.map((t) => resumeTask(t.id))); }
    catch { addToast({ type: "error", title: "Failed to resume" }); }
    setBusyAction(null);
  }, [selectedAgent, tasks, addToast]);

  const handleReassign = useCallback(async (toId: string) => {
    if (!selectedAgent) return;
    const movable = tasks.filter((t) => t.assigned_agent_id === selectedAgent.id && (t.status === "in_progress" || t.status === "planned"));
    if (!movable.length) return;
    setBusyAction("reassign");
    try {
      for (const t of movable) {
        if (t.status === "in_progress") await stopTask(t.id);
        await assignTask(t.id, toId);
      }
    } catch { addToast({ type: "error", title: "Failed to reassign" }); }
    setBusyAction(null);
    setReassignOpen(false);
  }, [selectedAgent, tasks, addToast]);

  const reassignTargets = selectedAgent
    ? agents.filter((a) => a.id !== selectedAgent.id && a.role !== "team_leader")
    : [];

  const sectionLabel: React.CSSProperties = {
    fontSize: 9, fontWeight: 800, letterSpacing: "0.15em",
    color: "var(--th-text-muted)", textTransform: "uppercase",
    marginBottom: 8,
  };

  const sectionDiv: React.CSSProperties = {
    padding: "10px 0", borderBottom: "1px solid var(--th-border)",
  };

  return (
    <div style={{
      height: "100%", overflowY: "auto", overflowX: "hidden",
      padding: "12px 14px", fontFamily: mono, fontSize: 11,
    }} className="custom-scrollbar">

      {/* ===== DRILLDOWN: Agent ===== */}
      {drilldown === "agent" && selectedAgent && (
        <div key={selectedAgent.id}>
          <BackButton onClick={handleBack} />
          <AgentHeader agent={selectedAgent} dept={departments.find((d) => d.id === selectedAgent.department_id)} isPm={false} />
          {/* Current task */}
          <div style={sectionDiv}>
            <div style={sectionLabel}>CURRENT TASK</div>
            {currentTask ? (
              <>
                <div style={{ fontSize: 11, color: "var(--th-text-primary)", fontWeight: 600, marginBottom: 6 }}>{currentTask.title}</div>
                <ProgressBar percent={getTaskProgress(currentTask)} />
              </>
            ) : (
              <div style={{ color: "var(--th-border-strong)", fontStyle: "italic", fontSize: 10 }}>대기 중...</div>
            )}
          </div>
          {/* Performance */}
          <PerformanceSection perfEntry={perfMap.get(selectedAgent.id)} />
          {/* Tokens */}
          <div style={sectionDiv}>
            <div style={sectionLabel}>TOKENS</div>
            <div style={{ fontSize: 13, color: "var(--th-accent)", fontWeight: 800 }}>
              {agentTokenMap.has(selectedAgent.id) ? fmtTokens(agentTokenMap.get(selectedAgent.id)!) : "--"}
            </div>
          </div>
          {/* Actions */}
          <div style={{ padding: "10px 0" }}>
            <div style={sectionLabel}>ACTIONS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <ActBtn label="로그" onClick={() => onFilterLogs(selectedAgent.id)} />
              <ActBtn label="일시정지" onClick={handlePause} disabled={!currentTask || !!busyAction} />
              {agentTasks.some((t) => t.status === "pending") && <ActBtn label="재개" onClick={handleResume} disabled={!!busyAction} />}
              <ActBtn label="재배정" onClick={() => setReassignOpen(!reassignOpen)} disabled={(!currentTask && !agentTasks.some((t) => t.status === "planned")) || !!busyAction} />
              <ActBtn label="중지" onClick={handleStop} danger disabled={!currentTask || !!busyAction} />
            </div>
            {reassignOpen && (
              <div style={{ marginTop: 8, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ fontSize: 9, color: "var(--th-text-muted)", fontWeight: 700, padding: "5px 10px", borderBottom: "1px solid var(--th-border)" }}>
                  태스크를 다른 에이전트로:
                </div>
                {reassignTargets.map((t) => (
                  <button key={t.id} type="button" onClick={() => void handleReassign(t.id)}
                    style={{ display: "block", width: "100%", padding: "5px 10px", textAlign: "left", fontFamily: mono, fontSize: 10, fontWeight: 600, color: "var(--th-text-secondary)", background: "transparent", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-bg-surface)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >{t.name}</button>
                ))}
                {reassignTargets.length === 0 && <div style={{ padding: "6px 10px", fontSize: 10, color: "var(--th-text-muted)", fontStyle: "italic" }}>없음</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DRILLDOWN: PM ===== */}
      {drilldown === "pm" && selectedAgent && (
        <div key={selectedAgent.id}>
          <BackButton onClick={handleBack} />
          <AgentHeader agent={selectedAgent} dept={departments.find((d) => d.id === selectedAgent.department_id)} isPm />
          {/* Pipeline stage */}
          <div style={sectionDiv}>
            <div style={sectionLabel}>PIPELINE STAGE</div>
            {(["meeting", "planning", "assigning", "executing", "review"] as const).map((stage) => {
              const stages = ["meeting", "planning", "assigning", "executing", "review"];
              const currentIdx = stages.indexOf(kickoffStage || "idle");
              const stageIdx = stages.indexOf(stage);
              const isDone = stageIdx < currentIdx;
              const isCurrent = stage === kickoffStage;
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: isDone ? "var(--th-accent)" : isCurrent ? "#22c55e" : "var(--th-border)",
                    border: isCurrent ? "2px solid #22c55e" : "none",
                    boxShadow: isCurrent ? "0 0 6px rgba(34,197,94,0.4)" : "none",
                  }} />
                  <span style={{
                    color: isCurrent ? "#22c55e" : isDone ? "var(--th-text-secondary)" : "var(--th-text-muted)",
                    fontWeight: isCurrent ? 800 : 600,
                    textTransform: "capitalize",
                  }}>{stage}</span>
                </div>
              );
            })}
          </div>
          {/* Oversight */}
          <div style={sectionDiv}>
            <div style={sectionLabel}>OVERSIGHT</div>
            <PmStats tasks={tasks} />
          </div>
          {/* Team status */}
          <div style={sectionDiv}>
            <div style={sectionLabel}>TEAM STATUS</div>
            <TeamStatusDots agents={agents} pmAgentId={pmAgentId} />
          </div>
          <div style={{ padding: "10px 0" }}>
            <ActBtn label="로그 보기" onClick={() => onFilterLogs(selectedAgent.id)} />
          </div>
        </div>
      )}

      {/* ===== DRILLDOWN: Task ===== */}
      {drilldown === "task" && drilldownTaskId && (
        <TaskDrilldown
          taskId={drilldownTaskId}
          tasks={tasks}
          agents={agents}
          events={taskEvents}
          onBack={handleBack}
        />
      )}

      {/* ===== DEFAULT VIEW: AGENTS + TASKS ===== */}
      {drilldown === "none" && (
        <>
          {/* AGENTS section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={sectionLabel as React.CSSProperties}>AGENTS</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: "var(--th-text-muted)", background: "var(--th-bg-surface)", padding: "2px 8px", borderRadius: 10 }}>
                {agents.length}
              </span>
            </div>
            {agents.map((agent) => {
              const dept = departments.find((d) => d.id === agent.department_id);
              const isPm = agent.role === "team_leader" || agent.id === pmAgentId;
              const color = getColor(dept, isPm);
              const isWorking = agent.status === "working";
              return (
                <div
                  key={agent.id}
                  onClick={() => onSelectAgent(agent.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 8px",
                    borderRadius: 8, cursor: "pointer", transition: "background 0.15s",
                    background: selectedAgentId === agent.id ? "var(--th-bg-surface)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (selectedAgentId !== agent.id) e.currentTarget.style.background = "var(--th-bg-surface-hover)"; }}
                  onMouseLeave={(e) => { if (selectedAgentId !== agent.id) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Color icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: `${color}20`, border: `1px solid ${color}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color, fontSize: 12, fontWeight: 800, flexShrink: 0,
                  }}>
                    {isPm ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ) : (
                      <DeptIconSvg deptName={dept?.name} color={color} />
                    )}
                  </div>
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </div>
                  </div>
                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: isWorking ? "#22c55e" : "var(--th-border-strong)",
                      boxShadow: isWorking ? "0 0 4px rgba(34,197,94,0.4)" : "none",
                    }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: isWorking ? "#22c55e" : "var(--th-text-muted)" }}>
                      {isWorking ? "Coding" : "Waiting"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TASKS section */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={sectionLabel as React.CSSProperties}>TASKS</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: "var(--th-text-muted)", background: "var(--th-bg-surface)", padding: "2px 8px", borderRadius: 10 }}>
                {tasks.filter((t) => t.status === "done").length}/{tasks.length}
              </span>
            </div>
            {tasks.map((task) => {
              const isDone = task.status === "done";
              const isActive = task.status === "in_progress";
              const isFailed = task.status === "failed" || task.execution_state === "failed";
              const assignedAgent = agents.find((a) => a.id === task.assigned_agent_id);
              const dept = assignedAgent ? departments.find((d) => d.id === assignedAgent.department_id) : undefined;
              const tagColor = getColor(dept, assignedAgent?.role === "team_leader");
              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                    borderRadius: 6, cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-bg-surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Checkbox icon */}
                  <span style={{ flexShrink: 0, width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e" stroke="none"><rect x="2" y="2" width="20" height="20" rx="4" /><polyline points="9 12 11.5 14.5 16 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    ) : isFailed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" stroke="none"><rect x="2" y="2" width="20" height="20" rx="4" /><line x1="9" y1="9" x2="15" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" /><line x1="15" y1="9" x2="9" y2="15" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></svg>
                    ) : isActive ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="12" cy="12" r="3" fill="#3b82f6" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--th-border-strong)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4" /></svg>
                    )}
                  </span>
                  {/* Title */}
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: isActive ? 700 : 500, minWidth: 0,
                    color: isDone ? "var(--th-text-muted)" : isFailed ? "#ef4444" : "var(--th-text-primary)",
                    textDecoration: isDone ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {task.title}
                  </span>
                  {/* Agent tag */}
                  {assignedAgent && (
                    <span style={{
                      fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                      background: `${tagColor}20`, color: tagColor,
                      textTransform: "uppercase", flexShrink: 0,
                    }}>
                      {(dept?.name ?? assignedAgent.role).slice(0, 3)}
                    </span>
                  )}
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div style={{ padding: "12px 8px", fontSize: 10, color: "var(--th-text-muted)", fontStyle: "italic" }}>
                태스크 없음
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================
   Sub-components
   ================================================================ */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 4, marginBottom: 12,
        fontFamily: mono, fontSize: 10, fontWeight: 700, color: "var(--th-text-muted)",
        background: "transparent", border: "none", cursor: "pointer", padding: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  );
}

function AgentHeader({ agent, dept, isPm }: { agent: Agent; dept?: Department; isPm: boolean }) {
  const color = getColor(dept, isPm);
  const isWorking = agent.status === "working";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%", background: color,
          boxShadow: `0 0 8px ${color}60`,
        }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--th-text-primary)" }}>{agent.name}</div>
          <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 1 }}>
            {isPm ? "PM" : agent.role === "senior" ? "Senior" : "Junior"}
            {dept && ` / ${dept.name}`}
          </div>
        </div>
      </div>
      <span style={{
        fontSize: 9, fontWeight: 800,
        color: isWorking ? "#22c55e" : "var(--th-text-muted)",
        background: isWorking ? "rgba(34,197,94,0.1)" : "var(--th-bg-surface)",
        border: `1px solid ${isWorking ? "rgba(34,197,94,0.2)" : "var(--th-border)"}`,
        borderRadius: 6, padding: "2px 8px",
      }}>
        {agent.status.toUpperCase()}
      </span>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <>
      <div style={{ height: 4, background: "var(--th-border)", borderRadius: 2, marginBottom: 4 }}>
        <div style={{ height: 4, background: "var(--th-accent)", borderRadius: 2, width: `${percent}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 9, color: "var(--th-text-muted)" }}>{percent}%</div>
    </>
  );
}

function PerformanceSection({ perfEntry }: { perfEntry?: AgentPerformanceEntry }) {
  const fitnessByType = perfEntry?.fitness_by_type ?? [];
  const rateColor = (r: number) => r >= 80 ? "#22c55e" : r >= 50 ? "var(--th-warning)" : "#ef4444";
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--th-border)" }}>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", color: "var(--th-text-muted)", textTransform: "uppercase", marginBottom: 8 }}>PERFORMANCE</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 9, color: "var(--th-text-muted)", width: 46, fontWeight: 700 }}>Overall</span>
        <div style={{ flex: 1, height: 4, background: "var(--th-border)", borderRadius: 2 }}>
          <div style={{ height: 4, borderRadius: 2, background: rateColor(perfEntry?.success_rate ?? 0), width: `${perfEntry?.success_rate ?? 0}%`, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, width: 30, textAlign: "right", color: rateColor(perfEntry?.success_rate ?? 0) }}>
          {perfEntry?.success_rate != null ? `${Math.round(perfEntry.success_rate)}%` : "--"}
        </span>
      </div>
      {fitnessByType.slice(0, 4).map((f) => (
        <div key={f.task_type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: "var(--th-text-muted)", width: 46, fontWeight: 600 }}>{f.task_type.slice(0, 6)}</span>
          <div style={{ flex: 1, height: 3, background: "var(--th-border)", borderRadius: 2 }}>
            <div style={{ height: 3, borderRadius: 2, background: rateColor(f.success_rate), width: `${f.success_rate}%` }} />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, width: 30, textAlign: "right", color: rateColor(f.success_rate) }}>{f.success_rate}%</span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 10 }}>
        <span style={{ color: "var(--th-text-muted)" }}>완료: <span style={{ color: "var(--th-text-primary)", fontWeight: 700 }}>{perfEntry?.done ?? 0}</span></span>
        <span style={{ color: "var(--th-text-muted)" }}>실패: <span style={{ color: (perfEntry?.failed_exec ?? 0) > 0 ? "#ef4444" : "var(--th-text-primary)", fontWeight: 700 }}>{perfEntry?.failed_exec ?? 0}</span></span>
      </div>
    </div>
  );
}

function PmStats({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "done").length;
  const failed = tasks.filter((t) => t.status === "failed" || t.execution_state === "failed").length;
  const review = tasks.filter((t) => t.status === "review").length;
  const total = done + failed;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", fontSize: 10 }}>
      <div><div style={{ color: "var(--th-text-muted)", fontSize: 9, marginBottom: 1 }}>검토 완료</div><div style={{ color: "var(--th-text-primary)", fontWeight: 800 }}>{total}</div></div>
      <div><div style={{ color: "var(--th-text-muted)", fontSize: 9, marginBottom: 1 }}>승인률</div><div style={{ color: rate >= 70 ? "#22c55e" : "var(--th-warning)", fontWeight: 800 }}>{total > 0 ? `${rate}%` : "--"}</div></div>
      <div><div style={{ color: "var(--th-text-muted)", fontSize: 9, marginBottom: 1 }}>검토 중</div><div style={{ color: review > 0 ? "var(--th-review)" : "var(--th-text-muted)", fontWeight: 800 }}>{review}</div></div>
      <div><div style={{ color: "var(--th-text-muted)", fontSize: 9, marginBottom: 1 }}>실패</div><div style={{ color: failed > 0 ? "#ef4444" : "var(--th-text-muted)", fontWeight: 800 }}>{failed}</div></div>
    </div>
  );
}

function TeamStatusDots({ agents, pmAgentId }: { agents: Agent[]; pmAgentId?: string | null }) {
  const team = agents.filter((a) => a.role !== "team_leader" && a.id !== pmAgentId);
  const working = team.filter((a) => a.status === "working").length;
  const idle = team.length - working;
  return (
    <div style={{ fontSize: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ color: "var(--th-text-muted)", width: 50 }}>Working</span>
        <span>{Array.from({ length: team.length }, (_, i) => i < working ? "\u25CF" : "\u25CB").join("")}</span>
        <span style={{ color: "var(--th-text-muted)", fontSize: 9 }}>{working}/{team.length}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--th-text-muted)", width: 50 }}>Idle</span>
        <span>{Array.from({ length: team.length }, (_, i) => i < idle ? "\u25CF" : "\u25CB").join("")}</span>
        <span style={{ color: "var(--th-text-muted)", fontSize: 9 }}>{idle}/{team.length}</span>
      </div>
    </div>
  );
}

function TaskDrilldown({ taskId, tasks, agents, events, onBack }: {
  taskId: string; tasks: Task[]; agents: Agent[]; events: TaskExecutionEvent[]; onBack: () => void;
}) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return <BackButton onClick={onBack} />;
  const agent = agents.find((a) => a.id === task.assigned_agent_id);
  const progress = getTaskProgress(task);
  return (
    <div>
      <BackButton onClick={onBack} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)", marginBottom: 4 }}>{task.title}</div>
        <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
          Status: <span style={{ color: task.status === "done" ? "#22c55e" : task.status === "in_progress" ? "#3b82f6" : "var(--th-text-secondary)", fontWeight: 700 }}>{task.status}</span>
          {agent && <> / Agent: <span style={{ fontWeight: 700 }}>{agent.name}</span></>}
        </div>
        {task.status === "in_progress" && <div style={{ marginTop: 6 }}><ProgressBar percent={progress} /></div>}
      </div>
      {events.length > 0 && (
        <div style={{ padding: "10px 0", borderTop: "1px solid var(--th-border)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.15em", color: "var(--th-text-muted)", textTransform: "uppercase", marginBottom: 8 }}>EXECUTION EVENTS</div>
          {events.slice(0, 15).map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, fontSize: 10 }}>
              <span style={{ color: "var(--th-text-muted)", width: 36, flexShrink: 0 }}>
                {new Date(ev.created_at).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}
              </span>
              <span style={{ color: "var(--th-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ev.event_type}
                {ev.summary ? `: ${typeof ev.summary === "string" ? ev.summary : JSON.stringify(ev.summary)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActBtn({ label, danger, disabled, onClick }: { label: string; danger?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontFamily: mono, fontSize: 10, fontWeight: 700,
        color: disabled ? "var(--th-border-strong)" : danger ? "#ef4444" : "var(--th-text-secondary)",
        background: "transparent",
        border: `1px solid ${disabled ? "var(--th-border)" : danger ? "rgba(239,68,68,0.3)" : "var(--th-border)"}`,
        borderRadius: 6, padding: "4px 10px", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--th-bg-surface)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >{label}</button>
  );
}

function DeptIconSvg({ deptName, color }: { deptName?: string; color: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const k = deptName?.toLowerCase() ?? "";
  if (k.includes("design")) return <svg {...p}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>;
  if (k.includes("qa") || k.includes("test")) return <svg {...p}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
  if (k.includes("devsecops") || k.includes("security")) return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  if (k.includes("operations") || k.includes("ops")) return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
  if (k.includes("planning") || k.includes("plan")) return <svg {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
  return <svg {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
}
