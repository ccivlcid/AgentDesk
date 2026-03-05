import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HookEntry, HookEventType, Department, Agent } from "../../types";
import {
  getHooks,
  createHook,
  updateHook,
  toggleHook,
  deleteHook,
  startHookLearning,
  getHookLearningJob,
  getAvailableLearnedHooks,
  unlearnHook,
  type CreateHookInput,
  type UpdateHookInput,
  type HookLearnProvider,
  type HookHistoryProvider,
  type HookLearnJob,
  type LearnedHookEntry,
} from "../../api/hooks";
import type { TFunction, HookSortBy, UnlearnEffect } from "./model";
import {
  ALL_EVENT_TYPES,
  HOOK_LEARN_PROVIDER_ORDER,
  HOOK_LEARNED_PROVIDER_ORDER,
  pickRepresentativeForProvider,
} from "./model";

interface UseHooksStateOptions {
  agents: Agent[];
  departments: Department[];
  t: TFunction;
}

export function useHooksState({ agents, departments, t }: UseHooksStateOptions) {
  const [hooks, setHooks] = useState<HookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string>("All");
  const [sortBy, setSortBy] = useState<HookSortBy>("priority");

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingHook, setEditingHook] = useState<HookEntry | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingHookId, setDeletingHookId] = useState<string | null>(null);

  // ── Learning state ──────────────────────────────────────────────
  const [learningHook, setLearningHook] = useState<HookEntry | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<HookLearnProvider[]>([]);
  const [learnJob, setLearnJob] = useState<HookLearnJob | null>(null);
  const [learnSubmitting, setLearnSubmitting] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningProviders, setUnlearningProviders] = useState<HookLearnProvider[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<HookLearnProvider, UnlearnEffect>>>({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [learnedRows, setLearnedRows] = useState<LearnedHookEntry[]>([]);
  const [squadAgentIds, setSquadAgentIds] = useState<string[]>([]);
  const unlearnEffectTimersRef = useRef<Partial<Record<HookLearnProvider, number>>>({});

  // ── Load hooks ────────────────────────────────────────────────────
  const loadHooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHooks();
      setHooks(data);
    } catch (err: unknown) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHooks();
  }, [loadHooks]);

  // ── Load learned rows ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getAvailableLearnedHooks({ limit: 500 })
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

  // ── Representatives ───────────────────────────────────────────────
  const representatives = useMemo(
    () =>
      HOOK_LEARN_PROVIDER_ORDER.map((provider) => ({
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
    const out = new Map<HookHistoryProvider, Agent | null>();
    for (const provider of HOOK_LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  // ── Learned providers by hook ─────────────────────────────────────
  const learnedProvidersByHook = useMemo(() => {
    const map = new Map<string, HookHistoryProvider[]>();
    for (const row of learnedRows) {
      if (!map.has(row.hook_id)) map.set(row.hook_id, []);
      const providers = map.get(row.hook_id)!;
      if (!providers.includes(row.provider)) providers.push(row.provider);
    }
    return map;
  }, [learnedRows]);

  // ── Modal learned providers (for current learningHook) ────────────
  const modalLearnedProviders = useMemo(() => {
    if (!learningHook) return new Set<HookHistoryProvider>();
    const providers = learnedProvidersByHook.get(learningHook.id) ?? [];
    return new Set<HookHistoryProvider>(providers);
  }, [learningHook, learnedProvidersByHook]);

  const preferKoreanName = true;

  // Event type counts
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const et of ALL_EVENT_TYPES) {
      counts[et] = et === "All" ? hooks.length : hooks.filter((h) => h.event_type === et).length;
    }
    return counts;
  }, [hooks]);

  // Filtered & sorted
  const filtered = useMemo(() => {
    let result = [...hooks];

    if (selectedEventType !== "All") {
      result = result.filter((h) => h.event_type === selectedEventType);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.title_ko.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q) ||
          h.command.toLowerCase().includes(q) ||
          h.event_type.toLowerCase().includes(q),
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
      case "executions":
        result.sort((a, b) => b.execution_count - a.execution_count || b.created_at - a.created_at);
        break;
    }

    return result;
  }, [hooks, selectedEventType, search, sortBy]);

  // Handlers
  const openCreateModal = useCallback(() => {
    setEditingHook(null);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const openEditModal = useCallback((hook: HookEntry) => {
    setEditingHook(hook);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingHook(null);
    setFormError(null);
  }, []);

  const handleCreateHook = useCallback(
    async (input: CreateHookInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const created = await createHook(input);
        setHooks((prev) => [created, ...prev]);
        setShowFormModal(false);
        setEditingHook(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleUpdateHook = useCallback(
    async (id: string, input: UpdateHookInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const updated = await updateHook(id, input);
        setHooks((prev) => prev.map((h) => (h.id === id ? updated : h)));
        setShowFormModal(false);
        setEditingHook(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleToggleHook = useCallback(async (id: string) => {
    try {
      const result = await toggleHook(id);
      setHooks((prev) => prev.map((h) => (h.id === id ? { ...h, enabled: result.enabled } : h)));
    } catch (err: unknown) {
      console.error("Failed to toggle hook:", err);
    }
  }, []);

  const handleDeleteHook = useCallback(async (id: string) => {
    try {
      setDeletingHookId(id);
      await deleteHook(id);
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete hook:", err);
    } finally {
      setDeletingHookId(null);
    }
  }, []);

  // ── Learning modal open/close ─────────────────────────────────────
  const learnInProgress = !!learnJob && (learnJob.status === "queued" || learnJob.status === "running");

  const openLearningModal = useCallback(
    (hook: HookEntry) => {
      setLearningHook(hook);
      setLearnJob(null);
      setLearnError(null);
      setUnlearnError(null);
      setLearnSubmitting(false);
      setUnlearningProviders([]);
      setUnlearnEffects({});
      // Pre-select only providers NOT yet learned
      const alreadyLearned = learnedProvidersByHook.get(hook.id) ?? [];
      const preSelected = defaultSelectedProviders.filter(
        (p) => !alreadyLearned.includes(p),
      );
      setSelectedProviders(preSelected);
      setSquadAgentIds([]);
    },
    [defaultSelectedProviders, learnedProvidersByHook],
  );

  const closeLearningModal = useCallback(() => {
    if (learnInProgress) return;
    setLearningHook(null);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setLearnSubmitting(false);
    setSelectedProviders([]);
    setUnlearningProviders([]);
    setUnlearnEffects({});
    setSquadAgentIds([]);
  }, [learnInProgress]);

  const toggleProvider = useCallback(
    (provider: HookLearnProvider) => {
      if (learnInProgress) return;
      setSelectedProviders((prev) =>
        prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
      );
    },
    [learnInProgress],
  );

  // ── Job polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!learnJob || (learnJob.status !== "queued" && learnJob.status !== "running")) return;
    const timer = window.setInterval(() => {
      getHookLearningJob(learnJob.id)
        .then(setLearnJob)
        .catch(() => {});
    }, 1500);
    return () => window.clearInterval(timer);
  }, [learnJob]);

  // Optimistic update: immediately reflect learned rows on success before server refetch
  useEffect(() => {
    if (!learnJob || learnJob.status !== "succeeded") return;
    const { hookId, hookTitle, providers, completedAt } = learnJob;
    const learnedAt = completedAt ?? Date.now();
    setLearnedRows((prev) => {
      const seen = new Set(prev.map((r) => `${r.hook_id}:${r.provider}`));
      const added: LearnedHookEntry[] = [];
      for (const provider of providers) {
        if (seen.has(`${hookId}:${provider}`)) continue;
        seen.add(`${hookId}:${provider}`);
        added.push({ provider, hook_id: hookId, hook_label: hookTitle, learned_at: learnedAt });
      }
      if (added.length === 0) return prev;
      return [...added, ...prev].sort((a, b) => b.learned_at - a.learned_at);
    });
  }, [learnJob?.id, learnJob?.status, learnJob?.hookId, learnJob?.hookTitle, learnJob?.providers, learnJob?.completedAt]);

  // Bump history on job completion (immediate + delayed to ensure server storage is reflected)
  useEffect(() => {
    if (!learnJob || (learnJob.status !== "succeeded" && learnJob.status !== "failed")) return;
    setHistoryRefreshToken((t) => t + 1);
    const id = window.setTimeout(() => {
      setHistoryRefreshToken((t) => t + 1);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [learnJob?.id, learnJob?.status]);

  // ── Start learning ────────────────────────────────────────────────
  const handleStartLearning = useCallback(async () => {
    if (!learningHook || selectedProviders.length === 0 || learnSubmitting || learnInProgress) return;
    setLearnSubmitting(true);
    setLearnError(null);
    try {
      const job = await startHookLearning({
        hookId: learningHook.id,
        providers: selectedProviders,
      });
      setLearnJob(job);
    } catch (err: unknown) {
      setLearnError(String((err as Error).message ?? err));
    } finally {
      setLearnSubmitting(false);
    }
  }, [learningHook, selectedProviders, learnSubmitting, learnInProgress]);

  // ── Unlearn from modal ────────────────────────────────────────────
  const handleUnlearnProvider = useCallback(
    async (provider: HookLearnProvider) => {
      if (!learningHook || unlearningProviders.includes(provider)) return;
      setUnlearnError(null);
      setUnlearningProviders((prev) => [...prev, provider]);
      try {
        const result = await unlearnHook({
          provider,
          hookId: learningHook.id,
        });
        if (result.removed > 0) {
          setLearnedRows((prev) =>
            prev.filter((r) => !(r.provider === provider && r.hook_id === learningHook.id)),
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
    [learningHook, unlearningProviders],
  );

  const bumpHistoryRefreshToken = useCallback(() => {
    setHistoryRefreshToken((t) => t + 1);
  }, []);

  const addAgentToSquad = useCallback(
    (agentId: string) => {
      setSquadAgentIds((prev) => (prev.includes(agentId) ? prev : [...prev, agentId]));
      const agent = agents.find((a) => a.id === agentId);
      if (agent?.cli_provider) {
        const provider = agent.cli_provider as HookLearnProvider;
        setSelectedProviders((prev) => (prev.includes(provider) ? prev : [...prev, provider]));
      }
    },
    [agents],
  );

  const removeAgentFromSquad = useCallback((agentId: string) => {
    setSquadAgentIds((prev) => prev.filter((id) => id !== agentId));
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
    hooks,
    loading,
    error,
    loadHooks,

    // Filters
    search,
    setSearch,
    selectedEventType,
    setSelectedEventType,
    sortBy,
    setSortBy,
    eventTypeCounts,
    filtered,

    // Modal
    showFormModal,
    editingHook,
    formSubmitting,
    formError,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handleCreateHook,
    handleUpdateHook,

    // Actions
    handleToggleHook,
    handleDeleteHook,
    deletingHookId,

    // Context data
    agents,
    departments,

    // Learning
    learningHook,
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
    learnedProvidersByHook,
    learnedRepresentatives,
    historyRefreshToken,
    openLearningModal,
    closeLearningModal,
    toggleProvider,
    handleStartLearning,
    handleUnlearnProvider,
    bumpHistoryRefreshToken,
    squadAgentIds,
    addAgentToSquad,
    removeAgentFromSquad,
  };
}
