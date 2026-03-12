import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { fetchProjectAgents } from "../../api/categories-dashboard";
import { getTerminal } from "../../api/messaging-runtime-oauth";
import { createTask, getTask, getTasks, assignTask, runTask, stopTask } from "../../api/organization-projects";
import { useWebSocket } from "../../hooks/useWebSocket";

interface AgentActivityPanelProps {
  projectId: string;
  allAgents: Agent[];
  onOpenTerminal: (taskId: string, agent: Agent) => void;
  onCreateTask?: (agentId: string) => void;
  onManageTeam?: () => void;
}

const MINI_LINES = 15;
const POLL_AGENTS_MS = 10_000;
const POLL_TERMINAL_MS = 2_000;

const CLI_LABEL: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  opencode: "OpenCode",
  copilot: "Copilot",
  antigravity: "Antigravity",
  cursor: "Cursor",
  ollama: "Ollama",
};

function CliTag({ provider }: { provider: string }) {
  const label = CLI_LABEL[provider] ?? provider;
  return (
    <span style={{
      fontFamily: "var(--th-font-mono)",
      fontSize: "8px",
      padding: "1px 4px",
      border: "1px solid rgba(245,158,11,0.35)",
      background: "rgba(245,158,11,0.08)",
      color: "#f59e0b",
      letterSpacing: "0.04em",
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function lineColor(line: string): string {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fail")) return "#f85149";
  if (line.startsWith(">") || line.startsWith(" ")) return "#8b949e";
  return "#e6edf3";
}

// ── Working 에이전트 카드 ──────────────────────────────────────
interface AgentCardProps {
  agent: Agent;
  taskId: string;
  taskTitle: string;
  lines: string[];
  onOpen: () => void;
  onCreateTask?: () => void;
}

function AgentCard({ agent, taskId, taskTitle, lines, onOpen, onCreateTask }: AgentCardProps) {
  const [stopping, setStopping] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopTask(taskId);
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="border-b border-[var(--th-border)] last:border-b-0 px-3 py-2.5">
      {/* 에이전트 행 */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-base leading-none flex-shrink-0">{agent.avatar_emoji || "🤖"}</span>
        <span className="font-mono font-semibold flex-shrink-0" style={{ fontSize: "12px", color: "var(--th-text-heading)" }}>
          {agent.name_ko || agent.name}
        </span>
        <CliTag provider={agent.cli_provider} />
        <span className="flex items-center gap-1 font-mono flex-shrink-0"
          style={{ fontSize: "9px", padding: "1px 6px", background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
          <span style={{ fontSize: "7px" }}>●</span> RUNNING
        </span>
        <span className="flex-1 min-w-0 font-mono truncate" style={{ fontSize: "10px", color: "var(--th-text-muted)" }} title={taskTitle}>
          {taskTitle}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* 작업 중지 */}
          <button
            onClick={() => void handleStop()}
            disabled={stopping}
            className="font-mono transition-colors"
            style={{
              fontSize: "10px", padding: "4px 10px",
              border: "1px solid rgba(248,81,73,0.5)",
              background: "rgba(248,81,73,0.08)",
              color: stopping ? "#484f58" : "#f85149",
              cursor: stopping ? "not-allowed" : "pointer",
              opacity: stopping ? 0.5 : 1,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
            onMouseEnter={(e) => { if (!stopping) { (e.currentTarget).style.background = "rgba(248,81,73,0.18)"; (e.currentTarget).style.borderColor = "#f85149"; } }}
            onMouseLeave={(e) => { (e.currentTarget).style.background = "rgba(248,81,73,0.08)"; (e.currentTarget).style.borderColor = "rgba(248,81,73,0.5)"; }}
          >
            {stopping ? "중지 중…" : "■ 작업 중지"}
          </button>
          {/* 새 업무 추가 */}
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="font-mono transition-colors"
              style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "#22c55e"; (e.currentTarget).style.color = "#22c55e"; (e.currentTarget).style.background = "rgba(34,197,94,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--th-border)"; (e.currentTarget).style.color = "var(--th-text-muted)"; (e.currentTarget).style.background = "transparent"; }}
            >
              + 업무
            </button>
          )}
          {/* 터미널 */}
          <button
            onClick={onOpen}
            className="font-mono transition-colors"
            style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget).style.borderColor = "#f59e0b"; (e.currentTarget).style.color = "#f59e0b"; }}
            onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--th-border)"; (e.currentTarget).style.color = "var(--th-text-muted)"; }}
          >
            TERMINAL →
          </button>
          {/* 접기/펴기 */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="font-mono transition-colors"
            style={{ fontSize: "11px", padding: "3px 6px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
            title={collapsed ? "펴기" : "접기"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
        </div>
      </div>

      {/* 미니 터미널 */}
      {!collapsed && <div style={{ border: "1px solid #21262d", background: "#0d1117" }}>
        {/* 터미널 타이틀 바 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "3px 8px",
          borderBottom: "1px solid #21262d",
          background: "#161b22",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f85149", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#484f58", marginLeft: 4 }}>
            {agent.cli_provider} — {agent.name_ko || agent.name}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#3fb950" }}>
            ● live
          </span>
        </div>
        {/* 출력 영역 */}
        <div style={{
          padding: "6px 10px",
          fontFamily: "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
          fontSize: 10,
          lineHeight: "1.6",
          minHeight: 48,
          maxHeight: 180,
          overflowY: "auto",
        }}>
          {lines.length === 0 ? (
            <span style={{ color: "#484f58" }}>
              <span style={{ color: "#f59e0b" }}>$</span> {agent.cli_provider} run — waiting for output…
              <span style={{ animation: "pulse 1s infinite", marginLeft: 4 }}>▌</span>
            </span>
          ) : (
            lines.map((line, i) => (
              <div key={i} style={{ color: lineColor(line), whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {line || "\u00A0"}
              </div>
            ))
          )}
          {/* 커서 깜빡임 */}
          {lines.length > 0 && (
            <span style={{ color: "#3fb950", fontFamily: "var(--th-font-mono)", fontSize: 10 }}>▌</span>
          )}
        </div>
      </div>}
    </div>
  );
}

// ── 완료된 에이전트 카드 ───────────────────────────────────────
function CompletedAgentCard({
  entry,
  onOpen,
  onClear,
}: {
  entry: CompletedEntry;
  onOpen: () => void;
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const elapsed = Math.round((Date.now() - entry.completedAt) / 60000);
  const elapsedLabel = elapsed < 1 ? "방금" : elapsed < 60 ? `${elapsed}분 전` : `${Math.round(elapsed / 60)}시간 전`;
  return (
    <div className="border-b border-[var(--th-border)] last:border-b-0 px-3 py-2.5" style={{ opacity: 0.7 }}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-base leading-none flex-shrink-0">{entry.agent.avatar_emoji || "🤖"}</span>
        <span className="font-mono font-semibold flex-shrink-0" style={{ fontSize: "12px", color: "var(--th-text-heading)" }}>
          {entry.agent.name_ko || entry.agent.name}
        </span>
        <CliTag provider={entry.agent.cli_provider} />
        <span className="flex items-center gap-1 font-mono flex-shrink-0"
          style={{ fontSize: "9px", padding: "1px 6px", background: "rgba(63,185,80,0.1)", color: "#3fb950", border: "1px solid rgba(63,185,80,0.25)" }}>
          <span style={{ fontSize: "7px" }}>✓</span> DONE · {elapsedLabel}
        </span>
        <span className="flex-1 min-w-0 font-mono truncate" style={{ fontSize: "10px", color: "var(--th-text-muted)" }} title={entry.taskTitle}>
          {entry.taskTitle}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onOpen}
            className="font-mono transition-colors"
            style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.color = "#f59e0b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; e.currentTarget.style.color = "var(--th-text-muted)"; }}
          >
            TERMINAL →
          </button>
          <button
            onClick={onClear}
            className="font-mono transition-colors"
            style={{ fontSize: "9px", padding: "3px 8px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f87171"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; e.currentTarget.style.color = "var(--th-text-muted)"; }}
          >
            ✕ 초기화
          </button>
          {/* 접기/펴기 */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="font-mono"
            style={{ fontSize: "11px", padding: "3px 6px", border: "1px solid var(--th-border)", color: "var(--th-text-muted)", background: "transparent", cursor: "pointer" }}
            title={collapsed ? "펴기" : "접기"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
        </div>
      </div>
      {/* 미니 터미널 — 마지막 출력 유지 */}
      {!collapsed && <div style={{ border: "1px solid #21262d", background: "#0d1117" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", borderBottom: "1px solid #21262d", background: "#161b22" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#484f58", display: "inline-block" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#484f58", display: "inline-block" }} />
          <span style={{ fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#484f58", marginLeft: 4 }}>
            {entry.agent.cli_provider} — {entry.agent.name_ko || entry.agent.name}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--th-font-mono)", fontSize: "9px", color: "#484f58" }}>
            ● completed
          </span>
        </div>
        <div style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono','Fira Mono','Consolas',monospace", fontSize: 10, lineHeight: "1.6", minHeight: 48, maxHeight: 180, overflowY: "auto" }}>
          {entry.lines.length === 0 ? (
            <span style={{ color: "#484f58" }}>(no output captured)</span>
          ) : (
            entry.lines.map((line, i) => (
              <div key={i} style={{ color: lineColor(line), whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {line || "\u00A0"}
              </div>
            ))
          )}
        </div>
      </div>}
    </div>
  );
}

// ── Idle / Break / Offline 에이전트 행 ────────────────────────
type AgentRowStatus = "idle" | "break" | "offline";

const STATUS_CONFIG: Record<AgentRowStatus, { dot: string; label: string; dotColor: string; textColor: string }> = {
  idle:    { dot: "○", label: "IDLE",    dotColor: "#3d7a3d", textColor: "#22c55e" },
  break:   { dot: "◐", label: "BREAK",   dotColor: "#484f58", textColor: "#6b7280" },
  offline: { dot: "✕", label: "OFFLINE", dotColor: "#484f58", textColor: "#484f58" },
};

function AgentRow({
  agent,
  status,
  onCreateTask,
}: {
  agent: Agent;
  status: AgentRowStatus;
  onCreateTask?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const canAssign = status !== "offline" || true; // offline도 업무 배정 허용

  return (
    <div
      className="flex items-center border-b border-[var(--th-border)] last:border-b-0"
      style={{
        background: hovered && onCreateTask && canAssign ? "rgba(34,197,94,0.04)" : "transparent",
        transition: "background 0.1s",
        opacity: status === "offline" ? 0.55 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 프롬프트 + 에이전트 정보 */}
      <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1.5" style={{ fontFamily: "var(--th-font-mono)" }}>
        <span style={{ fontSize: "9px", color: hovered && onCreateTask ? cfg.textColor : cfg.dotColor, flexShrink: 0, width: "9px", textAlign: "center" }}>
          {hovered && onCreateTask ? "▶" : cfg.dot}
        </span>
        <span className="leading-none flex-shrink-0" style={{ fontSize: "13px" }}>{agent.avatar_emoji || "🤖"}</span>
        <span style={{ fontSize: "11px", color: hovered && onCreateTask ? "var(--th-text-primary)" : "var(--th-text-secondary)" }}>
          {agent.name_ko || agent.name}
        </span>
        <CliTag provider={agent.cli_provider} />
        <span style={{ fontSize: "9px", color: cfg.dotColor, letterSpacing: "0.05em" }}>
          {cfg.label}
        </span>
      </div>

      {/* 작업 시작 버튼 (hover 시) */}
      {onCreateTask && (
        <button
          onClick={onCreateTask}
          style={{
            fontFamily: "var(--th-font-mono)",
            fontSize: "9px",
            padding: "6px 10px",
            borderLeft: "1px solid var(--th-border)",
            background: hovered ? "rgba(34,197,94,0.08)" : "transparent",
            color: hovered ? "#22c55e" : "transparent",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            transition: "color 0.1s, background 0.1s",
            letterSpacing: "0.05em",
          }}
        >
          + 업무 배정
        </button>
      )}
    </div>
  );
}

interface CompletedEntry {
  agentId: string;
  agent: Agent;
  taskId: string;
  taskTitle: string;
  lines: string[];
  completedAt: number;
}

// ── 메인 패널 ─────────────────────────────────────────────────
export default function AgentActivityPanel({ projectId, allAgents, onOpenTerminal, onCreateTask, onManageTeam }: AgentActivityPanelProps) {
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [terminalLines, setTerminalLines] = useState<Map<string, string[]>>(new Map());
  const [taskTitles, setTaskTitles] = useState<Map<string, string>>(new Map());
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<Array<{ id: string; title: string; assigned_agent_id: string | null }>>([]);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  const [quickDispatchOpen, setQuickDispatchOpen] = useState(false);
  const [tickSec, setTickSec] = useState(0);
  const [completedEntries, setCompletedEntries] = useState<CompletedEntry[]>([]);

  const terminalLinesRef = useRef(terminalLines);
  terminalLinesRef.current = terminalLines;
  const prevWorkingRef = useRef<Map<string, { taskId: string; agent: Agent }>>(new Map());

  const { on } = useWebSocket();

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetchProjectAgents(projectId);
      setTeamAgentIds(new Set(res.map((a) => a.id)));
    } finally {
      setLoadingTeam(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTeam();
    const id = setInterval(() => void loadTeam(), POLL_AGENTS_MS);
    return () => clearInterval(id);
  }, [loadTeam]);

  // 1초 tick — footer 타이머용
  useEffect(() => {
    const id = setInterval(() => setTickSec((s) => (s + 1) % (POLL_AGENTS_MS / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // 프로젝트 대기 업무 폴링
  const loadPendingTasks = useCallback(async () => {
    try {
      const tasks = await getTasks({ project_id: projectId, status: "pending" });
      setPendingTasks(tasks.map((t) => ({ id: t.id, title: t.title, assigned_agent_id: t.assigned_agent_id })));
    } catch {}
  }, [projectId]);

  useEffect(() => {
    void loadPendingTasks();
    const id = setInterval(() => void loadPendingTasks(), POLL_AGENTS_MS);
    return () => clearInterval(id);
  }, [loadPendingTasks]);

  // 자동 배정 실행 (모달에서 제목/설명 받아서 create → assign → run)
  const handleQuickDispatch = useCallback(async (title: string, description: string, targetAgent: Agent) => {
    setDispatching(true);
    setDispatchLog([]);
    const log: string[] = [];
    try {
      log.push(`> creating "${title.slice(0, 40)}"`);
      setDispatchLog([...log]);
      const taskId = await createTask({ title, description: description || undefined, project_id: projectId });
      log.push(`  ✓ task created`);
      log.push(`> assigning → ${targetAgent.name_ko || targetAgent.name}`);
      setDispatchLog([...log]);
      await assignTask(taskId, targetAgent.id);
      await runTask(taskId);
      log.push(`  ✓ started`);
      log.push(`$ dispatch complete`);
      setDispatchLog([...log]);
      await loadPendingTasks();
      setTimeout(() => setDispatchLog([]), 4000);
    } catch (e) {
      log.push(`  ✕ error: ${e instanceof Error ? e.message : "unknown"}`);
      setDispatchLog([...log]);
      setTimeout(() => setDispatchLog([]), 5000);
    } finally {
      setDispatching(false);
    }
  }, [projectId, loadPendingTasks]);

  // 팀 에이전트 분류
  const teamAgents = allAgents.filter((a) => teamAgentIds.has(a.id));
  const workingAgents = teamAgents.filter((a) => a.status === "working" && a.current_task_id);
  const idleAgents   = teamAgents.filter((a) => a.status === "idle");
  const breakAgents  = teamAgents.filter((a) => a.status === "break");
  const offlineAgents = teamAgents.filter((a) => a.status === "offline" || !["working", "idle", "break"].includes(a.status));

  // 작업 완료 감지 — working → idle/break 전환 시 completedEntries에 추가
  useEffect(() => {
    const prevWorking = prevWorkingRef.current;
    const currentWorkingMap = new Map(workingAgents.map((a) => [a.id, { taskId: a.current_task_id!, agent: a }]));
    const justFinished: CompletedEntry[] = [];
    for (const [agentId, info] of prevWorking.entries()) {
      if (!currentWorkingMap.has(agentId)) {
        // 이 에이전트가 working에서 빠짐 → 완료
        const lines = terminalLinesRef.current.get(info.taskId) ?? [];
        const title = taskTitles.get(info.taskId) ?? info.taskId.slice(0, 8);
        justFinished.push({ agentId, agent: info.agent, taskId: info.taskId, taskTitle: title, lines, completedAt: Date.now() });
      }
    }
    if (justFinished.length > 0) {
      setCompletedEntries((prev) => [...justFinished, ...prev].slice(0, 10)); // 최대 10개 유지
    }
    prevWorkingRef.current = currentWorkingMap;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingAgents.map((a) => a.id).join(",")]);

  // 태스크 제목 조회 (캐시)
  useEffect(() => {
    for (const agent of workingAgents) {
      const taskId = agent.current_task_id!;
      if (!taskTitles.has(taskId)) {
        void getTask(taskId).then(({ task }) => {
          setTaskTitles((prev) => new Map(prev).set(taskId, task.title));
        }).catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingAgents.map((a) => a.current_task_id).join(",")]);

  // 터미널 출력 폴링
  useEffect(() => {
    if (workingAgents.length === 0) return;
    const fetchAll = async () => {
      await Promise.all(workingAgents.map(async (agent) => {
        const taskId = agent.current_task_id!;
        try {
          const result = await getTerminal(taskId, MINI_LINES);
          const rawLines = result.text.split("\n").filter((l) => l.trim() !== "").slice(-MINI_LINES);
          setTerminalLines((prev) => new Map(prev).set(taskId, rawLines));
        } catch {}
      }));
    };
    void fetchAll();
    const id = setInterval(() => void fetchAll(), POLL_TERMINAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingAgents.map((a) => a.current_task_id).join(",")]);

  // WebSocket 실시간 출력
  useEffect(() => {
    return on("cli_output", (payload) => {
      const { task_id, text } = payload as { task_id: string; text: string };
      const newLines = text.split("\n").filter((l) => l.trim() !== "");
      if (newLines.length === 0) return;
      setTerminalLines((prev) => {
        const existing = prev.get(task_id) ?? [];
        const combined = [...existing, ...newLines].slice(-MINI_LINES);
        return new Map(prev).set(task_id, combined);
      });
    });
  }, [on]);

  if (loadingTeam) return null;

  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

  return (
    <>
    {quickDispatchOpen && (
      <QuickDispatchModal
        idleAgents={idleAgents}
        allTeamAgents={teamAgents}
        onSubmit={(title, description, agent) => {
          setQuickDispatchOpen(false);
          void handleQuickDispatch(title, description, agent);
        }}
        onClose={() => setQuickDispatchOpen(false)}
      />
    )}
    <div className="flex flex-col" style={{ borderTop: "1px solid var(--th-border)", flex: 1 }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--th-border)]">
        <span style={{ ...mono, fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--th-text-muted)", textTransform: "uppercase" }}>
          AGENT ACTIVITY
        </span>
        <div className="flex items-center gap-3">
          {workingAgents.length > 0 && (
            <span style={{ ...mono, fontSize: "9px", color: "#f59e0b" }}>
              ● {workingAgents.length} RUNNING
            </span>
          )}
          {idleAgents.length + breakAgents.length > 0 && (
            <span style={{ ...mono, fontSize: "9px", color: "#22c55e" }}>
              ○ {idleAgents.length + breakAgents.length} IDLE
            </span>
          )}
          {offlineAgents.length > 0 && (
            <span style={{ ...mono, fontSize: "9px", color: "#484f58" }}>
              ✕ {offlineAgents.length} OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* ── AUTO DISPATCH 패널 ── */}
      {teamAgents.length > 0 && (
        <div style={{ borderBottom: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div style={{ ...mono, fontSize: "10px", flex: 1, minWidth: 0 }}>
              <span style={{ color: "var(--th-accent)", fontWeight: 700 }}>$</span>
              <span style={{ color: "var(--th-text-muted)", marginLeft: 6 }}>
                {idleAgents.length > 0
                  ? <><span style={{ color: "#22c55e" }}>{idleAgents.length}</span> IDLE · 배정 가능</>
                  : <span style={{ opacity: 0.5 }}>idle 에이전트 없음</span>
                }
              </span>
            </div>
            <button
              onClick={() => { if (!dispatching) setQuickDispatchOpen(true); }}
              disabled={dispatching}
              style={{
                ...mono,
                fontSize: "10px",
                fontWeight: 700,
                padding: "4px 12px",
                border: "1px solid",
                borderColor: dispatching ? "var(--th-border)" : "#22c55e",
                background: dispatching ? "transparent" : "rgba(34,197,94,0.08)",
                color: dispatching ? "var(--th-text-muted)" : "#22c55e",
                cursor: dispatching ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
                flexShrink: 0,
              }}
            >
              {dispatching ? "배정 중…" : "▶ 자동 배정"}
            </button>
          </div>

          {/* 배정 로그 */}
          {dispatchLog.length > 0 && (
            <div style={{
              margin: "0 8px 8px",
              padding: "6px 10px",
              background: "#0d1117",
              border: "1px solid #21262d",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              lineHeight: "1.7",
            }}>
              {dispatchLog.map((line, i) => (
                <div key={i} style={{
                  color: line.startsWith("  ✓") ? "#3fb950"
                    : line.startsWith("  ✕") ? "#f85149"
                    : line.startsWith("$") ? "#f59e0b"
                    : "#8b949e",
                }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 팀 에이전트 없음 */}
      {teamAgents.length === 0 && (
        <div style={{ ...mono, padding: "12px", fontSize: "11px", color: "var(--th-text-muted)" }}>
          $ ls agents/ — no agents in team
        </div>
      )}

      {/* ── RUNNING ── */}
      {workingAgents.map((agent) => {
        const taskId = agent.current_task_id!;
        return (
          <AgentCard
            key={agent.id}
            agent={agent}
            taskId={taskId}
            taskTitle={taskTitles.get(taskId) ?? "loading…"}
            lines={terminalLines.get(taskId) ?? []}
            onOpen={() => onOpenTerminal(taskId, agent)}
            onCreateTask={onCreateTask ? () => onCreateTask(agent.id) : undefined}
          />
        );
      })}

      {/* ── RECENTLY COMPLETED ── */}
      {completedEntries.length > 0 && (
        <>
          <div style={{ ...mono, fontSize: "9px", padding: "4px 12px", color: "var(--th-text-muted)", background: "var(--th-bg-elevated)", borderTop: "1px solid var(--th-border)", borderBottom: "1px solid var(--th-border)", letterSpacing: "0.08em" }}>
            // recently completed
          </div>
          {completedEntries.map((entry) => (
            <CompletedAgentCard
              key={`${entry.agentId}-${entry.completedAt}`}
              entry={entry}
              onOpen={() => onOpenTerminal(entry.taskId, entry.agent)}
              onClear={() => setCompletedEntries((prev) => prev.filter((e) => e.completedAt !== entry.completedAt || e.agentId !== entry.agentId))}
            />
          ))}
        </>
      )}

      {/* ── IDLE ── */}
      {idleAgents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          status="idle"
          onCreateTask={onCreateTask ? () => onCreateTask(agent.id) : undefined}
        />
      ))}

      {/* ── BREAK ── */}
      {breakAgents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          status="break"
          onCreateTask={onCreateTask ? () => onCreateTask(agent.id) : undefined}
        />
      ))}

      {/* ── OFFLINE ── */}
      {offlineAgents.map((agent) => (
        <AgentRow
          key={agent.id}
          agent={agent}
          status="offline"
          onCreateTask={onCreateTask ? () => onCreateTask(agent.id) : undefined}
        />
      ))}

      {/* ── FOOTER ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-3"
        style={{
          ...mono,
          marginTop: "auto",
          borderTop: "1px solid var(--th-border)",
          background: "var(--th-bg-primary)",
          padding: "6px 12px",
          minHeight: 32,
        }}
      >
        {/* 상태 도트 */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          {teamAgents.length === 0 ? (
            <span style={{ fontSize: "9px", color: "var(--th-text-muted)", opacity: 0.4 }}>no agents</span>
          ) : (
            teamAgents.map((a) => {
              const color =
                a.status === "working" ? "#f59e0b" :
                a.status === "idle"    ? "#22c55e" :
                a.status === "break"   ? "#818cf8" : "#374151";
              return (
                <span
                  key={a.id}
                  title={`${a.name_ko || a.name} · ${a.status}`}
                  style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }}
                />
              );
            })
          )}
        </div>

        {/* 에이전트 수 */}
        {teamAgents.length > 0 && (
          <span style={{ fontSize: "9px", color: "var(--th-text-muted)", flexShrink: 0 }}>
            {teamAgents.length} AGENT{teamAgents.length !== 1 ? "S" : ""}
          </span>
        )}

        {/* 구분 */}
        <span style={{ fontSize: "9px", color: "var(--th-border)", marginLeft: "auto" }}>
          REFRESH {Math.max(0, Math.round(POLL_AGENTS_MS / 1000) - tickSec)}s
        </span>

        {/* 팀 관리 링크 */}
        {onManageTeam && (
          <>
            <span style={{ fontSize: "9px", color: "var(--th-border)" }}>·</span>
            <button
              onClick={onManageTeam}
              style={{
                ...mono,
                fontSize: "9px",
                color: "var(--th-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                letterSpacing: "0.05em",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-muted)"; }}
            >
              MANAGE TEAM →
            </button>
          </>
        )}
      </div>
    </div>
    </>
  );
}

// ── QuickDispatchModal ──────────────────────────────────────────
function QuickDispatchModal({
  idleAgents,
  allTeamAgents,
  onSubmit,
  onClose,
}: {
  idleAgents: Agent[];
  allTeamAgents: Agent[];
  onSubmit: (title: string, description: string, agent: Agent) => void;
  onClose: () => void;
}) {
  const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>(idleAgents[0]?.id ?? "");

  const assignableAgents = idleAgents.length > 0 ? idleAgents : allTeamAgents;
  const targetAgent = assignableAgents.find((a) => a.id === selectedAgentId) ?? assignableAgents[0];
  const canSubmit = title.trim().length > 0 && !!targetAgent;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
      onSubmit(title.trim(), description.trim(), targetAgent!);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          ...mono,
          width: 480,
          background: "var(--th-bg-elevated)",
          border: "1px solid var(--th-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* 타이틀바 */}
        <div style={{ borderBottom: "1px solid var(--th-border)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, background: "var(--th-bg-primary)" }}>
          <span style={{ color: "var(--th-accent)", fontWeight: 700, fontSize: "10px" }}>$</span>
          <span style={{ fontSize: "10px", color: "var(--th-text-muted)", letterSpacing: "0.05em" }}>dispatch --new-task --auto-assign</span>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--th-text-muted)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "0 2px" }}>✕</button>
        </div>

        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* title */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>
              TASK TITLE <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="무엇을 해야 하나요?"
              style={{
                ...mono,
                fontSize: "12px",
                padding: "7px 10px",
                background: "var(--th-bg-primary)",
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-primary)",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--th-accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
            />
          </div>

          {/* description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>
              DESCRIPTION <span style={{ opacity: 0.4 }}>(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상세 내용..."
              rows={3}
              style={{
                ...mono,
                fontSize: "11px",
                padding: "7px 10px",
                background: "var(--th-bg-primary)",
                border: "1px solid var(--th-border)",
                borderRadius: 0,
                color: "var(--th-text-secondary)",
                outline: "none",
                resize: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--th-accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--th-border)"; }}
            />
          </div>

          {/* 에이전트 선택 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "9px", color: "var(--th-text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>
              ASSIGN TO
            </label>
            {assignableAgents.length === 0 ? (
              <div style={{ fontSize: "10px", color: "#f87171", padding: "6px 10px", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.05)" }}>
                ✕ 배정 가능한 에이전트가 없습니다
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {assignableAgents.map((agent) => {
                  const isIdle = agent.status === "idle";
                  const selected = agent.id === selectedAgentId;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      style={{
                        ...mono,
                        fontSize: "10px",
                        padding: "4px 10px",
                        border: `1px solid ${selected ? "#22c55e" : "var(--th-border)"}`,
                        background: selected ? "rgba(34,197,94,0.1)" : "transparent",
                        color: selected ? "#22c55e" : "var(--th-text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <span style={{ fontSize: "7px", color: isIdle ? "#22c55e" : "#94a3b8" }}>●</span>
                      {agent.avatar_emoji} {agent.name_ko || agent.name}
                      {!isIdle && <span style={{ fontSize: "8px", opacity: 0.5 }}>({agent.status})</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 미리보기 */}
          {canSubmit && targetAgent && (
            <div style={{ fontSize: "9px", color: "var(--th-text-muted)", padding: "6px 10px", background: "var(--th-bg-primary)", borderLeft: "2px solid #22c55e" }}>
              <span style={{ color: "var(--th-accent)" }}>→</span>{" "}
              <span style={{ color: "var(--th-text-secondary)" }}>"{title.trim()}"</span>
              {" "}<span style={{ opacity: 0.5 }}>will be assigned to</span>{" "}
              <span style={{ color: "#22c55e", fontWeight: 700 }}>{targetAgent.name_ko || targetAgent.name}</span>
              {" "}<span style={{ opacity: 0.5 }}>and started immediately</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ borderTop: "1px solid var(--th-border)", padding: "8px 14px", display: "flex", justifyContent: "flex-end", gap: 8, background: "var(--th-bg-primary)" }}>
          <button
            onClick={onClose}
            style={{ ...mono, fontSize: "10px", padding: "5px 14px", border: "1px solid var(--th-border)", background: "transparent", color: "var(--th-text-muted)", cursor: "pointer" }}
          >
            CANCEL
          </button>
          <button
            onClick={() => canSubmit && onSubmit(title.trim(), description.trim(), targetAgent!)}
            disabled={!canSubmit}
            style={{
              ...mono,
              fontSize: "10px",
              fontWeight: 700,
              padding: "5px 16px",
              border: `1px solid ${canSubmit ? "#22c55e" : "var(--th-border)"}`,
              background: canSubmit ? "rgba(34,197,94,0.12)" : "transparent",
              color: canSubmit ? "#22c55e" : "var(--th-text-muted)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              letterSpacing: "0.05em",
            }}
          >
            ▶ 배정 실행
          </button>
        </div>
      </div>
    </div>
  );
}
