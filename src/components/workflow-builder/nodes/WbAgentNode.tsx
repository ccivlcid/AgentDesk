import { type NodeProps, Handle, Position, useReactFlow } from "@xyflow/react";
import { useI18n } from "../../../i18n";
import { useAgentStore } from "../../../store/agentStore";
import { useProjectStore } from "../../../store/projectStore";
import { useTaskStore } from "../../../store/taskStore";

export type AgentNodeData = {
  label: string;
  agentId?: string;
  agentName?: string;
  skill?: string;
  provider?: string;
  emoji?: string;
};

export default function WbAgentNode({ id, data, selected }: NodeProps) {
  const { t } = useI18n();
  const { updateNodeData } = useReactFlow();
  const { agents } = useAgentStore();
  const { currentProjectId, projectAgentIds, projectAgentsLoaded } = useProjectStore();

  const { tasks } = useTaskStore();
  const d = data as AgentNodeData;
  const mono = "var(--th-font-mono)";
  const accent = "var(--th-accent)";

  // Live task status for assigned agent
  const assignedAgent = d.agentId ? agents.find((a) => a.id === d.agentId) : null;
  const currentTask = assignedAgent?.current_task_id
    ? tasks.find((tk) => tk.id === assignedAgent.current_task_id)
    : null;
  const agentStatus = assignedAgent?.status ?? null;
  const taskStatus = currentTask?.status ?? null;

  // Status badge config
  const statusBadge = (() => {
    if (agentStatus === "working" || taskStatus === "in_progress") return { label: t({ ko: "실행중", en: "running", ja: "実行中", zh: "运行中" }), color: "#f59e0b", glow: "0 0 8px #f59e0b66" };
    if (taskStatus === "done") return { label: t({ ko: "완료", en: "done", ja: "完了", zh: "完成" }), color: "#10b981", glow: "0 0 8px #10b98166" };
    if (taskStatus === "cancelled") return { label: t({ ko: "취소", en: "cancelled", ja: "キャンセル", zh: "已取消" }), color: "#ef4444", glow: "0 0 8px #ef444466" };
    if (taskStatus === "planned") return { label: t({ ko: "대기", en: "planned", ja: "待機", zh: "等待" }), color: "#6b7280", glow: "none" };
    return null;
  })();

  const availableAgents = currentProjectId && projectAgentsLoaded && projectAgentIds.size > 0
    ? agents.filter((a) => projectAgentIds.has(a.id))
    : agents;

  const handleAgentChange = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      updateNodeData(id, {
        agentId,
        agentName: agent.name,
        emoji: agent.avatar_emoji,
      });
    } else {
      updateNodeData(id, { agentId: "", agentName: "", emoji: "⊙" });
    }
  };

  return (
    <div
      style={{
        minWidth: 160,
        background: "var(--th-bg-elevated)",
        border: `2px solid ${selected ? accent : statusBadge ? statusBadge.color : "var(--th-border)"}`,
        borderTop: "3px solid var(--th-accent)",
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected
          ? "0 0 0 2px var(--th-accent)33"
          : statusBadge?.glow && statusBadge.glow !== "none"
          ? statusBadge.glow
          : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: "var(--th-accent)",
          border: "2px solid var(--th-bg-elevated)",
        }}
      />

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px 4px",
        borderBottom: "1px solid var(--th-border)",
      }}>
        <span style={{ fontSize: 12 }}>{d.emoji ?? "⊙"}</span>
        <span style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", flex: 1 }}>
          {t({ ko: "에이전트", en: "agent", ja: "エージェント", zh: "代理" })}
        </span>
        {statusBadge && (
          <span style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: statusBadge.color,
            background: `${statusBadge.color}22`,
            borderRadius: 3,
            padding: "1px 5px",
            lineHeight: 1.6,
          }}>
            {statusBadge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "6px 10px 8px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--th-text-heading)", marginBottom: 5 }}>
          {d.label || t({ ko: "에이전트 스텝", en: "Agent Step", ja: "エージェントステップ", zh: "代理步骤" })}
        </div>

        {/* Agent selector */}
        <select
          value={d.agentId ?? ""}
          onChange={(e) => handleAgentChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            fontFamily: mono,
            fontSize: 10,
            padding: "3px 6px",
            background: "var(--th-bg-panel)",
            border: "1px solid var(--th-border)",
            borderRadius: 4,
            color: d.agentId ? "var(--th-text)" : "var(--th-text-muted)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">— {t({ ko: "에이전트 선택", en: "select agent", ja: "エージェント選択", zh: "选择代理" })} —</option>
          {availableAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.avatar_emoji} {a.name}
            </option>
          ))}
        </select>

        {d.skill && (
          <div style={{
            display: "inline-block",
            marginTop: 4,
            padding: "1px 6px",
            background: "var(--th-active-bg)",
            borderRadius: 4,
            fontSize: 9,
            color: accent,
          }}>
            {d.skill}
          </div>
        )}

        {/* Live task info */}
        {currentTask && (
          <div style={{
            marginTop: 6,
            padding: "4px 6px",
            background: "var(--th-bg-panel)",
            borderRadius: 4,
            borderLeft: `2px solid ${statusBadge?.color ?? "var(--th-border)"}`,
          }}>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginBottom: 1 }}>
              {t({ ko: "현재 업무", en: "current task", ja: "現在のタスク", zh: "当前任务" })}
            </div>
            <div style={{ fontSize: 10, color: "var(--th-text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
              {currentTask.title}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: "var(--th-accent)",
          border: "2px solid var(--th-bg-elevated)",
        }}
      />
    </div>
  );
}
