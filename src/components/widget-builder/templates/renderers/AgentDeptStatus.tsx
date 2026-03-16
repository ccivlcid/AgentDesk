import { useAgentStore } from "../../../../store/agentStore";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

const STATUS_COLOR: Record<string, string> = {
  working: "var(--th-attr-elite)",
  idle:    "var(--th-text-muted)",
  break:   "var(--th-accent)",
  offline: "#3f3f3f",
};

export default function AgentDeptStatus({ config }: { config: CustomFeatureConfig }) {
  const { agents, departments } = useAgentStore();
  const showOffline = config.params?.showOffline as boolean | undefined;

  const byDept = departments.map((dept) => {
    const deptAgents = agents.filter(
      (a) => a.department_id === dept.id && (showOffline || a.status !== "offline"),
    );
    if (deptAgents.length === 0) return null;
    const working = deptAgents.filter((a) => a.status === "working").length;
    const idle    = deptAgents.filter((a) => a.status === "idle").length;
    const offline = deptAgents.filter((a) => a.status === "offline").length;
    return { dept, total: deptAgents.length, working, idle, offline };
  }).filter(Boolean);

  if (byDept.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>
        부서 없음
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-1 overflow-y-auto h-full">
      {byDept.map((d) => {
        if (!d) return null;
        return (
          <div key={d.dept.id} className="flex items-center gap-2 px-2 py-1.5" style={{ borderRadius: 4, background: "rgba(255,255,255,0.03)", border: "1px solid var(--th-border)" }}>
            <span style={{ ...mono, fontSize: 10, flex: 1, color: "var(--th-text-primary)", fontWeight: 600 }}>{d.dept.name}</span>
            <span style={{ ...mono, fontSize: 10, color: STATUS_COLOR.working }}>{d.working}▶</span>
            <span style={{ ...mono, fontSize: 10, color: STATUS_COLOR.idle }}>{d.idle}○</span>
            {showOffline && <span style={{ ...mono, fontSize: 10, color: STATUS_COLOR.offline }}>{d.offline}✕</span>}
            <span style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)" }}>{d.total}명</span>
          </div>
        );
      })}
    </div>
  );
}
