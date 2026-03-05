import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableLearnedRules,
  getRuleLearningHistory,
  unlearnRule,
  type LearnedRuleEntry,
  type RuleHistoryProvider,
  type RuleLearningHistoryEntry,
} from "../../api/agent-rules";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  RULE_LEARNED_PROVIDER_ORDER,
  ruleProviderLabel,
  ruleStatusLabel,
  ruleStatusClass,
  ruleRelativeTime,
  ruleLearningRowKey,
  pickRepresentativeForProvider,
  type TFunction,
  type UnlearnEffect,
} from "./model";

const HISTORY_PREVIEW_COUNT = 3;

interface RuleHistoryPanelProps {
  t: TFunction;
  agents: Agent[];
  refreshToken?: number;
  className?: string;
  onLearningDataChanged?: () => void;
  /** 학습 성공 직후 표시할 낙관적 이력 행 (서버 refetch 전) */
  optimisticHistoryRows?: RuleLearningHistoryEntry[];
}

export default function RuleHistoryPanel({
  t,
  agents,
  refreshToken = 0,
  className = "",
  onLearningDataChanged,
  optimisticHistoryRows = [],
}: RuleHistoryPanelProps) {
  const [tab, setTab] = useState<"history" | "available">("history");
  const [providerFilter, setProviderFilter] = useState<"all" | RuleHistoryProvider>("all");
  const [historyRows, setHistoryRows] = useState<RuleLearningHistoryEntry[]>([]);
  const [availableRows, setAvailableRows] = useState<LearnedRuleEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningKeys, setUnlearningKeys] = useState<string[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<string, UnlearnEffect>>>({});
  const [centerBonk, setCenterBonk] = useState<{
    provider: RuleHistoryProvider;
    agent: Agent | null;
  } | null>(null);
  const unlearnEffectTimersRef = useRef<Partial<Record<string, number>>>({});
  const centerBonkTimerRef = useRef<number | null>(null);

  const representatives = useMemo(() => {
    const out = new Map<RuleHistoryProvider, Agent | null>();
    for (const provider of RULE_LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  const activeProviders = useMemo(() => {
    const fromRows = new Set<RuleHistoryProvider>();
    for (const row of historyRows) fromRows.add(row.provider);
    for (const row of availableRows) fromRows.add(row.provider);
    for (const provider of RULE_LEARNED_PROVIDER_ORDER) {
      if (representatives.get(provider)) {
        fromRows.add(provider);
      }
    }
    return RULE_LEARNED_PROVIDER_ORDER.filter((provider) => fromRows.has(provider));
  }, [availableRows, historyRows, representatives]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = providerFilter === "all" ? undefined : providerFilter;
      const [historyData, availableData] = await Promise.all([
        getRuleLearningHistory({ provider, limit: 80 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return { history: [] as RuleLearningHistoryEntry[], retentionDays: 180 };
          throw err;
        }),
        getAvailableLearnedRules({ provider, limit: 30 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return [] as LearnedRuleEntry[];
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

  function triggerUnlearnEffect(rowKey: string, provider: RuleHistoryProvider) {
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

  async function handleUnlearn(row: { provider: RuleHistoryProvider; rule_id: string }) {
    const rowKey = ruleLearningRowKey(row);
    if (unlearningKeys.includes(rowKey)) return;
    setUnlearnError(null);
    setUnlearningKeys((prev) => [...prev, rowKey]);
    try {
      const result = await unlearnRule({
        provider: row.provider,
        ruleId: row.rule_id,
      });
      if (result.removed > 0) {
        setAvailableRows((prev) => prev.filter((item) => ruleLearningRowKey(item) !== rowKey));
        setHistoryRows((prev) =>
          prev.filter(
            (item) =>
              !(item.provider === row.provider && item.rule_id === row.rule_id && item.status === "succeeded"),
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

  const displayHistoryRows = useMemo(() => {
    const optKeys = new Set(optimisticHistoryRows.map((r) => `${r.job_id}:${r.provider}`));
    const fromApi = historyRows.filter((r) => !optKeys.has(`${r.job_id}:${r.provider}`));
    return [...optimisticHistoryRows, ...fromApi];
  }, [optimisticHistoryRows, historyRows]);

  const visibleHistoryRows = useMemo(() => {
    if (historyExpanded) return displayHistoryRows;
    return displayHistoryRows.slice(0, HISTORY_PREVIEW_COUNT);
  }, [historyExpanded, displayHistoryRows]);

  const hiddenHistoryCount = Math.max(0, displayHistoryRows.length - HISTORY_PREVIEW_COUNT);

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
            {t({ ko: "학습 이력", en: "Learning History", ja: "学習履歴", zh: "学习记录" })}
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
            {t({ ko: "사용 가능한 룰", en: "Available Rules", ja: "利用可能なルール", zh: "可用规则" })}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-600 px-2 py-1 text-[11px] text-slate-300 transition-all hover:bg-slate-800"
        >
          {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
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
            {ruleProviderLabel(provider)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {loading && historyRows.length === 0 && availableRows.length === 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "메모리 기록 로딩중...", en: "Loading memory records...", ja: "メモリ記録を読み込み中...", zh: "正在加载记忆记录..." })}
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

        {tab === "history" && displayHistoryRows.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "학습 이력이 없습니다", en: "No learning history yet.", ja: "学習履歴がありません", zh: "暂无学习记录" })}
          </div>
        )}

        {tab === "history" &&
          visibleHistoryRows.map((row) => {
            const agent = representatives.get(row.provider) ?? null;
            const label = row.rule_label || row.rule_id;
            const eventAt = row.run_completed_at ?? row.updated_at ?? row.created_at;
            const rowKey = ruleLearningRowKey(row);
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
                    <div className="mt-0.5 truncate text-[10px] text-slate-500">{row.rule_id}</div>
                  </div>
                  <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${ruleStatusClass(row.status)}`}>
                    {ruleStatusLabel(row.status)}
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
                      {ruleProviderLabel(row.provider)}
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
                          ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                          : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                      </button>
                    )}
                    <span className="skill-history-time text-slate-500">{ruleRelativeTime(eventAt)}</span>
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
                ? t({ ko: "접기", en: "Show less", ja: "折りたたむ", zh: "收起" })
                : t({
                    ko: `${hiddenHistoryCount}개 더 보기`,
                    en: `Show ${hiddenHistoryCount} more`,
                    ja: `${hiddenHistoryCount}件表示`,
                    zh: `显示${hiddenHistoryCount}更多`,
                  })}
            </button>
          </div>
        )}

        {tab === "available" && availableRows.length === 0 && !loading && !error && (
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-6 text-center text-xs text-slate-400">
            {t({ ko: "사용 가능한 룰이 없습니다", en: "No available rules.", ja: "利用可能なルールがありません", zh: "暂无可用规则" })}
          </div>
        )}

        {tab === "available" &&
          availableRows.map((row) => {
            const agent = representatives.get(row.provider) ?? null;
            const label = row.rule_label || row.rule_id;
            const rowKey = ruleLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            return (
              <div
                key={`${row.provider}-${row.rule_id}`}
                className="skill-history-card rounded-lg border border-slate-700/70 bg-slate-800/50 p-2.5"
              >
                <div className="truncate text-xs font-semibold text-slate-100">{label}</div>
                <div className="mt-0.5 truncate text-[10px] text-slate-500">{row.rule_id}</div>
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
                      {ruleProviderLabel(row.provider)}
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
                        ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                        : t({ ko: "학습 취소", en: "Unlearn", ja: "学습取消", zh: "取消学习" })}
                    </button>
                    <span className="skill-history-time text-slate-500">{ruleRelativeTime(row.learned_at)}</span>
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
              {ruleProviderLabel(centerBonk.provider)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
