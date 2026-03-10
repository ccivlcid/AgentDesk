import { useState, useMemo } from "react";
import { useI18n, localeName } from "../i18n";
import type { Agent, Department, Project, Task } from "../types";
import AgentAvatar from "./AgentAvatar";
import { ROLE_BADGE, ROLE_LABEL } from "./agent-manager/constants";

export interface WorkMapProps {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment?: (dept: Department) => void;
  projectAgentIds?: Set<string>;
  unreadAgentIds?: Set<string>;
  currentProject?: Project | null;
  // Legacy props — accepted but unused
  subAgents?: unknown;
  meetingPresence?: unknown;
  activeMeetingTaskId?: string | null;
  crossDeptDeliveries?: unknown;
  onCrossDeptDeliveryProcessed?: unknown;
  ceoOfficeCalls?: unknown;
  onCeoOfficeCallProcessed?: unknown;
  onOpenActiveMeetingMinutes?: unknown;
  customDeptThemes?: unknown;
  themeHighlightTargetId?: unknown;
  cliStatus?: unknown;
  cliUsage?: unknown;
  cliUsageRef?: unknown;
  cliUsageRefreshing?: boolean;
  onRefreshCliUsage?: unknown;
  onOpenRoomManager?: unknown;
  activeWorkflowPackKey?: unknown;
}

const AGENT_STATUS_LABEL: Record<string, string> = {
  working: "RUNNING",
  idle: "IDLE",
  break: "BREAK",
  offline: "OFFLINE",
};

const AGENT_STATUS_CLASS: Record<string, string> = {
  working: "status-badge status-badge-running",
  idle: "status-badge status-badge-idle",
  break: "status-badge status-badge-paused",
  offline: "status-badge status-badge-error",
};

const ACTIVITY_PCT: Record<string, number> = {
  working: 85,
  idle: 50,
  break: 22,
  offline: 5,
};

const ACTIVITY_COLOR: Record<string, string> = {
  working: "var(--th-attr-elite)",
  idle: "var(--th-attr-avg)",
  break: "var(--th-attr-poor)",
  offline: "var(--th-attr-vlow)",
};

function getAgentCurrentTask(agentId: string, tasks: Task[]): Task | null {
  return (
    tasks.find((t) => t.assigned_agent_id === agentId && t.status === "in_progress") ??
    tasks.find((t) => t.assigned_agent_id === agentId && t.status === "pending") ??
    null
  );
}

function AgentRow({
  agent,
  tasks,
  locale,
  isKo,
  unread,
  dimmed,
  onClick,
}: {
  agent: Agent;
  tasks: Task[];
  locale: string;
  isKo: boolean;
  unread: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const currentTask = getAgentCurrentTask(agent.id, tasks);
  const activityPct = ACTIVITY_PCT[agent.status] ?? 5;
  const activityColor = ACTIVITY_COLOR[agent.status] ?? "var(--th-attr-vlow)";
  const isWorking = agent.status === "working";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--th-bg-surface-hover)]"
      style={{
        borderLeft: isWorking ? "2px solid #22c55e" : "2px solid transparent",
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 0.1s linear, border-color 0.1s linear",
      }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <AgentAvatar agent={agent} size={32} rounded="sm" />
        {unread && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--th-accent)]"
            style={{ border: "1px solid var(--th-bg-surface)" }}
          />
        )}
      </div>

      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-xs font-semibold font-mono truncate"
            style={{ color: "var(--th-text-heading)" }}
          >
            {localeName(locale, agent)}
          </span>
          <span
            className={`text-[9px] px-1 border font-medium font-mono shrink-0 ${ROLE_BADGE[agent.role] || ""}`}
            style={{ borderRadius: "2px" }}
          >
            {isKo ? ROLE_LABEL[agent.role]?.ko : ROLE_LABEL[agent.role]?.en}
          </span>
        </div>
        {/* Task or status */}
        <p className="text-[10px] font-mono truncate" style={{ color: "var(--th-text-muted)" }}>
          {currentTask ? `↳ ${currentTask.title}` : "—"}
        </p>
      </div>

      {/* Activity bar + badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="overflow-hidden"
          style={{ width: 40, height: 3, borderRadius: "1px", background: "var(--th-border)" }}
        >
          <div
            style={{
              width: `${activityPct}%`,
              height: "100%",
              background: activityColor,
              transition: "width 0.3s linear",
            }}
          />
        </div>
        <span className={AGENT_STATUS_CLASS[agent.status] ?? "status-badge status-badge-idle"} style={{ fontSize: "8px" }}>
          {AGENT_STATUS_LABEL[agent.status] ?? "IDLE"}
        </span>
      </div>
    </button>
  );
}

function DeptPanel({
  dept,
  agents,
  tasks,
  locale,
  isKo,
  unreadAgentIds,
  projectAgentIds,
  onSelectAgent,
  onSelectDepartment,
}: {
  dept: Department;
  agents: Agent[];
  tasks: Task[];
  locale: string;
  isKo: boolean;
  unreadAgentIds: Set<string>;
  projectAgentIds?: Set<string>;
  onSelectAgent: (a: Agent) => void;
  onSelectDepartment?: (d: Department) => void;
}) {
  const workingCount = agents.filter((a) => a.status === "working").length;
  const activeTasks = tasks.filter(
    (t) => agents.some((a) => a.id === t.assigned_agent_id) && t.status === "in_progress",
  ).length;

  return (
    <div
      style={{
        background: "var(--th-bg-surface)",
        border: "1px solid var(--th-border)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      {/* Dept header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--th-bg-surface-hover)] transition-colors"
        style={{ borderBottom: "1px solid var(--th-border)" }}
        onClick={() => onSelectDepartment?.(dept)}
      >
        <span style={{ fontSize: 14 }}>{dept.icon ?? "🏢"}</span>
        <span
          className="flex-1 text-left text-xs font-semibold font-mono uppercase tracking-wider truncate"
          style={{ color: "var(--th-text-heading)" }}
        >
          {localeName(locale, dept)}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {activeTasks > 0 && (
            <span
              className="text-[9px] font-mono px-1"
              style={{ color: "var(--th-attr-elite)", background: "rgba(34,197,94,0.08)", borderRadius: "2px", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              {activeTasks} {isKo ? "진행중" : "active"}
            </span>
          )}
          <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>
            {workingCount}/{agents.length}
          </span>
        </div>
      </button>

      {/* Agent rows */}
      <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
        {agents.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            tasks={tasks}
            locale={locale}
            isKo={isKo}
            unread={unreadAgentIds.has(agent.id)}
            dimmed={projectAgentIds !== undefined && !projectAgentIds.has(agent.id)}
            onClick={() => onSelectAgent(agent)}
          />
        ))}
      </div>
    </div>
  );
}

