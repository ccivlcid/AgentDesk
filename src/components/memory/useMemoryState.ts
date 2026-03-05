import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MemoryEntry, MemoryCategory, Department, Agent } from "../../types";
import {
  getMemoryEntries,
  createMemoryEntry,
  updateMemoryEntry,
  toggleMemoryEntry,
  deleteMemoryEntry,
  startMemoryLearning,
  getMemoryLearningJob,
  getAvailableLearnedMemories,
  unlearnMemory,
  type CreateMemoryInput,
  type UpdateMemoryInput,
  type MemoryLearnProvider,
  type MemoryHistoryProvider,
  type MemoryLearnJob,
  type LearnedMemoryEntry,
} from "../../api/memory";
import type { TFunction, MemorySortBy, UnlearnEffect } from "./model";
import {
  ALL_CATEGORIES,
  MEMORY_LEARN_PROVIDER_ORDER,
  MEMORY_LEARNED_PROVIDER_ORDER,
  pickRepresentativeForProvider,
} from "./model";

interface UseMemoryStateOptions {
  agents: Agent[];
  departments: Department[];
  t: TFunction;
}

export function useMemoryState({ agents, departments, t }: UseMemoryStateOptions) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<MemorySortBy>("priority");

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // ── Learning state ──────────────────────────────────────────────
  const [learningEntry, setLearningEntry] = useState<MemoryEntry | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<MemoryLearnProvider[]>([]);
  const [learnJob, setLearnJob] = useState<MemoryLearnJob | null>(null);
  const [learnSubmitting, setLearnSubmitting] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningProviders, setUnlearningProviders] = useState<MemoryLearnProvider[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<MemoryLearnProvider, UnlearnEffect>>>({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [learnedRows, setLearnedRows] = useState<LearnedMemoryEntry[]>([]);
  const unlearnEffectTimersRef = useRef<Partial<Record<MemoryLearnProvider, number>>>({});

  // ── Load entries ──────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMemoryEntries();
      setEntries(data);
    } catch (err: unknown) {
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // ── Load learned rows ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    getAvailableLearnedMemories({ limit: 500 })
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
      MEMORY_LEARN_PROVIDER_ORDER.map((provider) => ({
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
    const out = new Map<MemoryHistoryProvider, Agent | null>();
    for (const provider of MEMORY_LEARNED_PROVIDER_ORDER) {
      out.set(provider, pickRepresentativeForProvider(agents, provider));
    }
    return out;
  }, [agents]);

  // ── Learned providers by entry ───────────────────────────────────
  const learnedProvidersByEntry = useMemo(() => {
    const map = new Map<string, MemoryHistoryProvider[]>();
    for (const row of learnedRows) {
      if (!map.has(row.memory_id)) map.set(row.memory_id, []);
      const providers = map.get(row.memory_id)!;
      if (!providers.includes(row.provider)) providers.push(row.provider);
    }
    return map;
  }, [learnedRows]);

  // ── Modal learned providers (for current learningEntry) ──────────
  const modalLearnedProviders = useMemo(() => {
    if (!learningEntry) return new Set<MemoryHistoryProvider>();
    const providers = learnedProvidersByEntry.get(learningEntry.id) ?? [];
    return new Set<MemoryHistoryProvider>(providers);
  }, [learningEntry, learnedProvidersByEntry]);

  const preferKoreanName = true;

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = cat === "All" ? entries.length : entries.filter((e) => e.category === cat).length;
    }
    return counts;
  }, [entries]);

  // Filtered & sorted (scope 필터 없음, 에이전트 룰과 동일하게 카테고리·검색만)
  const filtered = useMemo(() => {
    let result = [...entries];

    if (selectedCategory !== "All") {
      result = result.filter((e) => e.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.title_ko.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
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
  }, [entries, selectedCategory, search, sortBy]);

  // Handlers
  const openCreateModal = useCallback(() => {
    setEditingEntry(null);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const openEditModal = useCallback((entry: MemoryEntry) => {
    setEditingEntry(entry);
    setFormError(null);
    setShowFormModal(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingEntry(null);
    setFormError(null);
  }, []);

  const handleCreateEntry = useCallback(
    async (input: CreateMemoryInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const created = await createMemoryEntry(input);
        setEntries((prev) => [created, ...prev]);
        setShowFormModal(false);
        setEditingEntry(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleUpdateEntry = useCallback(
    async (id: string, input: UpdateMemoryInput) => {
      try {
        setFormSubmitting(true);
        setFormError(null);
        const updated = await updateMemoryEntry(id, input);
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        setShowFormModal(false);
        setEditingEntry(null);
      } catch (err: unknown) {
        setFormError(String((err as Error).message ?? err));
      } finally {
        setFormSubmitting(false);
      }
    },
    [],
  );

  const handleToggleEntry = useCallback(async (id: string) => {
    try {
      const result = await toggleMemoryEntry(id);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, enabled: result.enabled } : e)));
    } catch (err: unknown) {
      console.error("Failed to toggle memory entry:", err);
    }
  }, []);

  const handleDeleteEntry = useCallback(async (id: string) => {
    try {
      setDeletingEntryId(id);
      await deleteMemoryEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete memory entry:", err);
    } finally {
      setDeletingEntryId(null);
    }
  }, []);

  // ── Learning modal open/close ───────────────────────────────────
  const learnInProgress = !!learnJob && (learnJob.status === "queued" || learnJob.status === "running");

  const openLearningModal = useCallback(
    (entry: MemoryEntry) => {
      setLearningEntry(entry);
      setLearnJob(null);
      setLearnError(null);
      setUnlearnError(null);
      setLearnSubmitting(false);
      setUnlearningProviders([]);
      setUnlearnEffects({});
      // Pre-select only providers NOT yet learned
      const alreadyLearned = learnedProvidersByEntry.get(entry.id) ?? [];
      const preSelected = defaultSelectedProviders.filter(
        (p) => !alreadyLearned.includes(p),
      );
      setSelectedProviders(preSelected);
    },
    [defaultSelectedProviders, learnedProvidersByEntry],
  );

  const closeLearningModal = useCallback(() => {
    if (learnInProgress) return;
    setLearningEntry(null);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setLearnSubmitting(false);
    setSelectedProviders([]);
    setUnlearningProviders([]);
    setUnlearnEffects({});
  }, [learnInProgress]);

  const toggleProvider = useCallback(
    (provider: MemoryLearnProvider) => {
      if (learnInProgress) return;
      setSelectedProviders((prev) =>
        prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider],
      );
    },
    [learnInProgress],
  );

  // ── Job polling ─────────────────────────────────────────────────
  useEffect(() => {
    if (!learnJob || (learnJob.status !== "queued" && learnJob.status !== "running")) return;
    const timer = window.setInterval(() => {
      getMemoryLearningJob(learnJob.id)
        .then(setLearnJob)
        .catch(() => {});
    }, 1500);
    return () => window.clearInterval(timer);
  }, [learnJob]);

  // Bump history on job completion
  useEffect(() => {
    if (learnJob && (learnJob.status === "succeeded" || learnJob.status === "failed")) {
      setHistoryRefreshToken((t) => t + 1);
    }
  }, [learnJob?.status]);

  // ── Start learning ──────────────────────────────────────────────
  const handleStartLearning = useCallback(async () => {
    if (!learningEntry || selectedProviders.length === 0 || learnSubmitting || learnInProgress) return;
    setLearnSubmitting(true);
    setLearnError(null);
    try {
      const job = await startMemoryLearning({
        memoryId: learningEntry.id,
        providers: selectedProviders,
      });
      setLearnJob(job);
    } catch (err: unknown) {
      setLearnError(String((err as Error).message ?? err));
    } finally {
      setLearnSubmitting(false);
    }
  }, [learningEntry, selectedProviders, learnSubmitting, learnInProgress]);

  // ── Unlearn from modal ──────────────────────────────────────────
  const handleUnlearnProvider = useCallback(
    async (provider: MemoryLearnProvider) => {
      if (!learningEntry || unlearningProviders.includes(provider)) return;
      setUnlearnError(null);
      setUnlearningProviders((prev) => [...prev, provider]);
      try {
        const result = await unlearnMemory({
          provider,
          memoryId: learningEntry.id,
        });
        if (result.removed > 0) {
          setLearnedRows((prev) =>
            prev.filter((r) => !(r.provider === provider && r.memory_id === learningEntry.id)),
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
    [learningEntry, unlearningProviders],
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
    entries,
    loading,
    error,
    loadEntries,

    // Filters
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    categoryCounts,
    filtered,

    // Modal
    showFormModal,
    editingEntry,
    formSubmitting,
    formError,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handleCreateEntry,
    handleUpdateEntry,

    // Actions
    handleToggleEntry,
    handleDeleteEntry,
    deletingEntryId,

    // Context data
    agents,
    departments,

    // Learning
    learningEntry,
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
    learnedProvidersByEntry,
    learnedRepresentatives,
    historyRefreshToken,
    openLearningModal,
    closeLearningModal,
    toggleProvider,
    handleStartLearning,
    handleUnlearnProvider,
    bumpHistoryRefreshToken,
  };
}
