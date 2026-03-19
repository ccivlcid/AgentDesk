import React from "react";
import { useAgentStore } from "../../store/agentStore";
import { useTaskStore } from "../../store/taskStore";
import { useProjectStore } from "../../store/projectStore";
import { useI18n } from "../../i18n";
import type { Agent, Task, Project } from "../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const STATUS_CFG = {
  working:      { color: "#22c55e", dot: "▶", label: "작업중" },
  idle:         { color: "var(--th-text-muted)", dot: "·",  label: "대기" },
  offline:      { color: "#475569",              dot: "○",  label: "오프" },
  break:        { color: "#f59e0b",              dot: "—",  label: "휴식" },
  in_progress:  { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  collaborating:{ color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.25)" },
  review:       { color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.25)"  },
  done:         { color: "#22c55e", bg: "rgba(34,197,94,0.06)",   border: "rgba(34,197,94,0.2)"    },
};

function Pulse({ color }: { color: string }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%", background: color,
        animation: "lw-ping 1.4s cubic-bezier(0,0,0.2,1) infinite", opacity: 0.6,
      }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
    </span>
  );
}

function AgentRow({ agent, task }: { agent: Agent; task: Task | undefined }) {
  const { t } = useI18n();
  const cfg = STATUS_CFG[agent.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.offline;
  const isWorking = agent.status === "working";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 14px",
      borderBottom: "1px solid var(--th-border)",
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{agent.avatar_emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          {isWorking ? <Pulse color={cfg.color} /> : (
            <span style={{ ...mono, fontSize: 10, color: cfg.color }}>{(cfg as { dot: string }).dot}</span>
          )}
          <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: "var(--th-text-primary)" }}>{agent.name}</span>
          <span style={{ ...mono, fontSize: 9, color: cfg.color, opacity: 0.9 }}>
            {(cfg as { label: string }).label ?? agent.status}
          </span>
        </div>
        {task ? (
          <div style={{ ...mono, fontSize: 10, color: "var(--th-text-secondary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            › {task.title}
          </div>
        ) : (
          <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", opacity: 0.5 }}>
            {t({ ko: "할당된 작업 없음", en: "no active task", ja: "タスクなし", zh: "无任务" })}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>
          ✓ {agent.stats_tasks_done ?? 0}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, agents, projects }: { task: Task; agents: Agent[]; projects: Project[] }) {
  const cfg = STATUS_CFG[task.status as keyof typeof STATUS_CFG] ?? { color: "var(--th-text-muted)", bg: "transparent", border: "var(--th-border)" };
  const agent = agents.find((a) => a.id === task.assigned_agent_id);
  const project = projects.find((p) => p.id === task.project_id);
  const isActive = task.status === "in_progress" || task.status === "collaborating";

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "9px 14px",
      borderBottom: "1px solid var(--th-border)",
      background: (cfg as { bg?: string }).bg ?? "transparent",
      borderLeft: `3px solid ${(cfg as { border?: string }).border ?? "transparent"}`,
    }}>
      <div style={{ marginTop: 1, flexShrink: 0 }}>
        {isActive ? <Pulse color={cfg.color} /> : (
          <span style={{ ...mono, fontSize: 10, color: cfg.color }}>✓</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...mono, fontSize: 11, fontWeight: 600, color: "var(--th-text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
          {task.title}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {agent && (
            <span style={{ ...mono, fontSize: 9, color: "var(--th-text-secondary)" }}>
              {agent.avatar_emoji} {agent.name}
            </span>
          )}
          {project && (
            <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)",
              background: "var(--th-border)", borderRadius: 3, padding: "1px 5px" }}>
              {project.name}
            </span>
          )}
        </div>
      </div>
      <span style={{ ...mono, fontSize: 9, color: cfg.color, flexShrink: 0,
        background: (cfg as { bg?: string }).bg ?? "transparent",
        border: `1px solid ${(cfg as { border?: string }).border ?? "transparent"}`,
        borderRadius: 4, padding: "2px 6px", marginTop: 1 }}>
        {task.status}
      </span>
    </div>
  );
}

