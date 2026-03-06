import { useState, useEffect, useMemo } from "react";
import type { ProjectI18nTranslate } from "./types";

interface BurndownPoint {
  date: number;
  total: number;
  done: number;
  remaining: number;
}

interface Props {
  projectId: string;
  t: ProjectI18nTranslate;
}

function tr(t: ProjectI18nTranslate, ko: string, en: string): string {
  return t({ ko, en, ja: en, zh: en });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function BurndownChart({ projectId, t }: Props) {
  const [data, setData] = useState<BurndownPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/burndown`)
      .then((r) => r.json())
      .then((res) => setData(res.burndown ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const maxVal = Math.max(...data.map((d) => Math.max(d.total, d.remaining)));
    const chartHeight = 120;
    const chartWidth = Math.max(data.length * 6, 200);

    // Create SVG path data
    function toPath(points: { x: number; y: number }[]): string {
      if (points.length === 0) return "";
      return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    }

    function toArea(points: { x: number; y: number }[]): string {
      if (points.length === 0) return "";
      const path = toPath(points);
      return `${path} L${points[points.length - 1].x},${chartHeight} L${points[0].x},${chartHeight} Z`;
    }

    const step = chartWidth / Math.max(data.length - 1, 1);

    const totalPoints = data.map((d, i) => ({
      x: i * step,
      y: chartHeight - (maxVal > 0 ? (d.total / maxVal) * (chartHeight - 10) : 0),
    }));

    const donePoints = data.map((d, i) => ({
      x: i * step,
      y: chartHeight - (maxVal > 0 ? (d.done / maxVal) * (chartHeight - 10) : 0),
    }));

    const remainingPoints = data.map((d, i) => ({
      x: i * step,
      y: chartHeight - (maxVal > 0 ? (d.remaining / maxVal) * (chartHeight - 10) : 0),
    }));

    // x-axis labels (show every ~5 labels)
    const labelInterval = Math.max(Math.floor(data.length / 7), 1);
    const labels = data
      .map((d, i) => ({ index: i, label: formatDate(d.date), x: i * step }))
      .filter((_, i) => i % labelInterval === 0 || i === data.length - 1);

    return {
      chartHeight,
      chartWidth,
      maxVal,
      totalPath: toPath(totalPoints),
      donePath: toPath(donePoints),
      doneArea: toArea(donePoints),
      remainingPath: toPath(remainingPoints),
      labels,
      lastPoint: data[data.length - 1],
    };
  }, [data]);

  if (loading) {
    return <div className="text-xs text-slate-500 py-4 text-center">Loading...</div>;
  }

  if (!chartData || data.length < 2) {
    return (
      <div className="text-xs text-slate-500 py-4 text-center">
        {tr(t, "데이터가 부족합니다", "Not enough data")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex gap-4 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-slate-400 rounded" />
          {tr(t, "전체", "Total")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-emerald-400 rounded" />
          {tr(t, "완료", "Done")}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-amber-400 rounded" />
          {tr(t, "잔여", "Remaining")}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`-5 -5 ${chartData.chartWidth + 10} ${chartData.chartHeight + 25}`}
          className="w-full"
          style={{ minWidth: Math.min(chartData.chartWidth, 400), maxHeight: 160 }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={0}
              y1={chartData.chartHeight - frac * (chartData.chartHeight - 10)}
              x2={chartData.chartWidth}
              y2={chartData.chartHeight - frac * (chartData.chartHeight - 10)}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth={0.5}
            />
          ))}

          {/* Done area fill */}
          <path d={chartData.doneArea} fill="rgba(52,211,153,0.1)" />

          {/* Lines */}
          <path d={chartData.totalPath} fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth={1.5} />
          <path d={chartData.remainingPath} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth={1.5} strokeDasharray="3 2" />
          <path d={chartData.donePath} fill="none" stroke="rgba(52,211,153,0.8)" strokeWidth={1.5} />

          {/* X-axis labels */}
          {chartData.labels.map((l) => (
            <text
              key={l.index}
              x={l.x}
              y={chartData.chartHeight + 14}
              textAnchor="middle"
              fill="rgba(148,163,184,0.5)"
              fontSize={8}
            >
              {l.label}
            </text>
          ))}

          {/* Y-axis labels */}
          <text x={-2} y={chartData.chartHeight} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize={7}>
            0
          </text>
          <text x={-2} y={12} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize={7}>
            {chartData.maxVal}
          </text>
        </svg>
      </div>

      {/* Stats */}
      {chartData.lastPoint && (
        <div className="flex gap-4 text-[11px] text-slate-400">
          <span>{tr(t, "전체", "Total")}: {chartData.lastPoint.total}</span>
          <span className="text-emerald-400">{tr(t, "완료", "Done")}: {chartData.lastPoint.done}</span>
          <span className="text-amber-400">{tr(t, "잔여", "Rem")}: {chartData.lastPoint.remaining}</span>
        </div>
      )}
    </div>
  );
}
