import { useState, useMemo, useEffect } from "react";
import { useI18n, localeName } from "../i18n";
import type { Agent, Department, Project, Task } from "../types";
import { ROLE_LABEL } from "./agent-manager/constants";

export interface WorkMapProps {
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
  onSelectAgent: (agent: Agent) => void;
  onSelectDepartment?: (dept: Department) => void;
  projectAgentIds?: Set<string>;
  unreadAgentIds?: Set<string>;
  currentProject?: Project | null;
  onAddToTeam?: (agentId: string) => Promise<void>;
  onRemoveFromTeam?: (agentId: string) => Promise<void>;
}

type SortKey = "status" | "load" | "name" | "dept" | "time";

const STATUS_ORDER: Record<string, number> = { working: 0, idle: 1, break: 2, offline: 3 };
const STATUS_LABEL: Record<string, string> = { working: "R", idle: "S", break: "T", offline: "Z" };
const STATUS_FULL: Record<string, string> = { working: "RUNNING", idle: "IDLE", break: "BREAK", offline: "OFFLINE" };
const STATUS_COLOR: Record<string, string> = { working: "#22c55e", idle: "#6b7280", break: "#f59e0b", offline: "#374151" };

function getAgentTask(agentId: string, tasks: Task[]): Task | null {
  return (
    tasks.find((t) => t.assigned_agent_id === agentId && t.status === "in_progress") ??
    tasks.find((t) => t.assigned_agent_id === agentId && t.status === "pending") ??
    null
  );
}

function getLoad(agent: Agent, task: Task | null): number {
  if (agent.status !== "working") return 0;
  return (task as any)?.progress_percent ?? 50;
}

function getLoadColor(pct: number): string {
  if (pct >= 80) return "#f87171";
  if (pct >= 50) return "#fbbf24";
  return "#22c55e";
}

