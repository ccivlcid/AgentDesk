import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableLearnedSkills,
  getSkillDetail,
  getSkills,
  startSkillLearning,
  unlearnSkill,
  type LearnedSkillEntry,
  type SkillDetail,
  type SkillHistoryProvider,
  type SkillLearnJob,
  type SkillLearnProvider,
} from "../../api";
import type { Agent } from "../../types";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  categorize,
  formatInstalls,
  LEARN_PROVIDER_ORDER,
  LEARNED_PROVIDER_ORDER,
  pickRepresentativeForProvider,
  type CategorizedSkill,
  type TFunction,
  type UnlearnEffect,
} from "./model";
import { useCustomSkillsState } from "./useCustomSkillsState";

export function useSkillsLibraryState({ agents, localeTag, t }: { agents: Agent[]; localeTag: string; t: TFunction }) {
  const { on: onWsEvent } = useWebSocket();
  const [skills, setSkills] = useState<Awaited<ReturnType<typeof getSkills>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "installs">("rank");
  const [copiedSkill, setCopiedSkill] = useState<string | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SkillDetail | "loading" | "error">>({});
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const [learningSkill, setLearningSkill] = useState<CategorizedSkill | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [learnJob, setLearnJob] = useState<SkillLearnJob | null>(null);
  const [learnSubmitting, setLearnSubmitting] = useState(false);
  const [learnError, setLearnError] = useState<string | null>(null);
  const [unlearnError, setUnlearnError] = useState<string | null>(null);
  const [unlearningProviders, setUnlearningProviders] = useState<SkillLearnProvider[]>([]);
  const [unlearnEffects, setUnlearnEffects] = useState<Partial<Record<SkillLearnProvider, UnlearnEffect>>>({});
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [learnedRows, setLearnedRows] = useState<LearnedSkillEntry[]>([]);
  const unlearnEffectTimersRef = useRef<Partial<Record<SkillLearnProvider, number>>>({});

  const representatives = useMemo(
    () =>
      LEARN_PROVIDER_ORDER.map((provider) => ({
        provider,
        agent: pickRepresentativeForProvider(agents, provider),
      })),
    [agents],
  );

  const defaultSelectedProviders = useMemo(() => {
    const providers = new Set<SkillLearnProvider>();
    for (const agent of agents) {
      if (agent.cli_provider) {
        providers.add(agent.cli_provider as SkillLearnProvider);
      }
    }
    return Array.from(providers);
  }, [agents]);

  const bumpHistoryRefreshToken = useCallback(() => {
    setHistoryRefreshToken((prev) => prev + 1);
  }, []);

  const customState = useCustomSkillsState({
    defaultSelectedProviders,
    t,
    onHistoryChanged: bumpHistoryRefreshToken,
  });

  // provider → 해당 provider를 가진 모든 에이전트 목록
  const learnedRepresentatives = useMemo(() => {
    const out = new Map<SkillHistoryProvider, Agent[]>();
    for (const provider of LEARNED_PROVIDER_ORDER) {
      const list = agents.filter((a) => a.cli_provider === provider);
      out.set(provider, list);
    }
    return out;
  }, [agents]);

  const handleCardMouseEnter = useCallback(
    (skill: CategorizedSkill) => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        const detailId = skill.skillId || skill.name;
        const key = `${skill.repo}/${detailId}`;
        setHoveredSkill(key);
        if (!detailCache[key]) {
          setDetailCache((prev) => ({ ...prev, [key]: "loading" }));
          getSkillDetail(skill.repo, detailId)
            .then((detail) => {
              setDetailCache((prev) => ({ ...prev, [key]: detail ?? "error" }));
            })
            .catch(() => {
              setDetailCache((prev) => ({ ...prev, [key]: "error" }));
            });
        }
      }, 300);
    },
    [detailCache],
  );

  const handleCardMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredSkill(null);
  }, []);

  const loadSkills = useCallback(() => {
    setLoading(true);
    setError(null);
    getSkills()
      .then(setSkills)
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  useEffect(() => {
    let cancelled = false;
    getAvailableLearnedSkills({ limit: 500 })
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

  const categorizedSkills = useMemo<CategorizedSkill[]>(
    () =>
      skills.map((skill) => ({
        ...skill,
        category: categorize(skill.name, skill.repo),
        installsDisplay: formatInstalls(skill.installs, localeTag),
      })),
    [skills, localeTag],
  );

  const filtered = useMemo(() => {
    let result = categorizedSkills;

    if (selectedCategory !== "All") {
      result = result.filter((skill) => skill.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(q) ||
          skill.repo.toLowerCase().includes(q) ||
          skill.category.toLowerCase().includes(q),
      );
    }

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, localeTag));
    } else if (sortBy === "installs") {
      result = [...result].sort((a, b) => b.installs - a.installs);
    }

    return result;
  }, [categorizedSkills, localeTag, search, selectedCategory, sortBy]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: categorizedSkills.length };
    for (const skill of categorizedSkills) {
      counts[skill.category] = (counts[skill.category] || 0) + 1;
    }
    return counts;
  }, [categorizedSkills]);

  const learnedProvidersBySkill = useMemo(() => {
    const map = new Map<string, SkillHistoryProvider[]>();
    for (const row of learnedRows) {
      const key = `${row.repo}/${row.skill_id}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      const providers = map.get(key)!;
      if (!providers.includes(row.provider)) {
        providers.push(row.provider);
      }
    }
    for (const providers of map.values()) {
      providers.sort((a, b) => LEARNED_PROVIDER_ORDER.indexOf(a) - LEARNED_PROVIDER_ORDER.indexOf(b));
    }
    return map;
  }, [learnedRows]);

  const learningSkillDetailId = learningSkill ? learningSkill.skillId || learningSkill.name : "";
  const learningSkillKey = learningSkill ? `${learningSkill.repo}/${learningSkillDetailId}` : "";
  const modalLearnedProviders = useMemo(() => {
    if (!learningSkillKey) return new Set<SkillHistoryProvider>();
    return new Set(learnedProvidersBySkill.get(learningSkillKey) ?? []);
  }, [learnedProvidersBySkill, learningSkillKey]);

  const learnInProgress = learnJob?.status === "queued" || learnJob?.status === "running";
  const learnInProgressRef = useRef(learnInProgress);
  learnInProgressRef.current = learnInProgress;
  const preferKoreanName = localeTag.startsWith("ko");

  useEffect(() => {
    const timers = unlearnEffectTimersRef.current;
    return () => {
      for (const timerId of Object.values(timers)) {
        if (typeof timerId === "number") {
          window.clearTimeout(timerId);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!learnJob || (learnJob.status !== "queued" && learnJob.status !== "running")) {
      return;
    }
    const activeJobId = learnJob.id;
    return onWsEvent("skill_learn_job_update", (payload) => {
      const updated = payload as SkillLearnJob;
      if (updated?.id === activeJobId) {
        setLearnJob(updated);
      }
    });
  }, [learnJob, onWsEvent]);

  useEffect(() => {
    if (!learnJob) return;
    if (learnJob.status === "succeeded" || learnJob.status === "failed") {
      setHistoryRefreshToken((prev) => prev + 1);
    }
  }, [learnJob, learnJob?.id, learnJob?.status]);

  const openLearningModal = useCallback(
    (skill: CategorizedSkill) => {
      const detailId = skill.skillId || skill.name;
      const key = `${skill.repo}/${detailId}`;
      const learnedProviders = new Set(learnedProvidersBySkill.get(key) ?? []);
      // 아직 학습되지 않은 provider를 가진 에이전트를 기본 선택
      const initialAgentIds = agents
        .filter((a) => a.cli_provider && !learnedProviders.has(a.cli_provider as SkillLearnProvider))
        .map((a) => a.id);
      setLearningSkill(skill);
      setSelectedAgentIds(initialAgentIds);
      setLearnJob(null);
      setLearnError(null);
      setUnlearnError(null);
      setUnlearningProviders([]);
      setUnlearnEffects({});
    },
    [agents, learnedProvidersBySkill],
  );

  const closeLearningModal = useCallback(() => {
    if (learnInProgressRef.current) return;
    setLearningSkill(null);
    setSelectedAgentIds([]);
    setLearnJob(null);
    setLearnError(null);
    setUnlearnError(null);
    setUnlearningProviders([]);
    setUnlearnEffects({});
  }, []);

  useEffect(() => {
    if (!learningSkill) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeLearningModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeLearningModal, learningSkill]);

  const toggleAgent = useCallback(
    (agentId: string) => {
      if (learnInProgress) return;
      setSelectedAgentIds((prev) =>
        prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId],
      );
    },
    [learnInProgress],
  );

  const handleStartLearning = useCallback(async () => {
    if (!learningSkill || selectedAgentIds.length === 0 || learnSubmitting || learnInProgress) return;
    // 선택된 에이전트들의 cli_provider에서 중복 제거하여 providers 목록 생성
    const providers = [
      ...new Set(
        agents
          .filter((a) => selectedAgentIds.includes(a.id) && a.cli_provider)
          .map((a) => a.cli_provider as SkillLearnProvider),
      ),
    ];
    if (providers.length === 0) return;
    setLearnSubmitting(true);
    setLearnError(null);
    try {
      const job = await startSkillLearning({
        repo: learningSkill.repo,
        skillId: learningSkill.skillId || learningSkill.name,
        providers,
      });
      setLearnJob(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLearnError(message);
    } finally {
      setLearnSubmitting(false);
    }
  }, [agents, learnInProgress, learningSkill, learnSubmitting, selectedAgentIds]);

  const triggerUnlearnEffect = useCallback((provider: SkillLearnProvider) => {
    const effect: UnlearnEffect = Math.random() < 0.5 ? "pot" : "hammer";
    setUnlearnEffects((prev) => ({ ...prev, [provider]: effect }));
    const currentTimer = unlearnEffectTimersRef.current[provider];
    if (typeof currentTimer === "number") {
      window.clearTimeout(currentTimer);
    }
    unlearnEffectTimersRef.current[provider] = window.setTimeout(() => {
      setUnlearnEffects((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      delete unlearnEffectTimersRef.current[provider];
    }, 1100);
  }, []);

  const handleUnlearnProvider = useCallback(
    async (provider: SkillLearnProvider) => {
      if (!learningSkill || learnInProgress || unlearningProviders.includes(provider)) return;
      const skillId = learningSkill.skillId || learningSkill.name;
      setUnlearnError(null);
      setUnlearningProviders((prev) => [...prev, provider]);
      try {
        const result = await unlearnSkill({ provider, repo: learningSkill.repo, skillId });
        if (result.removed > 0) {
          setLearnedRows((prev) =>
            prev.filter(
              (row) => !(row.provider === provider && row.repo === learningSkill.repo && row.skill_id === skillId),
            ),
          );
          triggerUnlearnEffect(provider);
        }
        setHistoryRefreshToken((prev) => prev + 1);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setUnlearnError(message);
      } finally {
        setUnlearningProviders((prev) => prev.filter((item) => item !== provider));
      }
    },
    [learnInProgress, learningSkill, triggerUnlearnEffect, unlearningProviders],
  );

  const handleCopy = useCallback((skill: CategorizedSkill) => {
    const cmd = `npx skills add ${skill.repo}`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopiedSkill(skill.name);
      setTimeout(() => setCopiedSkill(null), 2000);
    });
  }, []);

  return {
    skills,
    loading,
    error,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    copiedSkill,
    hoveredSkill,
    setHoveredSkill,
    detailCache,
    hoverTimerRef,
    tooltipRef,
    learningSkill,
    selectedAgentIds,
    learnJob,
    learnSubmitting,
    learnError,
    unlearnError,
    unlearningProviders,
    unlearnEffects,
    historyRefreshToken,
    setHistoryRefreshToken,
    showCustomModal: customState.showCustomModal,
    customSkillName: customState.customSkillName,
    setCustomSkillName: customState.setCustomSkillName,
    customSkillContent: customState.customSkillContent,
    customSkillFileName: customState.customSkillFileName,
    customSkillProviders: customState.customSkillProviders,
    customSkillSubmitting: customState.customSkillSubmitting,
    customSkillError: customState.customSkillError,
    customSkills: customState.customSkills,
    showClassroomAnimation: customState.showClassroomAnimation,
    classroomAnimSkillName: customState.classroomAnimSkillName,
    classroomAnimProviders: customState.classroomAnimProviders,
    customFileInputRef: customState.customFileInputRef,
    representatives,
    defaultSelectedProviders,
    learnedRepresentatives,
    categorizedSkills,
    filtered,
    categoryCounts,
    learnedProvidersBySkill,
    modalLearnedProviders,
    learnInProgress,
    preferKoreanName,
    openCustomSkillModal: customState.openCustomSkillModal,
    closeCustomSkillModal: customState.closeCustomSkillModal,
    handleCustomFileSelect: customState.handleCustomFileSelect,
    toggleCustomProvider: customState.toggleCustomProvider,
    handleCustomSkillSubmit: customState.handleCustomSkillSubmit,
    handleDeleteCustomSkill: customState.handleDeleteCustomSkill,
    refreshCustomSkills: customState.refreshCustomSkills,
    handleCardMouseEnter,
    handleCardMouseLeave,
    loadSkills,
    openLearningModal,
    closeLearningModal,
    toggleAgent,
    handleStartLearning,
    handleUnlearnProvider,
    handleCopy,
  };
}
