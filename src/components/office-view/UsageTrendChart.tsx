import { useState, useEffect, useMemo } from "react";
import type { UiLanguage } from "../../i18n";

interface DailyEntry {
  day_epoch: number;
  provider: string;
  run_count: number;
  total_duration_ms: number;
  total_log_bytes: number;
  success_count: number;
}

interface Props {
  language: UiLanguage;
}

const PROVIDER_COLORS: Record<string, string> = {
  claude: "#D97757",
  codex: "#10A37F",
  gemini: "#4285F4",
  copilot: "#6e40c9",
  antigravity: "#f59e0b",
  ollama: "#64748b",
  api: "#06b6d4",
  cursor: "#3b82f6",
  opencode: "#8b5cf6",
};

function formatDate(dayEpoch: number): string {
  const d = new Date(dayEpoch * 86_400_000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function UsageTrendChart({ language }: Props) {
  const [data, setData] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  const tr = (ko: string, en: string) => (language === "ko" ? ko : en);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agent-usage/trends/daily?days=${days}`)
      .then((r) => r.json())
      .then((res) => setData(res.daily ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [days]);

  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    // Group by day
    const dayMap = new Map<number, Map<string, number>>();
    const providerSet = new Set<string>();

    for (const entry of data) {
      providerSet.add(entry.provider);
      if (!dayMap.has(entry.day_epoch)) dayMap.set(entry.day_epoch, new Map());
      const provMap = dayMap.get(entry.day_epoch)!;
      provMap.set(entry.provider, (provMap.get(entry.provider) ?? 0) + entry.run_count);
    }

    const sortedDays = [...dayMap.keys()].sort((a, b) => a - b);
    const providers = [...providerSet].sort();

    // Find max stacked value per day
    let maxVal = 0;
    for (const provMap of dayMap.values()) {
      let dayTotal = 0;
      for (const count of provMap.values()) dayTotal += count;
      maxVal = Math.max(maxVal, dayTotal);
    }

    const chartHeight = 100;
    const barWidth = Math.max(Math.min(600 / sortedDays.length - 2, 20), 4);
    const chartWidth = sortedDays.length * (barWidth + 2);

    return { sortedDays, providers, dayMap, maxVal, chartHeight, barWidth, chartWidth };
  }, [data]);

  if (loading) {
    return <div className="text-xs font-mono py-4 text-center" style={{ color: "var(--th-text-muted)" }}>Loading...</div>;
  }

  if (!chartData || chartData.sortedDays.length === 0) {
    return (
      <div className="text-xs font-mono py-4 text-center" style={{ color: "var(--th-text-muted)" }}>
        {tr("사용 데이터가 없습니다", "No usage data yet")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono" style={{ color: "var(--th-text-muted)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          {tr("일별 사용량 추이", "Daily Usage Trend")}
        </h4>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-2.5 py-1 text-[11px] font-mono transition-colors"
              style={days === d
                ? { borderRadius: "2px", border: "1px solid rgba(6,182,212,0.4)", background: "rgba(6,182,212,0.3)", color: "rgb(103,232,249)" }
                : { borderRadius: "2px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}
            >
              {d}{tr("일", "d")}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
        {chartData.providers.map((p) => (
          <span key={p} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5"
              style={{ backgroundColor: PROVIDER_COLORS[p] ?? "#64748b", borderRadius: "1px" }}
            />
            {p}
          </span>
        ))}
      </div>

      {/* Stacked bar chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`-20 -5 ${chartData.chartWidth + 25} ${chartData.chartHeight + 25}`}
          className="w-full"
          style={{ minWidth: Math.min(chartData.chartWidth + 40, 300), maxHeight: 140 }}
        >
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1={0}
              y1={chartData.chartHeight - frac * chartData.chartHeight}
              x2={chartData.chartWidth}
              y2={chartData.chartHeight - frac * chartData.chartHeight}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth={0.5}
            />
          ))}

          {/* Y-axis labels */}
          <text x={-3} y={chartData.chartHeight + 3} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize={7}>0</text>
          <text x={-3} y={5} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize={7}>{chartData.maxVal}</text>

          {/* Bars */}
          {chartData.sortedDays.map((day, i) => {
            const provMap = chartData.dayMap.get(day) ?? new Map();
            let y = chartData.chartHeight;
            const x = i * (chartData.barWidth + 2);

            return (
              <g key={day}>
                {chartData.providers.map((provider) => {
                  const count = provMap.get(provider) ?? 0;
                  if (count === 0) return null;
                  const barHeight = chartData.maxVal > 0
                    ? (count / chartData.maxVal) * chartData.chartHeight
                    : 0;
                  y -= barHeight;
                  return (
                    <rect
                      key={provider}
                      x={x}
                      y={y}
                      width={chartData.barWidth}
                      height={barHeight}
                      fill={PROVIDER_COLORS[provider] ?? "#64748b"}
                      rx={1}
                    >
                      <title>{`${formatDate(day)} ${provider}: ${count}`}</title>
                    </rect>
                  );
                })}
                {/* X-axis label */}
                {(i % Math.max(Math.floor(chartData.sortedDays.length / 7), 1) === 0 ||
                  i === chartData.sortedDays.length - 1) && (
                  <text
                    x={x + chartData.barWidth / 2}
                    y={chartData.chartHeight + 12}
                    textAnchor="middle"
                    fill="rgba(148,163,184,0.5)"
                    fontSize={7}
                  >
                    {formatDate(day)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Total stats */}
      <div className="flex gap-3 text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
        <span>
          {tr("총 실행", "Total runs")}:{" "}
          {data.reduce((sum, d) => sum + d.run_count, 0)}
        </span>
        <span>
          {tr("성공", "Success")}:{" "}
          {data.reduce((sum, d) => sum + d.success_count, 0)}
        </span>
      </div>
    </div>
  );
}