export default function OfficeView({
  departments,
  agents,
  tasks,
  onSelectAgent,
  onSelectDepartment,
  projectAgentIds,
  unreadAgentIds = new Set(),
  currentProject,
}: WorkMapProps) {
  const { t, locale } = useI18n();
  const [filterDeptId, setFilterDeptId] = useState<string | null>(null);
  const isKo = locale.startsWith("ko");

  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  const visibleDepts = useMemo(
    () => (filterDeptId ? departments.filter((d) => d.id === filterDeptId) : departments),
    [departments, filterDeptId],
  );

  const agentsByDept = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const dept of departments) {
      map.set(dept.id, agents.filter((a) => a.department_id === dept.id));
    }
    return map;
  }, [departments, agents]);

  const workingCount = agents.filter((a) => a.status === "working").length;
  const inProgressTaskCount = tasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top status bar */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-4 py-2"
        style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
      >
        <div className="flex items-center gap-2">
          {workingCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          <span
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "var(--th-text-muted)" }}
          >
            {tr("워크맵", "WORK MAP")}
          </span>
          {currentProject && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5"
              style={{ color: "var(--th-accent)", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "2px" }}
            >
              {currentProject.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--th-attr-elite)" }}>
            {workingCount} {tr("근무중", "working")}
          </span>
          {inProgressTaskCount > 0 && (
            <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--th-text-muted)" }}>
              {inProgressTaskCount} {tr("진행중 태스크", "tasks active")}
            </span>
          )}
        </div>

        {/* Dept filter */}
        <div className="ml-auto flex items-center gap-0" style={{ borderLeft: "1px solid var(--th-border)", paddingLeft: "0.75rem" }}>
          <button
            className="px-2.5 py-1 text-[10px] font-mono transition-colors"
            style={{
              color: filterDeptId === null ? "var(--th-text-heading)" : "var(--th-text-muted)",
              borderBottom: filterDeptId === null ? "1px solid var(--th-accent, #f59e0b)" : "1px solid transparent",
            }}
            onClick={() => setFilterDeptId(null)}
          >
            ALL
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono transition-colors"
              style={{
                color: filterDeptId === dept.id ? "var(--th-text-heading)" : "var(--th-text-muted)",
                borderBottom: filterDeptId === dept.id ? "1px solid var(--th-accent, #f59e0b)" : "1px solid transparent",
              }}
              onClick={() => setFilterDeptId(dept.id)}
            >
              {dept.icon && <span style={{ fontSize: 11 }}>{dept.icon}</span>}
              <span className="hidden sm:inline">{localeName(locale, dept)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dept panels grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {visibleDepts.length === 0 ? (
          <div className="terminal-empty-state py-16">
            <p className="terminal-empty-state-cmd">$ ls departments/</p>
            <p className="terminal-empty-state-result">(empty)</p>
            <p className="terminal-empty-state-hint">{tr("부서가 없습니다", "No departments yet")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleDepts.map((dept) => {
              const deptAgents = agentsByDept.get(dept.id) ?? [];
              if (deptAgents.length === 0) return null;
              return (
                <DeptPanel
                  key={dept.id}
                  dept={dept}
                  agents={deptAgents}
                  tasks={tasks}
                  locale={locale}
                  isKo={isKo}
                  unreadAgentIds={unreadAgentIds}
                  projectAgentIds={projectAgentIds}
                  onSelectAgent={onSelectAgent}
                  onSelectDepartment={onSelectDepartment}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
