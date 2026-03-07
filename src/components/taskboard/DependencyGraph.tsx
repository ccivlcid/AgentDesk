import { useEffect, useMemo, useRef, useState } from "react";
import { getAllTaskDependencies } from "../../api/task-dependencies";
import type { Task } from "../../types";
import { useI18n } from "../../i18n";

// ── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 168;
const NODE_H = 52;
const RANK_GAP = 220; // horizontal distance between ranks
const LEVEL_GAP = 72; // vertical distance between nodes in same rank
const PAD = 32; // canvas padding

// ── Status color map ─────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { border: string; dot: string; label: string }> = {
  inbox:         { border: "rgba(100,116,139,0.7)", dot: "#94a3b8",  label: "#94a3b8" },
  planned:       { border: "rgba(59,130,246,0.7)",  dot: "#60a5fa",  label: "#60a5fa" },
  collaborating: { border: "rgba(99,102,241,0.7)",  dot: "#818cf8",  label: "#818cf8" },
  in_progress:   { border: "rgba(245,158,11,0.8)",  dot: "#f59e0b",  label: "#f59e0b" },
  review:        { border: "rgba(167,139,250,0.7)", dot: "#c4b5fd",  label: "#c4b5fd" },
  done:          { border: "rgba(52,211,153,0.7)",  dot: "#34d399",  label: "#34d399" },
  pending:       { border: "rgba(249,115,22,0.7)",  dot: "#fb923c",  label: "#fb923c" },
  cancelled:     { border: "rgba(244,63,94,0.5)",   dot: "#fb7185",  label: "#fb7185" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.inbox;
}

// ── DAG layout ───────────────────────────────────────────────────────────────
interface NodeLayout {
  id: string;
  rank: number;
  indexInRank: number;
  x: number;
  y: number;
}

function buildLayout(
  taskIds: string[],
  edges: Array<{ task_id: string; depends_on_task_id: string }>,
): Map<string, NodeLayout> {
  // forward graph: prereq → dependent (depends_on → task_id)
  const forward = new Map<string, Set<string>>();
  const backward = new Map<string, Set<string>>(); // task_id → set of its prereqs
  for (const id of taskIds) {
    forward.set(id, new Set());
    backward.set(id, new Set());
  }
  for (const edge of edges) {
    if (!forward.has(edge.task_id) || !forward.has(edge.depends_on_task_id)) continue;
    forward.get(edge.depends_on_task_id)!.add(edge.task_id);
    backward.get(edge.task_id)!.add(edge.depends_on_task_id);
  }

  // Assign ranks via longest-path from sources
  const rank = new Map<string, number>();
  const visited = new Set<string>();

  function assignRank(id: string): number {
    if (rank.has(id)) return rank.get(id)!;
    if (visited.has(id)) return 0; // cycle guard
    visited.add(id);
    const prereqs = backward.get(id)!;
    if (prereqs.size === 0) {
      rank.set(id, 0);
      return 0;
    }
    let maxPrereqRank = -1;
    for (const pre of prereqs) {
      maxPrereqRank = Math.max(maxPrereqRank, assignRank(pre));
    }
    const r = maxPrereqRank + 1;
    rank.set(id, r);
    return r;
  }

  for (const id of taskIds) assignRank(id);

  // Group by rank, sort deterministically
  const byRank = new Map<number, string[]>();
  for (const [id, r] of rank.entries()) {
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(id);
  }
  for (const [, nodes] of byRank.entries()) {
    nodes.sort();
  }

  // Build layout
  const layout = new Map<string, NodeLayout>();
  for (const [r, nodes] of byRank.entries()) {
    nodes.forEach((id, idx) => {
      layout.set(id, {
        id,
        rank: r,
        indexInRank: idx,
        x: PAD + r * RANK_GAP,
        y: PAD + idx * LEVEL_GAP,
      });
    });
  }
  return layout;
}

// ── SVG edge path ─────────────────────────────────────────────────────────────
function edgePath(from: NodeLayout, to: NodeLayout): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

// ── Component ────────────────────────────────────────────────────────────────
interface DependencyGraphProps {
  tasks: Task[];
  onOpenTerminal?: (taskId: string) => void;
}

