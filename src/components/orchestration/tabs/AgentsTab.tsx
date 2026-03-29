import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Task, Agent, Department } from "../../../types";
import { getTaskProgress } from "../task-progress";
import { getAgentsPerformance, stopTask, pauseTask, resumeTask, assignTask, type AgentPerformanceEntry } from "../../../api/organization-projects";
import { useUiStore } from "../../../store/uiStore";

const mono = "var(--th-font-mono)";
const PERF_REFRESH_DEBOUNCE_MS = 3_000;

interface AgentsTabProps {
  agents: Agent[];
  tasks: Task[];
  departments: Department[];
  projectId?: string;
  pmAgentId?: string;
  onSwitchToLogs?: (agentId: string) => void;
}

export default function AgentsTab({ agents, tasks, departments, projectId, pmAgentId, onSwitchToLogs }: AgentsTabProps) {
  const [perfMap, setPerfMap] = useState<Map<string, AgentPerformanceEntry>>(new Map());
  const [actionMenuAgentId, setActionMenuAgentId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reassignAgentId, setReassignAgentId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "role" | "status" | "fitness">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const perfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addToast = useUiStore((s) => s.addToast);

  // Count done/failed tasks as a change signal
  const doneCount = tasks.filter((t) => t.status === "done" || t.execution_state === "failed").length;

  useEffect(() => {
    getAgentsPerformance(projectId)
      .then((entries) => setPerfMap(new Map(entries.map((e) => [e.agent_id, e]))))
      .catch(() => {});
  }, [projectId]);

  // Debounced refresh when task completions change
  useEffect(() => {
    if (perfDebounceRef.current) clearTimeout(perfDebounceRef.current);
    perfDebounceRef.current = setTimeout(() => {
      getAgentsPerformance(projectId)
        .then((entries) => setPerfMap(new Map(entries.map((e) => [e.agent_id, e]))))
        .catch(() => {});
    }, PERF_REFRESH_DEBOUNCE_MS);
    return () => { if (perfDebounceRef.current) clearTimeout(perfDebounceRef.current); };
  }, [projectId, doneCount]);

  const activeCount = agents.filter((a) => a.status === "working").length;

  // Per-agent live token totals from runtimeStatuses
  const runtimeStatuses = useUiStore((s) => s.runtimeStatuses);
  const agentTokenMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [, info] of runtimeStatuses) {
      if (!info.agentId) continue;
      const tokens = (info.inputTokens ?? 0) + (info.outputTokens ?? 0);
      map.set(info.agentId, (map.get(info.agentId) ?? 0) + tokens);
    }
    return map;
  }, [runtimeStatuses]);

  const fmtTokens = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  // Compute metrics
  const totalDone = [...perfMap.values()].reduce((s, e) => s + (e.done ?? 0), 0);
  const totalTasks = [...perfMap.values()].reduce((s, e) => s + (e.total ?? 0), 0);
  const costEfficiency = totalTasks > 0 ? (totalDone / totalTasks * 100).toFixed(0) : "--";

  const handleSortToggle = useCallback((key: typeof sortKey) => {
    if (sortKey === key) { setSortAsc((v) => !v); }
    else { setSortKey(key); setSortAsc(true); }
  }, [sortKey]);

  const sortedAgents = [...agents].filter((a) => a.role !== "team_leader").sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "name") return dir * a.name.localeCompare(b.name);
    if (sortKey === "role") {
      const order: Record<string, number> = { team_leader: 0, senior: 1, junior: 2 };
      return dir * ((order[a.role] ?? 3) - (order[b.role] ?? 3));
    }
    if (sortKey === "status") {
      const aW = a.status === "working" ? 0 : 1;
      const bW = b.status === "working" ? 0 : 1;
      return dir * (aW - bW);
    }
    if (sortKey === "fitness") {
      const aRate = perfMap.get(a.id)?.success_rate ?? 0;
      const bRate = perfMap.get(b.id)?.success_rate ?? 0;
      return dir * (bRate - aRate);
    }
    return 0;
  });

  const handleToggleMenu = useCallback((agentId: string) => {
    setActionMenuAgentId((prev) => (prev === agentId ? null : agentId));
    setReassignAgentId(null);
  }, []);

  const handleViewLogs = useCallback((agentId: string) => {
    setActionMenuAgentId(null);
    onSwitchToLogs?.(agentId);
  }, [onSwitchToLogs]);

  const handleStopAgent = useCallback(async (agentId: string) => {
    const agentTasks = tasks.filter((t) => t.assigned_agent_id === agentId && t.status === "in_progress");
    if (agentTasks.length === 0) { setActionMenuAgentId(null); return; }
    setBusyAction(`stop:${agentId}`);
    try {
      await Promise.all(agentTasks.map((t) => stopTask(t.id)));
    } catch {
      addToast({ type: "error", title: "Failed to stop agent tasks" });
    }
    setBusyAction(null);
    setActionMenuAgentId(null);
  }, [tasks, addToast]);

  const handlePauseAgent = useCallback(async (agentId: string) => {
    const agentTasks = tasks.filter((t) => t.assigned_agent_id === agentId && t.status === "in_progress");
    if (agentTasks.length === 0) { setActionMenuAgentId(null); return; }
    setBusyAction(`pause:${agentId}`);
    try {
      await Promise.all(agentTasks.map((t) => pauseTask(t.id)));
    } catch {
      addToast({ type: "error", title: "Failed to pause agent tasks" });
    }
    setBusyAction(null);
    setActionMenuAgentId(null);
  }, [tasks, addToast]);

  const handleResumeAgent = useCallback(async (agentId: string) => {
    const agentTasks = tasks.filter((t) => t.assigned_agent_id === agentId && t.status === "pending");
    if (agentTasks.length === 0) { setActionMenuAgentId(null); return; }
    setBusyAction(`resume:${agentId}`);
    try {
      await Promise.all(agentTasks.map((t) => resumeTask(t.id)));
    } catch {
      addToast({ type: "error", title: "Failed to resume agent tasks" });
    }
    setBusyAction(null);
    setActionMenuAgentId(null);
  }, [tasks, addToast]);

  const handleReassignStart = useCallback((agentId: string) => {
    setReassignAgentId(agentId);
  }, []);

  const handleReassignTo = useCallback(async (fromAgentId: string, toAgentId: string) => {
    const agentTasks = tasks.filter(
      (t) => t.assigned_agent_id === fromAgentId && (t.status === "in_progress" || t.status === "planned"),
    );
    if (agentTasks.length === 0) {
      setActionMenuAgentId(null);
      setReassignAgentId(null);
      return;
    }
    setBusyAction(`reassign:${fromAgentId}`);
    try {
      for (const t of agentTasks) {
        if (t.status === "in_progress") await stopTask(t.id);
        await assignTask(t.id, toAgentId);
      }
    } catch {
      addToast({ type: "error", title: "Failed to reassign tasks" });
    }
    setBusyAction(null);
    setActionMenuAgentId(null);
    setReassignAgentId(null);
  }, [tasks, addToast]);

  // Other agents for reassignment (exclude PM and self)
  const getReassignTargets = useCallback((excludeAgentId: string) => {
    return agents.filter((a) => a.id !== excludeAgentId && a.role !== "team_leader");
  }, [agents]);

  return (
    <div style={{ fontFamily: mono }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ padding: 6, background: "var(--th-accent-glow)", borderRadius: 10, color: "var(--th-accent)", display: "flex", alignItems: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)", margin: 0 }}>
              팀 에이전트
            </h3>
            <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2, fontWeight: 600 }}>
              활성 {activeCount}명 / 전체 {agents.length}명
            </div>
          </div>
        </div>
      </div>

      {/* Metrics bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricBar
          label="태스크 완료"
          value={`${totalDone}건 완료`}
          percent={totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0}
          color="var(--th-accent)"
        />
        <MetricBar
          label="성공률"
          value={costEfficiency !== "--" ? `${costEfficiency}%` : "--"}
          percent={costEfficiency !== "--" ? parseFloat(costEfficiency) : 0}
          color="var(--th-success)"
        />
      </div>

      {/* PM Agent Card */}
      <PmAgentCard agents={agents} tasks={tasks} perfMap={perfMap} pmAgentId={pmAgentId} onSwitchToLogs={onSwitchToLogs} />

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 80px 40px",
        gap: 8,
        padding: "10px 16px",
        background: "var(--th-bg-surface)",
        borderRadius: "12px 12px 0 0",
        border: "1px solid var(--th-border)",
        borderBottom: "none",
        fontSize: 10,
        color: "var(--th-text-muted)",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
      }}>
        <SortableHeader label="에이전트" sortKey_="name" currentKey={sortKey} asc={sortAsc} onClick={handleSortToggle} />
        <SortableHeader label="역할" sortKey_="role" currentKey={sortKey} asc={sortAsc} onClick={handleSortToggle} />
        <SortableHeader label="상태" sortKey_="status" currentKey={sortKey} asc={sortAsc} onClick={handleSortToggle} />
        <span>진행 태스크</span>
        <SortableHeader label="성과" sortKey_="fitness" currentKey={sortKey} asc={sortAsc} onClick={handleSortToggle} />
        <span>토큰</span>
        <span></span>
      </div>

      {/* Agent rows */}
      <div style={{ border: "1px solid var(--th-border)", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
      {sortedAgents.map((agent) => {
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
            gridTemplateColumns: "2fr 1fr 100px 2fr 1.5fr 80px 40px",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid var(--th-bg-primary)",
            alignItems: "start",
            fontSize: 12,
            position: "relative",
            background: "var(--th-bg-elevated)",
            transition: "background 0.15s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-bg-surface)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--th-bg-elevated)"; }}
          >
            {/* Identity */}
            <div>
              <div style={{ color: "var(--th-text-primary)", fontWeight: 700 }}>
                {agent.name.toUpperCase().replace(/\s+/g, "_")}
              </div>
              <div style={{ fontSize: 10, color: "var(--th-text-muted)" }}>
                ID: {agent.id.substring(0, 8)}
              </div>
            </div>

            {/* Role / Domain */}
            <div>
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                color: "var(--th-bg-elevated)",
                background: agent.role === "team_leader" ? "var(--th-accent)" : "var(--th-success)",
                padding: "3px 8px",
                borderRadius: 6,
                display: "inline-block",
                width: "fit-content",
              }}>
                {roleLabel}
              </span>
              {dept && (
                <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 4 }}>
                  {domainLabel}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isWorking ? "var(--th-success)" : "var(--th-border-strong)",
                boxShadow: isWorking ? "0 0 6px var(--th-green-glow)" : "none",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: isWorking ? "var(--th-success)" : "var(--th-text-muted)",
              }}>
                {agent.status.toUpperCase()}
              </span>
            </div>

            {/* Current process */}
            <div>
              <div style={{ fontSize: 11, color: "var(--th-text-primary)", marginBottom: 4, fontWeight: 500 }}>
                {currentTask ? currentTask.title : (
                  <span style={{ fontStyle: "italic", color: "var(--th-border-strong)" }}>
                    대기 중...
                  </span>
                )}
              </div>
              {currentTask && (
                <div style={{ height: 4, background: "var(--th-border)", width: "100%", borderRadius: 2 }}>
                  <div style={{ height: 4, background: "var(--th-accent)", width: `${getTaskProgress(currentTask)}%`, transition: "width 0.3s", borderRadius: 2 }} />
                </div>
              )}
            </div>

            {/* Fitness Metrics */}
            <div style={{ fontSize: 10 }}>
              {fitnessByType.length > 0 ? (
                fitnessByType.slice(0, 4).map((f) => (
                  <div key={f.task_type} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <span style={{ color: "var(--th-text-muted)", width: 36, flexShrink: 0, textTransform: "uppercase" as const, fontWeight: 600 }}>
                      {f.task_type.slice(0, 4)}:
                    </span>
                    <span style={{
                      color: f.success_rate >= 80 ? "var(--th-success)" : f.success_rate >= 50 ? "var(--th-warning)" : "var(--th-danger-text)",
                      fontWeight: 800,
                    }}>
                      {f.success_rate}%
                    </span>
                    <span style={{ color: "var(--th-border-strong)", fontSize: 9 }}>({f.total})</span>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--th-accent)", fontWeight: 700 }}>
                  FITNESS: {perf?.success_rate != null ? `${Math.round(perf.success_rate)}%` : "--"}
                </div>
              )}
            </div>

            {/* Token usage */}
            <div style={{ fontSize: 11 }}>
              {agentTokenMap.has(agent.id) ? (
                <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>
                  {fmtTokens(agentTokenMap.get(agent.id)!)}
                </span>
              ) : (
                <span style={{ color: "var(--th-text-muted)" }}>--</span>
              )}
            </div>

            {/* Action menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => handleToggleMenu(agent.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--th-text-muted)", padding: 4,
                  borderRadius: 8,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--th-bg-primary)"; }}
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
                  agentId={agent.id}
                  agentName={agent.name}
                  hasActiveTask={!!currentTask}
                  hasPendingTasks={agentTasks.some((t) => t.status === "planned")}
                  hasPausedTasks={agentTasks.some((t) => t.status === "pending")}
                  busyAction={busyAction}
                  showReassign={reassignAgentId === agent.id}
                  reassignTargets={getReassignTargets(agent.id)}
                  onViewLogs={() => handleViewLogs(agent.id)}
                  onPause={() => void handlePauseAgent(agent.id)}
                  onResume={() => void handleResumeAgent(agent.id)}
                  onStop={() => void handleStopAgent(agent.id)}
                  onReassignStart={() => handleReassignStart(agent.id)}
                  onReassignTo={(toId) => void handleReassignTo(agent.id, toId)}
                  onClose={() => { setActionMenuAgentId(null); setReassignAgentId(null); }}
                />
              )}
            </div>
          </div>
        );
      })}
      </div>

      {agents.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--th-text-muted)", fontSize: 12, background: "var(--th-bg-elevated)", borderRadius: 16, border: "1px dashed var(--th-border)" }}>
          이 프로젝트에 배정된 에이전트가 없습니다.
        </div>
      )}
    </div>
  );
}

/* -- Action Menu -- */

interface ActionMenuProps {
  agentId: string;
  agentName: string;
  hasActiveTask: boolean;
  hasPendingTasks: boolean;
  hasPausedTasks: boolean;
  busyAction: string | null;
  showReassign: boolean;
  reassignTargets: Agent[];
  onViewLogs: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReassignStart: () => void;
  onReassignTo: (toAgentId: string) => void;
  onClose: () => void;
}

function ActionMenu({
  agentId, agentName, hasActiveTask, hasPendingTasks, hasPausedTasks, busyAction,
  showReassign, reassignTargets, onViewLogs, onPause, onResume, onStop, onReassignStart, onReassignTo, onClose,
}: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const isBusy = busyAction?.startsWith("stop:") || busyAction?.startsWith("reassign:")
    || busyAction?.startsWith("pause:") || busyAction?.startsWith("resume:");
  const canStop = hasActiveTask && !isBusy;
  const canPause = hasActiveTask && !isBusy;
  const canResume = hasPausedTasks && !isBusy;
  const canReassign = (hasActiveTask || hasPendingTasks) && !isBusy;

  return (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        right: 0,
        top: 28,
        width: showReassign ? 220 : 170,
        background: "var(--th-bg-elevated)",
        border: "1px solid var(--th-border)",
        borderRadius: 14,
        zIndex: 100,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{
        fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", fontWeight: 800,
        padding: "8px 14px", borderBottom: "1px solid var(--th-bg-primary)",
        letterSpacing: "0.05em", textTransform: "uppercase" as const,
      }}>
        {agentName.toUpperCase().replace(/\s+/g, "_")}
      </div>

      {!showReassign ? (
        <>
          <ActionMenuItem icon="log" label="로그 보기" onClick={onViewLogs} />
          <ActionMenuItem
            icon="pause"
            label={busyAction === `pause:${agentId}` ? "일시정지 중..." : "일시정지"}
            disabled={!canPause}
            onClick={onPause}
          />
          {canResume && (
            <ActionMenuItem
              icon="resume"
              label={busyAction === `resume:${agentId}` ? "재개 중..." : "재개"}
              onClick={onResume}
            />
          )}
          <ActionMenuItem
            icon="reassign"
            label="태스크 재배정"
            disabled={!canReassign}
            onClick={onReassignStart}
          />
          <ActionMenuItem
            icon="stop"
            label={busyAction === `stop:${agentId}` ? "중지 중..." : "에이전트 중지"}
            danger
            disabled={!canStop}
            onClick={onStop}
          />
        </>
      ) : (
        <>
          <div style={{
            fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", fontWeight: 700,
            padding: "6px 14px", borderBottom: "1px solid var(--th-bg-primary)",
          }}>
            태스크를 다른 에이전트로:
          </div>
          {reassignTargets.length > 0 ? reassignTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              disabled={isBusy}
              onClick={() => onReassignTo(target.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 14px",
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                color: "var(--th-text-secondary)",
                background: "transparent",
                border: "none",
                cursor: isBusy ? "not-allowed" : "pointer",
                textAlign: "left",
                opacity: isBusy ? 0.5 : 1,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!isBusy) e.currentTarget.style.background = "var(--th-bg-surface)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {target.name}
            </button>
          )) : (
            <div style={{ padding: "10px 14px", fontSize: 10, color: "var(--th-text-muted)", fontStyle: "italic" }}>
              배정 가능한 에이전트 없음
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActionMenuItem({ icon, label, danger, disabled, onClick }: {
  icon: string; label: string; danger?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "10px 14px",
        fontFamily: mono,
        fontSize: 11,
        fontWeight: 600,
        color: disabled ? "var(--th-border-strong)" : danger ? "var(--th-danger-text)" : "var(--th-text-secondary)",
        background: "transparent",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "var(--th-bg-surface)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon === "log" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
      )}
      {icon === "reassign" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
      )}
      {icon === "stop" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><rect x="9" y="9" width="6" height="6" /></svg>
      )}
      {icon === "pause" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
      )}
      {icon === "resume" && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
      )}
      {label}
    </button>
  );
}

