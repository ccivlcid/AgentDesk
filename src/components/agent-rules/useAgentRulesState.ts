import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentRule, AgentRuleCategory, AgentRuleScopeType, Department, Agent } from "../../types";
import {
  getAgentRules,
  createAgentRule,
  updateAgentRule,
  toggleAgentRule,
  deleteAgentRule,
  startRuleLearning,
  getRuleLearningJob,
  getAvailableLearnedRules,
  unlearnRule,
  type CreateAgentRuleInput,
  type UpdateAgentRuleInput,
  type RuleLearnProvider,
  type RuleHistoryProvider,
  type RuleLearnJob,
  type LearnedRuleEntry,
  type RuleLearningHistoryEntry,
} from "../../api/agent-rules";
import type { TFunction, RuleSortBy, UnlearnEffect } from "./model";
import {
  ALL_CATEGORIES,
  ALL_SCOPES,
  RULE_LEARN_PROVIDER_ORDER,
  RULE_LEARNED_PROVIDER_ORDER,
  pickRepresentativeForProvider,
} from "./model";

interface UseAgentRulesStateOptions {
  agents: Agent[];
  departments: Department[];
  t: TFunction;
}

export function useAgentRulesState({ agents, departments, t }: UseAgentRulesStateOptions) {
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedScope, setSelectedScope] = useState<string>("All");
  const [sortBy, setSortBy] = useState<RuleSortBy>("priority");

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AgentRule | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // ── Learning state ──────────────────────────────────────────────
  const [learningRule, setLearningRule] = useState<AgentRule | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<RuleLearnProvider[]>([]);
  const [learnJob, setLearnJob] = useState<RuleLearnJob | null>(null);
  const [learnSubmitting, setLearnSubmitting] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningProviders, setUnlearningProviders] = useState<RuleLearnProvider[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<RuleLearnProvider, UnlearnEffect>>>({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [learnedRows, setLearnedRows] = useState<LearnedRuleEntry[]>([]);
  const unlearnEffectTimersRef = useRef<Partial<Record<RuleLearnProvider, number>>>({});

  // ── Load rules ──────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgentRules();
      setRules(data);
    } catch (err: unknown) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  // ── Load learned rows ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getAvailableLearnedRules({ limit: 500 })
      .then((rows) => {
        if (!cancelled) setLearnedRows(rows);
      })
      .catch(() => {
        if (!cancelled) setLearnedRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [historyRefreshToken]);

  // ── Representatives ─────────────────────────────────────────────
  const representatives = useMemo(
    () =>
      RULE_LEARN_PROVIDER_ORDER.map((provider) => ({
        provider,
        agent: pickRepresentativeForProvider(agents, provider),
      })),
    [agents],
  );

  const defaultSelectedProviders = useMemo(
    () => representatives.filter((row) => row.agent).map((row) => row.provider),
    [representatives],
  );

  const learnedRepresentatives = useMemo(() => {
    const out = new Map<RuleHistoryProvider, Agent | null>();
    for (const provider of RULE_LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  // ── Learned providers by rule ───────────────────────────────────
  const learnedProvidersByRule = useMemo(() => {
    const map = new Map<string, RuleHistoryProvider[]>();
    for (const row of learnedRows) {
      if (!map.has(row.rule_id)) map.set(row.rule_id, []);
      const providers = map.get(row.rule_id)!;
      if (!providers.includes(row.provider)) providers.push(row.provider);
    }
    return map;
  }, [learnedRows]);

  // ── Modal learned providers (for current learningRule) ──────────
  const modalLearnedProviders = useMemo(() => {
    if (!learningRule) return new Set<RuleHistoryProvider>();
    const providers = learnedProvidersByRule.get(learningRule.id) ?? [];
    return new Set<RuleHistoryProvider>(providers);
  }, [learningRule, learnedProvidersByRule]);

  // ── 낙관적 학습 이력 (성공 직후 서버 refetch 전에 이력 패널에 표시) ──
  const optimisticRuleHistoryRows = useMemo((): RuleLearningHistoryEntry[] => {
    if (!learnJob || learnJob.status !== "succeeded") return [];
    const now = learnJob.completedAt ?? Date.now();
    return learnJob.providers.map((provider) => ({
      id: `opt-${learnJob.id}-${provider}`,
      job_id: learnJob.id,
      provider,
      rule_id: learnJob.ruleId,
      rule_label: learnJob.ruleTitle,
      status: "succeeded" as const,
      command: learnJob.command,
      error: null,
      run_started_at: learnJob.startedAt,
      run_completed_at: learnJob.completedAt,
      created_at: learnJob.createdAt,
      updated_at: now,
    }));
  }, [learnJob?.id, learnJob?.status, learnJob?.ruleId, learnJob?.ruleTitle, learnJob?.providers, learnJob?.command, learnJob?.startedAt, learnJob?.completedAt, learnJob?.createdAt]);

  const preferKoreanName = true;

  // ── Category counts ─────────────────────────────────────────────
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = cat === "All" ? rules.length : rules.filter((r) => r.category === cat).length;
    }
    return counts;
  }, [rules]);

  // ── Scope counts ────────────────────────────────────────────────
  const scopeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const scope of ALL_SCOPES) {
      counts[scope] = scope === "All" ? rules.length : rules.filter((r) => r.scope_type === scope).length;
    }
    return counts;
  }, [rules]);

  // ── Filtered & sorted ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...rules];

    if (selectedCategory !== "All") {
      result = result.filter((r) => r.category === selectedCategory);
    }

    if (selectedScope !== "All") {
      result = result.filter((r) => r.scope_type === selectedScope);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.title_ko.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.rule_content.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.scope_label ?? "").toLowerCase().includes(q),
      );
    }

    switch (sortBy) {
      case "priority":
        result.sort((a, b) => b.priority - a.priority || b.created_at - a.created_at);
        break;
      case "name":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "date":
        result.sort((a, b) => b.created_at - a.created_at);
        break;
    }

    return result;
  }, [rules, selectedCategory, selectedScope, search, sortBy]);

  // ── CRUD handlers ───────────────────────────────────────────────
  const openCreateModal = useCallback(() => {
    setEditingRule(null);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const openEditModal = useCallback((rule: AgentRule) => {
    setEditingRule(rule);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingRule(null);
    setFormError(null);
  }, []);

  const handleCreateRule = useCallback(
    async (input: CreateAgentRuleInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const created = await createAgentRule(input);
        setRules((prev) => [created, ...prev]);
        setShowFormModal(false);
        setEditingRule(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleUpdateRule = useCallback(
    async (id: string, input: UpdateAgentRuleInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const updated = await updateAgentRule(id, input);
        setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setShowFormModal(false);
        setEditingRule(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleToggleRule = useCallback(async (id: string) => {
    try {
      const result = await toggleAgentRule(id);
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: result.enabled } : r)));
    } catch (err: unknown) {
      console.error("Failed to toggle rule:", err);
    }
  }, []);

  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      setDeletingRuleId(id);
      await deleteAgentRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete rule:", err);
    } finally {
      setDeletingRuleId(null);
    }
  }, []);

  // ── Learning modal open/close ───────────────────────────────────
  const learnInProgress = !!learnJob && (learnJob.status === "queued" || learnJob.status === "running");
  const learnInProgressRef = useRef(learnInProgress);
  learnInProgressRef.current = learnInProgress;

  const openLearningModal = useCallback(
    (rule: AgentRule) => {
      setLearningRule(rule);
      setLearnJob(null);
      setLearnError(null);
      setUnlearnError(null);
      setLearnSubmitting(false);
      setUnlearningProviders([]);
      setUnlearnEffects({});
      // Pre-select only providers NOT yet learned
      const alreadyLearned = learnedProvidersByRule.get(rule.id) ?? [];
      const preSelected = defaultSelectedProviders.filter(
        (p) => !alreadyLearned.includes(p),
      );
      setSelectedProviders(preSelected);
    },
    [defaultSelectedProviders, learnedProvidersByRule],
  );

  const closeLearningModal = useCallback(() => {
    if (learnInProgress) return;
    if (learnJob?.status === "succeeded") setHistoryRefreshToken((t) => t + 1);
    setLearningRule(null);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setLearnSubmitting(false);
    setSelectedProviders([]);
    setUnlearningProviders([]);
    setUnlearnEffects({});
  }, [learnJob?.status]);

  const toggleProvider = useCallback(
    (provider: RuleLearnProvider) => {
      if (learnInProgress) return;
      setSelectedProviders((prev) =>
        prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
      );
    },
    [learnInProgress],
  );

  // ── Job polling (스킬스와 동일: cancelled + 에러 시 learnError 설정) ─────────────────────────────────
  useEffect(() => {
    if (!learnJob || (learnJob.status !== "queued" && learnJob.status !== "running")) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      getRuleLearningJob(learnJob.id)
        .then((job) => {
          if (!cancelled) setLearnJob(job);
        })
        .catch((err: unknown) => {
          if (!cancelled) setLearnError(err instanceof Error ? err.message : String(err));
        });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [learnJob]);

  // 학습 성공 시 낙관적 업데이트: learnedRows에 즉시 반영해 카드/모달이 바로 "학습됨" 표시
  useEffect(() => {
    if (!learnJob || learnJob.status !== "succeeded") return;
    const { ruleId, ruleTitle, providers, completedAt } = learnJob;
    const learnedAt = completedAt ?? Date.now();
    setLearnedRows((prev) => {
      const seen = new Set(prev.map((r) => `${r.rule_id}:${r.provider}`));
      const added: Array<{ provider: RuleHistoryProvider; rule_id: string; rule_label: string; learned_at: number }> = [];
      for (const provider of providers) {
        if (seen.has(`${ruleId}:${provider}`)) continue;
        seen.add(`${ruleId}:${provider}`);
        added.push({ provider, rule_id: ruleId, rule_label: ruleTitle, learned_at: learnedAt });
      }
      if (added.length === 0) return prev;
      return [...added, ...prev].sort((a, b) => b.learned_at - a.learned_at);
    });
  }, [learnJob?.id, learnJob?.status, learnJob?.ruleId, learnJob?.ruleTitle, learnJob?.providers, learnJob?.completedAt]);

  // Bump history on job completion so 학습 메모리 refetch (즉시 + 지연 1회로 저장 반영 보장)
  useEffect(() => {
    if (!learnJob || (learnJob.status !== "succeeded" && learnJob.status !== "failed")) return;
    setHistoryRefreshToken((t) => t + 1);
    const id = window.setTimeout(() => {
      setHistoryRefreshToken((t) => t + 1);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [learnJob?.id, learnJob?.status]);

  // ── Start learning ──────────────────────────────────────────────
  const handleStartLearning = useCallback(async () => {
    if (!learningRule || selectedProviders.length === 0 || learnSubmitting || learnInProgress) return;
    setLearnSubmitting(true);
    setLearnError(null);
    try {
      const job = await startRuleLearning({
        ruleId: learningRule.id,
        providers: selectedProviders,
      });
      setLearnJob(job);
    } catch (err: unknown) {
      setLearnError(String((err as Error).message ?? err));
    } finally {
      setLearnSubmitting(false);
    }
  }, [learningRule, selectedProviders, learnSubmitting, learnInProgress]);

  // ── Unlearn from modal ──────────────────────────────────────────
  const handleUnlearnProvider = useCallback(
    async (provider: RuleLearnProvider) => {
      if (!learningRule || unlearningProviders.includes(provider)) return;
      setUnlearnError(null);
      setUnlearningProviders((prev) => [...prev, provider]);
      try {
        const result = await unlearnRule({
          provider,
          ruleId: learningRule.id,
        });
        if (result.removed > 0) {
          setLearnedRows((prev) =>
            prev.filter((r) => !(r.provider === provider && r.rule_id === learningRule.id)),
          );
          // Trigger animation
          const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
          setUnlearnEffects((prev) => ({ ...prev, [provider]: effect }));
          const existing = unlearnEffectTimersRef.current[provider];
          if (typeof existing === "number") window.clearTimeout(existing);
          unlearnEffectTimersRef.current[provider] = window.setTimeout(() => {
            setUnlearnEffects((prev) => {
              const next = { ...prev };
              delete next[provider];
              return next;
            });
            delete unlearnEffectTimersRef.current[provider];
          }, 1100);
          setHistoryRefreshToken((t) => t + 1);
        }
      } catch (err: unknown) {
        setUnlearnError(String((err as Error).message ?? err));
      } finally {
        setUnlearningProviders((prev) => prev.filter((p) => p !== provider));
      }
    },
    [learningRule, unlearningProviders],
  );

  const bumpHistoryRefreshToken = useCallback(() => {
    setHistoryRefreshToken((t) => t + 1);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      for (const timerId of Object.values(unlearnEffectTimersRef.current)) {
        if (typeof timerId === "number") window.clearTimeout(timerId);
      }
    };
  }, []);

  return {
    // Data
    rules,
    loading,
    error,
    loadRules,

    // Filters
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedScope,
    setSelectedScope,
    sortBy,
    setSortBy,
    categoryCounts,
    scopeCounts,
    filtered,

    // Modal
    showFormModal,
    editingRule,
    formSubmitting,
    formError,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handleCreateRule,
    handleUpdateRule,

    // Actions
    handleToggleRule,
    handleDeleteRule,
    deletingRuleId,

    // Context data
    agents,
    departments,

    // Learning
    learningRule,
    learnInProgress,
    selectedProviders,
    representatives,
    preferKoreanName,
    modalLearnedProviders,
    unlearningProviders,
    unlearnEffects,
    learnJob,
    learnError,
    unlearnError,
    learnSubmitting,
    defaultSelectedProviders,
    learnedProvidersByRule,
    learnedRepresentatives,
    historyRefreshToken,
    openLearningModal,
    closeLearningModal,
    toggleProvider,
    handleStartLearning,
    handleUnlearnProvider,
    bumpHistoryRefreshToken,
    optimisticRuleHistoryRows,
  };
}
