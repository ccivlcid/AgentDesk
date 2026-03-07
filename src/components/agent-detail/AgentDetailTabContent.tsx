import { localeName, type UiLanguage } from "../../i18n";
import type { Agent, Department, SubAgent, SubTask, Task } from "../../types";
import { getSubAgentSpriteNum, SUBTASK_STATUS_ICON, taskStatusLabel, taskTypeLabel, type TFunction } from "./constants";
import AgentPerformancePanel from "./AgentPerformancePanel";

interface AgentDetailTabContentProps {
  tab: "info" | "tasks" | "alba" | "performance" | "chat";
  t: TFunction;
  language: UiLanguage;
  agent: Agent;
  departments: Department[];
  agentTasks: Task[];
  agentSubAgents: SubAgent[];
  subtasksByTask: Record<string, SubTask[]>;
  expandedTaskId: string | null;
  setExpandedTaskId: (taskId: string | null) => void;
  onChat: (agent: Agent) => void;
  onAssignTask: (agentId: string) => void;
  onOpenTerminal?: (taskId: string) => void;
}

export default function AgentDetailTabContent({
  tab,
  t,
  language,
  agent,
  departments,
  agentTasks,
  agentSubAgents,
  subtasksByTask,
  expandedTaskId,
  setExpandedTaskId,
  onChat,
  onAssignTask,
  onOpenTerminal,
}: AgentDetailTabContentProps) {
  const xpLevel = Math.floor(agent.stats_xp / 100) + 1;

  if (tab === "info") {
    return (
      <div className="space-y-3">
        <div className="border rounded p-3" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--th-text-muted)" }}>
            {t({ ko: "성격", en: "Personality", ja: "性格", zh: "性格" })}
          </div>
          <div className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
            {agent.personality ?? t({ ko: "설정 없음", en: "Not set", ja: "未設定", zh: "未设置" })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border rounded p-3 text-center" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
            <div className="text-lg font-bold font-mono" style={{ color: "var(--th-accent)" }}>{agent.stats_tasks_done}</div>
            <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "완료 업무", en: "Completed", ja: "完了タスク", zh: "已完成任务" })}
            </div>
          </div>
          <div className="border rounded p-3 text-center" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
            <div className="text-lg font-bold font-mono" style={{ color: "var(--th-accent)" }}>{xpLevel}</div>
            <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>{t({ ko: "레벨", en: "Level", ja: "レベル", zh: "等级" })}</div>
          </div>
          <div className="border rounded p-3 text-center" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
            <div className="text-lg font-bold font-mono" style={{ color: "var(--th-accent)" }}>
              {agentSubAgents.filter((subAgent) => subAgent.status === "working").length}
            </div>
            <div className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>
              {t({ ko: "알바생", en: "Sub-agents", ja: "サブエージェント", zh: "子代理" })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onChat(agent)}
            className="flex-1 py-2 rounded text-sm font-medium font-mono transition-colors"
            style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", color: "#06b6d4" }}
          >
            💬 {t({ ko: "대화하기", en: "Chat", ja: "チャット", zh: "对话" })}
          </button>
          <button
            onClick={() => onAssignTask(agent.id)}
            className="flex-1 py-2 rounded text-sm font-medium font-mono transition-colors"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}
          >
            📋 {t({ ko: "업무 배정", en: "Assign Task", ja: "タスク割り当て", zh: "分配任务" })}
          </button>
        </div>
        {agent.status === "working" && agent.current_task_id && onOpenTerminal && (
          <button
            onClick={() => onOpenTerminal(agent.current_task_id!)}
            className="w-full mt-2 py-2 rounded text-sm font-medium font-mono transition-colors flex items-center justify-center gap-1.5"
            style={{ background: "var(--th-bg-surface)", border: "1px solid var(--th-border)", color: "var(--th-text-secondary)" }}
          >
            &#128421; {t({ ko: "터미널 보기", en: "View Terminal", ja: "ターミナル表示", zh: "查看终端" })}
          </button>
        )}
      </div>
    );
  }

  if (tab === "tasks") {
    return (
      <div className="space-y-2">
        {agentTasks.length === 0 ? (
          <div className="terminal-empty-state py-8">
            <p className="terminal-empty-state-cmd">$ ls tasks/ --agent={agent.id.slice(0, 8)}</p>
            <p className="terminal-empty-state-result">(empty)</p>
            <p className="terminal-empty-state-hint">{t({ ko: "배정된 업무가 없습니다", en: "No assigned tasks", ja: "割り当てられたタスクはありません", zh: "暂无已分配任务" })}</p>
          </div>
        ) : (
          agentTasks.map((taskItem) => {
            const taskSubtasks = subtasksByTask[taskItem.id] ?? [];
            const isExpanded = expandedTaskId === taskItem.id;
            const subTotal = taskItem.subtask_total ?? taskSubtasks.length;
            const subDone = taskItem.subtask_done ?? taskSubtasks.filter((subtask) => subtask.status === "done").length;
            return (
              <div key={taskItem.id} className="border rounded p-3" style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}>
                <button
                  onClick={() => setExpandedTaskId(isExpanded ? null : taskItem.id)}
                  className="flex items-start gap-3 w-full text-left"
                >
                  <div
                    className="w-2 h-2 mt-1.5 shrink-0"
                    style={{
                      borderRadius: "1px",
                      background: taskItem.status === "done"
                        ? "rgb(34,197,94)"
                        : taskItem.status === "in_progress"
                          ? "rgb(245,158,11)"
                          : "var(--th-border)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--th-text-primary)" }}>{taskItem.title}</div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                      {taskStatusLabel(taskItem.status, t)} · {taskTypeLabel(taskItem.task_type, t)}
                    </div>
                    {subTotal > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 overflow-hidden" style={{ borderRadius: "1px", background: "var(--th-border)" }}>
                          <div
                            className="h-full transition-all"
                            style={{ width: `${Math.round((subDone / subTotal) * 100)}%`, background: "#22c55e" }}
                          />
                        </div>
                        <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: "var(--th-text-muted)" }}>
                          {subDone}/{subTotal}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                {isExpanded && taskSubtasks.length > 0 && (
                  <div className="mt-2 ml-5 space-y-1 pl-2" style={{ borderLeft: "1px solid var(--th-border)" }}>
                    {taskSubtasks.map((subtask) => {
                      const targetDepartment = subtask.target_department_id
                        ? departments.find((department) => department.id === subtask.target_department_id)
                        : null;
                      return (
                        <div key={subtask.id} className="flex items-center gap-1.5 text-xs">
                          <span>{SUBTASK_STATUS_ICON[subtask.status] || "\u23F3"}</span>
                          <span
                            className="flex-1 truncate"
                            style={{ color: subtask.status === "done" ? "var(--th-text-muted)" : "var(--th-text-secondary)", textDecoration: subtask.status === "done" ? "line-through" : "none" }}
                          >
                            {subtask.title}
                          </span>
                          {targetDepartment && (
                            <span
                              className="shrink-0 px-1 py-0.5 text-[10px] font-medium font-mono"
                              style={{ borderRadius: "2px", backgroundColor: targetDepartment.color + "30", color: targetDepartment.color }}
                            >
                              {targetDepartment.icon} {localeName(language, targetDepartment)}
                            </span>
                          )}
                          {subtask.delegated_task_id && subtask.status !== "done" && (
                            <span
                              className="shrink-0"
                            style={{ color: "var(--th-accent)" }}
                              title={t({ ko: "위임됨", en: "Delegated", ja: "委任済み", zh: "已委派" })}
                            >
                              🔗
                            </span>
                          )}
                          {subtask.status === "blocked" && subtask.blocked_reason && (
                            <span
                              className="text-red-400 text-[10px] truncate max-w-[80px]"
                              title={subtask.blocked_reason}
                            >
                              {subtask.blocked_reason}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  if (tab === "performance") {
    return <AgentPerformancePanel agentId={agent.id} t={t} />;
  }

  return (
    <div className="space-y-2">
      {agentSubAgents.length === 0 ? (
        <div className="terminal-empty-state py-8">
          <p className="terminal-empty-state-cmd">$ ls sub-agents/ --status=working</p>
          <p className="terminal-empty-state-result">(empty)</p>
          <p className="terminal-empty-state-hint">{t({ ko: "병렬 처리 시 자동으로 알바생이 소환됩니다", en: "Sub-agents are spawned automatically during parallel work.", ja: "並列処理時にサブエージェントが自動で生成されます。", zh: "并行处理时会自动生成子代理。" })}</p>
        </div>
      ) : (
        agentSubAgents.map((subAgent) => (
          <div
            key={subAgent.id}
            className={`border rounded p-3 flex items-center gap-3 ${subAgent.status === "working" ? "animate-alba-spawn" : ""}`}
            style={{ background: "var(--th-bg-surface)", borderColor: "var(--th-border)" }}
          >
            <div className="w-8 h-8 bg-amber-500/20 overflow-hidden flex items-center justify-center" style={{ borderRadius: "2px" }}>
              <img
                src={`/sprites/${getSubAgentSpriteNum(subAgent.id)}-D-1.png`}
                alt={t({ ko: "알바생", en: "Sub-agent", ja: "サブエージェント", zh: "子代理" })}
                className="w-full h-full object-cover"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}>
                <span className="text-[10px] px-1 py-0.5 bg-amber-500/20 text-amber-400 font-mono" style={{ borderRadius: "2px" }}>
                  {t({ ko: "알바", en: "Sub", ja: "サブ", zh: "子任务" })}
                </span>
                {subAgent.task}
              </div>
              <div className="text-xs mt-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
                {subAgent.status === "working"
                  ? `🔨 ${t({ ko: "작업중...", en: "Working...", ja: "作業中...", zh: "工作中..." })}`
                  : `✅ ${t({ ko: "완료", en: "Done", ja: "完了", zh: "완成" })}`}
              </div>
            </div>
            {subAgent.status === "working" && (
              <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderRadius: "50%", borderColor: "var(--th-accent)", borderTopColor: "transparent" }} />
            )}
          </div>
        ))
      )}
    </div>
  );
}
