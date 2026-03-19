import { useEffect, useCallback, useState, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import type { Agent, Department, Task, SubAgent, CrossDeptDelivery, MeetingPresence } from "../../types";
import { useFlowLayout } from "./useFlowLayout";
import { useViewTransform } from "./useViewTransform";
import AgentNode from "./nodes/AgentNode";
import MeetingCluster from "./nodes/MeetingCluster";
import FlowEdge from "./edges/FlowEdge";
import { useUiStore } from "../../store/uiStore";

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
  const { openCli } = useUiStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ agentId: string; x: number; y: number } | null>(null);
  const ctxMenuRef = useRef<HTMLDivElement>(null);

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
  }, [nodes, nodes.length, fitToView]);

  // Esc key to deselect / close context menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedNodeId(null); setCtxMenu(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside to close context menu
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: globalThis.MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

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
          {/* Dot grid pattern */}
          <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--th-border)" opacity="0.5" />
          </pattern>

          {/* Arrow markers */}
          <marker id="arrow" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="7" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-text-muted)" />
          </marker>
          <marker id="arrow-accent" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="7" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-accent)" />
          </marker>
          <marker id="arrow-secondary" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="7" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3 L 0 6 z" fill="var(--th-text-secondary)" />
          </marker>
        </defs>

        {/* 배경 도트 그리드 */}
        <rect
          width="100%"
          height="100%"
          fill="url(#dot-grid)"
          style={{ pointerEvents: "none" }}
        />

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
                onContextMenu={(agentId, x, y) => setCtxMenu({ agentId, x, y })}
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

      {/* Context menu */}
      {ctxMenu && createPortal(
        <div
          ref={ctxMenuRef}
          style={{
            position: "fixed",
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 9000,
            background: "var(--th-bg-elevated)",
            border: "1px solid var(--th-border)",
            borderRadius: 7,
            boxShadow: "0 8px 24px rgba(0,0,0,0.32)",
            padding: "4px 0",
            minWidth: 140,
            fontFamily: mono,
            fontSize: 11,
          }}
        >
          <button
            type="button"
            onClick={() => { openCli(ctxMenu.agentId); setCtxMenu(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "7px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: mono,
              fontSize: 11,
              color: "#32ade6",
              textAlign: "left",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-hover-bg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>&gt;_</span>
            {t({ ko: "CLI 열기", en: "Open CLI", ja: "CLIを開く", zh: "打开 CLI" })}
          </button>
        </div>,
        document.body,
      )}

      {/* Legend */}
      <div style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        background: "var(--th-bg-panel)",
        border: "1px solid var(--th-border)",
        borderRadius: 7,
        padding: "8px 12px",
        fontFamily: mono,
        fontSize: 10,
        color: "var(--th-text-muted)",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--th-text-muted)", marginBottom: 2, opacity: 0.6 }}>
          LEGEND
        </div>
        {[
          { stroke: "var(--th-accent)", w: 2, dash: undefined, dot: true,  label: t({ ko: "위임", en: "delegation", ja: "委任", zh: "委派" }) },
          { stroke: "var(--th-text-muted)", w: 1, dash: "3 3", dot: false, label: t({ ko: "서브에이전트", en: "sub-agent", ja: "サブエージェント", zh: "子代理" }) },
          { stroke: "var(--th-text-secondary)", w: 2.5, dash: "8 4", dot: true, label: t({ ko: "부서간 전달", en: "cross-dept", ja: "部署間", zh: "跨部门" }) },
          { stroke: "#a78bfa", w: 1, dash: "4 4", dot: false, label: t({ ko: "미팅", en: "meeting", ja: "ミーティング", zh: "会议" }) },
          { stroke: "var(--th-text-muted)", w: 1, dash: "2 6", dot: false, label: t({ ko: "협업", en: "collab", ja: "コラボ", zh: "协作" }) },
        ].map(({ stroke, w, dash, dot, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="28" height="10" style={{ flexShrink: 0 }}>
              <line x1="2" y1="5" x2="26" y2="5" stroke={stroke} strokeWidth={w} strokeDasharray={dash} strokeLinecap="round" />
              {dot && <circle cx="14" cy="5" r="2.5" fill={stroke} opacity="0.9" />}
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
