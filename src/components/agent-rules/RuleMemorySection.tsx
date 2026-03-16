import { useState } from "react";
import type { Agent } from "../../types";
import type { RuleLearningHistoryEntry } from "../../api/agent-rules";
import RuleHistoryPanel from "./RuleHistoryPanel";
import type { TFunction } from "./model";

interface RuleMemorySectionProps {
  t: TFunction;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
  optimisticHistoryRows?: RuleLearningHistoryEntry[];
}

export default function RuleMemorySection({
  t,
  agents,
  historyRefreshToken,
  onRefreshHistory,
  optimisticHistoryRows,
}: RuleMemorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{
          background: "none", border: "none",
          borderBottom: collapsed ? "none" : "1px solid var(--th-border)",
          cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-hover-overlay-subtle)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 9, color: "var(--th-text-muted)", transition: "transform 0.18s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
          <span className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {t({ ko: "학습 메모리", en: "Learning Memory", ja: "学習メモリ", zh: "学习记忆" })}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {collapsed
            ? t({ ko: "펼치기", en: "Expand", ja: "展開", zh: "展开" })
            : t({ ko: "CLI별 룰 이력", en: "Per-CLI rule history", ja: "CLI別ルール履歴", zh: "按 CLI 的规则记录" })}
        </span>
      </button>
      {!collapsed && (
        <div className="p-3">
          <RuleHistoryPanel
            t={t}
            agents={agents}
            refreshToken={historyRefreshToken}
            onLearningDataChanged={onRefreshHistory}
            optimisticHistoryRows={optimisticHistoryRows}
            className="h-[380px]"
          />
        </div>
      )}
    </div>
  );
}
