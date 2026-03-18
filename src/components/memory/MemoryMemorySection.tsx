import { useState } from "react";
import type { Agent } from "../../types";
import MemoryHistoryPanel from "./MemoryHistoryPanel";
import type { TFunction } from "./model";

interface MemoryMemorySectionProps {
  t: TFunction;
  localeTag?: string;
  agents: Agent[];
  historyRefreshToken: number;
  onRefreshHistory: () => void;
}

export default function MemoryMemorySection({
  t,
  localeTag = "en",
  agents,
  historyRefreshToken,
  onRefreshHistory,
}: MemoryMemorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", overflow: "hidden" }}>
      {/* 헤더 — 클릭으로 접기/펴기 */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
        style={{
          background: "none",
          border: "none",
          borderBottom: collapsed ? "none" : "1px solid var(--th-border)",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--th-hover-overlay-subtle)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: 9,
              color: "var(--th-text-muted)",
              transition: "transform 0.18s",
              display: "inline-block",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
          <span className="text-sm font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>
            {t({ ko: "학습 메모리", en: "Learning Memory", ja: "学習メモリ", zh: "学习记忆" })}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: "var(--th-text-muted)" }}>
          {collapsed
            ? t({ ko: "펼치기", en: "Expand", ja: "展開", zh: "展开" })
            : t({ ko: "CLI별 메모리 이력", en: "Per-CLI memory history", ja: "CLI別メモリ履歴", zh: "按 CLI 的记忆记录" })}
        </span>
      </button>

      {/* 콘텐츠 */}
      {!collapsed && (
        <div className="p-3">
          <MemoryHistoryPanel
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
