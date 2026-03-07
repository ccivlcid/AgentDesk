import type { Agent } from "../../types";
import type { RuleLearningHistoryEntry } from "../../api/agent-rules";
import RuleHistoryPanel from "./RuleHistoryPanel";
import type { TFunction } from "./model";

interface RuleMemorySectionProps {
  t: TFunction;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
  /** 학습 성공 직후 서버 refetch 전에 이력에 바로 보여줄 행(낙관적 표시) */
  optimisticHistoryRows?: RuleLearningHistoryEntry[];
}

export default function RuleMemorySection({
  t,
  agents,
  historyRefreshToken,
  onRefreshHistory,
  optimisticHistoryRows,
}: RuleMemorySectionProps) {
  return (
    <div className="p-3" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "학습 메모리", en: "Learning Memory", ja: "学習メモリ", zh: "学习记忆" })}
        </div>
        <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "CLI별 룰 이력", en: "Per-CLI rule history", ja: "CLI別ルール履歴", zh: "按 CLI 的规则记录" })}
        </div>
      </div>
      <RuleHistoryPanel
        t={t}
        agents={agents}
        refreshToken={historyRefreshToken}
        onLearningDataChanged={onRefreshHistory}
        optimisticHistoryRows={optimisticHistoryRows}
        className="h-[380px]"
      />
    </div>
  );
}
