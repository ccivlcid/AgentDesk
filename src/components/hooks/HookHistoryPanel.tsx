import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableLearnedHooks,
  getHookLearningHistory,
  unlearnHook,
  type LearnedHookEntry,
  type HookHistoryProvider,
  type HookLearningHistoryEntry,
} from "../../api/hooks";
import type { Agent } from "../../types";
import AgentAvatar from "../AgentAvatar";
import {
  HOOK_LEARNED_PROVIDER_ORDER,
  hookProviderLabel,
  hookStatusLabel,
  hookStatusClass,
  hookRelativeTime,
  hookLearningRowKey,
  type TFunction,
  type UnlearnEffect,
} from "./model";

const HISTORY_PREVIEW_COUNT = 3;

interface HookHistoryPanelProps {
  t: TFunction;
  localeTag?: string;
  agents: Agent[];
  refreshToken?: number;
  className?: string;
  onLearningDataChanged?: () => void;
}

export default function HookHistoryPanel({
  t,
  localeTag = "en",
  agents,
  refreshToken = 0,
  className = "",
  onLearningDataChanged,
}: HookHistoryPanelProps) {
  const [tab, setTab] = useState<"history" | "available">("history");
  const [agentFilters, setAgentFilters] = useState<Set<string>>(new Set());
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [historyRows, setHistoryRows] = useState<HookLearningHistoryEntry[]>([]);
  const [availableRows, setAvailableRows] = useState<LearnedHookEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningKeys, setUnlearningKeys] = useState<string[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<string, UnlearnEffect>>>({});
  const [centerBonk, setCenterBonk] = useState<{
    provider: HookHistoryProvider;
    agents: Agent[];
  } | null>(null);
  const unlearnEffectTimersRef = useRef<Partial<Record<string, number>>>({});
  const centerBonkTimerRef = useRef<number | null>(null);

  function agentDisplayName(agent: Agent | null): string {
    if (!agent) return "";
    if (localeTag.startsWith("ko") && agent.name_ko) return agent.name_ko;
    if (localeTag.startsWith("ja") && agent.name_ja) return agent.name_ja;
    if (localeTag.startsWith("zh") && agent.name_zh) return agent.name_zh;
    return agent.name;
  }

  const agentsByProvider = useMemo(() => {
    const out = new Map<HookHistoryProvider, Agent[]>();
    for (const provider of HOOK_LEARNED_PROVIDER_ORDER) {
      out.set(provider, agents.filter((a) => a.cli_provider === provider));
    }
    return out;
  }, [agents]);

  const selectedProviderSet = useMemo(() => {
    if (agentFilters.size === 0) return null;
    const providers = new Set<HookHistoryProvider>();
    for (const agentId of agentFilters) {
      const agent = agents.find((a) => a.id === agentId);
      if (agent?.cli_provider) providers.add(agent.cli_provider as HookHistoryProvider);
    }
    return providers;
  }, [agentFilters, agents]);

  const filteredHistoryRows = useMemo(() => {
    if (!selectedProviderSet) return historyRows;
    return historyRows.filter((row) => selectedProviderSet.has(row.provider));
  }, [historyRows, selectedProviderSet]);

  const filteredAvailableRows = useMemo(() => {
    if (!selectedProviderSet) return availableRows;
    return availableRows.filter((row) => selectedProviderSet.has(row.provider));
  }, [availableRows, selectedProviderSet]);

  useEffect(() => {
    if (!filterDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterDropdownOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, availableData] = await Promise.all([
        getHookLearningHistory({ limit: 80 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return { history: [] as HookLearningHistoryEntry[], retentionDays: 180 };
          throw err;
        }),
        getAvailableLearnedHooks({ limit: 30 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return [] as LearnedHookEntry[];
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
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    setHistoryExpanded(false);
  }, [agentFilters, tab]);

  useEffect(() => {
    const timers = unlearnEffectTimersRef.current;
    return () => {
      for (const timerId of Object.values(timers)) {
        if (typeof timerId === "number") window.clearTimeout(timerId);
      }
      if (typeof centerBonkTimerRef.current === "number") {
        window.clearTimeout(centerBonkTimerRef.current);
      }
    };
  }, []);

  function triggerUnlearnEffect(rowKey: string, provider: HookHistoryProvider) {
    const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
    setUnlearnEffects((prev) => ({ ...prev, [rowKey]: effect }));
    setCenterBonk({ provider, agents: agentsByProvider.get(provider) ?? [] });
    if (typeof centerBonkTimerRef.current === "number") {
      window.clearTimeout(centerBonkTimerRef.current);
    }
    centerBonkTimerRef.current = window.setTimeout(() => {
      setCenterBonk(null);
      centerBonkTimerRef.current = null;
    }, 950);
    const existingTimer = unlearnEffectTimersRef.current[rowKey];
    if (typeof existingTimer === "number") window.clearTimeout(existingTimer);
    unlearnEffectTimersRef.current[rowKey] = window.setTimeout(() => {
      setUnlearnEffects((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
      delete unlearnEffectTimersRef.current[rowKey];
    }, 1100);
  }

  async function handleUnlearn(row: { provider: HookHistoryProvider; hook_id: string }) {
    const rowKey = hookLearningRowKey(row);
    if (unlearningKeys.includes(rowKey)) return;
    setUnlearnError(null);
    setUnlearningKeys((prev) => [...prev, rowKey]);
    try {
      const result = await unlearnHook({ provider: row.provider, hookId: row.hook_id });
      if (result.removed > 0) {
        setAvailableRows((prev) => prev.filter((item) => hookLearningRowKey(item) !== rowKey));
        setHistoryRows((prev) =>
          prev.filter((item) => !(item.provider === row.provider && item.hook_id === row.hook_id && item.status === "succeeded")),
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
    if (historyExpanded) return filteredHistoryRows;
    return filteredHistoryRows.slice(0, HISTORY_PREVIEW_COUNT);
  }, [historyExpanded, filteredHistoryRows]);

  const hiddenHistoryCount = Math.max(0, filteredHistoryRows.length - HISTORY_PREVIEW_COUNT);

  const activeAgents = useMemo(() => {
    const providerSet = new Set<HookHistoryProvider>();
    for (const row of historyRows) providerSet.add(row.provider);
    for (const row of availableRows) providerSet.add(row.provider);
    const result: Agent[] = [];
    const seen = new Set<string>();
    for (const agent of agents) {
      if (agent.cli_provider && providerSet.has(agent.cli_provider as HookHistoryProvider) && !seen.has(agent.id)) {
        seen.add(agent.id);
        result.push(agent);
      }
    }
    return result;
  }, [agents, historyRows, availableRows]);

  const filterLabel = useMemo(() => {
    if (agentFilters.size === 0) return t({ ko: "전체 에이전트", en: "All agents", ja: "全エージェント", zh: "所有代理" });
    if (agentFilters.size === 1) {
      const agent = agents.find((a) => a.id === [...agentFilters][0]);
      return agent ? agentDisplayName(agent) : t({ ko: "1명 선택", en: "1 selected", ja: "1人選択", zh: "已选1个" });
    }
    return t({ ko: `${agentFilters.size}명 선택`, en: `${agentFilters.size} selected`, ja: `${agentFilters.size}人選択`, zh: `已选${agentFilters.size}个` });
  }, [agentFilters, agents, localeTag]);

  function toggleAgentFilter(agentId: string) {
    setAgentFilters((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }

  function renderAvatarGroup(rowAgents: Agent[], rowKey: string) {
    const unlearnEffect = unlearnEffects[rowKey];
    const shown = rowAgents.slice(0, 5);
    const extra = rowAgents.length - shown.length;
    return (
      <div className="flex items-center gap-0.5">
        {shown.map((a, i) => (
          <div
            key={a.id}
            className={`relative h-5 w-5 overflow-hidden ${i === 0 && unlearnEffect ? "unlearn-avatar-hit" : ""}`}
            style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}
          >
            <AgentAvatar agent={a} agents={agents} size={20} rounded="xl" />
            {i === 0 && unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm">🪴</span>}
            {i === 0 && unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm">🔨</span>}
            {i === 0 && unlearnEffect && (
              <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>
            )}
          </div>
        ))}
        {extra > 0 && (
          <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>+{extra}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`skill-history-panel flex h-full min-h-[360px] flex-col ${className}`}
      style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)" }}
    >
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab("history")}
            className="px-2 py-1 text-[11px] font-mono transition-all"
            style={{
              borderRadius: 0,
              border: `1px solid ${tab === "history" ? "var(--th-border-strong)" : "transparent"}`,
              background: tab === "history" ? "var(--th-bg-surface)" : "transparent",
              color: tab === "history" ? "var(--th-text-primary)" : "var(--th-text-muted)",
            }}
          >
            {t({ ko: "학습 이력", en: "Learning History", ja: "学習履歴", zh: "学习记录" })}
          </button>
          <button
            type="button"
            onClick={() => setTab("available")}
            className="px-2 py-1 text-[11px] font-mono transition-all"
            style={{
              borderRadius: 0,
              border: `1px solid ${tab === "available" ? "var(--th-border-strong)" : "transparent"}`,
              background: tab === "available" ? "var(--th-bg-surface)" : "transparent",
              color: tab === "available" ? "var(--th-text-primary)" : "var(--th-text-muted)",
            }}
          >
            {t({ ko: "사용 가능한 훅", en: "Available Hooks", ja: "利用可能なフック", zh: "可用钩子" })}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-2 py-1 text-[11px] font-mono transition-all"
          style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
        >
          {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        </button>
      </div>

      {/* Agent multi-select filter dropdown */}
      <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--th-border)" }}>
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setFilterDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 text-[11px] font-mono transition-all"
            style={{
              borderRadius: 0,
              border: `1px solid ${agentFilters.size > 0 ? "rgba(251,191,36,0.5)" : "var(--th-border)"}`,
              background: agentFilters.size > 0 ? "rgba(251,191,36,0.08)" : "transparent",
              color: agentFilters.size > 0 ? "var(--th-accent)" : "var(--th-text-muted)",
              minWidth: 140,
            }}
          >
            <span className="flex-1 text-left truncate">{filterLabel}</span>
            <span style={{ fontSize: 9, opacity: 0.6, display: "inline-flex", color: "inherit" }}>
              {filterDropdownOpen ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="6 15 12 9 18 15" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </span>
          </button>

          {filterDropdownOpen && (
            <div
              className="absolute left-0 z-50 min-w-[200px] py-1"
              style={{
                top: "calc(100% + 4px)",
                borderRadius: 0,
                border: "1px solid var(--th-border)",
                background: "var(--th-bg-elevated)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              <button
                type="button"
                onClick={() => { setAgentFilters(new Set()); setFilterDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-all text-left"
                style={{
                  background: agentFilters.size === 0 ? "rgba(251,191,36,0.08)" : "transparent",
                  color: agentFilters.size === 0 ? "var(--th-accent)" : "var(--th-text-secondary)",
                }}
              >
                <span className="w-3 h-3 inline-flex items-center justify-center text-[9px]">
                  {agentFilters.size === 0 ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </span>
                {t({ ko: "전체 에이전트", en: "All agents", ja: "全エージェント", zh: "所有代理" })}
              </button>
              {activeAgents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAgentFilter(agent.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-all text-left"
                  style={{
                    background: agentFilters.has(agent.id) ? "rgba(251,191,36,0.08)" : "transparent",
                    color: agentFilters.has(agent.id) ? "var(--th-accent)" : "var(--th-text-secondary)",
                  }}
                >
                  <span className="w-3 h-3 inline-flex items-center justify-center text-[9px]">
                    {agentFilters.has(agent.id) ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="h-4 w-4 overflow-hidden shrink-0" style={{ borderRadius: 0 }}>
                    <AgentAvatar agent={agent} agents={agents} size={16} rounded="xl" />
                  </span>
                  <span className="truncate">{agentDisplayName(agent)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3 pt-2">
        {loading && historyRows.length === 0 && availableRows.length === 0 && (
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "훅 기록 로딩중...", en: "Loading hook records...", ja: "フック記録を読み込み中...", zh: "正在加载钩子记录..." })}
          </div>
        )}

        {error && (
          <div className="px-3 py-2 text-[11px] text-rose-200" style={{ borderRadius: 0, border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.1)" }}>
            {error}
          </div>
        )}
        {unlearnError && (
          <div className="px-3 py-2 text-[11px] text-rose-200" style={{ borderRadius: 0, border: "1px solid rgba(244,63,94,0.3)", background: "rgba(244,63,94,0.1)" }}>
            {unlearnError}
          </div>
        )}

        {tab === "history" && filteredHistoryRows.length === 0 && !loading && !error && (
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "학습 이력이 없습니다", en: "No learning history yet.", ja: "学習履歴がありません", zh: "暂无学习记录" })}
          </div>
        )}

        {tab === "history" &&
          visibleHistoryRows.map((row) => {
            const rowAgents = agentsByProvider.get(row.provider) ?? [];
            const label = row.hook_label || row.hook_id;
            const eventAt = row.run_completed_at ?? row.updated_at ?? row.created_at;
            const rowKey = hookLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const canUnlearn = row.status === "succeeded";
            return (
              <div
                key={row.id}
                className="skill-history-card p-2.5"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{label}</div>
                    <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.hook_id}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono ${hookStatusClass(row.status)}`} style={{ borderRadius: 0 }}>
                    {hookStatusLabel(row.status, t)}
                  </span>
                </div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  <div className="flex min-w-0 items-center gap-2">
                    {renderAvatarGroup(rowAgents, rowKey)}
                    <span className="truncate">
                      {hookProviderLabel(row.provider)}
                      {rowAgents.length === 1 ? ` · ${agentDisplayName(rowAgents[0])}` : rowAgents.length > 1 ? ` · ${rowAgents.length}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canUnlearn && (
                      <button
                        type="button"
                        onClick={() => void handleUnlearn(row)}
                        disabled={isUnlearning}
                        className={`skill-unlearn-btn px-1.5 py-0.5 text-[10px] font-mono transition-all ${isUnlearning ? "cursor-not-allowed" : ""}`}
                        style={{
                          borderRadius: 0,
                          border: `1px solid ${isUnlearning ? "rgba(51,65,85,1)" : "rgba(244,63,94,0.35)"}`,
                          color: isUnlearning ? "var(--th-text-muted)" : "rgb(253,164,175)",
                          background: isUnlearning ? "transparent" : "rgba(244,63,94,0.1)",
                        }}
                      >
                        {isUnlearning
                          ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                          : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                      </button>
                    )}
                    <span className="skill-history-time" style={{ color: "var(--th-text-muted)" }}>{hookRelativeTime(eventAt, localeTag)}</span>
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
              className="px-2.5 py-1 text-[11px] font-mono transition-all"
              style={{ borderRadius: 0, border: "1px solid var(--th-border)", color: "var(--th-text-secondary)", background: "transparent" }}
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

        {tab === "available" && filteredAvailableRows.length === 0 && !loading && !error && (
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "사용 가능한 훅이 없습니다", en: "No available hooks.", ja: "利用可能なフックがありません", zh: "暂无可用钩子" })}
          </div>
        )}

        {tab === "available" &&
          filteredAvailableRows.map((row) => {
            const rowAgents = agentsByProvider.get(row.provider) ?? [];
            const label = row.hook_label || row.hook_id;
            const rowKey = hookLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            return (
              <div
                key={`${row.provider}-${row.hook_id}`}
                className="skill-history-card p-2.5"
                style={{ borderRadius: 0, border: "1px solid var(--th-border)", background: "var(--th-bg-surface)" }}
              >
                <div className="truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-heading)" }}>{label}</div>
                <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.hook_id}</div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {rowAgents.slice(0, 5).map((a, i) => (
                        <div
                          key={a.id}
                          className={`relative h-5 w-5 overflow-hidden ${i === 0 && unlearnEffect ? "unlearn-avatar-hit" : ""}`}
                          style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}
                        >
                          <AgentAvatar agent={a} agents={agents} size={20} rounded="xl" />
                          {i === 0 && unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm">🪴</span>}
                          {i === 0 && unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm">🔨</span>}
                          {i === 0 && unlearnEffect && (
                            <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>
                          )}
                        </div>
                      ))}
                      {rowAgents.length > 5 && (
                        <span className="text-[9px] font-mono" style={{ color: "var(--th-text-muted)" }}>+{rowAgents.length - 5}</span>
                      )}
                    </div>
                    <span className="truncate">
                      {hookProviderLabel(row.provider)}
                      {rowAgents.length === 1 ? ` · ${agentDisplayName(rowAgents[0])}` : rowAgents.length > 1 ? ` · ${rowAgents.length}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUnlearn(row)}
                      disabled={isUnlearning}
                      className={`skill-unlearn-btn px-1.5 py-0.5 text-[10px] font-mono transition-all ${isUnlearning ? "cursor-not-allowed" : ""}`}
                      style={{
                        borderRadius: 0,
                        border: `1px solid ${isUnlearning ? "rgba(51,65,85,1)" : "rgba(244,63,94,0.35)"}`,
                        color: isUnlearning ? "var(--th-text-muted)" : "rgb(253,164,175)",
                        background: isUnlearning ? "transparent" : "rgba(244,63,94,0.1)",
                      }}
                    >
                      {isUnlearning
                        ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                        : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                    </button>
                    <span className="skill-history-time" style={{ color: "var(--th-text-muted)" }}>{hookRelativeTime(row.learned_at, localeTag)}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {centerBonk && (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
          <div className="skill-history-center-card unlearn-center-card px-6 py-4" style={{ borderRadius: 0, border: "1px solid rgba(251,113,133,0.3)", background: "var(--th-terminal-bg)" }}>
            <div className="relative mx-auto h-20 w-20 overflow-visible">
              <div className="unlearn-avatar-hit">
                <AgentAvatar agent={centerBonk.agents[0] ?? undefined} agents={agents} size={80} rounded="xl" />
              </div>
              <span className="unlearn-hammer-swing-center">🔨</span>
              <span className="unlearn-hit-text-center">
                {t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}
              </span>
            </div>
            <div className="skill-history-center-label mt-2 text-center text-xs font-medium text-rose-100">
              {hookProviderLabel(centerBonk.provider)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
