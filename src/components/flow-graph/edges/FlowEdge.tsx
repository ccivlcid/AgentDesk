import type { FlowEdge as FlowEdgeData } from "../useFlowLayout";

interface FlowEdgeProps {
  edge: FlowEdgeData;
  highlighted?: boolean;
  dimmed?: boolean;
}

export default function FlowEdge({ edge, highlighted, dimmed }: FlowEdgeProps) {
  const opacity = dimmed ? 0.2 : highlighted ? 1 : 0.75;

  const strokeProps = (() => {
    switch (edge.type) {
      case "delegation":
        return {
          stroke: "var(--th-text-secondary)",
          strokeWidth: 1.5,
          strokeDasharray: undefined as string | undefined,
          markerEnd: "url(#arrow)",
          markerStart: undefined as string | undefined,
        };
      case "sub-agent":
        return {
          stroke: "var(--th-text-muted)",
          strokeWidth: 1,
          strokeDasharray: "3 3",
          markerEnd: "url(#arrow)",
          markerStart: undefined as string | undefined,
        };
      case "cross_dept":
        return {
          stroke: edge.deptColor ?? "var(--th-text-secondary)",
          strokeWidth: 2,
          strokeDasharray: "8 4",
          markerEnd: "url(#arrow-accent)",
          markerStart: undefined as string | undefined,
        };
      case "meeting":
        return {
          stroke: "var(--th-accent)",
          strokeWidth: 1,
          strokeDasharray: "4 4",
          markerEnd: undefined as string | undefined,
          markerStart: undefined as string | undefined,
        };
    }
  })();

  return (
    <g opacity={opacity}>
      <path
        d={edge.path}
        fill="none"
        stroke={strokeProps.stroke}
        strokeWidth={strokeProps.strokeWidth}
        strokeDasharray={strokeProps.strokeDasharray}
        markerEnd={strokeProps.markerEnd}
      />
      {edge.animated && (
        <circle r={3} fill="var(--th-accent)">
          <animateMotion dur="2s" repeatCount="indefinite" path={edge.path} />
        </circle>
      )}
    </g>
  );
}