export default function LiveWorkflowPanel() {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();

  const workingAgents = agents.filter((a) => a.status === "working");
  const idleAgents    = agents.filter((a) => a.status === "idle");
  const activeTasks   = tasks.filter((tk) => ["in_progress", "collaborating", "review"].includes(tk.status ?? ""));
  const recentDone    = [...tasks]
    .filter((tk) => tk.status === "done")
    .sort((a, b) => (b.updated_at ?? b.created_at ?? 0) - (a.updated_at ?? a.created_at ?? 0))
    .slice(0, 5);

  const totalWorking = workingAgents.length;
  const totalActive  = activeTasks.length;

  function agentCurrentTask(agent: Agent) {
    return tasks.find((tk) => tk.assigned_agent_id === agent.id && tk.status === "in_progress");
  }

  return (
    <>
      <style>{`
        @keyframes lw-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        {/* 상단 요약 */}
        <div style={{
          display: "flex", gap: 1, flexShrink: 0,
          borderBottom: "1px solid var(--th-border)",
          background: "var(--th-bg-panel)",
        }}>
          {[
            { val: totalWorking, label: t({ ko: "작업 중", en: "working", ja: "作業中", zh: "工作中" }), color: "#22c55e" },
            { val: idleAgents.length, label: t({ ko: "대기", en: "idle", ja: "待機", zh: "空闲" }), color: "var(--th-text-muted)" },
            { val: totalActive,  label: t({ ko: "진행 태스크", en: "active tasks", ja: "進行中", zh: "进行中" }), color: "#f59e0b" },
            { val: agents.length, label: t({ ko: "총 에이전트", en: "agents", ja: "エージェント", zh: "代理" }), color: "var(--th-text-secondary)" },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ flex: 1, padding: "12px 16px", textAlign: "center", borderRight: "1px solid var(--th-border)" }}>
              <div style={{ ...mono, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
              <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 본문 — 2열 */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, overflow: "hidden" }}>

          {/* 왼쪽: 에이전트 상태 */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--th-border)" }}>
            <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              color: "var(--th-text-muted)", padding: "10px 14px 8px", textTransform: "uppercase",
              borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
              // {t({ ko: "에이전트 상태", en: "agent-status", ja: "エージェント状態", zh: "代理状态" })}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {agents.length === 0 ? (
                <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 16px", opacity: 0.5 }}>
                  {t({ ko: "에이전트 없음", en: "no agents", ja: "なし", zh: "无代理" })}
                </div>
              ) : (
                <>
                  {/* working 먼저 */}
                  {[...workingAgents, ...agents.filter((a) => a.status !== "working")].map((agent) => (
                    <AgentRow key={agent.id} agent={agent} task={agentCurrentTask(agent)} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* 오른쪽: 진행 중 태스크 + 최근 완료 */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 진행 중 */}
            <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
              color: totalActive > 0 ? "#f59e0b" : "var(--th-text-muted)",
              padding: "10px 14px 8px", textTransform: "uppercase",
              borderBottom: "1px solid var(--th-border)", flexShrink: 0 }}>
              // {t({ ko: "진행 중", en: "running", ja: "実行中", zh: "运行中" })}
              {totalActive > 0 && <span style={{ marginLeft: 8, background: "#f59e0b", color: "#000",
                borderRadius: 10, padding: "0 6px", fontSize: 8, fontWeight: 900 }}>{totalActive}</span>}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {activeTasks.length === 0 ? (
                <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)", padding: "20px 16px", opacity: 0.4 }}>
                  {t({ ko: "진행 중인 태스크 없음", en: "no active tasks", ja: "タスクなし", zh: "无进行中任务" })}
                </div>
              ) : activeTasks.map((tk) => (
                <TaskRow key={tk.id} task={tk} agents={agents} projects={projects} />
              ))}

              {/* 구분선 + 최근 완료 */}
              {recentDone.length > 0 && (
                <>
                  <div style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                    color: "#22c55e", padding: "10px 14px 8px", textTransform: "uppercase",
                    borderTop: "1px solid var(--th-border)", borderBottom: "1px solid var(--th-border)" }}>
                    // {t({ ko: "최근 완료", en: "recently done", ja: "最近完了", zh: "最近完成" })}
                  </div>
                  {recentDone.map((tk) => (
                    <TaskRow key={tk.id} task={tk} agents={agents} projects={projects} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
