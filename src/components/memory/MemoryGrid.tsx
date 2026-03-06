import { useState } from "react";
import type { MemoryEntry, Agent } from "../../types";
import type { MemoryHistoryProvider } from "../../api/memory";
import AgentAvatar from "../AgentAvatar";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  categoryLabel,
  cliProviderIcon,
  memoryProviderLabel,
  type TFunction,
} from "./model";

interface MemoryGridProps {
  t: TFunction;
  filtered: MemoryEntry[];
  onToggle: (id: string) => void;
  onEdit: (entry: MemoryEntry) => void;
  onDelete: (id: string) => void;
  deletingEntryId: string | null;
  learnedProvidersByEntry: Map<string, MemoryHistoryProvider[]>;
  learnedRepresentatives: Map<MemoryHistoryProvider, Agent | null>;
  agents: Agent[];
  onOpenLearningModal: (entry: MemoryEntry) => void;
}

export default function MemoryGrid({
  t,
  filtered,
  onToggle,
  onEdit,
  onDelete,
  deletingEntryId,
  learnedProvidersByEntry,
  learnedRepresentatives,
  agents,
  onOpenLearningModal,
}: MemoryGridProps) {
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);

  function handleCopy(entry: MemoryEntry) {
    void navigator.clipboard.writeText(entry.content);
    setCopiedEntryId(entry.id);
    setTimeout(() => setCopiedEntryId(null), 1500);
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">&#x1F50D;</div>
        <div className="text-slate-400 text-sm">
          {t({
            ko: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
            en: "No search results",
            ja: "\u691C\u7D22\u7D50\u679C\u306F\u3042\u308A\u307E\u305B\u3093",
            zh: "\u6CA1\u6709\u641C\u7D22\u7ED3\u679C",
          })}
        </div>
        <div className="text-slate-500 text-xs mt-1">
          {t({
            ko: "\uB2E4\uB978 \uD0A4\uC6CC\uB4DC\uB85C \uAC80\uC0C9\uD574\uBCF4\uC138\uC694",
            en: "Try a different keyword",
            ja: "\u5225\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3067\u691C\u7D22\u3057\u3066\u304F\u3060\u3055\u3044",
            zh: "\u8BF7\u5C1D\u8BD5\u5176\u4ED6\u5173\u952E\u8BCD",
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {filtered.map((entry) => {
        const catColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.context;
        const isDeleting = deletingEntryId === entry.id;
        const learnedProviders = (learnedProvidersByEntry.get(entry.id) ?? []).slice(0, 4);

        return (
          <div
            key={entry.id}
            className={`relative bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all group ${
              !entry.enabled ? "opacity-50" : ""
            } ${isDeleting ? "pointer-events-none opacity-30" : ""}`}
          >
            {/* Top: icon + title/desc + learned avatars */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/60 text-sm font-bold">
                  {CATEGORY_ICONS[entry.category] || "\uD83D\uDCDD"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{entry.title}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {entry.description || entry.content.slice(0, 60)}
                  </div>
                </div>
              </div>

              {learnedProviders.length > 0 && (
                <div className="grid w-[64px] shrink-0 grid-cols-2 gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-1">
                  {learnedProviders.map((provider) => {
                    const agent = learnedRepresentatives.get(provider) ?? null;
                    return (
                      <span
                        key={`${entry.id}-${provider}`}
                        className="inline-flex h-5 w-6 items-center justify-center gap-0.5 rounded-md border border-emerald-500/20 bg-slate-900/70"
                        title={`${memoryProviderLabel(provider)}${agent ? ` \u00B7 ${agent.name}` : ""}`}
                      >
                        <span className="flex h-2.5 w-2.5 items-center justify-center">
                          {cliProviderIcon(provider)}
                        </span>
                        <span className="h-2.5 w-2.5 overflow-hidden rounded-[3px] bg-slate-800/80">
                          <AgentAvatar agent={agent ?? undefined} agents={agents} size={10} rounded="xl" />
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom: category badge + priority + Learn/Copy */}
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catColor}`}>
                {CATEGORY_ICONS[entry.category]} {categoryLabel(entry.category, t)}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">
                  <span className="text-blue-400 font-medium">P{entry.priority}</span>
                </span>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onOpenLearningModal(entry)}
                    className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                      learnedProviders.length > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 cursor-pointer hover:bg-emerald-500/25"
                        : "bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30"
                    }`}
                    title={
                      learnedProviders.length > 0
                        ? t({
                            ko: "학습 완료 · 클릭 시 학습 모달",
                            en: "Learned · Click to open learning modal",
                            ja: "学習済み · クリックで学習モーダル",
                            zh: "已学习 · 点击打开学习弹窗",
                          })
                        : t({
                            ko: "CLI 대표자에게 메모리 학습시키기",
                            en: "Teach this memory to selected CLI leaders",
                            ja: "選択したCLI代表にこのメモリを学習させる",
                            zh: "让所选 CLI 代表学习此记忆",
                          })
                    }
                  >
                    {learnedProviders.length > 0
                      ? t({ ko: "학습됨", en: "Learned", ja: "学習済み", zh: "已学习" })
                      : t({ ko: "학습", en: "Learn", ja: "学習", zh: "学习" })}
                  </button>
                  <button
                    onClick={() => handleCopy(entry)}
                    className="px-2 py-1 text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-600/30 transition-all"
                    title={entry.content.slice(0, 80)}
                  >
                    {copiedEntryId === entry.id
                      ? t({ ko: "\uBCF5\uC0AC\uB428", en: "Copied", ja: "\u30B3\u30D4\u30FC\u6E08\u307F", zh: "\u5DF2\u590D\u5236" })
                      : t({ ko: "\uBCF5\uC0AC", en: "Copy", ja: "\u30B3\u30D4\u30FC", zh: "\u590D\u5236" })}
                  </button>
                </div>
              </div>
            </div>

            {/* Hover overlay: toggle + edit + delete */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onToggle(entry.id)}
                className={`px-1.5 py-0.5 text-[10px] rounded-md border transition-all ${
                  entry.enabled
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-slate-700/40 text-slate-400 border-slate-600/30 hover:bg-slate-700/60"
                }`}
                title={entry.enabled
                  ? t({ ko: "\uBE44\uD65C\uC131\uD654", en: "Disable", ja: "\u7121\u52B9\u5316", zh: "\u7981\u7528" })
                  : t({ ko: "\uD65C\uC131\uD654", en: "Enable", ja: "\u6709\u52B9\u5316", zh: "\u542F\u7528" })}
              >
                {entry.enabled
                  ? t({ ko: "ON", en: "ON", ja: "ON", zh: "ON" })
                  : t({ ko: "OFF", en: "OFF", ja: "OFF", zh: "OFF" })}
              </button>
              <button
                onClick={() => onEdit(entry)}
                className="px-1.5 py-0.5 text-[10px] bg-blue-600/15 text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-600/25 transition-all"
              >
                {t({ ko: "\uC218\uC815", en: "Edit", ja: "\u7DE8\u96C6", zh: "\u7F16\u8F91" })}
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="px-1.5 py-0.5 text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-md hover:bg-rose-500/20 transition-all"
              >
                {t({ ko: "\uC0AD\uC81C", en: "Del", ja: "\u524A\u9664", zh: "\u5220" })}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
