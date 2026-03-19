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

  const { nodes, edges, meetings, deptGroups } = useFlowLayout({
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

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitToView(nodes), 120);
      return () => clearTimeout(timer);
    }
  }, [nodes, nodes.length, fitToView]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedNodeId(null); setCtxMenu(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  const connectedNodeIds = hoveredNodeId
    ? new Set([
        hoveredNodeId,
        ...edges
          .filter((ed) => ed.from.nodeId === hoveredNodeId || ed.to.nodeId === hoveredNodeId)
          .flatMap((ed) => [ed.from.nodeId, ed.to.nodeId]),
      ])
    : null;

  const isEmpty = nodes.length === 0;

  // Stats
  const totalAgents = agents.length;
  const workingCount = agents.filter((a) => a.status === "working").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;
  const offlineCount = agents.filter((a) => a.status === "offline").length;
  const inMeetingCount = meetingPresences.length;

  const filterLabels: Record<FilterType, string> = {
    all:     t({ ko: "전체", en: "All", ja: "全て", zh: "全部" }),
    working: t({ ko: "작업중", en: "Working", ja: "作業中", zh: "工作中" }),
    meeting: t({ ko: "미팅중", en: "Meeting", ja: "会議中", zh: "会议中" }),
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

      {/* ── 상단 통계 바 ─────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        height: 38,
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 12px",
        borderBottom: "1px solid var(--th-border)",
        background: "var(--th-bg-panel)",
        fontFamily: mono,
        fontSize: 11,
      }}>
        {/* 통계 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
          <span style={{ color: "var(--th-text-muted)", fontSize: 10 }}>
            {t({ ko: "에이전트", en: "agents", ja: "エージェント", zh: "代理" })}
            <span style={{ color: "var(--th-text-primary)", fontWeight: 700, marginLeft: 5 }}>{totalAgents}</span>
          </span>
          <span style={{ width: 1, height: 12, background: "var(--th-border)" }} />
          {workingCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--th-accent)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--th-accent)", display: "inline-block" }} />
              {t({ ko: "작업중", en: "working", ja: "作業中", zh: "工作中" })}
              <span style={{ fontWeight: 700 }}>{workingCount}</span>
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--th-text-muted)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", border: "1px solid var(--th-text-muted)", display: "inline-block" }} />
            {t({ ko: "대기중", en: "idle", ja: "待機", zh: "空闲" })}
            <span style={{ color: "var(--th-text-secondary)" }}>{idleCount}</span>
          </span>
          {inMeetingCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a78bfa" }}>
              <span style={{ fontSize: 9 }}>●</span>
              {t({ ko: "미팅중", en: "in meeting", ja: "会議中", zh: "会议中" })}
              <span style={{ fontWeight: 700 }}>{inMeetingCount}</span>
            </span>
          )}
          {offlineCount > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--th-danger, #ef4444)", opacity: 0.7 }}>
              <span style={{ fontSize: 9 }}>○</span>
              {t({ ko: "오프라인", en: "offline", ja: "オフライン", zh: "离线" })}
              <span style={{ fontWeight: 700 }}>{offlineCount}</span>
            </span>
          )}
        </div>

        {/* 필터 + 줌 컨트롤 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* 필터 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            background: "var(--th-bg-elevated)",
            border: "1px solid var(--th-border)",
            borderRadius: 5,
            overflow: "hidden",
          }}>
            {(["all", "working", "meeting"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "3px 10px",
                  background: filter === f ? "var(--th-accent)" : "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 10,
                  color: filter === f ? "var(--th-accent-text, #000)" : "var(--th-text-muted)",
                  fontWeight: filter === f ? 700 : 400,
                }}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>

          {/* 줌 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            background: "var(--th-bg-elevated)",
            border: "1px solid var(--th-border)",
            borderRadius: 5,
            overflow: "hidden",
          }}>
            <button
              onClick={zoomOut}
              style={{ padding: "3px 7px", background: "none", border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, color: "var(--th-text-muted)", lineHeight: 1 }}
              className="hover:!text-[var(--th-text)]"
            >−</button>
            <span style={{ fontSize: 10, color: "var(--th-text-muted)", minWidth: 32, textAlign: "center", lineHeight: "24px" }}>
              {Math.round(transform.scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              style={{ padding: "3px 7px", background: "none", border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, color: "var(--th-text-muted)", lineHeight: 1 }}
              className="hover:!text-[var(--th-text)]"
            >+</button>
            <div style={{ width: 1, height: 14, background: "var(--th-border)" }} />
            <button
              onClick={() => fitToView(nodes)}
              style={{ padding: "3px 7px", background: "none", border: "none", cursor: "pointer", fontFamily: mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.04em" }}
              className="hover:!text-[var(--th-text)]"
            >FIT</button>
          </div>
        </div>
      </div>

      {/* ── SVG 캔버스 ──────────────────────────────────────────── */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
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
            <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--th-border)" opacity="0.6" />
            </pattern>
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
          <rect width="100%" height="100%" fill="url(#dot-grid)" style={{ pointerEvents: "none" }} />

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>

            {/* Layer 0: 부서 그룹 배경 */}
            {deptGroups.map((group) => (
              <g key={group.id}>
                {/* 배경 rect */}
                <rect
                  x={group.x}
                  y={group.y}
                  width={group.width}
                  height={group.height}
                  rx={10}
                  fill={group.color}
                  fillOpacity={0.04}
                  stroke={group.color}
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
                {/* 부서 헤더 */}
                <foreignObject
                  x={group.x}
                  y={group.y}
                  width={group.width}
                  height={40}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px 0",
                    fontFamily: mono,
                    userSelect: "none",
                  }}>
                    <span style={{ fontSize: 13, lineHeight: 1 }}>{group.icon}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: group.color,
                      letterSpacing: "0.06em",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {group.label.toUpperCase()}
                    </span>
                    {group.workingCount > 0 && (
                      <span style={{
                        fontSize: 9,
                        background: group.color + "33",
                        color: group.color,
                        borderRadius: 3,
                        padding: "1px 5px",
                        fontWeight: 700,
                      }}>
                        ● {group.workingCount}
                      </span>
                    )}
                  </div>
                </foreignObject>
                {/* 헤더 하단 구분선 */}
                <line
                  x1={group.x + 12}
                  y1={group.y + 38}
                  x2={group.x + group.width - 12}
                  y2={group.y + 38}
                  stroke={group.color}
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              </g>
            ))}

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
            gap: 10,
            fontFamily: mono,
            pointerEvents: "none",
          }}>
            <span style={{ fontSize: 28, opacity: 0.2 }}>◎</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "var(--th-text-muted)", fontWeight: 600 }}>
                {filter === "all"
                  ? t({ ko: "에이전트 없음", en: "no agents", ja: "エージェントなし", zh: "无代理" })
                  : t({ ko: "해당 에이전트 없음", en: "no agents match filter", ja: "該当なし", zh: "无匹配代理" })}
              </div>
              {filter !== "all" && (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  style={{
                    marginTop: 8,
                    pointerEvents: "all",
                    background: "none",
                    border: "1px solid var(--th-border)",
                    borderRadius: 4,
                    color: "var(--th-text-muted)",
                    fontFamily: mono,
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "3px 10px",
                  }}
                >
                  {t({ ko: "전체 보기", en: "show all", ja: "全て表示", zh: "显示全部" })}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