export default function DependencyGraph({ tasks, onOpenTerminal }: DependencyGraphProps) {
  const { t, locale } = useI18n();
  const [edges, setEdges] = useState<Array<{ task_id: string; depends_on_task_id: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const dragging = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const isKo = locale.startsWith("ko");

  useEffect(() => {
    setLoading(true);
    getAllTaskDependencies()
      .then((res) => setEdges(res.ok ? res.edges : []))
      .catch(() => setEdges([]))
      .finally(() => setLoading(false));
  }, []);

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const task of tasks) m.set(task.id, task);
    return m;
  }, [tasks]);

  const layout = useMemo(() => {
    return buildLayout(tasks.map((t) => t.id), edges);
  }, [tasks, edges]);

  // Visible edges (both endpoints must be in layout)
  const visibleEdges = useMemo(() => {
    return edges.filter((e) => layout.has(e.task_id) && layout.has(e.depends_on_task_id));
  }, [edges, layout]);

  // Hovered task's edges
  const hoveredEdgeSet = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const s = new Set<string>();
    for (const e of visibleEdges) {
      if (e.task_id === hoveredId || e.depends_on_task_id === hoveredId) {
        s.add(`${e.depends_on_task_id}->${e.task_id}`);
      }
    }
    return s;
  }, [hoveredId, visibleEdges]);

  // SVG canvas size
  const { svgW, svgH } = useMemo(() => {
    let maxX = 0, maxY = 0;
    for (const node of layout.values()) {
      maxX = Math.max(maxX, node.x + NODE_W + PAD);
      maxY = Math.max(maxY, node.y + NODE_H + PAD);
    }
    return { svgW: Math.max(maxX, 400), svgH: Math.max(maxY, 200) };
  }, [layout]);

  // Wheel zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.3), 3));
  }

  // Pan drag
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    dragging.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setPan({
      x: dragging.current.panX + (e.clientX - dragging.current.startX),
      y: dragging.current.panY + (e.clientY - dragging.current.startY),
    });
  }
  function handleMouseUp() {
    dragging.current = null;
  }

  const tr = (ko: string, en: string) => t({ ko, en, ja: en, zh: en });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: "var(--th-text-muted)" }}>
        <span className="text-xs font-mono animate-pulse">{tr("그래프 로딩 중...", "Loading graph...")}</span>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-2" style={{ color: "var(--th-text-muted)" }}>
        <div className="text-2xl">&#9670;</div>
        <div className="text-xs font-mono">{tr("업무가 없습니다", "No tasks")}</div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden" style={{ background: "var(--th-bg-primary)" }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 border-b px-4 py-2 text-[10px] font-mono flex-shrink-0"
        style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
      >
        <span style={{ color: "var(--th-accent)" }}>&#9670; {tr("의존성 그래프", "Dependency Graph")}</span>
        <span>{tasks.length} {tr("업무", "tasks")}</span>
        <span>{visibleEdges.length} {tr("의존 관계", "edges")}</span>
        <span className="ml-auto opacity-60">{tr("스크롤=줌 · 드래그=이동", "Scroll=zoom · Drag=pan")}</span>
        <button
          onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
          className="border px-2 py-0.5 hover:opacity-80 transition"
          style={{ borderRadius: "2px", borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}
        >
          {tr("초기화", "Reset")}
        </button>
      </div>

      {/* No edges hint */}
      {visibleEdges.length === 0 && (
        <div
          className="border-b px-4 py-1.5 text-[10px] font-mono"
          style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)", background: "rgba(251,191,36,0.04)" }}
        >
          {tr(
            "설정된 의존 관계가 없습니다. 업무 상세에서 '선행 업무'를 추가할 수 있습니다.",
            "No dependencies set. You can add prerequisites in task detail.",
          )}
        </div>
      )}

      {/* SVG canvas */}
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ userSelect: "none" }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: "block" }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(100,116,139,0.7)" />
            </marker>
            <marker id="arrow-hot" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="rgba(251,191,36,0.9)" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* Edges */}
            {visibleEdges.map((edge) => {
              const from = layout.get(edge.depends_on_task_id)!;
              const to = layout.get(edge.task_id)!;
              const key = `${edge.depends_on_task_id}->${edge.task_id}`;
              const hot = hoveredEdgeSet.has(key);
              return (
                <path
                  key={key}
                  d={edgePath(from, to)}
                  fill="none"
                  stroke={hot ? "rgba(251,191,36,0.9)" : "rgba(100,116,139,0.4)"}
                  strokeWidth={hot ? 2 : 1}
                  markerEnd={hot ? "url(#arrow-hot)" : "url(#arrow)"}
                  style={{ transition: "stroke 0.1s, stroke-width 0.1s" }}
                />
              );
            })}

            {/* Nodes */}
            {[...layout.values()].map((node) => {
              const task = taskMap.get(node.id);
              if (!task) return null;
              const sc = getStatusColor(task.status);
              const isHovered = hoveredId === node.id;
              const title = isKo ? task.title : task.title;
              const shortTitle = title.length > 22 ? title.slice(0, 21) + "…" : title;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onOpenTerminal?.(node.id)}
                  style={{ cursor: onOpenTerminal ? "pointer" : "default" }}
                >
                  {/* Node background */}
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={2}
                    fill={isHovered ? "var(--th-bg-elevated)" : "var(--th-bg-surface)"}
                    stroke={isHovered ? "rgba(251,191,36,0.7)" : sc.border}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ transition: "fill 0.1s, stroke 0.1s" }}
                  />
                  {/* Status left bar */}
                  <rect x={0} y={0} width={3} height={NODE_H} rx={2} fill={sc.dot} />

                  {/* Task ID badge */}
                  <text
                    x={10}
                    y={17}
                    fontSize={9}
                    fontFamily="var(--th-font-mono)"
                    fill="rgba(100,116,139,0.8)"
                  >
                    #{task.id.slice(0, 8)}
                  </text>

                  {/* Status dot */}
                  <circle cx={NODE_W - 12} cy={13} r={3} fill={sc.dot} />

                  {/* Title */}
                  <text
                    x={10}
                    y={34}
                    fontSize={11}
                    fontFamily="var(--th-font-mono)"
                    fill={isHovered ? "var(--th-text-heading)" : "var(--th-text-primary)"}
                    fontWeight={isHovered ? "600" : "400"}
                  >
                    {shortTitle}
                  </text>

                  {/* Status label */}
                  <text
                    x={10}
                    y={46}
                    fontSize={9}
                    fontFamily="var(--th-font-mono)"
                    fill={sc.label}
                  >
                    {task.status}
                  </text>

                  {/* Priority pip */}
                  {task.priority >= 4 && (
                    <text x={NODE_W - 16} y={46} fontSize={9} fill="rgb(253,164,175)" fontFamily="var(--th-font-mono)">
                      HI
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
