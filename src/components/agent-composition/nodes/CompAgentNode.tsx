import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useAgentStore } from "../../../store/agentStore";
import { useTaskStore } from "../../../store/taskStore";
import { useI18n } from "../../../i18n";

export type CompAgentNodeData = {
  agentId: string;
  name: string;
  emoji: string;
  role: string;
  deptName: string;
  provider: string;
};

const ROLE_COLOR: Record<string, string> = {
  team_leader: "#f59e0b",
  senior: "var(--th-accent)",
  junior: "#10b981",
  intern: "#6b7280",
};

export function IconRobot({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16.01" />
      <line x1="16" y1="16" x2="16" y2="16.01" />
    </svg>
  );
}

export default function CompAgentNode({ data, selected }: NodeProps) {
  const { t } = useI18n();
  const { agents } = useAgentStore();
  const { tasks } = useTaskStore();
  const d = data as CompAgentNodeData;
  const roleColor = ROLE_COLOR[d.role] ?? "var(--th-accent)";
  const mono = "var(--th-font-mono)";

  // Live task status
  const assignedAgent = d.agentId ? agents.find((a) => a.id === d.agentId) : null;
  const currentTask = assignedAgent?.current_task_id
    ? tasks.find((tk) => tk.id === assignedAgent.current_task_id)
    : null;
  const agentStatus = assignedAgent?.status ?? null;
  const taskStatus = currentTask?.status ?? null;

  const statusBadge = (() => {
    if (agentStatus === "working" || taskStatus === "in_progress") return { label: t({ ko: "실행중", en: "running", ja: "実行中", zh: "运行中" }), color: "#f59e0b", glow: "0 0 8px #f59e0b66" };
    if (taskStatus === "done") return { label: t({ ko: "완료", en: "done", ja: "完了", zh: "完成" }), color: "#10b981", glow: "0 0 8px #10b98166" };
    if (taskStatus === "cancelled") return { label: t({ ko: "취소", en: "cancelled", ja: "キャンセル", zh: "已取消" }), color: "#ef4444", glow: "0 0 8px #ef444466" };
    if (taskStatus === "planned") return { label: t({ ko: "대기", en: "planned", ja: "待機", zh: "等待" }), color: "#6b7280", glow: "none" };
    return null;
  })();

  return (
    <div
      style={{
        minWidth: 140,
        background: "var(--th-bg-elevated)",
        border: `1.5px solid ${selected ? "var(--th-accent)" : statusBadge ? statusBadge.color : "var(--th-border)"}`,
        borderTop: `3px solid ${roleColor}`,
        borderRadius: 8,
        fontFamily: mono,
        boxShadow: selected
          ? "0 0 0 2px var(--th-accent)33, 0 4px 12px rgba(0,0,0,0.2)"
          : statusBadge?.glow && statusBadge.glow !== "none"
          ? statusBadge.glow
          : "0 2px 8px rgba(0,0,0,0.15)",
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: 10, height: 10, background: "var(--th-accent)", border: "2px solid var(--th-bg-elevated)" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px 5px" }}>
        <span style={{ fontSize: 20, lineHeight: 1, display: "inline-flex", color: "var(--th-text-primary)" }}>
          {d.emoji ? <span>{d.emoji}</span> : <IconRobot size={20} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--th-text-heading)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {d.name}
          </div>
          {d.deptName && (
            <div
              style={{
                fontSize: 9,
                color: "var(--th-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.deptName}
            </div>
          )}
        </div>
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
            flexShrink: 0,
          }}>
            {statusBadge.label}
          </span>
        )}
      </div>

      <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              fontSize: 9,
              padding: "1px 6px",
              borderRadius: 3,
              background: `${roleColor}22`,
              color: roleColor,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            {d.role?.replace("_", " ") || "agent"}
          </span>
          {d.provider && (
            <span
              style={{
                fontSize: 9,
                padding: "1px 6px",
                borderRadius: 3,
                background: "var(--th-bg-panel)",
                color: "var(--th-text-muted)",
                border: "1px solid var(--th-border)",
              }}
            >
              {d.provider}
            </span>
          )}
        </div>

        {/* Live task info */}
        {currentTask && (
          <div style={{
            padding: "4px 6px",
            background: "var(--th-bg-panel)",
            borderRadius: 4,
            borderLeft: `2px solid ${statusBadge?.color ?? "var(--th-border)"}`,
          }}>
            <div style={{ fontSize: 9, color: "var(--th-text-muted)", marginBottom: 1 }}>
              {t({ ko: "현재 업무", en: "current task", ja: "現在のタスク", zh: "当前任务" })}
            </div>
            <div style={{ fontSize: 10, color: "var(--th-text)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
              {currentTask.title}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: 10, height: 10, background: "var(--th-accent)", border: "2px solid var(--th-bg-elevated)" }}
      />
    </div>
  );
}
