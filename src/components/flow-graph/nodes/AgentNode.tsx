import { useI18n, localeName } from "../../../i18n";
import type { FlowNode } from "../useFlowLayout";
import type { Task } from "../../../types";
import type { LiveEvent } from "../useFlowLiveUpdates";

interface AgentNodeProps {
  node: FlowNode;
  tasks: Task[];
  highlighted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  liveEvent?: LiveEvent;
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
  liveEvent,
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
  const isSubAgent = type === "sub-agent";
  const isTaskDone = currentTask?.status === "done";

  const accentColor = (() => {
    if (isTaskDone) return "#22c55e";
    switch (agent.status) {
      case "working": return deptColor || "var(--th-accent)";
      case "break":   return "var(--th-text-muted)";
      case "offline": return "#ef4444";
      default:        return "var(--th-border)";
    }
  })();

  const borderColor = selected
    ? "var(--th-accent)"
    : highlighted
    ? accentColor
    : isTaskDone
    ? "#22c55e"
    : isWorking
    ? (deptColor || "var(--th-accent)")
    : isOffline
    ? "#ef444466"
    : "var(--th-border)";

  const cardBg = isWorking && deptColor
    ? `color-mix(in srgb, ${deptColor} 6%, var(--th-bg-panel))`
    : "var(--th-bg-panel)";

  const boxShadow = selected
    ? `0 0 0 2px var(--th-accent), 0 4px 16px rgba(0,0,0,0.22)`
    : isTaskDone
    ? "0 0 10px rgba(34,197,94,0.22), 0 2px 8px rgba(0,0,0,0.14)"
    : isWorking
    ? `0 0 12px ${deptColor ? deptColor + "44" : "rgba(245,158,11,0.28)"}, 0 2px 8px rgba(0,0,0,0.16)`
    : "0 2px 8px rgba(0,0,0,0.16)";

  const opacity = dimmed ? 0.3 : isOffline ? 0.5 : 1;

  const statusLabel = isTaskDone
    ? t({ ko: "완료", en: "done", ja: "完了", zh: "已完成" })
    : ({
        idle:    t({ ko: "대기중",   en: "idle",    ja: "待機",       zh: "空闲"  }),
        working: t({ ko: "작업중",   en: "working", ja: "作業中",     zh: "工作中" }),
        break:   t({ ko: "휴식",    en: "break",   ja: "休憩",       zh: "休息"  }),
        offline: t({ ko: "오프라인", en: "offline", ja: "オフライン", zh: "离线"  }),
      }[agent.status]);

  const mono = "var(--th-font-mono)";
  const ACCENT_BAR_H = isSubAgent ? 2 : 3;

  return (
    <g transform={`translate(${x}, ${y})`} data-node="true">
      <foreignObject x={0} y={0} width={width} height={height} style={{ opacity }}>
        <div
          style={{
            width,
            height,
            boxSizing: "border-box",
            background: cardBg,
            border: `1.5px solid ${borderColor}`,
            borderRadius: 10,
            boxShadow,
            fontFamily: mono,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: "none",
            transition: "box-shadow 0.15s, border-color 0.15s",
          }}
        >
          {/* 부서 컬러 accent bar */}
          {deptColor && (
            <div style={{
              height: ACCENT_BAR_H,
              background: deptColor,
              flexShrink: 0,
              opacity: isWorking ? 1 : 0.55,
            }} />
          )}

          {/* Header row: emoji + name + dept badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: deptColor ? "5px 8px 3px" : "6px 8px 3px",
            flex: "none",
          }}>
            <span style={{ fontSize: isSubAgent ? 13 : 16, lineHeight: 1, flexShrink: 0 }}>
              {agent.avatar_emoji}
            </span>
            <span style={{
              fontFamily: mono,
              fontSize: isSubAgent ? 10 : 11,
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
                fontSize: 8,
                background: deptColor + "cc",
                color: "#fff",
                borderRadius: 3,
                padding: "1px 5px",
                flexShrink: 0,
                maxWidth: 52,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
                fontWeight: 700,
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
            padding: "0 8px 3px",
            flex: "none",
          }}>
            {/* Status dot with pulse ring for working */}
            <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 8, height: 8, flexShrink: 0 }}>
              {isWorking && (
                <span style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: "50%",
                  background: accentColor,
                  opacity: 0.3,
                  animation: "pulse 1.5s infinite",
                }} />
              )}
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: accentColor,
                display: "inline-block",
                position: "relative",
              }} />
            </span>
            <span style={{
              fontFamily: mono,
              fontSize: 9,
              color: isTaskDone ? "#22c55e" : isWorking ? (deptColor || "var(--th-accent)") : "var(--th-text-muted)",
              fontWeight: isTaskDone || isWorking ? 600 : 400,
              flexShrink: 0,
              letterSpacing: "0.02em",
            }}>
              {statusLabel}
            </span>
          </div>

          {/* Current task + provider */}
          <div style={{
            padding: "0 8px 5px",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 4,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {currentTask ? (
                <span style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: isTaskDone ? "#22c55e" : isWorking ? "var(--th-text-secondary)" : "var(--th-text-muted)",
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {isTaskDone ? `✓ ${currentTask.title}` : `▸ ${currentTask.title}`}
                </span>
              ) : (
                <svg width="100%" height="2" style={{ opacity: 0.2, display: "block" }}>
                  <line x1="0" y1="1" x2="100%" y2="1"
                    stroke="var(--th-text-muted)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}
            </div>
            {!isSubAgent && agent.cli_provider && (
              <span style={{
                fontFamily: mono,
                fontSize: 8,
                color: "var(--th-text-muted)",
                background: "var(--th-bg-elevated)",
                border: "1px solid var(--th-border)",
                borderRadius: 3,
                padding: "1px 4px",
                flexShrink: 0,
                letterSpacing: "0.04em",
                opacity: 0.7,
              }}>
                {agent.cli_provider.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </foreignObject>

      {/* 투명 SVG rect — 클릭/호버 이벤트 처리 */}
      <rect
        x={0} y={0} width={width} height={height}
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

      {/* 실시간 이벤트 플래시 링 */}
      {liveEvent && (() => {
        const flashColor =
          liveEvent.type === "done"  ? "#22c55e" :
          liveEvent.type === "error" ? "#ef4444" :
          deptColor || "var(--th-accent)";
        return (
          <rect
            x={-3} y={-3}
            width={width + 6} height={height + 6}
            rx={13} ry={13}
            fill="none"
            stroke={flashColor}
            strokeWidth={2}
            opacity={0}
            style={{ pointerEvents: "none" }}
          >
            <animate
              attributeName="opacity"
              values="0;0.85;0"
              dur="1s"
              repeatCount="3"
              key={liveEvent.ts}
            />
            <animate
              attributeName="stroke-width"
              values="2;4;2"
              dur="1s"
              repeatCount="3"
              key={`sw-${liveEvent.ts}`}
            />
          </rect>
        );
      })()}
    </g>
  );
}
