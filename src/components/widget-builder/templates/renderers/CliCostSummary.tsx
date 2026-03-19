import { useEffect, useState } from "react";
import type { CustomFeatureConfig } from "../../../../types";

const mono: React.CSSProperties = { fontFamily: "var(--th-font-mono)" };

interface UsageItem { provider: string; utilization: number; window: string }

export default function CliCostSummary({ config }: { config: CustomFeatureConfig }) {
  const [items, setItems] = useState<UsageItem[]>([]);
  const [fetchError, setFetchError] = useState(false);
  const period = (config.params?.period as string | undefined) ?? "today";

  useEffect(() => {
    setFetchError(false);
    fetch("/api/workflow-skills-subtasks")
      .then((r) => r.json())
      .then((j) => setItems(j.usageItems ?? []))
      .catch(() => setFetchError(true));
  }, [period]);

  const label = period === "week" ? "이번 주" : "오늘";

  return (
    <div className="flex flex-col gap-2 p-3 h-full">
      <div style={{ ...mono, fontSize: 9, color: "var(--th-text-muted)", letterSpacing: "0.08em" }}>CLI COST · {label.toUpperCase()}</div>
      {fetchError ? (
        <div style={{ ...mono, fontSize: 10, color: "var(--th-danger-text)" }}>API 연결 실패</div>
      ) : items.length === 0 ? (
        <div style={{ ...mono, fontSize: 11, color: "var(--th-text-muted)" }}>데이터 없음</div>
      ) : (
        items.map((item, i) => {
          const pct = Math.min(100, Math.round(item.utilization * 100));
          const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "var(--th-accent)" : "var(--th-attr-elite)";
          return (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex justify-between">
                <span style={{ ...mono, fontSize: 10, color: "var(--th-text-primary)" }}>{item.provider}</span>
                <span style={{ ...mono, fontSize: 10, color }}>{pct}%</span>
              </div>
              <div style={{ height: 3, background: "var(--th-border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
