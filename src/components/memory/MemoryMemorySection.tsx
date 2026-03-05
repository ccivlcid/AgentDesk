import type { Agent } from "../../types";
import MemoryHistoryPanel from "./MemoryHistoryPanel";
import type { TFunction } from "./model";

interface MemoryMemorySectionProps {
  t: TFunction;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
}

export default function MemoryMemorySection({
  t,
  agents,
  historyRefreshToken,
  onRefreshHistory,
}: MemoryMemorySectionProps) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">
          {t({ ko: "\uD559\uC2B5 \uBA54\uBAA8\uB9AC", en: "Learning Memory", ja: "\u5B66\u7FD2\u30E1\u30E2\u30EA", zh: "\u5B66\u4E60\u8BB0\u5FC6" })}
        </div>
        <div className="text-[11px] text-slate-500">
          {t({ ko: "CLI\uBCC4 \uBA54\uBAA8\uB9AC \uC774\uB825", en: "Per-CLI memory history", ja: "CLI\u5225\u30E1\u30E2\u30EA\u5C65\u6B74", zh: "\u6309 CLI \u7684\u8BB0\u5FC6\u8BB0\u5F55" })}
        </div>
      </div>
      <MemoryHistoryPanel
        t={t}
        agents={agents}
        refreshToken={historyRefreshToken}
        onLearningDataChanged={onRefreshHistory}
        className="h-[380px]"
      />
    </div>
  );
}
