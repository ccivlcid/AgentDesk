import { useState } from "react";
import type { Agent } from "../../types";
import HookHistoryPanel from "./HookHistoryPanel";
import type { TFunction } from "./model";

interface HookMemorySectionProps {
  t: TFunction;
  localeTag?: string;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
}

export default function HookMemorySection({
  t,
  localeTag = "en",
  agents,
  historyRefreshToken,
  onRefreshHistory,
}: HookMemorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ borderRadius: 8, border: "1px solid #E5E7EB", background: "#FFFFFF", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{
          background: "none", border: "none",
          borderBottom: collapsed ? "none" : "1px solid #E5E7EB",
          cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 9, color: "#9CA3AF", transition: "transform 0.18s", display: "inline-flex", alignItems: "center", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
          <span className="text-sm font-semibold font-mono" style={{ color: "#111827" }}>
            {t({ ko: "학습 메모리", en: "Learning Memory", ja: "学習メモリ", zh: "学习记忆" })}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: "#9CA3AF" }}>
          {collapsed
            ? t({ ko: "펼치기", en: "Expand", ja: "展開", zh: "展开" })
            : t({ ko: "CLI별 훅 이력", en: "Per-CLI hook history", ja: "CLI別フック履歴", zh: "按 CLI 的钩子记录" })}
        </span>
      </button>
      {!collapsed && (
        <div className="p-3">
          <HookHistoryPanel
            t={t}
            localeTag={localeTag}
            agents={agents}
            refreshToken={historyRefreshToken}
            onLearningDataChanged={onRefreshHistory}
            className="h-[380px]"
          />
        </div>
      )}
    </div>
  );
}
