import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableLearnedMemories,
  getMemoryLearningHistory,
  unlearnMemory,
  type LearnedMemoryEntry,
  type MemoryHistoryProvider,
  type MemoryLearningHistoryEntry,
} from "../../api/memory";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  MEMORY_LEARNED_PROVIDER_ORDER,
  memoryProviderLabel,
  memoryStatusLabel,
  memoryStatusClass,
  memoryRelativeTime,
  memoryLearningRowKey,
  pickRepresentativeForProvider,
  type TFunction,
  type UnlearnEffect,
} from "./model";

const HISTORY_PREVIEW_COUNT = 3;

interface MemoryHistoryPanelProps {
  t: TFunction;
  agents: Agent[];
  refreshToken?: number;
  className?: string;
  onLearningDataChanged?: () => void;
}

export default function MemoryHistoryPanel({
  t,
  agents,
  refreshToken = 0,
  className = "",
  onLearningDataChanged,
}: MemoryHistoryPanelProps) {
  const [tab, setTab] = useState<"history" | "available">("history");
  const [providerFilter, setProviderFilter] = useState<"all" | MemoryHistoryProvider>("all");
  const [historyRows, setHistoryRows] = useState<MemoryLearningHistoryEntry[]>([]);
  const [availableRows, setAvailableRows] = useState<LearnedMemoryEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningKeys, setUnlearningKeys] = useState<string[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<string, UnlearnEffect>>>({});
  const [centerBonk, setCenterBonk] = useState<{
    provider: MemoryHistoryProvider;
    agent: Agent | null;
  } | null>(null);
  const unlearnEffectTimersRef = useRef<Partial<Record<string, number>>>({});
  const centerBonkTimerRef = useRef<number | null>(null);

  const representatives = useMemo(() => {
    const out = new Map<MemoryHistoryProvider, Agent | null>();
    for (const provider of MEMORY_LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  const activeProviders = useMemo(() => {
    const fromRows = new Set<MemoryHistoryProvider>();
    for (const row of historyRows) fromRows.add(row.provider);
    for (const row of availableRows) fromRows.add(row.provider);
    for (const provider of MEMORY_LEARNED_PROVIDER_ORDER) {
      if (representatives.get(provider)) {
        fromRows.add(provider);
      }
    }
    return MEMORY_LEARNED_PROVIDER_ORDER.filter((provider) => fromRows.has(provider));
  }, [availableRows, historyRows, representatives]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = providerFilter === "all" ? undefined : providerFilter;
      const [historyData, availableData] = await Promise.all([
        getMemoryLearningHistory({ provider, limit: 80 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return { history: [] as MemoryLearningHistoryEntry[], retentionDays: 180 };
          throw err;
        }),
        getAvailableLearnedMemories({ provider, limit: 30 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return [] as LearnedMemoryEntry[];
          throw err;
        }),
      ]);
      setHistoryRows(historyData.history);
      setAvailableRows(availableData);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [providerFilter]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    setHistoryExpanded(false);
  }, [providerFilter, tab]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(unlearnEffectTimersRef.current)) {
        if (typeof timerId === "number") window.clearTimeout(timerId);
      }
      if (typeof centerBonkTimerRef.current === "number") {
        window.clearTimeout(centerBonkTimerRef.current);
      }
    };
  }, []);

  function triggerUnlearnEffect(rowKey: string, provider: MemoryHistoryProvider) {
    const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
    setUnlearnEffects((prev) => ({ ...prev, [rowKey]: effect }));
    setCenterBonk({
      provider,
      agent: representatives.get(provider) ?? null,
    });
    if (typeof centerBonkTimerRef.current === "number") {
      window.clearTimeout(centerBonkTimerRef.current);
    }
    centerBonkTimerRef.current = window.setTimeout(() => {
      setCenterBonk(null);
      centerBonkTimerRef.current = null;
    }, 950);
    const existingTimer = unlearnEffectTimersRef.current[rowKey];
    if (typeof existingTimer === "number") {
      window.clearTimeout(existingTimer);
    }
    unlearnEffectTimersRef.current[rowKey] = window.setTimeout(() => {
      setUnlearnEffects((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
      delete unlearnEffectTimersRef.current[rowKey];
    }, 1100);
  }

  async function handleUnlearn(row: { provider: MemoryHistoryProvider; memory_id: string }) {
    const rowKey = memoryLearningRowKey(row);
    if (unlearningKeys.includes(rowKey)) return;
    setUnlearnError(null);
    setUnlearningKeys((prev) => [...prev, rowKey]);
    try {
      const result = await unlearnMemory({
        provider: row.provider,
        memoryId: row.memory_id,
      });
      if (result.removed > 0) {
        setAvailableRows((prev) => prev.filter((item) => memoryLearningRowKey(item) !== rowKey));
        setHistoryRows((prev) =>
          prev.filter(
            (item) =>
              !(item.provider === row.provider && item.memory_id === row.memory_id && item.status === "succeeded"),
          ),
        );
        triggerUnlearnEffect(rowKey, row.provider);
      }
      onLearningDataChanged?.();
      void load();
    } catch (e) {
      setUnlearnError(e instanceof Error ? e.message : String(e));
    } finally {
      setUnlearningKeys((prev) => prev.filter((key) => key !== rowKey));
    }
  }

  const visibleHistoryRows = useMemo(() => {
    if (historyExpanded) return historyRows;
    return historyRows.slice(0, HISTORY_PREVIEW_COUNT);
  }, [historyExpanded, historyRows]);

  const hiddenHistoryCount = Math.max(0, historyRows.length - HISTORY_PREVIEW_COUNT);

  return (
    <div
      className={`skill-history-panel flex h-full min-h-[360px] flex-col rounded-xl border border-slate-700/60 bg-slate-900/60 ${className}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
              tab === "history"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
            }`}
          >
            {t({ ko: "\uD559\uC2B5 \uC774\uB825", en: "Learning History", ja: "\u5B66\u7FD2\u5C65\u6B74", zh: "\u5B66\u4E60\u8BB0\u5F55" })}
          </button>
          <button
            type="button"
            onClick={() => setTab("available")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
              tab === "available"
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
            }`}
          >
            {t({ ko: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBA54\uBAA8\uB9AC", en: "Available Memories", ja: "\u5229\u7528\u53EF\u80FD\u306A\u30E1\u30E2\u30EA", zh: "\u53EF\u7528\u8BB0\u5FC6" })}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 transition-all hover:bg-slate-800"
        >
          {t({ ko: "\uC0C8\uB85C\uACE0\uCE68", en: "Refresh", ja: "\u66F4\u65B0", zh: "\u5237\u65B0" })}
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        <button
          type="button"
          onClick={() => setProviderFilter("all")}
          className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
            providerFilter === "all"
              ? "border-blue-500/50 bg-blue-600/20 text-blue-300"
              : "border-slate-700 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
          }`}
        >
          All
        </button>
        {activeProviders.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => setProviderFilter(provider)}
            className={`rounded-md border px-2 py-1 text-[10px] transition-all ${
              providerFilter === provider
                ? "border-blue-500/50 bg-blue-600/20 text-blue-300"
                : "border-slate-700 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
            }`}
          >
            {memoryProviderLabel(provider)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {loading && historyRows.length === 0 && availableRows.length === 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "\uBA54\uBAA8\uB9AC \uAE30\uB85D \uB85C\uB529\uC911...", en: "Loading memory records...", ja: "\u30E1\u30E2\u30EA\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...", zh: "\u6B63\u5728\u52A0\u8F7D\u8BB0\u5FC6\u8BB0\u5F55..." })}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {error}
          </div>
        )}
        {unlearnError && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {unlearnError}
          </div>
        )}

        {tab === "history" && historyRows.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "\uD559\uC2B5 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No learning history yet.", ja: "\u5B66\u7FD2\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093", zh: "\u6682\u65E0\u5B66\u4E60\u8BB0\u5F55" })}
          </div>
        )}

        {tab === "history" &&
          visibleHistoryRows.map((row) => {
            const agent = representatives.get(row.provider) ?? null;
            const label = row.memory_label || row.memory_id;
            const eventAt = row.run_completed_at ?? row.updated_at ?? row.created_at;
            const rowKey = memoryLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            const canUnlearn = row.status === "succeeded";
            return (
              <div
                key={row.id}
                className="skill-history-card rounded-lg border border-slate-700/70 bg-slate-800/50 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-100">{label}</div>
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{row.memory_id}</div>
                  </div>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${memoryStatusClass(row.status)}`}>
                    {memoryStatusLabel(row.status)}
                  </span>
                </div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`relative h-5 w-5 overflow-hidden rounded-md bg-slate-800/80 ${unlearnEffect ? "unlearn-avatar-hit" : ""}`}
                    >
                      <AgentAvatar agent={agent ?? undefined} agents={agents} size={20} rounded="xl" />
                      {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm">🪴</span>}
                      {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm">🔨</span>}
                      {unlearnEffect && <span className="unlearn-hit-text-sm">Bonk!</span>}
                    </div>
                    <span className="truncate">
                      {memoryProviderLabel(row.provider)}
                      {agent ? ` · ${agent.name}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canUnlearn && (
                      <button
                        type="button"
                        onClick={() => void handleUnlearn(row)}
                        disabled={isUnlearning}
                        className={`skill-unlearn-btn rounded-md border px-1.5 py-0.5 text-[10px] transition-all ${
                          isUnlearning
                            ? "cursor-not-allowed border-slate-700 text-slate-600"
                            : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        }`}
                      >
                        {isUnlearning
                          ? t({ ko: "\uCDE8\uC18C\uC911...", en: "Unlearning...", ja: "\u53D6\u6D88\u4E2D...", zh: "\u53D6\u6D88\u4E2D..." })
                          : t({ ko: "\uD559\uC2B5 \uCDE8\uC18C", en: "Unlearn", ja: "\u5B66\u7FD2\u53D6\u6D88", zh: "\u53D6\u6D88\u5B66\u4E60" })}
                      </button>
                    )}
                    <span className="skill-history-time text-slate-500">{memoryRelativeTime(eventAt)}</span>
                  </div>
                </div>
                {row.error && <div className="mt-1 break-words text-[10px] text-rose-300">{row.error}</div>}
              </div>
            );
          })}

        {tab === "history" && hiddenHistoryCount > 0 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setHistoryExpanded((prev) => !prev)}
              className="rounded-md border border-slate-600 px-2.5 py-1 text-[11px] text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              {historyExpanded
                ? t({ ko: "\uC811\uAE30", en: "Show less", ja: "\u6298\u308A\u305F\u305F\u3080", zh: "\u6536\u8D77" })
                : t({
                    ko: `${hiddenHistoryCount}\uAC1C \uB354 \uBCF4\uAE30`,
                    en: `Show ${hiddenHistoryCount} more`,
                    ja: `${hiddenHistoryCount}\u4EF6\u8868\u793A`,
                    zh: `\u663E\u793A${hiddenHistoryCount}\u66F4\u591A`,
                  })}
            </button>
          </div>
        )}

        {tab === "available" && availableRows.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uBA54\uBAA8\uB9AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4", en: "No available memories.", ja: "\u5229\u7528\u53EF\u80FD\u306A\u30E1\u30E2\u30EA\u304C\u3042\u308A\u307E\u305B\u3093", zh: "\u6682\u65E0\u53EF\u7528\u8BB0\u5FC6" })}
          </div>
        )}

        {tab === "available" &&
          availableRows.map((row) => {
            const agent = representatives.get(row.provider) ?? null;
            const label = row.memory_label || row.memory_id;
            const rowKey = memoryLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            return (
              <div
                key={`${row.provider}-${row.memory_id}`}
                className="skill-history-card rounded-lg border border-slate-700/70 bg-slate-800/50 p-2.5"
              >
                <div className="truncate text-xs font-semibold text-slate-100">{label}</div>
                <div className="mt-0.5 truncate text-[10px] text-slate-500">{row.memory_id}</div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`relative h-5 w-5 overflow-hidden rounded-md bg-slate-800/80 ${unlearnEffect ? "unlearn-avatar-hit" : ""}`}
                    >
                      <AgentAvatar agent={agent ?? undefined} agents={agents} size={20} rounded="xl" />
                      {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm">🪴</span>}
                      {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm">🔨</span>}
                      {unlearnEffect && <span className="unlearn-hit-text-sm">Bonk!</span>}
                    </div>
                    <span className="truncate">
                      {memoryProviderLabel(row.provider)}
                      {agent ? ` · ${agent.name}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUnlearn(row)}
                      disabled={isUnlearning}
                      className={`skill-unlearn-btn rounded-md border px-1.5 py-0.5 text-[10px] transition-all ${
                        isUnlearning
                          ? "cursor-not-allowed border-slate-700 text-slate-600"
                          : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {isUnlearning
                        ? t({ ko: "\uCDE8\uC18C\uC911...", en: "Unlearning...", ja: "\u53D6\u6D88\u4E2D...", zh: "\u53D6\u6D88\u4E2D..." })
                        : t({ ko: "\uD559\uC2B5 \uCDE8\uC18C", en: "Unlearn", ja: "\u5B66\u7FD2\u53D6\u6D88", zh: "\u53D6\u6D88\u5B66\u4E60" })}
                    </button>
                    <span className="skill-history-time text-slate-500">{memoryRelativeTime(row.learned_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {centerBonk && (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
          <div className="skill-history-center-card unlearn-center-card rounded-2xl border border-rose-400/30 bg-slate-900/90 px-6 py-4 shadow-2xl shadow-black/50 backdrop-blur-sm">
            <div className="relative mx-auto h-20 w-20 overflow-visible">
              <div className="unlearn-avatar-hit">
                <AgentAvatar agent={centerBonk.agent ?? undefined} agents={agents} size={80} rounded="xl" />
              </div>
              <span className="unlearn-hammer-swing-center">🔨</span>
              <span className="unlearn-hit-text-center">Bonk!</span>
            </div>
            <div className="skill-history-center-label mt-2 text-center text-xs font-medium text-rose-100">
              {memoryProviderLabel(centerBonk.provider)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