function formatUptime(startedAt: number | null): string {
  if (!startedAt) return "—";
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m.toString().padStart(2, "0")}m`;
}

/** htop 상단 패널: 에이전트별 부하 바 */
function TopPanel({ agents, tasks }: { agents: Agent[]; tasks: Task[] }) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const BAR_CELLS = 32;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "2px 12px",
        padding: "8px 14px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-primary)",
        flexShrink: 0,
      }}
    >
      {agents.map((agent) => {
        const task = getAgentTask(agent.id, tasks);
        const load = getLoad(agent, task);
        const barColor = agent.status === "working" ? getLoadColor(load) : STATUS_COLOR[agent.status];
        const filled = agent.status === "working" ? Math.round((load / 100) * BAR_CELLS) : 0;

        return (
          <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Agent number/emoji */}
            <span style={{ ...mono, fontSize: "10px", width: 16, color: "var(--th-text-muted)", flexShrink: 0, textAlign: "right" }}>
              {agent.avatar_emoji || "🤖"}
            </span>
            {/* Name */}
            <span style={{ ...mono, fontSize: "10px", width: 60, color: barColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
              {(agent.name_ko ?? agent.name).slice(0, 6)}
            </span>
            {/* Bar */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", flexShrink: 0 }}>[</span>
              <div style={{ flex: 1, height: "10px", display: "flex", alignItems: "stretch", background: "transparent", gap: 0 }}>
                {Array.from({ length: BAR_CELLS }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      background: i < filled ? barColor : "rgba(255,255,255,0.06)",
                    }}
                  />
                ))}
              </div>
              <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", flexShrink: 0 }}>]</span>
            </div>
            {/* Percentage */}
            <span style={{ ...mono, fontSize: "10px", width: 28, color: barColor, textAlign: "right", flexShrink: 0 }}>
              {agent.status === "working" ? `${load}%` : STATUS_LABEL[agent.status] ?? "?"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 요약 통계 라인 */
function SummaryBar({
  agents,
  tasks,
  currentProject,
  teamCount,
}: {
  agents: Agent[];
  tasks: Task[];
  currentProject?: Project | null;
  teamCount: number;
}) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const running = agents.filter((a) => a.status === "working").length;
  const idle = agents.filter((a) => a.status === "idle" || a.status === "break").length;
  const offline = agents.filter((a) => a.status === "offline").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;

  const dot = (color: string) => (
    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, marginRight: 3 }} />
  );

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "4px 14px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-elevated)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginRight: 16 }}>
        Agents: <strong style={{ color: "var(--th-text-secondary)" }}>{agents.length}</strong>
      </span>
      <span style={{ ...mono, fontSize: "9px", color: "#22c55e", marginRight: 12 }}>
        {dot("#22c55e")}{running} running
      </span>
      <span style={{ ...mono, fontSize: "9px", color: "#6b7280", marginRight: 12 }}>
        {dot("#6b7280")}{idle} idle
      </span>
      <span style={{ ...mono, fontSize: "9px", color: "#374151", marginRight: 16 }}>
        {dot("#374151")}{offline} offline
      </span>
      <span style={{ width: 1, height: 12, background: "var(--th-border)", margin: "0 12px 0 0" }} />
      <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginRight: 12 }}>
        Tasks: <span style={{ color: "#22c55e" }}>{inProgress} active</span>
        {" / "}
        <span style={{ color: "var(--th-text-muted)" }}>{done} done today</span>
      </span>
      {currentProject && teamCount > 0 && (
        <>
          <span style={{ width: 1, height: 12, background: "var(--th-border)", margin: "0 12px 0 0" }} />
          <span style={{ ...mono, fontSize: "9px", color: "var(--th-accent)", opacity: 0.8 }}>
            team: {teamCount}
          </span>
        </>
      )}
    </div>
  );
}

/** 컬럼 헤더 */
function TableHeader({
  sortKey,
  onSort,
}: {
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  const col = (key: SortKey, label: string, w: number | string) => (
    <button
      key={key}
      type="button"
      onClick={() => onSort(key)}
      style={{
        ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.06em",
        color: sortKey === key ? "var(--th-accent)" : "var(--th-text-muted)",
        background: "none", border: "none", cursor: "pointer", padding: 0,
        width: typeof w === "number" ? w : undefined, flex: typeof w === "string" ? w : undefined,
        textAlign: "left", whiteSpace: "nowrap",
      }}
    >
      {sortKey === key ? `▾ ${label}` : label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "5px 14px",
        borderBottom: "2px solid var(--th-border)",
        background: "var(--th-bg-elevated)",
        flexShrink: 0,
      }}
    >
      <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", width: 28, flexShrink: 0 }}>PID</span>
      <span style={{ width: 36, flexShrink: 0 }} />
      {col("name", "AGENT", 90)}
      {col("dept", "DEPT", 80)}
      {col("status", "STAT", 60)}
      <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: "var(--th-text-muted)", flex: "1 1 0", minWidth: 80 }}>LOAD</span>
      {col("load", "%CPU", 40)}
      <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: "var(--th-text-muted)", width: 80, flexShrink: 0 }}>TASK#</span>
      {col("time", "TIME", 60)}
      <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: "var(--th-text-muted)", flex: "2 1 0", minWidth: 120 }}>COMMAND</span>
    </div>
  );
}

/** 에이전트 행 */
function AgentRow({
  agent,
  task,
  locale,
  isKo,
  dimmed,
  inTeam,
  hasProject,
  unread,
  onAddToTeam,
  onRemoveFromTeam,
  onClick,
}: {
  agent: Agent;
  task: Task | null;
  locale: string;
  isKo: boolean;
  dimmed: boolean;
  inTeam: boolean;
  hasProject: boolean;
  unread: boolean;
  onAddToTeam?: () => void;
  onRemoveFromTeam?: () => void;
  onClick: () => void;
}) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const load = getLoad(agent, task);
  const barColor = agent.status === "working" ? getLoadColor(load) : STATUS_COLOR[agent.status];
  const isRunning = agent.status === "working";
  const BAR = 20;
  const filled = isRunning ? Math.round((load / 100) * BAR) : 0;

  const dept = agent.department;
  const deptName = dept ? (isKo ? dept.name_ko ?? dept.name : dept.name) : "—";
  const uptime = isRunning && task?.started_at ? formatUptime(task.started_at) : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left transition-colors"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "4px 14px",
        borderBottom: `1px solid var(--th-border)`,
        background: isRunning ? "rgba(34,197,94,0.04)" : "transparent",
        opacity: dimmed ? 0.3 : 1,
        cursor: "pointer",
        borderLeft: isRunning ? "2px solid #22c55e" : "2px solid transparent",
      }}
    >
      {/* PID */}
      <span style={{ ...mono, fontSize: "10px", color: "var(--th-text-muted)", width: 28, flexShrink: 0, overflow: "hidden" }}>
        {agent.id.slice(0, 4)}
      </span>

      {/* Avatar */}
      <div style={{ width: 20, flexShrink: 0, position: "relative" }}>
        <span style={{ fontSize: "14px" }}>{agent.avatar_emoji || "🤖"}</span>
        {unread && (
          <span style={{ position: "absolute", top: -1, right: -1, width: 5, height: 5, borderRadius: "50%", background: "var(--th-accent)", border: "1px solid var(--th-bg-primary)" }} />
        )}
      </div>
      <span style={{ width: 16, flexShrink: 0 }} />

      {/* Name */}
      <span style={{ ...mono, fontSize: "10px", fontWeight: 700, color: isRunning ? "#86efac" : "var(--th-text-secondary)", width: 90, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {(agent.name_ko ?? agent.name).slice(0, 8)}
      </span>

      {/* Dept */}
      <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {deptName.slice(0, 9)}
      </span>

      {/* STAT */}
      <span style={{ ...mono, fontSize: "9px", fontWeight: 700, color: barColor, width: 60, flexShrink: 0 }}>
        {STATUS_LABEL[agent.status] ?? "?"} {STATUS_FULL[agent.status]?.slice(0, 3) ?? "???"}
      </span>

      {/* Load bar */}
      <div style={{ flex: "1 1 0", minWidth: 80, display: "flex", alignItems: "center", gap: 1 }}>
        <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0 }}>[</span>
        <div style={{ flex: 1, height: 8, display: "flex", gap: 0 }}>
          {Array.from({ length: BAR }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: i < filled ? barColor : "rgba(255,255,255,0.05)",
              }}
            />
          ))}
        </div>
        <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0 }}>]</span>
      </div>

      {/* %CPU */}
      <span style={{ ...mono, fontSize: "10px", color: barColor, width: 40, textAlign: "right", paddingRight: 8, flexShrink: 0 }}>
        {isRunning ? `${load}%` : "0%"}
      </span>

      {/* Task# */}
      <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task ? `#${task.id.slice(0, 6)}` : "—"}
      </span>

      {/* Time */}
      <span style={{ ...mono, fontSize: "9px", color: isRunning ? "#86efac" : "var(--th-text-muted)", width: 60, flexShrink: 0 }}>
        {uptime}
      </span>

      {/* Command */}
      <span style={{ ...mono, fontSize: "10px", color: isRunning ? "var(--th-text-secondary)" : "var(--th-text-muted)", flex: "2 1 0", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task ? task.title : <span style={{ opacity: 0.4 }}>—</span>}
      </span>

      {/* Team buttons (hover) */}
      {hasProject && inTeam && onRemoveFromTeam && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemoveFromTeam(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ ...mono, fontSize: "8px", padding: "2px 5px", borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", cursor: "pointer", flexShrink: 0, marginLeft: 6 }}
        >
          × RM
        </button>
      )}
      {hasProject && !inTeam && onAddToTeam && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddToTeam(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ ...mono, fontSize: "8px", padding: "2px 5px", borderRadius: 0, border: "1px solid rgba(245,158,11,0.3)", color: "var(--th-accent)", background: "transparent", cursor: "pointer", flexShrink: 0, marginLeft: 6 }}
        >
          + ADD
        </button>
      )}
    </button>
  );
}

