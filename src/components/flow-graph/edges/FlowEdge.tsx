import type { FlowEdge as FlowEdgeData } from "../useFlowLayout";

interface FlowEdgeProps {
  edge: FlowEdgeData;
  highlighted?: boolean;
  dimmed?: boolean;
}

const EDGE_STYLES: Record<FlowEdgeData["type"], {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerEnd?: string;
  animated: boolean;
}> = {
  delegation: {
    stroke: "var(--th-accent)",
    strokeWidth: 2,
    strokeDasharray: undefined,
    markerEnd: "url(#arrow-accent)",
    animated: true,
  },
  "sub-agent": {
    stroke: "var(--th-text-muted)",
    strokeWidth: 1,
    strokeDasharray: "3 3",
    markerEnd: "url(#arrow)",
    animated: false,
  },
  cross_dept: {
    stroke: "var(--th-text-secondary)",
    strokeWidth: 2.5,
    strokeDasharray: "8 4",
    markerEnd: "url(#arrow)",
    animated: true,
  },
  meeting: {
    stroke: "#a78bfa",
    strokeWidth: 1,
    strokeDasharray: "4 4",
    markerEnd: undefined,
    animated: false,
  },
  collab: {
    stroke: "var(--th-text-muted)",
    strokeWidth: 1,
    strokeDasharray: "2 6",
    markerEnd: undefined,
    animated: false,
  },
};

export default function FlowEdge({ edge, highlighted, dimmed }: FlowEdgeProps) {
  const opacity = dimmed ? 0.15 : highlighted ? 1 : 0.7;
  const style = EDGE_STYLES[edge.type];

  // cross_dept는 부서 컬러 사용
  const stroke = edge.type === "cross_dept" && edge.deptColor
    ? edge.deptColor
    : style.stroke;

  const showAnimated = style.animated || edge.animated;

  return (
    <g opacity={opacity}>
      {/* 메인 패스 */}
      <path
        d={edge.path}
        fill="none"
        stroke={stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        markerEnd={style.markerEnd}
        strokeLinecap="round"
      />

      {/* 흐름 애니메이션 도트 */}
      {showAnimated && (
        <circle
          r={edge.type === "delegation" ? 3.5 : 2.5}
          fill={stroke}
          opacity={0.9}
        >
          <animateMotion
            dur={edge.type === "delegation" ? "1.8s" : "2.4s"}
            repeatCount="indefinite"
            path={edge.path}
          />
        </circle>
      )}
    </g>
  );
}
