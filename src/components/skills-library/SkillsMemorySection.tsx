import type { Agent } from "../../types";
import SkillHistoryPanel from "../SkillHistoryPanel";
import type { TFunction } from "./model";

interface SkillsMemorySectionProps {
  t: TFunction;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
}

export default function SkillsMemorySection({
  t,
  agents,
  historyRefreshToken,
  onRefreshHistory,
}: SkillsMemorySectionProps) {
  return (
    <div className="p-3" style={{ borderRadius: "4px", border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
          {t({ ko: "학습 메모리", en: "Learning Memory", ja: "学習メモリ", zh: "学习记忆" })}
        </div>
        <div className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {t({ ko: "CLI별 스킬 이력", en: "Per-CLI skill history", ja: "CLI別スキル履歴", zh: "按 CLI 的技能记录" })}
        </div>
      </div>
      <SkillHistoryPanel
        agents={agents}
        refreshToken={historyRefreshToken}
        onLearningDataChanged={onRefreshHistory}
        className="h-[380px]"
      />
    </div>
  );
}
