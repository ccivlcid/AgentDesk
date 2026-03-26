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
  ruleProviderLabel,
  ruleStatusLabel,
  ruleStatusClass,
  ruleRelativeTime,
  ruleLearningRowKey,
  type TFunction,
  type UnlearnEffect,
} from "./model";

const HISTORY_PREVIEW_COUNT = 3;

interface RuleHistoryPanelProps {
  t: TFunction;
  localeTag?: string;
  agents: Agent[];
  refreshToken?: number;
  className?: string;
  onLearningDataChanged?: () => void;
  /** 학습 성공 직후 표시할 낙관적 이력 행 (서버 refetch 전) */
  optimisticHistoryRows?: RuleLearningHistoryEntry[];
}

export default function RuleHistoryPanel({
  t,
  localeTag = "en",
  agents,
  refreshToken = 0,
  className = "",
  onLearningDataChanged,
  optimisticHistoryRows = [],
}: RuleHistoryPanelProps) {
  const [tab, setTab] = useState<"history" | "available">("history");
  const [agentFilters, setAgentFilters] = useState<Set<string>>(new Set());
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
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
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  const agentsWithProvider = useMemo(() => agents.filter((a) => a.cli_provider), [agents]);

  const agentsByProvider = useMemo(() => {
    const out = new Map<RuleHistoryProvider, Agent[]>();
    for (const agent of agentsWithProvider) {
      const p = agent.cli_provider as RuleHistoryProvider;
      if (!out.has(p)) out.set(p, []);
      out.get(p)!.push(agent);
    }
    return out;
  }, [agentsWithProvider]);

  const selectedProviderSet = useMemo(() => {
    if (agentFilters.size === 0) return null;
    const providers = new Set<RuleHistoryProvider>();
    for (const agentId of agentFilters) {
      const agent = agents.find((a) => a.id === agentId);
      if (agent?.cli_provider) providers.add(agent.cli_provider as RuleHistoryProvider);
    }
    return providers;
  }, [agentFilters, agents]);

  function agentDisplayName(agent: Agent): string {
    if (localeTag.startsWith("ko")) return agent.name_ko || agent.name;
    if (localeTag.startsWith("ja")) return (agent as Agent & { name_ja?: string | null }).name_ja || agent.name;
    if (localeTag.startsWith("zh")) return (agent as Agent & { name_zh?: string | null }).name_zh || agent.name;
    return agent.name;
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyData, availableData] = await Promise.all([
        getRuleLearningHistory({ limit: 200 }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (/not_found|404/.test(msg)) return { history: [] as RuleLearningHistoryEntry[], retentionDays: 180 };
          throw err;
        }),
        getAvailableLearnedRules({ limit: 200 }).catch((err) => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    setHistoryExpanded(false);
  }, [tab]);

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

  useEffect(() => {
    if (!filterDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterDropdownOpen]);

  function toggleAgentFilter(agentId: string) {
    setAgentFilters((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
    setHistoryExpanded(false);
  }

  function clearAgentFilters() {
    setAgentFilters(new Set());
    setHistoryExpanded(false);
  }

  function triggerUnlearnEffect(rowKey: string, provider: RuleHistoryProvider) {
    const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
    setUnlearnEffects((prev) => ({ ...prev, [rowKey]: effect }));
    const providerAgents = agentsByProvider.get(provider) ?? [];
    setCenterBonk({
      provider,
      agent: providerAgents[0] ?? null,
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

  const filteredHistoryRows = useMemo(() => {
    const optKeys = new Set(optimisticHistoryRows.map((r) => `${r.job_id}:${r.provider}`));
    const fromApi = historyRows.filter((r) => !optKeys.has(`${r.job_id}:${r.provider}`));
    const all = [...optimisticHistoryRows, ...fromApi];
    if (!selectedProviderSet) return all;
    return all.filter((r) => selectedProviderSet.has(r.provider));
  }, [optimisticHistoryRows, historyRows, selectedProviderSet]);

  const filteredAvailableRows = useMemo(() => {
    if (!selectedProviderSet) return availableRows;
    return availableRows.filter((r) => selectedProviderSet.has(r.provider));
  }, [availableRows, selectedProviderSet]);

  const visibleHistoryRows = useMemo(() => {
    if (historyExpanded) return filteredHistoryRows;
    return filteredHistoryRows.slice(0, HISTORY_PREVIEW_COUNT);
  }, [historyExpanded, filteredHistoryRows]);

  const hiddenHistoryCount = Math.max(0, filteredHistoryRows.length - HISTORY_PREVIEW_COUNT);

  const filterLabel = agentFilters.size === 0
    ? t({ ko: "전체 에이전트", en: "All agents", ja: "全エージェント", zh: "全部代理" })
    : agentFilters.size === 1
      ? (() => { const a = agents.find((ag) => ag.id === [...agentFilters][0]); return a ? agentDisplayName(a) : t({ ko: "1명 선택", en: "1 selected", ja: "1名選択", zh: "已选1名" }); })()
      : t({ ko: `${agentFilters.size}명 선택`, en: `${agentFilters.size} selected`, ja: `${agentFilters.size}名選択`, zh: `已选${agentFilters.size}名` });

  return (
    <div
      className={`skill-history-panel flex h-full min-h-[360px] flex-col ${className}`}
      style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid #E5E7EB" }}>
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
            {t({ ko: "사용 가능한 룰", en: "Available Rules", ja: "利用可能なルール", zh: "可用规则" })}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-2 py-1 text-[11px] font-mono transition-all"
          style={{ borderRadius: 0, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
        >
          {t({ ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setFilterDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono transition-all"
            style={{
              borderRadius: 0,
              border: agentFilters.size > 0 ? "1px solid rgba(251,191,36,0.5)" : "1px solid #E5E7EB",
              background: agentFilters.size > 0 ? "rgba(251,191,36,0.08)" : "var(--th-bg-primary)",
              color: agentFilters.size > 0 ? "var(--th-accent)" : "var(--th-text-secondary)",
              minWidth: 130,
            }}
          >
            <span className="flex-1 text-left truncate">{filterLabel}</span>
            <span style={{ fontSize: 8, opacity: 0.6, display: "inline-flex", color: "inherit" }}>
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
              className="absolute left-0 top-full z-50 mt-1 py-1 shadow-xl"
              style={{ borderRadius: 0, border: "1px solid #D1D5DB", background: "var(--th-bg-elevated)", minWidth: 200, maxHeight: 240, overflowY: "auto" }}
            >
              <button
                type="button"
                onClick={clearAgentFilters}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-left"
                style={{ background: agentFilters.size === 0 ? "rgba(251,191,36,0.1)" : "transparent", color: agentFilters.size === 0 ? "var(--th-accent)" : "var(--th-text-secondary)", border: "none" }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 14, height: 14, borderRadius: 0, border: agentFilters.size === 0 ? "1px solid #3B82F6" : "1px solid #D1D5DB", background: agentFilters.size === 0 ? "var(--th-accent)" : "transparent", fontSize: 9, color: "#000" }}>
                  {agentFilters.size === 0 ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </span>
                {t({ ko: "전체 에이전트", en: "All agents", ja: "全エージェント", zh: "全部代理" })}
              </button>
              <div style={{ height: 1, background: "var(--th-border)", margin: "2px 0" }} />
              {agentsWithProvider.map((agent) => {
                const checked = agentFilters.has(agent.id);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgentFilter(agent.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono text-left"
                    style={{ background: checked ? "rgba(251,191,36,0.08)" : "transparent", color: checked ? "var(--th-accent)" : "var(--th-text-secondary)", border: "none" }}
                  >
                    <span className="flex items-center justify-center shrink-0" style={{ width: 14, height: 14, borderRadius: 0, border: checked ? "1px solid #3B82F6" : "1px solid #D1D5DB", background: checked ? "var(--th-accent)" : "transparent", fontSize: 9, color: "#000" }}>
                      {checked ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                    <AgentAvatar agent={agent} agents={agents} size={16} rounded="sm" />
                    <span className="truncate">{agentDisplayName(agent)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {agentFilters.size > 0 && (
          <button type="button" onClick={clearAgentFilters} className="px-1.5 py-0.5 text-[10px] font-mono inline-flex items-center gap-1" style={{ borderRadius: 0, border: "1px solid #E5E7EB", color: "var(--th-text-muted)", background: "transparent" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {t({ ko: "초기화", en: "clear", ja: "クリア", zh: "清除" })}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {loading && historyRows.length === 0 && availableRows.length === 0 && (
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "메모리 기록 로딩중...", en: "Loading memory records...", ja: "メモリ記録を読み込み中...", zh: "正在加载记忆记录..." })}
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
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "학습 이력이 없습니다", en: "No learning history yet.", ja: "学習履歴がありません", zh: "暂无学习记录" })}
          </div>
        )}

        {tab === "history" &&
          visibleHistoryRows.map((row) => {
            const rowAgents = agentsByProvider.get(row.provider) ?? [];
            const label = row.rule_label || row.rule_id;
            const eventAt = row.run_completed_at ?? row.updated_at ?? row.created_at;
            const rowKey = ruleLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            const canUnlearn = row.status === "succeeded";
            return (
              <div
                key={row.id}
                className="skill-history-card p-2.5"
                style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-surface)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{label}</div>
                    <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.rule_id}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono ${ruleStatusClass(row.status)}`} style={{ borderRadius: 0 }}>
                    {ruleStatusLabel(row.status, t)}
                  </span>
                </div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>
                  <div className="flex min-w-0 items-center gap-2">
                    {rowAgents.length > 0 ? (
                      <div className={`flex items-center gap-0.5 ${unlearnEffect ? "unlearn-avatar-hit" : ""}`}>
                        {rowAgents.slice(0, 5).map((a) => (
                          <div key={a.id} className="h-5 w-5 overflow-hidden shrink-0" style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}>
                            <AgentAvatar agent={a} agents={agents} size={20} rounded="xl" />
                          </div>
                        ))}
                        {rowAgents.length > 5 && <span className="text-[9px] font-mono ml-0.5" style={{ color: "var(--th-text-muted)" }}>+{rowAgents.length - 5}</span>}
                        {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17v-2a5 5 0 0 1 10 0v2"/><path d="M12 10V3"/><path d="M9 6l3-3 3 3"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg></span>}
                        {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0s-.83-2.17 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3-2.5-2 2 .5 3.5 1.75 1.75c.85.85 1.3 2 1.3 3.2"/></svg></span>}
                        {unlearnEffect && <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>}
                      </div>
                    ) : (
                      <div className={`relative h-5 w-5 overflow-hidden ${unlearnEffect ? "unlearn-avatar-hit" : ""}`} style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}>
                        <AgentAvatar agent={undefined} agents={agents} size={20} rounded="xl" />
                        {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17v-2a5 5 0 0 1 10 0v2"/><path d="M12 10V3"/><path d="M9 6l3-3 3 3"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg></span>}
                        {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0s-.83-2.17 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3-2.5-2 2 .5 3.5 1.75 1.75c.85.85 1.3 2 1.3 3.2"/></svg></span>}
                        {unlearnEffect && <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>}
                      </div>
                    )}
                    <span className="truncate">
                      {ruleProviderLabel(row.provider)}
                      {rowAgents.length === 1 ? ` · ${agentDisplayName(rowAgents[0]!)}` : rowAgents.length > 1 ? ` · ${rowAgents.map((a) => agentDisplayName(a)).join(", ")}` : ""}
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
                    <span className="skill-history-time" style={{ color: "var(--th-text-muted)" }}>{ruleRelativeTime(eventAt, localeTag)}</span>
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
              style={{ borderRadius: 0, border: "1px solid #E5E7EB", color: "var(--th-text-secondary)", background: "transparent" }}
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
          <div className="px-3 py-6 text-center text-xs font-mono" style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-elevated)", color: "var(--th-text-muted)" }}>
            {t({ ko: "사용 가능한 룰이 없습니다", en: "No available rules.", ja: "利用可能なルールがありません", zh: "暂无可用规则" })}
          </div>
        )}

        {tab === "available" &&
          filteredAvailableRows.map((row) => {
            const rowAgents = agentsByProvider.get(row.provider) ?? [];
            const label = row.rule_label || row.rule_id;
            const rowKey = ruleLearningRowKey(row);
            const isUnlearning = unlearningKeys.includes(rowKey);
            const unlearnEffect = unlearnEffects[rowKey];
            return (
              <div
                key={`${row.provider}-${row.rule_id}`}
                className="skill-history-card p-2.5"
                style={{ borderRadius: 0, border: "1px solid #E5E7EB", background: "var(--th-bg-surface)" }}
              >
                <div className="truncate text-xs font-semibold font-mono" style={{ color: "var(--th-text-primary)" }}>{label}</div>
                <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{row.rule_id}</div>
                <div className="skill-history-meta mt-2 flex items-center justify-between gap-2 text-[10px] font-mono" style={{ color: "var(--th-text-secondary)" }}>
                  <div className="flex min-w-0 items-center gap-2">
                    {rowAgents.length > 0 ? (
                      <div className={`flex items-center gap-0.5 ${unlearnEffect ? "unlearn-avatar-hit" : ""}`}>
                        {rowAgents.slice(0, 5).map((a) => (
                          <div key={a.id} className="h-5 w-5 overflow-hidden shrink-0" style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}>
                            <AgentAvatar agent={a} agents={agents} size={20} rounded="xl" />
                          </div>
                        ))}
                        {rowAgents.length > 5 && <span className="text-[9px] font-mono ml-0.5" style={{ color: "var(--th-text-muted)" }}>+{rowAgents.length - 5}</span>}
                        {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17v-2a5 5 0 0 1 10 0v2"/><path d="M12 10V3"/><path d="M9 6l3-3 3 3"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg></span>}
                        {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0s-.83-2.17 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3-2.5-2 2 .5 3.5 1.75 1.75c.85.85 1.3 2 1.3 3.2"/></svg></span>}
                        {unlearnEffect && <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>}
                      </div>
                    ) : (
                      <div className={`relative h-5 w-5 overflow-hidden ${unlearnEffect ? "unlearn-avatar-hit" : ""}`} style={{ borderRadius: 0, background: "var(--th-bg-primary)" }}>
                        <AgentAvatar agent={undefined} agents={agents} size={20} rounded="xl" />
                        {unlearnEffect === "pot" && <span className="unlearn-pot-drop-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17v-2a5 5 0 0 1 10 0v2"/><path d="M12 10V3"/><path d="M9 6l3-3 3 3"/><rect x="3" y="17" width="18" height="4" rx="1"/></svg></span>}
                        {unlearnEffect === "hammer" && <span className="unlearn-hammer-swing-sm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0s-.83-2.17 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3-2.5-2 2 .5 3.5 1.75 1.75c.85.85 1.3 2 1.3 3.2"/></svg></span>}
                        {unlearnEffect && <span className="unlearn-hit-text-sm">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>}
                      </div>
                    )}
                    <span className="truncate">
                      {ruleProviderLabel(row.provider)}
                      {rowAgents.length === 1 ? ` · ${agentDisplayName(rowAgents[0]!)}` : rowAgents.length > 1 ? ` · ${rowAgents.map((a) => agentDisplayName(a)).join(", ")}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUnlearn(row)}
                      disabled={isUnlearning}
                      className="skill-unlearn-btn px-1.5 py-0.5 text-[10px] font-mono transition-all"
                      style={isUnlearning
                        ? { borderRadius: 0, border: "1px solid #E5E7EB", color: "var(--th-text-muted)", background: "transparent", cursor: "not-allowed" }
                        : { borderRadius: 0, border: "1px solid rgba(244,63,94,0.35)", color: "rgb(253,164,175)", background: "rgba(244,63,94,0.1)" }}
                    >
                      {isUnlearning
                        ? t({ ko: "취소중...", en: "Unlearning...", ja: "取消中...", zh: "取消中..." })
                        : t({ ko: "학습 취소", en: "Unlearn", ja: "学習取消", zh: "取消学习" })}
                    </button>
                    <span className="skill-history-time font-mono" style={{ color: "var(--th-text-muted)" }}>{ruleRelativeTime(row.learned_at, localeTag)}</span>
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
                <AgentAvatar agent={centerBonk.agent ?? undefined} agents={agents} size={80} rounded="xl" />
              </div>
              <span className="unlearn-hammer-swing-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0s-.83-2.17 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25V6.5l-3-2.5-2 2 .5 3.5 1.75 1.75c.85.85 1.3 2 1.3 3.2"/></svg></span>
              <span className="unlearn-hit-text-center">{t({ ko: "깡~", en: "Bonk!", ja: "ゴン!", zh: "咣~" })}</span>
            </div>
            <div className="skill-history-center-label mt-2 text-center text-xs font-medium font-mono" style={{ color: "rgb(254,205,211)" }}>
              {ruleProviderLabel(centerBonk.provider)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
