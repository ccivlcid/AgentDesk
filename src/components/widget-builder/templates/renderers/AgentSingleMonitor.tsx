import { useAgentStore } from "../../../../store/agentStore";
import { useTaskStore } from "../../../../store/taskStore";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const STATUS_COLOR: Record<string, string> = {
  working: "var(--th-attr-elite)",
  idle: "var(--th-text-muted)",
  break: "var(--th-accent)",
  offline: "#3f3f3f",
};

export default function AgentSingleMonitor({ config }: { config: CustomFeatureConfig }) {
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const agentId = config.params?.agentId as string | undefined;
  const agent = agents.find((a) => a.id === agentId);

  if (!agentId) {
    return <div className="flex items-center justify-center h-full p-4 text-center" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>에이전트 ID를 설정해주세요</div>;
  }
  if (!agent) {
    return <div className="flex items-center justify-center h-full p-4 text-center" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>에이전트를 찾을 수 없습니다</div>;
  }

  const currentTask = agent.current_task_id ? tasks.find((t) => t.id === agent.current_task_id) : null;
  const color = STATUS_COLOR[agent.status] ?? "var(--th-text-muted)";

  return (
    <div className="flex flex-col gap-3 p-3 h-full">
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 28 }}>{agent.avatar_emoji}</span>
        <div>
          <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "var(--th-text-heading)" }}>{agent.name}</div>
          <div style={{ ...mono, fontSize: 10, color }}>{agent.status.toUpperCase()}</div>
        </div>
      </div>
      {currentTask ? (
        <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)", background: "var(--th-hover-overlay-subtle)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--th-border)" }}>
          <div style={{ fontSize: 9, color: "var(--th-accent)", marginBottom: 4 }}>현재 태스크</div>
          <div style={{ color: "var(--th-text-primary)" }} className="truncate">{currentTask.title}</div>
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 10, color: "var(--th-text-muted)" }}>대기 중</div>
      )}
    </div>
  );
}
