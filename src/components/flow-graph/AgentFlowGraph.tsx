import { useEffect, useCallback, useState, type MouseEvent } from "react";
import { useI18n } from "../../i18n";
import type { Agent, Department, Task, SubAgent, CrossDeptDelivery, MeetingPresence } from "../../types";
import { useFlowLayout } from "./useFlowLayout";
import { useViewTransform } from "./useViewTransform";
import AgentNode from "./nodes/AgentNode";
import MeetingCluster from "./nodes/MeetingCluster";
import FlowEdge from "./edges/FlowEdge";

interface AgentFlowGraphProps {
  agents: Agent[];
  departments: Department[];
  tasks: Task[];
  subAgents: SubAgent[];
  crossDeptDeliveries: CrossDeptDelivery[];
  meetingPresences: MeetingPresence[];
  projectAgentIds?: Set<string>;
  onSelectAgent?: (agent: Agent) => void;
}

type FilterType = "all" | "working" | "meeting";

export default function AgentFlowGraph({
  agents,
  departments,
  tasks,
  subAgents,
  crossDeptDeliveries,
  meetingPresences,
  projectAgentIds,
  onSelectAgent,
}: AgentFlowGraphProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterType>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes, edges, meetings } = useFlowLayout({
    agents,
    departments,
    tasks,
    subAgents,
    crossDeptDeliveries,
    meetingPresences,
    projectAgentIds,
    filter,
  });

  const {
    transform,
    svgRef,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    zoomIn,
    zoomOut,
    fitToView,
    isPanning,
  } = useViewTransform();

  // Fit to view on initial load and when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitToView(nodes), 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitToView]);

  // Esc key to deselect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedNodeId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNodeClick = useCallback((agentId: string) => {
    setSelectedNodeId(agentId);
    const agent = agents.find((a) => a.id === agentId);
    if (agent) onSelectAgent?.(agent);
  }, [agents, onSelectAgent]);

  const handleSvgDoubleClick = useCallback((e: MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (!target.closest("foreignObject")) {
      fitToView(nodes);
    }
  }, [fitToView, nodes]);

  const mono = "var(--th-font-mono)";

  // Compute which nodes/edges to highlight/dim based on hover
  const connectedNodeIds = hoveredNodeId
    ? new Set([
        hoveredNodeId,
        ...edges
          .filter((ed) => ed.from.nodeId === hoveredNodeId || ed.to.nodeId === hoveredNodeId)
          .flatMap((ed) => [ed.from.nodeId, ed.to.nodeId]),
      ])
    : null;

  const isEmpty = nodes.length === 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Controls overlay */}
      <div style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: mono,
        fontSize: 11,
      }}>
        {/* Zoom controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "var(--th-bg-panel)",
          border: "1px solid var(--th-border)",
          borderRadius: 6,
          overflow: "hidden",
        }}>
          <button
            onClick={zoomOut}
            title={t({ ko: "축소", en: "zoom out", ja: "縮小", zh: "缩小" })}
            style={{
              padding: "4px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: mono,
              fontSize: 13,
              color: "var(--th-text-muted)",
              lineHeight: 1,
            }}
            className="hover:!text-[var(--th-text)] hover:bg-[var(--th-hover-bg)]"
          >
            −
          </button>
          <div style={{ width: 1, height: 16, background: "var(--th-border)" }} />
          <button
            onClick={zoomIn}
            title={t({ ko: "확대", en: "zoom in", ja: "拡大", zh: "放大" })}
            style={{
              padding: "4px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: mono,
              fontSize: 13,
              color: "var(--th-text-muted)",
              lineHeight: 1,
            }}
            className="hover:!text-[var(--th-text)] hover:bg-[var(--th-hover-bg)]"
          >
            +
          </button>
          <div style={{ width: 1, height: 16, background: "var(--th-border)" }} />
          <button
            onClick={() => fitToView(nodes)}
            title={t({ ko: "전체 보기", en: "fit to view", ja: "全体表示", zh: "适应视图" })}
            style={{
              padding: "4px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: mono,
              fontSize: 10,
              color: "var(--th-text-muted)",
            }}
            className="hover:!text-[var(--th-text)] hover:bg-[var(--th-hover-bg)]"
          >
            ⟳ {t({ ko: "맞춤", en: "fit", ja: "合わせる", zh: "适应" })}
          </button>
        </div>

        {/* Filter controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          background: "var(--th-bg-panel)",
          border: "1px solid var(--th-border)",
          borderRadius: 6,
          overflow: "hidden",
          padding: "2px 4px",
        }}>
          {(["all", "working", "meeting"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "3px 8px",
                background: filter === f ? "var(--th-active-bg)" : "none",
                border: "none",
                cursor: "pointer",
                fontFamily: mono,
                fontSize: 10,
                color: filter === f ? "var(--th-accent)" : "var(--th-text-muted)",
                borderRadius: 4,
              }}
              className={filter !== f ? "hover:!text-[var(--th-text-secondary)]" : ""}
            >
              {f === "all"
                ? t({ ko: "전체", en: "all", ja: "全て", zh: "全部" })
                : f === "working"
                ? t({ ko: "작업중", en: "working", ja: "作業中", zh: "工作中" })
                : t({ ko: "미팅중", en: "in meeting", ja: "会議中", zh: "会议中" })}
            </button>
          ))}
        </div>

        {/* Scale indicator */}
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          color: "var(--th-text-muted)",
          background: "var(--th-bg-panel)",
          border: "1px solid var(--th-border)",
          borderRadius: 6,
          padding: "4px 8px",
        }}>
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          background: "var(--th-bg-primary)",
          cursor: isPanning ? "grabbing" : "grab",
          display: "block",
        }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onDoubleClick={handleSvgDoubleClick}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="arrow"
            viewBox="0 0 10 6"
            refX="10"
            refY="3"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-text-muted)" />
          </marker>
          <marker
            id="arrow-accent"
            viewBox="0 0 10 6"
            refX="10"
            refY="3"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-accent)" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Layer 1: Meeting cluster backgrounds */}
          {meetings.map((cluster) => (
            <MeetingCluster key={cluster.id} cluster={cluster} />
          ))}

          {/* Layer 2: Edges */}
          {edges.map((edge) => {
            const isHighlighted = hoveredNodeId
              ? edge.from.nodeId === hoveredNodeId || edge.to.nodeId === hoveredNodeId
              : false;
            const isDimmed = hoveredNodeId ? !isHighlighted : false;
            return (
              <FlowEdge
                key={edge.id}
                edge={edge}
                highlighted={isHighlighted}
                dimmed={isDimmed}
              />
            );
          })}

          {/* Layer 3: Agent nodes */}
          {nodes.map((node) => {
            const isHighlighted = connectedNodeIds ? connectedNodeIds.has(node.id) : false;
            const isDimmed = connectedNodeIds ? !connectedNodeIds.has(node.id) : false;
            return (
              <AgentNode
                key={node.id}
                node={node}
                tasks={tasks}
                highlighted={isHighlighted}
                dimmed={isDimmed}
                selected={selectedNodeId === node.id}
                onClick={handleNodeClick}
                onMouseEnter={setHoveredNodeId}
                onMouseLeave={() => setHoveredNodeId(null)}
              />
            );
          })}
        </g>
      </svg>

      {/* Empty state */}
      {isEmpty && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontFamily: mono,
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 32, opacity: 0.3 }}>◎</span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--th-text-muted)", fontWeight: 600 }}>
              {t({ ko: "에이전트 없음", en: "no agents", ja: "エージェントなし", zh: "无代理" })}
            </div>
            <div style={{ fontSize: 11, color: "var(--th-text-muted)", marginTop: 4 }}>
              {filter === "all"
                ? t({ ko: "프로젝트에 에이전트를 배정하세요", en: "assign agents to a project", ja: "プロジェクトにエージェントを配置してください", zh: "请将代理分配到项目" })
                : t({ ko: "필터를 변경하세요", en: "change the filter", ja: "フィルタを変更してください", zh: "请更改过滤条件" })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        background: "var(--th-bg-panel)",
        border: "1px solid var(--th-border)",
        borderRadius: 6,
        padding: "8px 12px",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--th-text-muted)" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
          <span>{t({ ko: "서브에이전트", en: "sub-agent", ja: "サブエージェント", zh: "子代理" })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--th-text-secondary)" strokeWidth="1.5" />
          </svg>
          <span>{t({ ko: "위임", en: "delegation", ja: "委任", zh: "委派" })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--th-accent)" strokeWidth="2" strokeDasharray="8 4" />
          </svg>
          <span>{t({ ko: "부서간 전달", en: "cross-dept", ja: "部署間", zh: "跨部门" })}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="24" height="8">
            <line x1="0" y1="4" x2="24" y2="4" stroke="var(--th-accent)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
          <span>{t({ ko: "미팅", en: "meeting", ja: "ミーティング", zh: "会议" })}</span>
        </div>
      </div>
    </div>
  );
}
