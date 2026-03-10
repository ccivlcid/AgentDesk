import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent } from "../../types";
import { fetchProjectAgents } from "../../api/categories-dashboard";
import { getTerminal } from "../../api/messaging-runtime-oauth";
import { getTask } from "../../api/organization-projects";
import { useWebSocket } from "../../hooks/useWebSocket";

interface AgentActivityPanelProps {
  projectId: string;
  allAgents: Agent[];
  onOpenTerminal: (taskId: string, agent: Agent) => void;
}

const MINI_LINES = 8;
const POLL_AGENTS_MS = 10_000;
const POLL_TERMINAL_MS = 3_000;

function lineColor(line: string): string {
  const l = line.toLowerCase();
  if (l.includes("error") || l.includes("fail")) return "#f85149";
  if (line.startsWith(">") || line.startsWith(" ")) return "#8b949e";
  return "#e6edf3";
}

interface AgentCardProps {
  agent: Agent;
  taskId: string;
  taskTitle: string;
  lines: string[];
  onOpen: () => void;
}

function AgentCard({ agent, taskTitle, lines, onOpen }: AgentCardProps) {
  return (
    <div
      className="border-b border-[var(--th-border)] last:border-b-0 px-3 py-2.5"
    >
      {/* 에이전트 행 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none flex-shrink-0">{agent.avatar_emoji || "🤖"}</span>
        <span className="text-[12px] font-medium text-[var(--th-text)] flex-shrink-0">
          {agent.name_ko || agent.name}
        </span>
        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
          style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
          <span className="text-[8px]">●</span> 실행 중
        </span>
        <span
          className="flex-1 min-w-0 text-[10px] text-[var(--th-text-muted)] truncate"
          title={taskTitle}
        >
          {taskTitle}
        </span>
        <button
          onClick={onOpen}
          className="flex-shrink-0 text-[9px] px-2 py-1 rounded transition-colors font-mono"
          style={{ border: "1px solid var(--th-border)", color: "var(--th-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#f59e0b";
            (e.currentTarget as HTMLButtonElement).style.color = "#f59e0b";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--th-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--th-text-muted)";
          }}
        >
          터미널 열기 →
        </button>
      </div>

      {/* 미니 터미널 */}
      <div
        style={{
          background: "#0d1117",
          borderRadius: 4,
          padding: "5px 8px",
          fontFamily: "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
          fontSize: 10,
          lineHeight: "1.5",
          maxHeight: 100,
          overflow: "hidden",
          border: "1px solid #21262d",
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: "#484f58" }}>— 출력 대기 중 —</span>
        ) : (
          lines.map((line, i) => (
            <div
              key={i}
              style={{
                color: lineColor(line),
                whiteSpace: "pre",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {line || " "}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AgentActivityPanel({ projectId, allAgents, onOpenTerminal }: AgentActivityPanelProps) {
  const [teamAgentIds, setTeamAgentIds] = useState<Set<string>>(new Set());
  const [terminalLines, setTerminalLines] = useState<Map<string, string[]>>(new Map());
  const [taskTitles, setTaskTitles] = useState<Map<string, string>>(new Map());
  const [loadingTeam, setLoadingTeam] = useState(true);

  const terminalLinesRef = useRef(terminalLines);
  terminalLinesRef.current = terminalLines;

  const { on } = useWebSocket();

  // 팀 에이전트 목록 로드
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

  // 팀 에이전트 객체 계산
  const teamAgents = allAgents.filter((a) => teamAgentIds.has(a.id));
  const workingAgents = teamAgents.filter(
    (a) => a.status === "working" && a.current_task_id,
  );
  const idleAgents = teamAgents.filter(
    (a) => a.status === "idle" || a.status === "break",
  );

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
      await Promise.all(
        workingAgents.map(async (agent) => {
          const taskId = agent.current_task_id!;
          try {
            const result = await getTerminal(taskId, MINI_LINES);
            const rawLines = result.text
              .split("\n")
              .filter((l) => l.trim() !== "")
              .slice(-MINI_LINES);
            setTerminalLines((prev) => new Map(prev).set(taskId, rawLines));
          } catch {}
        }),
      );
    };

    void fetchAll();
    const id = setInterval(() => void fetchAll(), POLL_TERMINAL_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingAgents.map((a) => a.current_task_id).join(",")]);

  // WebSocket cli_output 이벤트 — 실시간 줄 추가
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

  // 탭 숨김 시 폴링 효과는 setInterval 자체가 제어하므로 추가 처리 불필요

  if (loadingTeam) return null;
  if (teamAgents.length === 0) return null;

  const workingCount = workingAgents.length;

  return (
    <div
      className="border border-[var(--th-border)] rounded flex flex-col"
      style={{ borderLeft: "3px solid #f59e0b" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--th-border)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--th-text-muted)] font-mono">
            에이전트 활동
          </p>
          <p className="text-[9px] text-[var(--th-text-muted)]">지금 무엇을 하고 있는가</p>
        </div>
        <div className="flex items-center gap-1.5">
          {workingCount > 0 ? (
            <span
              className="text-[9px] px-2 py-0.5 rounded font-medium font-mono"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
            >
              실행 중 {workingCount}
              {teamAgents.length > 0 && ` / ${teamAgents.length}`}
            </span>
          ) : (
            <span className="text-[9px] text-[var(--th-text-muted)] font-mono">대기 중</span>
          )}
        </div>
      </div>

      {/* Working 에이전트 카드 */}
      {workingAgents.length > 0 && (
        <div>
          {workingAgents.map((agent) => {
            const taskId = agent.current_task_id!;
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                taskId={taskId}
                taskTitle={taskTitles.get(taskId) ?? "태스크 로딩 중…"}
                lines={terminalLines.get(taskId) ?? []}
                onOpen={() => onOpenTerminal(taskId, agent)}
              />
            );
          })}
        </div>
      )}

      {/* Idle 에이전트 컴팩트 행 */}
      {idleAgents.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-2">
          {idleAgents.map((agent) => (
            <span
              key={agent.id}
              className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--th-text-muted)]"
            >
              <span>{agent.avatar_emoji || "🤖"}</span>
              <span>{agent.name_ko || agent.name}</span>
              <span className="text-[8px]" style={{ color: "#484f58" }}>○ 대기 중</span>
            </span>
          ))}
        </div>
      )}

      {/* working도 idle도 없는 경우 (offline만 존재) */}
      {workingAgents.length === 0 && idleAgents.length === 0 && (
        <div className="px-3 py-3 text-[10px] text-[var(--th-text-muted)] italic">
          현재 활동 중인 에이전트가 없습니다.
        </div>
      )}
    </div>
  );
}