/* -- PM Agent Card -- */

function PmAgentCard({ agents, tasks, perfMap, pmAgentId, onSwitchToLogs }: {
  agents: Agent[];
  tasks: Task[];
  perfMap: Map<string, AgentPerformanceEntry>;
  pmAgentId?: string;
  onSwitchToLogs?: (agentId: string) => void;
}) {
  const pmAgent = agents.find((a) => a.role === "team_leader");
  if (!pmAgent) return null;

  const reviewTasks = tasks.filter((t) => t.status === "review");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const failedTasks = tasks.filter((t) => t.status === "failed" || t.execution_state === "failed");
  const totalReviewed = doneTasks.length + failedTasks.length;
  const approvalRate = totalReviewed > 0 ? Math.round((doneTasks.length / totalReviewed) * 100) : 0;
  const pmPerf = perfMap.get(pmAgent.id);

  return (
    <div style={{
      border: "1px solid var(--th-accent-border)",
      background: "var(--th-accent-glow)",
      borderRadius: 16,
      padding: "14px 20px",
      marginBottom: 16,
      fontFamily: mono,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "var(--th-accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--th-bg-elevated)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--th-text-primary)", letterSpacing: "0.05em" }}>
              {pmAgent.name.toUpperCase().replace(/\s+/g, "_")}
            </div>
            <div style={{ fontSize: 9, color: "var(--th-accent)", fontWeight: 700 }}>프로젝트 매니저</div>
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800,
          color: pmAgent.status === "working" ? "var(--th-success)" : "var(--th-text-muted)",
          background: pmAgent.status === "working" ? "var(--th-success-bg)" : "var(--th-bg-surface)",
          border: `1px solid ${pmAgent.status === "working" ? "var(--th-success-border)" : "var(--th-border)"}`,
          borderRadius: 8,
          padding: "3px 10px",
        }}>
          {pmAgent.status === "working" ? "검토 중" : "대기"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
        <div>
          <div style={{ color: "var(--th-text-muted)", fontWeight: 600, marginBottom: 2 }}>검토 완료</div>
          <div style={{ color: "var(--th-text-primary)", fontWeight: 800 }}>{totalReviewed}</div>
        </div>
        <div>
          <div style={{ color: "var(--th-text-muted)", fontWeight: 600, marginBottom: 2 }}>승인률</div>
          <div style={{ color: approvalRate >= 70 ? "var(--th-success)" : "var(--th-warning)", fontWeight: 800 }}>
            {totalReviewed > 0 ? `${approvalRate}%` : "--"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--th-text-muted)", fontWeight: 600, marginBottom: 2 }}>검토 중</div>
          <div style={{ color: reviewTasks.length > 0 ? "var(--th-review)" : "var(--th-text-muted)", fontWeight: 800 }}>
            {reviewTasks.length}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--th-text-muted)", fontWeight: 600, marginBottom: 2 }}>실패</div>
          <div style={{ color: failedTasks.length > 0 ? "var(--th-danger-text)" : "var(--th-text-muted)", fontWeight: 800 }}>
            {failedTasks.length}
          </div>
        </div>
        {pmPerf?.success_rate != null && (
          <div>
            <div style={{ color: "var(--th-text-muted)", fontWeight: 600, marginBottom: 2 }}>FITNESS</div>
            <div style={{ color: "var(--th-accent)", fontWeight: 800 }}>{Math.round(pmPerf.success_rate)}%</div>
          </div>
        )}
      </div>
      {pmAgent && onSwitchToLogs && (
        <div style={{ marginTop: 10, borderTop: "1px solid var(--th-border)", paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => onSwitchToLogs(pmAgent.id)}
            style={{
              fontFamily: mono, fontSize: 10, fontWeight: 700,
              background: "transparent",
              border: "1px solid var(--th-border)",
              borderRadius: 8,
              color: "var(--th-text-secondary)",
              padding: "4px 12px",
              cursor: "pointer",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; e.currentTarget.style.borderColor = "var(--th-accent-border)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-secondary)"; e.currentTarget.style.borderColor = "var(--th-border)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            로그 보기
          </button>
        </div>
      )}
    </div>
  );
}

/* -- Sortable Header -- */

function SortableHeader({ label, sortKey_, currentKey, asc, onClick }: {
  label: string;
  sortKey_: "name" | "role" | "status" | "fitness";
  currentKey: string;
  asc: boolean;
  onClick: (key: "name" | "role" | "status" | "fitness") => void;
}) {
  const isActive = currentKey === sortKey_;
  return (
    <span
      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3, userSelect: "none" }}
      onClick={() => onClick(sortKey_)}
    >
      {label}
      {isActive && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: asc ? "rotate(0)" : "rotate(180deg)", transition: "transform 0.2s" }}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
    </span>
  );
}

/* -- Metric Bar -- */

function MetricBar({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      background: "var(--th-bg-elevated)",
      border: "1px solid var(--th-border)",
      borderRadius: 14,
      padding: "12px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--th-text-muted)", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: "var(--th-border)", width: "100%", borderRadius: 2 }}>
        <div style={{ height: 4, background: color, width: `${Math.min(percent, 100)}%`, transition: "width 0.3s", borderRadius: 2 }} />
      </div>
    </div>
  );
}
