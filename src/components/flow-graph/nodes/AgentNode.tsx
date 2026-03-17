import { useI18n, localeName } from "../../../i18n";
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
  onContextMenu?: (agentId: string, x: number, y: number) => void;
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
  onContextMenu,
}: AgentNodeProps) {
  const { t, language } = useI18n();
  const { agent, x, y, width, height, deptLabel, deptColor, type } = node;

  const currentTask = agent.current_task_id
    ? tasks.find((tk) => tk.id === agent.current_task_id)
    : null;

  const isWorking = agent.status === "working";
  const isOffline = agent.status === "offline";

  const isTaskDone = currentTask?.status === "done";

  const borderColor = (() => {
    if (isTaskDone) return "var(--th-success, #22c55e)";
    switch (agent.status) {
      case "working": return "var(--th-accent)";
      case "break": return "var(--th-text-muted)";
      case "offline": return "var(--th-danger-border)";
      default: return "var(--th-border)";
    }
  })();

  const boxShadow = isTaskDone
    ? "0 0 8px rgba(34,197,94,0.27)"
    : isWorking
    ? "0 0 8px var(--th-accent-glow)"
    : selected
    ? "0 0 6px var(--th-accent)"
    : "0 2px 8px rgba(0,0,0,0.18)";

  const opacity = dimmed ? 0.35 : isOffline ? 0.5 : 1;

  const statusLabel = isTaskDone
    ? t({ ko: "완료", en: "done", ja: "完了", zh: "已完成" })
    : {
      idle: t({ ko: "대기중", en: "idle", ja: "待機", zh: "空闲" }),
      working: t({ ko: "작업중", en: "working", ja: "作業中", zh: "工作中" }),
      break: t({ ko: "휴식", en: "break", ja: "休憩", zh: "休息" }),
      offline: t({ ko: "오프라인", en: "offline", ja: "オフライン", zh: "离线" }),
    }[agent.status];

  const mono = "var(--th-font-mono)";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      data-node="true"
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
              {localeName(language, agent)}
            </span>
            {deptLabel && (
              <span style={{
                fontSize: 9,
                background: deptColor,
                color: "var(--th-bg-primary)",
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
              color: isTaskDone ? "var(--th-success, #22c55e)" : isWorking ? "var(--th-accent)" : "var(--th-text-muted)",
              fontWeight: isTaskDone || isWorking ? 600 : 400,
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
              color: isTaskDone ? "var(--th-success, #22c55e)" : "var(--th-text-muted)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {currentTask
                ? (isTaskDone ? `✓ ${currentTask.title}` : currentTask.title)
                : t({ ko: "태스크 없음", en: "no task", ja: "タスクなし", zh: "无任务" })}
            </span>
          </div>
        </div>
      </foreignObject>

      {/* 투명 SVG rect — 순수 SVG 요소라 클릭 이벤트가 100% 안정적으로 동작 */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="transparent"
        style={{ cursor: "pointer" }}
        onClick={() => onClick?.(agent.id)}
        onMouseEnter={() => onMouseEnter?.(agent.id)}
        onMouseLeave={() => onMouseLeave?.()}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(agent.id, e.clientX, e.clientY);
        }}
      />
    </g>
  );
}
