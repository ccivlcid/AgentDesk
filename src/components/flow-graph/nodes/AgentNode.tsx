import { useI18n } from "../../../i18n";
import type { FlowNode } from "../useFlowLayout";
import type { Task } from "../../../types";

interface AgentNodeProps {
  node: FlowNode;
  tasks: Task[];
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  onClick?: (agentId: string) => void;
  onMouseEnter?: (agentId: string) => void;
  onMouseLeave?: () => void;
}

export default function AgentNode({
  node,
  tasks,
  highlighted,
  dimmed,
  selected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AgentNodeProps) {
  const { t } = useI18n();
  const { agent, x, y, width, height, deptLabel, deptColor, type } = node;

  const currentTask = agent.current_task_id
    ? tasks.find((tk) => tk.id === agent.current_task_id)
    : null;

  const isWorking = agent.status === "working";
  const isOffline = agent.status === "offline";

  const borderColor = (() => {
    switch (agent.status) {
      case "working": return "var(--th-accent)";
      case "break": return "var(--th-text-muted)";
      case "offline": return "var(--th-danger-border)";
      default: return "var(--th-border)";
    }
  })();

  const boxShadow = isWorking
    ? "0 0 8px var(--th-accent-glow)"
    : selected
    ? "0 0 6px var(--th-accent)"
    : "0 2px 8px rgba(0,0,0,0.18)";

  const opacity = dimmed ? 0.35 : isOffline ? 0.5 : 1;
  const scale = type === "sub-agent" ? 0.7 : 1;

  const statusLabel = {
    idle: t({ ko: "대기중", en: "idle", ja: "待機", zh: "空闲" }),
    working: t({ ko: "작업중", en: "working", ja: "作業中", zh: "工作中" }),
    break: t({ ko: "휴식", en: "break", ja: "休憩", zh: "休息" }),
    offline: t({ ko: "오프라인", en: "offline", ja: "オフライン", zh: "离线" }),
  }[agent.status];

  const mono = "var(--th-font-mono)";

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale})`}
      style={{ cursor: "pointer" }}
      onClick={() => onClick?.(agent.id)}
      onMouseEnter={() => onMouseEnter?.(agent.id)}
      onMouseLeave={() => onMouseLeave?.()}
    >
      <foreignObject x={0} y={0} width={width} height={height} style={{ opacity }}>
        <div
          style={{
            width: width,
            height: height,
            boxSizing: "border-box",
            background: "var(--th-bg-panel)",
            border: `1.5px solid ${borderColor}`,
            borderRadius: 10,
            boxShadow,
            fontFamily: mono,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: "none",
          }}
        >
          {/* Header row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px 4px",
            flex: "none",
          }}>
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{agent.avatar_emoji}</span>
            <span style={{
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--th-text)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {agent.name}
            </span>
            {deptLabel && (
              <span style={{
                fontSize: 9,
                background: deptColor,
                color: "#fff",
                borderRadius: 3,
                padding: "1px 4px",
                flexShrink: 0,
                maxWidth: 52,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {deptLabel}
              </span>
            )}
          </div>

          {/* Status row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 8px 4px",
            flex: "none",
          }}>
            {/* Status dot */}
            <span style={{ position: "relative", display: "inline-flex", width: 7, height: 7, flexShrink: 0 }}>
              {isWorking && (
                <span style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--th-accent)",
                  opacity: 0.5,
                  animation: "pulse 1.5s infinite",
                }} />
              )}
              <span style={{
                position: "relative",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: borderColor,
                display: "inline-block",
              }} />
            </span>
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              color: isWorking ? "var(--th-accent)" : "var(--th-text-muted)",
              fontWeight: isWorking ? 600 : 400,
              flexShrink: 0,
            }}>
              {statusLabel}
            </span>
          </div>

          {/* Current task row */}
          <div style={{
            padding: "0 8px 5px",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}>
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              color: "var(--th-text-muted)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {currentTask
                ? currentTask.title
                : t({ ko: "태스크 없음", en: "no task", ja: "タスクなし", zh: "无任务" })}
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
