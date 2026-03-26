import type { Agent, Task } from "../../../types";
import { useI18n } from "../../../i18n";
import { AGENT_STATUS_COLOR } from "./constants";

export function AgentsTab({ agents, projectTasks }: { agents: Agent[]; projectTasks: Task[] }) {
  const { t } = useI18n();
  if (agents.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--th-text-muted)", fontSize: 12 }}>
        {t({ ko: "이 프로젝트에 배정된 에이전트가 없습니다", en: "No agents assigned to this project", ja: "エージェント未割当", zh: "无代理分配至此项目" })}
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {agents.map((agent) => {
        const agentTasks = projectTasks.filter((task) => task.assigned_agent_id === agent.id);
        const activeTasks = agentTasks.filter((task) => task.status === "in_progress" || task.status === "collaborating");
        const doneTasks = agentTasks.filter((task) => task.status === "done");
        return (
          <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--th-border)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {agent.avatar_emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-primary)" }}>{agent.name}</span>
                <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "var(--th-bg-elevated)", border: "1px solid var(--th-border)", color: AGENT_STATUS_COLOR[agent.status] ?? "var(--th-text-muted)" }}>
                  <span style={{ color: AGENT_STATUS_COLOR[agent.status] ?? "var(--th-text-muted)", fontSize: 7 }}>●</span>
                  {" "}{agent.status}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--th-text-muted)", marginTop: 2 }}>
                {agent.role} · {activeTasks.length > 0 ? `${activeTasks.length} ${t({ ko: "활성", en: "active", ja: "アクティブ", zh: "活跃" })}` : t({ ko: "유휴", en: "idle", ja: "待機", zh: "空闲" })} · {doneTasks.length} {t({ ko: "완료", en: "done", ja: "完了", zh: "完成" })}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--th-text-primary)", lineHeight: 1 }}>{agentTasks.length}</div>
              <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginTop: 2 }}>{t({ ko: "태스크", en: "tasks", ja: "タスク", zh: "任务" })}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
