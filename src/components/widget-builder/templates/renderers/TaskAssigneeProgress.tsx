import { useAgentStore } from "../../../../store/agentStore";
import { useTaskStore } from "../../../../store/taskStore";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

export default function TaskAssigneeProgress({ config: _ }: { config: CustomFeatureConfig }) {
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();

  const rows = agents
    .map((a) => {
      const mine = tasks.filter((t) => t.assigned_agent_id === a.id);
      const inProgress = mine.filter((t) => t.status === "in_progress").length;
      const done = mine.filter((t) => t.status === "done").length;
      return { agent: a, inProgress, done, total: mine.length };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.inProgress - a.inProgress);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
        태스크 없음
      </div>
    );
  }

  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="flex flex-col gap-1.5 p-2 overflow-y-auto h-full">
      {rows.map((r) => (
        <div key={r.agent.id} className="flex items-center gap-2">
          <span style={{ fontSize: 14, flexShrink: 0 }}>{r.agent.avatar_emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between mb-0.5">
              <span style={{ ...mono, fontSize: 10, color: "var(--th-text-primary)" }} className="truncate">{r.agent.name}</span>
              <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", flexShrink: 0 }}>{r.inProgress}▶ {r.done}✓</span>
            </div>
            <div style={{ height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", display: "flex" }}>
                <div style={{ width: `${(r.inProgress / maxTotal) * 100}%`, background: "var(--th-attr-elite)" }} />
                <div style={{ width: `${(r.done / maxTotal) * 100}%`, background: "var(--th-text-muted)", opacity: 0.4 }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