/** F-key 하단 바 */
function FKeyBar({ onSearch, onToggleProject, projectOnly }: { onSearch: () => void; onToggleProject: () => void; projectOnly: boolean }) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const keys = [
    { f: "F3", label: "Search", action: onSearch },
    { f: "F5", label: projectOnly ? "All Agents" : "This Project", action: onToggleProject },
    { f: "F6", label: "SortBy", action: undefined },
    { f: "F10", label: "Quit", action: undefined },
  ];
  return (
    <div
      style={{
        flexShrink: 0, display: "flex", alignItems: "stretch",
        borderTop: "1px solid var(--th-border)",
        background: "var(--th-bg-elevated)",
        height: 22,
      }}
    >
      {keys.map((k) => (
        <button
          key={k.f}
          type="button"
          onClick={k.action}
          style={{
            display: "flex", alignItems: "center", gap: 0,
            border: "none", borderRight: "1px solid var(--th-border)",
            background: "none", cursor: k.action ? "pointer" : "default", padding: 0,
          }}
        >
          <span style={{ ...mono, fontSize: "9px", fontWeight: 700, background: "var(--th-text-secondary)", color: "var(--th-bg-primary)", padding: "0 4px", height: "100%", display: "flex", alignItems: "center" }}>
            {k.f}
          </span>
          <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", padding: "0 8px" }}>
            {k.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/** ── Main OfficeView (htop style) ── */
export default function OfficeView({
  departments,
  agents,
  tasks,
  onSelectAgent,
  projectAgentIds,
  unreadAgentIds = new Set(),
  currentProject,
  onAddToTeam,
  onRemoveFromTeam,
}: WorkMapProps) {
  const { locale } = useI18n();
  const isKo = locale.startsWith("ko");

  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [filterProjectOnly, setFilterProjectOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  // 1초마다 uptime 갱신
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 표시할 에이전트 풀
  const baseAgents = useMemo(() => {
    let pool = filterProjectOnly && projectAgentIds ? agents.filter((a) => projectAgentIds.has(a.id)) : agents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter((a) =>
        (a.name_ko ?? a.name).toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.department?.name ?? "").toLowerCase().includes(q)
      );
    }
    return pool;
  }, [agents, filterProjectOnly, projectAgentIds, searchQuery]);

  // 정렬
  const sortedAgents = useMemo(() => {
    const arr = [...baseAgents];
    arr.sort((a, b) => {
      if (sortKey === "status") return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (sortKey === "name") return (a.name_ko ?? a.name).localeCompare(b.name_ko ?? b.name);
      if (sortKey === "dept") return (a.department?.name ?? "").localeCompare(b.department?.name ?? "");
      if (sortKey === "load") {
        const ta = getAgentTask(a.id, tasks);
        const tb = getAgentTask(b.id, tasks);
        return getLoad(b, tb) - getLoad(a, ta);
      }
      if (sortKey === "time") {
        const ta = getAgentTask(a.id, tasks);
        const tb = getAgentTask(b.id, tasks);
        return (tb?.started_at ?? 0) - (ta?.started_at ?? 0);
      }
      return 0;
    });
    return arr;
  }, [baseAgents, sortKey, tasks, tick]);

  const teamCount = projectAgentIds?.size ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--th-bg-primary)" }}>

      {/* ── 헤더 ── */}
      <div
        style={{
          flexShrink: 0, display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-elevated)",
          borderLeft: "3px solid var(--th-accent)",
        }}
      >
        <span style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", color: "var(--th-text-muted)" }}>
          WORKMAP
        </span>
        {currentProject && (
          <>
            <span style={{ color: "var(--th-border)" }}>▸</span>
            <span style={{ ...mono, fontSize: "10px", fontWeight: 600, color: "var(--th-text-heading)" }}>
              {currentProject.name}
            </span>
          </>
        )}
        <span style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", marginLeft: 8, opacity: 0.6 }}>
          htop {new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </span>

        {/* dept 필터 */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 0 }}>
          {departments.map((d) => (
            <button
              key={d.id}
              type="button"
              title={isKo ? d.name_ko ?? d.name : d.name}
              style={{ ...mono, fontSize: "9px", padding: "3px 7px", border: "none", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
            >
              {d.icon ?? d.name.slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── 상단 에이전트 부하 바 패널 ── */}
      <TopPanel agents={sortedAgents} tasks={tasks} />

      {/* ── 요약 통계 라인 ── */}
      <SummaryBar agents={baseAgents} tasks={tasks} currentProject={currentProject} teamCount={teamCount} />

      {/* ── 검색 바 (F3) ── */}
      {searchOpen && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "4px 14px", borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          <span style={{ ...mono, fontSize: "9px", color: "var(--th-accent)", fontWeight: 700 }}>Search:</span>
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); } }}
            placeholder="agent name / dept..."
            style={{ ...mono, fontSize: "10px", flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--th-text-primary)", caretColor: "var(--th-accent)" }}
          />
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} style={{ ...mono, fontSize: "9px", color: "var(--th-text-muted)", background: "none", border: "none", cursor: "pointer" }}>ESC</button>
        </div>
      )}

      {/* ── 컬럼 헤더 ── */}
      <TableHeader sortKey={sortKey} onSort={setSortKey} />

      {/* ── 프로세스 목록 ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sortedAgents.length === 0 ? (
          <div style={{ ...mono, fontSize: "11px", color: "var(--th-text-muted)", textAlign: "center", padding: "40px 0", opacity: 0.5 }}>
            <p>no processes</p>
          </div>
        ) : (
          sortedAgents.map((agent) => {
            const task = getAgentTask(agent.id, tasks);
            return (
              <AgentRow
                key={agent.id}
                agent={agent}
                task={task}
                locale={locale}
                isKo={isKo}
                dimmed={filterProjectOnly && projectAgentIds !== undefined && !projectAgentIds.has(agent.id)}
                inTeam={projectAgentIds !== undefined && projectAgentIds.has(agent.id)}
                hasProject={!!currentProject}
                unread={unreadAgentIds.has(agent.id)}
                onAddToTeam={onAddToTeam ? () => void onAddToTeam(agent.id) : undefined}
                onRemoveFromTeam={onRemoveFromTeam ? () => void onRemoveFromTeam(agent.id) : undefined}
                onClick={() => onSelectAgent(agent)}
              />
            );
          })
        )}
      </div>

      {/* ── F-key 바 ── */}
      <FKeyBar
        onSearch={() => setSearchOpen(true)}
        onToggleProject={() => setFilterProjectOnly((v) => !v)}
        projectOnly={filterProjectOnly}
      />
    </div>
  );
}
