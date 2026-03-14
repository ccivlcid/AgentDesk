import { useI18n } from "../../../i18n";
import type { MeetingClusterData } from "../useFlowLayout";

interface MeetingClusterProps {
  cluster: MeetingClusterData;
}

export default function MeetingCluster({ cluster }: MeetingClusterProps) {
  const { t } = useI18n();
  const { cx, cy, radius, phase } = cluster;

  const phaseLabel = phase === "kickoff"
    ? t({ ko: "킥오프", en: "kickoff", ja: "キックオフ", zh: "启动会" })
    : t({ ko: "리뷰", en: "review", ja: "レビュー", zh: "评审" });

  const phaseIcon = phase === "kickoff" ? "🤝" : "🔍";

  return (
    <g>
      {/* Outer dashed circle */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="var(--th-accent)"
        fillOpacity={0.04}
        stroke="var(--th-accent)"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        strokeOpacity={0.7}
      />
      {/* Phase label at top */}
      <foreignObject
        x={cx - 60}
        y={cy - radius - 22}
        width={120}
        height={22}
      >
        <div style={{
          fontFamily: "var(--th-font-mono)",
          fontSize: 10,
          color: "var(--th-accent)",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          userSelect: "none",
        }}>
          <span>{phaseIcon}</span>
          <span>{phaseLabel}</span>
        </div>
      </foreignObject>
    </g>
  );
}
